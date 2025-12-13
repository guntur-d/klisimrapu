import mongoose from 'mongoose';
import Realisasi from '../models/Realisasi.js';
// Import AkunLRA model to ensure it's registered with Mongoose (Kode Rekening)
import AkunLRA from '../models/AkunLRA.js';
// Import SubKegiatan model to ensure it's registered with Mongoose
import { SubKegiatan } from '../models/Urusan.js';

const realisasiRouter = async (req, res) => {
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
      return res.end(JSON.stringify({ message: 'Unauthorized: Invalid or missing token' }));
    }

    // Parse URL for route matching
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    const params = url.searchParams;

    // GET /api/realisasi - Get all realisasi
    if (req.method === 'GET' && pathname === '/api/realisasi') {
      try {
        const page = parseInt(params.get('page')) || 1;
        const limit = parseInt(params.get('limit')) || 10;
        const subKegiatanId = params.get('subKegiatanId');
        const month = params.get('month');
        const year = params.get('year');
        const kodeRekeningId = params.get('kodeRekeningId');

        const filter = {};
        if (subKegiatanId) {
          // Convert string ID to ObjectId for MongoDB query
          filter.subKegiatanId = subKegiatanId;
        }
        if (month) filter.month = parseInt(month);
        if (year) filter.year = parseInt(year);
        if (kodeRekeningId) {
          // Convert string ID to ObjectId for MongoDB query
          filter.kodeRekeningId = kodeRekeningId;
        }

        const skip = (page - 1) * limit;

        // Only populate kodeRekeningId when specifically requested or when showing details
        const shouldPopulateKodeRekening = kodeRekeningId || (page === 1 && limit <= 20);
        console.log('Should populate kodeRekeningId:', shouldPopulateKodeRekening, {kodeRekeningId, page, limit})

        let query = Realisasi.find(filter)
          .populate('subKegiatanId')
          .populate('createdBy', 'username')
          .populate('updatedBy', 'username')
          .sort({ year: -1, month: -1, updatedAt: -1 })
          .skip(skip)
          .limit(limit);

        // Only populate kodeRekeningId if needed to avoid loading all kode rekening data
        if (shouldPopulateKodeRekening) {
          console.log('Populating kodeRekeningId...')
          query = query.populate('kodeRekeningId');
        }

        console.log('Executing query...')
        const realisasi = await query;
        console.log('Query executed successfully, found:', realisasi.length)

        const total = await Realisasi.countDocuments(filter);
        console.log('Count query executed successfully, total:', total)

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: realisasi,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }));
      } catch (error) {
        console.error('Error fetching realisasi list:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: 'Gagal mengambil data realisasi'
        }));
      }

    // GET /api/realisasi/:id - Get realisasi by ID
    } else if (req.method === 'GET' && pathname.match(/^\/api\/realisasi\/[a-fA-F0-9]{24}$/)) {
      try {
        const id = pathname.split('/')[3];

        if (!mongoose.Types.ObjectId.isValid(id)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'ID tidak valid'
          }));
        }

        // Only populate kodeRekeningId when needed for detailed view
        let query = Realisasi.findById(id)
          .populate('subKegiatanId')
          .populate('createdBy', 'username')
          .populate('updatedBy', 'username');

        // Add kodeRekeningId population only if needed for display
        if (req.url.includes('?populateKode=true')) {
          query = query.populate('kodeRekeningId');
        }

        const realisasi = await query;

        if (!realisasi) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'Realisasi tidak ditemukan'
          }));
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: realisasi
        }));
      } catch (error) {
        console.error('Error fetching realisasi:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: 'Gagal mengambil data realisasi'
        }));
      }

    // POST /api/realisasi - Create new realisasi
    } else if (req.method === 'POST' && pathname === '/api/realisasi') {
      try {
        const {
          kodeRekeningId,
          budgetAmount,
          realizationAmount,
          description,
          subKegiatanId,
          month,
          year
        } = req.body;

        console.log('Received Realisasi creation request:', {
          kodeRekeningId,
          budgetAmount,
          realizationAmount,
          subKegiatanId,
          month,
          year
        });

        if (!kodeRekeningId || !budgetAmount || !realizationAmount || !subKegiatanId || !month || !year) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'Kode rekening, jumlah anggaran, jumlah realisasi, subkegiatan, bulan, dan tahun harus diisi'
          }));
        }

        // Get user ID from JWT token in request
        const userId = req.user?.userId;
        console.log('Creating realisasi for user:', { userId, userObject: req.user });

        if (!userId) {
          console.error('No userId found in token:', req.user);
          res.writeHead(401, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'User ID tidak ditemukan dari token autentikasi'
          }));
        }

        const newRealisasi = new Realisasi({
          kodeRekeningId,
          budgetAmount,
          realizationAmount,
          description,
          subKegiatanId,
          month,
          year,
          createdBy: userId,
          updatedBy: userId
        });

        const savedRealisasi = await newRealisasi.save();
        await savedRealisasi.populate('kodeRekeningId');
        await savedRealisasi.populate('subKegiatanId');

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Realisasi berhasil dibuat',
          data: savedRealisasi
        }));
      } catch (error) {
        console.error('Error creating realisasi:', error);

        let errorMessage = 'Gagal membuat realisasi';
        if (error.code === 11000) {
          errorMessage = 'Realisasi untuk kode rekening dan periode ini sudah ada';
        } else if (error.message.includes('melebihi anggaran')) {
          errorMessage = error.message;
        }

        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: errorMessage
        }));
      }

    // PUT /api/realisasi/:id - Update realisasi
    } else if (req.method === 'PUT' && pathname.match(/^\/api\/realisasi\/[a-fA-F0-9]{24}$/)) {
      try {
        const id = pathname.split('/')[3];
        const {
          realizationAmount,
          description,
          month,
          year
        } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'ID tidak valid'
          }));
        }

        const realisasi = await Realisasi.findById(id);
        if (!realisasi) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'Realisasi tidak ditemukan'
          }));
        }

        // Get user ID from JWT token in request
        const userId = req.user?.userId;
        console.log('Updating realisasi for user:', { userId, userObject: req.user });

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

        if (realizationAmount !== undefined && realisasi.realizationAmount !== realizationAmount) {
          realisasi.realizationAmount = realizationAmount;
          hasChanges = true;
        }

        if (description !== undefined && realisasi.description !== description) {
          realisasi.description = description;
          hasChanges = true;
        }

        if (month !== undefined && realisasi.month !== month) {
          realisasi.month = month;
          hasChanges = true;
        }

        if (year !== undefined && realisasi.year !== year) {
          realisasi.year = year;
          hasChanges = true;
        }

        // Always update the updatedBy field
        realisasi.updatedBy = userId;
        hasChanges = true;

        let updatedRealisasi;
        if (hasChanges) {
          updatedRealisasi = await realisasi.save();
          console.log('Realisasi saved successfully:', {
            id: updatedRealisasi._id,
            realizationAmount: updatedRealisasi.realizationAmount,
            updatedAt: updatedRealisasi.updatedAt
          });
        } else {
          console.log('No changes detected, returning current data');
          updatedRealisasi = realisasi;
        }

        await updatedRealisasi.populate('kodeRekeningId');
        await updatedRealisasi.populate('subKegiatanId');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Realisasi berhasil diperbarui',
          data: updatedRealisasi
        }));
      } catch (error) {
        console.error('Error updating realisasi:', error);

        let errorMessage = 'Gagal memperbarui realisasi';
        if (error.code === 11000) {
          errorMessage = 'Realisasi untuk kode rekening dan periode ini sudah ada';
        } else if (error.message.includes('melebihi anggaran')) {
          errorMessage = error.message;
        }

        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: errorMessage
        }));
      }

    // DELETE /api/realisasi/:id - Delete realisasi
    } else if (req.method === 'DELETE' && pathname.match(/^\/api\/realisasi\/[a-fA-F0-9]{24}$/)) {
      try {
        const id = pathname.split('/')[3];

        if (!mongoose.Types.ObjectId.isValid(id)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'ID tidak valid'
          }));
        }

        const realisasi = await Realisasi.findByIdAndDelete(id);
        if (!realisasi) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'Realisasi tidak ditemukan'
          }));
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Realisasi berhasil dihapus'
        }));
      } catch (error) {
        console.error('Error deleting realisasi:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: 'Gagal menghapus realisasi'
        }));
      }

    // 404 for unmatched routes
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Endpoint not found' }));
    }

  } catch (error) {
    console.error('Realisasi router error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Internal server error' }));
  }
};

export default realisasiRouter;