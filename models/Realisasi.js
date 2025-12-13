import mongoose from 'mongoose';

const realisasiSchema = new mongoose.Schema({
  // Reference to Kode Rekening (AkunLRA)
  kodeRekeningId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AkunLRA',
    required: true
  },

  // Budget amount from Anggaran allocation (for reference)
  budgetAmount: {
    type: Number,
    required: true,
    min: 0
  },

  // Actual realization amount input by user
  realizationAmount: {
    type: Number,
    required: true,
    min: 0
  },

  // Optional description for the realization
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },

  // Reference to SubKegiatan
  subKegiatanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubKegiatan',
    required: true
  },

  // Period tracking
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },

  year: {
    type: Number,
    required: true,
    min: 2020,
    max: 2030
  },

  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.Mixed, // Can be ObjectId or string
    ref: 'User',
    required: true
  },

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

// Indexes for performance and uniqueness
realisasiSchema.index({ kodeRekeningId: 1, subKegiatanId: 1, month: 1, year: 1 }, { unique: true });
realisasiSchema.index({ subKegiatanId: 1, month: 1, year: 1 });
realisasiSchema.index({ month: 1, year: 1 });
realisasiSchema.index({ kodeRekeningId: 1 });

// Virtual for remaining amount calculation
realisasiSchema.virtual('remainingAmount').get(function() {
  return this.budgetAmount - this.realizationAmount;
});

// Virtual for realization percentage
realisasiSchema.virtual('realizationPercentage').get(function() {
  if (this.budgetAmount === 0) return 0;
  return Math.min(100, (this.realizationAmount / this.budgetAmount) * 100);
});

// Pre-save middleware to update the updatedBy field
realisasiSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedBy = this.updatedBy || this.createdBy;
  }
  next();
});

// Validation to ensure unique realization per kode rekening per subkegiatan per period
realisasiSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('kodeRekeningId') || this.isModified('subKegiatanId') || this.isModified('month') || this.isModified('year')) {
    const existingRealisasi = await mongoose.models.Realisasi.findOne({
      kodeRekeningId: this.kodeRekeningId,
      subKegiatanId: this.subKegiatanId,
      month: this.month,
      year: this.year,
      _id: { $ne: this._id }
    });

    if (existingRealisasi) {
      const error = new Error('Realisasi untuk kode rekening dan periode ini sudah ada');
      error.code = 11000; // Duplicate key error
      return next(error);
    }
  }

  // Validate that realization amount is not greater than budget
  if (this.realizationAmount > this.budgetAmount) {
    const error = new Error('Jumlah realisasi tidak boleh melebihi anggaran');
    return next(error);
  }

  next();
});

// Static methods for common queries
realisasiSchema.statics.findBySubKegiatan = function(subKegiatanId) {
  return this.find({ subKegiatanId })
    .populate('kodeRekeningId')
    .sort({ year: -1, month: -1 });
};

realisasiSchema.statics.findByPeriod = function(month, year) {
  return this.find({ month, year })
    .populate('kodeRekeningId')
    .populate('subKegiatanId')
    .sort({ subKegiatanId: 1, kodeRekeningId: 1 });
};

realisasiSchema.statics.findByKodeRekening = function(kodeRekeningId) {
  return this.find({ kodeRekeningId })
    .populate('subKegiatanId')
    .sort({ year: -1, month: -1 });
};

realisasiSchema.statics.getRealizationSummary = function(subKegiatanId, month, year) {
  const matchConditions = { month, year };
  if (subKegiatanId) {
    matchConditions.subKegiatanId = subKegiatanId;
  }

  return this.aggregate([
    { $match: matchConditions },
    {
      $group: {
        _id: '$subKegiatanId',
        totalBudget: { $sum: '$budgetAmount' },
        totalRealization: { $sum: '$realizationAmount' },
        count: { $sum: 1 },
        avgRealizationPercentage: { $avg: { $multiply: [{ $divide: ['$realizationAmount', '$budgetAmount'] }, 100] } }
      }
    },
    {
      $project: {
        subKegiatanId: '$_id',
        totalBudget: 1,
        totalRealization: 1,
        count: 1,
        avgRealizationPercentage: { $round: ['$avgRealizationPercentage', 2] },
        remainingAmount: { $subtract: ['$totalBudget', '$totalRealization'] }
      }
    },
    {
      $lookup: {
        from: 'subkegiatans',
        localField: '_id',
        foreignField: '_id',
        as: 'subKegiatan'
      }
    },
    { $unwind: '$subKegiatan' }
  ]);
};

realisasiSchema.statics.getMonthlyReport = function(year) {
  return this.aggregate([
    { $match: { year } },
    {
      $group: {
        _id: { month: '$month', subKegiatanId: '$subKegiatanId' },
        totalBudget: { $sum: '$budgetAmount' },
        totalRealization: { $sum: '$realizationAmount' },
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        month: '$_id.month',
        subKegiatanId: '$_id.subKegiatanId',
        totalBudget: 1,
        totalRealization: 1,
        count: 1,
        realizationPercentage: { $round: [{ $multiply: [{ $divide: ['$totalRealization', '$totalBudget'] }, 100] }, 2] }
      }
    },
    {
      $lookup: {
        from: 'subkegiatans',
        localField: 'subKegiatanId',
        foreignField: '_id',
        as: 'subKegiatan'
      }
    },
    { $unwind: '$subKegiatan' },
    { $sort: { subKegiatanId: 1, month: 1 } }
  ]);
};

// Instance methods
realisasiSchema.methods.updateRealization = function(realizationAmount, description, updatedBy) {
  // Validate inputs
  if (realizationAmount < 0) {
    throw new Error('Jumlah realisasi tidak boleh negatif');
  }

  if (realizationAmount > this.budgetAmount) {
    throw new Error('Jumlah realisasi tidak boleh melebihi anggaran');
  }

  // Update fields
  this.realizationAmount = realizationAmount;
  this.description = description;
  this.updatedBy = updatedBy;

  return this.save();
};

realisasiSchema.methods.getAchievement = function() {
  return {
    kodeRekeningId: this.kodeRekeningId,
    budgetAmount: this.budgetAmount,
    realizationAmount: this.realizationAmount,
    remainingAmount: this.remainingAmount,
    realizationPercentage: this.realizationPercentage,
    period: `${this.month}/${this.year}`,
    description: this.description
  };
};

// Export the model
const Realisasi = mongoose.model('Realisasi', realisasiSchema);

export default Realisasi;