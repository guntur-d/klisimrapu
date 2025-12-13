import Urusan from '../models/Urusan.js';

const urusanRouter = async (request, reply) => {
  try {
    // GET /api/urusan - Get all urusan
    if (request.url === '/api/urusan' && request.method === 'GET') {
      try {
        const urusan = await Urusan.find({}).sort({ kode: 1 });
        return reply.code(200).send({ data: urusan });
      } catch (error) {
        console.error('Get urusan error:', error);
        return reply.code(500).send({ message: 'Internal Server Error' });
      }

    // POST /api/urusan - Create new urusan
    } else if (request.url === '/api/urusan' && request.method === 'POST') {
      try {
        const { kode, nama } = request.body;

        if (!kode || !nama) {
          return reply.code(400).send({ message: 'Kode dan nama urusan harus diisi' });
        }

        // Check if kode already exists
        const existingUrusan = await Urusan.findOne({ kode });
        if (existingUrusan) {
          return reply.code(400).send({ message: 'Kode urusan sudah digunakan' });
        }

        const newUrusan = new Urusan({
          kode,
          nama
        });

        const savedUrusan = await newUrusan.save();
        return reply.code(201).send({ data: savedUrusan, message: 'Urusan berhasil dibuat' });

      } catch (error) {
        console.error('Create urusan error:', error);
        return reply.code(500).send({ message: 'Internal Server Error' });
      }

    // GET /api/urusan/:id - Get specific urusan by ID
    } else if (request.url.match(/\/api\/urusan\/\w+/) && request.method === 'GET') {
      try {
        const id = request.url.split('/')[3];
        const urusan = await Urusan.findById(id);

        if (!urusan) {
          return reply.code(404).send({ message: 'Urusan tidak ditemukan' });
        }

        return reply.code(200).send({ data: urusan });

      } catch (error) {
        console.error('Get urusan by ID error:', error);
        return reply.code(500).send({ message: 'Internal Server Error' });
      }

    // PUT /api/urusan/:id - Update urusan
    } else if (request.url.match(/\/api\/urusan\/\w+/) && request.method === 'PUT') {
      try {
        const id = request.url.split('/')[3];
        const { kode, nama } = request.body;

        if (!kode || !nama) {
          return reply.code(400).send({ message: 'Kode dan nama urusan harus diisi' });
        }

        // Check if kode already exists (excluding current urusan)
        const existingUrusan = await Urusan.findOne({ kode, _id: { $ne: id } });
        if (existingUrusan) {
          return reply.code(400).send({ message: 'Kode urusan sudah digunakan' });
        }

        const updatedUrusan = await Urusan.findByIdAndUpdate(
          id,
          { kode, nama },
          { new: true, runValidators: true }
        );

        if (!updatedUrusan) {
          return reply.code(404).send({ message: 'Urusan tidak ditemukan' });
        }

        return reply.code(200).send({ data: updatedUrusan, message: 'Urusan berhasil diperbarui' });

      } catch (error) {
        console.error('Update urusan error:', error);
        return reply.code(500).send({ message: 'Internal Server Error' });
      }

    // DELETE /api/urusan/:id - Delete urusan
    } else if (request.url.match(/\/api\/urusan\/\w+/) && request.method === 'DELETE') {
      try {
        const id = request.url.split('/')[3];
        const deletedUrusan = await Urusan.findByIdAndDelete(id);

        if (!deletedUrusan) {
          return reply.code(404).send({ message: 'Urusan tidak ditemukan' });
        }

        return reply.code(200).send({ message: 'Urusan berhasil dihapus' });

      } catch (error) {
        console.error('Delete urusan error:', error);
        return reply.code(500).send({ message: 'Internal Server Error' });
      }

    // POST /api/urusan/:id/bidang - Create new bidang under specific urusan
    } else if (request.url.startsWith('/api/urusan/') && request.method === 'POST' && request.url.includes('/bidang')) {
      try {
        const urlParts = request.url.split('/');
        const urusanId = urlParts[3];
        const { kode, nama } = request.body;

        if (!kode || !nama) {
          return reply.code(400).send({ message: 'Kode dan nama bidang harus diisi' });
        }

        const urusan = await Urusan.findById(urusanId);
        if (!urusan) {
          return reply.code(404).send({ message: 'Urusan tidak ditemukan' });
        }

        // Check if kode already exists in this urusan
        const existingBidang = urusan.bidangUrusan.find(b => b.kode === kode);
        if (existingBidang) {
          return reply.code(400).send({ message: 'Kode bidang sudah digunakan dalam urusan ini' });
        }

        // Add new bidang
        urusan.bidangUrusan.push({
          kode,
          nama
        });

        await urusan.save();
        return reply.code(201).send({ data: urusan.bidangUrusan[urusan.bidangUrusan.length - 1], message: 'Bidang berhasil dibuat' });

      } catch (error) {
        console.error('Create bidang error:', error);
        return reply.code(500).send({ message: 'Internal Server Error' });
      }

    // 404 for unmatched routes
    } else {
      return reply.code(404).send({ message: 'Endpoint tidak ditemukan' });
    }

  } catch (error) {
    console.error('Urusan API Error:', error);
    return reply.code(500).send({ message: 'Terjadi kesalahan internal server' });
  }
};

export default urusanRouter;