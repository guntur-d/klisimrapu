import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  namaLengkap: {
    type: String,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['admin', 'operator', 'pengawas', 'vendor'],
    default: 'operator',
  },
  subPerangkatDaerahId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubPerangkatDaerah',
  },
  operatorId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  penyediaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Penyedia',
  },
  vendorUserId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  budgetYear: {
    year: {
      type: Number,
    },
    status: {
      type: String,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model('User', userSchema);

export default User;