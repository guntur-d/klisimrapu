import { Bidang, Urusan } from '../models/Urusan.js';

const bidangRouter = async (request, reply) => {
  try {
    if (request.url === '/api/bidang' && request.method === 'GET') {
      // Get all bidang with populated urusan data
      const bidang = await Bidang.find({}).populate('urusanId', 'kode nama').sort({ kode: 1 });
      reply.send({ success: true, data: bidang });

    } else if (request.url === '/api/bidang' && request.method === 'POST') {
      // Create new bidang
      const { kode, nama, urusanId } = request.body;

      if (!kode || !nama || !urusanId) {
        return reply.code(400).send({ success: false, message: 'Kode, nama bidang, dan urusan harus diisi' });
      }

      // Check if urusan exists
      const urusan = await Urusan.findById(urusanId);
      if (!urusan) {
        return reply.code(404).send({ success: false, message: 'Urusan tidak ditemukan' });
      }

      // Check if kode already exists for this urusan
      const existingBidang = await Bidang.findOne({ kode, urusanId });
      if (existingBidang) {
        return reply.code(400).send({ success: false, message: 'Kode bidang sudah digunakan dalam urusan ini' });
      }

      const newBidang = new Bidang({
        kode,
        nama,
        urusanId
      });

      const savedBidang = await newBidang.save();
      await savedBidang.populate('urusanId', 'kode nama');

      reply.code(201).send({ success: true, data: savedBidang, message: 'Bidang berhasil dibuat' });

    } else if (request.url.match(/\/api\/bidang\/[a-f\d]{24}$/) && request.method === 'GET') {
      // Get specific bidang by ID (only match valid ObjectId format)
      const id = request.url.split('/')[3];
      const bidang = await Bidang.findById(id).populate('urusanId', 'kode nama');

      if (!bidang) {
        return reply.code(404).send({ success: false, message: 'Bidang tidak ditemukan' });
      }

      reply.send({ success: true, data: bidang });

    } else if (request.url.match(/\/api\/bidang\/[a-f\d]{24}$/) && request.method === 'PUT') {
      // Update bidang
      const id = request.url.split('/')[3];
      const { kode, nama, urusanId } = request.body;

      if (!kode || !nama || !urusanId) {
        return reply.code(400).send({ success: false, message: 'Kode, nama bidang, dan urusan harus diisi' });
      }

      // Check if urusan exists
      const urusan = await Urusan.findById(urusanId);
      if (!urusan) {
        return reply.code(404).send({ success: false, message: 'Urusan tidak ditemukan' });
      }

      // Check if kode already exists (excluding current bidang)
      const existingBidang = await Bidang.findOne({ kode, urusanId, _id: { $ne: id } });
      if (existingBidang) {
        return reply.code(400).send({ success: false, message: 'Kode bidang sudah digunakan dalam urusan ini' });
      }

      const updatedBidang = await Bidang.findByIdAndUpdate(
        id,
        { kode, nama, urusanId },
        { new: true, runValidators: true }
      ).populate('urusanId', 'kode nama');

      if (!updatedBidang) {
        return reply.code(404).send({ success: false, message: 'Bidang tidak ditemukan' });
      }

      reply.send({ success: true, data: updatedBidang, message: 'Bidang berhasil diperbarui' });

    } else if (request.url.match(/\/api\/bidang\/[a-f\d]{24}$/) && request.method === 'DELETE') {
      // Delete bidang
      const id = request.url.split('/')[3];
      const deletedBidang = await Bidang.findByIdAndDelete(id);

      if (!deletedBidang) {
        return reply.code(404).send({ success: false, message: 'Bidang tidak ditemukan' });
      }

      reply.send({ success: true, message: 'Bidang berhasil dihapus' });

    } else if (request.url.match(/\/api\/bidang\/urusan\/\w+/) && request.method === 'GET') {
      // Get bidang by urusan ID
      const urusanId = request.url.split('/')[4];
      const bidang = await Bidang.find({ urusanId }).populate('urusanId', 'kode nama').sort({ kode: 1 });

      reply.send({ success: true, data: bidang });

    } else {
      reply.code(404).send({ success: false, message: 'Endpoint tidak ditemukan' });
    }
  } catch (error) {
    console.error('Bidang API Error:', error);
    reply.code(500).send({ success: false, message: 'Terjadi kesalahan internal server' });
  }
};

export default bidangRouter;