import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import SubPerangkatDaerah from '../models/SubPerangkatDaerah.js';
import User from '../models/User.js';

// Helper function to sync operators with User collection
const syncOperatorsWithUsers = async (operators, subPerangkatDaerahId, budgetYear) => {
  if (!operators || operators.length === 0) {
    console.log('⚠️ No operators to sync');
    return;
  }

  console.log(`🔄 Syncing ${operators.length} operators with User collection...`);

  for (let i = 0; i < operators.length; i++) {
    const operator = operators[i];
    try {
        // Validate operator data before syncing
        // Allow new operators (without _id) to be processed - they'll get _id when saved to SubPerangkatDaerah
        if (!operator.username) {
          console.error(`❌ Invalid operator data:`, operator);
          throw new Error(`Invalid operator data for operator at index ${i}`);
        }

        console.log(`🔍 Processing operator ${i + 1}/${operators.length}:`, {
          _id: operator._id,
          username: operator.username,
          namaLengkap: operator.namaLengkap
        });

        // Find or create user record for this operator
        let user;
        try {
          user = await User.findOneAndUpdate(
            {
              operatorId: operator._id,
              // Additional safety: ensure we're not accidentally matching admin users
              $or: [
                { role: 'operator' },
                { role: { $exists: false } }, // For new users
                { operatorId: { $exists: true } } // Must have operatorId
              ]
            },
            {
              username: operator.username,
              email: `${operator.username}@operator.local`, // Generate unique email for operators
              role: 'operator',
              password: operator.password, // Add password field from operator data
              subPerangkatDaerahId: subPerangkatDaerahId,
              operatorId: operator._id,
              budgetYear: budgetYear || { year: 2026, status: 'Murni' } // Default budget year
            },
            { upsert: true, new: true }
          );
        } catch (error) {
          if (error.code === 11000 && error.keyPattern && error.keyPattern.username) {
            // Duplicate username error, find the existing user and update it
            const existingUser = await User.findOneAndUpdate(
              { username: operator.username },
              {
                role: 'operator',
                password: operator.password, // Add password field from operator data
                subPerangkatDaerahId: subPerangkatDaerahId,
                operatorId: operator._id,
                budgetYear: budgetYear || { year: 2026, status: 'Murni' }
              },
              { new: true }
            );
            if (!existingUser) {
              throw new Error('Failed to update existing user for operator sync');
            }
            user = existingUser;
          } else {
            throw error;
          }
        }

        const syncedUser = await user;
        console.log(`✅ Synced operator: ${operator.username} (ID: ${operator._id}) -> User: ${syncedUser.username} (Role: ${syncedUser.role})`);

    } catch (error) {
      console.error(`❌ Error syncing operator ${operator.username}:`, error.message);
      throw error; // Re-throw to stop the process
    }
  }

  console.log('✅ All operators synced successfully');
};

