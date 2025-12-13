import { SubKegiatan, Kegiatan } from '../models/Urusan.js';

// GET all subkegiatan
const getAll = async (request, reply) => {
  try {
    const subKegiatans = await SubKegiatan.find({})
      .populate({
        path: 'kegiatanId',
        populate: {
          path: 'programId',
          populate: {
            path: 'bidangId',
            populate: {
              path: 'urusanId',
              select: 'kode nama'
            },
            select: 'kode nama'
          },
          select: 'kode nama'
        },
        select: 'kode nama'
      })
      .sort({ kode: 1 });
    return { data: subKegiatans };
  } catch (error) {
    console.error('SubKegiatan GET Error:', error);
    return reply.code(500).send({ message: 'Terjadi kesalahan internal server' });
  }
};

// POST create new subkegiatan
const create = async (request, reply) => {
  try {
    const { kode, nama, kinerja, indikator, satuan, kegiatanId } = request.body;

    if (!kode || !nama || !kinerja || !indikator || !satuan || !kegiatanId) {
      return reply.code(400).send({ message: 'Semua field harus diisi' });
    }

    // Check if kegiatan exists
    const kegiatan = await Kegiatan.findById(kegiatanId);
    if (!kegiatan) {
      return reply.code(404).send({ message: 'Kegiatan tidak ditemukan' });
    }

    // Check if kode already exists for this kegiatan
    const existingSubKegiatan = await SubKegiatan.findOne({ kode, kegiatanId });
    if (existingSubKegiatan) {
      return reply.code(400).send({ message: 'Kode sub kegiatan sudah digunakan dalam kegiatan ini' });
    }

    const newSubKegiatan = new SubKegiatan({
      kode,
      nama,
      kinerja,
      indikator,
      satuan,
      kegiatanId
    });

    const savedSubKegiatan = await newSubKegiatan.save();
    await savedSubKegiatan.populate({
      path: 'kegiatanId',
      populate: {
        path: 'programId',
        populate: {
          path: 'bidangId',
          populate: {
            path: 'urusanId',
            select: 'kode nama'
          },
          select: 'kode nama'
        },
        select: 'kode nama'
      },
      select: 'kode nama'
    });

    return reply.code(201).send({ data: savedSubKegiatan, message: 'Sub Kegiatan berhasil dibuat' });
  } catch (error) {
    console.error('SubKegiatan POST Error:', error);
    return reply.code(500).send({ message: 'Terjadi kesalahan internal server' });
  }
};

// GET specific subkegiatan by ID
const getById = async (request, reply) => {
  try {
    const { id } = request.params;
    const subKegiatan = await SubKegiatan.findById(id)
      .populate({
        path: 'kegiatanId',
        populate: {
          path: 'programId',
          populate: {
            path: 'bidangId',
            populate: {
              path: 'urusanId',
              select: 'kode nama'
            },
            select: 'kode nama'
          },
          select: 'kode nama'
        },
        select: 'kode nama'
      });

    if (!subKegiatan) {
      return reply.code(404).send({ message: 'Sub Kegiatan tidak ditemukan' });
    }

    return { data: subKegiatan };
  } catch (error) {
    console.error('SubKegiatan GET by ID Error:', error);
    return reply.code(500).send({ message: 'Terjadi kesalahan internal server' });
  }
};

// PUT update subkegiatan
const update = async (request, reply) => {
  try {
    const { id } = request.params;
    const { kode, nama, kinerja, indikator, satuan, kegiatanId } = request.body;

    if (!kode || !nama || !kinerja || !indikator || !satuan || !kegiatanId) {
      return reply.code(400).send({ message: 'Semua field harus diisi' });
    }

    // Check if kegiatan exists
    const kegiatan = await Kegiatan.findById(kegiatanId);
    if (!kegiatan) {
      return reply.code(404).send({ message: 'Kegiatan tidak ditemukan' });
    }

    // Check if kode already exists (excluding current subkegiatan)
    const existingSubKegiatan = await SubKegiatan.findOne({ kode, kegiatanId, _id: { $ne: id } });
    if (existingSubKegiatan) {
      return reply.code(400).send({ message: 'Kode sub kegiatan sudah digunakan dalam kegiatan ini' });
    }

    const updatedSubKegiatan = await SubKegiatan.findByIdAndUpdate(
      id,
      { kode, nama, kinerja, indikator, satuan, kegiatanId },
      { new: true, runValidators: true }
    ).populate({
      path: 'kegiatanId',
      populate: {
        path: 'programId',
        populate: {
          path: 'bidangId',
          populate: {
            path: 'urusanId',
            select: 'kode nama'
          },
          select: 'kode nama'
        },
        select: 'kode nama'
      },
      select: 'kode nama'
    });

    if (!updatedSubKegiatan) {
      return reply.code(404).send({ message: 'Sub Kegiatan tidak ditemukan' });
    }

    return reply.code(200).send({ data: updatedSubKegiatan, message: 'Sub Kegiatan berhasil diperbarui' });
  } catch (error) {
    console.error('SubKegiatan PUT Error:', error);
    return reply.code(500).send({ message: 'Terjadi kesalahan internal server' });
  }
};

// DELETE subkegiatan
const remove = async (request, reply) => {
  try {
    const { id } = request.params;
    const deletedSubKegiatan = await SubKegiatan.findByIdAndDelete(id);

    if (!deletedSubKegiatan) {
      return reply.code(404).send({ message: 'Sub Kegiatan tidak ditemukan' });
    }

    return reply.code(200).send({ message: 'Sub Kegiatan berhasil dihapus' });
  } catch (error) {
    console.error('SubKegiatan DELETE Error:', error);
    return reply.code(500).send({ message: 'Terjadi kesalahan internal server' });
  }
};

// GET subkegiatan by kegiatan ID
const getByKegiatanId = async (request, reply) => {
  try {
    const { kegiatanId } = request.params;
    const subKegiatans = await SubKegiatan.find({ kegiatanId })
      .populate({
        path: 'kegiatanId',
        populate: {
          path: 'programId',
          populate: {
            path: 'bidangId',
            populate: {
              path: 'urusanId',
              select: 'kode nama'
            },
            select: 'kode nama'
          },
          select: 'kode nama'
        },
        select: 'kode nama'
      })
      .sort({ kode: 1 });

    return { data: subKegiatans };
  } catch (error) {
    console.error('SubKegiatan GET by Kegiatan Error:', error);
    return reply.code(500).send({ message: 'Terjadi kesalahan internal server' });
  }
};

// Export functions for Fastify route registration
export default {
  getAll,
  create,
  getById,
  update,
  remove,
  getByKegiatanId
};