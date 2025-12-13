#!/usr/bin/env node

import XLSX from 'xlsx';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { connectDB } from '../models/db.js';
import AkunLRA from '../models/AkunLRA.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Clean and normalize cell values
 * @param {*} value - Raw cell value
 * @returns {string} - Cleaned string value
 */
function cleanCellValue(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

/**
 * Determine the hierarchical level of an account based on its code structure
 * @param {string} code - Account code
 * @returns {number} - Level (1-based)
 */
function determineLevel(code) {
  if (!code) return 1;

  // Count dots to determine level
  const dotCount = (code.match(/\./g) || []).length;
  return dotCount + 1;
}

/**
 * Extract the parent code from a full code
 * @param {string} fullCode - Full code (e.g., "1.2.3")
 * @param {number} level - Target level
 * @returns {string|null} - Parent code at the specified level
 */
function getParentCode(fullCode, level) {
  if (!fullCode || level <= 1) return null;

  const parts = fullCode.split('.');
  if (level > parts.length) return null;

  return parts.slice(0, level - 1).join('.');
}

/**
 * Build fullCode from parent hierarchy
 * @param {string} code - Current account code
 * @param {string|null} parentFullCode - Parent's full code
 * @returns {string} - Complete full code
 */
function buildFullCode(code, parentFullCode) {
  if (!parentFullCode || parentFullCode.trim() === '') {
    return code;
  }
  return `${parentFullCode}.${code}`;
}

/**
 * Parse Excel data and build hierarchical structure
 * @param {Array} data - Excel data as array of arrays
 * @returns {Array} - Processed account data with hierarchy info
 */
function parseExcelData(data) {
  const accounts = [];
  const accountMap = new Map(); // For tracking parents

  console.log(`📊 Processing ${data.length} rows of Excel data...`);

  // Log first few rows to understand structure
  console.log('🔍 First 5 rows structure:');
  for (let i = 0; i < Math.min(5, data.length); i++) {
    console.log(`   Row ${i}: [${data[i]?.slice(0, 4).join(', ') || 'empty'}${data[i]?.length > 4 ? ', ...' : ''}]`);
  }

  for (let i = 0; i < data.length; i++) {
    const row = data[i];

    // Progress indicator every 100 rows
    if (i % 100 === 0) {
      console.log(`📈 Progress: ${i}/${data.length} rows processed (${Math.round(i/data.length*100)}%)`);
    }

    if (!row || row.length < 2) {
      console.log(`⚠️ Skipping empty row ${i}`);
      continue;
    }

    // Extract basic information (adjust column indices based on your Excel structure)
    // Based on the process-akun.js file, it seems like: [code, name, description, keterangan]
    const code = cleanCellValue(row[0]);
    const name = cleanCellValue(row[1]);
    const description = cleanCellValue(row[2]);
    const keterangan = cleanCellValue(row[3]);

    if (!code || !name) {
      console.log(`⚠️ Skipping row ${i} - missing code or name`);
      continue;
    }

    // Determine level and parent information
    const level = determineLevel(code);
    const parentCode = getParentCode(code, level - 1);

    console.log(`🔍 Processing row ${i}: code="${code}", name="${name}", level=${level}, parentCode=${parentCode || 'none'}`);

    // Find parent account
    let parentId = null;
    if (parentCode) {
      const parentAccount = accounts.find(acc => acc.fullCode === parentCode);
      if (parentAccount) {
        parentId = parentAccount._id;
        console.log(`   ✅ Found parent: ${parentCode}`);
      } else {
        console.log(`   ⚠️ Parent not found yet: ${parentCode} (will be resolved later)`);
      }
    }

    // Build fullCode
    const fullCode = parentId ?
      buildFullCode(code, accounts.find(acc => acc._id?.equals(parentId))?.fullCode) :
      code;

    // Create account object
    const account = {
      code,
      name,
      fullCode,
      parent: parentId,
      description: description || keterangan,
      level,
      isLeaf: true // Will be updated after processing all accounts
    };

    accounts.push(account);
    accountMap.set(fullCode, account);

    console.log(`   ✅ Added: ${fullCode} - ${name} (Level ${level})`);
  }

  // Update isLeaf flags based on whether accounts have children
  console.log('🔗 Building parent-child relationships...');
  accounts.forEach(account => {
    const hasChildren = accounts.some(acc => acc.parent?.equals(account._id));
    account.isLeaf = !hasChildren;
    if (hasChildren) {
      console.log(`   📋 ${account.fullCode} has children`);
    }
  });

  console.log(`✅ Parsed ${accounts.length} accounts`);
  return accounts;
}

/**
 * Import accounts into database with proper hierarchy
 * @param {Array} accounts - Array of account objects to import
 */
async function importAccounts(accounts) {
  console.log('🗄️ Starting database import...');

  try {
    // Clear existing data
    console.log('🧹 Clearing existing AkunLRA data...');
    const deleteResult = await AkunLRA.deleteMany({});
    console.log(`✅ Cleared ${deleteResult.deletedCount} existing records`);

    // Import accounts in level order (parents first)
    const sortedAccounts = accounts.sort((a, b) => a.level - b.level);
    console.log(`📋 Sorted ${sortedAccounts.length} accounts by level`);

    const importedAccounts = [];
    let successCount = 0;
    let errorCount = 0;

    // Group by level for better progress tracking
    const levelGroups = {};
    sortedAccounts.forEach(acc => {
      if (!levelGroups[acc.level]) levelGroups[acc.level] = [];
      levelGroups[acc.level].push(acc);
    });

    console.log('📊 Accounts by level:');
    Object.keys(levelGroups).sort().forEach(level => {
      console.log(`   Level ${level}: ${levelGroups[level].length} accounts`);
    });

    for (let level = 1; level <= Math.max(...Object.keys(levelGroups)); level++) {
      const levelAccounts = levelGroups[level] || [];
      console.log(`\n📥 Importing Level ${level} accounts (${levelAccounts.length} accounts)...`);

      for (let i = 0; i < levelAccounts.length; i++) {
        const account = levelAccounts[i];

        if (i % 10 === 0) {
          console.log(`   Progress: ${i}/${levelAccounts.length} (${Math.round(i/levelAccounts.length*100)}%)`);
        }

        try {
          const newAccount = new AkunLRA(account);
          const savedAccount = await newAccount.save();
          importedAccounts.push(savedAccount);
          successCount++;
          console.log(`   ✅ [${level}] ${savedAccount.fullCode} - ${savedAccount.name}`);
        } catch (error) {
          console.error(`   ❌ [${level}] Failed to import ${account.fullCode}: ${error.message}`);
          errorCount++;
        }
      }
    }

    console.log(`\n📊 Import completed: ${successCount} successful, ${errorCount} failed`);

    // Update children references for parents
    console.log('\n🔗 Building parent-child relationships...');
    let linkedCount = 0;

    for (const account of importedAccounts) {
      if (account.level > 1) {
        const parentFullCode = getParentCode(account.fullCode, account.level - 1);
        const parent = importedAccounts.find(acc => acc.fullCode === parentFullCode);

        if (parent) {
          try {
            await AkunLRA.findByIdAndUpdate(parent._id, {
              $push: { children: account._id },
              $set: { isLeaf: false }
            });
            linkedCount++;
            console.log(`   🔗 Linked ${account.fullCode} to parent ${parent.fullCode}`);
          } catch (error) {
            console.error(`   ❌ Failed to link ${account.fullCode} to parent ${parent.fullCode}: ${error.message}`);
          }
        } else {
          console.log(`   ⚠️ Could not find parent for ${account.fullCode} (expected: ${parentFullCode})`);
        }
      }
    }

    console.log(`✅ Parent-child relationships established: ${linkedCount} links created`);

  } catch (error) {
    console.error('❌ Database import failed:', error);
    throw error;
  }
}

/**
 * Analyze Excel file structure
 * @param {string} filePath - Path to Excel file
 */
function analyzeExcelStructure(filePath) {
  console.log('🔍 Analyzing Excel file structure...');

  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Get first few rows to understand structure
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    const headers = data.slice(0, 3); // First 3 rows are headers

    console.log('📋 Header rows:');
    headers.forEach((row, index) => {
      console.log(`   Row ${index + 1}:`, row);
    });

    console.log(`📊 Total data rows: ${data.length}`);
    console.log(`📊 Data rows (excluding headers): ${data.length - 3}`);

    if (data.length > 3) {
      console.log('📝 First data row sample:');
      console.log('   ', data[3]);

      console.log('📝 Next few data rows:');
      for (let i = 4; i < Math.min(8, data.length); i++) {
        console.log(`   Row ${i}:`, data[i]);
      }
    }

    return data;
  } catch (error) {
    console.error('❌ Error reading Excel file:', error.message);
    throw error;
  }
}

