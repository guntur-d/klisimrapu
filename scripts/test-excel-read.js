#!/usr/bin/env node

import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing Excel file reading...');

try {
  const excelFilePath = path.join(__dirname, '..', 'docs', 'akunLRAtoEkspor_cleaned.xlsx');

  console.log('📁 Checking file existence...');
  if (!fs.existsSync(excelFilePath)) {
    console.error('❌ File not found:', excelFilePath);
    process.exit(1);
  }

  console.log('✅ File exists');
  console.log('📊 File size:', fs.statSync(excelFilePath).size, 'bytes');

  console.log('📖 Attempting to read Excel file...');
  const startTime = Date.now();
  const workbook = XLSX.readFile(excelFilePath);
  const endTime = Date.now();

  console.log(`✅ Excel file read successfully in ${endTime - startTime}ms`);
  console.log('📋 Available sheets:', workbook.SheetNames);

  const sheetName = workbook.SheetNames[0];
  console.log('📄 Using sheet:', sheetName);

  const worksheet = workbook.Sheets[sheetName];

  console.log('🔍 Converting to JSON...');
  const jsonStartTime = Date.now();
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  const jsonEndTime = Date.now();

  console.log(`✅ JSON conversion completed in ${jsonEndTime - jsonStartTime}ms`);
  console.log(`📊 Total rows: ${data.length}`);

  if (data.length > 0) {
    console.log('📝 First row:', data[0]);
  }

  if (data.length > 1) {
    console.log('📝 Second row:', data[1]);
  }

  if (data.length > 2) {
    console.log('📝 Third row:', data[2]);
  }

  if (data.length > 3) {
    console.log('📝 First data row:', data[3]);
  }

  console.log('🎉 Excel reading test completed successfully!');

} catch (error) {
  console.error('❌ Error during Excel reading test:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}