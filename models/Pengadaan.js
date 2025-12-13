import mongoose from 'mongoose';

const pengadaanSchema = new mongoose.Schema({
  // Reference to SubKegiatan (the activity this procurement belongs to)
  subKegiatanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubKegiatan',
    required: true
  },

  // Reference to SubPerangkatDaerah (the unit responsible for this procurement)
  subPerangkatDaerahId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubPerangkatDaerah',
    required: true
  },

  // Procurement code (unique within the same subkegiatan and unit)
  kode: {
    type: String,
    required: true,
    trim: true
  },

  // Procurement name
  nama: {
    type: String,
    required: true,
    trim: true
  },

  // Procurement description
  deskripsi: {
    type: String,
    trim: true
  },

  // Budget year for this procurement
  budgetYear: {
    type: String,
    required: true,
    match: /^\d{4}-\w+$/ // Format: "2026-Murni" or "2026-PAK"
  },

  // Status of the procurement
  status: {
    type: String,
    enum: ['draft', 'active', 'completed', 'cancelled'],
    default: 'draft'
  },

  // Estimated budget amount
  estimatedBudget: {
    type: Number,
    min: 0,
    default: 0
  },

  // Actual budget amount (when allocated)
  actualBudget: {
    type: Number,
    min: 0,
    default: 0
  },

  // Progress tracking
  progressPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },

  // Start date
  startDate: {
    type: Date
  },

  // End date
  endDate: {
    type: Date
  },

  // Location or area covered
  location: {
    type: String,
    trim: true
  },

  // Created by user reference
  createdBy: {
    type: mongoose.Schema.Types.Mixed, // Can be ObjectId or string
    ref: 'User',
    required: true
  },

  // Updated by user reference
  updatedBy: {
    type: mongoose.Schema.Types.Mixed, // Can be ObjectId or string
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create compound indexes for better performance and uniqueness constraints
pengadaanSchema.index({ subKegiatanId: 1, subPerangkatDaerahId: 1 });
pengadaanSchema.index({ kode: 1, subKegiatanId: 1, subPerangkatDaerahId: 1 }, { unique: true });
pengadaanSchema.index({ budgetYear: 1, subPerangkatDaerahId: 1 });
pengadaanSchema.index({ status: 1 });
pengadaanSchema.index({ subPerangkatDaerahId: 1, status: 1 });

// Virtual for duration calculation
pengadaanSchema.virtual('duration').get(function() {
  if (this.startDate && this.endDate) {
    return Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
  }
  return null;
});

// Pre-save middleware to update the updatedBy field
pengadaanSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedBy = this.updatedBy || this.createdBy;
  }
  next();
});

// Pre-update middleware
pengadaanSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();

  // Update the updatedBy field if not provided
  if (!update.updatedBy) {
    update.updatedBy = update.updatedBy || this._conditions.createdBy;
  }

  next();
});

// Validation to ensure unique procurement code within same subkegiatan and unit
pengadaanSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('kode') || this.isModified('subKegiatanId') || this.isModified('subPerangkatDaerahId')) {
    const existingProcurement = await mongoose.models.Pengadaan.findOne({
      kode: this.kode,
      subKegiatanId: this.subKegiatanId,
      subPerangkatDaerahId: this.subPerangkatDaerahId,
      _id: { $ne: this._id }
    });

    if (existingProcurement) {
      const error = new Error('Kode pengadaan sudah digunakan untuk subkegiatan dan unit kerja yang sama');
      error.code = 11000; // Duplicate key error
      return next(error);
    }
  }

  // Validate budget amounts
  if (this.estimatedBudget < 0 || this.actualBudget < 0) {
    const error = new Error('Anggaran tidak boleh negatif');
    return next(error);
  }

  // Validate progress percentage
  if (this.progressPercentage < 0 || this.progressPercentage > 100) {
    const error = new Error('Persentase progress harus antara 0-100');
    return next(error);
  }

  // Validate dates
  if (this.startDate && this.endDate && this.startDate > this.endDate) {
    const error = new Error('Tanggal mulai tidak boleh setelah tanggal selesai');
    return next(error);
  }

  next();
});

// Static methods for common queries
pengadaanSchema.statics.findBySubPerangkatDaerah = function(subPerangkatDaerahId, budgetYear) {
  const query = { subPerangkatDaerahId };
  if (budgetYear) query.budgetYear = budgetYear;
  return this.find(query)
    .populate('subKegiatanId')
    .sort({ 'subKegiatanId.kode': 1, kode: 1 });
};

pengadaanSchema.statics.findBySubKegiatan = function(subKegiatanId, subPerangkatDaerahId) {
  const query = { subKegiatanId };
  if (subPerangkatDaerahId) query.subPerangkatDaerahId = subPerangkatDaerahId;
  return this.find(query)
    .populate('subKegiatanId')
    .populate('subPerangkatDaerahId')
    .sort({ kode: 1 });
};

pengadaanSchema.statics.findByBudgetYear = function(budgetYear) {
  return this.find({ budgetYear })
    .populate('subKegiatanId')
    .populate('subPerangkatDaerahId')
    .sort({ 'subPerangkatDaerahId.nama': 1, 'subKegiatanId.kode': 1, kode: 1 });
};

pengadaanSchema.statics.findByStatus = function(status) {
  return this.find({ status })
    .populate('subKegiatanId')
    .populate('subPerangkatDaerahId')
    .sort({ 'subPerangkatDaerahId.nama': 1, 'subKegiatanId.kode': 1, kode: 1 });
};

// Static method to get procurement summary by unit
pengadaanSchema.statics.getProcurementSummary = function(subPerangkatDaerahId, budgetYear) {
  const matchConditions = { subPerangkatDaerahId };
  if (budgetYear) matchConditions.budgetYear = budgetYear;

  return this.aggregate([
    { $match: matchConditions },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalEstimatedBudget: { $sum: '$estimatedBudget' },
        totalActualBudget: { $sum: '$actualBudget' },
        avgProgress: { $avg: '$progressPercentage' }
      }
    },
    {
      $project: {
        status: '$_id',
        count: 1,
        totalEstimatedBudget: 1,
        totalActualBudget: 1,
        avgProgress: { $round: ['$avgProgress', 2] }
      }
    }
  ]);
};

// Instance methods
pengadaanSchema.methods.updateProgress = function(progressPercentage, updatedBy) {
  if (progressPercentage < 0 || progressPercentage > 100) {
    throw new Error('Persentase progress harus antara 0-100');
  }

  this.progressPercentage = progressPercentage;

  // Update status based on progress
  if (progressPercentage >= 100) {
    this.status = 'completed';
    this.endDate = this.endDate || new Date();
  } else if (progressPercentage > 0) {
    this.status = 'active';
  }

  this.updatedBy = updatedBy;
  return this.save();
};

pengadaanSchema.methods.getBudgetVariance = function() {
  if (this.estimatedBudget === 0) return 0;
  return ((this.actualBudget - this.estimatedBudget) / this.estimatedBudget) * 100;
};

pengadaanSchema.methods.isOverdue = function() {
  return this.status !== 'completed' && this.status !== 'cancelled' && this.endDate < new Date();
};

export default mongoose.model('Pengadaan', pengadaanSchema);