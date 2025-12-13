import mongoose from 'mongoose';

const evaluasiKinerjaSchema = new mongoose.Schema({
  // Reference to Pencapaian being evaluated
  pencapaianId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pencapaian',
    required: true
  },

  // Reference to Kinerja for context
  kinerjaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Kinerja',
    required: true
  },

  // Reference to SubPerangkatDaerah (unit being evaluated)
  subPerangkatDaerahId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubPerangkatDaerah',
    required: true
  },

  // Evaluation period (month/year from pencapaian)
  periodMonth: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },

  periodYear: {
    type: Number,
    required: true,
    min: 2020,
    max: 2030
  },

  // Budget year for reference
  budgetYear: {
    type: String,
    required: true,
    match: /^\d{4}-\w+$/ // Format: "2026-Murni" or "2026-PAK"
  },

  // Evaluation details
  evaluationStatus: {
    type: String,
    enum: ['pending', 'in_review', 'approved', 'rejected', 'revision_required'],
    default: 'pending'
  },

  // Evaluation scores and ratings
  achievementScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },

  documentationScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },

  overallScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },

  // Evaluation feedback and notes
  evaluationNotes: {
    type: String,
    trim: true,
    maxlength: 2000
  },

  // Strengths identified in the evaluation
  strengths: [{
    type: String,
    trim: true,
    maxlength: 500
  }],

  // Areas for improvement
  improvements: [{
    type: String,
    trim: true,
    maxlength: 500
  }],

  // Recommendations for future performance
  recommendations: [{
    type: String,
    trim: true,
    maxlength: 500
  }],

  // Evaluation criteria checklist
  criteriaChecklist: [{
    criterion: {
      type: String,
      required: true,
      trim: true
    },
    isMet: {
      type: Boolean,
      default: false
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 300
    }
  }],

  // Rejection reason (if rejected)
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: 1000
  },

  // Revision requirements (if revision is required)
  revisionRequirements: [{
    type: String,
    trim: true,
    maxlength: 500
  }],

  // Evaluation workflow tracking
  submittedAt: {
    type: Date
  },

  submittedBy: {
    type: mongoose.Schema.Types.Mixed,
    ref: 'User'
  },

  evaluatedAt: {
    type: Date
  },

  evaluatedBy: {
    type: mongoose.Schema.Types.Mixed,
    ref: 'User',
    required: true
  },

  // Review workflow
  reviewNotes: [{
    date: {
      type: Date,
      default: Date.now
    },
    reviewedBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'in_review', 'approved', 'rejected', 'revision_required'],
      required: true
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    action: {
      type: String,
      enum: ['created', 'submitted', 'approved', 'rejected', 'revision_requested', 'completed'],
      default: 'created'
    }
  }],

  // Approval tracking
  approvedAt: {
    type: Date
  },

  approvedBy: {
    type: mongoose.Schema.Types.Mixed,
    ref: 'User'
  },

  // Final evaluation outcome
  finalOutcome: {
    type: String,
    enum: ['excellent', 'good', 'satisfactory', 'needs_improvement', 'unsatisfactory'],
    default: 'satisfactory'
  },

  // Performance grade
  performanceGrade: {
    type: String,
    enum: ['A', 'B', 'C', 'D', 'E'],
    default: 'C'
  },

  // Next evaluation due date
  nextEvaluationDate: {
    type: Date
  },

  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.Mixed,
    ref: 'User',
    required: true
  },

  updatedBy: {
    type: mongoose.Schema.Types.Mixed,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance and uniqueness
evaluasiKinerjaSchema.index({ pencapaianId: 1 }, { unique: true });
evaluasiKinerjaSchema.index({ kinerjaId: 1, periodMonth: 1, periodYear: 1 });
evaluasiKinerjaSchema.index({ subPerangkatDaerahId: 1, periodMonth: 1, periodYear: 1 });
evaluasiKinerjaSchema.index({ evaluationStatus: 1 });
evaluasiKinerjaSchema.index({ budgetYear: 1, periodMonth: 1, periodYear: 1 });
evaluasiKinerjaSchema.index({ evaluatedBy: 1 });
evaluasiKinerjaSchema.index({ evaluationStatus: 1, evaluatedAt: 1 });

// Virtual for formatted evaluation period
evaluasiKinerjaSchema.virtual('evaluationPeriod').get(function() {
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return `${monthNames[this.periodMonth - 1]} ${this.periodYear}`;
});

// Virtual for evaluation progress
evaluasiKinerjaSchema.virtual('evaluationProgress').get(function() {
  switch (this.evaluationStatus) {
    case 'pending': return 'Menunggu Evaluasi';
    case 'in_review': return 'Sedang Ditinjau';
    case 'approved': return 'Disetujui';
    case 'rejected': return 'Ditolak';
    case 'revision_required': return 'Perlu Revisi';
    default: return 'Status Tidak Dikenal';
  }
});

// Pre-save middleware to calculate overall score and update metadata
evaluasiKinerjaSchema.pre('save', function(next) {
  // Calculate overall score from achievement and documentation scores
  if (this.achievementScore > 0 || this.documentationScore > 0) {
    this.overallScore = Math.round((this.achievementScore + this.documentationScore) / 2);
  }

  // Update evaluation timestamp when status changes to approved
  if (this.evaluationStatus === 'approved' && !this.evaluatedAt) {
    this.evaluatedAt = new Date();
  }

  // Set approval timestamp when approved
  if (this.evaluationStatus === 'approved' && !this.approvedAt) {
    this.approvedAt = new Date();
  }

  next();
});

// Pre-update middleware for status changes
evaluasiKinerjaSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();

  // Calculate overall score if component scores are being updated
  if (update.achievementScore !== undefined || update.documentationScore !== undefined) {
    const achievementScore = update.achievementScore !== undefined ? update.achievementScore : this._conditions.achievementScore;
    const documentationScore = update.documentationScore !== undefined ? update.documentationScore : this._conditions.documentationScore;

    if (achievementScore !== undefined && documentationScore !== undefined) {
      update.overallScore = Math.round((achievementScore + documentationScore) / 2);
    }
  }

  // Set evaluation timestamp when status changes to approved
  if (update.evaluationStatus === 'approved' && !update.evaluatedAt) {
    update.evaluatedAt = new Date();
  }

  // Set approval timestamp when status changes to approved
  if (update.evaluationStatus === 'approved' && !update.approvedAt) {
    update.approvedAt = new Date();
  }

  next();
});