/**
 * Main import function
 */
async function importAkunLRA() {
  const startTime = Date.now();

  try {
    console.log('🚀 Starting AkunLRA import process...');

    // Connect to database
    console.log('🔌 Connecting to database...');
    const dbStartTime = Date.now();
    await connectDB();
    const dbEndTime = Date.now();
    console.log(`✅ Database connected in ${dbEndTime - dbStartTime}ms`);

    // Path to cleaned Excel file
    const excelFilePath = path.join(__dirname, '..', 'docs', 'akunLRAtoEkspor_cleaned.xlsx');

    // Check if file exists
    console.log('📁 Checking for Excel file...');
    if (!fs.existsSync(excelFilePath)) {
      console.error('❌ Excel file not found:', excelFilePath);
      console.log('📂 Available files in docs folder:');
      const docsPath = path.join(__dirname, '..', 'docs');
      try {
        const files = fs.readdirSync(docsPath);
        files.forEach(file => console.log('   -', file));
      } catch (err) {
        console.error('❌ Could not read docs folder:', err.message);
      }
      return;
    }
    console.log('✅ Excel file found');

    // Analyze structure first
    console.log('📖 Analyzing Excel file structure...');
    const analyzeStartTime = Date.now();
    const rawData = analyzeExcelStructure(excelFilePath);
    const analyzeEndTime = Date.now();
    console.log(`✅ Structure analyzed in ${analyzeEndTime - analyzeStartTime}ms`);

    if (rawData.length < 4) {
      console.error(`❌ Insufficient data in Excel file: only ${rawData.length} rows`);
      return;
    }
    console.log(`📊 Excel file has ${rawData.length} rows`);

    // Parse and import data
    console.log('🔄 Parsing Excel data...');
    const parseStartTime = Date.now();
    const accounts = parseExcelData(rawData.slice(3)); // Skip headers
    const parseEndTime = Date.now();
    console.log(`✅ Data parsed in ${parseEndTime - parseStartTime}ms`);

    if (accounts.length === 0) {
      console.error('❌ No valid accounts found in Excel file');
      return;
    }
    console.log(`📋 Found ${accounts.length} valid accounts to import`);

    // Import to database
    console.log('💾 Importing to database...');
    const importStartTime = Date.now();
    await importAccounts(accounts);
    const importEndTime = Date.now();
    console.log(`✅ Database import completed in ${importEndTime - importStartTime}ms`);

    const totalTime = Date.now() - startTime;
    console.log('🎉 AkunLRA import completed successfully!');
    console.log(`📊 Summary: ${accounts.length} accounts imported`);
    console.log(`⏱️ Total execution time: ${totalTime}ms`);

  } catch (error) {
    console.error('❌ Import failed:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    // Close database connection
    try {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed');
    } catch (err) {
      console.error('❌ Error closing database connection:', err.message);
    }
  }
}

// Run the import if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  importAkunLRA();
}

export { importAkunLRA, parseExcelData, buildFullCode };