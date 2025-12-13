import mongoose from 'mongoose';
import Kinerja from '../models/Kinerja.js';
// Import required models to ensure they're registered with Mongoose
import { SubKegiatan } from '../models/Urusan.js';
import SubPerangkatDaerah from '../models/SubPerangkatDaerah.js';
import Anggaran from '../models/Anggaran.js';

const kinerjaRouter = async (request, reply) => {
  try {
    // Parse URL for route matching
    const url = new URL(request.url, `http://${request.headers.host}`);
    const pathname = url.pathname;
    const params = url.searchParams;

    // GET /api/kinerja - Get all kinerja with filtering
    if (request.method === 'GET' && pathname === '/api/kinerja') {
      try {
        const page = parseInt(params.get('page')) || 1;
        const limit = parseInt(params.get('limit')) || 10;
        const budgetYear = params.get('budgetYear');
        const subPerangkatDaerahId = params.get('subPerangkatDaerahId');
        const status = params.get('status');
        const search = params.get('search');
        const anggaranId = params.get('anggaranId');

        const filter = {};
        if (budgetYear) filter.budgetYear = budgetYear;
        if (subPerangkatDaerahId) filter.subPerangkatDaerahId = subPerangkatDaerahId;
        if (status) filter.status = status;
        if (anggaranId) filter.anggaranId = anggaranId;
        if (search) {
          filter.$or = [
            { 'subKegiatanId.nama': { $regex: search, $options: 'i' } },
            { 'subKegiatanId.kode': { $regex: search, $options: 'i' } },
            { 'subKegiatanId.kinerja': { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
          ];
        }

        const skip = (page - 1) * limit;
        const kinerjaList = await Kinerja.find(filter)
          .populate('subKegiatanId')
          .populate('subPerangkatDaerahId')
          .populate('anggaranId')
          .populate('penggunaAnggaran', 'nama jabatanFungsional')
          .populate('createdBy', 'username')
          .populate('updatedBy', 'username')
          .sort({ targetDate: 1, createdAt: -1 })
          .skip(skip)
          .limit(limit);

        const total = await Kinerja.countDocuments(filter);

        return reply.code(200).send({
          success: true,
          data: kinerjaList,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        });
      } catch (error) {
        console.error('Error fetching kinerja:', error);
        return reply.code(500).send({
          success: false,
          message: 'Gagal mengambil data kinerja'
        });
      }

    // GET /api/kinerja/:id - Get kinerja by ID
    } else if (request.method === 'GET' && pathname.match(/^\/api\/kinerja\/[a-fA-F0-9]{24}$/)) {
      try {
        const id = pathname.split('/')[3];

        if (!mongoose.Types.ObjectId.isValid(id)) {
          return reply.code(400).send({
            success: false,
            message: 'ID tidak valid'
          });
        }

        const kinerja = await Kinerja.findById(id)
          .populate('subKegiatanId')
          .populate('subPerangkatDaerahId')
          .populate('anggaranId')
          .populate('penggunaAnggaran', 'nama jabatanFungsional')
          .populate('createdBy', 'username')
          .populate('updatedBy', 'username')
          .populate('progressNotes.recordedBy', 'username');

        if (!kinerja) {
          return reply.code(404).send({
            success: false,
            message: 'Kinerja tidak ditemukan'
          });
        }

        return reply.code(200).send({
          success: true,
          data: kinerja
        });
      } catch (error) {
        console.error('Error fetching kinerja:', error);
        return reply.code(500).send({
          success: false,
          message: 'Gagal mengambil data kinerja'
        });
      }

    // GET /api/kinerja/summary/:budgetYear - Get achievement summary
    } else if (request.method === 'GET' && pathname.match(/^\/api\/kinerja\/summary\/[^\/]+$/)) {
      try {
        const budgetYear = pathname.split('/')[4];
        const subPerangkatDaerahId = params.get('subPerangkatDaerahId');

        const summary = await Kinerja.getAchievementSummary(budgetYear, subPerangkatDaerahId);

        return reply.code(200).send({
          success: true,
          data: summary,
          budgetYear
        });
      } catch (error) {
        console.error('Error fetching kinerja summary:', error);
        return reply.code(500).send({
          success: false,
          message: 'Gagal mengambil ringkasan kinerja'
        });
      }

    // GET /api/kinerja/subkegiatan?anggaranId=xxx - Get SubKegiatan for specific Anggaran
    } else if (request.method === 'GET' && pathname === '/api/kinerja/subkegiatan') {
      try {
        const anggaranId = params.get('anggaranId');

        if (!anggaranId) {
          return reply.code(400).send({
            success: false,
            message: 'Anggaran ID harus diisi'
          });
        }

        if (!mongoose.Types.ObjectId.isValid(anggaranId)) {
          return reply.code(400).send({
            success: false,
            message: 'Anggaran ID tidak valid'
          });
        }

        // Find the Anggaran to get the SubKegiatan ID
        const anggaran = await Anggaran.findById(anggaranId).populate('subKegiatanId');

        if (!anggaran) {
          return reply.code(404).send({
            success: false,
            message: 'Anggaran tidak ditemukan'
          });
        }

        // Return the SubKegiatan data
        const subKegiatanData = [{
          _id: anggaran.subKegiatanId._id,
          kode: anggaran.subKegiatanId.kode,
          nama: anggaran.subKegiatanId.nama,
          kinerja: anggaran.subKegiatanId.kinerja,
          indikator: anggaran.subKegiatanId.indikator,
          satuan: anggaran.subKegiatanId.satuan
        }];

        return reply.code(200).send({
          success: true,
          data: subKegiatanData
        });
      } catch (error) {
        console.error('Error fetching SubKegiatan for Anggaran:', error);
        return reply.code(500).send({
          success: false,
          message: 'Gagal mengambil data SubKegiatan'
        });
      }

    // POST /api/kinerja - Create new kinerja
    } else if (request.method === 'POST' && pathname === '/api/kinerja') {
      try {
        const {
          subKegiatanId,
          subPerangkatDaerahId,
          anggaranId,
          budgetYear,
          targetValue,
          targetDate,
          description,
          priority = 'medium'
        } = request.body;

        console.log('Received Kinerja creation request:', {
          subKegiatanId,
          subPerangkatDaerahId,
          anggaranId,
          budgetYear,
          targetValue,
          targetDate,
          description,
          priority
        });

        if (!subKegiatanId || !subPerangkatDaerahId || !anggaranId || !budgetYear || !targetValue || !targetDate) {
          return reply.code(400).send({
            success: false,
            message: 'SubKegiatan, unit kerja, anggaran, tahun, target nilai, dan tanggal target harus diisi'
          });
        }

        // Validate target date
        const targetDateObj = new Date(targetDate);
        if (isNaN(targetDateObj.getTime())) {
          return reply.code(400).send({
            success: false,
            message: 'Format tanggal target tidak valid'
          });
        }

        // Get user ID from JWT token in request
        const userId = request.user?.userId;
        console.log('Creating kinerja for user:', { userId, userObject: request.user });

        if (!userId) {
          console.error('No userId found in token:', request.user);
          return reply.code(401).send({
            success: false,
            message: 'User ID tidak ditemukan dari token autentikasi'
          });
        }

        const newKinerja = new Kinerja({
          subKegiatanId,
          subPerangkatDaerahId,
          anggaranId,
          budgetYear,
          targetValue,
          targetDate: targetDateObj,
          description,
          priority,
          createdBy: userId,
          updatedBy: userId
        });

        const savedKinerja = await newKinerja.save();
        await savedKinerja.populate('subKegiatanId');
        await savedKinerja.populate('subPerangkatDaerahId');
        await savedKinerja.populate('anggaranId');

        return reply.code(201).send({
          success: true,
          message: 'Kinerja berhasil dibuat',
          data: savedKinerja
        });
      } catch (error) {
        console.error('Error creating kinerja:', error);

        let errorMessage = 'Gagal membuat kinerja';
        if (error.code === 11000) {
          errorMessage = 'Kinerja untuk subkegiatan dan unit kerja ini sudah ada untuk tahun anggaran yang sama';
        } else if (error.message) {
          errorMessage = error.message;
        }

        return reply.code(500).send({
          success: false,
          message: errorMessage
        });
      }

    // PUT /api/kinerja/:id - Update kinerja
    } else if (request.method === 'PUT' && pathname.match(/^\/api\/kinerja\/[a-fA-F0-9]{24}$/)) {
      try {
        const id = pathname.split('/')[3];
        const {
          targetValue,
          actualValue,
          status,
          targetDate,
          description,
          priority,
          progressNote
        } = request.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
          return reply.code(400).send({
            success: false,
            message: 'ID tidak valid'
          });
        }

        const kinerja = await Kinerja.findById(id);
        if (!kinerja) {
          return reply.code(404).send({
            success: false,
            message: 'Kinerja tidak ditemukan'
          });
        }

        // Get user ID from JWT token in request
        const userId = request.user?.userId;
        console.log('Updating kinerja for user:', { userId, userObject: request.user });

        if (!userId) {
          console.error('No userId found in token:', request.user);
          return reply.code(401).send({
            success: false,
            message: 'User ID tidak ditemukan dari token autentikasi'
          });
        }

        // Track what fields are being updated
        let hasChanges = false;

        if (targetValue !== undefined && kinerja.targetValue !== targetValue) {
          kinerja.targetValue = targetValue;
          hasChanges = true;
        }

        if (actualValue !== undefined && kinerja.actualValue !== actualValue) {
          kinerja.actualValue = actualValue;
          hasChanges = true;
        }

        if (status && kinerja.status !== status) {
          kinerja.status = status;
          hasChanges = true;
        }

        if (targetDate && kinerja.targetDate.getTime() !== new Date(targetDate).getTime()) {
          kinerja.targetDate = new Date(targetDate);
          hasChanges = true;
        }

        if (description !== undefined && kinerja.description !== description) {
          kinerja.description = description;
          hasChanges = true;
        }

        if (priority && kinerja.priority !== priority) {
          kinerja.priority = priority;
          hasChanges = true;
        }

        // Handle lokasi update
        if (request.body.lokasi !== undefined && kinerja.lokasi !== request.body.lokasi) {
          kinerja.lokasi = request.body.lokasi;
          hasChanges = true;
        }

        // Handle penggunaAnggaran update
        if (request.body.penggunaAnggaranId !== undefined) {
          const newPenggunaAnggaranId = request.body.penggunaAnggaranId ? new mongoose.Types.ObjectId(request.body.penggunaAnggaranId) : null;
          if (kinerja.penggunaAnggaran?.toString() !== newPenggunaAnggaranId?.toString()) {
            kinerja.penggunaAnggaran = newPenggunaAnggaranId;
            hasChanges = true;
          }
        }

        // Handle progress note update
        if (progressNote && progressNote.trim()) {
          await kinerja.addProgressNote(progressNote, userId, actualValue);
          hasChanges = true;
        }

        if (hasChanges) {
          kinerja.updatedBy = userId;
          await kinerja.save();
        }

        await kinerja.populate('subKegiatanId');
        await kinerja.populate('subPerangkatDaerahId');
        await kinerja.populate('anggaranId');

        return reply.code(200).send({
          success: true,
          message: 'Kinerja berhasil diperbarui',
          data: kinerja
        });
      } catch (error) {
        console.error('Error updating kinerja:', error);
        return reply.code(500).send({
          success: false,
          message: 'Gagal memperbarui kinerja'
        });
      }

    // PUT /api/kinerja/:id/progress - Update progress specifically
    } else if (request.method === 'PUT' && pathname.match(/^\/api\/kinerja\/[a-fA-F0-9]{24}\/progress$/)) {
      try {
        const id = pathname.split('/')[3];
        const { actualValue, progressNote } = request.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
          return reply.code(400).send({
            success: false,
            message: 'ID tidak valid'
          });
        }

        if (actualValue === undefined || !progressNote || !progressNote.trim()) {
          return reply.code(400).send({
            success: false,
            message: 'Nilai aktual dan catatan progress harus diisi'
          });
        }

        const kinerja = await Kinerja.findById(id);
        if (!kinerja) {
          return reply.code(404).send({
            success: false,
            message: 'Kinerja tidak ditemukan'
          });
        }

        // Get user ID from JWT token in request
        const userId = request.user?.userId;
        if (!userId) {
          return reply.code(401).send({
            success: false,
            message: 'User ID tidak ditemukan dari token autentikasi'
          });
        }

        const updatedKinerja = await kinerja.updateProgress(actualValue, progressNote, userId);

        await updatedKinerja.populate('subKegiatanId');
        await updatedKinerja.populate('subPerangkatDaerahId');
        await updatedKinerja.populate('anggaranId');

        return reply.code(200).send({
          success: true,
          message: 'Progress kinerja berhasil diperbarui',
          data: updatedKinerja
        });
      } catch (error) {
        console.error('Error updating kinerja progress:', error);
        return reply.code(500).send({
          success: false,
          message: 'Gagal memperbarui progress kinerja'
        });
      }

    // DELETE /api/kinerja/:id - Delete kinerja
    } else if (request.method === 'DELETE' && pathname.match(/^\/api\/kinerja\/[a-fA-F0-9]{24}$/)) {
      try {
        const id = pathname.split('/')[3];

        if (!mongoose.Types.ObjectId.isValid(id)) {
          return reply.code(400).send({
            success: false,
            message: 'ID tidak valid'
          });
        }

        const kinerja = await Kinerja.findByIdAndDelete(id);
        if (!kinerja) {
          return reply.code(404).send({
            success: false,
            message: 'Kinerja tidak ditemukan'
          });
        }

        return reply.code(200).send({
          success: true,
          message: 'Kinerja berhasil dihapus'
        });
      } catch (error) {
        console.error('Error deleting kinerja:', error);
        return reply.code(500).send({
          success: false,
          message: 'Gagal menghapus kinerja'
        });
      }

    // 404 for unmatched routes
    } else {
      return reply.code(404).send({ message: 'Endpoint tidak ditemukan' });
    }

  } catch (error) {
    console.error('Kinerja router error:', error);
    return reply.code(500).send({ message: 'Kesalahan server internal' });
  }
};

export default kinerjaRouter;