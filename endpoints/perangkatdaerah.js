import PerangkatDaerah from '../models/PerangkatDaerah.js';
import sharp from 'sharp';

// Process perangkat daerah data (create or update)
async function processPerangkatDaerah(data, reply) {
  const { _id, namaPemda, nama, alamat, kodeOrganisasi, email, telepon, website, jenis, logo } = data;

  // Process logo if provided
  let processedLogo = null;
  if (logo) {
    console.log('Processing logo data');
    try {
      // Check if it's a data URL
      if (logo.startsWith('data:')) {
        // Extract base64 data and content type
        const dataUrlParts = logo.split(',');
        const mimeMatch = logo.match(/data:([^;]+)/);
        const base64Data = dataUrlParts[1];
        const originalContentType = mimeMatch ? mimeMatch[1] : 'image/png';

        console.log('Original content type:', originalContentType);
        console.log('Base64 data length:', base64Data.length);

        // Convert to buffer
        const buffer = Buffer.from(base64Data, 'base64');
        console.log('Buffer length after conversion:', buffer.length);

        // Validate if buffer is a valid image by checking magic numbers
        const isPNG = buffer.length > 8 &&
          buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
          buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A;

        const isJPEG = buffer.length > 2 &&
          buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;

        console.log('Is PNG:', isPNG, 'Is JPEG:', isJPEG);
        console.log('Buffer first 20 bytes:', buffer.slice(0, 20).toString('hex'));

        if (!isPNG && !isJPEG) {
          console.error('Invalid image format detected');
          console.error('Expected PNG or JPEG magic numbers not found');
          throw new Error('Invalid image format');
        }

        // Process image with Sharp for optimal logo size
        console.log('Processing image with Sharp for logo optimization');

        try {
          // Use Sharp to resize and optimize the image for logo use
          let sharpInstance = sharp(buffer);

          // Get original image metadata
          const metadata = await sharpInstance.metadata();
          console.log('Original image metadata:', {
            width: metadata.width,
            height: metadata.height,
            format: metadata.format,
            channels: metadata.channels,
            density: metadata.density,
            hasProfile: metadata.hasProfile,
            hasAlpha: metadata.hasAlpha
          });

          // Resize to optimal logo dimensions (200x200px) while maintaining aspect ratio
          // Use fit: 'inside' to ensure the entire image fits within the dimensions
          sharpInstance = sharpInstance.resize(200, 200, {
            fit: 'inside',
            withoutEnlargement: true // Don't enlarge small images
          });

          // Convert to PNG for consistent format (better for logos with transparency)
          if (originalContentType === 'image/png' || metadata.hasAlpha) {
            // Keep as PNG if original was PNG or has transparency
            sharpInstance = sharpInstance.png({
              compressionLevel: 6, // Balance between size and quality (0-9)
              quality: 90 // High quality for logos
            });
            const processedContentType = 'image/png';
            console.log('Converting to PNG format for logo');
          } else {
            // Convert to JPEG for other formats
            sharpInstance = sharpInstance.jpeg({
              quality: 90, // High quality for logos
              progressive: true // Progressive JPEG for better loading
            });
            const processedContentType = 'image/jpeg';
            console.log('Converting to JPEG format for logo');
          }

          // Process the image
          const processedBuffer = await sharpInstance.toBuffer();
          console.log('Sharp processing completed');
          console.log('Processed buffer length:', processedBuffer.length);
          console.log('Original buffer length:', buffer.length);
          console.log('Size reduction:', Math.round((1 - processedBuffer.length / buffer.length) * 100) + '%');

          // Validate processed buffer format
          const processedIsPNG = processedBuffer.length > 8 &&
            processedBuffer[0] === 0x89 && processedBuffer[1] === 0x50 &&
            processedBuffer[2] === 0x4E && processedBuffer[3] === 0x47 &&
            processedBuffer[4] === 0x0D && processedBuffer[5] === 0x0A &&
            processedBuffer[6] === 0x1A && processedBuffer[7] === 0x0A;

          const processedIsJPEG = processedBuffer.length > 2 &&
            processedBuffer[0] === 0xFF && processedBuffer[1] === 0xD8 && processedBuffer[2] === 0xFF;

          console.log('Processed buffer is valid PNG:', processedIsPNG);
          console.log('Processed buffer is valid JPEG:', processedIsJPEG);

          if (!processedIsPNG && !processedIsJPEG) {
            console.error('Processed buffer is not valid image format');
            throw new Error('Sharp processing resulted in invalid image format');
          }

          // Determine content type based on processed format
          const finalContentType = processedIsPNG ? 'image/png' : 'image/jpeg';
          console.log('Final content type:', finalContentType);

          // Convert buffer to base64 for database storage
          processedLogo = {
            data: processedBuffer.toString('base64'),
            contentType: finalContentType
          };

          console.log('Logo processed successfully with Sharp');
          console.log('Final logo size:', processedBuffer.length, 'bytes');
          console.log('Base64 length:', processedLogo.data.length);

        } catch (sharpError) {
          console.error('Error processing image with Sharp:', sharpError);
          console.error('Falling back to original buffer');

          // Fallback to original buffer if Sharp processing fails
          const processedBuffer = buffer;

          // Validate original buffer format
          const originalIsPNG = processedBuffer.length > 8 &&
            processedBuffer[0] === 0x89 && processedBuffer[1] === 0x50 &&
            processedBuffer[2] === 0x4E && processedBuffer[3] === 0x47 &&
            processedBuffer[4] === 0x0D && processedBuffer[5] === 0x0A &&
            processedBuffer[6] === 0x1A && processedBuffer[7] === 0x0A;

          const originalIsJPEG = processedBuffer.length > 2 &&
            processedBuffer[0] === 0xFF && processedBuffer[1] === 0xD8 && processedBuffer[2] === 0xFF;

          if (!originalIsPNG && !originalIsJPEG) {
            console.error('Original buffer is also not valid after Sharp failure');
            throw new Error('Invalid image format');
          }

          // Update content type based on actual format
          const fallbackContentType = originalIsPNG ? 'image/png' : 'image/jpeg';

          processedLogo = {
            data: processedBuffer.toString('base64'),
            contentType: fallbackContentType
          };

          console.log('Used fallback processing - logo saved with original size');
        }
      } else {
        // Handle direct file buffer upload (for form data)
        console.log('Processing direct buffer upload');
        console.log('Direct buffer type:', typeof logo);
        console.log('Direct buffer length:', logo.length);

        // Process direct buffer with Sharp for logo optimization
        console.log('Processing direct buffer with Sharp for logo optimization');

        try {
          // Get buffer metadata first
          const metadata = await sharp(logo).metadata();
          console.log('Direct buffer metadata:', {
            width: metadata.width,
            height: metadata.height,
            format: metadata.format,
            channels: metadata.channels,
            hasAlpha: metadata.hasAlpha
          });

          // Resize to optimal logo dimensions
          let sharpInstance = sharp(logo).resize(200, 200, {
            fit: 'inside',
            withoutEnlargement: true
          });

          // Handle format based on original or transparency
          if (metadata.format === 'png' || metadata.hasAlpha) {
            sharpInstance = sharpInstance.png({
              compressionLevel: 6,
              quality: 90
            });
            const processedContentType = 'image/png';
            console.log('Converting direct buffer to PNG format for logo');
          } else {
            sharpInstance = sharpInstance.jpeg({
              quality: 90,
              progressive: true
            });
            const processedContentType = 'image/jpeg';
            console.log('Converting direct buffer to JPEG format for logo');
          }

          const processedBuffer = await sharpInstance.toBuffer();
          console.log('Direct buffer Sharp processing completed');
          console.log('Original buffer length:', logo.length);
          console.log('Processed buffer length:', processedBuffer.length);

          // Validate processed buffer
          const isPNG = processedBuffer.length > 8 &&
            processedBuffer[0] === 0x89 && processedBuffer[1] === 0x50 &&
            processedBuffer[2] === 0x4E && processedBuffer[3] === 0x47;

          const isJPEG = processedBuffer.length > 2 &&
            processedBuffer[0] === 0xFF && processedBuffer[1] === 0xD8 && processedBuffer[2] === 0xFF;

          if (!isPNG && !isJPEG) {
            throw new Error('Sharp processing resulted in invalid image format');
          }

          const finalContentType = isPNG ? 'image/png' : 'image/jpeg';

          processedLogo = {
            data: processedBuffer.toString('base64'),
            contentType: finalContentType
          };

          console.log('Direct buffer logo processed successfully with Sharp');

        } catch (sharpError) {
          console.error('Error processing direct buffer with Sharp:', sharpError);

          // Fallback to original buffer if Sharp processing fails
          const isPNG = logo.length > 8 &&
            logo[0] === 0x89 && logo[1] === 0x50 && logo[2] === 0x4E && logo[3] === 0x47;

          const isJPEG = logo.length > 2 &&
            logo[0] === 0xFF && logo[1] === 0xD8 && logo[2] === 0xFF;

          if (!isPNG && !isJPEG) {
            throw new Error('Invalid image buffer format');
          }

          const fallbackContentType = isPNG ? 'image/png' : 'image/jpeg';

          processedLogo = {
            data: logo.toString('base64'),
            contentType: fallbackContentType
          };

          console.log('Used fallback processing for direct buffer');
        }
      }
    } catch (logoError) {
      console.error('Error processing logo:', logoError);
      console.error('Logo error stack:', logoError.stack);
      // Continue without logo if processing fails
    }
  }

  let perangkatDaerah;
  if (_id) {
    // Update existing
    console.log('Updating existing perangkat daerah with ID:', _id);
    perangkatDaerah = await PerangkatDaerah.findByIdAndUpdate(
      _id,
      {
        namaPemda,
        nama,
        alamat,
        kodeOrganisasi,
        email,
        telepon,
        website,
        jenis,
        ...(processedLogo && { logo: processedLogo })
      },
      { new: true, runValidators: true }
    );
  } else {
    // Check if kodeOrganisasi already exists
    console.log('Checking for existing kodeOrganisasi:', kodeOrganisasi);
    const existing = await PerangkatDaerah.findOne({ kodeOrganisasi });
    if (existing) {
      console.log('Kode organisasi already exists:', kodeOrganisasi);
      return reply.code(400).send({
        success: false,
        message: 'Kode organisasi sudah digunakan'
      });
    }

    // Create new
    console.log('Creating new perangkat daerah');
    perangkatDaerah = new PerangkatDaerah({
      namaPemda,
      nama,
      alamat,
      kodeOrganisasi,
      email,
      telepon,
      website,
      jenis,
      ...(processedLogo && { logo: processedLogo })
    });

    await perangkatDaerah.save();
  }

  console.log('Perangkat daerah saved successfully');
  return reply.code(200).send({
    success: true,
    data: perangkatDaerah
  });
}

