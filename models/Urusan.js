import mongoose from 'mongoose';

const urusanSchema = new mongoose.Schema({
  kode: { type: String, required: true, unique: true },
  nama: { type: String, required: true }
}, { timestamps: true });

const bidangSchema = new mongoose.Schema({
  kode: { type: String, required: true },
  nama: { type: String, required: true },
  urusanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Urusan', required: true }
}, { timestamps: true });

const programSchema = new mongoose.Schema({
  kode: { type: String, required: true },
  nama: { type: String, required: true },
  bidangId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bidang', required: true }
}, { timestamps: true });

const kegiatanSchema = new mongoose.Schema({
  kode: { type: String, required: true },
  nama: { type: String, required: true },
  programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true }
}, { timestamps: true });

const subKegiatanSchema = new mongoose.Schema({
  kode: { type: String, required: true },
  nama: { type: String, required: true },
  kinerja: { type: String, required: true },
  indikator: { type: String, required: true },
  satuan: { type: String, required: true },
  kegiatanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Kegiatan', required: true }
}, { timestamps: true });

// Create indexes for better performance
// Note: kode index for Urusan is already created by 'unique: true' in schema
bidangSchema.index({ kode: 1, urusanId: 1 });
bidangSchema.index({ urusanId: 1 });
programSchema.index({ kode: 1, bidangId: 1 });
programSchema.index({ bidangId: 1 });
kegiatanSchema.index({ kode: 1, programId: 1 });
kegiatanSchema.index({ programId: 1 });
subKegiatanSchema.index({ kode: 1, kegiatanId: 1 });
subKegiatanSchema.index({ kegiatanId: 1 });

export const Urusan = mongoose.model('Urusan', urusanSchema);
export const Bidang = mongoose.model('Bidang', bidangSchema);
export const Program = mongoose.model('Program', programSchema);
export const Kegiatan = mongoose.model('Kegiatan', kegiatanSchema);
export const SubKegiatan = mongoose.model('SubKegiatan', subKegiatanSchema);

// For backward compatibility, export Urusan as default
export default Urusan;