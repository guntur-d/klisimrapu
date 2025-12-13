import mongoose from 'mongoose';
import Pengadaan from '../models/Pengadaan.js';
import { SubKegiatan } from '../models/Urusan.js';
import SubPerangkatDaerah from '../models/SubPerangkatDaerah.js';

const pengadaanRouter = async (request, reply) => {
  try {
    console.log('pengadaanRouter called with:', request.method, request.url);
    
    // Handle GET /api/pengadaan with query parameters
    if (request.method === 'GET' && request.url.includes('/api/pengadaan')) {
      // Check if it's a specific ID request or a list request
      const urlParts = request.url.split('/');
      const isSpecificId = urlParts.length >= 4 && urlParts[3] && urlParts[3] !== 'summary';
      
      if (isSpecificId) {
        // This is handled by the specific ID route below
        return;
      }
      
      console.log('Handling GET /api/pengadaan list request');
      
      // Get all pengadaan with optional filters
      const subPerangkatDaerahId = request.query.subPerangkatDaerahId;
      const subKegiatanId = request.query.subKegiatanId;
      const budgetYear = request.query.budgetYear;
      const status = request.query.status;

      let query = {};

      if (subPerangkatDaerahId) query.subPerangkatDaerahId = subPerangkatDaerahId;
      if (subKegiatanId) query.subKegiatanId = subKegiatanId;
      if (budgetYear) query.budgetYear = budgetYear;
      if (status) query.status = status;

      console.log('Query:', query);

      const pengadaan = await Pengadaan.find(query)
        .populate('subKegiatanId')
        .populate('subPerangkatDaerahId')
        .sort({ 'subPerangkatDaerahId.nama': 1, 'subKegiatanId.kode': 1, kode: 1 });

      reply.send({
        success: true,
        data: pengadaan,
        count: pengadaan.length
      });

    } else if (request.url === '/api/pengadaan' && request.method === 'POST') {
      // Create new pengadaan
      console.log('Received POST request to /api/pengadaan');
      console.log('Request body:', request.body);

      const {
        subKegiatanId,
        subPerangkatDaerahId,
        kode,
        nama,
        deskripsi,
        budgetYear,
        status,
        estimatedBudget,
        actualBudget,
        startDate,
        endDate,
        location
      } = request.body;

      // Validation helper function
      const isFieldValid = (field) => {
        return field && typeof field === 'string' && field.trim().length > 0;
      };

      // Required field validation
      if (!subKegiatanId || !subPerangkatDaerahId || !isFieldValid(kode) || !isFieldValid(nama) || !isFieldValid(budgetYear)) {
        return reply.code(400).send({
          success: false,
          message: 'SubKegiatan, unit kerja, kode, nama, dan tahun anggaran harus diisi',
          receivedData: request.body
        });
      }

      // Validate ObjectIds
      if (!mongoose.Types.ObjectId.isValid(subKegiatanId) || !mongoose.Types.ObjectId.isValid(subPerangkatDaerahId)) {
        return reply.code(400).send({
          success: false,
          message: 'ID SubKegiatan atau Unit Kerja tidak valid'
        });
      }

      // Check if SubKegiatan exists
      const subKegiatan = await SubKegiatan.findById(subKegiatanId);
      if (!subKegiatan) {
        return reply.code(400).send({
          success: false,
          message: 'SubKegiatan tidak ditemukan'
        });
      }

      // Check if SubPerangkatDaerah exists
      const subPerangkatDaerah = await SubPerangkatDaerah.findById(subPerangkatDaerahId);
      if (!subPerangkatDaerah) {
        return reply.code(400).send({
          success: false,
          message: 'Unit kerja tidak ditemukan'
        });
      }

      // Check if kode already exists for this subkegiatan and unit
      const existingPengadaan = await Pengadaan.findOne({
        kode: kode.trim(),
        subKegiatanId,
        subPerangkatDaerahId
      });
      if (existingPengadaan) {
        return reply.code(400).send({
          success: false,
          message: 'Kode pengadaan sudah digunakan untuk subkegiatan dan unit kerja yang sama'
        });
      }

      const newPengadaan = new Pengadaan({
        subKegiatanId,
        subPerangkatDaerahId,
        kode: kode.trim(),
        nama: nama.trim(),
        deskripsi: deskripsi ? deskripsi.trim() : '',
        budgetYear,
        status: status || 'draft',
        estimatedBudget: estimatedBudget || 0,
        actualBudget: actualBudget || 0,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        location: location ? location.trim() : '',
        createdBy: request.user?.userId || 'system',
        updatedBy: request.user?.userId || 'system'
      });

      const savedPengadaan = await newPengadaan.save();
      await savedPengadaan.populate('subKegiatanId');
      await savedPengadaan.populate('subPerangkatDaerahId');

      reply.code(201).send({
        success: true,
        data: savedPengadaan,
        message: 'Pengadaan berhasil dibuat'
      });

    } else if (request.url.match(/\/api\/pengadaan\/[a-f\d]{24}$/) && request.method === 'GET') {
      // Get specific pengadaan by ID
      const id = request.url.split('/')[3];
      const pengadaan = await Pengadaan.findById(id)
        .populate('subKegiatanId')
        .populate('subPerangkatDaerahId');

      if (!pengadaan) {
        return reply.code(404).send({
          success: false,
          message: 'Pengadaan tidak ditemukan'
        });
      }

      reply.send({
        success: true,
        data: pengadaan
      });

    } else if (request.url.match(/\/api\/pengadaan\/[a-f\d]{24}$/) && request.method === 'PUT') {
      // Update pengadaan by ID
      const id = request.url.split('/')[3];
      const {
        subKegiatanId,
        subPerangkatDaerahId,
        kode,
        nama,
        deskripsi,
        budgetYear,
        status,
        estimatedBudget,
        actualBudget,
        progressPercentage,
        startDate,
        endDate,
        location
      } = request.body;

      // Validation helper function
      const isFieldValid = (field) => {
        return field && typeof field === 'string' && field.trim().length > 0;
      };

      // Required field validation
      if (!isFieldValid(kode) || !isFieldValid(nama) || !isFieldValid(budgetYear)) {
        return reply.code(400).send({
          success: false,
          message: 'Kode, nama, dan tahun anggaran harus diisi'
        });
      }

      // Validate ObjectIds if provided
      if (subKegiatanId && !mongoose.Types.ObjectId.isValid(subKegiatanId)) {
        return reply.code(400).send({
          success: false,
          message: 'ID SubKegiatan tidak valid'
        });
      }

      if (subPerangkatDaerahId && !mongoose.Types.ObjectId.isValid(subPerangkatDaerahId)) {
        return reply.code(400).send({
          success: false,
          message: 'ID Unit Kerja tidak valid'
        });
      }

      // Check if kode already exists for different procurement
      if (subKegiatanId && subPerangkatDaerahId) {
        const existingPengadaan = await Pengadaan.findOne({
          kode: kode.trim(),
          subKegiatanId,
          subPerangkatDaerahId,
          _id: { $ne: id }
        });
        if (existingPengadaan) {
          return reply.code(400).send({
            success: false,
            message: 'Kode pengadaan sudah digunakan untuk subkegiatan dan unit kerja yang sama'
          });
        }
      }

      const updateData = {
        kode: kode.trim(),
        nama: nama.trim(),
        deskripsi: deskripsi ? deskripsi.trim() : '',
        budgetYear,
        estimatedBudget: estimatedBudget || 0,
        actualBudget: actualBudget || 0,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        location: location ? location.trim() : '',
        updatedBy: request.user?.userId || 'system'
      };

      if (status) updateData.status = status;
      if (progressPercentage !== undefined) updateData.progressPercentage = progressPercentage;
      if (subKegiatanId) updateData.subKegiatanId = subKegiatanId;
      if (subPerangkatDaerahId) updateData.subPerangkatDaerahId = subPerangkatDaerahId;

      const updatedPengadaan = await Pengadaan.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).populate('subKegiatanId').populate('subPerangkatDaerahId');

      if (!updatedPengadaan) {
        return reply.code(404).send({
          success: false,
          message: 'Pengadaan tidak ditemukan'
        });
      }

      reply.send({
        success: true,
        data: updatedPengadaan,
        message: 'Pengadaan berhasil diperbarui'
      });

    } else if (request.url.match(/\/api\/pengadaan\/[a-f\d]{24}$/) && request.method === 'DELETE') {
      // Delete pengadaan by ID
      const id = request.url.split('/')[3];
      const deletedPengadaan = await Pengadaan.findByIdAndDelete(id);

      if (!deletedPengadaan) {
        return reply.code(404).send({
          success: false,
          message: 'Pengadaan tidak ditemukan'
        });
      }

      reply.send({
        success: true,
        message: 'Pengadaan berhasil dihapus'
      });

    } else if (request.url.startsWith('/api/pengadaan/summary') && request.method === 'GET') {
      // Get procurement summary for unit and budget year
      const subPerangkatDaerahId = request.query.subPerangkatDaerahId;
      const budgetYear = request.query.budgetYear;

      if (!subPerangkatDaerahId) {
        return reply.code(400).send({
          success: false,
          message: 'Unit kerja harus dipilih'
        });
      }

      const summary = await Pengadaan.getProcurementSummary(subPerangkatDaerahId, budgetYear);

      return reply.send({
        success: true,
        data: summary
      });

    } else {
      // Invalid endpoint
      console.log('No matching route found for:', request.method, request.url);
      return reply.code(404).send({
        success: false,
        message: 'Endpoint tidak ditemukan'
      });
    }
  } catch (error) {
    console.error('Error in pengadaanRouter:', error);
    if (!reply.sent) {
      reply.code(500).send({
        success: false,
        message: 'Terjadi kesalahan server',
        error: error.message
      });
    }
  }
};

export default pengadaanRouter;