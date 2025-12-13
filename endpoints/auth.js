import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import SubPerangkatDaerah from '../models/SubPerangkatDaerah.js';
import PerangkatDaerah from '../models/PerangkatDaerah.js';
import Penyedia from '../models/Penyedia.js';

// Use the same JWT secret as the API middleware
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

const authRouter = async (request, reply) => {
  try {
    // Handle OPTIONS requests for CORS preflight
    if (request.method === 'OPTIONS') {
      return reply.code(200).send();
    }

    if (request.url === '/api/auth/register' && request.method === 'POST') {
      const { username, email, password } = request.body;

      if (!username || !email || !password) {
        return reply.code(400).send({ message: 'All fields are required' });
      }

      // Check if user exists
      const existingUser = await User.findOne({ $or: [{ email }, { username }] });
      if (existingUser) {
        return reply.code(400).send({ message: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const newUser = new User({
        username,
        email,
        password: hashedPassword,
      });

      await newUser.save();

      return reply.code(201).send({ message: 'User registered successfully' });

    } else if (request.url === '/api/auth/login' && request.method === 'POST') {
      const { username, password, budgetYear } = request.body;

      if (!username || !password) {
        return reply.code(400).send({ message: 'Username dan password harus diisi' });
      }

      if (!budgetYear) {
        return reply.code(400).send({ message: 'Tahun anggaran harus dipilih' });
      }

      // Check if user is an operator in SubPerangkatDaerah
      const subOrg = await SubPerangkatDaerah.findOne(
        { 'operators.username': username },
        { 'operators.$': 1, nama: 1, pimpinan: 1 }
      ).populate('perangkatDaerahId', 'nama namaPemda');

      // Check if user is a vendor in Penyedia collection
      const penyedia = await Penyedia.findOne(
        { 'operators.username': username },
        { 'operators.$': 1, NamaVendor: 1, NamaPimpinan: 1, _id: 1 }
      );

      let user = null;
      let userRole = 'admin';
      let operatorData = null;
      let vendorData = null;

      if (subOrg && subOrg.operators && subOrg.operators.length > 0) {
        // User is an operator
        operatorData = subOrg.operators[0];
        userRole = 'operator';

        // Check password for operator
        const isPasswordValid = await bcrypt.compare(password, operatorData.password);
        if (!isPasswordValid) {
          return reply.code(401).send({ message: 'Username atau password salah' });
        }
      } else if (penyedia && penyedia.operators && penyedia.operators.length > 0) {
        // User is a vendor
        vendorData = penyedia.operators[0];
        userRole = 'vendor';

        // Check password for vendor
        const isPasswordValid = await bcrypt.compare(password, vendorData.password);
        if (!isPasswordValid) {
          return reply.code(401).send({ message: 'Username atau password salah' });
        }
      } else {
        // Check in User collection for admin users
        user = await User.findOne({ username });
        if (!user) {
          return reply.code(401).send({ message: 'Username atau password salah' });
        }

        // Check password for regular user
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return reply.code(401).send({ message: 'Username atau password salah' });
        }
      }

      // Parse budget year from request
      let selectedBudgetYear = null;
      if (budgetYear) {
        if (typeof budgetYear === 'object' && budgetYear.year && budgetYear.status) {
          // Handle object format: { year: 2026, status: "Murni" }
          selectedBudgetYear = { year: budgetYear.year, status: budgetYear.status };
        } else if (typeof budgetYear === 'string') {
          // Handle string format: "2026-Murni"
          const [year, status] = budgetYear.split('-');
          selectedBudgetYear = { year: parseInt(year), status };
        } else {
          // Default to current year
          selectedBudgetYear = { year: 2026, status: 'Murni' };
        }
      }

      // Prepare user data based on role
      let userResponse;
      if (userRole === 'operator') {
        // For operators, update their budget year in the User collection
        // First check if User document already exists with this username
        let operatorUser = await User.findOne({ username: operatorData.username });

        if (operatorUser) {
          // Update existing user
          operatorUser.budgetYear = selectedBudgetYear;
          operatorUser.role = 'operator';
          operatorUser.subPerangkatDaerahId = subOrg._id;
          operatorUser.operatorId = operatorData._id;
          await operatorUser.save();
        } else {
          // Create new user
          operatorUser = new User({
            username: operatorData.username,
            email: `${operatorData.username}@operator.local`,
            role: 'operator',
            subPerangkatDaerahId: subOrg._id,
            operatorId: operatorData._id,
            budgetYear: selectedBudgetYear
          });
          await operatorUser.save();
        }

        userResponse = {
          id: operatorUser._id,
          namaLengkap: operatorData.namaLengkap,
          username: operatorData.username,
          email: `${operatorData.username}@operator.local`,
          role: userRole,
          budgetYear: selectedBudgetYear,
          subPerangkatDaerahId: subOrg._id,
          subPerangkatDaerah: {
            nama: subOrg.nama,
            pimpinan: subOrg.pimpinan,
            perangkatDaerahId: subOrg.perangkatDaerahId
          }
        };
      } else if (userRole === 'vendor') {
        // For vendors, update or create user in User collection
        let vendorUser = await User.findOne({ username: vendorData.username });

        if (vendorUser) {
          // Update existing user
          vendorUser.budgetYear = selectedBudgetYear;
          vendorUser.role = 'vendor';
          vendorUser.penyediaId = penyedia._id;
          vendorUser.vendorUserId = vendorData._id;
          await vendorUser.save();
        } else {
          // Create new user
          vendorUser = new User({
            username: vendorData.username,
            email: `${vendorData.username}@vendor.local`,
            role: 'vendor',
            penyediaId: penyedia._id,
            vendorUserId: vendorData._id,
            budgetYear: selectedBudgetYear
          });
          await vendorUser.save();
        }

        userResponse = {
          id: vendorUser._id,
          namaLengkap: vendorData.namaLengkap,
          username: vendorData.username,
          email: `${vendorData.username}@vendor.local`,
          role: userRole,
          budgetYear: selectedBudgetYear,
          penyediaId: penyedia._id,
          penyedia: {
            namaVendor: penyedia.NamaVendor,
            namaPimpinan: penyedia.NamaPimpinan
          }
        };
      } else {
        // For admin users, fetch the main PerangkatDaerah
        const mainPerangkatDaerah = await PerangkatDaerah.findOne();
        
        // For admin users, update their budget year if provided
        if (selectedBudgetYear) {
          user.budgetYear = selectedBudgetYear;
          await user.save();
        }

        userResponse = {
          id: user._id,
          username: user.username,
          email: user.email,
          role: userRole,
          budgetYear: user.budgetYear,
          perangkatDaerah: mainPerangkatDaerah ? {
            nama: mainPerangkatDaerah.nama
          } : null
        };
      }

      // Generate token based on user role
      let tokenPayload;
      if (userRole === 'operator') {
        tokenPayload = { userId: userResponse.id, username: operatorData.username, role: userRole, subPerangkatDaerahId: subOrg._id };
      } else if (userRole === 'vendor') {
        tokenPayload = { userId: userResponse.id, username: vendorData.username, role: userRole, penyediaId: penyedia._id };
      } else {
        tokenPayload = { userId: user._id, username: user.username, role: userRole };
      }

      const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

      return reply.code(200).send({
        token,
        user: userResponse,
        message: 'Login berhasil'
      });

    } else if (request.url === '/api/auth/select-year' && request.method === 'POST') {
      const { userId, year, status } = request.body;

      if (!userId || !year || !status) {
        return reply.code(400).send({ message: 'User ID, year, and status are required' });
      }

      // Find user in User collection first
      let user = await User.findById(userId);
      let userRole = 'admin';

      if (!user) {
        // Check if it's an operator by finding the operator ID in SubPerangkatDaerah
        const subOrg = await SubPerangkatDaerah.findOne(
          { 'operators._id': userId },
          { 'operators.$': 1, nama: 1, pimpinan: 1 }
        ).populate('perangkatDaerahId', 'nama namaPemda');

        if (subOrg && subOrg.operators && subOrg.operators.length > 0) {
          userRole = 'operator';
          // For operators, update the User collection with budget year and username
          let operatorUser = await User.findOne({ username: subOrg.operators[0].username });

          if (operatorUser) {
            // Update existing user
            operatorUser.budgetYear = { year: parseInt(year), status };
            operatorUser.role = userRole;
            operatorUser.subPerangkatDaerahId = subOrg._id;
            operatorUser.operatorId = userId;
            await operatorUser.save();
          } else {
            // Create new user
            operatorUser = new User({
              username: subOrg.operators[0].username,
              email: `${subOrg.operators[0].username}@operator.local`,
              role: 'operator',
              subPerangkatDaerahId: subOrg._id,
              operatorId: userId,
              budgetYear: { year: parseInt(year), status }
            });
            await operatorUser.save();
          }

          // Generate token (7 days expiration to match "remember me" functionality)
          const token = jwt.sign({ userId: operatorUser._id, username: subOrg.operators[0].username, role: userRole, subPerangkatDaerahId: subOrg._id }, JWT_SECRET, { expiresIn: '7d' });

          return reply.code(200).send({
            token,
            user: {
              id: userId,
              namaLengkap: subOrg.operators[0].namaLengkap,
              username: subOrg.operators[0].username,
              email: `${subOrg.operators[0].username}@operator.local`,
              role: userRole,
              budgetYear: { year: parseInt(year), status },
              subPerangkatDaerahId: subOrg._id,
              subPerangkatDaerah: {
                nama: subOrg.nama,
                pimpinan: subOrg.pimpinan,
                perangkatDaerahId: subOrg.perangkatDaerahId
              }
            },
            message: 'Tahun anggaran berhasil dipilih'
          });
        }

        return reply.code(404).send({ message: 'User tidak ditemukan' });
      }

      // Update budget year for admin users
      user.budgetYear = { year: parseInt(year), status };
      await user.save();

      // Generate token (7 days expiration to match "remember me" functionality)
      const token = jwt.sign({ userId: user._id, username: user.username, role: userRole }, JWT_SECRET, { expiresIn: '7d' });

      return reply.code(200).send({
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: userRole,
          budgetYear: user.budgetYear,
          perangkatDaerah: user.perangkatDaerahId
        },
        message: 'Tahun anggaran berhasil dipilih'
      });

    } else if (request.url === '/api/auth/health' && request.method === 'GET') {
      // Database connection health check
      try {
        // Test database connection with a lightweight query
        const userCount = await User.countDocuments({});
        
        return reply.code(200).send({
          status: 'healthy',
          database: 'connected',
          timestamp: new Date().toISOString(),
          userCount: userCount
        });
      } catch (error) {
        console.error('Health check failed:', error);
        return reply.code(500).send({
          status: 'unhealthy',
          database: 'disconnected',
          timestamp: new Date().toISOString(),
          error: error.message
        });
      }
    } else {
      return reply.code(404).send({ message: 'Not Found' });
    }
  } catch (error) {
    console.error(error);
    return reply.code(500).send({ message: 'Internal Server Error' });
  }
};

export default authRouter;