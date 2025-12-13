import mongoose from 'mongoose';

const MonitoringSchema = new mongoose.Schema({
  // Basic Information
  kontrakId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Kontrak',
    required: true
  },
  subPerangkatDaerahId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubPerangkatDaerah',
    required: true
  },
  budgetYear: {
    type: String,
    required: true,
    default: '2026-Murni'
  },

  // Realisasi Information
  realisasiProgress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  realisasiDana: {
    type: Number,
    default: 0
  },
  realisasiDanaRp: {
    type: Number,
    default: 0
  },
   
  // Progress Tracking
  progressFisik: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  progressKeuangan: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
   
  // Status and Dates
  status: {
    type: String,
    enum: ['planning', 'in_progress', 'completed', 'on_hold', 'cancelled'],
    default: 'planning'
  },
  tanggalUpdate: {
    type: Date,
    default: Date.now
  },
   
  // Documentation
  keterangan: {
    type: String,
    default: ''
  },
  kendala: {
    type: String,
    default: ''
  },
  solusi: {
    type: String,
    default: ''
  },
   
  // Audit Trail
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
  collection: 'monitoring'
});

// Index for performance
MonitoringSchema.index({ kontrakId: 1 });
MonitoringSchema.index({ subPerangkatDaerahId: 1 });
MonitoringSchema.index({ budgetYear: 1 });

export default mongoose.model('Monitoring', MonitoringSchema);