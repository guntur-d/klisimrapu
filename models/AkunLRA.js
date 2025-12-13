import mongoose from 'mongoose';

const akunLRASchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  fullCode: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AkunLRA',
    default: null
  },
  description: {
    type: String,
    trim: true
  },
  level: {
    type: Number,
    required: true,
    min: 1
  },
  isLeaf: {
    type: Boolean,
    default: true
  },
  children: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AkunLRA'
  }],
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
akunLRASchema.index({ code: 1 });
akunLRASchema.index({ parent: 1 });
akunLRASchema.index({ level: 1 });

// Method to get full path of codes
akunLRASchema.methods.getFullCodePath = async function() {
  if (!this.parent) {
    return this.code;
  }

  const parent = await mongoose.model('AkunLRA').findById(this.parent);
  if (!parent) {
    return this.code;
  }

  return `${await parent.getFullCodePath()}.${this.code}`;
};

// Static method to build fullCode from hierarchy
akunLRASchema.statics.buildFullCode = async function(accountId) {
  const account = await this.findById(accountId);
  if (!account) return '';

  if (!account.parent) {
    return account.code;
  }

  const parent = await this.findById(account.parent);
  if (!parent) {
    return account.code;
  }

  return `${await this.buildFullCode(account.parent)}.${account.code}`;
};

const AkunLRA = mongoose.model('AkunLRA', akunLRASchema);

export default AkunLRA;