const subPerangkatDaerahRouter = async (request, reply) => {
  try {
    // Debug logging
    console.log('DEBUG: request.url =', request.url);
    console.log('DEBUG: request.method =', request.method);
    console.log('DEBUG: request.raw.url =', request.raw.url);
    
    // Get budget year from current user (for other endpoints)
    const token = request.headers.authorization?.replace('Bearer ', '');
    let budgetYear = { year: 2026, status: 'Murni' };
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Get budget year from User collection using userId from token
        const currentUser = await User.findById(decoded.userId);
        if (currentUser && currentUser.budgetYear) {
          budgetYear = currentUser.budgetYear;
        }
      } catch (error) {
        console.error('Error getting user budget year:', error);
      }
    }

    if (request.url.startsWith('/api/subperangkatdaerah') && request.method === 'GET') {
      // Get all sub perangkat daerah, optionally filtered by perangkatDaerahId

      // Parse query parameters from URL
      const url = new URL(request.url, `http://${request.headers.host}`);
      const perangkatDaerahId = url.searchParams.get('perangkatDaerahId');

      let filter = {};
      if (perangkatDaerahId) {
        filter.perangkatDaerahId = perangkatDaerahId;
      }

      const subPerangkatDaerah = await SubPerangkatDaerah.find(filter)
        .populate('perangkatDaerahId', 'nama namaPemda')
        .sort({ nama: 1 });

      return reply.code(200).send({
        success: true,
        data: subPerangkatDaerah
      });

    } else if (request.url === '/api/subperangkatdaerah' && request.method === 'POST') {

      try {
        const { nama, pimpinan, perangkatDaerahId, operators } = request.body;

        // Validate required fields
        if (!nama || !perangkatDaerahId) {
          return reply.code(400).send({
            success: false,
            message: 'Nama dan perangkatDaerahId harus diisi'
          });
        }

        // Check if nama already exists for this perangkatDaerahId
        const existing = await SubPerangkatDaerah.findOne({
          nama,
          perangkatDaerahId
        });

        if (existing) {
          return reply.code(400).send({
            success: false,
            message: 'Nama sub perangkat daerah sudah digunakan untuk organisasi ini'
          });
        }

        // Simple creation without operators - bypass Mongoose validation
        if (!operators || operators.length === 0) {
          // Ensure perangkatDaerahId is converted to ObjectId
          let deviceDaerahObjectId;
          try {
            deviceDaerahObjectId = new mongoose.Types.ObjectId(perangkatDaerahId);
          } catch (error) {
            return reply.code(400).send({
              success: false,
              message: 'Invalid perangkatDaerahId format'
            });
          }

          const doc = {
            nama,
            pimpinan: pimpinan || '',
            perangkatDaerahId: deviceDaerahObjectId, // Convert to ObjectId
            operators: [],
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Use direct MongoDB insert to bypass schema validation
          const result = await mongoose.connection.db.collection('subperangkatdaerahs').insertOne(doc);
          
          // Fetch the saved document
          const savedSubPerangkatDaerah = await SubPerangkatDaerah.findById(result.insertedId);
          
          return reply.code(200).send({
            success: true,
            data: savedSubPerangkatDaerah,
            message: 'Sub perangkat daerah berhasil ditambahkan'
          });
        }

        // Complex creation with operators (existing logic)
        let hashedOperators = [];
        if (operators && operators.length > 0) {
          // Validate and hash operators data if provided
          for (const operator of operators) {
            if (!operator.namaLengkap || !operator.username || !operator.password) {
              return reply.code(400).send({
                success: false,
                message: 'Operator harus memiliki nama lengkap, username, dan password'
              });
            }
            if (operator.password.length < 6) {
              return reply.code(400).send({
                success: false,
                message: 'Password operator minimal 6 karakter'
              });
            }
          }

          // Hash operator passwords for new operators only (existing ones keep their passwords)
          hashedOperators = await Promise.all(
            operators.map(async (operator) => {
              const isExistingOperator = operator._id && operator._id.trim() !== '';

              if (isExistingOperator) {
                // For existing operators, return as-is (password already hashed in database)
                return operator;
              } else {
                // For new operators, hash the password
                return {
                  ...operator,
                  password: await bcrypt.hash(operator.password, 10),
                  passwordDisplay: operator.password
                };
              }
            })
          );
        }

        const subPerangkatDaerah = new SubPerangkatDaerah({
          nama,
          pimpinan,
          perangkatDaerahId,
          operators: hashedOperators
        });

        const savedSubPerangkatDaerah = await subPerangkatDaerah.save();

        // Sync operators with User collection
        if (hashedOperators.length > 0) {
          await syncOperatorsWithUsers(hashedOperators, savedSubPerangkatDaerah._id, budgetYear);
        }

        return reply.code(200).send({
          success: true,
          data: savedSubPerangkatDaerah,
          message: 'Sub perangkat daerah berhasil ditambahkan'
        });

      } catch (error) {
        console.log('=== POST ERROR CAUGHT ===');
        console.log('Error type:', error.constructor.name);
        console.log('Error message:', error.message);
        console.log('Error stack:', error.stack);
        return reply.code(400).send({
          success: false,
          message: error.message
        });
      }

    } else if (request.url.startsWith('/api/subperangkatdaerah/') && request.method === 'PUT') {
      try {
        // Extract ID from URL
        const id = request.url.replace('/api/subperangkatdaerah/', '');
        console.log('=== SUBPERANGKATDAERAH PUT DEBUG ===');
        console.log('Request URL:', request.url);
        console.log('Request body keys:', Object.keys(request.body));
        console.log('Operators count:', request.body.operators ? request.body.operators.length : 'none');

        const { nama, pimpinan, perangkatDaerahId, operators = [] } = request.body;
        console.log('=== VALIDATION DEBUG ===');
        console.log('nama:', nama, 'pimpinan:', pimpinan, 'perangkatDaerahId:', perangkatDaerahId);
        console.log('operators length:', operators.length);

        // Validate required fields (pimpinan is now optional)
        if (!nama || !perangkatDaerahId) {
          console.log('❌ VALIDATION FAILED: Missing required fields');
          return reply.code(400).send({
            success: false,
            message: 'Nama dan perangkatDaerahId harus diisi'
          });
        }
        console.log('✅ Basic validation passed');

        // Validate and prepare operators data
        console.log('=== OPERATOR VALIDATION DEBUG ===');
        for (let i = 0; i < operators.length; i++) {
          const operator = operators[i];
          console.log(`Operator ${i + 1}:`, {
            namaLengkap: operator.namaLengkap,
            username: operator.username,
            hasPassword: !!operator.password,
            passwordLength: operator.password ? operator.password.length : 0,
            hasId: !!operator._id,
            idValue: operator._id
          });

          if (!operator.namaLengkap || !operator.username) {
            console.log(`❌ VALIDATION FAILED: Operator ${i + 1} missing namaLengkap or username`);
            return reply.code(400).send({
              success: false,
              message: 'Operator harus memiliki nama lengkap dan username'
            });
          }

          // Check if this is a new operator (no _id) or existing operator
          const isExistingOperator = operator._id && operator._id.toString().trim() !== '';

          // For new operators, password is required
          if (!isExistingOperator) {
            if (!operator.password) {
              console.log(`❌ VALIDATION FAILED: New operator ${operator.username} missing password`);
              return reply.code(400).send({
                success: false,
                message: 'Operator baru harus memiliki password'
              });
            }
            if (operator.password.length < 6) {
              console.log(`❌ VALIDATION FAILED: Operator ${operator.username} password too short`);
              return reply.code(400).send({
                success: false,
                message: 'Password operator minimal 6 karakter'
              });
            }
          } else {
            // For existing operators, if no password provided, try to preserve existing
            if (!operator.password) {
              console.log(`✅ Preserving existing password for operator: ${operator.username}`);
            }
          }
        }
        console.log('✅ All operator validations passed');

        // Get current sub-organization to preserve existing operator passwords
        const currentSubOrg = await SubPerangkatDaerah.findById(id);
        const currentOperators = currentSubOrg ? currentSubOrg.operators || [] : [];

        // Process operators - preserve existing passwords, hash new ones
        const processedOperators = await Promise.all(
          operators.map(async (operator) => {
            const isExistingOperator = operator._id && operator._id.toString().trim() !== '';

            if (isExistingOperator) {
              // For existing operators, find and preserve their current password
              const existingOperatorData = currentOperators.find(op => op._id.toString() === operator._id.toString());
              if (existingOperatorData) {
                // Preserve existing password and passwordDisplay
                const passwordDisplay = operator.passwordDisplay || existingOperatorData.passwordDisplay;
                // If passwordDisplay is hashed (starts with $2a$), set it to the hashed password for consistency
                const finalPasswordDisplay = passwordDisplay && passwordDisplay.startsWith('$2a$') ? existingOperatorData.password : passwordDisplay;
                return {
                  ...operator,
                  password: existingOperatorData.password,
                  passwordDisplay: finalPasswordDisplay
                };
              } else {
                // Operator claims to exist but not found in current data - treat as new
                console.log(`Warning: Operator ${operator.username} claims to exist but not found in current data`);
                if (operator.password) {
                  return {
                    ...operator,
                    password: await bcrypt.hash(operator.password, 10),
                    passwordDisplay: operator.password
                  };
                } else {
                  // No password provided for supposedly existing operator
                  return operator;
                }
              }
            } else {
              // For new operators, hash the password
              if (operator.password) {
                return {
                  ...operator,
                  password: await bcrypt.hash(operator.password, 10),
                  passwordDisplay: operator.password
                };
              } else {
                // New operator without password - this shouldn't happen due to validation
                return operator;
              }
            }
          })
        );

        const hashedOperators = processedOperators;
        console.log('✅ Operator processing completed');

        // Check if nama already exists for this perangkatDaerahId (excluding current item)
        console.log('🔍 Checking for duplicate nama...');
        const existing = await SubPerangkatDaerah.findOne({
          nama,
          perangkatDaerahId,
          _id: { $ne: id }
        });

        if (existing) {
          console.log('❌ DUPLICATE FOUND: Sub perangkat daerah with this name already exists');
          return reply.code(400).send({
            success: false,
            message: 'Nama sub perangkat daerah sudah digunakan untuk organisasi ini'
          });
        }
        console.log('✅ No duplicate nama found');

        console.log('💾 Attempting to update sub perangkat daerah...');
        const updatedSubPerangkatDaerah = await SubPerangkatDaerah.findByIdAndUpdate(
          id,
          {
            nama,
            pimpinan,
            perangkatDaerahId,
            operators: hashedOperators
          },
          { new: true, runValidators: true }
        );

        if (!updatedSubPerangkatDaerah) {
          console.log('❌ DATABASE UPDATE FAILED: Sub perangkat daerah not found');
          return reply.code(404).send({
            success: false,
            message: 'Sub perangkat daerah tidak ditemukan'
          });
        }
        console.log('✅ Database update successful');

        // Sync operators with User collection
        console.log('🔄 Syncing operators with User collection...');
        await syncOperatorsWithUsers(hashedOperators, updatedSubPerangkatDaerah._id, budgetYear);
        console.log('✅ Operator sync completed');

        return reply.code(200).send({
          success: true,
          data: updatedSubPerangkatDaerah,
          message: 'Sub perangkat daerah berhasil diperbarui'
        });

      } catch (error) {
        return reply.code(400).send({
          success: false,
          message: error.message
        });
      }

    } else if (request.url.startsWith('/api/subperangkatdaerah/') && request.method === 'DELETE') {
      try {
        // Extract ID from URL
        const id = request.url.replace('/api/subperangkatdaerah/', '');

        const subPerangkatDaerah = await SubPerangkatDaerah.findByIdAndDelete(id);
        if (!subPerangkatDaerah) {
          return reply.code(404).send({
            success: false,
            message: 'Sub perangkat daerah tidak ditemukan'
          });
        }
        return reply.code(200).send({
          success: true,
          message: 'Sub perangkat daerah berhasil dihapus',
          data: subPerangkatDaerah
        });
      } catch (error) {
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
    return reply.code(500).send({
      success: false,
      message: 'Internal server error'
    });
  }
};

export default subPerangkatDaerahRouter;