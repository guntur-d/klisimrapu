import { SumberDana } from '../models/SumberDana.js';

// Helper function untuk standardize response
const sendSuccess = (reply, data, message = 'Berhasil', statusCode = 200) => {
  reply.code(statusCode).send({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

const sendError = (reply, message, statusCode = 500) => {
  reply.code(statusCode).send({
    success: false,
    message,
    timestamp: new Date().toISOString()
  });
};

// GET /api/sumberdana - Ambil semua sumber dana dengan pagination dan search
const getAll = async (request, reply) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      isActive = 'all' 
    } = request.query;

    // Build query
    let query = {};
    
    if (search) {
      query.$or = [
        { kode: { $regex: search, $options: 'i' } },
        { nama: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (isActive !== 'all') {
      query.isActive = isActive === 'true';
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await SumberDana.countDocuments(query);

    const sumberDana = await SumberDana.find(query)
      .sort({ kode: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalPages = Math.ceil(total / limit);

    sendSuccess(reply, {
      data: sumberDana,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }, 'Data sumber dana berhasil dimuat');

  } catch (error) {
    console.error('Get all sumber dana error:', error);
    sendError(reply, 'Gagal memuat data sumber dana', 500);
  }
};

// GET /api/sumberdana/:id - Ambil sumber dana berdasarkan ID
const getById = async (request, reply) => {
  try {
    const { id } = request.params;

    // Validate MongoDB ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return sendError(reply, 'Format ID tidak valid', 400);
    }

    const sumberDana = await SumberDana.findById(id);
    
    if (!sumberDana) {
      return sendError(reply, 'Sumber dana tidak ditemukan', 404);
    }

    sendSuccess(reply, sumberDana, 'Data sumber dana berhasil dimuat');

  } catch (error) {
    console.error('Get sumber dana by ID error:', error);
    sendError(reply, 'Gagal memuat data sumber dana', 500);
  }
};

// POST /api/sumberdana - Tambah sumber dana baru
const create = async (request, reply) => {
  try {
    const { kode, nama, isActive = true } = request.body;

    // Validation
    if (!kode || !nama) {
      return sendError(reply, 'Kode dan nama sumber dana harus diisi', 400);
    }

    // Check duplicate kode
    const existing = await SumberDana.findOne({ kode: kode.trim() });
    if (existing) {
      return sendError(reply, 'Kode sumber dana sudah ada', 409);
    }

    const newSumberDana = new SumberDana({
      kode: kode.trim(),
      nama: nama.trim(),
      isActive
    });

    await newSumberDana.save();

    sendSuccess(reply, newSumberDana, 'Sumber dana berhasil ditambahkan', 201);

  } catch (error) {
    console.error('Create sumber dana error:', error);
    
    if (error.code === 11000) {
      sendError(reply, 'Kode sumber dana sudah ada', 409);
    } else {
      sendError(reply, 'Gagal menambahkan sumber dana', 500);
    }
  }
};

// PUT /api/sumberdana/:id - Update sumber dana
const update = async (request, reply) => {
  try {
    const { id } = request.params;
    const { kode, nama, isActive } = request.body;

    // Validate MongoDB ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return sendError(reply, 'Format ID tidak valid', 400);
    }

    // Validation
    if (!kode || !nama) {
      return sendError(reply, 'Kode dan nama sumber dana harus diisi', 400);
    }

    // Check duplicate kode (exclude current record)
    const existing = await SumberDana.findOne({ 
      kode: kode.trim(),
      _id: { $ne: id }
    });
    
    if (existing) {
      return sendError(reply, 'Kode sumber dana sudah ada', 409);
    }

    const updatedSumberDana = await SumberDana.findByIdAndUpdate(
      id,
      {
        kode: kode.trim(),
        nama: nama.trim(),
        isActive,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!updatedSumberDana) {
      return sendError(reply, 'Sumber dana tidak ditemukan', 404);
    }

    sendSuccess(reply, updatedSumberDana, 'Sumber dana berhasil diperbarui');

  } catch (error) {
    console.error('Update sumber dana error:', error);
    
    if (error.code === 11000) {
      sendError(reply, 'Kode sumber dana sudah ada', 409);
    } else {
      sendError(reply, 'Gagal memperbarui sumber dana', 500);
    }
  }
};

// DELETE /api/sumberdana/:id - Hapus sumber dana
const remove = async (request, reply) => {
  try {
    const { id } = request.params;

    // Validate MongoDB ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return sendError(reply, 'Format ID tidak valid', 400);
    }

    // Check if sumber dana exists
    const sumberDana = await SumberDana.findById(id);
    if (!sumberDana) {
      return sendError(reply, 'Sumber dana tidak ditemukan', 404);
    }

    await SumberDana.findByIdAndDelete(id);

    sendSuccess(reply, null, 'Sumber dana berhasil dihapus');

  } catch (error) {
    console.error('Delete sumber dana error:', error);
    sendError(reply, 'Gagal menghapus sumber dana', 500);
  }
};

// GET /api/sumberdana/active - Ambil hanya sumber dana yang aktif
const getActive = async (request, reply) => {
  try {
    const sumberDana = await SumberDana.find({ isActive: true })
      .sort({ kode: 1 });

    sendSuccess(reply, sumberDana, 'Data sumber dana aktif berhasil dimuat');

  } catch (error) {
    console.error('Get active sumber dana error:', error);
    sendError(reply, 'Gagal memuat data sumber dana aktif', 500);
  }
};

export {
  getAll,
  getById,
  create,
  update,
  remove,
  getActive
};