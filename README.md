# CSV Import Scripts

This directory contains scripts for importing data into the SIMRAPU system.

## 📋 Available Scripts

### `import-csv.js` - Main CSV Import Script
Imports hierarchical data from CSV file into MongoDB following this structure:
- **Urusan** → **Bidang** → **Program** → **Kegiatan** → **SubKegiatan**

### `test-import.js` - Import Test Script
Tests the import functionality with a small sample dataset.

## 🚀 Usage

### Import CSV Data
```bash
# Basic import (keeps existing data)
npm run import-csv

# Import with clearing existing data first
node scripts/import-csv.js docs/Urusan_Cleaned_Spacing.csv --clear

# Import custom CSV file
node scripts/import-csv.js path/to/your/file.csv
```

### Test Import Script
```bash
# Test the import functionality
node scripts/test-import.js
```

## 📊 CSV File Format

The CSV file should have the following columns:
1. `urusan` - Urusan code (e.g., "X", "1")
2. `bidangUrusan` - Bidang code (e.g., "XX", "3")
3. `program` - Program code (e.g., "1", "2")
4. `kegiatan` - Kegiatan code (e.g., "2.01")
5. `subKegiatan` - SubKegiatan code (e.g., "1", "2")
6. `uraian` - Description/Name
7. `kinerja` - Performance target
8. `indikator` - Indicator
9. `satuan` - Unit of measurement

## 🔧 Features

- **Hierarchical Import**: Maintains proper parent-child relationships
- **Data Validation**: Validates required fields before import
- **Progress Tracking**: Shows real-time progress during import
- **Error Handling**: Comprehensive error reporting
- **Duplicate Handling**: Updates existing records or creates new ones
- **Statistics**: Detailed import summary with counts

## 📈 Sample Output

```
🚀 Starting CSV import process...
🔄 Connecting to MongoDB...
✅ Connected to MongoDB successfully
📖 Reading CSV file...
📊 Found 593 data rows to process

🚀 Starting hierarchical data import...
  ➕ Created Urusan: X - URUSAN X.XX
    ➕ Created Bidang: XX - URUSAN PEMERINTAHAN BIDANG XX
      ➕ Created Program: 1 - PROGRAM PENUNJANG URUSAN PEMERINTAHAN DAERAH KABUPATEN/KOTA
        ➕ Created Kegiatan: 2.01 - Perencanaan, Penganggaran, dan Evaluasi Kinerja Perangkat Daerah
          ➕ Created SubKegiatan: 1 - Penyusunan Dokumen Perencanaan Perangkat Daerah

📋 ===== IMPORT SUMMARY =====
📊 Total rows processed: 593
✅ Successfully processed: 593
⏭️  Skipped: 0
❌ Errors: 0

📈 Creation Summary:
  ➕ Urusan created: 2
  ➕ Bidang created: 2
  ➕ Program created: 3
  ➕ Kegiatan created: 5
  ➕ SubKegiatan created: 593

🎉 Import completed!
```

## ⚠️ Important Notes

- The script uses the MongoDB connection from your `.env` file
- Make sure your database is accessible before running the import
- Use `--clear` flag to remove existing data before import (destructive!)
- The script handles relationships automatically
- Test with sample data before full import