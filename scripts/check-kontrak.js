import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function checkKontrak() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/simrapu');
    console.log('Connected to MongoDB');
    
    const Kontrak = (await import('./models/Kontrak.js')).default;
    const kontrakList = await Kontrak.find().sort({createdAt: -1}).limit(5).populate('paketKegiatanId');
    console.log('Recent kontrak records:');
    kontrakList.forEach((kontrak, index) => {
      console.log(`${index + 1}. ID: ${kontrak._id}`);
      console.log(`   No Kontrak: ${kontrak.noKontrak}`);
      console.log(`   Nilai: Rp ${kontrak.nilaiKontrak?.toLocaleString('id-ID')}`);
      console.log(`   Paket Kegiatan: ${kontrak.paketKegiatanId?.uraian || 'N/A'}`);
      console.log(`   Created: ${kontrak.createdAt}`);
      console.log('');
    });
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
  }
}

checkKontrak();