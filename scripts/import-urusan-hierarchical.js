#!/usr/bin/env node

/**
 * Import script for Urusan hierarchical data from CSV
 * Reads docs/Urusan_Cleaned_Spacing.csv and imports into MongoDB
 * 
 * CSV Structure:
 * - Column 1: Urusan (code and name)
 * - Column 2: Bidang (code and name) 
 * - Column 3: Program (code and name)
 * - Column 4: Kegiatan (code and name)
 * - Column 5: SubKegiatan (code and name)
 * - Column 6: Uraian (description/name)
 * - Column 7: Kinerja
 * - Column 8: Indikator  
 * - Column 9: Satuan
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import 'dotenv/config';

// Import models
import { 
  Urusan, 
  Bidang, 
  Program, 
  Kegiatan, 
  SubKegiatan 
} from '../models/Urusan.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_FILE_PATH = path.join(__dirname, '../docs/Urusan_Cleaned_Spacing.csv');
const LOG_FILE_PATH = path.join(__dirname, '../scripts/import-urusan-log.txt');

// Statistics tracking
const stats = {
  processed: 0,
  created: {
    urusan: 0,
    bidang: 0,
    program: 0,
    kegiatan: 0,
    subKegiatan: 0
  },
  skipped: 0,
  errors: []
};

/**
 * Log function with timestamp and file output
 */
