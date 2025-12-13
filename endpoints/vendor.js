import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Kontrak from '../models/Kontrak.js';
import Termin from '../models/Termin.js';
import User from '../models/User.js';
import Penyedia from '../models/Penyedia.js';

const vendorRouter = async (request, reply) => {
  try {
    // Debug logging
    console.log('DEBUG: vendor router request.url =', request.url);
    console.log('DEBUG: vendor router request.method =', request.method);
    
    // Get budget year from current user
    const token = request.headers.authorization?.replace('Bearer ', '');
    let budgetYear = { year: 2026, status: 'Murni' };
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const currentUser = await User.findById(decoded.userId);
        if (currentUser && currentUser.budgetYear) {
          budgetYear = currentUser.budgetYear;
        }
      } catch (error) {
        console.error('Error getting user budget year:', error);
      }
    }

    if (request.url.startsWith('/api/kontrak/by-penyedia') && request.method === 'GET') {
      // Get contracts by penyedia
      const url = new URL(request.url, `http://${request.headers.host}`);
      const penyediaId = url.searchParams.get('penyediaId');
      const budgetYearParam = url.searchParams.get('budgetYear');

      if (!penyediaId) {
        return reply.code(400).send({
          success: false,
          message: 'penyediaId parameter is required'
        });
      }

      console.log('🔍 Getting kontrak for penyediaId:', penyediaId, 'budgetYear:', budgetYearParam);

      const filter = {
        penyediaId: penyediaId,
        budgetYear: budgetYearParam || '2026-Murni'
      };

      const kontrak = await Kontrak.find(filter)
        .populate('penyediaId', 'NamaVendor')
        .populate('subPerangkatDaerahId', 'nama')
        .populate('paketKegiatanId', 'nama')
        .sort({ createdAt: -1 });

      // Add termin data to kontrak
      const kontrakWithTermin = await Promise.all(
        kontrak.map(async (k) => {
          const termin = await Termin.find({ kontrakId: k._id }).sort({ createdAt: 1 });
          return {
            ...k.toObject(),
            termin: termin
          };
        })
      );

      console.log('✅ Found kontrak:', kontrakWithTermin.length);

      return reply.code(200).send({
        success: true,
        data: kontrakWithTermin
      });

    } else if (request.url.startsWith('/api/termin/by-kontrak') && request.method === 'GET') {
      // Get termin by kontrak
      const url = new URL(request.url, `http://${request.headers.host}`);
      const kontrakId = url.searchParams.get('kontrakId');

      if (!kontrakId) {
        return reply.code(400).send({
          success: false,
          message: 'kontrakId parameter is required'
        });
      }

      console.log('🔍 Getting termin for kontrakId:', kontrakId);

      const termin = await Termin.find({ kontrakId: kontrakId })
        .sort({ createdAt: 1 });

      console.log('✅ Found termin:', termin.length);

      return reply.code(200).send({
        success: true,
        data: termin
      });

    } else if (request.url === '/api/vendor/realisasi' && request.method === 'POST') {
      // Save vendor realisasi
      try {
        console.log('📝 Saving vendor realisasi...');
        console.log('🔍 Content-Type:', request.headers['content-type']);
        console.log('🔍 Request body type:', typeof request.body);
        console.log('🔍 Request body keys:', Object.keys(request.body || {}));
        
        // Fastify has already parsed the multipart data into request.body
        // Each field is an object with type, value, fieldname properties
        let formData = {};
        
        if (request.isMultipart()) {
          console.log('🔄 Processing parsed multipart data...');
          
          // Extract values from the parsed multipart structure
          for (const [key, fieldObj] of Object.entries(request.body)) {
            if (fieldObj.type === 'file') {
              // Handle file upload
              console.log('📁 Processing file:', fieldObj.filename);
              try {
                const fileBuffer = await fieldObj.toBuffer();
                formData.laporanFile = {
                  buffer: fileBuffer,
                  filename: fieldObj.filename,
                  contentType: fieldObj.mimetype
                };
                console.log('✅ File processed:', {
                  size: fileBuffer.length,
                  type: fieldObj.mimetype
                });
              } catch (fileError) {
                console.error('❌ Error processing file:', fileError);
                // Continue without file data
              }
            } else if (fieldObj.type === 'field') {
              // Handle text fields
              console.log('📝 Processing field:', fieldObj.fieldname, '=', fieldObj.value);
              formData[fieldObj.fieldname] = fieldObj.value;
            }
          }
        } else {
          // Handle regular form data (not multipart)
          console.log('🔄 Processing regular form data...');
          formData = request.body || {};
        }

        console.log(' Final parsed form data:', formData);

        // Extract fields from form data
        const {
          terminId,
          laporanDate,
          periodeMulai,
          periodeSampai,
          realisasiFisik,
          realisasiBelanja
        } = formData;

        // Validate required fields
        if (!terminId || !laporanDate || !periodeMulai || !periodeSampai) {
          return reply.code(400).send({
            success: false,
            message: 'terminId, laporanDate, periodeMulai, and periodeSampai are required'
          });
        }

        // Validate numeric values
        const fisik = parseFloat(realisasiFisik) || 0;
        const belanja = parseFloat(realisasiBelanja) || 0;

        if (fisik < 0 || fisik > 100) {
          return reply.code(400).send({
            success: false,
            message: 'realisasiFisik must be between 0-100'
          });
        }

        if (belanja < 0) {
          return reply.code(400).send({
            success: false,
            message: 'realisasiBelanja cannot be negative'
          });
        }

        console.log('🔍 Updating termin:', terminId);

        // Prepare update data
        const updateData = {
          realisasiFisik: fisik,
          realisasiBelanja: belanja,
          laporanDate: new Date(laporanDate),
          periodeMulai: new Date(periodeMulai),
          periodeSampai: new Date(periodeSampai),
          updatedBy: 'vendor', // This should be the actual vendor username
          updatedAt: new Date()
        };

        // Add file data if uploaded
        if (formData.laporanFile && formData.laporanFile.buffer) {
          const { buffer, filename, contentType } = formData.laporanFile;
          updateData.laporanFile = {
            filename: filename,
            contentType: contentType,
            data: buffer,
            uploadDate: new Date()
          };
          console.log('📄 File data prepared for storage:', {
            filename: filename,
            size: buffer.length,
            type: contentType
          });
        }

        // Update termin with realisasi data
        const updatedTermin = await Termin.findByIdAndUpdate(
          terminId,
          updateData,
          { new: true }
        );

        if (!updatedTermin) {
          return reply.code(404).send({
            success: false,
            message: 'Termin not found'
          });
        }

        console.log('✅ Termin updated successfully:', updatedTermin._id);

        return reply.code(200).send({
          success: true,
          data: updatedTermin,
          message: 'Realisasi berhasil disimpan'
        });

      } catch (error) {
        console.error('Error saving realisasi:', error);
        return reply.code(500).send({
          success: false,
          message: `Gagal menyimpan realisasi: ${error.message}`,
          error: error.message
        });
      }

    } else if (request.url === '/api/vendor/dashboard' && request.method === 'GET') {
      // Get vendor dashboard data
      const url = new URL(request.url, `http://${request.headers.host}`);
      const penyediaId = url.searchParams.get('penyediaId');
      const budgetYearParam = url.searchParams.get('budgetYear');

      if (!penyediaId) {
        return reply.code(400).send({
          success: false,
          message: 'penyediaId parameter is required'
        });
      }

      console.log('📊 Getting dashboard data for penyediaId:', penyediaId);

      // Get contracts
      const kontrak = await Kontrak.find({
        penyediaId: penyediaId,
        budgetYear: budgetYearParam || '2026-Murni'
      });

      // Calculate statistics
      const totalKontrak = kontrak.length;
      const kontrakSelesai = kontrak.filter(k => k.status === 'completed').length;
      const kontrakAktif = kontrak.filter(k => {
        const today = new Date();
        const endDate = new Date(k.tglPelaksanaanSampai);
        return endDate > today && k.status !== 'completed';
      }).length;
      const kontrakTerlambat = kontrak.filter(k => {
        const today = new Date();
        const endDate = new Date(k.tglPelaksanaanSampai);
        return endDate < today && k.status !== 'completed';
      }).length;

      const dashboardData = {
        totalKontrak,
        kontrakSelesai,
        kontrakAktif,
        kontrakTerlambat,
        totalNilai: kontrak.reduce((sum, k) => sum + k.nilaiKontrak, 0)
      };

      console.log('✅ Dashboard data:', dashboardData);

      return reply.code(200).send({
        success: true,
        data: dashboardData
      });

    } else {
      // Method not allowed
      return reply.code(405).send({
        success: false,
        message: 'Method not allowed'
      });
    }
  } catch (error) {
    console.error('Vendor router error:', error);
    return reply.code(500).send({
      success: false,
      message: 'Internal server error'
    });
  }
};

async function parseMultipartData(buffer, boundary) {
  // This is a simplified implementation for text fields
  // For production with file uploads, use a proper library like 'busboy' or 'multer'
  const parts = buffer.toString().split(`--${boundary}`);
  const formData = {};
  
  for (const part of parts) {
    if (part.includes('Content-Disposition') && part.includes('form-data')) {
      const lines = part.split('\r\n');
      const nameMatch = lines.find(line => line.includes('name="'));
      
      if (nameMatch) {
        const name = nameMatch.split('name="')[1].split('"')[0];
        
        // Check if this part contains a file
        const filenameMatch = lines.find(line => line.includes('filename="'));
        
        if (filenameMatch) {
          // This is a file upload - for now, we'll just note that a file was uploaded
          // In production, you'd want to properly handle the file buffer
          formData[name] = '[FILE_UPLOADED]';
        } else {
          // This is a text field
          const value = lines[lines.length - 1].trim();
          formData[name] = value;
        }
      }
    }
  }
  
  return formData;
}

export default vendorRouter;