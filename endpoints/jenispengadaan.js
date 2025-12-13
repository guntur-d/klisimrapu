import JenisPengadaan from '../models/JenisPengadaan.js';

const jenisPengadaanRouter = async (request, reply) => {
  try {
    const { method, url } = request;

    // Fastify already matched this route as:
    //   /api/jenis-pengadaan
    // via server.js, so we don't need manual path parsing here.
    // We just branch on method.

    if (method === 'GET') {
      // Get all jenis pengadaan
      const jenisPengadaan = await JenisPengadaan.find({}).sort({ kode: 1 });
      return reply.code(200).send({ data: jenisPengadaan });

    } else if (method === 'POST') {
      // Create new jenis pengadaan
      const { kode, nama, deskripsi } = request.body || {};

      const isFieldValid = (field) =>
        field && typeof field === 'string' && field.trim().length > 0;

      if (!isFieldValid(kode) || !isFieldValid(nama)) {
        // 400 - validation error (frontend should show toast.error)
        return reply.code(400).send({
          message: 'Kode dan nama harus diisi',
          code: 'VALIDATION_ERROR',
          validation: {
            kode: isFieldValid(kode),
            nama: isFieldValid(nama)
          }
        });
      }

      // Check if kode already exists
      const existingJenisPengadaan = await JenisPengadaan.findOne({ kode: kode.trim() });
      if (existingJenisPengadaan) {
        // 409 - conflict
        return reply.code(409).send({
          message: 'Kode jenis pengadaan sudah digunakan',
          code: 'DUPLICATE_KODE'
        });
      }

      const newJenisPengadaan = new JenisPengadaan({
        kode: kode.trim(),
        nama: nama.trim(),
        deskripsi: deskripsi ? deskripsi.trim() : ''
      });

      const savedJenisPengadaan = await newJenisPengadaan.save();
      return reply.code(201).send({
        data: savedJenisPengadaan,
        message: 'Jenis pengadaan berhasil dibuat'
      });

    } else if (method === 'GET' && request.params && request.params.id) {
      // Get specific jenis pengadaan by ID
      const id = request.params.id;
      const jenisPengadaan = await JenisPengadaan.findById(id);

      if (!jenisPengadaan) {
        return reply.code(404).send({
          message: 'Jenis pengadaan tidak ditemukan',
          code: 'NOT_FOUND'
        });
      }

      return reply.code(200).send({ data: jenisPengadaan });

    } else if (method === 'PUT' && request.params && request.params.id) {
      // Update jenis pengadaan by ID
      const id = request.params.id;
      const { kode, nama, deskripsi } = request.body || {};

      const isFieldValid = (field) =>
        field && typeof field === 'string' && field.trim().length > 0;

      if (!isFieldValid(kode) || !isFieldValid(nama)) {
        return reply.code(400).send({
          message: 'Kode dan nama harus diisi',
          code: 'VALIDATION_ERROR'
        });
      }

      const updatedJenisPengadaan = await JenisPengadaan.findByIdAndUpdate(
        id,
        {
          kode: kode.trim(),
          nama: nama.trim(),
          deskripsi: deskripsi ? deskripsi.trim() : ''
        },
        { new: true, runValidators: true }
      );

      if (!updatedJenisPengadaan) {
        return reply.code(404).send({
          message: 'Jenis pengadaan tidak ditemukan',
          code: 'NOT_FOUND'
        });
      }

      return reply.code(200).send({
        data: updatedJenisPengadaan,
        message: 'Jenis pengadaan berhasil diperbarui'
      });

    } else if (method === 'DELETE' && request.params && request.params.id) {
      // Delete jenis pengadaan by ID
      const id = request.params.id;
      const deletedJenisPengadaan = await JenisPengadaan.findByIdAndDelete(id);

      if (!deletedJenisPengadaan) {
        return reply.code(404).send({
          message: 'Jenis pengadaan tidak ditemukan',
          code: 'NOT_FOUND'
        });
      }

      return reply.code(200).send({
        message: 'Jenis pengadaan berhasil dihapus'
      });

    } else {
      // Let Fastify's 404 handler deal with truly invalid combinations
      return reply.code(404).send({
        message: 'Endpoint jenis-pengadaan tidak ditemukan',
        code: 'ENDPOINT_NOT_FOUND'
      });
    }
  } catch (error) {
    console.error('Error in jenisPengadaanRouter:', error);

    // Normalize server error so frontend toast can show a clear message
    return reply.code(500).send({
      message: 'Terjadi kesalahan server saat memproses jenis pengadaan',
      code: 'SERVER_ERROR',
      // include minimal technical detail for debugging; frontend can ignore or log
      error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
};

export default jenisPengadaanRouter;