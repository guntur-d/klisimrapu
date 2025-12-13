# MongoDB to MariaDB Migration Guide

This guide provides step-by-step instructions for migrating your Node.js application from MongoDB to MariaDB.

## 📋 Migration Summary

The application has been successfully migrated from MongoDB to MariaDB. All database operations now use MariaDB with MySQL2 package.

## 🛠️ What Was Changed

### 1. Dependencies Updated
- Added `mysql2` package for MariaDB/MySQL connectivity
- Removed mongoose dependency (MongoDB ODM)

### 2. Files Modified
- **`db/db.js`** - Now uses MySQL connection pool instead of Mongoose
- **`db/schema.js`** - Replaced Mongoose models with SQL query service layer
- **`db/service.js`** - Updated to work with new database service layer
- **`server.js`** - Updated database connection handling
- **`.env`** - Consolidated database configuration
- **`package.json`** - Added mysql2 dependency

### 3. New Files Created
- **`db/migration.sql`** - SQL script to create all required tables
- **`test_database.js`** - Database connection test script

## 🚀 Getting Started

### Prerequisites
1. **MariaDB/MySQL Server** - Ensure MariaDB or MySQL is installed and running
2. **Database User** - Create a user with appropriate permissions
3. **Database** - Create the target database

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Database Settings
Edit your `.env` file to set your MariaDB connection details:

```env
# Local development (default)
DB_HOST = 127.0.0.1
DB_USER = root
DB_PASSWORD = your_password
DB_NAME = venice

# Production (uncomment and modify as needed)
# DB_HOST = your-production-host
# DB_USER = your-production-user
# DB_PASSWORD = your-production-password
# DB_NAME = your-production-database
```

### Step 3: Create Database and Tables

#### Option A: Using Command Line
```bash
# Login to MySQL/MariaDB
mysql -u root -p

# Create database
CREATE DATABASE venice;

# Exit MySQL and run migration script
exit
mysql -u root -p venice < db/migration.sql
```

#### Option B: Using MySQL Workbench/phpMyAdmin
1. Create a new database named `venice`
2. Open `db/migration.sql` file
3. Execute the SQL script in your MySQL client

### Step 4: Test Database Connection
```bash
node test_database.js
```

Expected output:
```
🧪 Testing MariaDB Connection...
✅ MariaDB connection successful
✅ Database query test successful: [ { test: 1 } ]
📋 Existing tables: ['allwil', 'wil', 'submit', 'kontak', 'log']
✅ allwil table: 0 records found
✅ wil table: 0 records found
✅ submit table: 0 records found
✅ kontak table: 0 records found
✅ log table: 0 records found
🎉 Database migration test completed successfully!
```

### Step 5: Start the Application
```bash
npm start
# or for development
npm run go
```

## 📊 Database Schema

The migration creates 5 main tables:

### 1. `allwil` - All Wilayah (Administrative Areas)
- `id` - Primary key (auto-increment)
- `kode` - Region code (unique)
- `nama` - Region name
- `created_at` - Creation timestamp
- `updated_at` - Update timestamp

### 2. `wil` - Wilayah (Sub-regions)
- `id` - Primary key (auto-increment)
- `kode` - Sub-region code (unique)
- `nama` - Sub-region name
- `created_at` - Creation timestamp
- `updated_at` - Update timestamp

### 3. `submit` - User Submissions
- `id` - Primary key (auto-increment)
- `email` - User email (unique)
- `nama` - User name
- `kodePemda` - Municipality code (unique)
- `instansi` - Institution/organization
- `jabatan` - Position/title
- `nohape` - Phone number
- `telp` - Telephone
- `created_at` - Creation timestamp
- `updated_at` - Update timestamp

### 4. `kontak` - Contact Messages
- `id` - Primary key (auto-increment)
- `nama` - Contact name
- `email` - Contact email
- `subyek` - Subject
- `pesan` - Message content
- `created_at` - Creation timestamp
- `updated_at` - Update timestamp

### 5. `log` - Activity Logs
- `id` - Primary key (auto-increment)
- `username` - User who performed action
- `method` - HTTP method or action type
- `desc` - Action description (JSON)
- `timestamp` - Action timestamp
- `created_at` - Creation timestamp

## 🔄 API Usage

The existing API endpoints remain the same, but now use MariaDB under the hood:

