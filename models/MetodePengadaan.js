import mongoose from 'mongoose';

const metodePengadaanSchema = new mongoose.Schema({
  jenisPengadaanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JenisPengadaan',
    required: true
  },
  kode: {
    type: String,
    required: true,
    trim: true
  },
  nama: {
    type: String,
    required: true,
    trim: true
  },
  deskripsi: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Compound index to ensure unique kode within each jenisPengadaanId
metodePengadaanSchema.index({ jenisPengadaanId: 1, kode: 1 }, { unique: true });

export default mongoose.model('MetodePengadaan', metodePengadaanSchema);