const perangkatDaerahRouter = async (request, reply) => {
  try {
    if (request.url === '/api/perangkatdaerah' && request.method === 'GET') {
      // Get all perangkat daerah
      console.log('Fetching all perangkat daerah');
      const perangkatDaerah = await PerangkatDaerah.find({}).sort({ namaPemda: 1 });
      console.log('Found', perangkatDaerah.length, 'perangkat daerah');

      // Convert logo data for frontend compatibility
      const processedData = perangkatDaerah.map(item => {
        const itemObj = item.toObject();
        if (itemObj.logo && itemObj.logo.data) {
          try {
            console.log('Processing logo data for frontend');
            console.log('Logo data type:', typeof itemObj.logo.data);
            console.log('Logo data length:', itemObj.logo.data.length);

            // Handle different data types for logo
            if (Buffer.isBuffer(itemObj.logo.data)) {
              // Convert Buffer to base64 string
              itemObj.logo.data = itemObj.logo.data.toString('base64');
              console.log('Converted Buffer to base64, length:', itemObj.logo.data.length);
            } else if (typeof itemObj.logo.data === 'string') {
              // Data is already a string, ensure it's valid base64
              console.log('Logo data is already string, length:', itemObj.logo.data.length);
              // Basic validation - check if it's a reasonable length for base64
              if (itemObj.logo.data.length < 100) {
                console.warn('Warning: Logo data string seems too short');
              }
            } else if (itemObj.logo.data && typeof itemObj.logo.data === 'object') {
              // Handle MongoDB Binary object or other objects
              console.log('Processing logo data object:', itemObj.logo.data.constructor.name);
              try {
                const binaryData = itemObj.logo.data;

                if (binaryData && binaryData.buffer) {
                  // Convert Binary object to Buffer then to base64
                  const buffer = Buffer.from(binaryData.buffer);
                  itemObj.logo.data = buffer.toString('base64');
                  console.log('Converted Binary object to base64, length:', itemObj.logo.data.length);
                } else if (binaryData && binaryData.value && binaryData.value.buffer) {
                  // Alternative Binary object structure
                  const buffer = Buffer.from(binaryData.value.buffer);
                  itemObj.logo.data = buffer.toString('base64');
                  console.log('Converted alternative Binary object to base64, length:', itemObj.logo.data.length);
                } else if (binaryData && binaryData.value) {
                  // Handle direct buffer access
                  const buffer = Buffer.from(binaryData.value);
                  itemObj.logo.data = buffer.toString('base64');
                  console.log('Converted Binary value to base64, length:', itemObj.logo.data.length);
                } else {
                  console.warn('Binary object structure not recognized');
                  console.warn('Binary object properties:', Object.keys(binaryData || {}));
                  delete itemObj.logo;
                }
              } catch (binaryError) {
                console.error('Error converting Binary object:', binaryError);
                console.error('Binary object structure:', binaryData);
                delete itemObj.logo;
              }
            } else {
              console.warn('Unknown logo data type:', typeof itemObj.logo.data);
              console.warn('Logo data constructor:', itemObj.logo.data ? itemObj.logo.data.constructor.name : 'null');
              console.warn('Logo data value:', itemObj.logo.data);
            }
          } catch (conversionError) {
            console.error('Error converting logo data:', conversionError);
            console.error('Error stack:', conversionError.stack);
            // Remove corrupted logo data
            delete itemObj.logo;
          }
        } else {
          console.log('No logo data found for item');
        }
        return itemObj;
      });

      // Return data in the expected format
      return reply.code(200).send({
        success: true,
        data: processedData
      });

    } else if (request.url === '/api/perangkatdaerah/clear-logo' && request.method === 'POST') {
      console.log('Handling clear logo request');

      try {
        const perangkatDaerah = await PerangkatDaerah.findOne({});
        if (perangkatDaerah) {
          perangkatDaerah.logo = undefined;
          await perangkatDaerah.save();
          console.log('Logo cleared successfully');
        }

        return reply.code(200).send({
          success: true,
          message: 'Logo cleared successfully'
        });
      } catch (error) {
        console.error('Error clearing logo:', error);
        return reply.code(500).send({
          success: false,
          message: 'Failed to clear logo'
        });
      }

    } else if (request.url === '/api/perangkatdaerah/raw-logo' && request.method === 'POST') {
      console.log('Handling raw logo upload - no processing');

      try {
        const logoDataUrl = request.body.logo;
        console.log('Raw logo data URL length:', logoDataUrl.length);

        // Parse data URL to extract base64 and content type
        const matches = logoDataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) {
          throw new Error('Invalid data URL format');
        }

        const [, contentType, base64Data] = matches;
        console.log('Extracted content type:', contentType);
        console.log('Base64 data length:', base64Data.length);

        const perangkatDaerah = await PerangkatDaerah.findOne({});
        if (perangkatDaerah) {
          // Store logo with proper structure
          perangkatDaerah.logo = {
            data: base64Data,
            contentType: contentType
          };
          await perangkatDaerah.save();
          console.log('Raw logo stored successfully');
        }

        return reply.code(200).send({
          success: true,
          message: 'Raw logo stored successfully',
          contentType: contentType,
          dataLength: base64Data.length
        });
      } catch (error) {
        console.error('Error storing raw logo:', error);
        return reply.code(500).send({
          success: false,
          message: error.message || 'Failed to store raw logo'
        });
      }

    } else if (request.url === '/api/perangkatdaerah/test-logo' && request.method === 'POST') {
      console.log('Handling test logo request - bypass Sharp processing');

      try {
        const perangkatDaerah = await PerangkatDaerah.findOne({});
        if (perangkatDaerah && perangkatDaerah.logo && perangkatDaerah.logo.data) {
          // Return current logo data for testing
          return reply.code(200).send({
            success: true,
            logo: perangkatDaerah.logo,
            message: 'Current logo data for testing'
          });
        } else {
          return reply.code(404).send({
            success: false,
            message: 'No logo data found'
          });
        }
      } catch (error) {
        console.error('Error in test logo:', error);
        return reply.code(500).send({
          success: false,
          message: 'Failed to get logo data'
        });
      }

    } else if (request.url === '/api/perangkatdaerah' && request.method === 'POST') {
      console.log('Handling POST request to /api/perangkatdaerah');
      console.log('Request body:', request.body);

      try {
        // Create or update perangkat daerah
        const { _id, namaPemda, nama, alamat, kodeOrganisasi, email, telepon, website, jenis, logo } = request.body;

        return await processPerangkatDaerah(request.body, reply);

      } catch (error) {
        console.error('Error saving perangkat daerah:', error);
        return reply.code(400).send({
          success: false,
          message: error.message
        });
      }

    } else if (request.url.startsWith('/api/perangkatdaerah/') && request.method === 'PUT') {
      console.log('Handling PUT request to', request.url);
      console.log('Request body:', request.body);

      try {
        // Extract ID from URL
        const id = request.url.replace('/api/perangkatdaerah/', '');
        console.log('Updating perangkat daerah with ID:', id);

        // Add _id to the request body for processing
        const dataWithId = { ...request.body, _id: id };
        return await processPerangkatDaerah(dataWithId, reply);

      } catch (error) {
        console.error('Error updating perangkat daerah:', error);
        return reply.code(400).send({
          success: false,
          message: error.message
        });
      }

    } else if (request.url.startsWith('/api/perangkatdaerah/') && request.method === 'DELETE') {
      console.log('Handling DELETE request to', request.url);

      try {
        // Extract ID from URL
        const id = request.url.replace('/api/perangkatdaerah/', '');

        const perangkatDaerah = await PerangkatDaerah.findByIdAndDelete(id);
        if (!perangkatDaerah) {
          return reply.code(404).send({
            success: false,
            message: 'Perangkat daerah tidak ditemukan'
          });
        }

        console.log('Perangkat daerah deleted successfully');
        return reply.code(200).send({
          success: true,
          message: 'Perangkat daerah berhasil dihapus',
          data: perangkatDaerah
        });
      } catch (error) {
        console.error('Error deleting perangkat daerah:', error);
        return reply.code(400).send({
          success: false,
          message: error.message
        });
      }
    } else {
      // Method not allowed
      return reply.code(405).send({
        success: false,
        message: 'Method not allowed'
      });
    }
  } catch (error) {
    console.error('Error in perangkatDaerahRouter:', error);
    return reply.code(500).send({
      success: false,
      message: 'Internal server error'
    });
  }
};

export default perangkatDaerahRouter;