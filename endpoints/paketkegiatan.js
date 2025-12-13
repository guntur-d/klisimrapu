import mongoose from 'mongoose';
import PaketKegiatan from '../models/PaketKegiatan.js';
import Anggaran from '../models/Anggaran.js';
import { SubKegiatan } from '../models/Urusan.js';
import SubPerangkatDaerah from '../models/SubPerangkatDaerah.js';

const paketKegiatanRouter = async (request, reply) => {
  try {
    if (request.url.startsWith('/api/paketkegiatan') && !request.url.includes('/:id') && request.method === 'GET') {
      // Get all paket kegiatan with optional filters
      const anggaranId = request.query.anggaranId;
      const anggaranIds = request.query.anggaranIds; // New parameter for multiple anggaran IDs
      const kodeRekeningId = request.query.kodeRekeningId;
      const kodeRekeningIds = request.query.kodeRekeningIds; // New parameter for multiple IDs
      const subKegiatanId = request.query.subKegiatanId;
      const subPerangkatDaerahId = request.query.subPerangkatDaerahId;
      const budgetYear = request.query.budgetYear;
      const status = request.query.status;

      console.log('PaketKegiatan GET request query params:', {
        anggaranId,
        anggaranIds,
        kodeRekeningId,
        kodeRekeningIds,
        subKegiatanId,
        subPerangkatDaerahId,
        budgetYear,
        status
      });

      let query = {};

      if (anggaranId) query.anggaranId = anggaranId;
      // Handle multiple anggaran IDs (comma-separated)
      if (anggaranIds) {
        const ids = anggaranIds.split(',').map(id => id.trim()).filter(id => id);
        if (ids.length > 0) {
          query.anggaranId = { $in: ids };
        }
      }
      if (kodeRekeningId) query.kodeRekeningId = kodeRekeningId;
      // Handle multiple kode rekening IDs (comma-separated)
      if (kodeRekeningIds) {
        const ids = kodeRekeningIds.split(',').map(id => id.trim()).filter(id => id);
        if (ids.length > 0) {
          query.kodeRekeningId = { $in: ids };
        }
      }
      if (subKegiatanId) query.subKegiatanId = subKegiatanId;
      if (subPerangkatDaerahId) query.subPerangkatDaerahId = subPerangkatDaerahId;
      if (budgetYear) query.budgetYear = budgetYear;
      if (status) query.status = status;

      console.log('Final query:', query);

      const paketKegiatan = await PaketKegiatan.find(query)
        .populate('anggaranId')
        .populate('kodeRekeningId')
        .populate('subKegiatanId')
        .populate('subPerangkatDaerahId')
        .sort({ nomor: 1 });

      console.log('Found paket kegiatan:', paketKegiatan.length);

      return reply.code(200).send({
        success: true,
        data: paketKegiatan,
        count: paketKegiatan.length
      });

    } else if (request.url === '/api/paketkegiatan' && request.method === 'POST') {
      // Create new paket kegiatan
      console.log('Received POST request to /api/paketkegiatan');
      console.log('Request body keys:', Object.keys(request.body));
      console.log('Request body:', JSON.stringify(request.body, null, 2));

      const {
        anggaranId,
        kodeRekeningId,
        subKegiatanId,
        subPerangkatDaerahId,
        uraian,
        volume,
        satuan,
        hargaSatuan,
        budgetYear,
        status,
        deskripsi,
        kode
      } = request.body;

      // Validation helper function
      const isFieldValid = (field) => {
        return field && typeof field === 'string' && field.trim().length > 0;
      };

      // Required field validation
      console.log('Validating required fields...');
      console.log('anggaranId:', anggaranId, 'type:', typeof anggaranId);
      console.log('kodeRekeningId:', kodeRekeningId, 'type:', typeof kodeRekeningId);
      console.log('subKegiatanId:', subKegiatanId, 'type:', typeof subKegiatanId);
      console.log('subPerangkatDaerahId:', subPerangkatDaerahId, 'type:', typeof subPerangkatDaerahId);
      console.log('uraian:', uraian, 'type:', typeof uraian);
      console.log('volume:', volume, 'type:', typeof volume);
      console.log('satuan:', satuan, 'type:', typeof satuan);
      console.log('hargaSatuan:', hargaSatuan, 'type:', typeof hargaSatuan);
      console.log('budgetYear:', budgetYear, 'type:', typeof budgetYear);

      if (!anggaranId || !kodeRekeningId || !subKegiatanId || !subPerangkatDaerahId ||
          !isFieldValid(uraian) || volume === undefined || volume === null ||
          !isFieldValid(satuan) || hargaSatuan === undefined || hargaSatuan === null ||
          !isFieldValid(budgetYear)) {
        console.log('Validation failed - some field is missing or invalid');
        return reply.code(400).send({
          success: false,
          message: 'Semua field harus diisi dengan benar',
          receivedData: request.body
        });
      }

      // Validate numeric values
      if (volume <= 0 || hargaSatuan <= 0) {
        return reply.code(400).send({
          success: false,
          message: 'Volume dan harga satuan harus lebih besar dari 0'
        });
      }

      // Validate ObjectIds
      const ids = [anggaranId, kodeRekeningId, subKegiatanId, subPerangkatDaerahId];
      for (const id of ids) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return reply.code(400).send({
            success: false,
            message: 'Salah satu ID tidak valid'
          });
        }
      }

      // Check if Anggaran exists
      const anggaran = await Anggaran.findById(anggaranId);
      if (!anggaran) {
        return reply.code(400).send({
          success: false,
          message: 'Anggaran tidak ditemukan'
        });
      }

      // Check if kode rekening is allocated in the anggaran
      const allocation = anggaran.allocations.find(alloc =>
        alloc.kodeRekeningId.toString() === kodeRekeningId
      );
      if (!allocation) {
        return reply.code(400).send({
          success: false,
          message: 'Kode rekening tidak dialokasikan dalam anggaran ini'
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

      // Calculate jumlah
      const jumlah = volume * hargaSatuan;

      // Check budget limit
      console.log('Checking budget validation...');
      console.log('Allocation amount:', allocation.amount);
      console.log('New paket jumlah:', jumlah);

      const existingPaket = await PaketKegiatan.find({
        kodeRekeningId,
        anggaranId
      });

      console.log('Existing paket count:', existingPaket.length);
      const totalExistingJumlah = existingPaket.reduce((total, paket) => total + paket.jumlah, 0);
      console.log('Total existing jumlah:', totalExistingJumlah);
      const newTotalJumlah = totalExistingJumlah + jumlah;
      console.log('New total jumlah:', newTotalJumlah);

      if (newTotalJumlah > allocation.amount) {
        console.log('Budget validation failed');
        return reply.code(400).send({
          success: false,
          message: `Total jumlah paket kegiatan (Rp ${newTotalJumlah.toLocaleString('id-ID')}) melebihi alokasi anggaran kode rekening (Rp ${allocation.amount.toLocaleString('id-ID')})`
        });
      }
      console.log('Budget validation passed');

      const newPaketKegiatan = new PaketKegiatan({
        anggaranId,
        kodeRekeningId,
        subKegiatanId,
        subPerangkatDaerahId,
        uraian: uraian.trim(),
        volume: parseFloat(volume),
        satuan: satuan.trim(),
        hargaSatuan: parseFloat(hargaSatuan),
        jumlah,
        budgetYear,
        deskripsi: deskripsi || '',
        status: status || 'draft',
        kode: kode?.trim() || undefined,
        createdBy: request.user?.userId || 'system',
        updatedBy: request.user?.userId || 'system'
      });

      const savedPaketKegiatan = await newPaketKegiatan.save();
      await savedPaketKegiatan.populate('anggaranId');
      await savedPaketKegiatan.populate('kodeRekeningId');
      await savedPaketKegiatan.populate('subKegiatanId');
      await savedPaketKegiatan.populate('subPerangkatDaerahId');

      // Populate the saved paket kegiatan with related data for immediate display
      await savedPaketKegiatan.populate([
        { path: 'anggaranId', select: 'budgetYear totalAmount' },
        { path: 'kodeRekeningId', select: 'kode nama' },
        { path: 'subKegiatanId', select: 'kode nama' },
        { path: 'subPerangkatDaerahId', select: 'nama' }
      ]);

      return reply.code(201).send({
        success: true,
        data: savedPaketKegiatan,
        message: 'Paket kegiatan berhasil dibuat'
      });

    } else if (request.url.match(/\/api\/paketkegiatan\/[a-f\d]{24}$/) && request.method === 'GET') {
      // Get specific paket kegiatan by ID
      const id = request.url.split('/')[3];
      const paketKegiatan = await PaketKegiatan.findById(id)
        .populate('anggaranId')
        .populate('kodeRekeningId')
        .populate('subKegiatanId')
        .populate('subPerangkatDaerahId');

      if (!paketKegiatan) {
        return reply.code(404).send({
          success: false,
          message: 'Paket kegiatan tidak ditemukan'
        });
      }

      return reply.code(200).send({
        success: true,
        data: paketKegiatan
      });

    } else if (request.url.match(/\/api\/paketkegiatan\/[a-f\d]{24}$/) && request.method === 'PUT') {
      // Update paket kegiatan by ID
      const id = request.url.split('/')[3];
      console.log('PUT request for paket kegiatan ID:', id);
      console.log('Request body:', JSON.stringify(request.body, null, 2));

      const {
         uraian,
         volume,
         satuan,
         hargaSatuan,
         deskripsi,
         status,
         kode
       } = request.body;

       // Validation helper function
       const isFieldValid = (field) => {
         return field && typeof field === 'string' && field.trim().length > 0;
       };

       // Required field validation
       console.log('Validating fields - uraian:', uraian, 'volume:', volume, 'satuan:', satuan, 'hargaSatuan:', hargaSatuan);
       if (!isFieldValid(uraian) || volume === undefined || volume === null ||
           !isFieldValid(satuan) || hargaSatuan === undefined || hargaSatuan === null) {
         console.log('Validation failed - missing required fields');
         return reply.code(400).send({
           success: false,
           message: 'Uraian, volume, satuan, dan harga satuan harus diisi'
         });
       }

       // Validate numeric values
       if (volume <= 0 || hargaSatuan <= 0) {
         console.log('Validation failed - invalid numeric values');
         return reply.code(400).send({
           success: false,
           message: 'Volume dan harga satuan harus lebih besar dari 0'
         });
       }

      // Get current paket to check budget constraints
      const currentPaket = await PaketKegiatan.findById(id);
      if (!currentPaket) {
        return reply.code(404).send({
          success: false,
          message: 'Paket kegiatan tidak ditemukan'
        });
      }

      // Calculate new jumlah
      const newJumlah = volume * hargaSatuan;

      // Check budget limit for updates
      const anggaran = await Anggaran.findById(currentPaket.anggaranId);
      if (!anggaran) {
        return reply.code(400).send({
          success: false,
          message: 'Anggaran tidak ditemukan'
        });
      }

      const allocation = anggaran.allocations.find(alloc =>
        alloc.kodeRekeningId.toString() === currentPaket.kodeRekeningId.toString()
      );
      if (!allocation) {
        return reply.code(400).send({
          success: false,
          message: 'Alokasi kode rekening tidak ditemukan'
        });
      }

      // Get total existing jumlah excluding current paket
      const otherPaket = await PaketKegiatan.find({
        kodeRekeningId: currentPaket.kodeRekeningId,
        anggaranId: currentPaket.anggaranId,
        _id: { $ne: id }
      });

      const totalOtherJumlah = otherPaket.reduce((total, paket) => total + paket.jumlah, 0);
      const newTotalJumlah = totalOtherJumlah + newJumlah;

      if (newTotalJumlah > allocation.amount) {
        return reply.code(400).send({
          success: false,
          message: `Total jumlah paket kegiatan (Rp ${newTotalJumlah.toLocaleString('id-ID')}) melebihi alokasi anggaran kode rekening (Rp ${allocation.amount.toLocaleString('id-ID')})`
        });
      }

      const updateData = {
        uraian: uraian.trim(),
        volume: parseFloat(volume),
        satuan: satuan.trim(),
        hargaSatuan: parseFloat(hargaSatuan),
        jumlah: newJumlah,
        updatedBy: request.user?.userId || 'system'
      };

      // Include deskripsi if provided
      if (deskripsi !== undefined) {
        updateData.deskripsi = deskripsi || '';
      }

      // Include kode if provided
      if (kode !== undefined) {
        updateData.kode = kode?.trim() || undefined;
      }

      if (status) updateData.status = status;

      const updatedPaketKegiatan = await PaketKegiatan.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).populate([
        { path: 'anggaranId', select: 'budgetYear totalAmount' },
        { path: 'kodeRekeningId', select: 'kode nama' },
        { path: 'subKegiatanId', select: 'kode nama' },
        { path: 'subPerangkatDaerahId', select: 'nama' }
      ]);

      if (!updatedPaketKegiatan) {
        return reply.code(404).send({
          success: false,
          message: 'Paket kegiatan tidak ditemukan'
        });
      }

      return reply.code(200).send({
        success: true,
        data: updatedPaketKegiatan,
        message: 'Paket kegiatan berhasil diperbarui'
      });

    } else if (request.url.match(/\/api\/paketkegiatan\/[a-f\d]{24}$/) && request.method === 'DELETE') {
      // Delete paket kegiatan by ID
      const id = request.url.split('/')[3];
      const deletedPaketKegiatan = await PaketKegiatan.findByIdAndDelete(id);

      if (!deletedPaketKegiatan) {
        return reply.code(404).send({
          success: false,
          message: 'Paket kegiatan tidak ditemukan'
        });
      }

      return reply.code(200).send({
        success: true,
        message: 'Paket kegiatan berhasil dihapus'
      });

    } else if (request.url.startsWith('/api/paketkegiatan/summary') && request.method === 'GET') {
      // Get paket kegiatan summary for kode rekening and anggaran
      const url = new URL(request.url, `http://${request.headers.host}`);
      const kodeRekeningId = url.searchParams.get('kodeRekeningId');
      const anggaranId = url.searchParams.get('anggaranId');

      if (!kodeRekeningId || !anggaranId) {
        return reply.code(400).send({
          success: false,
          message: 'Kode rekening dan anggaran harus dipilih'
        });
      }

      const summary = await PaketKegiatan.getTotalByKodeRekening(kodeRekeningId, anggaranId);

      // Also get allocation amount from anggaran
      const anggaran = await Anggaran.findById(anggaranId);
      let allocatedAmount = 0;
      if (anggaran) {
        const allocation = anggaran.allocations.find(alloc =>
          alloc.kodeRekeningId.toString() === kodeRekeningId
        );
        if (allocation) {
          allocatedAmount = allocation.amount;
        }
      }

      return reply.code(200).send({
        success: true,
        data: {
          summary: summary[0] || { totalJumlah: 0, totalVolume: 0, count: 0 },
          allocatedAmount
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
    console.error('Error in paketKegiatanRouter:', error);
    if (!reply.sent) {
      return reply.code(500).send({
        success: false,
        message: 'Terjadi kesalahan server',
        error: error.message
      });
    }
  }
};

export default paketKegiatanRouter;