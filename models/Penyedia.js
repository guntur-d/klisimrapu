import mongoose from 'mongoose';

const penyediaSchema = new mongoose.Schema({
  NamaVendor: {
    type: String,
    required: true,
    trim: true
  },
  NamaPimpinan: {
    type: String,
    required: true,
    trim: true
  },
  Alamat: {
    type: String,
    required: true,
    trim: true
  },
  Email: {
    type: String,
    required: true,
    trim: true
  },
  Telepon: {
    type: String,
    required: true,
    trim: true
  },
  Website: {
    type: String,
    trim: true
  },
  operators: [{
    namaLengkap: {
      type: String,
      required: true,
      trim: true
    },
    username: {
      type: String,
      required: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    passwordDisplay: {
      type: String
    },
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId()
    }
  }]
}, {
  timestamps: true
});

export default mongoose.model('Penyedia', penyediaSchema);