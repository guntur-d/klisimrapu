import mongoose from 'mongoose';
import Pencapaian from '../models/Pencapaian.js';
// Import required models to ensure they're registered with Mongoose
import Kinerja from '../models/Kinerja.js';
import SubPerangkatDaerah from '../models/SubPerangkatDaerah.js';
import Anggaran from '../models/Anggaran.js';
import multer from 'multer';

const pencapaianRouter = async (req, res) => {
  try {
    // Helper function to check if user is authenticated
    const authenticateUser = (req) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return false;
        }
        const token = authHeader.substring(7);
        if (!token || token.length < 10) {
          return false;
        }
        return true;
      } catch (error) {
        return false;
      }
    };

    // Check authentication
    if (!authenticateUser(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ message: 'Tidak sah: Token tidak valid atau hilang' }));
    }

    // Parse URL for route matching
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    const params = url.searchParams;

    // GET /api/pencapaian - Get all pencapaian with filtering
    if (req.method === 'GET' && pathname === '/api/pencapaian') {
      try {
        const page = parseInt(params.get('page')) || 1;
        const limit = parseInt(params.get('limit')) || 10;
        const budgetYear = params.get('budgetYear');
        const subPerangkatDaerahId = params.get('subPerangkatDaerahId');
        const status = params.get('status');
        const search = params.get('search');
        const periodYear = params.get('periodYear');
        const periodMonth = params.get('periodMonth');

        const filter = {};
        if (budgetYear) filter.budgetYear = budgetYear;
        if (subPerangkatDaerahId) filter.subPerangkatDaerahId = subPerangkatDaerahId;
        if (status) filter.status = status;
        if (periodYear) filter.periodYear = parseInt(periodYear);
        if (periodMonth) filter.periodMonth = parseInt(periodMonth);
        if (search) {
          filter.$or = [
            { description: { $regex: search, $options: 'i' } },
            { 'kinerjaId.subKegiatanId.nama': { $regex: search, $options: 'i' } },
            { 'kinerjaId.subKegiatanId.kode': { $regex: search, $options: 'i' } }
          ];
        }

        const skip = (page - 1) * limit;
        const pencapaianList = await Pencapaian.find(filter)
          .populate({
            path: 'kinerjaId',
            populate: {
              path: 'subKegiatanId',
              model: 'SubKegiatan'
            }
          })
          .populate('subPerangkatDaerahId')
          .populate('anggaranId')
          .populate('createdBy', 'username')
          .populate('updatedBy', 'username')
          .populate('progressNotes.recordedBy', 'username')
          .sort({ periodYear: -1, periodMonth: -1, createdAt: -1 })
          .skip(skip)
          .limit(limit);

        const total = await Pencapaian.countDocuments(filter);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: pencapaianList,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }));
      } catch (error) {
        console.error('Error fetching pencapaian:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: 'Gagal mengambil data pencapaian'
        }));
      }

    // GET /api/pencapaian/:id - Get pencapaian by ID
    } else if (req.method === 'GET' && pathname.match(/^\/api\/pencapaian\/[a-fA-F0-9]{24}$/)) {
      try {
        const id = pathname.split('/')[3];

        if (!mongoose.Types.ObjectId.isValid(id)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'ID tidak valid'
          }));
        }

        const pencapaian = await Pencapaian.findById(id)
          .populate('kinerjaId')
          .populate('subPerangkatDaerahId')
          .populate('anggaranId')
          .populate('createdBy', 'username')
          .populate('updatedBy', 'username')
          .populate('progressNotes.recordedBy', 'username');

        if (!pencapaian) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'Pencapaian tidak ditemukan'
          }));
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: pencapaian
        }));
      } catch (error) {
        console.error('Error fetching pencapaian:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: 'Gagal mengambil data pencapaian'
        }));
      }

    // GET /api/pencapaian/summary/:budgetYear - Get achievement summary
    } else if (req.method === 'GET' && pathname.match(/^\/api\/pencapaian\/summary\/[^\/]+$/)) {
      try {
        const budgetYear = pathname.split('/')[4];
        const subPerangkatDaerahId = params.get('subPerangkatDaerahId');

        const summary = await Pencapaian.getAchievementSummary(budgetYear, subPerangkatDaerahId);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: summary,
          budgetYear
        }));
      } catch (error) {
        console.error('Error fetching pencapaian summary:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: 'Gagal mengambil ringkasan pencapaian'
        }));
      }

    // GET /api/pencapaian/kinerja?subPerangkatDaerahId=xxx - Get Kinerja for specific SubPerangkatDaerah
    } else if (req.method === 'GET' && pathname === '/api/pencapaian/kinerja') {
      try {
        const subPerangkatDaerahId = params.get('subPerangkatDaerahId');
        const budgetYear = params.get('budgetYear');

        if (!subPerangkatDaerahId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'SubPerangkatDaerah ID harus diisi'
          }));
        }

        if (!mongoose.Types.ObjectId.isValid(subPerangkatDaerahId)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'SubPerangkatDaerah ID tidak valid'
          }));
        }

        // Build filter for kinerja
        const kinerjaFilter = { subPerangkatDaerahId };
        if (budgetYear) kinerjaFilter.budgetYear = budgetYear;

        const kinerjaList = await Kinerja.find(kinerjaFilter)
          .populate('subKegiatanId')
          .populate('anggaranId')
          .sort({ targetDate: 1 });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: kinerjaList
        }));
      } catch (error) {
        console.error('Error fetching kinerja for pencapaian:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: 'Gagal mengambil data kinerja'
        }));
      }

    // POST /api/pencapaian - Create new pencapaian
    } else if (req.method === 'POST' && pathname === '/api/pencapaian') {
      try {
        const {
          kinerjaId,
          subPerangkatDaerahId,
          anggaranId,
          budgetYear,
          periodMonth,
          periodYear,
          achievementValue,
          achievementType,
          description
        } = req.body;

        console.log('Received Pencapaian creation request:', {
          kinerjaId,
          subPerangkatDaerahId,
          anggaranId,
          budgetYear,
          periodMonth,
          periodYear,
          achievementValue,
          achievementType,
          description
        });

        if (!kinerjaId || !subPerangkatDaerahId || !anggaranId || !budgetYear ||
            !periodMonth || !periodYear || achievementValue === undefined || !achievementType) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'Kinerja, unit kerja, anggaran, tahun, periode, nilai pencapaian, dan tipe pencapaian harus diisi'
          }));
        }

        // Validate period
        if (periodMonth < 1 || periodMonth > 12) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'Bulan periode harus antara 1-12'
          }));
        }

        // Get user ID from JWT token in request
        const userId = req.user?.userId;
        console.log('Creating pencapaian for user:', { userId, userObject: req.user });

        if (!userId) {
          console.error('No userId found in token:', req.user);
          res.writeHead(401, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'User ID tidak ditemukan dari token autentikasi'
          }));
        }

        const newPencapaian = new Pencapaian({
          kinerjaId,
          subPerangkatDaerahId,
          anggaranId,
          budgetYear,
          periodMonth,
          periodYear,
          achievementValue,
          achievementType,
          description,
          createdBy: userId,
          updatedBy: userId
        });

        const savedPencapaian = await newPencapaian.save();
        await savedPencapaian.populate('kinerjaId');
        await savedPencapaian.populate('subPerangkatDaerahId');
        await savedPencapaian.populate('anggaranId');

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Pencapaian berhasil dibuat',
          data: savedPencapaian
        }));
      } catch (error) {
        console.error('Error creating pencapaian:', error);

        let errorMessage = 'Gagal membuat pencapaian';
        if (error.code === 11000) {
          errorMessage = 'Pencapaian untuk periode ini sudah ada untuk kinerja yang sama';
        } else if (error.message) {
          errorMessage = error.message;
        }

        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: errorMessage
        }));
      }

    // PUT /api/pencapaian/:id - Update pencapaian
    } else if (req.method === 'PUT' && pathname.match(/^\/api\/pencapaian\/[a-fA-F0-9]{24}$/)) {
      try {
        const id = pathname.split('/')[3];
        const {
          achievementValue,
          periodMonth,
          periodYear,
          description,
          progressNote
        } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'ID tidak valid'
          }));
        }

        const pencapaian = await Pencapaian.findById(id);
        if (!pencapaian) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'Pencapaian tidak ditemukan'
          }));
        }

        // Get user ID from JWT token in request
        const userId = req.user?.userId;
        console.log('Updating pencapaian for user:', { userId, userObject: req.user });

        if (!userId) {
          console.error('No userId found in token:', req.user);
          res.writeHead(401, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'User ID tidak ditemukan dari token autentikasi'
          }));
        }

        // Track what fields are being updated
        let hasChanges = false;

        if (achievementValue !== undefined && pencapaian.achievementValue !== achievementValue) {
          pencapaian.achievementValue = achievementValue;
          hasChanges = true;
        }

        if (periodMonth !== undefined && pencapaian.periodMonth !== periodMonth) {
          pencapaian.periodMonth = periodMonth;
          hasChanges = true;
        }

        if (periodYear !== undefined && pencapaian.periodYear !== periodYear) {
          pencapaian.periodYear = periodYear;
          hasChanges = true;
        }

        if (description !== undefined && pencapaian.description !== description) {
          pencapaian.description = description;
          hasChanges = true;
        }

        // Handle progress note update
        if (progressNote && progressNote.trim()) {
          await pencapaian.addProgressNote(progressNote, userId);
          hasChanges = true;
        }

        if (hasChanges) {
          pencapaian.updatedBy = userId;
          await pencapaian.save();
        }

        await pencapaian.populate('kinerjaId');
        await pencapaian.populate('subPerangkatDaerahId');
        await pencapaian.populate('anggaranId');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Pencapaian berhasil diperbarui',
          data: pencapaian
        }));
      } catch (error) {
        console.error('Error updating pencapaian:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: 'Gagal memperbarui pencapaian'
        }));
      }

    // PUT /api/pencapaian/:id/achievement - Update achievement value specifically
    } else if (req.method === 'PUT' && pathname.match(/^\/api\/pencapaian\/[a-fA-F0-9]{24}\/achievement$/)) {
      try {
        const id = pathname.split('/')[3];
        const { achievementValue, progressNote } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'ID tidak valid'
          }));
        }

        if (achievementValue === undefined) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'Nilai pencapaian harus diisi'
          }));
        }

        const pencapaian = await Pencapaian.findById(id);
        if (!pencapaian) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'Pencapaian tidak ditemukan'
          }));
        }

        // Get user ID from JWT token in request
        const userId = req.user?.userId;
        if (!userId) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'User ID tidak ditemukan dari token autentikasi'
          }));
        }

        const updatedPencapaian = await pencapaian.updateAchievement(achievementValue, progressNote, userId);

        await updatedPencapaian.populate('kinerjaId');
        await updatedPencapaian.populate('subPerangkatDaerahId');
        await updatedPencapaian.populate('anggaranId');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Pencapaian berhasil diperbarui',
          data: updatedPencapaian
        }));
      } catch (error) {
        console.error('Error updating pencapaian achievement:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: 'Gagal memperbarui pencapaian'
        }));
      }

    // PUT /api/pencapaian/:id/submit - Submit achievement for approval
    } else if (req.method === 'PUT' && pathname.match(/^\/api\/pencapaian\/[a-fA-F0-9]{24}\/submit$/)) {
      try {
        const id = pathname.split('/')[3];

        if (!mongoose.Types.ObjectId.isValid(id)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'ID tidak valid'
          }));
        }

        const pencapaian = await Pencapaian.findById(id);
        if (!pencapaian) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'Pencapaian tidak ditemukan'
          }));
        }

        // Get user ID from JWT token in request
        const userId = req.user?.userId;
        if (!userId) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'User ID tidak ditemukan dari token autentikasi'
          }));
        }

        const updatedPencapaian = await pencapaian.submitAchievement(userId);

        await updatedPencapaian.populate('kinerjaId');
        await updatedPencapaian.populate('subPerangkatDaerahId');
        await updatedPencapaian.populate('anggaranId');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Pencapaian berhasil diajukan untuk persetujuan',
          data: updatedPencapaian
        }));
      } catch (error) {
        console.error('Error submitting pencapaian:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: 'Gagal mengajukan pencapaian'
        }));
      }

    // PUT /api/pencapaian/:id/approve - Approve achievement
    } else if (req.method === 'PUT' && pathname.match(/^\/api\/pencapaian\/[a-fA-F0-9]{24}\/approve$/)) {
      try {
        const id = pathname.split('/')[3];
        const { notes } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'ID tidak valid'
          }));
        }

        const pencapaian = await Pencapaian.findById(id);
        if (!pencapaian) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'Pencapaian tidak ditemukan'
          }));
        }

        // Get user ID from JWT token in request
        const userId = req.user?.userId;
        if (!userId) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'User ID tidak ditemukan dari token autentikasi'
          }));
        }

        const updatedPencapaian = await pencapaian.approveAchievement(userId, notes);

        await updatedPencapaian.populate('kinerjaId');
        await updatedPencapaian.populate('subPerangkatDaerahId');
        await updatedPencapaian.populate('anggaranId');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Pencapaian berhasil disetujui',
          data: updatedPencapaian
        }));
      } catch (error) {
        console.error('Error approving pencapaian:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: 'Gagal menyetujui pencapaian'
        }));
      }

    // PUT /api/pencapaian/:id/reject - Reject achievement
    } else if (req.method === 'PUT' && pathname.match(/^\/api\/pencapaian\/[a-fA-F0-9]{24}\/reject$/)) {
      try {
        const id = pathname.split('/')[3];
        const { reason } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'ID tidak valid'
          }));
        }

        if (!reason || !reason.trim()) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'Alasan penolakan harus diisi'
          }));
        }

        const pencapaian = await Pencapaian.findById(id);
        if (!pencapaian) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'Pencapaian tidak ditemukan'
          }));
        }

        // Get user ID from JWT token in request
        const userId = req.user?.userId;
        if (!userId) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'User ID tidak ditemukan dari token autentikasi'
          }));
        }

        const updatedPencapaian = await pencapaian.rejectAchievement(userId, reason);

        await updatedPencapaian.populate('kinerjaId');
        await updatedPencapaian.populate('subPerangkatDaerahId');
        await updatedPencapaian.populate('anggaranId');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Pencapaian berhasil ditolak',
          data: updatedPencapaian
        }));
      } catch (error) {
        console.error('Error rejecting pencapaian:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: 'Gagal menolak pencapaian'
        }));
      }

    // DELETE /api/pencapaian/:id - Delete pencapaian
    } else if (req.method === 'DELETE' && pathname.match(/^\/api\/pencapaian\/[a-fA-F0-9]{24}$/)) {
      try {
        const id = pathname.split('/')[3];

        if (!mongoose.Types.ObjectId.isValid(id)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'ID tidak valid'
          }));
        }

        const pencapaian = await Pencapaian.findByIdAndDelete(id);
        if (!pencapaian) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'Pencapaian tidak ditemukan'
          }));
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Pencapaian berhasil dihapus'
        }));
      } catch (error) {
        console.error('Error deleting pencapaian:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: 'Gagal menghapus pencapaian'
        }));
      }

    // POST /api/pencapaian/:id/files - Upload file to pencapaian
    } else if (req.method === 'POST' && pathname.match(/^\/api\/pencapaian\/[a-fA-F0-9]{24}\/files$/)) {
      try {
        const id = pathname.split('/')[3];

        if (!mongoose.Types.ObjectId.isValid(id)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'ID tidak valid'
          }));
        }

        const pencapaian = await Pencapaian.findById(id);
        if (!pencapaian) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'Pencapaian tidak ditemukan'
          }));
        }

        // Get user ID from JWT token in request
        const userId = req.user?.userId;
        if (!userId) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'User ID tidak ditemukan dari token autentikasi'
          }));
        }

        // Parse multipart form data manually since we don't have multer configured
        let body = '';
        let boundary = '';

        // Extract boundary from content-type header
        const contentType = req.headers['content-type'] || '';
        if (contentType.includes('multipart/form-data')) {
          boundary = contentType.split('boundary=')[1];
          if (boundary.startsWith('"') && boundary.endsWith('"')) {
            boundary = boundary.slice(1, -1);
          }
        }

        if (!boundary) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'Invalid multipart form data'
          }));
        }

        // Collect raw buffer data instead of string
        const chunks = [];
        req.on('data', (chunk) => {
          chunks.push(chunk);
        });

        req.on('end', async () => {
          try {
            // Combine all chunks into a single buffer
            const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
            const bodyBuffer = Buffer.concat(chunks, totalLength);

            console.log(`Received raw buffer data: ${bodyBuffer.length} bytes`);
            console.log(`Content-Type header: ${contentType}`);

            // Convert to string for parsing (but keep original buffer for file data)
            const body = bodyBuffer.toString('binary');
            console.log(`Body as string length: ${body.length}`);

            // Parse the multipart data
            const parts = body.split(`--${boundary}`);
            let fileData = null;
            let originalName = '';

            for (let i = 0; i < parts.length; i++) {
              const part = parts[i];
              console.log(`Processing part ${i}, length: ${part.length}`);

              if (part.includes('Content-Disposition: form-data') && part.includes('filename=')) {
                console.log('Found file part');

                // Extract filename
                const filenameMatch = part.match(/filename="([^"]+)"/);
                if (filenameMatch) {
                  originalName = filenameMatch[1];
                  console.log(`Extracted filename: ${originalName}`);
                }

                // Find where the file data starts in the original buffer
                const partStart = body.indexOf(part);
                const headerEndMarker = '\r\n\r\n';
                const headerEndIndex = partStart + part.indexOf(headerEndMarker) + headerEndMarker.length;

                // Find where this part ends
                const nextBoundaryIndex = body.indexOf(`--${boundary}`, headerEndIndex);
                const partEndIndex = nextBoundaryIndex !== -1 ? nextBoundaryIndex - 2 : bodyBuffer.length; // -2 for \r\n

                if (headerEndIndex < partEndIndex) {
                  fileData = bodyBuffer.subarray(headerEndIndex, partEndIndex);
                  console.log(`Extracted file data: ${fileData.length} bytes`);
                  console.log(`First 10 bytes: ${fileData.subarray(0, 10).toString('hex')}`);
                }
              }
            }

            if (!fileData || fileData.length === 0) {
              console.error('No file data extracted');
              res.writeHead(400, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({
                success: false,
                message: 'No file data received'
              }));
            }

            // Validate file type (check PDF signature)
            if (fileData.length < 4) {
              console.error(`File too small: ${fileData.length} bytes`);
              res.writeHead(400, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({
                success: false,
                message: 'File tidak valid'
              }));
            }

            // Check for PDF signature (%PDF)
            const pdfSignature = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF
            const fileHeader = fileData.subarray(0, 4);
            console.log(`PDF signature check - Expected: ${pdfSignature.toString('hex')}, Got: ${fileHeader.toString('hex')}`);

            if (!pdfSignature.equals(fileHeader)) {
              console.error('PDF signature validation failed');
              res.writeHead(400, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({
                success: false,
                message: 'Hanya file PDF yang diperbolehkan'
              }));
            }

            console.log('PDF signature validation passed');

            // Validate file size (1 MB limit)
            if (fileData.length > 1024 * 1024) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({
                success: false,
                message: 'Ukuran file tidak boleh melebihi 1 MB'
              }));
            }

            console.log(`Attempting to save file: ${originalName}, size: ${fileData.length} bytes`);

            // Use the model's addEvidenceFile method to save the file
            await pencapaian.addEvidenceFile(fileData, originalName, userId);

            console.log(`File saved successfully. Updated evidenceFiles count: ${pencapaian.evidenceFiles.length}`);

            // Populate the updated pencapaian
            await pencapaian.populate('kinerjaId');
            await pencapaian.populate('subPerangkatDaerahId');
            await pencapaian.populate('anggaranId');

            console.log(`File upload completed successfully for pencapaian ${pencapaian._id}`);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              message: 'File berhasil diunggah',
              data: pencapaian
            }));
          } catch (error) {
            console.error('Error processing uploaded file:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              message: error.message || 'Gagal mengunggah file'
            }));
          }
        });

        // Handle request errors
        req.on('error', (error) => {
          console.error('Request error:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            message: 'Error processing request'
          }));
        });

      } catch (error) {
        console.error('Error uploading file to pencapaian:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: 'Gagal mengunggah file'
        }));
      }

    // GET /api/pencapaian/:id/files/:filename - Download file from pencapaian
    } else if (req.method === 'GET' && pathname.match(/^\/api\/pencapaian\/[a-fA-F0-9]{24}\/files\/[^\/]+$/)) {
      try {
        const id = pathname.split('/')[3];
        const filename = pathname.split('/')[5];

        if (!mongoose.Types.ObjectId.isValid(id)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'ID tidak valid'
          }));
        }

        const pencapaian = await Pencapaian.findById(id);
        if (!pencapaian) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'Pencapaian tidak ditemukan'
          }));
        }

        // Find the requested file
        const file = pencapaian.evidenceFiles.find(f => f.filename === filename);
        if (!file) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'File tidak ditemukan'
          }));
        }

        // Set appropriate headers for file download
        res.writeHead(200, {
          'Content-Type': file.mimeType,
          'Content-Disposition': `attachment; filename="${file.originalName}"`,
          'Content-Length': file.fileSize
        });

        // Send the file data
        res.end(file.fileData);
      } catch (error) {
        console.error('Error downloading file from pencapaian:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: 'Gagal mengunduh file'
        }));
      }

    // DELETE /api/pencapaian/:id/files/:filename - Delete file from pencapaian
    } else if (req.method === 'DELETE' && pathname.match(/^\/api\/pencapaian\/[a-fA-F0-9]{24}\/files\/[^\/]+$/)) {
      try {
        const id = pathname.split('/')[3];
        const filename = pathname.split('/')[5];

        if (!mongoose.Types.ObjectId.isValid(id)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'ID tidak valid'
          }));
        }

        const pencapaian = await Pencapaian.findById(id);
        if (!pencapaian) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'Pencapaian tidak ditemukan'
          }));
        }

        // Get user ID from JWT token in request
        const userId = req.user?.userId;
        if (!userId) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'User ID tidak ditemukan dari token autentikasi'
          }));
        }

        // Remove the file
        await pencapaian.removeEvidenceFile(filename, userId);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'File berhasil dihapus'
        }));
      } catch (error) {
        console.error('Error deleting file from pencapaian:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: error.message || 'Gagal menghapus file'
        }));
      }

    // 404 for unmatched routes
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Endpoint tidak ditemukan' }));
    }

  } catch (error) {
    console.error('Pencapaian router error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Kesalahan server internal' }));
  }
};

export default pencapaianRouter;