function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${type}] ${message}`;
  console.log(logMessage);
  
  // Append to log file
  fs.appendFileSync(LOG_FILE_PATH, logMessage + '\n');
}

/**
 * Parse CSV line handling quoted fields with commas
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Extract code and name from combined field
 */
function parseCodeAndName(combinedField) {
  if (!combinedField || combinedField.trim() === '') {
    return { code: null, name: null };
  }
  
  // Try to split by first space to separate code from name
  const trimmed = combinedField.trim();
  const firstSpaceIndex = trimmed.indexOf(' ');
  
  if (firstSpaceIndex === -1) {
    // No space found, treat entire string as name
    return { code: null, name: trimmed };
  }
  
  const code = trimmed.substring(0, firstSpaceIndex);
  const name = trimmed.substring(firstSpaceIndex + 1);
  
  return { code, name };
}

/**
 * Find or create an Urusan
 */
async function findOrCreateUrusan(urusanCode, urusanName) {
  if (!urusanCode && !urusanName) {
    return null;
  }
  
  // Clean up the name (remove URUSAN prefix if present)
  const cleanName =urusanName?.replace(/^URUSAN\s+/i, '') || '';
  
  try {
    let existingUrusan;
    if (urusanCode) {
      existingUrusan = await Urusan.findOne({ kode:urusanCode });
    }
    
    if (!existingUrusan && cleanName) {
      existingUrusan = await Urusan.findOne({ nama: cleanName });
    }
    
    if (existingUrusan) {
      return existingUrusan;
    }
    
    const newUrusan = new Urusan({
      kode: urusanCode || `URUSAN-${Date.now()}`,
      nama: cleanName
    });
    
    await newUrusan.save();
    stats.created.urusan++;
    log(`Created Urusan: ${newUrusan.kode} - ${newUrusan.nama}`);
    
    return newUrusan;
  } catch (error) {
    log(`Error creating Urusan: ${error.message}`, 'ERROR');
    throw error;
  }
}

/**
 * Build hierarchical code from parts
 */
function buildHierarchicalCode(urusanCode, bidangCode, programCode, kegiatanCode, subKegiatanCode) {
  const parts = [];
  
  if (urusanCode) parts.push(urusanCode);
  if (bidangCode) parts.push(bidangCode);
  if (programCode) parts.push(programCode);
  if (kegiatanCode) parts.push(kegiatanCode);
  if (subKegiatanCode) parts.push(subKegiatanCode);
  
  return parts.join('.');
}

/**
 * Find or create a Bidang
 */
async function findOrCreateBidang(urusanCode, bidangCode, bidangName, urusanId) {
  if (!bidangCode && !bidangName) {
    return null;
  }
  
  if (!urusanId) {
    throw new Error('Bidang requires a valid Urusan ID');
  }
  
  // Clean up the name (remove URUSAN and BIDANG prefixes if present)
  const cleanName = bidangName?.replace(/^URUSAN\s+.*?\s+BIDANG\s+/i, '') || bidangName || '';
  
  try {
    // Build hierarchical code
    const hierarchicalCode = buildHierarchicalCode(urusanCode, bidangCode);
    
    let existingBidang;
    if (bidangCode) {
      existingBidang = await Bidang.findOne({
        kode: hierarchicalCode,
        urusanId
      });
    }
    
    if (!existingBidang && cleanName) {
      existingBidang = await Bidang.findOne({
        nama: cleanName,
        urusanId
      });
    }
    
    if (existingBidang) {
      return existingBidang;
    }
    
    const newBidang = new Bidang({
      kode: hierarchicalCode,
      nama: cleanName,
      urusanId
    });
    
    await newBidang.save();
    stats.created.bidang++;
    log(`Created Bidang: ${newBidang.kode} - ${newBidang.nama}`);
    
    return newBidang;
  } catch (error) {
    log(`Error creating Bidang: ${error.message}`, 'ERROR');
    throw error;
  }
}

/**
 * Find or create a Program
 */
async function findOrCreateProgram(urusanCode, bidangCode, programCode, programName, bidangId) {
  if (!programCode && !programName) {
    return null;
  }
  
  if (!bidangId) {
    throw new Error('Program requires a valid Bidang ID');
  }
  
  try {
    // Build hierarchical code
    const hierarchicalCode = buildHierarchicalCode(urusanCode, bidangCode, programCode);
    
    let existingProgram;
    if (programCode) {
      existingProgram = await Program.findOne({
        kode: hierarchicalCode,
        bidangId
      });
    }
    
    if (!existingProgram && programName) {
      existingProgram = await Program.findOne({
        nama: programName,
        bidangId
      });
    }
    
    if (existingProgram) {
      return existingProgram;
    }
    
    const newProgram = new Program({
      kode: hierarchicalCode,
      nama: programName,
      bidangId
    });
    
    await newProgram.save();
    stats.created.program++;
    log(`Created Program: ${newProgram.kode} - ${newProgram.nama}`);
    
    return newProgram;
  } catch (error) {
    log(`Error creating Program: ${error.message}`, 'ERROR');
    throw error;
  }
}

/**
 * Find or create a Kegiatan
 */
async function findOrCreateKegiatan(urusanCode, bidangCode, programCode, kegiatanCode, kegiatanName, programId) {
  if (!kegiatanCode && !kegiatanName) {
    return null;
  }
  
  if (!programId) {
    throw new Error('Kegiatan requires a valid Program ID');
  }
  
  try {
    // Build hierarchical code
    const hierarchicalCode = buildHierarchicalCode(urusanCode, bidangCode, programCode, kegiatanCode);
    
    let existingKegiatan;
    if (kegiatanCode) {
      existingKegiatan = await Kegiatan.findOne({
        kode: hierarchicalCode,
        programId
      });
    }
    
    if (!existingKegiatan && kegiatanName) {
      existingKegiatan = await Kegiatan.findOne({
        nama: kegiatanName,
        programId
      });
    }
    
    if (existingKegiatan) {
      return existingKegiatan;
    }
    
    const newKegiatan = new Kegiatan({
      kode: hierarchicalCode,
      nama: kegiatanName,
      programId
    });
    
    await newKegiatan.save();
    stats.created.kegiatan++;
    log(`Created Kegiatan: ${newKegiatan.kode} - ${newKegiatan.nama}`);
    
    return newKegiatan;
  } catch (error) {
    log(`Error creating Kegiatan: ${error.message}`, 'ERROR');
    throw error;
  }
}

/**
 * Find or create a SubKegiatan
 */
async function findOrCreateSubKegiatan(urusanCode, bidangCode, programCode, kegiatanCode, subKegiatanCode, subKegiatanName, uraian, kinerja, indikator, satuan, kegiatanId) {
  if (!subKegiatanCode && !subKegiatanName && !uraian) {
    return null;
  }
  
  if (!kegiatanId) {
    throw new Error('SubKegiatan requires a valid Kegiatan ID');
  }
  
  // Use uraian as name if subKegiatanName is empty
  const finalName = subKegiatanName || uraian;
  
  if (!finalName) {
    return null; // Skip if no name available
  }
  
  try {
    // Build hierarchical code
    const hierarchicalCode = buildHierarchicalCode(urusanCode, bidangCode, programCode, kegiatanCode, subKegiatanCode);
    
    let existingSubKegiatan;
    if (subKegiatanCode) {
      existingSubKegiatan = await SubKegiatan.findOne({
        kode: hierarchicalCode,
        kegiatanId
      });
    }
    
    if (!existingSubKegiatan) {
      existingSubKegiatan = await SubKegiatan.findOne({
        nama: finalName,
        kegiatanId
      });
    }
    
    if (existingSubKegiatan) {
      return existingSubKegiatan;
    }
    
    const newSubKegiatan = new SubKegiatan({
      kode: hierarchicalCode,
      nama: finalName,
      kinerja: kinerja || '',
      indikator: indikator || '',
      satuan: satuan || '',
      kegiatanId
    });
    
    await newSubKegiatan.save();
    stats.created.subKegiatan++;
    log(`Created SubKegiatan: ${newSubKegiatan.kode} - ${newSubKegiatan.nama}`);
    
    return newSubKegiatan;
  } catch (error) {
    log(`Error creating SubKegiatan: ${error.message}`, 'ERROR');
    throw error;
  }
}

/**
 * Process a single CSV row
 */
async function processRow(row) {
  stats.processed++;
  
  try {
    // CSV structure: Column 1-5 are codes, Column 6 is Uraian, Columns 7-9 are metrics
    const [
      urusanCode,
      bidangCode,
      programCode,
      kegiatanCode,
      subKegiatanCode,
      uraian,
      kinerja,
      indikator,
      satuan
    ] = row;
    
    // Skip empty rows
    if (!urusanCode || !uraian || !uraian.trim()) {
      stats.skipped++;
      return;
    }
    
    // Clean up codes (remove quotes if present)
    const cleanUrusanCode = urusanCode.replace(/"/g, '');
    const cleanBidangCode = bidangCode ? bidangCode.replace(/"/g, '') : '';
    const cleanProgramCode = programCode ? programCode.replace(/"/g, '') : '';
    const cleanKegiatanCode = kegiatanCode ? kegiatanCode.replace(/"/g, '') : '';
    const cleanSubKegiatanCode = subKegiatanCode ? subKegiatanCode.replace(/"/g, '') : '';
    const cleanUraian = uraian.replace(/"/g, '').trim();
    
    // Build hierarchy step by step
    let currentUrusan = null;
    let currentBidang = null;
    let currentProgram = null;
    let currentKegiatan = null;
    
    // Process Urusan (level 1) - only if we have a new urasan code or first row
    if (cleanUrusanCode) {
      // Try to extract name from Uraian if it starts with "URUSAN"
      let urusanName = cleanUraian;
      if (cleanUraian.startsWith('URUSAN')) {
        // Extract name from "URUSAN X.XX" format
        const match = cleanUraian.match(/URUSAN\s+([A-Z0-9\.]+)\s*(.*)/i);
        if (match) {
          // If uraian contains full hierarchy, extract just the name part
          const namePart = match[2] || match[1]; // Use text after code or the code itself
          // Clean up "PEMERINTAHAN BIDANG" style names
         urusanName = namePart.replace(/^PEMERINTAHAN\s+BIDANG\s+/i, '').trim();
        }
      }
      currentUrusan = await findOrCreateUrusan(cleanUrusanCode, urusanName);
    }
    
    // Process Bidang (level 2)
    if (cleanBidangCode && currentUrusan) {
      let bidangName = cleanUraian;
      if (cleanUraian.startsWith('URUSAN') && cleanUraian.includes('BIDANG')) {
        const match = cleanUraian.match(/URUSAN\s+[A-Z0-9\.]+\s*.*?\s*BIDANG\s+([A-Z0-9\.]+)\s*(.*)/i);
        if (match) {
          bidangName = match[2]?.trim() || `Bidang ${cleanBidangCode}`;
        }
      }
      currentBidang = await findOrCreateBidang(cleanUrusanCode, cleanBidangCode, bidangName, currentUrusan._id);
    }
    
    // Process Program (level 3)
    if (cleanProgramCode && currentBidang) {
      let programName = cleanUraian;
      if (cleanUraian.startsWith('PROGRAM')) {
        programName = cleanUraian.replace(/^PROGRAM\s+/i, '').trim();
      } else {
        // For PROGRAM rows, use the Uraian as program name
        programName = `Program ${cleanProgramCode}: ${cleanUraian}`;
      }
      currentProgram = await findOrCreateProgram(cleanUrusanCode, cleanBidangCode, cleanProgramCode, programName, currentBidang._id);
    }
    
    // Process Kegiatan (level 4)
    if (cleanKegiatanCode && currentProgram) {
      let kegiatanName = cleanUraian;
      // If this row represents a Kegiatan level, use Uraian as name
      if (cleanProgramCode && !cleanSubKegiatanCode && cleanUraian) {
        kegiatanName = cleanUraian;
      } else if (!kegiatanName || kegiatanName === cleanUraian) {
        kegiatanName = `Kegiatan ${cleanKegiatanCode}`;
      }
      currentKegiatan = await findOrCreateKegiatan(cleanUrusanCode, cleanBidangCode, cleanProgramCode, cleanKegiatanCode, kegiatanName, currentProgram._id);
    }
    
    // Process SubKegiatan (level 5) - only if we have subkegiatan code AND performance data
    if (cleanSubKegiatanCode && cleanUraian && (kinerja || indikator || satuan) && currentKegiatan) {
      let subKegiatanName = cleanUraian;
      
      await findOrCreateSubKegiatan(
        cleanUrusanCode,
        cleanBidangCode,
        cleanProgramCode,
        cleanKegiatanCode,
        cleanSubKegiatanCode,
        subKegiatanName,
        cleanUraian,
        kinerja?.replace(/"/g, '') || '',
        indikator?.replace(/"/g, '') || '',
        satuan?.replace(/"/g, '') || '',
        currentKegiatan._id
      );
    }
    
    log(`Processed row ${stats.processed}: ${cleanUrusanCode || ''} ${cleanBidangCode || ''} ${cleanProgramCode || ''} ${cleanKegiatanCode || ''} ${cleanSubKegiatanCode || ''}`);
    
  } catch (error) {
    const errorMsg = `Error processing row ${stats.processed}: ${error.message}`;
    log(errorMsg, 'ERROR');
    stats.errors.push(errorMsg);
  }
}

/**
 * Main import function
 */
async function importUrusanData() {
  const startTime = Date.now();
  
  try {
    log('=== Starting Urusan Hierarchical Import ===');
    log(`Reading CSV file: ${CSV_FILE_PATH}`);
    
    // Clear log file
    fs.writeFileSync(LOG_FILE_PATH, '');
    
    // Read CSV file
    if (!fs.existsSync(CSV_FILE_PATH)) {
      throw new Error(`CSV file not found: ${CSV_FILE_PATH}`);
    }
    
    const fileContent = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length < 2) {
      throw new Error('CSV file must have at least header row and one data row');
    }
    
    log(`Total lines in CSV: ${lines.length}`);
    
    // Skip header row and process data rows
    const dataLines = lines.slice(1);
    log(`Processing ${dataLines.length} data rows...`);
    
    // Connect to database
    log('Connecting to MongoDB...');
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error('MONGODB_URI environment variable not set');
    }
    
    await mongoose.connect(mongoURI);
    log('Connected to MongoDB successfully');
    
    // Process each row
    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i].trim();
      if (line) {
        const columns = parseCSVLine(line);
        await processRow(columns);
        
        // Progress indicator
        if ((i + 1) % 50 === 0) {
          log(`Processed ${i + 1}/${dataLines.length} rows...`);
        }
      }
    }
    
    // Print final statistics
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    log('\n=== IMPORT COMPLETE ===');
    log(`Duration: ${duration} seconds`);
    log(`Total rows processed: ${stats.processed}`);
    log(`Rows skipped: ${stats.skipped}`);
    log(`Records created:`);
    log(`  - Urusan: ${stats.created.urusan}`);
    log(`  - Bidang: ${stats.created.bidang}`);
    log(`  - Program: ${stats.created.program}`);
    log(`  - Kegiatan: ${stats.created.kegiatan}`);
    log(`  - SubKegiatan: ${stats.created.subKegiatan}`);
    
    if (stats.errors.length > 0) {
      log(`\nErrors encountered: ${stats.errors.length}`);
      stats.errors.forEach((error, index) => {
        log(`  ${index + 1}. ${error}`, 'ERROR');
      });
    }
    
    // Database cleanup
    await mongoose.connection.close();
    log('Database connection closed');
    
    log(`\nLog file saved to: ${LOG_FILE_PATH}`);
    
  } catch (error) {
    log(`FATAL ERROR: ${error.message}`, 'FATAL');
    log(`Stack trace: ${error.stack}`, 'FATAL');
    
    // Ensure database connection is closed
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  log('Import interrupted by user');
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  process.exit(0);
});

// Run the import
importUrusanData();