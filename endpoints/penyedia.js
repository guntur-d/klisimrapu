import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Penyedia from '../models/Penyedia.js';
import User from '../models/User.js';

// Helper function to sync vendor users with User collection
const syncVendorUsersWithUsers = async (vendorUsers, penyediaId, budgetYear) => {
  if (!vendorUsers || vendorUsers.length === 0) {
    console.log('⚠️ No vendor users to sync');
    return;
  }

  console.log(`🔄 Syncing ${vendorUsers.length} vendor users with User collection...`);

  for (let i = 0; i < vendorUsers.length; i++) {
    const vendorUser = vendorUsers[i];
    try {
      // Validate vendor user data before syncing
      if (!vendorUser.username) {
        console.error(`❌ Invalid vendor user data:`, vendorUser);
        throw new Error(`Invalid vendor user data for user at index ${i}`);
      }

      console.log(`🔍 Processing vendor user ${i + 1}/${vendorUsers.length}:`, {
        _id: vendorUser._id,
        username: vendorUser.username,
        namaLengkap: vendorUser.namaLengkap
      });

      // Find or create user record for this vendor user
      let user;
      try {
        user = await User.findOneAndUpdate(
          {
            vendorUserId: vendorUser._id,
            // Additional safety: ensure we're not accidentally matching admin/operator users
            $or: [
              { role: 'vendor' },
              { role: { $exists: false } }, // For new users
              { vendorUserId: { $exists: true } } // Must have vendorUserId
            ]
          },
          {
            username: vendorUser.username,
            email: `${vendorUser.username}@vendor.local`, // Generate unique email for vendor users
            role: 'vendor',
            password: vendorUser.password, // Add password field from vendor user data
            penyediaId: penyediaId,
            vendorUserId: vendorUser._id,
            budgetYear: budgetYear || { year: 2026, status: 'Murni' } // Default budget year
          },
          { upsert: true, new: true }
        );
      } catch (error) {
        if (error.code === 11000 && error.keyPattern && error.keyPattern.username) {
          // Duplicate username error, find the existing user and update it
          const existingUser = await User.findOneAndUpdate(
            { username: vendorUser.username },
            {
              role: 'vendor',
              password: vendorUser.password, // Add password field from vendor user data
              penyediaId: penyediaId,
              vendorUserId: vendorUser._id,
              budgetYear: budgetYear || { year: 2026, status: 'Murni' }
            },
            { new: true }
          );
          if (!existingUser) {
            throw new Error('Failed to update existing user for vendor user sync');
          }
          user = existingUser;
        } else {
          throw error;
        }
      }

      console.log(`✅ Synced vendor user: ${vendorUser.username} (ID: ${vendorUser._id}) -> User: ${user.username} (Role: ${user.role})`);

    } catch (error) {
      console.error(`❌ Error syncing vendor user ${vendorUser.username}:`, error.message);
      throw error; // Re-throw to stop the process
    }
  }

  console.log('✅ All vendor users synced successfully');
};

