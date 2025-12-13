import mongoose from 'mongoose';
import EvaluasiRealisasi from '../models/EvaluasiRealisasi.js';
import Realisasi from '../models/Realisasi.js';
// Import AkunLRA model to ensure it's registered with Mongoose (Kode Rekening)
import AkunLRA from '../models/AkunLRA.js';
// Import SubKegiatan model to ensure it's registered with Mongoose
import { SubKegiatan } from '../models/Urusan.js';
// Import SubPerangkatDaerah model to ensure it's registered with Mongoose
import SubPerangkatDaerah from '../models/SubPerangkatDaerah.js';

const evaluasiRealisasiRouter = async (req, res) => {
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

    // GET /api/evaluasi-realisasi - Get all evaluations
    if (req.method === 'GET' && pathname === '/api/evaluasi-realisasi') {
      try {
        const page = parseInt(params.get('page')) || 1;
        const limit = parseInt(params.get('limit')) || 10;
        const subKegiatanId = params.get('subKegiatanId');
        const subPerangkatDaerahId = params.get('subPerangkatDaerahId');
        const month = params.get('month');
        const year = params.get('year');
        const evaluationStatus = params.get('evaluationStatus');
        const absorptionRateMin = params.get('absorptionRateMin');

        const filter = {};
        if (subKegiatanId) filter.subKegiatanId = subKegiatanId;
        if (subPerangkatDaerahId) filter.subPerangkatDaerahId = subPerangkatDaerahId;
        if (month) filter.month = parseInt(month);
        if (year) filter.year = parseInt(year);
        if (evaluationStatus) filter.evaluationStatus = evaluationStatus;
        if (absorptionRateMin) filter.absorptionRate = { $lt: parseFloat(absorptionRateMin) };

        const skip = (page - 1) * limit;

        const evaluations = await EvaluasiRealisasi.find(filter)
          .populate('kodeRekeningId', 'fullCode name')
          .populate('subKegiatanId', 'kode nama')
          .populate('subPerangkatDaerahId', 'nama pimpinan')
          .populate('evaluatedBy', 'username nama')
          .populate('approvedBy', 'username nama')
          .sort({ evaluationDate: -1 })
          .skip(skip)
          .limit(limit);

        const total = await EvaluasiRealisasi.countDocuments(filter);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: evaluations,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }));
      } catch (error) {
        console.error('Error fetching evaluations:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: 'Gagal mengambil data evaluasi'
        }));
      }

    // GET /api/evaluasi-realisasi/:id - Get evaluation by ID
    } else if (req.method === 'GET' && pathname.match(/^\/api\/evaluasi-realisasi\/[a-fA-F0-9]{24}$/)) {
      try {
        const id = pathname.split('/')[3];

        if (!mongoose.Types.ObjectId.isValid(id)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'ID tidak valid'
          }));
        }

        const evaluation = await EvaluasiRealisasi.findById(id)
          .populate('kodeRekeningId', 'fullCode name')
          .populate('subKegiatanId', 'kode nama')
          .populate('subPerangkatDaerahId', 'nama pimpinan')
          .populate('realisasiId')
          .populate('evaluatedBy', 'username nama')
          .populate('approvedBy', 'username nama');

        if (!evaluation) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'Evaluasi tidak ditemukan'
          }));
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: evaluation
        }));
      } catch (error) {
        console.error('Error fetching evaluation:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: 'Gagal mengambil data evaluasi'
        }));
      }

    // GET /api/evaluasi-realisasi/subkegiatan/:subKegiatanId - Get evaluations by subkegiatan
    } else if (req.method === 'GET' && pathname.match(/^\/api\/evaluasi-realisasi\/subkegiatan\/[a-fA-F0-9]{24}$/)) {
      try {
        const subKegiatanId = pathname.split('/')[4];
        const month = params.get('month');
        const year = params.get('year');

        if (!month || !year) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'Month dan year harus diisi'
          }));
        }

        const evaluations = await EvaluasiRealisasi.findBySubKegiatan(
          subKegiatanId,
          parseInt(month),
          parseInt(year)
        );

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: evaluations
        }));
      } catch (error) {
        console.error('Error fetching evaluations by subkegiatan:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: 'Gagal mengambil data evaluasi'
        }));
      }

    // POST /api/evaluasi-realisasi - Create new evaluation
    } else if (req.method === 'POST' && pathname === '/api/evaluasi-realisasi') {
      try {
        const {
          realisasiId,
          kodeRekeningId,
          subKegiatanId,
          subPerangkatDaerahId,
          month,
          year,
          budgetAmount,
          realizationAmount,
          evaluationStatus,
          constraints = [],
          problems = [],
          solutions = [],
          recommendations = [],
          speedOfExecution,
          fundAbsorptionEfficiency,
          procurementCapability,
          generalNotes
        } = req.body;

        if (!realisasiId || !kodeRekeningId || !subKegiatanId || !subPerangkatDaerahId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'Realisasi ID, Kode Rekening ID, SubKegiatan ID, dan Unit Kerja ID harus diisi'
          }));
        }

        if (!evaluationStatus || !speedOfExecution || !fundAbsorptionEfficiency || !procurementCapability) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'Status evaluasi, kecepatan eksekusi, efisiensi absorpsi dana, dan kemampuan pengadaan harus diisi'
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

        // Calculate absorption rate
        const absorptionRate = budgetAmount > 0 ? (realizationAmount / budgetAmount) * 100 : 0;

        const evaluationData = {
          realisasiId,
          kodeRekeningId,
          subKegiatanId,
          subPerangkatDaerahId,
          month: parseInt(month),
          year: parseInt(year),
          budgetAmount: parseFloat(budgetAmount),
          realizationAmount: parseFloat(realizationAmount),
          absorptionRate: Math.min(100, absorptionRate),
          evaluationStatus,
          constraints,
          problems,
          solutions,
          recommendations,
          speedOfExecution,
          fundAbsorptionEfficiency,
          procurementCapability,
          generalNotes,
          evaluatedBy: userId
        };

        const evaluation = new EvaluasiRealisasi(evaluationData);
        const savedEvaluation = await evaluation.save();

        // Populate the saved evaluation for response
        const populatedEvaluation = await EvaluasiRealisasi.findById(savedEvaluation._id)
          .populate('kodeRekeningId', 'fullCode name')
          .populate('subKegiatanId', 'kode nama')
          .populate('subPerangkatDaerahId', 'nama pimpinan')
          .populate('evaluatedBy', 'username nama');

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Evaluasi berhasil dibuat',
          data: populatedEvaluation
        }));
      } catch (error) {
        console.error('Error creating evaluation:', error);

        let errorMessage = 'Gagal membuat evaluasi';
        if (error.code === 11000) {
          errorMessage = 'Evaluasi untuk realisasi ini sudah ada';
        }

        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: errorMessage
        }));
      }

    // PUT /api/evaluasi-realisasi/:id - Update evaluation
    } else if (req.method === 'PUT' && pathname.match(/^\/api\/evaluasi-realisasi\/[a-fA-F0-9]{24}$/)) {
      try {
        const id = pathname.split('/')[3];
        const updateData = { ...req.body };

        if (!mongoose.Types.ObjectId.isValid(id)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'ID tidak valid'
          }));
        }

        // Remove fields that shouldn't be updated directly
        delete updateData._id;
        delete updateData.realisasiId;
        delete updateData.kodeRekeningId;
        delete updateData.subKegiatanId;
        delete updateData.subPerangkatDaerahId;
        delete updateData.month;
        delete updateData.year;
        delete updateData.budgetAmount;
        delete updateData.realizationAmount;
        delete updateData.evaluatedBy;
        delete updateData.evaluationDate;

        // Add updatedBy field
        updateData.updatedBy = req.user?.userId;

        const evaluation = await EvaluasiRealisasi.findByIdAndUpdate(
          id,
          updateData,
          { new: true, runValidators: true }
        )
          .populate('kodeRekeningId', 'fullCode name')
          .populate('subKegiatanId', 'kode nama')
          .populate('subPerangkatDaerahId', 'nama pimpinan')
          .populate('evaluatedBy', 'username nama')
          .populate('approvedBy', 'username nama');

        if (!evaluation) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'Evaluasi tidak ditemukan'
          }));
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Evaluasi berhasil diperbarui',
          data: evaluation
        }));
      } catch (error) {
        console.error('Error updating evaluation:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: 'Gagal memperbarui evaluasi'
        }));
      }

    // DELETE /api/evaluasi-realisasi/:id - Delete evaluation
    } else if (req.method === 'DELETE' && pathname.match(/^\/api\/evaluasi-realisasi\/[a-fA-F0-9]{24}$/)) {
      try {
        const id = pathname.split('/')[3];

        if (!mongoose.Types.ObjectId.isValid(id)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'ID tidak valid'
          }));
        }

        const evaluation = await EvaluasiRealisasi.findByIdAndDelete(id);
        if (!evaluation) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            message: 'Evaluasi tidak ditemukan'
          }));
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Evaluasi berhasil dihapus'
        }));
      } catch (error) {
        console.error('Error deleting evaluation:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          message: 'Gagal menghapus evaluasi'
        }));
      }

    // 404 for unmatched routes
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Endpoint not found' }));
    }

  } catch (error) {
    console.error('EvaluasiRealisasi router error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Internal server error' }));
  }
};

export default evaluasiRealisasiRouter;