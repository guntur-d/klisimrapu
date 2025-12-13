import mongoose from 'mongoose';

const anggaranSchema = new mongoose.Schema({
  // Reference to SubKegiatan
  subKegiatanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubKegiatan',
    required: true
  },

  // Budget year
  budgetYear: {
    type: String,
    required: true,
    match: /^\d{4}-\w+$/ // Format: "2026-Murni" or "2026-PAK"
  },

  // Reference to Sumber Dana
  sumberDanaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SumberDana',
    required: false
  },

  // Array of budget allocations for different kode rekening (one-to-many)
  allocations: [{
    kodeRekeningId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AkunLRA',
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500
    },
    // Track when this allocation was created/modified
    allocatedAt: {
      type: Date,
      default: Date.now
    },
    allocatedBy: {
      type: mongoose.Schema.Types.Mixed, // Can be ObjectId or string
      ref: 'User',
      required: false // Make optional for now to debug
    }
  }],

  // Total budget amount (calculated field)
  totalAmount: {
    type: Number,
    default: 0
  },

  // Description
  description: {
    type: String,
    trim: true,
    maxlength: 1000
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
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      // Ensure kodeRekeningId in allocations is properly handled
      if (ret.allocations && Array.isArray(ret.allocations)) {
        ret.allocations = ret.allocations.map(allocation => {
          let kodeRekeningId = allocation.kodeRekeningId;

          // Handle ObjectId objects that haven't been populated
          if (kodeRekeningId && typeof kodeRekeningId === 'object') {
            if (kodeRekeningId.$oid) {
              kodeRekeningId = kodeRekeningId.$oid; // MongoDB extended JSON format
            } else if (kodeRekeningId._id) {
              kodeRekeningId = kodeRekeningId._id; // Already populated object
            } else {
              kodeRekeningId = kodeRekeningId.toString(); // ObjectId or other object
            }
          }

          return {
            ...allocation,
            kodeRekeningId: kodeRekeningId
          };
        });
      }
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: function(doc, ret) {
      // Ensure kodeRekeningId in allocations is properly handled
      if (ret.allocations && Array.isArray(ret.allocations)) {
        ret.allocations = ret.allocations.map(allocation => {
          let kodeRekeningId = allocation.kodeRekeningId;

          // Handle ObjectId objects that haven't been populated
          if (kodeRekeningId && typeof kodeRekeningId === 'object') {
            if (kodeRekeningId.$oid) {
              kodeRekeningId = kodeRekeningId.$oid; // MongoDB extended JSON format
            } else if (kodeRekeningId._id) {
              kodeRekeningId = kodeRekeningId._id; // Already populated object
            } else {
              kodeRekeningId = kodeRekeningId.toString(); // ObjectId or other object
            }
          }

          return {
            ...allocation,
            kodeRekeningId: kodeRekeningId
          };
        });
      }
      return ret;
    }
  }
});

// Indexes for performance and one-to-many relationship support
anggaranSchema.index({ subKegiatanId: 1, budgetYear: 1 }, { unique: true });
anggaranSchema.index({ 'allocations.kodeRekeningId': 1 });
anggaranSchema.index({ subKegiatanId: 1, 'allocations.kodeRekeningId': 1 }); // Prevent duplicate kode rekening per subkegiatan

// Virtual for total amount calculation
anggaranSchema.virtual('calculatedTotalAmount').get(function() {
  if (!this.allocations || !Array.isArray(this.allocations)) {
    return 0;
  }
  return this.allocations.reduce((total, allocation) => total + allocation.amount, 0);
});

// Pre-save middleware to update totalAmount
anggaranSchema.pre('save', function(next) {
  this.totalAmount = this.calculatedTotalAmount;

  // Update the updatedBy field
  if (this.isModified() && !this.isNew) {
    this.updatedBy = this.updatedBy || this.createdBy;
  }

  next();
});

