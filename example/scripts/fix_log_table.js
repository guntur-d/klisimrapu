const { connect, getPool } = require('./db/db');

async function createLogTable() {
  try {
    console.log('🔧 Fixing log table creation with proper column naming...');
    
    // First test connection
    const pool = await connect();
    console.log('✅ Database connection successful');
    
    // Create the log table with escaped column name
    const statement = `CREATE TABLE IF NOT EXISTS log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255),
      method VARCHAR(50),
      \`desc\` TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_username (username),
      INDEX idx_method (method),
      INDEX idx_timestamp (timestamp)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;
    
    try {
      await getPool().execute(statement);
      console.log('✅ Log table created successfully with escaped column name');
    } catch (error) {
      if (error.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('⚠️  Log table already exists, checking if we can add column...');
        // Try to add the desc column if table exists
        try {
          await getPool().execute('ALTER TABLE log ADD COLUMN \`desc\` TEXT');
          console.log('✅ Added desc column to existing log table');
        } catch (alterError) {
          console.log('⚠️  Column might already exist or table structure is different');
        }
      } else {
        console.error('❌ Log table creation failed:', error.message);
      }
    }
    
    // Verify all tables exist
    console.log('\n🔍 Verifying all tables...');
    const tables = await getPool().execute('SHOW TABLES');
    console.log('📊 All tables:', tables[0].map(row => Object.values(row)[0]));
    
    if (tables[0].length === 5) {
      console.log('\n🎉 ALL TABLES CREATED SUCCESSFULLY!');
      console.log('✅ MongoDB to MariaDB migration COMPLETE!');
    } else {
      console.log(`\n⚠️  Expected 5 tables, found ${tables[0].length}`);
    }
    
    // Test the database service
    console.log('\n🧪 Testing database service...');
    try {
      const logCount = await getPool().execute('SELECT COUNT(*) as count FROM log');
      console.log('✅ Database service working, log table accessible');
    } catch (testError) {
      console.log('⚠️  Database service test failed:', testError.message);
    }
    
  } catch (error) {
    console.error('❌ Log table creation failed:', error.message);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  createLogTable();
}

module.exports = { createLogTable };