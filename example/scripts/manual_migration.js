const { connect, getPool } = require('./db/db');

async function runManualMigration() {
  try {
    console.log('🚀 Running Manual MariaDB Migration...');
    
    // First test connection
    const pool = await connect();
    console.log('✅ Database connection successful');
    
    // Individual table creation statements
    const statements = [
      `CREATE TABLE IF NOT EXISTS allwil (
        id INT AUTO_INCREMENT PRIMARY KEY,
        kode VARCHAR(255) UNIQUE NOT NULL,
        nama VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_kode_allwil (kode)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
      
      `CREATE TABLE IF NOT EXISTS wil (
        id INT AUTO_INCREMENT PRIMARY KEY,
        kode VARCHAR(255) UNIQUE NOT NULL,
        nama VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_kode_wil (kode)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
      
      `CREATE TABLE IF NOT EXISTS submit (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        nama VARCHAR(255) NOT NULL,
        kodePemda VARCHAR(255) UNIQUE NOT NULL,
        instansi VARCHAR(255),
        jabatan VARCHAR(255),
        nohape VARCHAR(50),
        telp VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_kode_pemda (kodePemda),
        INDEX idx_instansi (instansi)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
      
      `CREATE TABLE IF NOT EXISTS kontak (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        subyek VARCHAR(500) NOT NULL,
        pesan TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email_kontak (email),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
      
      `CREATE TABLE IF NOT EXISTS log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255),
        method VARCHAR(50),
        desc JSON,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_username (username),
        INDEX idx_method (method),
        INDEX idx_timestamp (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
    ];
    
    console.log(`📋 Found ${statements.length} table creation statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        await getPool().execute(statement);
        console.log(`✅ Created table ${i + 1}/${statements.length}`);
      } catch (error) {
        if (error.code === 'ER_TABLE_EXISTS_ERROR') {
          console.log(`⚠️  Table ${i + 1}: Already exists (expected)`);
        } else {
          console.error(`❌ Table ${i + 1} failed:`, error.message);
        }
      }
    }
    
    // Verify tables were created
    console.log('\n🔍 Verifying table creation...');
    const tables = await getPool().execute('SHOW TABLES');
    console.log('📊 Tables created:', tables[0].map(row => Object.values(row)[0]));
    
    console.log('\n🎉 Manual migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  runManualMigration();
}

module.exports = { runManualMigration };