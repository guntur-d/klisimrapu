import mongoose from 'mongoose';

const paketKegiatanSchema = new mongoose.Schema({
  // Reference to Anggaran (the budget this package belongs to)
  anggaranId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Anggaran',
    required: true
  },

  // Reference to Kode Rekening (specific allocation within Anggaran)
  kodeRekeningId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AkunLRA',
    required: true
  },

  // Reference to SubKegiatan (for easy querying)
  subKegiatanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubKegiatan',
    required: true
  },

  // Reference to SubPerangkatDaerah (the unit this package belongs to)
  subPerangkatDaerahId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubPerangkatDaerah',
    required: true
  },

  // Package number within kode rekening (auto-generated sequential)
  nomor: {
    type: Number,
    min: 1
  },

  // Package code/kode (optional manual entry)
  kode: {
    type: String,
    trim: true,
    maxlength: 50,
    sparse: true,
    unique: true
  },

  // Package description/uraian
  uraian: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },

  // Volume (quantity)
  volume: {
    type: Number,
    required: true,
    min: 0
  },

  // Unit/Satuan
  satuan: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },

  // Unit price/Harga Satuan
  hargaSatuan: {
    type: Number,
    required: true,
    min: 0
  },

  // Total amount/Jumlah (calculated as volume * hargaSatuan)
  jumlah: {
    type: Number,
    default: 0
  },

  // Budget year for this package
  budgetYear: {
    type: String,
    required: true,
    match: /^\d{4}-\w+$/ // Format: "2026-Murni" or "2026-PAK"
  },

  // Description/Deskripsi
  deskripsi: {
    type: String,
    trim: true
  },

  // Status of the package
  status: {
    type: String,
    enum: ['draft', 'active', 'completed', 'cancelled'],
    default: 'draft'
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

// Create compound indexes for better performance
paketKegiatanSchema.index({ anggaranId: 1, kodeRekeningId: 1 });
paketKegiatanSchema.index({ anggaranId: 1, kodeRekeningId: 1, nomor: 1 });
paketKegiatanSchema.index({ subKegiatanId: 1, subPerangkatDaerahId: 1 });
paketKegiatanSchema.index({ kodeRekeningId: 1, budgetYear: 1 });
paketKegiatanSchema.index({ subPerangkatDaerahId: 1, budgetYear: 1 });
paketKegiatanSchema.index({ status: 1 });

// Pre-save middleware to calculate jumlah and update updatedBy
paketKegiatanSchema.pre('save', async function(next) {
  // Calculate jumlah as volume * hargaSatuan
  this.jumlah = this.volume * this.hargaSatuan;

  // Update the updatedBy field
  if (this.isModified() && !this.isNew) {
    this.updatedBy = this.updatedBy || this.createdBy;
  }

  // Auto-generate nomor if not set (sequential within kode rekening)
  if (!this.nomor) {
    try {
      const PaketKegiatan = mongoose.models.PaketKegiatan;
      const lastPaket = await PaketKegiatan.findOne({
        kodeRekeningId: this.kodeRekeningId,
        anggaranId: this.anggaranId
      }).sort({ nomor: -1 });

      this.nomor = lastPaket ? lastPaket.nomor + 1 : 1;
    } catch (error) {
      console.error('Error generating nomor:', error);
      this.nomor = 1; // Fallback
    }
  }

  next();
});

// Pre-update middleware
paketKegiatanSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();

  // Recalculate jumlah if volume or hargaSatuan are being updated
  if (update.volume !== undefined || update.hargaSatuan !== undefined) {
    const volume = update.volume !== undefined ? update.volume : this._conditions.volume || 0;
    const hargaSatuan = update.hargaSatuan !== undefined ? update.hargaSatuan : this._conditions.hargaSatuan || 0;
    update.jumlah = volume * hargaSatuan;
  }

  // Update the updatedBy field if not provided
  if (!update.updatedBy) {
    update.updatedBy = update.updatedBy || this._conditions.createdBy;
  }

  next();
});

