import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * PengawasKontrak
 * Relates a Pengawas (User with role 'pengawas') to a Kontrak, with SK metadata.
 *
 * Notes:
 * - One Pengawas can handle multiple Kontrak.
 * - A Kontrak can have multiple Pengawas (if needed), so we do not enforce uniqueness here.
 * - For now, SK file (PDF) is stored as metadata only (filename, contentType, size, uploadDate),
 *   not as full binary; adjust if you decide to persist the binary data.
 */
const PengawasKontrakSchema = new Schema(
  {
    pengawasId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    kontrakId: {
      type: Schema.Types.ObjectId,
      ref: 'Kontrak',
      required: true,
      index: true
    },
    // SK metadata (shared or per-kontrak, depending on how you use it on frontend)
    skNumber: {
      type: String,
      trim: true
    },
    skDate: {
      type: Date
    },
    skFile: {
      filename: { type: String },
      contentType: { type: String },
      size: { type: Number },
      uploadDate: { type: Date }
      // If you want to store PDF binary:
      // data: { type: Buffer }
    },
    active: {
      type: Boolean,
      default: true,
      index: true
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Optional compound index to avoid exact duplicates:
// One Pengawas assigned to same Kontrak multiple times as active=true.
PengawasKontrakSchema.index(
  { pengawasId: 1, kontrakId: 1, active: 1 },
  { unique: false }
);

const PengawasKontrak =
  mongoose.models.PengawasKontrak ||
  mongoose.model('PengawasKontrak', PengawasKontrakSchema);

export default PengawasKontrak;