// Pre-update middleware for allocations changes
anggaranSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  if (update.allocations) {
    // Calculate new total if allocations are being updated
    const allocations = update.allocations;
    if (Array.isArray(allocations)) {
      update.totalAmount = allocations.reduce((total, allocation) => total + allocation.amount, 0);
    }
  }

  // Update the updatedBy field if not provided
  if (!update.updatedBy) {
    update.updatedBy = update.updatedBy || this._conditions.createdBy;
  }

  next();
});

// Validation to ensure unique budget year per subkegiatan
anggaranSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('subKegiatanId') || this.isModified('budgetYear')) {
    const existingAnggaran = await mongoose.models.Anggaran.findOne({
      subKegiatanId: this.subKegiatanId,
      budgetYear: this.budgetYear,
      _id: { $ne: this._id }
    });

    if (existingAnggaran) {
      const error = new Error('Anggaran untuk subkegiatan dan tahun ini sudah ada');
      error.code = 11000; // Duplicate key error
      return next(error);
    }
  }

  // Validate allocations - ensure no duplicate kode rekening within same anggaran
  if (this.allocations && this.allocations.length > 0) {
    const kodeRekeningIds = this.allocations.map(alloc => alloc.kodeRekeningId.toString());
    const uniqueIds = [...new Set(kodeRekeningIds)];

    if (kodeRekeningIds.length !== uniqueIds.length) {
      const error = new Error('Tidak dapat mengalokasikan kode rekening yang sama lebih dari sekali dalam satu anggaran');
      return next(error);
    }

    // Validate that all amounts are positive
    const invalidAmount = this.allocations.find(alloc => alloc.amount <= 0);
    if (invalidAmount) {
      const error = new Error('Jumlah alokasi harus lebih besar dari 0');
      return next(error);
    }
  }

  // Ensure sumberDanaId is set (required for new records)
  if (this.isNew && !this.sumberDanaId) {
    const error = new Error('Sumber Dana harus dipilih untuk anggaran baru');
    return next(error);
  }

  // For existing records, don't enforce sumberDanaId requirement to avoid breaking existing data
  if (!this.isNew && !this.sumberDanaId) {
    console.log('Warning: Existing record without sumberDanaId - this will be allowed for backward compatibility');
  }

  next();
});

// Static methods for common queries
anggaranSchema.statics.findByBudgetYear = function(budgetYear) {
  return this.find({ budgetYear }).populate('subKegiatanId').populate('allocations.kodeRekeningId');
};

anggaranSchema.statics.findBySubKegiatan = function(subKegiatanId) {
  return this.find({ subKegiatanId }).populate('subKegiatanId').populate('allocations.kodeRekeningId');
};


anggaranSchema.statics.findByKodeRekening = function(kodeRekeningId) {
  return this.find({ 'allocations.kodeRekeningId': kodeRekeningId })
    .populate('subKegiatanId')
    .populate('allocations.kodeRekeningId');
};

anggaranSchema.statics.findAllocationsByBudgetYear = function(budgetYear) {
  return this.find({ budgetYear })
    .populate('subKegiatanId')
    .populate('allocations.kodeRekeningId')
    .select('subKegiatanId allocations totalAmount');
};

anggaranSchema.statics.getAllocationSummary = function(budgetYear) {
  return this.aggregate([
    { $match: { budgetYear } },
    { $unwind: '$allocations' },
    {
      $group: {
        _id: '$allocations.kodeRekeningId',
        totalAllocated: { $sum: '$allocations.amount' },
        count: { $sum: 1 },
        subKegiatans: { $addToSet: '$subKegiatanId' }
      }
    },
    {
      $lookup: {
        from: 'koderekenings',
        localField: '_id',
        foreignField: '_id',
        as: 'kodeRekening'
      }
    },
    { $unwind: '$kodeRekening' }
  ]);
};

