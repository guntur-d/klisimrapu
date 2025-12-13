import mongoose from 'mongoose';

const kinerjaSchema = new mongoose.Schema({
  // Reference to SubKegiatan for kinerja details
  subKegiatanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubKegiatan',
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

  // Target and actual values
  targetValue: {
    type: Number,
    required: true,
    min: 0
  },

  actualValue: {
    type: Number,
    default: 0,
    min: 0
  },

  // Achievement percentage (calculated field)
  achievementPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  // Status tracking
  status: {
    type: String,
    enum: ['planning', 'in_progress', 'completed', 'cancelled'],
    default: 'planning'
  },

  // Progress tracking
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
    actualValue: {
      type: Number,
      min: 0
    }
  }],

  // Additional metadata
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },

  // Priority level
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },

  // Deadline for completion
  targetDate: {
    type: Date,
    required: true
  },

  // Completion date
  completionDate: {
    type: Date
  },

  // Lokasi (location) - defaults to namaPemda from perangkatdaerah
  lokasi: {
    type: String,
    trim: true,
    maxlength: 200
  },

  // Pengguna anggaran (budget user) - references pejabat with jabatanFungsional = 'Pengguna Anggaran'
  penggunaAnggaran: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pejabat'
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
kinerjaSchema.index({ subKegiatanId: 1, subPerangkatDaerahId: 1, budgetYear: 1 }, { unique: true });
kinerjaSchema.index({ subPerangkatDaerahId: 1, budgetYear: 1 });
kinerjaSchema.index({ anggaranId: 1 });
kinerjaSchema.index({ status: 1 });
kinerjaSchema.index({ budgetYear: 1, status: 1 });
kinerjaSchema.index({ targetDate: 1 });

// Virtual for achievement percentage calculation
kinerjaSchema.virtual('calculatedAchievementPercentage').get(function() {
  if (this.targetValue === 0) return 0;
  return Math.min(100, (this.actualValue / this.targetValue) * 100);
});

// Pre-save middleware to update calculated fields
kinerjaSchema.pre('save', async function(next) {
  // Update achievement percentage
  this.achievementPercentage = this.calculatedAchievementPercentage;

  // Update completion date when status becomes completed
  if (this.status === 'completed' && !this.completionDate) {
    this.completionDate = new Date();
  } else if (this.status !== 'completed') {
    this.completionDate = null;
  }

  // Update the updatedBy field
  if (this.isModified() && !this.isNew) {
    this.updatedBy = this.updatedBy || this.createdBy;
  }

  // Set default lokasi if not provided
  if (!this.lokasi && this.isNew) {
    try {
      // Get the subPerangkatDaerah to find the perangkatDaerah
      const SubPerangkatDaerah = mongoose.models.SubPerangkatDaerah || mongoose.model('SubPerangkatDaerah', require('./SubPerangkatDaerah.js').default.schema);
      const subUnit = await SubPerangkatDaerah.findById(this.subPerangkatDaerahId).populate('perangkatDaerahId');
      if (subUnit && subUnit.perangkatDaerahId) {
        let namaPemda = subUnit.perangkatDaerahId.namaPemda;

        // Clean up the namaPemda according to the rules
        if (namaPemda) {
          // Remove "Pemerintah" prefix if present
          namaPemda = namaPemda.replace(/^Pemerintah\s+/, '');

          // Handle Pemkab/Pemkot abbreviations
          namaPemda = namaPemda.replace(/^Pemkab\s+/, 'Kabupaten ');
          namaPemda = namaPemda.replace(/^Pemkot\s+/, 'Kota ');
        }

        this.lokasi = namaPemda;
      }
    } catch (error) {
      console.error('Error setting default lokasi:', error);
    }
  }

  next();
});

// Pre-update middleware for progress updates
kinerjaSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();

  // Calculate achievement percentage if target or actual values are being updated
  if (update.targetValue !== undefined || update.actualValue !== undefined) {
    const targetValue = update.targetValue || this._conditions.targetValue;
    const actualValue = update.actualValue !== undefined ? update.actualValue : this._conditions.actualValue;

    if (targetValue && targetValue > 0) {
      update.achievementPercentage = Math.min(100, (actualValue / targetValue) * 100);
    }
  }

  // Set completion date when status becomes completed
  if (update.status === 'completed' && !update.completionDate) {
    update.completionDate = new Date();
  } else if (update.status && update.status !== 'completed') {
    update.completionDate = null;
  }

  next();
});

