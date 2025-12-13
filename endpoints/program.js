import { Program, Bidang } from '../models/Urusan.js';

const programRouter = async (request, reply) => {
  try {
    if (request.url === '/api/program' && request.method === 'GET') {
      // Get all program with populated bidang data
      const programs = await Program.find({}).populate('bidangId', 'kode nama').sort({ kode: 1 });
      reply.send({ success: true, data: programs });

    } else if (request.url === '/api/program' && request.method === 'POST') {
      // Create new program
      const { kode, nama, bidangId } = request.body;

      if (!kode || !nama || !bidangId) {
        return reply.code(400).send({ success: false, message: 'Kode, nama program, dan bidang harus diisi' });
      }

      // Check if bidang exists
      const bidang = await Bidang.findById(bidangId);
      if (!bidang) {
        return reply.code(404).send({ success: false, message: 'Bidang tidak ditemukan' });
      }

      // Check if kode already exists for this bidang
      const existingProgram = await Program.findOne({ kode, bidangId });
      if (existingProgram) {
        return reply.code(400).send({ success: false, message: 'Kode program sudah digunakan dalam bidang ini' });
      }

      const newProgram = new Program({
        kode,
        nama,
        bidangId
      });

      const savedProgram = await newProgram.save();
      await savedProgram.populate('bidangId', 'kode nama');

      reply.code(201).send({ success: true, data: savedProgram, message: 'Program berhasil dibuat' });

    } else if (request.url.match(/\/api\/program\/[a-f\d]{24}$/) && request.method === 'GET') {
      // Get specific program by ID
      const id = request.url.split('/')[3];
      const program = await Program.findById(id).populate('bidangId', 'kode nama');

      if (!program) {
        return reply.code(404).send({ success: false, message: 'Program tidak ditemukan' });
      }

      reply.send({ success: true, data: program });

    } else if (request.url.match(/\/api\/program\/[a-f\d]{24}$/) && request.method === 'PUT') {
      // Update program
      const id = request.url.split('/')[3];
      const { kode, nama, bidangId } = request.body;

      if (!kode || !nama || !bidangId) {
        return reply.code(400).send({ success: false, message: 'Kode, nama program, dan bidang harus diisi' });
      }

      // Check if bidang exists
      const bidang = await Bidang.findById(bidangId);
      if (!bidang) {
        return reply.code(404).send({ success: false, message: 'Bidang tidak ditemukan' });
      }

      // Check if kode already exists (excluding current program)
      const existingProgram = await Program.findOne({ kode, bidangId, _id: { $ne: id } });
      if (existingProgram) {
        return reply.code(400).send({ success: false, message: 'Kode program sudah digunakan dalam bidang ini' });
      }

      const updatedProgram = await Program.findByIdAndUpdate(
        id,
        { kode, nama, bidangId },
        { new: true, runValidators: true }
      ).populate('bidangId', 'kode nama');

      if (!updatedProgram) {
        return reply.code(404).send({ success: false, message: 'Program tidak ditemukan' });
      }

      reply.send({ success: true, data: updatedProgram, message: 'Program berhasil diperbarui' });

    } else if (request.url.match(/\/api\/program\/[a-f\d]{24}$/) && request.method === 'DELETE') {
      // Delete program
      const id = request.url.split('/')[3];
      const deletedProgram = await Program.findByIdAndDelete(id);

      if (!deletedProgram) {
        return reply.code(404).send({ success: false, message: 'Program tidak ditemukan' });
      }

      reply.send({ success: true, message: 'Program berhasil dihapus' });

    } else if (request.url.match(/\/api\/program\/bidang\/\w+/) && request.method === 'GET') {
      // Get programs by bidang ID
      const bidangId = request.url.split('/')[4];
      const programs = await Program.find({ bidangId }).populate('bidangId', 'kode nama').sort({ kode: 1 });

      reply.send({ success: true, data: programs });

    } else {
      reply.code(404).send({ success: false, message: 'Endpoint tidak ditemukan' });
    }
  } catch (error) {
    console.error('Program API Error:', error);
    reply.code(500).send({ success: false, message: 'Terjadi kesalahan internal server' });
  }
};

export default programRouter;