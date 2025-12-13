# Urusan Hierarchical Import Script

This script imports hierarchical government affairs (Urusan) data from the CSV file `docs/Urusan_Cleaned_Spacing.csv` into the MongoDB database.

## 📋 Overview

The import script processes a 5-level hierarchical structure:
1. **Urusan** - Government affairs/domains
2. **Bidang** - Fields within each affairs
3. **Program** - Programs within each field
4. **Kegiatan** - Activities within each program  
5. **SubKegiatan** - Sub-activities within each activity

## 📁 Files

- `scripts/import-urusan-hierarchical.js` - Main import script
- `scripts/run-urusan-import.js` - Simple runner script
- `scripts/import-urusan-log.txt` - Generated log file with import results
- `docs/Urusan_Cleaned_Spacing.csv` - Source data file

## 🚀 Usage

### Option 1: Using npm scripts (Recommended)
```bash
# Using the runner script
npm run import-urusan

# Or directly
npm run import-urusan-direct
```

### Option 2: Direct execution
```bash
# Run the main script directly
node scripts/import-urusan-hierarchical.js

# Or use the runner
node scripts/run-urusan-import.js
```

## 📊 Database Schema

The script creates/updates the following MongoDB collections:

### Urusan Collection
```javascript
{
  kode: String,      // Required, Unique
  nama: String,      // Required
  createdAt: Date,
  updatedAt: Date
}
```

### Bidang Collection
```javascript
{
  kode: String,        // Required
  nama: String,        // Required
  urusanId: ObjectId,  // Reference to Urusan
  createdAt: Date,
  updatedAt: Date
}
```

### Program Collection
```javascript
{
  kode: String,       // Required
  nama: String,       // Required
  bidangId: ObjectId, // Reference to Bidang
  createdAt: Date,
  updatedAt: Date
}
```

### Kegiatan Collection
```javascript
{
  kode: String,       // Required
  nama: String,       // Required
  programId: ObjectId, // Reference to Program
  createdAt: Date,
  updatedAt: Date
}
```

### SubKegiatan Collection
```javascript
{
  kode: String,       // Required
  nama: String,       // Required
  kinerja: String,    // Required
  indikator: String,  // Required
  satuan: String,     // Required
  kegiatanId: ObjectId, // Reference to Kegiatan
  createdAt: Date,
  updatedAt: Date
}
```

## 📝 CSV Format

The CSV file should have the following structure:

| Column | Field | Description |
|--------|--------|-------------|
| 1 | urusan | Urusan code and name (e.g., "X URUSAN PEMERINTAHAN BIDANG...") |
| 2 | bidangUrusan | Bidang code and name (e.g., "XX BIDANG PEKERJAAN UMUM...") |
| 3 | program | Program code and name (e.g., "1 PROGRAM PENGELOLAAN SDA...") |
| 4 | kegiatan | Kegiatan code (e.g., "2.01") |
| 5 | subKegiatan | SubKegiatan code (e.g., "1", "2") |
| 6 | uraian | Description/name of the activity |
| 7 | kinerja | Performance target |
| 8 | indikator | Performance indicator |
| 9 | satuan | Unit of measurement |

## 🔧 Features

- **Intelligent parsing**: Extracts codes and names from combined CSV fields
- **Hierarchical relationship building**: Automatically creates parent-child relationships
- **Duplicate prevention**: Checks for existing records before creating new ones
- **Progress tracking**: Shows progress every 50 rows processed
- **Comprehensive logging**: Detailed logs with timestamps and error tracking
- **Error recovery**: Continues processing even if individual rows fail
- **Statistics reporting**: Final report with creation counts and error summary

## 📈 Import Statistics

The script tracks and reports:
- Total rows processed
- Records created for each level (Urusan, Bidang, Program, Kegiatan, SubKegiatan)
- Rows skipped (empty rows)
- Errors encountered with details

## 🗂️ Example Log Output

```
[2025-11-27T01:58:20.322Z] [INFO] === Starting Urusan Hierarchical Import ===
[2025-11-27T01:58:20.323Z] [INFO] Reading CSV file: /path/to/docs/Urusan_Cleaned_Spacing.csv
[2025-11-27T01:58:20.323Z] [INFO] Connected to MongoDB successfully
[2025-11-27T01:58:25.456Z] [INFO] Created Urusan: X - URUSAN PEMERINTAHAN BIDANG PEKERJAAN UMUM DAN PENATAAN RUANG
[2025-11-27T01:58:25.789Z] [INFO] Created Bidang: 3 - PEKERJAAN UMUM DAN PENATAAN RUANG
[2025-11-27T01:58:26.123Z] [INFO] Created Program: 2 - PENGELOLAAN SUMBER DAYA AIR (SDA)
[2025-11-27T01:58:26.456Z] [INFO] Created Kegiatan: 2.01 - Pengelolaan SDA dan Bangunan Pengaman Pantai
[2025-11-27T01:58:26.789Z] [INFO] Created SubKegiatan: 13 - Pembangunan Stasiun Pompa Banjir

[IMPORT COMPLETE]
Duration: 15.23 seconds
Total rows processed: 593
Rows skipped: 0
Records created:
  - Urusan: 5
  - Bidang: 15
  - Program: 23
  - Kegiatan: 45
  - SubKegiatan: 505
```

## 🛠️ Error Handling

The script includes robust error handling:
- **Missing MongoDB connection**: Exits with clear error message
- **Invalid CSV format**: Reports parsing errors and continues
- **Database errors**: Logs errors and continues processing other records
- **Duplicate prevention**: Prevents creating duplicate records

## ⚙️ Environment Variables

Required environment variables:
- `MONGODB_URI`: MongoDB connection string

## 📍 Log File Location

Import logs are saved to: `scripts/import-urusan-log.txt`

## 🔄 Re-running the Import

The script is designed to be idempotent - you can run it multiple times:
- Existing records with matching codes/names will be reused
- No duplicate records will be created
- New records will be created for any missing data

## 🧹 Cleanup

To reset the data before re-importing:
```javascript
// Connect to MongoDB and run:
db.urusan.deleteMany({});
db.bidang.deleteMany({});
db.program.deleteMany({});
db.kegiatan.deleteMany({});
db.subkegiatan.deleteMany({});
```

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Check that `MONGODB_URI` is set in `.env` file
   - Ensure MongoDB server is running

2. **CSV File Not Found**
   - Verify the CSV file exists at `docs/Urusan_Cleaned_Spacing.csv`
   - Check file path and permissions

3. **Import Stuck**
   - Check the log file for progress indicators
   - Large imports may take several minutes

4. **Memory Issues**
   - For very large datasets, consider processing in chunks
   - Increase Node.js memory limit if needed: `node --max-old-space-size=4096`

## 📞 Support

Check the generated log file `scripts/import-urusan-log.txt` for detailed information about any issues encountered during the import process.