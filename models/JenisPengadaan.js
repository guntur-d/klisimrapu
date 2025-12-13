import mongoose from 'mongoose';

const jenisPengadaanSchema = new mongoose.Schema({
  kode: {
    type: String,
    required: true,
    trim: true,
    unique: true
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

export default mongoose.model('JenisPengadaan', jenisPengadaanSchema);