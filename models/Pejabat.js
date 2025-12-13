import mongoose from 'mongoose';

const pejabatSchema = new mongoose.Schema({
  nama: {
    type: String,
    required: true,
    trim: true
  },
  // Updated to support multiple Jabatan Struktural
  jabatanStrukturalList: [{
    position: {
      type: String,
      required: true,
      trim: true
    },
    subOrganisasiId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubPerangkatDaerah',
      required: false
    },
    assignedAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  // Keep the old field for backward compatibility during migration
  jabatanStruktural: {
    type: String,
    required: false,
    trim: true
  },
  jabatanFungsional: {
    type: String,
    required: false,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true
  },
  telepon: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    required: true,
    enum: ['Aktif', 'Tidak Aktif']
  },
  nip: {
    type: String,
    required: true,
    unique: true,
    trim: true
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
pejabatSchema.index({ nama: 1 });
pejabatSchema.index({ 'jabatanStrukturalList.position': 1 });
pejabatSchema.index({ 'jabatanStrukturalList.subOrganisasiId': 1 });
pejabatSchema.index({ jabatanFungsional: 1 });
pejabatSchema.index({ email: 1 });
pejabatSchema.index({ status: 1 });

// Virtual to get active Jabatan Struktural positions
pejabatSchema.virtual('activeJabatanStruktural').get(function() {
  return this.jabatanStrukturalList.filter(pos => pos.isActive);
});

// Ensure virtual fields are serialized
pejabatSchema.set('toJSON', { virtuals: true });
pejabatSchema.set('toObject', { virtuals: true });

const Pejabat = mongoose.model('Pejabat', pejabatSchema);

export default Pejabat;