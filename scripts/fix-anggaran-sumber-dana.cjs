const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/simrapu', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected for Anggaran fix');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Define Anggaran schema directly in the script
const anggaranSchema = new mongoose.Schema({
  // Reference to SubKegiatan
  subKegiatanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubKegiatan',
    required: true
  },

  // Budget year
  budgetYear: {
    type: String,
    required: true,
    match: /^\d{4}-\w+$/ // Format: "2026-Murni" or "2026-PAK"
  },

  // Reference to Sumber Dana
  sumberDanaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SumberDana',
    required: false
  },

  // Array of budget allocations for different kode rekening (one-to-many)
  allocations: [{
    kodeRekeningId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AkunLRA',
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500
    },
    // Track when this allocation was created/modified
    allocatedAt: {
      type: Date,
      default: Date.now
    },
    allocatedBy: {
      type: mongoose.Schema.Types.Mixed, // Can be ObjectId or string
      ref: 'User',
      required: false // Make optional for now to debug
    }
  }],

  // Total budget amount (calculated field)
  totalAmount: {
    type: Number,
    default: 0
  },

  // Description
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },

  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.Mixed, // Can be ObjectId or string
    ref: 'User',
    required: true
  },

  updatedBy: {
    type: mongoose.Schema.Types.Mixed, // Can be ObjectId or string
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Create the model
const Anggaran = mongoose.model('Anggaran', anggaranSchema);

async function fixAnggaranSumberDana() {
  try {
    console.log('=== CHECKING AND FIXING ANGGARAN SUMBER DANA DATA ===');
    
    // Find all anggaran records
    const anggaranList = await Anggaran.find({});
    console.log('Total anggaran records:', anggaranList.length);
    
    // Check each record
    let fixedCount = 0;
    for (let anggaran of anggaranList) {
      console.log(`\n--- Record ${anggaran._id} ---`);
      console.log('Budget Year:', anggaran.budgetYear);
      console.log('Has sumberDanaId field:', 'sumberDanaId' in anggaran);
      console.log('Current sumberDanaId:', anggaran.sumberDanaId);
      
      // If the record doesn't have sumberDanaId, set it to null
      if (!anggaran.sumberDanaId) {
        console.log('Setting default sumberDanaId to null...');
        anggaran.sumberDanaId = null;
        await anggaran.save();
        fixedCount++;
        console.log('Fixed record');
      }
    }
    
    console.log(`\n=== SUMMARY ===`);
    console.log(`Total records processed: ${anggaranList.length}`);
    console.log(`Records fixed: ${fixedCount}`);
    
    // Show a sample of what records look like now
    console.log(`\n=== SAMPLE RECORDS AFTER FIX ===`);
    const sampleRecords = await Anggaran.find({}).limit(2);
    for (let anggaran of sampleRecords) {
      console.log('\nRecord structure:');
      console.log('- ID:', anggaran._id);
      console.log('- Budget Year:', anggaran.budgetYear);
      console.log('- sumberDanaId:', anggaran.sumberDanaId);
      console.log('- All fields:', Object.keys(anggaran.toObject()));
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDatabase disconnected');
    process.exit(0);
  }
}

// Run the fix
const runFix = async () => {
  await connectDB();
  await fixAnggaranSumberDana();
};

runFix();