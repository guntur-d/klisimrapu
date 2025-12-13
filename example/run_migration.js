const fs = require('fs');
const { execSync } = require('child_process');
const { connect, getPool } = require('./db/db');

async function runMigration() {
  try {
    console.log('🚀 Running MariaDB Migration...');
    
    // First test connection
    const pool = await connect();
    console.log('✅ Database connection successful');
    
    // Check if migration.sql exists
    if (!fs.existsSync('./db/migration.sql')) {
      console.error('❌ Migration script not found at ./db/migration.sql');
      return;
    }
    
    // Read the migration SQL
    const migrationSQL = fs.readFileSync('./db/migration.sql', 'utf8');
    
    // Split SQL into individual statements and execute them
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📋 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'; // Add back the semicolon
      if (statement.trim() && !statement.trim() === ';') {
        try {
          await getPool().execute(statement);
          console.log(`✅ Executed statement ${i + 1}/${statements.length}`);
        } catch (error) {
          // Some statements might fail (like CREATE DATABASE if it exists)
          if (error.code === 'ER_DB_CREATE_EXISTS' || error.code === 'ER_TABLE_EXISTS_ERROR') {
            console.log(`⚠️  Statement ${i + 1}: Already exists (expected for some statements)`);
          } else {
            console.error(`❌ Statement ${i + 1} failed:`, error.message);
            console.error(`    SQL: ${statement.substring(0, 100)}...`);
          }
        }
      }
    }
    
    // Verify tables were created
    console.log('\n🔍 Verifying table creation...');
    const tables = await getPool().execute('SHOW TABLES');
    console.log('📊 Tables created:', tables[0].map(row => Object.values(row)[0]));
    
    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure MariaDB/MySQL server is running');
    console.error('2. Check database credentials in .env file');
    console.error('3. Ensure you have CREATE and ALTER privileges');
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };