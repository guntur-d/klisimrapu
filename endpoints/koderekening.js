import mongoose from 'mongoose';
import AkunLRA from '../models/AkunLRA.js';

// GET all kode rekening or by specific IDs
const getAll = async (request, reply) => {
  try {
    const { ids } = request.query;

    if (ids) {
      // Get kode rekening by specific IDs
      const idsArray = ids.split(',').map(id => id.trim()).filter(id => id.length > 0);

      if (idsArray.length === 0) {
        return reply.code(400).send({ message: 'No valid IDs provided' });
      }

      console.log('Fetching kode rekening by IDs:', idsArray);

      // Try to find by ObjectId first
      let accounts = await AkunLRA.find({ _id: { $in: idsArray } })
        .sort({ level: 1, fullCode: 1 })
        .lean();

      // If no results and we have string IDs, try converting to ObjectIds
      if (accounts.length === 0 && idsArray.length > 0) {
        const objectIds = idsArray.map(id => {
          try {
            return new mongoose.Types.ObjectId(id);
          } catch (e) {
            return null;
          }
        }).filter(id => id !== null);

        if (objectIds.length > 0) {
          accounts = await AkunLRA.find({ _id: { $in: objectIds } })
            .sort({ level: 1, fullCode: 1 })
            .lean();
        }
      }

      console.log(`Found ${accounts.length} kode rekening for ${idsArray.length} requested IDs`);
      console.log('Accounts found:', accounts.map(a => ({ id: a._id, name: a.name, code: a.code })));

      return reply.send({
        data: accounts,
        total: accounts.length,
        message: `Data kode rekening berhasil diambil untuk ${accounts.length} ID`
      });
    } else {
      // Get all kode rekening with hierarchical structure
      console.log('Fetching all kode rekening...');

      const accounts = await AkunLRA.find({})
        .sort({ level: 1, fullCode: 1 })
        .lean();

      console.log(`Found ${accounts.length} kode rekening`);

      return reply.send({
        data: accounts,
        total: accounts.length,
        message: 'Data kode rekening berhasil diambil'
      });
    }
  } catch (error) {
    console.error('Error in getAll kode rekening:', error);
    return reply.code(500).send({
      message: 'Terjadi kesalahan pada server',
      error: error.message
    });
  }
};

// GET specific kode rekening by ID
const getById = async (request, reply) => {
  try {
    const { id } = request.params;
    console.log('Fetching kode rekening by ID:', id);

    const account = await AkunLRA.findById(id);

    if (!account) {
      return reply.code(404).send({ message: 'Kode rekening tidak ditemukan' });
    }

    return reply.send({
      data: account,
      message: 'Kode rekening berhasil diambil'
    });
  } catch (error) {
    console.error('Error in getById kode rekening:', error);
    return reply.code(500).send({
      message: 'Terjadi kesalahan pada server',
      error: error.message
    });
  }
};

// POST create new kode rekening
const create = async (request, reply) => {
  try {
    console.log('Creating new kode rekening...');

    const { code, name, fullCode, description, level, parent } = request.body;

    // Validation
    if (!code || !name || !fullCode) {
      return reply.code(400).send({
        message: 'Kode, nama, dan kode lengkap harus diisi'
      });
    }

    // Check if fullCode already exists (unique constraint)
    const existingAccount = await AkunLRA.findOne({ fullCode });
    if (existingAccount) {
      return reply.code(400).send({
        message: 'Kode lengkap sudah digunakan'
      });
    }

    // Prepare data for saving
    const accountData = {
      code,
      name,
      fullCode,
      description,
      level: level || 1,
      parent: parent || null,
      isLeaf: true // Will be updated if children are added later
    };

    // Create and save new kode rekening
    const newAccount = new AkunLRA(accountData);
    const savedAccount = await newAccount.save();

    // Update parent's isLeaf status if parent exists
    if (parent) {
      await AkunLRA.findByIdAndUpdate(parent, { isLeaf: false });
    }

    console.log('Kode rekening created successfully:', savedAccount._id);

    return reply.code(201).send({
      message: 'Kode rekening berhasil ditambahkan',
      data: savedAccount
    });
  } catch (error) {
    console.error('Error processing kode rekening creation:', error);
    return reply.code(400).send({
      message: 'Format data tidak valid',
      error: error.message
    });
  }
};

