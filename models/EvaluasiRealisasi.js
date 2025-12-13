import mongoose from 'mongoose';

const evaluasiRealisasiSchema = new mongoose.Schema({
  // Reference to the related Realisasi document
  realisasiId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Realisasi',
    required: true
  },

  // Reference to Kode Rekening for easy querying
  kodeRekeningId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AkunLRA',
    required: true
  },

  // Reference to SubKegiatan
  subKegiatanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubKegiatan',
    required: true
  },

  // Reference to SubPerangkatDaerah (Unit Kerja)
  subPerangkatDaerahId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubPerangkatDaerah',
    required: true
  },

  // Period information
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

  // Budget and realization amounts for reference
  budgetAmount: {
    type: Number,
    required: true,
    min: 0
  },

  realizationAmount: {
    type: Number,
    required: true,
    min: 0
  },

  // Absorption rate percentage
  absorptionRate: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },

  // Evaluation details
  evaluationStatus: {
    type: String,
    enum: ['excellent', 'good', 'satisfactory', 'poor', 'very_poor'],
    required: true
  },

  // Main evaluation content
  constraints: [{
    type: String,
    trim: true,
    maxlength: 500
  }],

  problems: [{
    type: String,
    trim: true,
    maxlength: 500
  }],

  solutions: [{
    type: String,
    trim: true,
    maxlength: 500
  }],

  recommendations: [{
    type: String,
    trim: true,
    maxlength: 500
  }],

  // Performance indicators
  speedOfExecution: {
    type: String,
    enum: ['very_fast', 'fast', 'moderate', 'slow', 'very_slow'],
    required: true
  },

  fundAbsorptionEfficiency: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor'],
    required: true
  },

  // Procurement capability
  procurementCapability: {
    type: String,
    enum: ['excellent', 'good', 'needs_improvement', 'poor'],
    required: true
  },

  // Additional notes
  generalNotes: {
    type: String,
    trim: true,
    maxlength: 2000
  },

  // Evaluation metadata
  evaluatedBy: {
    type: mongoose.Schema.Types.Mixed, // Can be ObjectId or string
    ref: 'User',
    required: true
  },

  evaluationDate: {
    type: Date,
    default: Date.now
  },

  // Approval workflow
  isApproved: {
    type: Boolean,
    default: false
  },

  approvedBy: {
    type: mongoose.Schema.Types.Mixed,
    ref: 'User'
  },

  approvedAt: {
    type: Date
  },

  // Follow-up actions
  followUpRequired: {
    type: Boolean,
    default: false
  },

  followUpActions: [{
    action: {
      type: String,
      trim: true,
      maxlength: 500
    },
    assignedTo: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'User'
    },
    dueDate: {
      type: Date
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'cancelled'],
      default: 'pending'
    },
    completedAt: {
      type: Date
    }
  }]

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
evaluasiRealisasiSchema.index({ realisasiId: 1 }, { unique: true });
evaluasiRealisasiSchema.index({ subKegiatanId: 1, month: 1, year: 1 });
evaluasiRealisasiSchema.index({ subPerangkatDaerahId: 1, month: 1, year: 1 });
evaluasiRealisasiSchema.index({ kodeRekeningId: 1, month: 1, year: 1 });
evaluasiRealisasiSchema.index({ evaluationStatus: 1 });
evaluasiRealisasiSchema.index({ absorptionRate: 1 });

// Virtual for remaining amount
evaluasiRealisasiSchema.virtual('remainingAmount').get(function() {
  return this.budgetAmount - this.realizationAmount;
});

// Pre-save middleware to calculate absorption rate
evaluasiRealisasiSchema.pre('save', function(next) {
  if (this.isModified('budgetAmount') || this.isModified('realizationAmount')) {
    if (this.budgetAmount > 0) {
      this.absorptionRate = Math.min(100, (this.realizationAmount / this.budgetAmount) * 100);
    } else {
      this.absorptionRate = 0;
    }
  }
  next();
});

// Static methods for common queries
evaluasiRealisasiSchema.statics.findBySubKegiatan = function(subKegiatanId, month, year) {
  const query = { subKegiatanId };
  if (month && year) {
    query.month = month;
    query.year = year;
  }

  return this.find(query)
    .populate('kodeRekeningId')
    .populate('subPerangkatDaerahId')
    .populate('evaluatedBy', 'username nama')
    .populate('approvedBy', 'username nama')
    .sort({ evaluationDate: -1 });
};

evaluasiRealisasiSchema.statics.findByUnit = function(subPerangkatDaerahId, month, year) {
  const query = { subPerangkatDaerahId };
  if (month && year) {
    query.month = month;
    query.year = year;
  }

  return this.find(query)
    .populate('kodeRekeningId')
    .populate('subKegiatanId')
    .populate('evaluatedBy', 'username nama')
    .populate('approvedBy', 'username nama')
    .sort({ evaluationDate: -1 });
};