// Validation to ensure unique evaluation per pencapaian
evaluasiKinerjaSchema.pre('save', async function(next) {
  if (this.isNew) {
    const existingEvaluation = await mongoose.models.EvaluasiKinerja.findOne({
      pencapaianId: this.pencapaianId
    });

    if (existingEvaluation) {
      const error = new Error('Evaluasi untuk pencapaian ini sudah ada');
      error.code = 11000; // Duplicate key error
      return next(error);
    }
  }

  // Validate scores are within range
  if (this.achievementScore < 0 || this.achievementScore > 100) {
    const error = new Error('Nilai pencapaian harus antara 0-100');
    return next(error);
  }

  if (this.documentationScore < 0 || this.documentationScore > 100) {
    const error = new Error('Nilai dokumentasi harus antara 0-100');
    return next(error);
  }

  next();
});

// Static methods for common queries
evaluasiKinerjaSchema.statics.findBySubPerangkatDaerah = function(subPerangkatDaerahId, periodYear, periodMonth) {
  const query = { subPerangkatDaerahId };
  if (periodYear) query.periodYear = periodYear;
  if (periodMonth) query.periodMonth = periodMonth;
  return this.find(query)
    .populate('pencapaianId')
    .populate('kinerjaId')
    .populate('evaluatedBy', 'username')
    .populate('approvedBy', 'username')
    .sort({ periodYear: -1, periodMonth: -1 });
};

evaluasiKinerjaSchema.statics.findByStatus = function(status) {
  return this.find({ evaluationStatus: status })
    .populate('pencapaianId')
    .populate('kinerjaId')
    .populate('subPerangkatDaerahId')
    .populate('evaluatedBy', 'username')
    .sort({ periodYear: -1, periodMonth: -1 });
};

evaluasiKinerjaSchema.statics.findByEvaluator = function(evaluatedBy) {
  return this.find({ evaluatedBy })
    .populate('pencapaianId')
    .populate('kinerjaId')
    .populate('subPerangkatDaerahId')
    .sort({ periodYear: -1, periodMonth: -1 });
};

evaluasiKinerjaSchema.statics.findByPeriod = function(periodYear, periodMonth) {
  const query = { periodYear };
  if (periodMonth) query.periodMonth = periodMonth;
  return this.find(query)
    .populate('pencapaianId')
    .populate('kinerjaId')
    .populate('subPerangkatDaerahId')
    .populate('evaluatedBy', 'username')
    .sort({ subPerangkatDaerahId: 1, periodMonth: 1 });
};

// Static method to get evaluation summary
evaluasiKinerjaSchema.statics.getEvaluationSummary = function(budgetYear, subPerangkatDaerahId) {
  const matchConditions = {};
  if (budgetYear) matchConditions.budgetYear = budgetYear;
  if (subPerangkatDaerahId) matchConditions.subPerangkatDaerahId = subPerangkatDaerahId;

  return this.aggregate([
    { $match: matchConditions },
    {
      $group: {
        _id: '$evaluationStatus',
        count: { $sum: 1 },
        avgAchievementScore: { $avg: '$achievementScore' },
        avgDocumentationScore: { $avg: '$documentationScore' },
        avgOverallScore: { $avg: '$overallScore' }
      }
    },
    {
      $project: {
        status: '$_id',
        count: 1,
        avgAchievementScore: { $round: ['$avgAchievementScore', 2] },
        avgDocumentationScore: { $round: ['$avgDocumentationScore', 2] },
        avgOverallScore: { $round: ['$avgOverallScore', 2] }
      }
    }
  ]);
};

