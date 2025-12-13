import { Kegiatan, Program } from '../models/Urusan.js';

const kegiatanRouter = async (request, reply) => {
  try {
    if (request.url === '/api/kegiatan' && request.method === 'GET') {
      // Get all kegiatan with populated program data
      const kegiatans = await Kegiatan.find({}).populate('programId', 'kode nama').sort({ kode: 1 });
      reply.send({ success: true, data: kegiatans });

    } else if (request.url === '/api/kegiatan' && request.method === 'POST') {
      // Create new kegiatan
      const { kode, nama, programId } = request.body;

      if (!kode || !nama || !programId) {
        return reply.code(400).send({ success: false, message: 'Kode, nama kegiatan, dan program harus diisi' });
      }

      // Check if program exists
      const program = await Program.findById(programId);
      if (!program) {
        return reply.code(404).send({ success: false, message: 'Program tidak ditemukan' });
      }

      // Check if kode already exists for this program
      const existingKegiatan = await Kegiatan.findOne({ kode, programId });
      if (existingKegiatan) {
        return reply.code(400).send({ success: false, message: 'Kode kegiatan sudah digunakan dalam program ini' });
      }

      const newKegiatan = new Kegiatan({
        kode,
        nama,
        programId
      });

      const savedKegiatan = await newKegiatan.save();
      await savedKegiatan.populate('programId', 'kode nama');

      reply.code(201).send({ success: true, data: savedKegiatan, message: 'Kegiatan berhasil dibuat' });

    } else if (request.url.match(/\/api\/kegiatan\/[a-f\d]{24}$/) && request.method === 'GET') {
      // Get specific kegiatan by ID
      const id = request.url.split('/')[3];
      const kegiatan = await Kegiatan.findById(id).populate('programId', 'kode nama');

      if (!kegiatan) {
        return reply.code(404).send({ success: false, message: 'Kegiatan tidak ditemukan' });
      }

      reply.send({ success: true, data: kegiatan });

    } else if (request.url.match(/\/api\/kegiatan\/[a-f\d]{24}$/) && request.method === 'PUT') {
      // Update kegiatan
      const id = request.url.split('/')[3];
      const { kode, nama, programId } = request.body;

      if (!kode || !nama || !programId) {
        return reply.code(400).send({ success: false, message: 'Kode, nama kegiatan, dan program harus diisi' });
      }

      // Check if program exists
      const program = await Program.findById(programId);
      if (!program) {
        return reply.code(404).send({ success: false, message: 'Program tidak ditemukan' });
      }

      // Check if kode already exists (excluding current kegiatan)
      const existingKegiatan = await Kegiatan.findOne({ kode, programId, _id: { $ne: id } });
      if (existingKegiatan) {
        return reply.code(400).send({ success: false, message: 'Kode kegiatan sudah digunakan dalam program ini' });
      }

      const updatedKegiatan = await Kegiatan.findByIdAndUpdate(
        id,
        { kode, nama, programId },
        { new: true, runValidators: true }
      ).populate('programId', 'kode nama');

      if (!updatedKegiatan) {
        return reply.code(404).send({ success: false, message: 'Kegiatan tidak ditemukan' });
      }

      reply.send({ success: true, data: updatedKegiatan, message: 'Kegiatan berhasil diperbarui' });

    } else if (request.url.match(/\/api\/kegiatan\/[a-f\d]{24}$/) && request.method === 'DELETE') {
      // Delete kegiatan
      const id = request.url.split('/')[3];
      const deletedKegiatan = await Kegiatan.findByIdAndDelete(id);

      if (!deletedKegiatan) {
        return reply.code(404).send({ success: false, message: 'Kegiatan tidak ditemukan' });
      }

      reply.send({ success: true, message: 'Kegiatan berhasil dihapus' });

    } else if (request.url.match(/\/api\/kegiatan\/program\/\w+/) && request.method === 'GET') {
      // Get kegiatan by program ID
      const programId = request.url.split('/')[4];
      const kegiatans = await Kegiatan.find({ programId }).populate('programId', 'kode nama').sort({ kode: 1 });

      reply.send({ success: true, data: kegiatans });

    } else {
      reply.code(404).send({ success: false, message: 'Endpoint tidak ditemukan' });
    }
  } catch (error) {
    console.error('Kegiatan API Error:', error);
    reply.code(500).send({ success: false, message: 'Terjadi kesalahan internal server' });
  }
};

export default kegiatanRouter;