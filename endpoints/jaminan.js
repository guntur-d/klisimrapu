import mongoose from 'mongoose';
import Jaminan from '../models/Jaminan.js';
import Kontrak from '../models/Kontrak.js';

const jaminanRouter = async (request, reply) => {
  try {
    // GET /api/jaminan - Get all jaminan (with or without query params)
    if (request.method === 'GET' && request.url.startsWith('/api/jaminan')) {
      try {
        const {
          kontrakId,
          limit = 100,
          skip = 0,
          sort = '-createdAt'
        } = request.query || {};

        // Build filter
        const filter = {};
        
        if (kontrakId) {
          filter.kontrakId = kontrakId;
        }

        const jaminan = await Jaminan.find(filter)
          .populate('kontrakId')
          .limit(parseInt(limit))
          .skip(parseInt(skip))
          .sort(sort);

        const total = await Jaminan.countDocuments(filter);

        reply.send({
          success: true,
          data: jaminan,
          total,
          page: Math.floor(skip / limit) + 1,
          limit: parseInt(limit)
        });
      } catch (error) {
        console.error('Error fetching jaminan:', error);
        reply.code(500).send({
          success: false,
          message: 'Error fetching jaminan data',
          error: error.message
        });
      }

    // GET /api/jaminan/:id - Get single jaminan
    } else if (request.method === 'GET' && request.url.match(/^\/api\/jaminan\/[a-fA-F0-9]{24}$/)) {
      try {
        const id = request.url.split('/')[3];

        const jaminan = await Jaminan.findById(id)
          .populate('kontrakId');

        if (!jaminan) {
          return reply.code(404).send({
            success: false,
            message: 'Jaminan tidak ditemukan'
          });
        }

        reply.send({
          success: true,
          data: jaminan
        });
      } catch (error) {
        console.error('Error fetching jaminan:', error);
        reply.code(500).send({
          success: false,
          message: 'Error fetching jaminan data',
          error: error.message
        });
      }

    // POST /api/jaminan - Create new jaminan
    } else if (request.method === 'POST' && request.url.startsWith('/api/jaminan')) {
      try {
        const jaminanData = request.body;
        
        // Validate required fields
        const requiredFields = [
          'kontrakId',
          'nomor',
          'jenis',
          'tanggalMulai',
          'tanggalBerakhir',
          'nilai',
          'tanggalTerbit'
        ];

        for (const field of requiredFields) {
          if (!jaminanData[field] || jaminanData[field] === '') {
            return reply.code(400).send({
              success: false,
              message: `Field '${field}' wajib diisi`
            });
          }
        }

        // Validate jenis enum
        const validJenis = ['Bank Garansi', 'Surety Bond', 'Jaminan dari Lembaga Keuangan Non-Bank'];
        if (!validJenis.includes(jaminanData.jenis)) {
          return reply.code(400).send({
            success: false,
            message: 'Jenis jaminan tidak valid. Harus salah satu dari: Bank Garansi, Surety Bond, Jaminan dari Lembaga Keuangan Non-Bank'
          });
        }

        // Validate dates
        const tanggalMulai = new Date(jaminanData.tanggalMulai);
        const tanggalBerakhir = new Date(jaminanData.tanggalBerakhir);
        const tanggalTerbit = new Date(jaminanData.tanggalTerbit);

        if (tanggalMulai >= tanggalBerakhir) {
          return reply.code(400).send({
            success: false,
            message: 'Tanggal mulai harus sebelum tanggal berakhir'
          });
        }

        if (tanggalTerbit > tanggalMulai) {
          return reply.code(400).send({
            success: false,
            message: 'Tanggal terbit harus sebelum atau sama dengan tanggal mulai'
          });
        }

        // Validate that nilai is reasonable (not exceeding contract value)
        if (jaminanData.kontrakId && jaminanData.nilai > 0) {
          const kontrak = await Kontrak.findById(jaminanData.kontrakId);
          if (kontrak && jaminanData.nilai > kontrak.nilaiKontrak) {
            return reply.code(400).send({
              success: false,
              message: 'Nilai jaminan tidak boleh melebihi nilai kontrak'
            });
          }
        }

        // Add created/updated by info
        jaminanData.createdBy = request.user?.userId || 'system';
        jaminanData.updatedBy = request.user?.userId || 'system';

        const jaminan = new Jaminan(jaminanData);
        await jaminan.save();

        // Populate the response
        const populatedJaminan = await Jaminan.findById(jaminan._id)
          .populate('kontrakId');

        reply.code(201).send({
          success: true,
          message: 'Jaminan berhasil dibuat',
          data: populatedJaminan
        });
      } catch (error) {
        console.error('Error creating jaminan:', error);
        reply.code(500).send({
          success: false,
          message: 'Error membuat jaminan',
          error: error.message
        });
      }

    // PUT /api/jaminan/:id - Update jaminan
    } else if (request.method === 'PUT' && request.url.match(/^\/api\/jaminan\/[a-fA-F0-9]{24}$/)) {
      try {
        const id = request.url.split('/')[3];
        const updateData = request.body;

        // Validate jenis enum if provided
        if (updateData.jenis !== undefined) {
          const validJenis = ['Bank Garansi', 'Surety Bond', 'Jaminan dari Lembaga Keuangan Non-Bank'];
          if (!validJenis.includes(updateData.jenis)) {
            return reply.code(400).send({
              success: false,
              message: 'Jenis jaminan tidak valid. Harus salah satu dari: Bank Garansi, Surety Bond, Jaminan dari Lembaga Keuangan Non-Bank'
            });
          }
        }

        // Validate dates if provided
        if (updateData.tanggalMulai || updateData.tanggalBerakhir) {
          const existingJaminan = await Jaminan.findById(id);
          const tanggalMulai = new Date(updateData.tanggalMulai || existingJaminan.tanggalMulai);
          const tanggalBerakhir = new Date(updateData.tanggalBerakhir || existingJaminan.tanggalBerakhir);

          if (tanggalMulai >= tanggalBerakhir) {
            return reply.code(400).send({
              success: false,
              message: 'Tanggal mulai harus sebelum tanggal berakhir'
            });
          }
        }

        // Add updated by info
        updateData.updatedBy = request.user?.userId || 'system';

        const jaminan = await Jaminan.findByIdAndUpdate(
          id,
          updateData,
          { new: true, runValidators: true }
        ).populate('kontrakId');

        if (!jaminan) {
          return reply.code(404).send({
            success: false,
            message: 'Jaminan tidak ditemukan'
          });
        }

        reply.send({
          success: true,
          message: 'Jaminan berhasil diperbarui',
          data: jaminan
        });
      } catch (error) {
        console.error('Error updating jaminan:', error);
        reply.code(500).send({
          success: false,
          message: 'Error memperbarui jaminan',
          error: error.message
        });
      }

    // DELETE /api/jaminan/:id - Delete jaminan
    } else if (request.method === 'DELETE' && request.url.match(/^\/api\/jaminan\/[a-fA-F0-9]{24}$/)) {
      try {
        const id = request.url.split('/')[3];

        const jaminan = await Jaminan.findByIdAndDelete(id);

        if (!jaminan) {
          return reply.code(404).send({
            success: false,
            message: 'Jaminan tidak ditemukan'
          });
        }

        reply.send({
          success: true,
          message: 'Jaminan berhasil dihapus'
        });
      } catch (error) {
        console.error('Error deleting jaminan:', error);
        reply.code(500).send({
          success: false,
          message: 'Error menghapus jaminan',
          error: error.message
        });
      }

    // GET /api/jaminan/by-kontrak/:kontrakId - Get all jaminan for specific kontrak
    } else if (request.method === 'GET' && request.url.match(/^\/api\/jaminan\/by-kontrak\/[a-fA-F0-9]{24}$/)) {
      try {
        const kontrakId = request.url.split('/')[4];

        const jaminan = await Jaminan.find({ kontrakId })
          .populate('kontrakId')
          .sort({ tanggalBerakhir: 1 });

        reply.send({
          success: true,
          data: jaminan,
          total: jaminan.length
        });
      } catch (error) {
        console.error('Error fetching jaminan by kontrak:', error);
        reply.code(500).send({
          success: false,
          message: 'Error fetching jaminan data',
          error: error.message
        });
      }

    // GET /api/jaminan/expired - Get all expired jaminan
    } else if (request.method === 'GET' && request.url.startsWith('/api/jaminan/expired')) {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const jaminan = await Jaminan.find({
          tanggalBerakhir: { $lt: today }
        })
          .populate('kontrakId')
          .sort({ tanggalBerakhir: 1 });

        reply.send({
          success: true,
          data: jaminan,
          total: jaminan.length
        });
      } catch (error) {
        console.error('Error fetching expired jaminan:', error);
        reply.code(500).send({
          success: false,
          message: 'Error fetching expired jaminan data',
          error: error.message
        });
      }

    } else {
      // Invalid endpoint
      reply.code(404).send({
        success: false,
        message: 'Endpoint tidak ditemukan'
      });
    }

  } catch (error) {
    console.error('Error in jaminanRouter:', error);
    reply.code(500).send({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

export default jaminanRouter;