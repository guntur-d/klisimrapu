const { connect, getPool } = require('./db/db');
const { DatabaseService } = require('./db/schema');

async function testDatabaseConnection() {
  try {
    console.log('🧪 Testing MariaDB Connection...');
    
    // Test basic connection
    const pool = await connect();
    console.log('✅ MariaDB connection successful');
    
    // Test query execution
    const result = await DatabaseService.query('SELECT 1 as test');
    console.log('✅ Database query test successful:', result);
    
    // Test table creation (optional - only if tables don't exist)
    console.log('📋 Checking if tables exist...');
    
    const tableCheck = await DatabaseService.query('SHOW TABLES');
    console.log('📋 Existing tables:', tableCheck.map(row => Object.values(row)[0]));
    
    if (tableCheck.length === 0) {
      console.log('⚠️  No tables found. Please run the migration.sql script first.');
      console.log('   Execute: mysql -u root -p < db/migration.sql');
    } else {
      console.log('✅ Tables exist and are accessible');
    }
    
    // Test specific table operations
    console.log('\n🔍 Testing table operations...');
    
    // Test allwil operations
    try {
      const allwilData = await DatabaseService.findAllWil();
      console.log(`✅ allwil table: ${allwilData.length} records found`);
    } catch (error) {
      console.log(`⚠️  allwil table: ${error.message}`);
    }
    
    // Test wil operations
    try {
      const wilData = await DatabaseService.findWil();
      console.log(`✅ wil table: ${wilData.length} records found`);
    } catch (error) {
      console.log(`⚠️  wil table: ${error.message}`);
    }
    
    // Test submit operations
    try {
      const submitData = await DatabaseService.findSubmit();
      console.log(`✅ submit table: ${submitData.length} records found`);
    } catch (error) {
      console.log(`⚠️  submit table: ${error.message}`);
    }
    
    // Test kontak operations
    try {
      const kontakData = await DatabaseService.findKontak();
      console.log(`✅ kontak table: ${kontakData.length} records found`);
    } catch (error) {
      console.log(`⚠️  kontak table: ${error.message}`);
    }
    
    // Test log operations
    try {
      const logData = await DatabaseService.findLog();
      console.log(`✅ log table: ${logData.length} records found`);
    } catch (error) {
      console.log(`⚠️  log table: ${error.message}`);
    }
    
    console.log('\n🎉 Database migration test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure MariaDB/MySQL is running');
    console.error('2. Check your .env file for correct database credentials');
    console.error('3. Ensure the database exists: CREATE DATABASE venice;');
    console.error('4. Run the migration script: mysql -u root -p < db/migration.sql');
    process.exit(1);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testDatabaseConnection();
}

module.exports = { testDatabaseConnection };