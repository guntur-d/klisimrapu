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
 * Build hierarchical fullCode from code array
 * @param {Array} codeParts - Array of code parts [level1, level2, level3, ...]
 * @returns {string} - Complete full code (e.g., "4.1.1")
 */
function buildFullCode(codeParts) {
  // Filter out empty parts and only include numeric code parts
  const validParts = codeParts.filter(part => {
    const cleaned = cleanCellValue(part);
    return cleaned && /^\d+$/.test(cleaned); // Only include numeric parts
  });

  if (validParts.length === 0) return '';

  return validParts.join('.');
}

/**
 * Create hierarchical account structure from Excel data
 * @param {Array} data - Excel data as array of arrays
 * @returns {Array} - Processed account data with proper hierarchy
 */
function createHierarchicalAccounts(data) {
  const accounts = [];
  const accountMap = new Map(); // For tracking by fullCode

  console.log(`📊 Processing ${data.length} rows for hierarchical structure...`);

  for (let i = 0; i < data.length; i++) {
    const row = data[i];

    if (!row || row.length < 2) {
      console.log(`   ⚠️ Skipping empty row ${i}`);
      continue;
    }

    // Extract code parts from the row (first columns contain hierarchical codes)
    const codeParts = row.slice(0, 10).map(cleanCellValue); // Take first 10 columns as potential code parts

    // Build fullCode from code parts first
    const fullCode = buildFullCode(codeParts);

    if (!fullCode) {
      console.log(`   ⚠️ Skipping row ${i} - no valid code parts: ${JSON.stringify(codeParts)}`);
      continue;
    }

    // Get the actual hierarchical code (last numeric code part)
    const validCodeParts = codeParts.filter(part => part && /^\d+$/.test(part));
    const code = validCodeParts[validCodeParts.length - 1] || fullCode;

    // Determine level based on valid code parts
    const level = validCodeParts.length;

    // Get name from column G (index 6) - the actual name
    const name = cleanCellValue(row[6]) || cleanCellValue(row[7]) || cleanCellValue(row[5]) ||
                 cleanCellValue(row[4]) || cleanCellValue(row[3]) || 'Unnamed';

    // Get description from column H (index 7) - the actual description text
    const description = cleanCellValue(row[7]) || name;

    if (!name || name === 'Unnamed') {
      console.log(`   ⚠️ Skipping row ${i} - no name found: ${JSON.stringify(row.slice(0, 8))}`);
      continue;
    }

    // Create account object with CORRECT field mapping
    const account = {
      code: code, // The actual hierarchical code number (e.g., "1", not the description)
      name, // The account name (e.g., "PENDAPATAN ASLI DAERAH (PAD)")
      fullCode, // The complete hierarchical code (e.g., "4.1")
      description, // The description text (e.g., "Digunakan untuk mencatat...")
      level,
      isLeaf: true // Will be updated after processing all accounts
    };

    accounts.push(account);
    accountMap.set(fullCode, account);

    console.log(`   ✅ Row ${i}: ${fullCode} (${level}) - "${name}"`);

    // Progress indicator
    if (accounts.length % 100 === 0) {
      console.log(`   📈 Progress: ${accounts.length} accounts processed`);
    }
  }

  // Update isLeaf flags based on whether accounts have children
  console.log('🔗 Building parent-child relationships...');
  accounts.forEach(account => {
    const hasChildren = accounts.some(acc =>
      acc.fullCode !== account.fullCode && // Not the same account
      acc.fullCode.startsWith(account.fullCode + '.') && // Starts with parent code
      acc.level === account.level + 1 // Next level down
    );
    account.isLeaf = !hasChildren;
    if (hasChildren) {
      console.log(`   📋 ${account.fullCode} (${account.name}) has children`);
    }
  });

  console.log(`✅ Created ${accounts.length} hierarchical accounts`);
  return accounts;
}

/**
 * Import accounts with proper hierarchy handling
 */
async function importHierarchicalAccounts() {
  try {
    console.log('🚀 Starting hierarchical AkunLRA import...');

    // Connect to database
    console.log('🔌 Connecting to database...');
    await connectDB();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test connection
    const testCount = await AkunLRA.countDocuments();
    console.log(`✅ Database connected. Current records: ${testCount}`);

    // Read Excel file
    const excelFilePath = path.join(__dirname, '..', 'docs', 'akunLRAtoEkspor_cleaned.xlsx');
    console.log('📖 Reading Excel file...');

    const workbook = XLSX.readFile(excelFilePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log(`📊 Excel file loaded: ${data.length} rows`);

    // Create hierarchical structure
    console.log('🏗️ Building hierarchical account structure...');
    const accounts = createHierarchicalAccounts(data);

    if (accounts.length === 0) {
      console.log('⚠️ No valid accounts found');
      return;
    }

    // Handle duplicates within the accounts array
    console.log('🔍 Checking for duplicate fullCodes...');
    const fullCodeMap = new Map();
    const uniqueAccounts = [];

    accounts.forEach(account => {
      const originalCode = account.fullCode;
      if (fullCodeMap.has(account.fullCode)) {
        // Create unique fullCode by adding suffix
        let suffix = 1;
        let uniqueCode = `${originalCode}_${suffix}`;

        while (fullCodeMap.has(uniqueCode)) {
          suffix++;
          uniqueCode = `${originalCode}_${suffix}`;
        }

        account.fullCode = uniqueCode;
        account.name = `${account.name} (${suffix})`;
        console.log(`   🔧 Fixed duplicate: ${originalCode} → ${uniqueCode}`);
      }
      fullCodeMap.set(account.fullCode, account);
      uniqueAccounts.push(account);
    });

    console.log(`✅ Ready to import ${uniqueAccounts.length} accounts`);

    // Clear existing data
    console.log('🧹 Clearing existing AkunLRA data...');
    const deleteResult = await AkunLRA.deleteMany({});
    console.log(`✅ Cleared ${deleteResult.deletedCount} existing records`);

    // Import in batches
    console.log('💾 Importing accounts...');
    const BATCH_SIZE = 100;
    let importedCount = 0;

    for (let i = 0; i < uniqueAccounts.length; i += BATCH_SIZE) {
      const batch = uniqueAccounts.slice(i, i + BATCH_SIZE);

      try {
        const insertResult = await AkunLRA.insertMany(batch);
        importedCount += insertResult.length;

        console.log(`   ✅ Batch ${Math.floor(i/BATCH_SIZE) + 1}: ${insertResult.length} accounts (${importedCount}/${accounts.length})`);

        // Small delay between batches
        if (i + BATCH_SIZE < accounts.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      } catch (batchError) {
        console.error(`   ❌ Batch ${Math.floor(i/BATCH_SIZE) + 1} failed:`, batchError.message);
      }
    }

    console.log(`\n🎉 Import completed! ${importedCount} accounts imported successfully`);

    // Show sample results
    console.log('\n📋 Sample imported accounts:');
    const sampleAccounts = await AkunLRA.find({}).limit(10).sort({ level: 1, fullCode: 1 });
    sampleAccounts.forEach(account => {
      console.log(`   - Level ${account.level}: ${account.fullCode} - ${account.name}`);
    });

    // Show summary by level
    console.log('\n📊 Import summary by level:');
    const levelStats = await AkunLRA.aggregate([
      { $group: { _id: '$level', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    levelStats.forEach(stat => {
      console.log(`   Level ${stat._id}: ${stat.count} accounts`);
    });

  } catch (error) {
    console.error('❌ Import failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    try {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed');
    } catch (err) {
      console.error('❌ Error closing database connection:', err.message);
    }
  }
}

// Run the hierarchical import
importHierarchicalAccounts();