// Instance methods for evaluation workflow
evaluasiKinerjaSchema.methods.submitForEvaluation = function(submittedBy) {
  this.evaluationStatus = 'pending';
  this.submittedAt = new Date();
  this.submittedBy = submittedBy;

  // Add review note
  this.reviewNotes.push({
    reviewedBy: submittedBy,
    status: 'pending',
    action: 'submitted',
    notes: 'Pencapaian diajukan untuk evaluasi'
  });

  return this.save();
};

evaluasiKinerjaSchema.methods.startEvaluation = function(evaluatedBy) {
  this.evaluationStatus = 'in_review';
  this.evaluatedBy = evaluatedBy;

  // Add review note
  this.reviewNotes.push({
    reviewedBy: evaluatedBy,
    status: 'in_review',
    action: 'started_evaluation',
    notes: 'Evaluasi dimulai'
  });

  return this.save();
};

evaluasiKinerjaSchema.methods.approveEvaluation = function(evaluatedBy, notes) {
  this.evaluationStatus = 'approved';
  this.evaluatedAt = new Date();
  this.evaluatedBy = evaluatedBy;
  this.approvedAt = new Date();
  this.approvedBy = evaluatedBy;

  // Set performance grade based on overall score
  if (this.overallScore >= 90) {
    this.performanceGrade = 'A';
    this.finalOutcome = 'excellent';
  } else if (this.overallScore >= 80) {
    this.performanceGrade = 'B';
    this.finalOutcome = 'good';
  } else if (this.overallScore >= 70) {
    this.performanceGrade = 'C';
    this.finalOutcome = 'satisfactory';
  } else if (this.overallScore >= 60) {
    this.performanceGrade = 'D';
    this.finalOutcome = 'needs_improvement';
  } else {
    this.performanceGrade = 'E';
    this.finalOutcome = 'unsatisfactory';
  }

  // Add review note
  this.reviewNotes.push({
    reviewedBy: evaluatedBy,
    status: 'approved',
    action: 'approved',
    notes: notes || 'Evaluasi disetujui'
  });

  return this.save();
};

evaluasiKinerjaSchema.methods.rejectEvaluation = function(evaluatedBy, reason) {
  this.evaluationStatus = 'rejected';
  this.evaluatedAt = new Date();
  this.evaluatedBy = evaluatedBy;
  this.rejectionReason = reason;

  // Add review note
  this.reviewNotes.push({
    reviewedBy: evaluatedBy,
    status: 'rejected',
    action: 'rejected',
    notes: `Evaluasi ditolak: ${reason}`
  });

  return this.save();
};

evaluasiKinerjaSchema.methods.requestRevision = function(evaluatedBy, requirements, notes) {
  this.evaluationStatus = 'revision_required';
  this.evaluatedAt = new Date();
  this.evaluatedBy = evaluatedBy;
  this.revisionRequirements = requirements || [];

  // Add review note
  this.reviewNotes.push({
    reviewedBy: evaluatedBy,
    status: 'revision_required',
    action: 'revision_requested',
    notes: notes || 'Diperlukan revisi pada laporan pencapaian'
  });

  return this.save();
};

evaluasiKinerjaSchema.methods.updateScores = function(achievementScore, documentationScore, notes, updatedBy) {
  // Validate scores
  if (achievementScore < 0 || achievementScore > 100) {
    throw new Error('Nilai pencapaian harus antara 0-100');
  }
  if (documentationScore < 0 || documentationScore > 100) {
    throw new Error('Nilai dokumentasi harus antara 0-100');
  }

  // Update scores
  this.achievementScore = achievementScore;
  this.documentationScore = documentationScore;
  this.overallScore = Math.round((achievementScore + documentationScore) / 2);
  this.updatedBy = updatedBy;

  // Add review note
  if (notes) {
    this.reviewNotes.push({
      reviewedBy: updatedBy,
      status: this.evaluationStatus,
      action: 'scores_updated',
      notes: `Nilai diperbarui: Pencapaian ${achievementScore}, Dokumentasi ${documentationScore}. ${notes}`
    });
  }

  return this.save();
};

evaluasiKinerjaSchema.methods.addReviewNote = function(notes, reviewedBy, action = 'note_added') {
  if (!notes || !reviewedBy) {
    throw new Error('Catatan dan pemeriksa harus diisi');
  }

  this.reviewNotes.push({
    reviewedBy,
    status: this.evaluationStatus,
    action,
    notes
  });

  return this.save();
};

evaluasiKinerjaSchema.methods.getReviewHistory = function() {
  return this.reviewNotes.sort((a, b) => new Date(b.date) - new Date(a.date));
};

evaluasiKinerjaSchema.methods.isOverdue = function() {
  // Consider evaluation overdue if submitted more than 30 days ago and still pending
  if (this.evaluationStatus === 'pending' && this.submittedAt) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return this.submittedAt < thirtyDaysAgo;
  }
  return false;
};

// Export the model
const EvaluasiKinerja = mongoose.model('EvaluasiKinerja', evaluasiKinerjaSchema);

export default EvaluasiKinerja;