import mongoose from 'mongoose';

const jaminanSchema = new mongoose.Schema({
  kontrakId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Kontrak',
    required: true
  },
  
  nomor: {
    type: String,
    required: true,
    trim: true
  },
  
  jenis: {
    type: String,
    required: true,
    enum: ['Bank Garansi', 'Surety Bond', 'Jaminan dari Lembaga Keuangan Non-Bank'],
    trim: true
  },
  
  tanggalMulai: {
    type: Date,
    required: true
  },
  
  tanggalBerakhir: {
    type: Date,
    required: true
  },
  
  nilai: {
    type: Number,
    required: true,
    min: 0
  },
  
  tanggalTerbit: {
    type: Date,
    required: true
  },
  
  penerbit: {
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
jaminanSchema.index({ kontrakId: 1 });
jaminanSchema.index({ tanggalBerakhir: 1 });

export default mongoose.model('Jaminan', jaminanSchema);