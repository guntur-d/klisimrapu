const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/simrapu');
    console.log('✅ MongoDB connected for updating anggaran sumber Dana');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Define schemas directly in the script
const anggaranSchema = new mongoose.Schema({
  subKegiatanId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubKegiatan', required: true },
  budgetYear: { type: String, required: true },
  sumberDanaId: { type: mongoose.Schema.Types.ObjectId, ref: 'SumberDana', required: false },
  allocations: [{
    kodeRekeningId: { type: mongoose.Schema.Types.ObjectId, ref: 'AkunLRA', required: true },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true, maxlength: 500 },
    allocatedAt: { type: Date, default: Date.now },
    allocatedBy: { type: mongoose.Schema.Types.Mixed, ref: 'User', required: false }
  }],
  totalAmount: { type: Number, default: 0 },
  description: { type: String, trim: true, maxlength: 1000 },
  createdBy: { type: mongoose.Schema.Types.Mixed, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.Mixed, ref: 'User', required: true }
}, { timestamps: true });

const sumberDanaSchema = new mongoose.Schema({
  kode: { type: String, required: true, unique: true },
  nama: { type: String, required: true, trim: true }
}, { timestamps: true });

// Create models
const Anggaran = mongoose.model('Anggaran', anggaranSchema);
const SumberDana = mongoose.model('SumberDana', sumberDanaSchema);

async function updateAnggaranSumberDana() {
  try {
    console.log('=== UPDATING ANGGARAN SUMBER DANA ===');
    
    // Find the specific anggaran record (the one you mentioned)
    const anggaran = await Anggaran.findById('68f4882b7400b5bb78be6c71');
    if (!anggaran) {
      console.log('Target anggaran record not found!');
      return;
    }
    
    console.log('Found target anggaran:', anggaran._id);
    console.log('Current sumberDanaId:', anggaran.sumberDanaId);
    
    // Find the DAK Fisik-Bidang Irigasi-Penugasan sumber Dana
    const targetSumberDana = await SumberDana.findOne({ 
      kode: '2.1',
      nama: 'DAK Fisik-Bidang Irigasi-Penugasan'
    });
    
    if (!targetSumberDana) {
      console.log('Target sumber Dana not found!');
      
      // List all available sumber Dana
      console.log('Available Sumber Dana:');
      const allSumberDana = await SumberDana.find({});
      allSumberDana.forEach(sd => {
        console.log(`- ${sd.kode} - ${sd.nama}`);
      });
      return;
    }
    
    console.log('Found target sumber Dana:', targetSumberDana.kode, '-', targetSumberDana.nama);
    
    // Update the anggaran record
    anggaran.sumberDanaId = targetSumberDana._id;
    await anggaran.save();
    
    console.log('✅ Successfully updated anggaran with new sumber Dana');
    
    // Verify the update
    const updatedAnggaran = await Anggaran.findById('68f4882b7400b5bb78be6c71').populate('sumberDanaId');
    console.log('Updated anggaran:');
    console.log('- ID:', updatedAnggaran._id);
    console.log('- sumberDanaId:', updatedAnggaran.sumberDanaId._id);
    console.log('- Sumber Dana:', updatedAnggaran.sumberDanaId.kode, '-', updatedAnggaran.sumberDanaId.nama);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDatabase disconnected');
    process.exit(0);
  }
}

// Run the update
const runUpdate = async () => {
  await connectDB();
  await updateAnggaranSumberDana();
};

runUpdate();