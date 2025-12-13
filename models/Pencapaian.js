import mongoose from 'mongoose';

const pencapaianSchema = new mongoose.Schema({
  // Reference to Kinerja (the performance target)
  kinerjaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Kinerja',
    required: true
  },

  // Reference to SubPerangkatDaerah (responsible unit)
  subPerangkatDaerahId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubPerangkatDaerah',
    required: true
  },

  // Reference to Anggaran for budget context
  anggaranId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Anggaran',
    required: true
  },

  // Budget year from Anggaran
  budgetYear: {
    type: String,
    required: true,
    match: /^\d{4}-\w+$/ // Format: "2026-Murni" or "2026-PAK"
  },

  // Achievement period (month/year for periodic reporting)
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

  // Achievement values - can be numeric or descriptive
  achievementValue: {
    type: mongoose.Schema.Types.Mixed, // Can be number or string
    required: true
  },

  // Achievement type based on target type
  achievementType: {
    type: String,
    enum: ['numeric', 'descriptive'],
    required: true
  },

  // Calculated percentage (only for numeric achievements)
  achievementPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  // Status of the achievement report
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'rejected'],
    default: 'draft'
  },

  // Progress notes and history
  progressNotes: [{
    date: {
      type: Date,
      default: Date.now
    },
    note: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },
    recordedBy: {
      type: mongoose.Schema.Types.Mixed, // Can be ObjectId or string
      ref: 'User',
      required: true
    },
    previousValue: {
      type: mongoose.Schema.Types.Mixed
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    }
  }],

  // Additional description or context
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },

  // Evidence or supporting documents (PDF files stored as binary data)
  evidenceFiles: [{
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    fileData: {
      type: Buffer,
      required: true
    },
    fileSize: {
      type: Number,
      required: true,
      max: 1024 * 1024 // 1 MB limit
    },
    mimeType: {
      type: String,
      required: true,
      enum: ['application/pdf'],
      default: 'application/pdf'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'User',
      required: true
    }
  }],

  // Approval workflow
  submittedAt: {
    type: Date
  },

  submittedBy: {
    type: mongoose.Schema.Types.Mixed,
    ref: 'User'
  },

  approvedAt: {
    type: Date
  },

  approvedBy: {
    type: mongoose.Schema.Types.Mixed,
    ref: 'User'
  },

  rejectionReason: {
    type: String,
    trim: true,
    maxlength: 500
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
pencapaianSchema.index({ kinerjaId: 1, periodMonth: 1, periodYear: 1 }, { unique: true });
pencapaianSchema.index({ subPerangkatDaerahId: 1, periodMonth: 1, periodYear: 1 });
pencapaianSchema.index({ anggaranId: 1, periodMonth: 1, periodYear: 1 });
pencapaianSchema.index({ budgetYear: 1, periodMonth: 1, periodYear: 1 });
pencapaianSchema.index({ status: 1 });
pencapaianSchema.index({ achievementType: 1 });

// Virtual for formatted period
pencapaianSchema.virtual('formattedPeriod').get(function() {
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return `${monthNames[this.periodMonth - 1]} ${this.periodYear}`;
});

// Pre-save middleware to calculate percentage and update metadata
pencapaianSchema.pre('save', function(next) {
  // Update achievement percentage if it's a numeric achievement
  if (this.achievementType === 'numeric' && this.achievementValue !== null && this.achievementValue !== undefined) {
    // Get the kinerja to find the target value
    if (this.kinerjaId) {
      mongoose.model('Kinerja').findById(this.kinerjaId).then(kinerja => {
        if (kinerja && kinerja.targetValue > 0) {
          this.achievementPercentage = Math.min(100, (this.achievementValue / kinerja.targetValue) * 100);
        }
        next();
      }).catch(next);
    } else {
      next();
    }
  } else {
    this.achievementPercentage = 0;
    next();
  }
});

// Pre-update middleware for progress updates
pencapaianSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();

  // Calculate achievement percentage if values are being updated
  if (update.achievementValue !== undefined || update.kinerjaId !== undefined) {
    // This will be handled in the instance method since we need to query the kinerja
    next();
  } else {
    next();
  }
});

