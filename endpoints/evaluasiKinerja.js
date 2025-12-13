import mongoose from 'mongoose';
import EvaluasiKinerja from '../models/EvaluasiKinerja.js';
// Import required models to ensure they're registered with Mongoose
import Pencapaian from '../models/Pencapaian.js';
import Kinerja from '../models/Kinerja.js';
import SubPerangkatDaerah from '../models/SubPerangkatDaerah.js';

const evaluasiKinerjaRouter = async (req, res) => {
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

    // GET /api/evaluasi-kinerja - Get all evaluasi kinerja with filtering
    if (req.method === 'GET' && pathname === '/api/evaluasi-kinerja') {
      try {
        const page = parseInt(params.get('page')) || 1;
        const limit = parseInt(params.get('limit')) || 10;
        const budgetYear = params.get('budgetYear');
        const subPerangkatDaerahId = params.get('subPerangkatDaerahId');
        const evaluationStatus = params.get('evaluationStatus');
        const search = params.get('search');
        const periodYear = params.get('periodYear');
        const periodMonth = params.get('periodMonth');
        const evaluatedBy = params.get('evaluatedBy');

        const filter = {};
        if (budgetYear) filter.budgetYear = budgetYear;
        if (subPerangkatDaerahId) filter.subPerangkatDaerahId = subPerangkatDaerahId;
        if (evaluationStatus) filter.evaluationStatus = evaluationStatus;
        if (periodYear) filter.periodYear = parseInt(periodYear);
        if (periodMonth) filter.periodMonth = parseInt(periodMonth);
        if (evaluatedBy) filter.evaluatedBy = evaluatedBy;
        if (search) {
          filter.$or = [
            { evaluationNotes: { $regex: search, $options: 'i' } },
            { 'pencapaianId.kinerjaId.subKegiatanId.nama': { $regex: search, $options: 'i' } },
            { 'pencapaianId.kinerjaId.subKegiatanId.kode': { $regex: search, $options: 'i' } }
          ];
        }

        const skip = (page - 1) * limit;
        const evaluasiList = await EvaluasiKinerja.find(filter)
          .populate('pencapaianId')
          .populate('kinerjaId')
          .populate('subPerangkatDaerahId')
          .populate('evaluatedBy', 'username')
          .populate('approvedBy', 'username')
          .populate('reviewNotes.reviewedBy', 'username')
          .sort({ periodYear: -1, periodMonth: -1, createdAt: -1 })
          .skip(skip)
          .limit(limit);

        const total = await EvaluasiKinerja.countDocuments(filter);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: evaluasiList,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }));
      } catch (error) {
        console.error('Error fetching evaluasi kinerja:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: 'Gagal mengambil data evaluasi kinerja'
        }));
      }

    // GET /api/evaluasi-kinerja/:id - Get evaluasi kinerja by ID
    } else if (req.method === 'GET' && pathname.match(/^\/api\/evaluasi-kinerja\/[a-fA-F0-9]{24}$/)) {
      try {
        const id = pathname.split('/')[3];

        if (!mongoose.Types.ObjectId.isValid(id)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'ID tidak valid'
          }));
        }

        const evaluasi = await EvaluasiKinerja.findById(id)
          .populate('pencapaianId')
          .populate('kinerjaId')
          .populate('subPerangkatDaerahId')
          .populate('evaluatedBy', 'username')
          .populate('approvedBy', 'username')
          .populate('reviewNotes.reviewedBy', 'username');

        if (!evaluasi) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'Evaluasi kinerja tidak ditemukan'
          }));
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: evaluasi
        }));
      } catch (error) {
        console.error('Error fetching evaluasi kinerja:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: 'Gagal mengambil data evaluasi kinerja'
        }));
      }

    // GET /api/evaluasi-kinerja/pending - Get pending evaluations
    } else if (req.method === 'GET' && pathname === '/api/evaluasi-kinerja/pending') {
      try {
        const page = parseInt(params.get('page')) || 1;
        const limit = parseInt(params.get('limit')) || 10;
        const skip = (page - 1) * limit;

        const pendingEvaluations = await EvaluasiKinerja.find({ evaluationStatus: 'pending' })
          .populate('pencapaianId')
          .populate('kinerjaId')
          .populate('subPerangkatDaerahId')
          .populate('submittedBy', 'username')
          .sort({ submittedAt: 1 })
          .skip(skip)
          .limit(limit);

        const total = await EvaluasiKinerja.countDocuments({ evaluationStatus: 'pending' });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: pendingEvaluations,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }));
      } catch (error) {
        console.error('Error fetching pending evaluations:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: 'Gagal mengambil data evaluasi tertunda'
        }));
      }

    // GET /api/evaluasi-kinerja/summary/:budgetYear - Get evaluation summary
    } else if (req.method === 'GET' && pathname.match(/^\/api\/evaluasi-kinerja\/summary\/[^\/]+$/)) {
      try {
        const budgetYear = pathname.split('/')[4];
        const subPerangkatDaerahId = params.get('subPerangkatDaerahId');

        const summary = await EvaluasiKinerja.getEvaluationSummary(budgetYear, subPerangkatDaerahId);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: summary,
          budgetYear
        }));
      } catch (error) {
        console.error('Error fetching evaluation summary:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: 'Gagal mengambil ringkasan evaluasi'
        }));
      }

    // GET /api/evaluasi-kinerja/pencapaian/:pencapaianId - Get evaluation for specific pencapaian
    } else if (req.method === 'GET' && pathname.match(/^\/api\/evaluasi-kinerja\/pencapaian\/[a-fA-F0-9]{24}$/)) {
      try {
        const pencapaianId = pathname.split('/')[4];

        if (!mongoose.Types.ObjectId.isValid(pencapaianId)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'Pencapaian ID tidak valid'
          }));
        }

        const evaluasi = await EvaluasiKinerja.findOne({ pencapaianId })
          .populate('pencapaianId')
          .populate('kinerjaId')
          .populate('subPerangkatDaerahId')
          .populate('evaluatedBy', 'username')
          .populate('approvedBy', 'username');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: evaluasi || null
        }));
      } catch (error) {
        console.error('Error fetching evaluation for pencapaian:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: 'Gagal mengambil data evaluasi'
        }));
      }

    // POST /api/evaluasi-kinerja - Create new evaluasi kinerja
    } else if (req.method === 'POST' && pathname === '/api/evaluasi-kinerja') {
      try {
        const {
          pencapaianId,
          evaluationNotes,
          achievementScore,
          documentationScore,
          strengths,
          improvements,
          recommendations
        } = req.body;

        console.log('Received Evaluasi Kinerja creation request:', {
          pencapaianId,
          evaluationNotes,
          achievementScore,
          documentationScore
        });

        if (!pencapaianId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'Pencapaian ID harus diisi'
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

        // Get pencapaian data to populate other fields
        const pencapaian = await Pencapaian.findById(pencapaianId)
          .populate('kinerjaId');

        if (!pencapaian) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'Pencapaian tidak ditemukan'
          }));
        }

        const newEvaluasi = new EvaluasiKinerja({
          pencapaianId,
          kinerjaId: pencapaian.kinerjaId._id,
          subPerangkatDaerahId: pencapaian.subPerangkatDaerahId,
          periodMonth: pencapaian.periodMonth,
          periodYear: pencapaian.periodYear,
          budgetYear: pencapaian.budgetYear,
          evaluationNotes,
          achievementScore: achievementScore || 0,
          documentationScore: documentationScore || 0,
          strengths: strengths || [],
          improvements: improvements || [],
          recommendations: recommendations || [],
          createdBy: userId,
          updatedBy: userId
        });

        const savedEvaluasi = await newEvaluasi.save();
        await savedEvaluasi.populate('pencapaianId');
        await savedEvaluasi.populate('kinerjaId');
        await savedEvaluasi.populate('subPerangkatDaerahId');

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Evaluasi kinerja berhasil dibuat',
          data: savedEvaluasi
        }));
      } catch (error) {
        console.error('Error creating evaluasi kinerja:', error);

        let errorMessage = 'Gagal membuat evaluasi kinerja';
        if (error.code === 11000) {
          errorMessage = 'Evaluasi untuk pencapaian ini sudah ada';
        } else if (error.message) {
          errorMessage = error.message;
        }

        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: errorMessage
        }));
      }

    // PUT /api/evaluasi-kinerja/:id - Update evaluasi kinerja
    } else if (req.method === 'PUT' && pathname.match(/^\/api\/evaluasi-kinerja\/[a-fA-F0-9]{24}$/)) {
      try {
        const id = pathname.split('/')[3];
        const {
          evaluationNotes,
          achievementScore,
          documentationScore,
          strengths,
          improvements,
          recommendations,
          criteriaChecklist
        } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'ID tidak valid'
          }));
        }

        const evaluasi = await EvaluasiKinerja.findById(id);
        if (!evaluasi) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'Evaluasi kinerja tidak ditemukan'
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

        // Track what fields are being updated
        let hasChanges = false;

        if (evaluationNotes !== undefined && evaluasi.evaluationNotes !== evaluationNotes) {
          evaluasi.evaluationNotes = evaluationNotes;
          hasChanges = true;
        }

        if (achievementScore !== undefined && evaluasi.achievementScore !== achievementScore) {
          evaluasi.achievementScore = achievementScore;
          hasChanges = true;
        }

        if (documentationScore !== undefined && evaluasi.documentationScore !== documentationScore) {
          evaluasi.documentationScore = documentationScore;
          hasChanges = true;
        }

        if (strengths !== undefined && JSON.stringify(evaluasi.strengths) !== JSON.stringify(strengths)) {
          evaluasi.strengths = strengths;
          hasChanges = true;
        }

        if (improvements !== undefined && JSON.stringify(evaluasi.improvements) !== JSON.stringify(improvements)) {
          evaluasi.improvements = improvements;
          hasChanges = true;
        }

        if (recommendations !== undefined && JSON.stringify(evaluasi.recommendations) !== JSON.stringify(recommendations)) {
          evaluasi.recommendations = recommendations;
          hasChanges = true;
        }

        if (criteriaChecklist !== undefined && JSON.stringify(evaluasi.criteriaChecklist) !== JSON.stringify(criteriaChecklist)) {
          evaluasi.criteriaChecklist = criteriaChecklist;
          hasChanges = true;
        }

        if (hasChanges) {
          evaluasi.updatedBy = userId;
          await evaluasi.save();
        }

        await evaluasi.populate('pencapaianId');
        await evaluasi.populate('kinerjaId');
        await evaluasi.populate('subPerangkatDaerahId');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Evaluasi kinerja berhasil diperbarui',
          data: evaluasi
        }));
      } catch (error) {
        console.error('Error updating evaluasi kinerja:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: 'Gagal memperbarui evaluasi kinerja'
        }));
      }

    // PUT /api/evaluasi-kinerja/:id/approve - Approve evaluation
    } else if (req.method === 'PUT' && pathname.match(/^\/api\/evaluasi-kinerja\/[a-fA-F0-9]{24}\/approve$/)) {
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

        const evaluasi = await EvaluasiKinerja.findById(id);
        if (!evaluasi) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'Evaluasi kinerja tidak ditemukan'
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

        const updatedEvaluasi = await evaluasi.approveEvaluation(userId, notes);

        await updatedEvaluasi.populate('pencapaianId');
        await updatedEvaluasi.populate('kinerjaId');
        await updatedEvaluasi.populate('subPerangkatDaerahId');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Evaluasi kinerja berhasil disetujui',
          data: updatedEvaluasi
        }));
      } catch (error) {
        console.error('Error approving evaluasi kinerja:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: 'Gagal menyetujui evaluasi kinerja'
        }));
      }

    // PUT /api/evaluasi-kinerja/:id/reject - Reject evaluation
    } else if (req.method === 'PUT' && pathname.match(/^\/api\/evaluasi-kinerja\/[a-fA-F0-9]{24}\/reject$/)) {
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

        const evaluasi = await EvaluasiKinerja.findById(id);
        if (!evaluasi) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'Evaluasi kinerja tidak ditemukan'
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

        const updatedEvaluasi = await evaluasi.rejectEvaluation(userId, reason);

        await updatedEvaluasi.populate('pencapaianId');
        await updatedEvaluasi.populate('kinerjaId');
        await updatedEvaluasi.populate('subPerangkatDaerahId');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Evaluasi kinerja berhasil ditolak',
          data: updatedEvaluasi
        }));
      } catch (error) {
        console.error('Error rejecting evaluasi kinerja:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: 'Gagal menolak evaluasi kinerja'
        }));
      }

    // PUT /api/evaluasi-kinerja/:id/revision - Request revision
    } else if (req.method === 'PUT' && pathname.match(/^\/api\/evaluasi-kinerja\/[a-fA-F0-9]{24}\/revision$/)) {
      try {
        const id = pathname.split('/')[3];
        const { requirements, notes } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'ID tidak valid'
          }));
        }

        const evaluasi = await EvaluasiKinerja.findById(id);
        if (!evaluasi) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'Evaluasi kinerja tidak ditemukan'
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

        const updatedEvaluasi = await evaluasi.requestRevision(userId, requirements, notes);

        await updatedEvaluasi.populate('pencapaianId');
        await updatedEvaluasi.populate('kinerjaId');
        await updatedEvaluasi.populate('subPerangkatDaerahId');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Permintaan revisi berhasil dikirim',
          data: updatedEvaluasi
        }));
      } catch (error) {
        console.error('Error requesting revision:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: 'Gagal meminta revisi'
        }));
      }

    // DELETE /api/evaluasi-kinerja/:id - Delete evaluasi kinerja
    } else if (req.method === 'DELETE' && pathname.match(/^\/api\/evaluasi-kinerja\/[a-fA-F0-9]{24}$/)) {
      try {
        const id = pathname.split('/')[3];

        if (!mongoose.Types.ObjectId.isValid(id)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'ID tidak valid'
          }));
        }

        const evaluasi = await EvaluasiKinerja.findByIdAndDelete(id);
        if (!evaluasi) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'Evaluasi kinerja tidak ditemukan'
          }));
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Evaluasi kinerja berhasil dihapus'
        }));
      } catch (error) {
        console.error('Error deleting evaluasi kinerja:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: 'Gagal menghapus evaluasi kinerja'
        }));
      }

    // 404 for unmatched routes
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Endpoint tidak ditemukan' }));
    }

  } catch (error) {
    console.error('Evaluasi Kinerja router error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Kesalahan server internal' }));
  }
};

export default evaluasiKinerjaRouter;