// Static method to check if SubKegiatan is used in any Anggaran
anggaranSchema.statics.isSubKegiatanInUse = function(subKegiatanId) {
  return this.exists({ subKegiatanId });
};

// Static method to check if KodeRekening is used in any Anggaran allocation
anggaranSchema.statics.isKodeRekeningInUse = function(kodeRekeningId) {
  return this.exists({ 'allocations.kodeRekeningId': kodeRekeningId });
};

// Static method to get usage details for a SubKegiatan
anggaranSchema.statics.getSubKegiatanUsage = function(subKegiatanId) {
  return this.find({ subKegiatanId })
    .populate('subKegiatanId')
    .select('budgetYear totalAmount status allocations')
    .sort({ budgetYear: -1 });
};

// Static method to get usage details for a KodeRekening
anggaranSchema.statics.getKodeRekeningUsage = function(kodeRekeningId) {
  return this.find({ 'allocations.kodeRekeningId': kodeRekeningId })
    .populate('subKegiatanId')
    .populate('allocations.kodeRekeningId')
    .select('budgetYear subKegiatanId allocations')
    .sort({ budgetYear: -1 });
};

// Instance methods for one-to-many allocation management
anggaranSchema.methods.addAllocation = function(kodeRekeningId, amount, description = '', performedBy) {
  // Validate inputs
  if (!kodeRekeningId || !amount || amount <= 0) {
    throw new Error('Kode rekening dan jumlah yang valid harus diisi');
  }

  // Check if allocation already exists
  const existingIndex = this.allocations.findIndex(
    allocation => allocation.kodeRekeningId.toString() === kodeRekeningId.toString()
  );

  if (existingIndex >= 0) {
    // Update existing allocation
    this.allocations[existingIndex].amount = amount;
    this.allocations[existingIndex].description = description;
    this.allocations[existingIndex].allocatedAt = new Date();
    if (performedBy) {
      this.allocations[existingIndex].allocatedBy = performedBy;
    }
  } else {
    // Add new allocation
    this.allocations.push({
      kodeRekeningId,
      amount,
      description,
      allocatedAt: new Date(),
      allocatedBy: performedBy || this.createdBy
    });
  }

  return this.save();
};

anggaranSchema.methods.updateAllocation = function(kodeRekeningId, amount, description = '', performedBy) {
  return this.addAllocation(kodeRekeningId, amount, description, performedBy);
};

anggaranSchema.methods.removeAllocation = function(kodeRekeningId) {
  const initialLength = this.allocations.length;
  this.allocations = this.allocations.filter(
    allocation => allocation.kodeRekeningId.toString() !== kodeRekeningId.toString()
  );

  if (this.allocations.length === initialLength) {
    throw new Error('Alokasi kode rekening tidak ditemukan');
  }

  return this.save();
};

anggaranSchema.methods.getAllocation = function(kodeRekeningId) {
  return this.allocations.find(
    allocation => allocation.kodeRekeningId.toString() === kodeRekeningId.toString()
  );
};

anggaranSchema.methods.hasAllocation = function(kodeRekeningId) {
  return this.allocations.some(
    allocation => allocation.kodeRekeningId.toString() === kodeRekeningId.toString()
  );
};

anggaranSchema.methods.getTotalAllocationAmount = function() {
  return this.allocations.reduce((total, allocation) => total + allocation.amount, 0);
};

anggaranSchema.methods.getAllocationSummary = function() {
  return {
    totalAllocations: this.allocations.length,
    totalAmount: this.getTotalAllocationAmount(),
    averageAmount: this.allocations.length > 0 ? this.getTotalAllocationAmount() / this.allocations.length : 0,
    allocations: this.allocations.map(alloc => ({
      kodeRekeningId: alloc.kodeRekeningId,
      amount: alloc.amount,
      description: alloc.description,
      allocatedAt: alloc.allocatedAt
    }))
  };
};


// Export the model
const Anggaran = mongoose.model('Anggaran', anggaranSchema);

export default Anggaran;