// Validation to ensure unique pencapaian per kinerja per period
pencapaianSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('kinerjaId') || this.isModified('periodMonth') || this.isModified('periodYear')) {
    const existingPencapaian = await mongoose.models.Pencapaian.findOne({
      kinerjaId: this.kinerjaId,
      periodMonth: this.periodMonth,
      periodYear: this.periodYear,
      _id: { $ne: this._id }
    });

    if (existingPencapaian) {
      const error = new Error('Pencapaian untuk periode ini sudah ada untuk kinerja yang sama');
      error.code = 11000; // Duplicate key error
      return next(error);
    }
  }

  // Validate achievement value based on type
  if (this.achievementType === 'numeric' && this.achievementValue !== null && this.achievementValue !== undefined) {
    const numValue = Number(this.achievementValue);
    if (isNaN(numValue) || numValue < 0) {
      const error = new Error('Nilai pencapaian numerik harus berupa angka positif');
      return next(error);
    }
    this.achievementValue = numValue;
  }

  // Validate evidence files (PDF only, max 1 MB)
  if (this.evidenceFiles && this.evidenceFiles.length > 0) {
    this.evidenceFiles.forEach(file => {
      if (file.fileSize > 1024 * 1024) {
        const error = new Error('Ukuran file tidak boleh melebihi 1 MB');
        return next(error);
      }
      if (file.mimeType !== 'application/pdf') {
        const error = new Error('Hanya file PDF yang diperbolehkan');
        return next(error);
      }
    });
  }

  // Set submitted timestamp when status changes to submitted
  if (this.isModified('status') && this.status === 'submitted' && !this.submittedAt) {
    this.submittedAt = new Date();
  }

  // Set approved timestamp when status changes to approved
  if (this.isModified('status') && this.status === 'approved' && !this.approvedAt) {
    this.approvedAt = new Date();
  }

  next();
});

// Static methods for common queries
pencapaianSchema.statics.findBySubPerangkatDaerah = function(subPerangkatDaerahId, periodYear, periodMonth) {
  const query = { subPerangkatDaerahId };
  if (periodYear) query.periodYear = periodYear;
  if (periodMonth) query.periodMonth = periodMonth;
  return this.find(query)
    .populate('kinerjaId')
    .populate('anggaranId')
    .sort({ periodYear: -1, periodMonth: -1 });
};

pencapaianSchema.statics.findByBudgetYear = function(budgetYear) {
  return this.find({ budgetYear })
    .populate('kinerjaId')
    .populate('subPerangkatDaerahId')
    .populate('anggaranId')
    .sort({ periodYear: -1, periodMonth: -1 });
};

pencapaianSchema.statics.findByStatus = function(status) {
  return this.find({ status })
    .populate('kinerjaId')
    .populate('subPerangkatDaerahId')
    .populate('anggaranId')
    .sort({ periodYear: -1, periodMonth: -1 });
};

pencapaianSchema.statics.findByPeriod = function(periodYear, periodMonth) {
  const query = { periodYear };
  if (periodMonth) query.periodMonth = periodMonth;
  return this.find(query)
    .populate('kinerjaId')
    .populate('subPerangkatDaerahId')
    .populate('anggaranId')
    .sort({ periodYear: -1, periodMonth: -1 });
};

// Static method to get achievement summary
pencapaianSchema.statics.getAchievementSummary = function(budgetYear, subPerangkatDaerahId) {
  const matchConditions = {};
  if (budgetYear) matchConditions.budgetYear = budgetYear;
  if (subPerangkatDaerahId) matchConditions.subPerangkatDaerahId = subPerangkatDaerahId;

  return this.aggregate([
    { $match: matchConditions },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgPercentage: { $avg: '$achievementPercentage' },
        totalNumeric: {
          $sum: { $cond: [{ $eq: ['$achievementType', 'numeric'] }, 1, 0] }
        },
        totalDescriptive: {
          $sum: { $cond: [{ $eq: ['$achievementType', 'descriptive'] }, 1, 0] }
        }
      }
    },
    {
      $project: {
        status: '$_id',
        count: 1,
        avgPercentage: { $round: ['$avgPercentage', 2] },
        totalNumeric: 1,
        totalDescriptive: 1
      }
    }
  ]);
};

