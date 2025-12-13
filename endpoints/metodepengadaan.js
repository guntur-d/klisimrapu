import MetodePengadaan from '../models/MetodePengadaan.js';
import JenisPengadaan from '../models/JenisPengadaan.js';

const metodePengadaanRouter = async (request, reply) => {
  try {
    if (request.method === 'GET') {
      // Get all metode pengadaan with jenis pengadaan info
      const metodePengadaan = await MetodePengadaan.find({})
        .populate('jenisPengadaanId', 'kode nama')
        .sort({ 'jenisPengadaanId.kode': 1, kode: 1 });
      reply.send({
        success: true,
        data: metodePengadaan
      });

    } else if (request.method === 'POST') {
      // Create new metode pengadaan
      console.log('Received POST request to /api/metode-pengadaan');
      console.log('Request body:', req.body);

      const { jenisPengadaanId, kode, nama, deskripsi } = req.body;

      // Check if all required fields are provided (more robust check)
      const isFieldValid = (field) => {
        return field && typeof field === 'string' && field.trim().length > 0;
      };

      if (!jenisPengadaanId || !isFieldValid(kode) || !isFieldValid(nama)) {
        console.log('Validation failed. Fields:', {
          jenisPengadaanId: jenisPengadaanId,
          kode: kode,
          nama: nama,
          deskripsi: deskripsi
        });

        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          message: 'Jenis pengadaan, kode dan nama harus diisi',
          receivedData: req.body,
          validation: {
            jenisPengadaanId: !!jenisPengadaanId,
            kode: isFieldValid(kode),
            nama: isFieldValid(nama)
          }
        }));
      }

      // Validate jenisPengadaanId exists
      const jenisPengadaan = await JenisPengadaan.findById(jenisPengadaanId);
      if (!jenisPengadaan) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ message: 'Jenis pengadaan tidak ditemukan' }));
      }

      // Check if kode already exists for this jenisPengadaanId
      const existingMetodePengadaan = await MetodePengadaan.findOne({
        jenisPengadaanId: jenisPengadaanId,
        kode: kode.trim()
      });
      if (existingMetodePengadaan) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ message: 'Kode metode pengadaan sudah digunakan untuk jenis pengadaan ini' }));
      }

      const newMetodePengadaan = new MetodePengadaan({
        jenisPengadaanId: jenisPengadaanId,
        kode: kode.trim(),
        nama: nama.trim(),
        deskripsi: deskripsi ? deskripsi.trim() : ''
      });

      const savedMetodePengadaan = await newMetodePengadaan.save();
      await savedMetodePengadaan.populate('jenisPengadaanId', 'kode nama');

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: savedMetodePengadaan, message: 'Metode pengadaan berhasil dibuat' }));

    } else if (req.url.match(/\/api\/metode-pengadaan\/[a-f\d]{24}$/) && req.method === 'GET') {
      // Get specific metode pengadaan by ID
      const id = req.url.split('/')[3];
      const metodePengadaan = await MetodePengadaan.findById(id)
        .populate('jenisPengadaanId', 'kode nama');

      if (!metodePengadaan) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ message: 'Metode pengadaan tidak ditemukan' }));
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: metodePengadaan }));

    } else if (req.url.match(/\/api\/metode-pengadaan\/[a-f\d]{24}$/) && req.method === 'PUT') {
      // Update metode pengadaan by ID
      const id = req.url.split('/')[3];
      const { jenisPengadaanId, kode, nama, deskripsi } = req.body;

      // Check if all required fields are provided (more robust check)
      const isFieldValid = (field) => {
        return field && typeof field === 'string' && field.trim().length > 0;
      };

      if (!jenisPengadaanId || !isFieldValid(kode) || !isFieldValid(nama)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ message: 'Jenis pengadaan, kode dan nama harus diisi' }));
      }

      // Validate jenisPengadaanId exists
      const jenisPengadaan = await JenisPengadaan.findById(jenisPengadaanId);
      if (!jenisPengadaan) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ message: 'Jenis pengadaan tidak ditemukan' }));
      }

      const updatedMetodePengadaan = await MetodePengadaan.findByIdAndUpdate(
        id,
        {
          jenisPengadaanId: jenisPengadaanId,
          kode: kode.trim(),
          nama: nama.trim(),
          deskripsi: deskripsi ? deskripsi.trim() : ''
        },
        { new: true, runValidators: true }
      ).populate('jenisPengadaanId', 'kode nama');

      if (!updatedMetodePengadaan) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ message: 'Metode pengadaan tidak ditemukan' }));
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: updatedMetodePengadaan, message: 'Metode pengadaan berhasil diperbarui' }));

    } else if (req.url.match(/\/api\/metode-pengadaan\/[a-f\d]{24}$/) && req.method === 'DELETE') {
      // Delete metode pengadaan by ID
      const id = req.url.split('/')[3];
      const deletedMetodePengadaan = await MetodePengadaan.findByIdAndDelete(id)
        .populate('jenisPengadaanId', 'kode nama');

      if (!deletedMetodePengadaan) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ message: 'Metode pengadaan tidak ditemukan' }));
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Metode pengadaan berhasil dihapus' }));

    } else if (req.url.match(/\/api\/metode-pengadaan\/jenis\/[a-f\d]{24}$/) && req.method === 'GET') {
      // Get metode pengadaan by jenisPengadaanId
      const jenisPengadaanId = req.url.split('/')[4];
      const metodePengadaan = await MetodePengadaan.find({ jenisPengadaanId })
        .populate('jenisPengadaanId', 'kode nama')
        .sort({ kode: 1 });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: metodePengadaan }));

    } else {
      // Invalid endpoint
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Endpoint tidak ditemukan' }));
    }
  } catch (error) {
    console.error('Error in metodePengadaanRouter:', error);
    reply.code(500).send({
      success: false,
      message: 'Terjadi kesalahan server',
      error: error.message
    });
  }
};

export default metodePengadaanRouter;