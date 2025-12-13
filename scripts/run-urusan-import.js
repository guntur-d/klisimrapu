#!/usr/bin/env node

/**
 * Simple runner script to execute the Urusan import
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting Urusan hierarchical data import...');
console.log('📂 Reading from: docs/Urusan_Cleaned_Spacing.csv');
console.log('💾 Saving to: MongoDB database');
console.log('📝 Log file: scripts/import-urusan-log.txt');
console.log('');

// Run the import script
const importScript = path.join(__dirname, 'import-urusan-hierarchical.js');

const child = spawn('node', [importScript], {
  stdio: 'inherit',
  cwd: process.cwd()
});

child.on('close', (code) => {
  console.log('');
  if (code === 0) {
    console.log('✅ Import completed successfully!');
  } else {
    console.log(`❌ Import failed with exit code: ${code}`);
    console.log('📋 Check the log file for details: scripts/import-urusan-log.txt');
  }
});

child.on('error', (error) => {
  console.error('❌ Error running import script:', error);
  process.exit(1);
});