// Instance methods for progress tracking
pencapaianSchema.methods.updateAchievement = function(achievementValue, description, recordedBy) {
  // Validate inputs
  if (achievementValue === null || achievementValue === undefined) {
    throw new Error('Nilai pencapaian harus diisi');
  }

  // Store previous value for progress tracking
  const previousValue = this.achievementValue;

  // Update achievement value
  this.achievementValue = achievementValue;

  // Recalculate achievement percentage if numeric
  if (this.achievementType === 'numeric') {
    // We need to get the kinerja to calculate percentage
    return mongoose.model('Kinerja').findById(this.kinerjaId).then(kinerja => {
      if (kinerja && kinerja.targetValue > 0) {
        this.achievementPercentage = Math.min(100, (this.achievementValue / kinerja.targetValue) * 100);
      }

      // Add progress note if provided
      if (description && recordedBy) {
        this.progressNotes.push({
          date: new Date(),
          note: description,
          recordedBy,
          previousValue,
          newValue: achievementValue
        });
      }

      return this.save();
    });
  } else {
    // For descriptive achievements, no percentage calculation needed
    if (description && recordedBy) {
      this.progressNotes.push({
        date: new Date(),
        note: description,
        recordedBy,
        previousValue,
        newValue: achievementValue
      });
    }

    return this.save();
  }
};

pencapaianSchema.methods.addProgressNote = function(note, recordedBy) {
  if (!note || !recordedBy) {
    throw new Error('Catatan dan perekam harus diisi');
  }

  this.progressNotes.push({
    date: new Date(),
    note,
    recordedBy,
    previousValue: this.achievementValue,
    newValue: this.achievementValue
  });

  return this.save();
};

pencapaianSchema.methods.submitAchievement = function(submittedBy) {
  this.status = 'submitted';
  this.submittedAt = new Date();
  this.submittedBy = submittedBy;
  return this.save();
};

pencapaianSchema.methods.approveAchievement = function(approvedBy, notes) {
  this.status = 'approved';
  this.approvedAt = new Date();
  this.approvedBy = approvedBy;
  if (notes) {
    this.addProgressNote(`Disetujui: ${notes}`, approvedBy);
  }
  return this.save();
};

pencapaianSchema.methods.rejectAchievement = function(rejectedBy, reason) {
  this.status = 'rejected';
  this.rejectionReason = reason;
  if (rejectedBy) {
    this.addProgressNote(`Ditolak: ${reason}`, rejectedBy);
  }
  return this.save();
};

pencapaianSchema.methods.getProgressHistory = function() {
  return this.progressNotes.sort((a, b) => new Date(b.date) - new Date(a.date));
};

// Instance methods for file management
pencapaianSchema.methods.addEvidenceFile = function(fileData, originalName, uploadedBy) {
  // Validate file size (1 MB limit)
  if (fileData.length > 1024 * 1024) {
    throw new Error('Ukuran file tidak boleh melebihi 1 MB');
  }

  // Validate file type (PDF only)
  if (!fileData || fileData.length < 4) {
    throw new Error('File tidak valid');
  }

  // Check for PDF signature in file header
  const pdfSignature = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF
  const fileHeader = fileData.subarray(0, 4);
  if (!pdfSignature.equals(fileHeader)) {
    throw new Error('Hanya file PDF yang diperbolehkan');
  }

  // Generate unique filename
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const filename = `evidence_${timestamp}_${randomSuffix}.pdf`;

  // Add file to evidenceFiles array
  this.evidenceFiles.push({
    filename,
    originalName,
    fileData,
    fileSize: fileData.length,
    mimeType: 'application/pdf',
    uploadedAt: new Date(),
    uploadedBy
  });

  return this.save();
};

pencapaianSchema.methods.removeEvidenceFile = function(filename, removedBy) {
  const fileIndex = this.evidenceFiles.findIndex(file => file.filename === filename);

  if (fileIndex === -1) {
    throw new Error('File tidak ditemukan');
  }

  // Remove file from array
  this.evidenceFiles.splice(fileIndex, 1);

  // Add removal note to progress
  this.addProgressNote(`File bukti dihapus: ${filename}`, removedBy);

  return this.save();
};

pencapaianSchema.methods.getEvidenceFiles = function() {
  return this.evidenceFiles.map(file => ({
    filename: file.filename,
    originalName: file.originalName,
    fileSize: file.fileSize,
    mimeType: file.mimeType,
    uploadedAt: file.uploadedAt,
    uploadedBy: file.uploadedBy,
    // Generate download URL for the file
    downloadUrl: `/api/pencapaian/${this._id}/files/${file.filename}`
  }));
};

pencapaianSchema.methods.getTotalEvidenceSize = function() {
  return this.evidenceFiles.reduce((total, file) => total + file.fileSize, 0);
};

// Export the model
const Pencapaian = mongoose.model('Pencapaian', pencapaianSchema);

export default Pencapaian;