import mongoose from 'mongoose';
import Target from '../models/Target.js';
import Kontrak from '../models/Kontrak.js';

const targetRouter = async (request, reply) => {
  try {
    // GET /api/target - Get all target (with or without query params)
    if (request.method === 'GET' && request.url.startsWith('/api/target')) {
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

        const targets = await Target.find(filter)
          .populate('kontrakId')
          .limit(parseInt(limit))
          .skip(parseInt(skip))
          .sort(sort);

        const total = await Target.countDocuments(filter);

        reply.send({
          success: true,
          data: targets,
          total,
          page: Math.floor(skip / limit) + 1,
          limit: parseInt(limit)
        });
      } catch (error) {
        console.error('Error fetching target:', error);
        reply.code(500).send({
          success: false,
          message: 'Error fetching target data',
          error: error.message
        });
      }

    // GET /api/target/:id - Get single target
    } else if (request.method === 'GET' && request.url.match(/^\/api\/target\/[a-fA-F0-9]{24}$/)) {
      try {
        const id = request.url.split('/')[3];

        const target = await Target.findById(id)
          .populate('kontrakId');

        if (!target) {
          return reply.code(404).send({
            success: false,
            message: 'Target tidak ditemukan'
          });
        }

        reply.send({
          success: true,
          data: target
        });
      } catch (error) {
        console.error('Error fetching target:', error);
        reply.code(500).send({
          success: false,
          message: 'Error fetching target data',
          error: error.message
        });
      }

    // POST /api/target - Create new target
    } else if (request.method === 'POST' && request.url.startsWith('/api/target')) {
      try {
        const targetData = request.body;
        
        // Validate required fields
        const requiredFields = [
          'kontrakId',
          'tanggal',
          'targetFisik',
          'targetDana',
          'targetDanaRp'
        ];

        for (const field of requiredFields) {
          if (!targetData[field] || targetData[field] === '') {
            return reply.code(400).send({
              success: false,
              message: `Field '${field}' wajib diisi`
            });
          }
        }

        // Validate target percentages
        if (targetData.targetFisik < 0 || targetData.targetFisik > 100) {
          return reply.code(400).send({
            success: false,
            message: 'Target fisik harus antara 0-100%'
          });
        }

        if (targetData.targetDana < 0 || targetData.targetDana > 100) {
          return reply.code(400).send({
            success: false,
            message: 'Target dana harus antara 0-100%'
          });
        }

        // Validate that targetDanaRp is reasonable (not exceeding contract value)
        if (targetData.kontrakId && targetData.targetDanaRp > 0) {
          const kontrak = await Kontrak.findById(targetData.kontrakId);
          if (kontrak && targetData.targetDanaRp > kontrak.nilaiKontrak) {
            return reply.code(400).send({
              success: false,
              message: 'Target dana tidak boleh melebihi nilai kontrak'
            });
          }
        }

        // Add created/updated by info
        targetData.createdBy = request.user?.userId || 'system';
        targetData.updatedBy = request.user?.userId || 'system';

        const target = new Target(targetData);
        await target.save();

        // Populate the response
        const populatedTarget = await Target.findById(target._id)
          .populate('kontrakId');

        reply.code(201).send({
          success: true,
          message: 'Target berhasil dibuat',
          data: populatedTarget
        });
      } catch (error) {
        console.error('Error creating target:', error);
        reply.code(500).send({
          success: false,
          message: 'Error membuat target',
          error: error.message
        });
      }

    // PUT /api/target/:id - Update target
    } else if (request.method === 'PUT' && request.url.match(/^\/api\/target\/[a-fA-F0-9]{24}$/)) {
      try {
        const id = request.url.split('/')[3];
        const updateData = request.body;

        // Validate target percentages if provided
        if (updateData.targetFisik !== undefined) {
          if (updateData.targetFisik < 0 || updateData.targetFisik > 100) {
            return reply.code(400).send({
              success: false,
              message: 'Target fisik harus antara 0-100%'
            });
          }
        }

        if (updateData.targetDana !== undefined) {
          if (updateData.targetDana < 0 || updateData.targetDana > 100) {
            return reply.code(400).send({
              success: false,
              message: 'Target dana harus antara 0-100%'
            });
          }
        }

        // Add updated by info
        updateData.updatedBy = request.user?.userId || 'system';

        const target = await Target.findByIdAndUpdate(
          id,
          updateData,
          { new: true, runValidators: true }
        ).populate('kontrakId');

        if (!target) {
          return reply.code(404).send({
            success: false,
            message: 'Target tidak ditemukan'
          });
        }

        reply.send({
          success: true,
          message: 'Target berhasil diperbarui',
          data: target
        });
      } catch (error) {
        console.error('Error updating target:', error);
        reply.code(500).send({
          success: false,
          message: 'Error memperbarui target',
          error: error.message
        });
      }

    // DELETE /api/target/:id - Delete target
    } else if (request.method === 'DELETE' && request.url.match(/^\/api\/target\/[a-fA-F0-9]{24}$/)) {
      try {
        const id = request.url.split('/')[3];

        const target = await Target.findByIdAndDelete(id);

        if (!target) {
          return reply.code(404).send({
            success: false,
            message: 'Target tidak ditemukan'
          });
        }

        reply.send({
          success: true,
          message: 'Target berhasil dihapus'
        });
      } catch (error) {
        console.error('Error deleting target:', error);
        reply.code(500).send({
          success: false,
          message: 'Error menghapus target',
          error: error.message
        });
      }

    // GET /api/target/by-kontrak/:kontrakId - Get all target for specific kontrak
    } else if (request.method === 'GET' && request.url.match(/^\/api\/target\/by-kontrak\/[a-fA-F0-9]{24}$/)) {
      try {
        const kontrakId = request.url.split('/')[4];

        const targets = await Target.find({ kontrakId })
          .populate('kontrakId')
          .sort({ tanggal: 1 });

        reply.send({
          success: true,
          data: targets,
          total: targets.length
        });
      } catch (error) {
        console.error('Error fetching target by kontrak:', error);
        reply.code(500).send({
          success: false,
          message: 'Error fetching target data',
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
    console.error('Error in targetRouter:', error);
    reply.code(500).send({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

export default targetRouter;