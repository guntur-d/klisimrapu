import mongoose from 'mongoose';
import Termin from '../models/Termin.js';
import Kontrak from '../models/Kontrak.js';

const terminRouter = async (request, reply) => {
  try {
    // GET /api/termin - Get all termin (with or without query params)
    if (request.method === 'GET' && request.url.startsWith('/api/termin')) {
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

        const termin = await Termin.find(filter)
          .populate('kontrakId')
          .limit(parseInt(limit))
          .skip(parseInt(skip))
          .sort(sort);

        const total = await Termin.countDocuments(filter);

        reply.send({
          success: true,
          data: termin,
          total,
          page: Math.floor(skip / limit) + 1,
          limit: parseInt(limit)
        });
      } catch (error) {
        console.error('Error fetching termin:', error);
        reply.code(500).send({
          success: false,
          message: 'Error fetching termin data',
          error: error.message
        });
      }

    // GET /api/termin/:id - Get single termin
    } else if (request.method === 'GET' && request.url.match(/^\/api\/termin\/[a-fA-F0-9]{24}$/)) {
      try {
        const id = request.url.split('/')[3];

        const termin = await Termin.findById(id)
          .populate('kontrakId');

        if (!termin) {
          return reply.code(404).send({
            success: false,
            message: 'Termin tidak ditemukan'
          });
        }

        reply.send({
          success: true,
          data: termin
        });
      } catch (error) {
        console.error('Error fetching termin:', error);
        reply.code(500).send({
          success: false,
          message: 'Error fetching termin data',
          error: error.message
        });
      }

    // POST /api/termin - Create new termin
    } else if (request.method === 'POST' && request.url.startsWith('/api/termin')) {
      try {
        const terminData = request.body;
        
        // Validate required fields
        const requiredFields = [
          'kontrakId',
          'termin',
          'persentaseDana',
          'jumlahDana',
          'progressPersen'
        ];

        for (const field of requiredFields) {
          if (!terminData[field] || terminData[field] === '') {
            return reply.code(400).send({
              success: false,
              message: `Field '${field}' wajib diisi`
            });
          }
        }

        // Validate percentages
        if (terminData.persentaseDana < 0 || terminData.persentaseDana > 100) {
          return reply.code(400).send({
            success: false,
            message: 'Persentase dana harus antara 0-100%'
          });
        }

        if (terminData.progressPersen < 0 || terminData.progressPersen > 100) {
          return reply.code(400).send({
            success: false,
            message: 'Progress harus antara 0-100%'
          });
        }

        // Validate that total progress doesn't exceed 100% for the same kontrak
        if (terminData.kontrakId && terminData.progressPersen > 0) {
          const existingTermins = await Termin.find({ 
            kontrakId: terminData.kontrakId,
            _id: { $ne: terminData._id } // Exclude current termin if updating
          });
          
          const totalExistingProgress = existingTermins.reduce((sum, t) => sum + (t.progressPersen || 0), 0);
          const totalProgress = totalExistingProgress + terminData.progressPersen;
          
          if (totalProgress > 100) {
            return reply.code(400).send({
              success: false,
              message: `Total progress untuk kontrak ini tidak boleh melebihi 100%. Progress saat ini: ${totalExistingProgress}%, progress baru: ${terminData.progressPersen}%`
            });
          }
        }

        // Validate that total termin amounts don't exceed contract value
        if (terminData.kontrakId && terminData.jumlahDana > 0) {
          const kontrak = await Kontrak.findById(terminData.kontrakId);
          if (kontrak) {
            const existingTermins = await Termin.find({ 
              kontrakId: terminData.kontrakId,
              _id: { $ne: terminData._id } // Exclude current termin if updating
            });
            
            const totalExistingAmount = existingTermins.reduce((sum, t) => sum + (t.jumlahDana || 0), 0);
            const totalAmount = totalExistingAmount + terminData.jumlahDana;
            
            if (totalAmount > kontrak.nilaiKontrak) {
              return reply.code(400).send({
                success: false,
                message: `Total jumlah dana untuk kontrak ini tidak boleh melebihi nilai kontrak. Total saat ini: Rp ${totalExistingAmount.toLocaleString('id-ID')}, jumlah baru: Rp ${terminData.jumlahDana.toLocaleString('id-ID')}`
              });
            }
          }
        }

        // Add created/updated by info
        terminData.createdBy = request.user?.userId || 'system';
        terminData.updatedBy = request.user?.userId || 'system';

        const termin = new Termin(terminData);
        await termin.save();

        // Populate the response
        const populatedTermin = await Termin.findById(termin._id)
          .populate('kontrakId');

        reply.code(201).send({
          success: true,
          message: 'Termin berhasil dibuat',
          data: populatedTermin
        });
      } catch (error) {
        console.error('Error creating termin:', error);
        reply.code(500).send({
          success: false,
          message: 'Error membuat termin',
          error: error.message
        });
      }

    // PUT /api/termin/:id - Update termin
    } else if (request.method === 'PUT' && request.url.match(/^\/api\/termin\/[a-fA-F0-9]{24}$/)) {
      try {
        const id = request.url.split('/')[3];
        const updateData = request.body;

        // Validate percentages if provided
        if (updateData.persentaseDana !== undefined) {
          if (updateData.persentaseDana < 0 || updateData.persentaseDana > 100) {
            return reply.code(400).send({
              success: false,
              message: 'Persentase dana harus antara 0-100%'
            });
          }
        }

        if (updateData.progressPersen !== undefined) {
          if (updateData.progressPersen < 0 || updateData.progressPersen > 100) {
            return reply.code(400).send({
              success: false,
              message: 'Progress harus antara 0-100%'
            });
          }
        }

        // Add updated by info
        updateData.updatedBy = request.user?.userId || 'system';

        const termin = await Termin.findByIdAndUpdate(
          id,
          updateData,
          { new: true, runValidators: true }
        ).populate('kontrakId');

        if (!termin) {
          return reply.code(404).send({
            success: false,
            message: 'Termin tidak ditemukan'
          });
        }

        reply.send({
          success: true,
          message: 'Termin berhasil diperbarui',
          data: termin
        });
      } catch (error) {
        console.error('Error updating termin:', error);
        reply.code(500).send({
          success: false,
          message: 'Error memperbarui termin',
          error: error.message
        });
      }

    // DELETE /api/termin/:id - Delete termin
    } else if (request.method === 'DELETE' && request.url.match(/^\/api\/termin\/[a-fA-F0-9]{24}$/)) {
      try {
        const id = request.url.split('/')[3];

        const termin = await Termin.findByIdAndDelete(id);

        if (!termin) {
          return reply.code(404).send({
            success: false,
            message: 'Termin tidak ditemukan'
          });
        }

        reply.send({
          success: true,
          message: 'Termin berhasil dihapus'
        });
      } catch (error) {
        console.error('Error deleting termin:', error);
        reply.code(500).send({
          success: false,
          message: 'Error menghapus termin',
          error: error.message
        });
      }

    // GET /api/termin/by-kontrak/:kontrakId - Get all termin for specific kontrak
    } else if (request.method === 'GET' && request.url.match(/^\/api\/termin\/by-kontrak\/[a-fA-F0-9]{24}$/)) {
      try {
        const kontrakId = request.url.split('/')[4];

        const termin = await Termin.find({ kontrakId })
          .populate('kontrakId');

        // Sort termin by termin field (I, II, III, IV, etc.)
        const sortedTermin = termin.sort((a, b) => {
          // Convert Roman numerals and numbers to comparable values
          const convertTerminToNumber = (termin) => {
            const terminStr = termin.toLowerCase().trim();
            
            // Roman numeral mapping
            const romanNumerals = {
              'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5,
              'vi': 6, 'vii': 7, 'viii': 8, 'ix': 9, 'x': 10,
              'xi': 11, 'xii': 12, 'xiii': 13, 'xiv': 14, 'xv': 15,
              'xvi': 16, 'xvii': 17, 'xviii': 18, 'xix': 19, 'xx': 20
            };
            
            // Regular numbers
            if (/^\d+$/.test(terminStr)) {
              return parseInt(terminStr);
            }
            
            // Roman numerals
            if (romanNumerals[terminStr]) {
              return romanNumerals[terminStr];
            }
            
            // Text descriptions (Pertama, Kedua, etc.) - assign sequential numbers
            const textTerms = {
              'pertama': 1, 'kedua': 2, 'ketiga': 3, 'keempat': 4, 'kelima': 5,
              'keenam': 6, 'ketujuh': 7, 'kedelapan': 8, 'kesembilan': 9, 'kesepuluh': 10,
              'awal': 1, 'akhir': 999, 'terakhir': 999
            };
            
            if (textTerms[terminStr]) {
              return textTerms[terminStr];
            }
            
            // Default: alphabetical sort for unknown termin types
            return terminStr.charCodeAt(0);
          };
          
          const aNum = convertTerminToNumber(a.termin);
          const bNum = convertTerminToNumber(b.termin);
          
          return aNum - bNum;
        });

        reply.send({
          success: true,
          data: sortedTermin,
          total: sortedTermin.length
        });
      } catch (error) {
        console.error('Error fetching termin by kontrak:', error);
        reply.code(500).send({
          success: false,
          message: 'Error fetching termin data',
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
    console.error('Error in terminRouter:', error);
    reply.code(500).send({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

export default terminRouter;