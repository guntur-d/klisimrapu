import mongoose from 'mongoose';

const kontrakSchema = new mongoose.Schema({
  paketKegiatanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaketKegiatan',
    required: true
  },
  
  kodeSirupLkpp: {
    type: String,
    required: true,
    trim: true
  },
  
  penyediaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Penyedia',
    required: true
  },
  
  noKontrak: {
    type: String,
    required: true,
    trim: true
  },
  
  tglKontrak: {
    type: Date,
    required: true
  },
  
  noSpmk: {
    type: String,
    required: true,
    trim: true
  },
  
  tglSpmk: {
    type: Date,
    required: true
  },
  
  jangkaWaktu: {
    type: Number,
    required: true,
    min: 0
  },
  
  jangkaWaktuUnit: {
    type: String,
    enum: ['Hari', 'Minggu', 'Bulan', 'Tahun'],
    default: 'Hari'
  },
  
  tglPelaksanaanDari: {
    type: Date,
    required: true
  },
  
  tglPelaksanaanSampai: {
    type: Date,
    required: true
  },
  
  lokasi: {
    type: String,
    required: true,
    trim: true
  },
  
  hps: {
    type: Number,
    required: true,
    min: 0
  },
  
  nilaiKontrak: {
    type: Number,
    required: true,
    min: 0
  },
  
  tipe: {
    type: String,
    enum: ['Konstruksi', 'Non Konstruksi'],
    default: 'Konstruksi'
  },
  
  metodePengadaanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MetodePengadaan',
    required: true
  },
  
  kualifikasiPengadaan: {
    type: String,
    enum: ['Prakualifikasi', 'Pascakualifikasi'],
    default: 'Prakualifikasi'
  },
  
  // Auto-populated fields from paket kegiatan context
  kodeRekeningId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AkunLRA'
  },
  
  subKegiatanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubKegiatan'
  },
  
  anggaranId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Anggaran'
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
  
  deskripsi: {
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

// Create compound index for efficient querying
kontrakSchema.index({ subPerangkatDaerahId: 1, budgetYear: 1 });
kontrakSchema.index({ kodeRekeningId: 1 });
kontrakSchema.index({ paketKegiatanId: 1 });

export default mongoose.model('Kontrak', kontrakSchema);