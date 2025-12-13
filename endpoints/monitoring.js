import mongoose from 'mongoose';
import Monitoring from '../models/Monitoring.js';
import Kontrak from '../models/Kontrak.js';

const monitoringRouter = async (request, reply) => {
  try {
    if (request.url === '/api/monitoring' && request.method === 'GET') {
      // Get all monitoring with optional filters
      const subPerangkatDaerahId = request.query.subPerangkatDaerahId;
      const kontrakId = request.query.kontrakId;
      const budgetYear = request.query.budgetYear;
      const status = request.query.status;

      let query = {};

      if (subPerangkatDaerahId) query.subPerangkatDaerahId = subPerangkatDaerahId;
      if (kontrakId) query.kontrakId = kontrakId;
      if (budgetYear) query.budgetYear = budgetYear;
      if (status) query.status = status;

      const monitoring = await Monitoring.find(query)
        .populate('kontrakId')
        .populate('subPerangkatDaerahId')
        .sort({ 'tanggalUpdate': -1 });

      reply.send({
        success: true,
        data: monitoring,
        count: monitoring.length
      });

    } else if (request.url === '/api/monitoring' && request.method === 'POST') {
      // Create new monitoring
      console.log('Received POST request to /api/monitoring');
      console.log('Request body:', request.body);

      const {
        kontrakId,
        subPerangkatDaerahId,
        budgetYear,
        realisasiProgress,
        realisasiDana,
        realisasiDanaRp,
        progressFisik,
        progressKeuangan,
        status,
        tanggalUpdate,
        keterangan,
        kendala,
        solusi
      } = request.body;

      // Validation helper function
      const isFieldValid = (field) => {
        return field !== undefined && field !== null;
      };

      // Required field validation
      if (!kontrakId || !subPerangkatDaerahId || !isFieldValid(budgetYear)) {
        return reply.code(400).send({
          success: false,
          message: 'Kontrak, unit kerja, dan tahun anggaran harus diisi',
          receivedData: request.body
        });
      }

      // Validate ObjectIds
      if (!mongoose.Types.ObjectId.isValid(kontrakId) || !mongoose.Types.ObjectId.isValid(subPerangkatDaerahId)) {
        return reply.code(400).send({
          success: false,
          message: 'ID Kontrak atau Unit Kerja tidak valid'
        });
      }

      // Check if Kontrak exists
      const kontrak = await Kontrak.findById(kontrakId);
      if (!kontrak) {
        return reply.code(400).send({
          success: false,
          message: 'Kontrak tidak ditemukan'
        });
      }

      const newMonitoring = new Monitoring({
        kontrakId,
        subPerangkatDaerahId,
        budgetYear: budgetYear || '2026-Murni',
        realisasiProgress: realisasiProgress || 0,
        realisasiDana: realisasiDana || 0,
        realisasiDanaRp: realisasiDanaRp || 0,
        progressFisik: progressFisik || 0,
        progressKeuangan: progressKeuangan || 0,
        status: status || 'planning',
        tanggalUpdate: tanggalUpdate ? new Date(tanggalUpdate) : new Date(),
        keterangan: keterangan || '',
        kendala: kendala || '',
        solusi: solusi || '',
        createdBy: request.user?.userId || 'system',
        updatedBy: request.user?.userId || 'system'
      });

      const savedMonitoring = await newMonitoring.save();
      await savedMonitoring.populate('kontrakId');
      await savedMonitoring.populate('subPerangkatDaerahId');

      reply.code(201).send({
        success: true,
        data: savedMonitoring,
        message: 'Monitoring berhasil dibuat'
      });

    } else if (request.url.match(/\/api\/monitoring\/[a-f\d]{24}$/) && request.method === 'GET') {
      // Get specific monitoring by ID
      const id = request.url.split('/')[3];
      const monitoring = await Monitoring.findById(id)
        .populate('kontrakId')
        .populate('subPerangkatDaerahId');

      if (!monitoring) {
        return reply.code(404).send({
          success: false,
          message: 'Monitoring tidak ditemukan'
        });
      }

      reply.send({
        success: true,
        data: monitoring
      });

    } else if (request.url.match(/\/api\/monitoring\/[a-f\d]{24}$/) && request.method === 'PUT') {
      // Update monitoring by ID
      const id = request.url.split('/')[3];
      const {
        realisasiProgress,
        realisasiDana,
        realisasiDanaRp,
        progressFisik,
        progressKeuangan,
        status,
        tanggalUpdate,
        keterangan,
        kendala,
        solusi
      } = request.body;

      const updateData = {
        realisasiProgress: realisasiProgress || 0,
        realisasiDana: realisasiDana || 0,
        realisasiDanaRp: realisasiDanaRp || 0,
        progressFisik: progressFisik || 0,
        progressKeuangan: progressKeuangan || 0,
        status: status || 'planning',
        tanggalUpdate: tanggalUpdate ? new Date(tanggalUpdate) : new Date(),
        keterangan: keterangan || '',
        kendala: kendala || '',
        solusi: solusi || '',
        updatedBy: request.user?.userId || 'system'
      };

      const updatedMonitoring = await Monitoring.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).populate('kontrakId').populate('subPerangkatDaerahId');

      if (!updatedMonitoring) {
        return reply.code(404).send({
          success: false,
          message: 'Monitoring tidak ditemukan'
        });
      }

      reply.send({
        success: true,
        data: updatedMonitoring,
        message: 'Monitoring berhasil diperbarui'
      });

    } else if (request.url.match(/\/api\/monitoring\/[a-f\d]{24}$/) && request.method === 'DELETE') {
      // Delete monitoring by ID
      const id = request.url.split('/')[3];
      const deletedMonitoring = await Monitoring.findByIdAndDelete(id);

      if (!deletedMonitoring) {
        return reply.code(404).send({
          success: false,
          message: 'Monitoring tidak ditemukan'
        });
      }

      reply.send({
        success: true,
        message: 'Monitoring berhasil dihapus'
      });

    } else if (request.url.startsWith('/api/monitoring/by-kontrak/') && request.method === 'GET') {
      // Get monitoring by kontrak ID
      const kontrakId = request.url.split('/')[4];
      
      if (!mongoose.Types.ObjectId.isValid(kontrakId)) {
        return reply.code(400).send({
          success: false,
          message: 'ID Kontrak tidak valid'
        });
      }

      const monitoring = await Monitoring.find({ kontrakId })
        .populate('kontrakId')
        .populate('subPerangkatDaerahId')
        .sort({ tanggalUpdate: -1 });

      reply.send({
        success: true,
        data: monitoring
      });

    } else if (request.url.startsWith('/api/monitoring/summary') && request.method === 'GET') {
      // Get monitoring summary for unit and budget year
      const subPerangkatDaerahId = request.query.subPerangkatDaerahId;
      const budgetYear = request.query.budgetYear;

      if (!subPerangkatDaerahId) {
        return reply.code(400).send({
          success: false,
          message: 'Unit kerja harus dipilih'
        });
      }

      const summary = await Monitoring.aggregate([
        {
          $match: {
            subPerangkatDaerahId: new mongoose.Types.ObjectId(subPerangkatDaerahId),
            ...(budgetYear && { budgetYear: budgetYear })
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgProgressFisik: { $avg: '$progressFisik' },
            avgProgressKeuangan: { $avg: '$progressKeuangan' },
            totalRealisasiDana: { $sum: '$realisasiDanaRp' }
          }
        }
      ]);

      const totalMonitoring = await Monitoring.countDocuments({
        subPerangkatDaerahId,
        ...(budgetYear && { budgetYear })
      });

      return reply.send({
        success: true,
        data: {
          total: totalMonitoring,
          byStatus: summary
        }
      });

    } else {
      // Invalid endpoint
      return reply.code(404).send({
        success: false,
        message: 'Endpoint tidak ditemukan'
      });
    }
  } catch (error) {
    console.error('Error in monitoringRouter:', error);
    if (!reply.sent) {
      reply.code(500).send({
        success: false,
        message: 'Terjadi kesalahan server',
        error: error.message
      });
    }
  }
};

export default monitoringRouter;