const penyediaRouter = async (request, reply) => {
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

    if (request.method === 'GET') {
      // Get all penyedia
      const penyedia = await Penyedia.find({}).sort({ NamaVendor: 1 });
      return reply.code(200).send({
        success: true,
        data: penyedia
      });

    } else if (request.method === 'POST') {
      try {
        console.log('Received POST request to /api/penyedia');
        console.log('Request body:', request.body);
        
        const { NamaVendor, NamaPimpinan, Alamat, Email, Telepon, Website, operators = [] } = request.body;

        // Validate required fields
        if (!NamaVendor || !NamaPimpinan || !Alamat || !Email || !Telepon) {
          return reply.code(400).send({
            success: false,
            message: 'NamaVendor, NamaPimpinan, Alamat, Email, dan Telepon harus diisi'
          });
        }

        // Validate and hash vendor users data if provided
        for (const operator of operators) {
          if (!operator.namaLengkap || !operator.username || !operator.password) {
            return reply.code(400).send({
              success: false,
              message: 'Vendor user harus memiliki nama lengkap, username, dan password'
            });
          }
          if (operator.password.length < 6) {
            return reply.code(400).send({
              success: false,
              message: 'Password vendor user minimal 6 karakter'
            });
          }
        }

        // Hash vendor user passwords for new users only (existing ones keep their passwords)
        const hashedVendorUsers = await Promise.all(
          operators.map(async (operator) => {
            const isExistingUser = operator._id && operator._id.trim() !== '';

            if (isExistingUser) {
              // For existing vendor users, return as-is (password already hashed in database)
              return operator;
            } else {
              // For new vendor users, hash the password
              return {
                ...operator,
                password: await bcrypt.hash(operator.password, 10),
                passwordDisplay: operator.password
              };
            }
          })
        );

        // Check if email already exists
        const existingPenyedia = await Penyedia.findOne({ Email: Email.trim() });
        if (existingPenyedia) {
          return reply.code(400).send({
            success: false,
            message: 'Email sudah digunakan'
          });
        }

        const newPenyedia = new Penyedia({
          NamaVendor: NamaVendor.trim(),
          NamaPimpinan: NamaPimpinan.trim(),
          Alamat: Alamat.trim(),
          Email: Email.trim(),
          Telepon: Telepon.trim(),
          Website: Website ? Website.trim() : '',
          operators: hashedVendorUsers
        });

        const savedPenyedia = await newPenyedia.save();

        // Sync vendor users with User collection
        await syncVendorUsersWithUsers(hashedVendorUsers, savedPenyedia._id, budgetYear);

        return reply.code(200).send({
          success: true,
          data: savedPenyedia,
          message: 'Penyedia berhasil ditambahkan'
        });

      } catch (error) {
        return reply.code(400).send({
          success: false,
          message: error.message
        });
      }

    } else if (request.url.startsWith('/api/penyedia/') && request.method === 'PUT') {
      try {
        // Extract ID from URL
        const id = request.url.replace('/api/penyedia/', '');
        console.log('=== PENYEDIA PUT DEBUG ===');
        console.log('Request URL:', request.url);
        console.log('Request body keys:', Object.keys(request.body));
        console.log('Operators count:', request.body.operators ? request.body.operators.length : 'none');

        const { NamaVendor, NamaPimpinan, Alamat, Email, Telepon, Website, operators = [] } = request.body;
        console.log('=== VALIDATION DEBUG ===');
        console.log('NamaVendor:', NamaVendor, 'NamaPimpinan:', NamaPimpinan, 'Email:', Email);
        console.log('operators length:', operators.length);

        // Validate required fields
        if (!NamaVendor || !NamaPimpinan || !Alamat || !Email || !Telepon) {
          console.log('❌ VALIDATION FAILED: Missing required fields');
          return reply.code(400).send({
            success: false,
            message: 'NamaVendor, NamaPimpinan, Alamat Email, dan Telepon harus diisi'
          });
        }
        console.log('✅ Basic validation passed');

        // Validate and prepare vendor users data
        console.log('=== VENDOR USER VALIDATION DEBUG ===');
        for (let i = 0; i < operators.length; i++) {
          const operator = operators[i];
          console.log(`Vendor User ${i + 1}:`, {
            namaLengkap: operator.namaLengkap,
            username: operator.username,
            hasPassword: !!operator.password,
            passwordLength: operator.password ? operator.password.length : 0,
            hasId: !!operator._id,
            idValue: operator._id
          });

          if (!operator.namaLengkap || !operator.username) {
            console.log(`❌ VALIDATION FAILED: Vendor User ${i + 1} missing namaLengkap or username`);
            return reply.code(400).send({
              success: false,
              message: 'Vendor user harus memiliki nama lengkap dan username'
            });
          }

          // Check if this is a new vendor user (no _id) or existing vendor user
          const isExistingUser = operator._id && operator._id.toString().trim() !== '';

          // For new vendor users, password is required
          if (!isExistingUser) {
            if (!operator.password) {
              console.log(`❌ VALIDATION FAILED: New vendor user ${operator.username} missing password`);
              return reply.code(400).send({
                success: false,
                message: 'Vendor user baru harus memiliki password'
              });
            }
            if (operator.password.length < 6) {
              console.log(`❌ VALIDATION FAILED: Vendor user ${operator.username} password too short`);
              return reply.code(400).send({
                success: false,
                message: 'Password vendor user minimal 6 karakter'
              });
            }
          } else {
            // For existing vendor users, if no password provided, try to preserve existing
            if (!operator.password) {
              console.log(`✅ Preserving existing password for vendor user: ${operator.username}`);
            }
          }
        }
        console.log('✅ All vendor user validations passed');

        // Get current penyedia to preserve existing vendor user passwords
        const currentPenyedia = await Penyedia.findById(id);
        const currentOperators = currentPenyedia ? currentPenyedia.operators || [] : [];

        // Process vendor users - preserve existing passwords, hash new ones
        const processedVendorUsers = await Promise.all(
          operators.map(async (operator) => {
            const isExistingUser = operator._id && operator._id.toString().trim() !== '';

            if (isExistingUser) {
              // For existing vendor users, find and preserve their current password
              const existingUserData = currentOperators.find(op => op._id.toString() === operator._id.toString());
              if (existingUserData) {
                // Preserve existing password and passwordDisplay
                const passwordDisplay = operator.passwordDisplay || existingUserData.passwordDisplay;
                // If passwordDisplay is hashed (starts with $2a$), set it to the hashed password for consistency
                const finalPasswordDisplay = passwordDisplay && passwordDisplay.startsWith('$2a$') ? existingUserData.password : passwordDisplay;
                return {
                  ...operator,
                  password: existingUserData.password,
                  passwordDisplay: finalPasswordDisplay
                };
              } else {
                // Vendor user claims to exist but not found in current data - treat as new
                console.log(`Warning: Vendor user ${operator.username} claims to exist but not found in current data`);
                if (operator.password) {
                  return {
                    ...operator,
                    password: await bcrypt.hash(operator.password, 10),
                    passwordDisplay: operator.password
                  };
                } else {
                  // No password provided for supposedly existing vendor user
                  return operator;
                }
              }
            } else {
              // For new vendor users, hash the password
              if (operator.password) {
                return {
                  ...operator,
                  password: await bcrypt.hash(operator.password, 10),
                  passwordDisplay: operator.password
                };
              } else {
                // New vendor user without password - this shouldn't happen due to validation
                return operator;
              }
            }
          })
        );

        const hashedVendorUsers = processedVendorUsers;
        console.log('✅ Vendor user processing completed');

        console.log('💾 Attempting to update penyedia...');
        const updatedPenyedia = await Penyedia.findByIdAndUpdate(
          id,
          {
            NamaVendor: NamaVendor.trim(),
            NamaPimpinan: NamaPimpinan.trim(),
            Alamat: Alamat.trim(),
            Email: Email.trim(),
            Telepon: Telepon.trim(),
            Website: Website ? Website.trim() : '',
            operators: hashedVendorUsers
          },
          { new: true, runValidators: true }
        );

        if (!updatedPenyedia) {
          console.log('❌ DATABASE UPDATE FAILED: Penyedia not found');
          return reply.code(404).send({
            success: false,
            message: 'Penyedia tidak ditemukan'
          });
        }
        console.log('✅ Database update successful');

        // Sync vendor users with User collection
        console.log('🔄 Syncing vendor users with User collection...');
        await syncVendorUsersWithUsers(hashedVendorUsers, updatedPenyedia._id, budgetYear);
        console.log('✅ Vendor user sync completed');

        return reply.code(200).send({
          success: true,
          data: updatedPenyedia,
          message: 'Penyedia berhasil diperbarui'
        });

      } catch (error) {
        return reply.code(400).send({
          success: false,
          message: error.message
        });
      }

    } else if (request.url.startsWith('/api/penyedia/') && request.method === 'DELETE') {
      try {
        // Extract ID from URL
        const id = request.url.replace('/api/penyedia/', '');

        const penyedia = await Penyedia.findByIdAndDelete(id);
        if (!penyedia) {
          return reply.code(404).send({
            success: false,
            message: 'Penyedia tidak ditemukan'
          });
        }
        return reply.code(200).send({
          success: true,
          message: 'Penyedia berhasil dihapus',
          data: penyedia
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

export default penyediaRouter;