evaluasiRealisasiSchema.statics.findByStatus = function(evaluationStatus) {
  return this.find({ evaluationStatus })
    .populate('kodeRekeningId')
    .populate('subKegiatanId')
    .populate('subPerangkatDaerahId')
    .populate('evaluatedBy', 'username nama')
    .sort({ evaluationDate: -1 });
};

evaluasiRealisasiSchema.statics.findLowAbsorption = function(threshold = 80) {
  return this.find({ absorptionRate: { $lt: threshold } })
    .populate('kodeRekeningId')
    .populate('subKegiatanId')
    .populate('subPerangkatDaerahId')
    .populate('evaluatedBy', 'username nama')
    .sort({ absorptionRate: 1, evaluationDate: -1 });
};

evaluasiRealisasiSchema.statics.getEvaluationSummary = function(subPerangkatDaerahId, month, year) {
  const matchConditions = {};
  if (subPerangkatDaerahId) matchConditions.subPerangkatDaerahId = mongoose.Types.ObjectId(subPerangkatDaerahId);
  if (month) matchConditions.month = month;
  if (year) matchConditions.year = year;

  return this.aggregate([
    { $match: matchConditions },
    {
      $group: {
        _id: '$subPerangkatDaerahId',
        totalEvaluations: { $sum: 1 },
        avgAbsorptionRate: { $avg: '$absorptionRate' },
        statusBreakdown: {
          $push: '$evaluationStatus'
        },
        totalBudget: { $sum: '$budgetAmount' },
        totalRealization: { $sum: '$realizationAmount' }
      }
    },
    {
      $project: {
        subPerangkatDaerahId: '$_id',
        totalEvaluations: 1,
        avgAbsorptionRate: { $round: ['$avgAbsorptionRate', 2] },
        totalBudget: 1,
        totalRealization: 1,
        totalRemaining: { $subtract: ['$totalBudget', '$totalRealization'] },
        statusCounts: {
          excellent: { $size: { $filter: { input: '$statusBreakdown', cond: { $eq: ['$$this', 'excellent'] } } } },
          good: { $size: { $filter: { input: '$statusBreakdown', cond: { $eq: ['$$this', 'good'] } } } },
          satisfactory: { $size: { $filter: { input: '$statusBreakdown', cond: { $eq: ['$$this', 'satisfactory'] } } } },
          poor: { $size: { $filter: { input: '$statusBreakdown', cond: { $eq: ['$$this', 'poor'] } } } },
          very_poor: { $size: { $filter: { input: '$statusBreakdown', cond: { $eq: ['$$this', 'very_poor'] } } } }
        }
      }
    },
    {
      $lookup: {
        from: 'subperangkatdaerahs',
        localField: '_id',
        foreignField: '_id',
        as: 'unitInfo'
      }
    },
    { $unwind: '$unitInfo' }
  ]);
};

// Instance methods
evaluasiRealisasiSchema.methods.approve = function(approvedBy) {
  this.isApproved = true;
  this.approvedBy = approvedBy;
  this.approvedAt = new Date();

  return this.save();
};

evaluasiRealisasiSchema.methods.addFollowUpAction = function(action, assignedTo, dueDate) {
  this.followUpRequired = true;
  this.followUpActions.push({
    action,
    assignedTo,
    dueDate,
    status: 'pending'
  });

  return this.save();
};

evaluasiRealisasiSchema.methods.updateFollowUpStatus = function(actionIndex, status) {
  if (this.followUpActions[actionIndex]) {
    this.followUpActions[actionIndex].status = status;
    if (status === 'completed') {
      this.followUpActions[actionIndex].completedAt = new Date();
    }
  }

  return this.save();
};

evaluasiRealisasiSchema.methods.getEvaluationReport = function() {
  return {
    id: this._id,
    realisasiId: this.realisasiId,
    kodeRekening: this.kodeRekeningId,
    subKegiatan: this.subKegiatanId,
    unitKerja: this.subPerangkatDaerahId,
    period: `${this.month}/${this.year}`,
    budgetAmount: this.budgetAmount,
    realizationAmount: this.realizationAmount,
    absorptionRate: this.absorptionRate,
    remainingAmount: this.remainingAmount,
    evaluationStatus: this.evaluationStatus,
    constraints: this.constraints,
    problems: this.problems,
    solutions: this.solutions,
    recommendations: this.recommendations,
    speedOfExecution: this.speedOfExecution,
    fundAbsorptionEfficiency: this.fundAbsorptionEfficiency,
    procurementCapability: this.procurementCapability,
    generalNotes: this.generalNotes,
    evaluatedBy: this.evaluatedBy,
    evaluationDate: this.evaluationDate,
    isApproved: this.isApproved,
    approvedBy: this.approvedBy,
    approvedAt: this.approvedAt,
    followUpRequired: this.followUpRequired,
    followUpActions: this.followUpActions
  };
};

// Export the model
const EvaluasiRealisasi = mongoose.model('EvaluasiRealisasi', evaluasiRealisasiSchema);

export default EvaluasiRealisasi;