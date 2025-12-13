import Pejabat from '../models/Pejabat.js';
import SubPerangkatDaerah from '../models/SubPerangkatDaerah.js';

const pejabatRouter = async (request, reply) => {
  try {
    if (request.method === 'GET') {
      // Parse query parameters for filtering
      const { jabatanFungsional, status } = request.query;

      let filter = {};
      if (jabatanFungsional) filter.jabatanFungsional = jabatanFungsional;
      if (status) filter.status = status;

      console.log('Fetching pejabat with filter:', filter);
      const pejabat = await Pejabat.find(filter).sort({ nama: 1 });
      console.log('Found', pejabat.length, 'pejabat matching filter');

      reply.send({
        success: true,
        data: pejabat
      });

    } else if (request.method === 'POST') {
      console.log('Handling POST request to /api/pejabat');
      console.log('Request body:', request.body);

      try {
        const { nama, jabatanStrukturalList, jabatanStruktural, jabatanFungsional, email, telepon, status, nip } = request.body;

        // Validate required fields
        if (!nama || (!jabatanStrukturalList?.length && !jabatanStruktural && !jabatanFungsional) || !email || !telepon || !status || !nip) {
          reply.code(400).send({
            success: false,
            message: 'Nama, minimal satu Jabatan (Struktural atau Fungsional), Email, Telepon, Status, dan NIP harus diisi'
          });
          return;
        }

        // Check if NIP already exists
        console.log('Checking for existing NIP:', nip);
        const existing = await Pejabat.findOne({ nip });
        if (existing) {
          console.log('NIP already exists:', nip);
          reply.code(400).send({
            success: false,
            message: 'NIP sudah terdaftar'
          });
          return;
        }

        // Validate Jabatan Struktural positions and check conflicts
        if (jabatanStrukturalList && jabatanStrukturalList.length > 0) {
          for (const position of jabatanStrukturalList) {
            await validateJabatanStruktural(position, reply);
          }
        }

        // Create new pejabat with new structure
        console.log('Creating new pejabat');
        const pejabatData = {
          nama,
          email,
          telepon,
          status,
          nip,
          jabatanFungsional: jabatanFungsional || null
        };

        // Add Jabatan Struktural positions if provided
        if (jabatanStrukturalList && jabatanStrukturalList.length > 0) {
          pejabatData.jabatanStrukturalList = jabatanStrukturalList;
          // Keep backward compatibility
          pejabatData.jabatanStruktural = jabatanStrukturalList[0]?.position || null;
        } else if (jabatanStruktural) {
          // Legacy support
          pejabatData.jabatanStruktural = jabatanStruktural;
        }

        const pejabat = new Pejabat(pejabatData);
        await pejabat.save();
        console.log('Pejabat saved successfully');

        reply.send({
          success: true,
          data: pejabat
        });

      } catch (error) {
        console.error('Error saving pejabat:', error);
        reply.code(400).send({
          success: false,
          message: error.message
        });
      }

    } else if (request.method === 'PUT') {
      console.log('Handling PUT request to', request.url);
      console.log('Request body:', request.body);

      try {
        // Extract ID from URL
        const id = request.params.id;
        console.log('Updating pejabat with ID:', id);

        const { nama, jabatanStrukturalList, jabatanStruktural, jabatanFungsional, email, telepon, status, nip } = request.body;

        // Validate required fields
        if (!nama || (!jabatanStrukturalList?.length && !jabatanStruktural && !jabatanFungsional) || !email || !telepon || !status || !nip) {
          reply.code(400).send({
            success: false,
            message: 'Nama, minimal satu Jabatan (Struktural atau Fungsional), Email, Telepon, Status, dan NIP harus diisi'
          });
          return;
        }

        // Check if NIP already exists (excluding current record)
        console.log('Checking for existing NIP:', nip);
        const existing = await Pejabat.findOne({ nip, _id: { $ne: id } });
        if (existing) {
          console.log('NIP already exists:', nip);
          reply.code(400).send({
            success: false,
            message: 'NIP sudah terdaftar'
          });
          return;
        }

        // Validate Jabatan Struktural positions and check conflicts
        if (jabatanStrukturalList && jabatanStrukturalList.length > 0) {
          for (const position of jabatanStrukturalList) {
            await validateJabatanStruktural(position, reply, id);
          }
        }

        // Prepare update data
        const updateData = {
          nama,
          email,
          telepon,
          status,
          nip,
          jabatanFungsional: jabatanFungsional || null
        };

        // Add Jabatan Struktural positions if provided
        if (jabatanStrukturalList && jabatanStrukturalList.length > 0) {
          updateData.jabatanStrukturalList = jabatanStrukturalList;
          updateData.jabatanStruktural = jabatanStrukturalList[0]?.position || null;
        } else if (jabatanStruktural) {
          updateData.jabatanStruktural = jabatanStruktural;
        }

        // Update pejabat
        const pejabat = await Pejabat.findByIdAndUpdate(
          id,
          updateData,
          { new: true, runValidators: true }
        );

        if (!pejabat) {
          reply.code(404).send({
            success: false,
            message: 'Pejabat tidak ditemukan'
          });
          return;
        }

        console.log('Pejabat updated successfully');
        reply.send({
          success: true,
          data: pejabat
        });

      } catch (error) {
        console.error('Error updating pejabat:', error);
        reply.code(400).send({
          success: false,
          message: error.message
        });
      }

    } else if (request.method === 'DELETE') {
      console.log('Handling DELETE request to', request.url);

      try {
        // Extract ID from URL
        const id = request.params.id;

        const pejabat = await Pejabat.findByIdAndDelete(id);
        if (!pejabat) {
          reply.code(404).send({
            success: false,
            message: 'Pejabat tidak ditemukan'
          });
          return;
        }

        console.log('Pejabat deleted successfully');
        reply.send({
          success: true,
          message: 'Pejabat berhasil dihapus',
          data: pejabat
        });
      } catch (error) {
        console.error('Error deleting pejabat:', error);
        reply.code(400).send({
          success: false,
          message: error.message
        });
      }
    } else {
      // Method not allowed
      reply.code(405).send({
        success: false,
        message: 'Method not allowed'
      });
    }
  } catch (error) {
    console.error('Error in pejabatRouter:', error);
    reply.code(500).send({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Helper function to validate Jabatan Struktural position
async function validateJabatanStruktural(position, reply, excludeId = null) {
  const { position: positionName, subOrganisasiId } = position;

  // Check if position is Kepala or plt. Kepala and validate business rules
  if (positionName && subOrganisasiId) {
    // Extract role from position name (Kepala or plt. Kepala)
    const isKepala = positionName.startsWith('Kepala ');
    const isPltKepala = positionName.startsWith('Plt. Kepala ');
    const subOrgName = await getSubOrgName(subOrganisasiId);
    
    if (isKepala || isPltKepala) {
      // CRITICAL BUSINESS RULE: Cannot have both Kepala and plt. Kepala in same sub-organisasi
      const conflictingRole = isKepala ? 'Plt. Kepala ' : 'Kepala ';
      const conflictingPosition = `${conflictingRole}${subOrgName}`;
      
      // Check for existing conflicting position
      const conflictingQuery = {
        'jabatanStrukturalList.position': conflictingPosition,
        'jabatanStrukturalList.isActive': true
      };
      
      if (excludeId) {
        conflictingQuery._id = { $ne: excludeId };
      }
      
      const existingConflicting = await Pejabat.findOne(conflictingQuery);
      
      if (existingConflicting) {
        // More user-friendly error message with action guidance
        const conflictMessage = `Pimpinan untuk sub organisasi ini sudah ada. Silakan hapus Jabatan ini dari Pejabat lama terlebih dahulu.`;
        reply.code(400).send({
          success: false,
          message: conflictMessage,
          code: 'DUPLICATE_ROLE_CONFLICT',
          data: {
            conflictWith: existingConflicting.nama,
            position: conflictingPosition,
            requestedPosition: positionName
          }
        });
        return false;
      }
      
      // Check if position is already taken by another person
      const query = {
        'jabatanStrukturalList.position': positionName,
        'jabatanStrukturalList.isActive': true
      };

      if (excludeId) {
        query._id = { $ne: excludeId };
      }

      const existingPejabat = await Pejabat.findOne(query);

      if (existingPejabat) {
        // More user-friendly error message with action guidance
        const conflictMessage = `Pimpinan untuk sub organisasi ini sudah ada. Silakan hapus Jabatan ini dari Pejabat lama terlebih dahulu.`;
        reply.code(400).send({
          success: false,
          message: conflictMessage,
          code: 'POSITION_CONFLICT',
          data: {
            conflictWith: existingPejabat.nama,
            position: positionName
          }
        });
        return false;
      }
    }
  }

  return true;
}

// Helper function to get sub organization name
async function getSubOrgName(subOrganisasiId) {
  try {
    const subOrg = await SubPerangkatDaerah.findById(subOrganisasiId);
    return subOrg ? subOrg.nama : '';
  } catch (error) {
    console.error('Error fetching sub organization name:', error);
    return '';
  }
}

// Endpoint to check position availability
const checkPositionHandler = async (request, reply) => {
  try {
    const { position, subOrganisasiId, excludeId } = request.query;

    if (!position) {
      reply.code(400).send({
        success: false,
        message: 'Position parameter is required'
      });
      return;
    }

    let query = {
      'jabatanStrukturalList.position': position,
      'jabatanStrukturalList.isActive': true
    };

    if (subOrganisasiId) {
      query['jabatanStrukturalList.subOrganisasiId'] = subOrganisasiId;
    }

    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const existingPejabat = await Pejabat.findOne(query);

    reply.send({
      success: true,
      data: {
        isAvailable: !existingPejabat,
        conflictWith: existingPejabat ? {
          id: existingPejabat._id,
          nama: existingPejabat.nama
        } : null
      }
    });

  } catch (error) {
    console.error('Error checking position availability:', error);
    reply.code(500).send({
      success: false,
      message: 'Internal server error'
    });
  }
};

export default pejabatRouter;
export { checkPositionHandler };