// Validation middleware
paketKegiatanSchema.pre('save', async function(next) {
  // Validate that volume, hargaSatuan are positive
  if (this.volume <= 0 || this.hargaSatuan <= 0) {
    const error = new Error('Volume dan harga satuan harus lebih besar dari 0');
    return next(error);
  }

  // Validate that the total jumlah doesn't exceed the kode rekening budget allocation
  try {
    const Anggaran = mongoose.models.Anggaran;
    const anggaran = await Anggaran.findById(this.anggaranId);

    if (!anggaran) {
      const error = new Error('Anggaran tidak ditemukan');
      return next(error);
    }

    // Find the allocation for this kode rekening
    const allocation = anggaran.allocations.find(alloc =>
      alloc.kodeRekeningId.toString() === this.kodeRekeningId.toString()
    );

    if (!allocation) {
      const error = new Error('Alokasi kode rekening tidak ditemukan dalam anggaran');
      return next(error);
    }

    // Get total existing paket for this kode rekening (excluding current if updating)
    const PaketKegiatan = mongoose.models.PaketKegiatan;
    const existingPaket = await PaketKegiatan.find({
      kodeRekeningId: this.kodeRekeningId,
      anggaranId: this.anggaranId,
      _id: { $ne: this._id } // Exclude current document when updating
    });

    const totalExistingJumlah = existingPaket.reduce((total, paket) => total + paket.jumlah, 0);
    const newTotalJumlah = totalExistingJumlah + this.jumlah;

    if (newTotalJumlah > allocation.amount) {
      const error = new Error(`Total jumlah paket kegiatan (Rp ${newTotalJumlah.toLocaleString('id-ID')}) melebihi alokasi anggaran kode rekening (Rp ${allocation.amount.toLocaleString('id-ID')})`);
      return next(error);
    }

  } catch (error) {
    return next(error);
  }

  next();
});

// Static methods for common queries
paketKegiatanSchema.statics.findByAnggaran = function(anggaranId) {
  return this.find({ anggaranId })
    .populate('kodeRekeningId')
    .populate('subKegiatanId')
    .populate('subPerangkatDaerahId')
    .sort({ uraian: 1 });
};

paketKegiatanSchema.statics.findByKodeRekening = function(kodeRekeningId, anggaranId) {
  const query = { kodeRekeningId };
  if (anggaranId) query.anggaranId = anggaranId;
  return this.find(query)
    .populate('kodeRekeningId')
    .populate('subKegiatanId')
    .populate('anggaranId')
    .sort({ nomor: 1, uraian: 1 });
};

paketKegiatanSchema.statics.findBySubKegiatan = function(subKegiatanId, budgetYear) {
  const query = { subKegiatanId };
  if (budgetYear) query.budgetYear = budgetYear;
  return this.find(query)
    .populate('kodeRekeningId')
    .populate('anggaranId')
    .sort({ uraian: 1 });
};

paketKegiatanSchema.statics.findBySubPerangkatDaerah = function(subPerangkatDaerahId, budgetYear) {
  const query = { subPerangkatDaerahId };
  if (budgetYear) query.budgetYear = budgetYear;
  return this.find(query)
    .populate('kodeRekeningId')
    .populate('subKegiatanId')
    .populate('anggaranId')
    .sort({ 'subKegiatanId.kode': 1, uraian: 1 });
};

paketKegiatanSchema.statics.getTotalByKodeRekening = function(kodeRekeningId, anggaranId) {
  const query = { kodeRekeningId };
  if (anggaranId) query.anggaranId = anggaranId;

  return this.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$kodeRekeningId',
        totalJumlah: { $sum: '$jumlah' },
        totalVolume: { $sum: '$volume' },
        count: { $sum: 1 }
      }
    }
  ]);
};

// Instance methods
paketKegiatanSchema.methods.getRemainingBudget = async function() {
  const Anggaran = mongoose.models.Anggaran;
  const anggaran = await Anggaran.findById(this.anggaranId);

  if (!anggaran) return 0;

  const allocation = anggaran.allocations.find(alloc =>
    alloc.kodeRekeningId.toString() === this.kodeRekeningId.toString()
  );

  if (!allocation) return 0;

  const PaketKegiatan = mongoose.models.PaketKegiatan;
  const otherPaket = await PaketKegiatan.find({
    kodeRekeningId: this.kodeRekeningId,
    anggaranId: this.anggaranId,
    _id: { $ne: this._id }
  });

  const totalOtherJumlah = otherPaket.reduce((total, paket) => total + paket.jumlah, 0);

  return allocation.amount - totalOtherJumlah - this.jumlah;
};

paketKegiatanSchema.methods.updatePackage = function(updates, updatedBy) {
  // Validate updates
  if (updates.volume !== undefined && updates.volume <= 0) {
    throw new Error('Volume harus lebih besar dari 0');
  }

  if (updates.hargaSatuan !== undefined && updates.hargaSatuan <= 0) {
    throw new Error('Harga satuan harus lebih besar dari 0');
  }

  // Apply updates
  Object.assign(this, updates);
  this.updatedBy = updatedBy;

  return this.save();
};

export default mongoose.model('PaketKegiatan', paketKegiatanSchema);