// Validation to ensure unique kinerja per subkegiatan per sub-organisasi per budget year
kinerjaSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('subKegiatanId') || this.isModified('subPerangkatDaerahId') || this.isModified('budgetYear')) {
    const existingKinerja = await mongoose.models.Kinerja.findOne({
      subKegiatanId: this.subKegiatanId,
      subPerangkatDaerahId: this.subPerangkatDaerahId,
      budgetYear: this.budgetYear,
      _id: { $ne: this._id }
    });

    if (existingKinerja) {
      const error = new Error('Kinerja untuk subkegiatan dan unit kerja ini sudah ada untuk tahun anggaran yang sama');
      error.code = 11000; // Duplicate key error
      return next(error);
    }
  }

  // Validate target value is positive
  if (this.targetValue <= 0) {
    const error = new Error('Target nilai harus lebih besar dari 0');
    return next(error);
  }

  // Validate target date is in the future or current year
  if (this.targetDate && this.targetDate < new Date(new Date().getFullYear(), 0, 1)) {
    const error = new Error('Tanggal target harus dalam tahun berjalan atau masa depan');
    return next(error);
  }

  next();
});

// Static methods for common queries
kinerjaSchema.statics.findBySubPerangkatDaerah = function(subPerangkatDaerahId, budgetYear) {
  const query = { subPerangkatDaerahId };
  if (budgetYear) query.budgetYear = budgetYear;
  return this.find(query)
    .populate('subKegiatanId')
    .populate('anggaranId')
    .sort({ targetDate: 1 });
};

kinerjaSchema.statics.findByBudgetYear = function(budgetYear) {
  return this.find({ budgetYear })
    .populate('subKegiatanId')
    .populate('subPerangkatDaerahId')
    .populate('anggaranId')
    .populate('penggunaAnggaran', 'nama jabatanFungsional')
    .sort({ targetDate: 1 });
};

kinerjaSchema.statics.findByStatus = function(status) {
  return this.find({ status })
    .populate('subKegiatanId')
    .populate('subPerangkatDaerahId')
    .populate('anggaranId')
    .sort({ targetDate: 1 });
};

kinerjaSchema.statics.findByAnggaran = function(anggaranId) {
  return this.find({ anggaranId })
    .populate('subKegiatanId')
    .populate('subPerangkatDaerahId')
    .sort({ targetDate: 1 });
};

// Static method to get achievement summary
kinerjaSchema.statics.getAchievementSummary = function(budgetYear, subPerangkatDaerahId) {
  const matchConditions = { budgetYear };
  if (subPerangkatDaerahId) {
    matchConditions.subPerangkatDaerahId = subPerangkatDaerahId;
  }

  return this.aggregate([
    { $match: matchConditions },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalTarget: { $sum: '$targetValue' },
        totalActual: { $sum: '$actualValue' },
        avgAchievement: { $avg: '$achievementPercentage' }
      }
    },
    {
      $project: {
        status: '$_id',
        count: 1,
        totalTarget: 1,
        totalActual: 1,
        avgAchievement: { $round: ['$avgAchievement', 2] }
      }
    }
  ]);
};

// Instance methods for progress tracking
kinerjaSchema.methods.updateProgress = function(actualValue, note, recordedBy) {
  // Validate inputs
  if (actualValue < 0) {
    throw new Error('Nilai aktual tidak boleh negatif');
  }

  // Update actual value
  this.actualValue = actualValue;

  // Recalculate achievement percentage
  this.achievementPercentage = this.calculatedAchievementPercentage;

  // Add progress note if provided
  if (note && recordedBy) {
    this.progressNotes.push({
      date: new Date(),
      note,
      recordedBy,
      actualValue
    });
  }

  // Update status based on achievement
  if (this.achievementPercentage >= 100) {
    this.status = 'completed';
    this.completionDate = new Date();
  } else if (this.actualValue > 0) {
    this.status = 'in_progress';
  }

  return this.save();
};

kinerjaSchema.methods.addProgressNote = function(note, recordedBy, actualValue) {
  if (!note || !recordedBy) {
    throw new Error('Catatan dan perekam harus diisi');
  }

  this.progressNotes.push({
    date: new Date(),
    note,
    recordedBy,
    actualValue: actualValue || this.actualValue
  });

  return this.save();
};

kinerjaSchema.methods.getProgressHistory = function() {
  return this.progressNotes.sort((a, b) => new Date(b.date) - new Date(a.date));
};

kinerjaSchema.methods.isOverdue = function() {
  return this.status !== 'completed' && this.targetDate < new Date();
};

kinerjaSchema.methods.getDaysRemaining = function() {
  const today = new Date();
  const targetDate = new Date(this.targetDate);
  const diffTime = targetDate - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Export the model
const Kinerja = mongoose.model('Kinerja', kinerjaSchema);

export default Kinerja;