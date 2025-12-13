import mongoose from 'mongoose';
import Anggaran from '../models/Anggaran.js';
// Import AkunLRA model to ensure it's registered with Mongoose (Kode Rekening)
import AkunLRA from '../models/AkunLRA.js';
// Import SubKegiatan model to ensure it's registered with Mongoose
import { SubKegiatan } from '../models/Urusan.js';

const anggaranRouter = async (request, reply) => {
  try {
    // Parse URL for route matching
    const url = new URL(request.url, `http://${request.headers.host}`);
    const pathname = url.pathname;
    const params = url.searchParams;

    // GET /api/anggaran - Get all anggaran
    if (request.method === 'GET' && pathname === '/api/anggaran') {
      try {
        const page = parseInt(params.get('page')) || 1;
        const limit = parseInt(params.get('limit')) || 10;
        const budgetYear = params.get('budgetYear');
        const subKegiatanId = params.get('subKegiatanId');
        const subPerangkatDaerahId = params.get('subPerangkatDaerahId');
        const search = params.get('search');

        const filter = {};
        if (budgetYear) filter.budgetYear = budgetYear;
        if (subKegiatanId) filter.subKegiatanId = subKegiatanId;
        if (subPerangkatDaerahId) {
          // Filter by anggaran where subKegiatanId belongs to the specified unit
          // First get all subKegiatan that belong to this unit
          const { SubKegiatan } = await import('../models/Urusan.js');
          const unitSubKegiatan = await SubKegiatan.find({ subPerangkatDaerahId }).select('_id').lean();
          const subKegiatanIds = unitSubKegiatan.map(sk => sk._id);
          if (subKegiatanIds.length > 0) {
            filter.subKegiatanId = { $in: subKegiatanIds };
          } else {
            // No subKegiatan found for this unit, return empty result
            filter._id = null; // This will return no results
          }
        }
        if (search) {
          filter.$or = [
            { 'subKegiatanId.nama': { $regex: search, $options: 'i' } },
            { 'subKegiatanId.kode': { $regex: search, $options: 'i' } },
            { 'allocations.kodeRekeningId.nama': { $regex: search, $options: 'i' } }
          ];
        }

        const skip = (page - 1) * limit;
        const anggaran = await Anggaran.find(filter)
          .populate('subKegiatanId')
          .populate('sumberDanaId')
          .populate({
            path: 'allocations.kodeRekeningId',
            model: 'AkunLRA'
          })
          .populate('createdBy', 'username')
          .populate('updatedBy', 'username')
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit);

        const total = await Anggaran.countDocuments(filter);

        return reply.code(200).send({
          success: true,
          data: anggaran,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        });
      } catch (error) {
        console.error('Error fetching anggaran:', error);
        return reply.code(500).send({
          success: false,
          message: 'Gagal mengambil data anggaran'
        });
      }

    // GET /api/anggaran/:id - Get anggaran by ID
    } else if (request.method === 'GET' && pathname.match(/^\/api\/anggaran\/[a-fA-F0-9]{24}$/)) {
      try {
        const id = pathname.split('/')[3];

        if (!mongoose.Types.ObjectId.isValid(id)) {
          return reply.code(400).send({
            success: false,
            message: 'ID tidak valid'
          });
        }

        const anggaran = await Anggaran.findById(id)
          .populate('subKegiatanId')
          .populate('sumberDanaId')
          .populate({
            path: 'allocations.kodeRekeningId',
            model: 'AkunLRA'
          })
          .populate('createdBy', 'username')
          .populate('updatedBy', 'username');

        if (!anggaran) {
          return reply.code(404).send({
            success: false,
            message: 'Anggaran tidak ditemukan'
          });
        }

        return reply.code(200).send({
          success: true,
          data: anggaran
        });
      } catch (error) {
        console.error('Error fetching anggaran:', error);
        return reply.code(500).send({
          success: false,
          message: 'Gagal mengambil data anggaran'
        });
      }

    // POST /api/anggaran - Create new anggaran
    } else if (request.method === 'POST' && pathname === '/api/anggaran') {
      try {
        const { subKegiatanId, budgetYear, sumberDanaId, allocations, description } = request.body;
        console.log('Received Anggaran creation request:', {
          subKegiatanId,
          budgetYear,
          sumberDanaId,
          allocations: allocations ? allocations.map(a => ({ kodeRekeningId: a.kodeRekeningId, amount: a.amount, hasAllocatedBy: !!a.allocatedBy })) : null,
          description
        });

        if (!subKegiatanId || !budgetYear || !sumberDanaId || !allocations || !Array.isArray(allocations)) {
          return reply.code(400).send({
            success: false,
            message: 'SubKegiatan, tahun anggaran, sumber dana, dan alokasi harus diisi'
          });
        }

        const existingAnggaran = await Anggaran.findOne({ subKegiatanId, budgetYear });
        if (existingAnggaran) {
          return reply.code(409).send({
            success: false,
            message: 'Anggaran untuk subkegiatan dan tahun ini sudah ada'
          });
        }

        const totalAmount = allocations.reduce((total, allocation) => total + allocation.amount, 0);

        // Get user ID from JWT token in request
        const userId = request.user?.userId;
        console.log('Creating anggaran for user:', { userId, userObject: request.user });

        if (!userId) {
          console.error('No userId found in token:', request.user);
          return reply.code(401).send({
            success: false,
            message: 'User ID tidak ditemukan dari token autentikasi'
          });
        }

        // Ensure allocations have allocatedBy field
        const allocationsWithUser = allocations.map(allocation => ({
          ...allocation,
          allocatedBy: allocation.allocatedBy || userId,
          allocatedAt: allocation.allocatedAt || new Date()
        }));

        const newAnggaran = new Anggaran({
          subKegiatanId,
          budgetYear,
          sumberDanaId,
          allocations: allocationsWithUser,
          totalAmount,
          description,
          createdBy: userId,
          updatedBy: userId
        });

        const savedAnggaran = await newAnggaran.save();
        await savedAnggaran.populate('subKegiatanId');
        await savedAnggaran.populate({
          path: 'allocations.kodeRekeningId',
          model: 'AkunLRA'
        });
        await savedAnggaran.populate('sumberDanaId');

        return reply.code(201).send({
          success: true,
          message: 'Anggaran berhasil dibuat',
          data: savedAnggaran
        });
      } catch (error) {
        console.error('Error creating anggaran:', error);
        return reply.code(500).send({
          success: false,
          message: 'Gagal membuat anggaran'
        });
      }

    // PUT /api/anggaran/:id - Update anggaran
    } else if (request.method === 'PUT' && pathname.match(/^\/api\/anggaran\/[a-fA-F0-9]{24}$/)) {
      try {
        const id = pathname.split('/')[3];
        const { subKegiatanId, budgetYear, sumberDanaId, allocations, description } = request.body;
        console.log('Received PUT request with data:', { subKegiatanId, budgetYear, sumberDanaId, allocations: allocations?.length, description });

        if (!mongoose.Types.ObjectId.isValid(id)) {
          return reply.code(400).send({
            success: false,
            message: 'ID tidak valid'
          });
        }

        const anggaran = await Anggaran.findById(id);
        if (!anggaran) {
          return reply.code(404).send({
            success: false,
            message: 'Anggaran tidak ditemukan'
          });
        }

        // Get user ID from JWT token in request
        const userId = request.user?.userId;
        console.log('Updating anggaran for user:', { userId, userObject: request.user });

        if (!userId) {
          console.error('No userId found in token:', request.user);
          return reply.code(401).send({
            success: false,
            message: 'User ID tidak ditemukan dari token autentikasi'
          });
        }

        // Track what fields are being updated
        let hasChanges = false;

        // Update sumberDanaId if provided
        if (sumberDanaId !== undefined) {
          console.log('Updating sumberDanaId:', {
            old: anggaran.sumberDanaId,
            new: sumberDanaId,
            type: typeof sumberDanaId
          });
          anggaran.sumberDanaId = sumberDanaId || null; // Handle empty string as null
          hasChanges = true;
        }

        if (allocations && Array.isArray(allocations)) {
          // Ensure allocations have allocatedBy field
          const allocationsWithUser = allocations.map(allocation => ({
            ...allocation,
            allocatedBy: allocation.allocatedBy || userId,
            allocatedAt: allocation.allocatedAt || new Date()
          }));

          anggaran.allocations = allocationsWithUser;
          anggaran.totalAmount = allocationsWithUser.reduce((total, allocation) => total + allocation.amount, 0);
          hasChanges = true;
        }

        if (description !== undefined && anggaran.description !== description) {
          anggaran.description = description;
          hasChanges = true;
        }

        // Always update the updatedBy field and timestamp
        anggaran.updatedBy = userId;
        anggaran.updatedAt = new Date();
        hasChanges = true;

        console.log('Attempting to save anggaran with changes:', {
          hasChanges,
          sumberDanaId: anggaran.sumberDanaId,
          description: anggaran.description,
          totalAmount: anggaran.totalAmount
        });

        let updatedAnggaran;
        if (hasChanges) {
          updatedAnggaran = await anggaran.save();
          console.log('Anggaran saved successfully:', {
            id: updatedAnggaran._id,
            sumberDanaId: updatedAnggaran.sumberDanaId,
            description: updatedAnggaran.description,
            updatedAt: updatedAnggaran.updatedAt
          });
        } else {
          console.log('No changes detected, but still populating and returning current data');
          updatedAnggaran = anggaran;
        }
        await updatedAnggaran.populate('subKegiatanId');
        await updatedAnggaran.populate({
          path: 'allocations.kodeRekeningId',
          model: 'AkunLRA'
        });
        await updatedAnggaran.populate('sumberDanaId');

        return reply.code(200).send({
          success: true,
          message: 'Anggaran berhasil diperbarui',
          data: updatedAnggaran
        });
      } catch (error) {
        console.error('Error updating anggaran:', error);
        return reply.code(500).send({
          success: false,
          message: 'Gagal memperbarui anggaran'
        });
      }

    // DELETE /api/anggaran/:id - Delete anggaran
    } else if (request.method === 'DELETE' && pathname.match(/^\/api\/anggaran\/[a-fA-F0-9]{24}$/)) {
      try {
        const id = pathname.split('/')[3];

        if (!mongoose.Types.ObjectId.isValid(id)) {
          return reply.code(400).send({
            success: false,
            message: 'ID tidak valid'
          });
        }

        const anggaran = await Anggaran.findByIdAndDelete(id);
        if (!anggaran) {
          return reply.code(404).send({
            success: false,
            message: 'Anggaran tidak ditemukan'
          });
        }

        return reply.code(200).send({
          success: true,
          message: 'Anggaran berhasil dihapus'
        });
      } catch (error) {
        console.error('Error deleting anggaran:', error);
        return reply.code(500).send({
          success: false,
          message: 'Gagal menghapus anggaran'
        });
      }

    // 404 for unmatched routes
    } else {
      return reply.code(404).send({ message: 'Endpoint not found' });
    }

  } catch (error) {
    console.error('Anggaran router error:', error);
    return reply.code(500).send({ message: 'Internal server error' });
  }
};

export default anggaranRouter;