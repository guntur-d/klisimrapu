import mongoose from 'mongoose';
import Kontrak from '../models/Kontrak.js';
import PaketKegiatan from '../models/PaketKegiatan.js';

const kontrakRouter = async (request, reply) => {
  try {
    // GET /api/kontrak - Get all kontrak (with or without query params)
    if (request.method === 'GET' && request.url.startsWith('/api/kontrak')) {
      try {
        const {
          subPerangkatDaerahId,
          budgetYear,
          kodeRekeningId,
          kodeRekeningIds, // Support comma-separated values
          anggaranId,
          anggaranIds, // Support comma-separated values
          paketKegiatanId,
          subKegiatanId, // Add subKegiatanId filtering support
          limit = 50,
          skip = 0
        } = request.query || {};

        // Build filter
        const filter = {};
        
        if (subPerangkatDaerahId) {
          filter.subPerangkatDaerahId = subPerangkatDaerahId;
        }
        
        if (budgetYear) {
          filter.budgetYear = budgetYear;
        }
        
        if (kodeRekeningId) {
          filter.kodeRekeningId = kodeRekeningId;
        } else if (kodeRekeningIds) {
          // Handle comma-separated kode rekening IDs
          const ids = kodeRekeningIds.split(',').map(id => id.trim()).filter(id => id);
          if (ids.length > 0) {
            filter.kodeRekeningId = { $in: ids };
          }
        }
        
        if (anggaranId) {
          filter.anggaranId = anggaranId;
        } else if (anggaranIds) {
          // Handle comma-separated anggaran IDs
          const ids = anggaranIds.split(',').map(id => id.trim()).filter(id => id);
          if (ids.length > 0) {
            filter.anggaranId = { $in: ids };
          }
        }
        
        if (paketKegiatanId) {
          filter.paketKegiatanId = paketKegiatanId;
        }
        
        if (subKegiatanId) {
          filter.subKegiatanId = subKegiatanId;
        }

        const kontrak = await Kontrak.find(filter)
          .populate('paketKegiatanId')
          .populate('kodeRekeningId')
          .populate('subKegiatanId')
          .populate('anggaranId')
          .populate('subPerangkatDaerahId')
          .populate('penyediaId')
          .populate('metodePengadaanId')
          .limit(parseInt(limit))
          .skip(parseInt(skip))
          .sort({ createdAt: -1 });

        const total = await Kontrak.countDocuments(filter);

        reply.send({
          success: true,
          data: kontrak,
          total,
          page: Math.floor(skip / limit) + 1,
          limit: parseInt(limit)
        });
      } catch (error) {
        console.error('Error fetching kontrak:', error);
        reply.code(500).send({
          success: false,
          message: 'Error fetching kontrak data',
          error: error.message
        });
      }

    // GET /api/kontrak/:id - Get single kontrak
    } else if (request.method === 'GET' && request.url.match(/^\/api\/kontrak\/[a-fA-F0-9]{24}$/)) {
      try {
        const id = request.url.split('/')[3];

        const kontrak = await Kontrak.findById(id)
          .populate('paketKegiatanId')
          .populate('kodeRekeningId')
          .populate('subKegiatanId')
          .populate('anggaranId')
          .populate('subPerangkatDaerahId')
          .populate('penyediaId')
          .populate('metodePengadaanId');

        if (!kontrak) {
          return reply.code(404).send({
            success: false,
            message: 'Kontrak not found'
          });
        }

        reply.send({
          success: true,
          data: kontrak
        });
      } catch (error) {
        console.error('Error fetching kontrak:', error);
        reply.code(500).send({
          success: false,
          message: 'Error fetching kontrak data',
          error: error.message
        });
      }

    // POST /api/kontrak - Create new kontrak (with or without query params)
    } else if (request.method === 'POST' && request.url.startsWith('/api/kontrak')) {
      try {
        const kontrakData = request.body;
        
        // Validate required fields
        const requiredFields = [
          'paketKegiatanId',
          'kodeSirupLkpp',
          'penyediaId',
          'noKontrak',
          'tglKontrak',
          'noSpmk',
          'tglSpmk',
          'metodePengadaanId',
          'nilaiKontrak',
          'jangkaWaktu',
          'jangkaWaktuUnit',
          'tglPelaksanaanDari',
          'tglPelaksanaanSampai',
          'lokasi',
          'hps',
          'tipe',
          'kualifikasiPengadaan',
          'budgetYear',
          'subPerangkatDaerahId'
        ];

        for (const field of requiredFields) {
          if (!kontrakData[field] || kontrakData[field] === '') {
            return reply.code(400).send({
              success: false,
              message: `Field '${field}' is required`
            });
          }
        }

        // Auto-populate context fields from paket kegiatan if not provided
        if (kontrakData.paketKegiatanId) {
          const paketKegiatan = await PaketKegiatan.findById(kontrakData.paketKegiatanId);
          if (paketKegiatan) {
            // Auto-populate the missing fields
            if (!kontrakData.kodeRekeningId) {
              kontrakData.kodeRekeningId = paketKegiatan.kodeRekeningId;
            }
            if (!kontrakData.subKegiatanId) {
              kontrakData.subKegiatanId = paketKegiatan.subKegiatanId;
            }
            if (!kontrakData.anggaranId) {
              kontrakData.anggaranId = paketKegiatan.anggaranId;
            }
            if (!kontrakData.subPerangkatDaerahId) {
              kontrakData.subPerangkatDaerahId = paketKegiatan.subPerangkatDaerahId;
            }
            if (!kontrakData.budgetYear) {
              kontrakData.budgetYear = paketKegiatan.budgetYear;
            }
          }
        }

        // Add created/updated by info
        kontrakData.createdBy = request.user?.userId || 'system';
        kontrakData.updatedBy = request.user?.userId || 'system';

        const kontrak = new Kontrak(kontrakData);
        await kontrak.save();

        // Populate the response
        const populatedKontrak = await Kontrak.findById(kontrak._id)
          .populate('paketKegiatanId')
          .populate('kodeRekeningId')
          .populate('subKegiatanId')
          .populate('anggaranId')
          .populate('subPerangkatDaerahId')
          .populate('penyediaId')
          .populate('metodePengadaanId');

        reply.code(201).send({
          success: true,
          message: 'Kontrak berhasil dibuat',
          data: populatedKontrak
        });
      } catch (error) {
        console.error('Error creating kontrak:', error);
        reply.code(500).send({
          success: false,
          message: 'Error creating kontrak',
          error: error.message
        });
      }

    // PUT /api/kontrak/:id - Update kontrak
    } else if (request.method === 'PUT' && request.url.match(/^\/api\/kontrak\/[a-fA-F0-9]{24}$/)) {
      try {
        const id = request.url.split('/')[3];
        const updateData = request.body;

        // Add updated by info
        updateData.updatedBy = request.user?.userId || 'system';

        const kontrak = await Kontrak.findByIdAndUpdate(
          id,
          updateData,
          { new: true, runValidators: true }
        ).populate('paketKegiatanId')
          .populate('kodeRekeningId')
          .populate('subKegiatanId')
          .populate('anggaranId')
          .populate('subPerangkatDaerahId')
          .populate('penyediaId')
          .populate('metodePengadaanId');

        if (!kontrak) {
          return reply.code(404).send({
            success: false,
            message: 'Kontrak not found'
          });
        }

        reply.send({
          success: true,
          message: 'Kontrak berhasil diperbarui',
          data: kontrak
        });
      } catch (error) {
        console.error('Error updating kontrak:', error);
        reply.code(500).send({
          success: false,
          message: 'Error updating kontrak',
          error: error.message
        });
      }

    // DELETE /api/kontrak/:id - Delete kontrak
    } else if (request.method === 'DELETE' && request.url.match(/^\/api\/kontrak\/[a-fA-F0-9]{24}$/)) {
      try {
        const id = request.url.split('/')[3];

        const kontrak = await Kontrak.findByIdAndDelete(id);

        if (!kontrak) {
          return reply.code(404).send({
            success: false,
            message: 'Kontrak not found'
          });
        }

        reply.send({
          success: true,
          message: 'Kontrak berhasil dihapus'
        });
      } catch (error) {
        console.error('Error deleting kontrak:', error);
        reply.code(500).send({
          success: false,
          message: 'Error deleting kontrak',
          error: error.message
        });
      }

    // GET /api/kontrak/by-koderekening/:kodeRekeningId - Get all kontrak for specific kode rekening
    } else if (request.method === 'GET' && request.url.match(/^\/api\/kontrak\/by-koderekening\/[a-fA-F0-9]{24}$/)) {
      try {
        const kodeRekeningId = request.url.split('/')[4];

        const kontrak = await Kontrak.find({ kodeRekeningId })
          .populate('paketKegiatanId')
          .populate('kodeRekeningId')
          .populate('subKegiatanId')
          .populate('anggaranId')
          .populate('subPerangkatDaerahId')
          .populate('penyediaId')
          .populate('metodePengadaanId')
          .sort({ createdAt: -1 });

        reply.send({
          success: true,
          data: kontrak,
          total: kontrak.length
        });
      } catch (error) {
        console.error('Error fetching kontrak by kode rekening:', error);
        reply.code(500).send({
          success: false,
          message: 'Error fetching kontrak data',
          error: error.message
        });
      }

    // GET /api/kontrak/by-paket/:paketKegiatanId - Get all kontrak for specific paket kegiatan
    } else if (request.method === 'GET' && request.url.match(/^\/api\/kontrak\/by-paket\/[a-fA-F0-9]{24}$/)) {
      try {
        const paketKegiatanId = request.url.split('/')[4];

        const kontrak = await Kontrak.find({ paketKegiatanId })
          .populate('paketKegiatanId')
          .populate('kodeRekeningId')
          .populate('subKegiatanId')
          .populate('anggaranId')
          .populate('subPerangkatDaerahId')
          .populate('penyediaId')
          .populate('metodePengadaanId')
          .sort({ createdAt: -1 });

        reply.send({
          success: true,
          data: kontrak,
          total: kontrak.length
        });
      } catch (error) {
        console.error('Error fetching kontrak by paket kegiatan:', error);
        reply.code(500).send({
          success: false,
          message: 'Error fetching kontrak data',
          error: error.message
        });
      }

    } else {
      // Invalid endpoint
      reply.code(404).send({
        success: false,
        message: 'Endpoint not found'
      });
    }

  } catch (error) {
    console.error('Error in kontrakRouter:', error);
    reply.code(500).send({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

export default kontrakRouter;