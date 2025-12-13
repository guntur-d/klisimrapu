import mongoose from 'mongoose';

const operatorSchema = new mongoose.Schema({
  namaLengkap: {
    type: String,
    required: false,
    trim: true
  },
  username: {
    type: String,
    required: false,
    unique: false,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: false,
    minlength: 6
  },
  passwordDisplay: {
    type: String,
    required: false,
    minlength: 6
  }
}, { timestamps: true });

const subPerangkatDaerahSchema = new mongoose.Schema({
  nama: {
    type: String,
    required: true,
    trim: true
  },
  
  // New proper relationship with Pejabat model
  pimpinanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pejabat',
    required: false,
    default: null
  },
  
  // Legacy field for backward compatibility during migration
  // Can be removed after migration is complete
  pimpinan: {
    type: String,
    trim: true,
    required: false,
    default: ''
  },

  perangkatDaerahId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PerangkatDaerah',
    required: true
  },
  
  operators: [operatorSchema],
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  
  // Add schema options for better population handling
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Remove the unique index on operators.username since it's causing issues with empty arrays
// The original index was preventing duplicates but fails when no operators exist
subPerangkatDaerahSchema.index({ 'operators.username': 1 }, {
  unique: false,
  partialFilterExpression: { 'operators.username': { $exists: true, $ne: null } }
});

// Virtual field for populated pemimpin data
subPerangkatDaerahSchema.virtual('pemimpin', {
  ref: 'Pejabat',
  localField: 'pimpinanId',
  foreignField: '_id',
  justOne: true
});

// Create indexes for better performance
subPerangkatDaerahSchema.index({ nama: 1 });
subPerangkatDaerahSchema.index({ perangkatDaerahId: 1 });
subPerangkatDaerahSchema.index({ nama: 1, perangkatDaerahId: 1 }, { unique: true });
subPerangkatDaerahSchema.index({ pimpinanId: 1 });

// Pre-save middleware to sync legacy field with new relationship
subPerangkatDaerahSchema.pre('save', async function(next) {
  // If we have a new pimpinanId but no legacy name, try to populate
  if (this.pimpinanId && (!this.pimpinan || this.pimpinan.trim() === '')) {
    try {
      const Pejabat = mongoose.model('Pejabat');
      const pejabat = await Pejabat.findById(this.pimpinanId);
      if (pejabat) {
        this.pimpinan = pejabat.nama;
      }
    } catch (error) {
      console.warn('Could not populate pejabat name:', error.message);
    }
  }
  
  // Ensure consistency between fields
  if (this.pimpinanId && this.pimpinan && this.isModified('pimpinanId')) {
    try {
      const Pejabat = mongoose.model('Pejabat');
      const pejabat = await Pejabat.findById(this.pimpinanId);
      if (pejabat && pejabat.nama !== this.pimpinan) {
        // Update legacy field to match the pejabat name
        this.pimpinan = pejabat.nama;
      }
    } catch (error) {
      console.warn('Could not sync pemimpin data:', error.message);
    }
  }
  
  next();
});

// Static method to find by pemimpin
subPerangkatDaerahSchema.statics.findByPemimpin = function(pejabatId) {
  return this.find({ pimpinanId: pejabatId }).populate('perangkatDaerahId');
};

// Static method to get sub organizations with pemimpin info
subPerangkatDaerahSchema.statics.findWithPemimpin = function(filter = {}) {
  return this.find(filter).populate({
    path: 'pimpinanId',
    select: 'nama jabatanStruktural jabatanFungsional email telepon status nip'
  }).populate('perangkatDaerahId');
};

const SubPerangkatDaerah = mongoose.model('SubPerangkatDaerah', subPerangkatDaerahSchema);

export default SubPerangkatDaerah;