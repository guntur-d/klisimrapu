import mongoose from 'mongoose';

const terminSchema = new mongoose.Schema({
  kontrakId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Kontrak',
    required: true
  },
  
  termin: {
    type: String,
    required: true,
    trim: true
  },
  
  persentaseDana: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  
  jumlahDana: {
    type: Number,
    required: true,
    min: 0
  },
  
  progressPersen: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  
  // Payment status for vendor reporting
  isPaid: {
    type: Boolean,
    default: false
  },
  
  paymentDate: {
    type: Date
  },
  
  // Vendor reporting fields
  realisasiFisik: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  realisasiBelanja: {
    type: Number,
    min: 0,
    default: 0
  },
  
  // Reporting period and date
  laporanDate: {
    type: Date
  },
  
  periodeMulai: {
    type: Date
  },
  
  periodeSampai: {
    type: Date
  },
  
  laporanFile: {
    filename: String,
    contentType: String,
    data: Buffer,
    uploadDate: Date
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
terminSchema.index({ kontrakId: 1 });
terminSchema.index({ progressPersen: 1 });
terminSchema.index({ isPaid: 1 });

export default mongoose.model('Termin', terminSchema);