// PUT update existing kode rekening
const update = async (request, reply) => {
  try {
    const { id } = request.params;
    console.log('Updating kode rekening:', id);

    const { code, name, fullCode, description, level, parent } = request.body;

    // Validation
    if (!code || !name || !fullCode) {
      return reply.code(400).send({
        message: 'Kode, nama, dan kode lengkap harus diisi'
      });
    }

    // Find existing account
    const existingAccount = await AkunLRA.findById(id);
    if (!existingAccount) {
      return reply.code(404).send({ message: 'Kode rekening tidak ditemukan' });
    }

    // Check if fullCode already exists (but allow same account to keep its code)
    const duplicateAccount = await AkunLRA.findOne({
      fullCode,
      _id: { $ne: id }
    });
    if (duplicateAccount) {
      return reply.code(400).send({
        message: 'Kode lengkap sudah digunakan oleh rekening lain'
      });
    }

    // Prepare update data
    const updateData = {
      code,
      name,
      fullCode,
      description,
      level: level || 1,
      parent: parent || null
    };

    // Update the account
    const updatedAccount = await AkunLRA.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    console.log('Kode rekening updated successfully:', updatedAccount._id);

    return reply.code(200).send({
      message: 'Kode rekening berhasil diperbarui',
      data: updatedAccount
    });
  } catch (error) {
    console.error('Error processing kode rekening update:', error);
    return reply.code(400).send({
      message: 'Format data tidak valid',
      error: error.message
    });
  }
};

// DELETE kode rekening
const remove = async (request, reply) => {
  try {
    const { id } = request.params;
    console.log('Deleting kode rekening:', id);

    // Find the account first
    const account = await AkunLRA.findById(id);
    if (!account) {
      return reply.code(404).send({ message: 'Kode rekening tidak ditemukan' });
    }

    // Check if account has children (only allow deletion of leaf nodes)
    const childrenCount = await AkunLRA.countDocuments({ parent: id });
    if (childrenCount > 0) {
      return reply.code(400).send({
        message: `Tidak dapat menghapus rekening ini karena memiliki ${childrenCount} anak rekening`
      });
    }

    // Delete the account
    await AkunLRA.findByIdAndDelete(id);

    // Update parent's isLeaf status if parent exists
    if (account.parent) {
      const siblingsCount = await AkunLRA.countDocuments({ parent: account.parent });
      if (siblingsCount === 0) {
        await AkunLRA.findByIdAndUpdate(account.parent, { isLeaf: true });
      }
    }

    console.log('Kode rekening deleted successfully:', id);

    return reply.send({
      message: 'Kode rekening berhasil dihapus'
    });
  } catch (error) {
    console.error('Error deleting kode rekening:', error);
    return reply.code(500).send({
      message: 'Terjadi kesalahan saat menghapus kode rekening'
    });
  }
};

// GET search kode rekening
const search = async (request, reply) => {
  try {
    const { query } = request.params;
    console.log('Searching kode rekening...');

    if (!query) {
      return reply.code(400).send({ message: 'Query pencarian harus diisi' });
    }

    const searchResults = await AkunLRA.find({
      $or: [
        { code: { $regex: query, $options: 'i' } },
        { name: { $regex: query, $options: 'i' } },
        { fullCode: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    })
    .sort({ level: 1, fullCode: 1 })
    .limit(50)
    .lean();

    console.log(`Search found ${searchResults.length} results for query: ${query}`);

    return reply.send({
      data: searchResults,
      total: searchResults.length,
      query: query,
      message: `Ditemukan ${searchResults.length} hasil pencarian`
    });
  } catch (error) {
    console.error('Error in search kode rekening:', error);
    return reply.code(500).send({
      message: 'Terjadi kesalahan pada server',
      error: error.message
    });
  }
};

// Export functions for Fastify route registration
export default {
  getAll,
  create,
  getById,
  update,
  remove,
  search
};