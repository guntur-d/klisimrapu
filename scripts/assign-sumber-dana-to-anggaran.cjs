const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/simrapu');
    console.log('✅ MongoDB connected for assigning sumber Dana');
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

async function assignSumberDana() {
  try {
    console.log('=== ASSIGNING SUMBER DANA TO ANGGARAN ===');
    
    // Get available sumber Dana
    const sumberDanaList = await SumberDana.find({});
    console.log('Available Sumber Dana:', sumberDanaList.length);
    
    if (sumberDanaList.length === 0) {
      console.log('No sumber Dana found! Please import sumber Dana first.');
      return;
    }
    
    // Get first sumber Dana for assignment
    const firstSumberDana = sumberDanaList[0];
    console.log('Assigning sumber Dana:', firstSumberDana.kode, '-', firstSumberDana.nama);
    
    // Find first anggaran record and update it
    const anggaran = await Anggaran.findOne({});
    if (!anggaran) {
      console.log('No anggaran found!');
      return;
    }
    
    console.log('Updating anggaran:', anggaran._id);
    anggaran.sumberDanaId = firstSumberDana._id;
    await anggaran.save();
    
    console.log('✅ Successfully assigned sumber Dana to anggaran');
    console.log('Anggaran now has sumberDanaId:', anggaran.sumberDanaId);
    
    // Show the updated record
    const updatedAnggaran = await Anggaran.findById(anggaran._id).populate('sumberDanaId');
    console.log('Updated anggaran with populated sumber Dana:', updatedAnggaran);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDatabase disconnected');
    process.exit(0);
  }
}

// Run the assignment
const runAssignment = async () => {
  await connectDB();
  await assignSumberDana();
};

runAssignment();