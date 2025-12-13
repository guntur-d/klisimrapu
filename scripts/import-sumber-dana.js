import mongoose from 'mongoose';
import dotenv from 'dotenv';
const { default: SumberDana } = await import('../models/SumberDana.js');

dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/simrapu', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected for Sumber Dana import');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Sumber Dana data to import
const sumberDanaData = [
  { kode: '1', nama: 'Pendapatan Asli Daerah' },
  { kode: '1.1', nama: 'Opsen Pajak Kendaraan Bermotor (PKB)' },
  { kode: '2', nama: 'DAK' },
  { kode: '2.1', nama: 'DAK Fisik-Bidang Irigasi-Penugasan' },
  { kode: '2.2', nama: 'DAK Fisik-Bidang Jalan-Penugasan-Jalan' },
  { kode: '3', nama: 'Dana Alokasi Umum' },
  { kode: '3.1', nama: 'DAU yang Ditentukan Penggunaannya Bidang Pekerjaan Umum' },
  { kode: '4', nama: 'Dana Bagi Hasil' },
  { kode: '4.1', nama: 'DBH Cukai Hasil Tembakau (CHT)' }
];

// Import function
const importSumberDana = async () => {
  try {
    console.log('🚀 Starting Sumber Dana import...');
    
    // Clear existing data
    await SumberDana.deleteMany({});
    console.log('🧹 Cleared existing Sumber Dana data');
    
    // Insert new data
    const insertedData = await SumberDana.insertMany(sumberDanaData);
    console.log(`✅ Successfully imported ${insertedData.length} Sumber Dana records`);
    
    // Display summary
    console.log('\n📊 Import Summary:');
    insertedData.forEach(item => {
      console.log(`  • ${item.kode} - ${item.nama}`);
    });
    
    console.log('\n🎉 Sumber Dana import completed successfully!');
    
  } catch (error) {
    console.error('❌ Error importing Sumber Dana:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔒 MongoDB connection closed');
  }
};

// Run the import
const runImport = async () => {
  await connectDB();
  await importSumberDana();
};

runImport();