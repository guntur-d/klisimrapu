import mongoose from 'mongoose';

const targetSchema = new mongoose.Schema({
  kontrakId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Kontrak',
    required: true
  },
  
  tanggal: {
    type: Date,
    required: true
  },
  
  targetFisik: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  
  targetDana: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  
  targetDanaRp: {
    type: Number,
    required: true,
    min: 0
  },
  
  keterangan: {
    type: String,
    trim: true
  },
  
  // Metadata fields
  createdBy: {
    type: String,
    required: true
  },
  
  updatedBy: {
    type: String,
    required: true
  }
  
}, {
  timestamps: true,
  versionKey: false
});

// Create indexes for efficient querying
targetSchema.index({ kontrakId: 1 });
targetSchema.index({ tanggal: 1 });

export default mongoose.model('Target', targetSchema);