### POST `/api/service`
Generic CRUD operations via service layer:

```javascript
// Create record
{
  "method": "create",
  "tableName": "submitModel",
  "json": {
    "email": "user@example.com",
    "nama": "John Doe",
    "kodePemda": "KODE001",
    "instansi": "Organization",
    "jabatan": "Position",
    "nohape": "08123456789",
    "telp": "0211234567"
  }
}

// Get all records
{
  "method": "getAll",
  "tableName": "submitModel"
}

// Get by ID
{
  "method": "getById",
  "tableName": "submitModel",
  "id": 1
}

// Update record
{
  "method": "update",
  "tableName": "submitModel",
  "id": 1,
  "json": {
    "nama": "Updated Name"
  }
}

// Delete record
{
  "method": "delete",
  "tableName": "submitModel",
  "id": 1
}

// Custom query
{
  "method": "get",
  "tableName": "submitModel",
  "json": {
    "email": "user@example.com"
  }
}
```

## 🗃️ Direct Database Service Usage

You can also use the DatabaseService directly:

```javascript
const { DatabaseService } = require('./db/schema');

// Create a new submission
await DatabaseService.createSubmit({
  email: 'user@example.com',
  nama: 'John Doe',
  kodePemda: 'KODE001',
  instansi: 'Organization',
  jabatan: 'Position',
  nohape: '08123456789',
  telp: '0211234567'
});

// Find all submissions
const submissions = await DatabaseService.findSubmit();

// Find submission by email
const submission = await DatabaseService.findSubmitByEmail('user@example.com');

// Create a contact message
await DatabaseService.createKontak({
  nama: 'Jane Doe',
  email: 'jane@example.com',
  subyek: 'Question about service',
  pesan: 'I have a question...'
});

// Create activity log
await DatabaseService.createLog({
  username: 'admin',
  method: 'CREATE',
  desc: { action: 'user_registration', userId: 123 }
});
```

## 🔧 Troubleshooting

### Connection Issues
1. **ECONNREFUSED**: Make sure MariaDB/MySQL is running
   ```bash
   # On Windows
   net start mysql
   
   # On macOS
   brew services start mariadb
   
   # On Linux
   sudo systemctl start mariadb
   ```

2. **Access Denied**: Check your username and password in `.env`

3. **Database doesn't exist**: Create the database first
   ```sql
   CREATE DATABASE venice;
   ```

### Permission Issues
Make sure your database user has proper permissions:
```sql
GRANT ALL PRIVILEGES ON venice.* TO 'your_user'@'localhost';
FLUSH PRIVILEGES;
```

### Table Creation Issues
Run the migration script manually if automatic creation fails:
```bash
mysql -u root -p venice < db/migration.sql
```

## 🔄 Rolling Back (If Needed)

If you need to temporarily roll back to MongoDB:

1. **Update dependencies**: Change back to mongoose
2. **Update configuration**: Uncomment MongoDB URI in `.env`
3. **Update code**: Revert db files to use Mongoose
4. **Restart application**: `npm restart`

## 🚀 Performance Notes

- **Connection Pooling**: The new setup uses MySQL connection pooling for better performance
- **Prepared Statements**: All queries use prepared statements for security
- **Indexes**: Appropriate indexes have been added to frequently queried columns
- **UTF8 Support**: Tables use utf8mb4 charset for full Unicode support

## 📝 Development Tips

### Adding New Tables
1. Update `db/migration.sql` with CREATE TABLE statement
2. Add corresponding methods to `DatabaseService` in `db/schema.js`
3. Test with `test_database.js`

### Database Monitoring
Monitor your database performance:
```sql
SHOW PROCESSLIST;
SHOW TABLE STATUS;
SELECT * FROM information_schema.innodb_trx;
```

### Backup and Restore
```bash
# Backup
mysqldump -u root -p venice > backup.sql

# Restore
mysql -u root -p venice < backup.sql
```

## 📞 Support

If you encounter any issues during migration:

1. Check the console output for detailed error messages
2. Verify database credentials in `.env`
3. Ensure MariaDB/MySQL service is running
4. Run the test script: `node test_database.js`
5. Check database logs for additional information

---

**Migration completed successfully! 🎉**

Your application is now running on MariaDB instead of MongoDB. All existing functionality should work exactly as before, but with improved performance and reliability.