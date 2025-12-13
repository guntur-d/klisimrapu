import mongoose from 'mongoose';

const perangkatDaerahSchema = new mongoose.Schema({
  namaPemda: {
    type: String,
    required: true,
    trim: true
  },
  nama: {
    type: String,
    required: true,
    trim: true
  },
  alamat: {
    type: String,
    trim: true
  },
  kodeOrganisasi: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  telepon: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    trim: true,
    lowercase: true
  },
  jenis: {
    type: String,
    enum: ['Dinas', 'Badan', 'Satuan Kerja', 'Kecamatan', 'Kelurahan', 'Lainnya'],
    default: 'Dinas'
  },
  logo: {
    data: Buffer,
    contentType: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Create indexes for better performance
perangkatDaerahSchema.index({ namaPemda: 1 });
perangkatDaerahSchema.index({ nama: 1 });

// Virtual for sub-organizations
perangkatDaerahSchema.virtual('subOrganizations', {
  ref: 'SubPerangkatDaerah',
  localField: '_id',
  foreignField: 'perangkatDaerahId'
});

// Ensure virtual fields are serialized
perangkatDaerahSchema.set('toJSON', { virtuals: true });
perangkatDaerahSchema.set('toObject', { virtuals: true });

const PerangkatDaerah = mongoose.model('PerangkatDaerah', perangkatDaerahSchema);

export default PerangkatDaerah;