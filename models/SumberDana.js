import mongoose from 'mongoose';

const sumberDanaSchema = new mongoose.Schema({
  kode: {
    type: String,
    required: [true, 'Kode sumber dana harus diisi'],
    trim: true,
    unique: true
  },
  nama: {
    type: String,
    required: [true, 'Nama sumber dana harus diisi'],
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { 
    createdAt: 'createdAt', 
    updatedAt: 'updatedAt' 
  }
});

// Index untuk performance
sumberDanaSchema.index({ nama: 1 });
sumberDanaSchema.index({ isActive: 1 });

// Middleware untuk update updatedAt
sumberDanaSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const SumberDana = mongoose.model('SumberDana', sumberDanaSchema);

// For backward compatibility
export default SumberDana;