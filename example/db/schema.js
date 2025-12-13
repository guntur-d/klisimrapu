const mongoose = require('mongoose');
const { Schema } = mongoose;

const allwilSchema = new Schema({

  kode: { type: String, unique: true },
  nama: { type: String },

});

const wilSchema = new Schema({

  kode: { type: String, unique: true },
  nama: { type: String },

});

const submitSchema = new Schema({

  email: { type: String, unique: true },
  nama: { type: String },
  kodePemda: { type: String, unique: true },
  instansi: { type: String },
  jabatan: { type: String },
  nohape: { type: String },
  telp: { type: String },

});

const kontakSchema = new Schema({

  nama: { type: String },
  email: { type: String },
  subyek: { type: String },
  pesan: { type: String },


});


const logSchema = new Schema({
  username: String,
  method: String,
  desc: Object,

  timestamp: { type: Date, default: Date.now },

})


const allwilModel = mongoose.models.allwil || mongoose.model('allwil', allwilSchema);
const wilModel = mongoose.models.wilayah || mongoose.model('wilayah', wilSchema);
const submitModel = mongoose.models.submit || mongoose.model('submit', submitSchema);
const kontakModel = mongoose.models.kontak || mongoose.model('kontak', kontakSchema);

const logModel = mongoose.models.log || mongoose.model('log', logSchema);

const pendingVisitorSchema = new Schema({
  visitorId: { type: String, unique: true, index: true },
  createdAt: { type: Date, default: Date.now, expires: '1h' } // Auto-delete after 1 hour
});
const pendingVisitorModel = mongoose.models.PendingVisitor || mongoose.model('PendingVisitor', pendingVisitorSchema);

module.exports = { allwilModel, wilModel, submitModel, kontakModel, logModel, pendingVisitorModel }
