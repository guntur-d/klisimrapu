import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import SubPerangkatDaerah from '../models/SubPerangkatDaerah.js';

const userRouter = async (request, reply) => {
  try {
    // GET /api/user - Get all users
    if (request.url === '/api/user' && request.method === 'GET') {
      try {
        console.log('GET /api/user called');
        
        // Get all users and populate subPerangkatDaerahId
        const users = await User.find()
          .populate('subPerangkatDaerahId', 'nama')
          .select('-password')
          .lean();
        
        console.log('Found users:', users.length);
        
        return reply.code(200).send({
          success: true,
          data: users
        });
      } catch (error) {
        console.error('Error fetching users:', error);
        return reply.code(500).send({
          success: false,
          message: 'Error fetching users',
          error: error.message
        });
      }

    // POST /api/user - Create new user
    } else if (request.url === '/api/user' && request.method === 'POST') {
      try {
        console.log('POST /api/user called with data:', request.body);
        
        const { 
          username, 
          email, 
          password, 
          role, 
          subPerangkatDaerahId 
        } = request.body;
        
        // Validate required fields
        if (!username || !email || !password || !role) {
          return reply.code(400).send({
            success: false,
            message: 'Username, email, password, and role are required'
          });
        }
        
        // Check if user already exists
        const existingUser = await User.findOne({
          $or: [
            { username: username },
            { email: email }
          ]
        });
        
        if (existingUser) {
          return reply.code(400).send({
            success: false,
            message: 'User with this username or email already exists'
          });
        }
        
        // Validate subPerangkatDaerahId if provided
        if (subPerangkatDaerahId) {
          const subPerangkatDaerah = await SubPerangkatDaerah.findById(subPerangkatDaerahId);
          if (!subPerangkatDaerah) {
            return reply.code(400).send({
              success: false,
              message: 'Invalid sub perangkat daerah ID'
            });
          }
        }
        
        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Create new user
        const user = new User({
          username,
          email,
          password: hashedPassword,
          role,
          subPerangkatDaerahId: subPerangkatDaerahId || null
        });
        
        await user.save();
        
        // Remove password from response
        const userResponse = user.toObject();
        delete userResponse.password;
        
        // Populate sub perangkat daerah name
        if (userResponse.subPerangkatDaerahId) {
          await User.populate(userResponse, { path: 'subPerangkatDaerahId', select: 'nama' });
        }
        
        console.log('User created successfully:', user._id);
        
        return reply.code(201).send({
          success: true,
          data: userResponse,
          message: 'User created successfully'
        });
      } catch (error) {
        console.error('Error creating user:', error);
        return reply.code(500).send({
          success: false,
          message: 'Error creating user',
          error: error.message
        });
      }

    // GET /api/user/:id - Get user by ID
    } else if (request.url.match(/\/api\/user\/\w+/) && request.method === 'GET') {
      try {
        const id = request.url.split('/')[3];
        const user = await User.findById(id)
          .populate('subPerangkatDaerahId', 'nama')
          .select('-password');
        
        if (!user) {
          return reply.code(404).send({
            success: false,
            message: 'User not found'
          });
        }
        
        return reply.code(200).send({
          success: true,
          data: user
        });
      } catch (error) {
        console.error('Error fetching user:', error);
        return reply.code(500).send({
          success: false,
          message: 'Error fetching user',
          error: error.message
        });
      }

    // PUT /api/user/:id - Update user
    } else if (request.url.match(/\/api\/user\/\w+/) && request.method === 'PUT') {
      try {
        console.log('PUT /api/user/:id called with data:', request.body);
        
        const id = request.url.split('/')[3];
        const { 
          username, 
          email, 
          password, 
          role, 
          subPerangkatDaerahId 
        } = request.body;
        
        // Find existing user
        const user = await User.findById(id);
        if (!user) {
          return reply.code(404).send({
            success: false,
            message: 'User not found'
          });
        }
        
        // Check if username or email is already taken by another user
        if (username || email) {
          const existingUser = await User.findOne({
            _id: { $ne: id },
            $or: [
              ...(username ? [{ username: username }] : []),
              ...(email ? [{ email: email }] : [])
            ]
          });
          
          if (existingUser) {
            return reply.code(400).send({
              success: false,
              message: 'Username or email already taken'
            });
          }
        }
        
        // Validate subPerangkatDaerahId if provided
        if (subPerangkatDaerahId) {
          const subPerangkatDaerah = await SubPerangkatDaerah.findById(subPerangkatDaerahId);
          if (!subPerangkatDaerah) {
            return reply.code(400).send({
              success: false,
              message: 'Invalid sub perangkat daerah ID'
            });
          }
        }
        
        // Update fields
        if (username) user.username = username;
        if (email) user.email = email;
        if (role) user.role = role;
        if (subPerangkatDaerahId !== undefined) user.subPerangkatDaerahId = subPerangkatDaerahId || null;
        
        // Update password if provided
        if (password) {
          const saltRounds = 10;
          user.password = await bcrypt.hash(password, saltRounds);
        }
        
        await user.save();
        
        // Remove password from response
        const userResponse = user.toObject();
        delete userResponse.password;
        
        // Populate sub perangkat daerah name
        if (userResponse.subPerangkatDaerahId) {
          await User.populate(userResponse, { path: 'subPerangkatDaerahId', select: 'nama' });
        }
        
        console.log('User updated successfully:', user._id);
        
        return reply.code(200).send({
          success: true,
          data: userResponse,
          message: 'User updated successfully'
        });
      } catch (error) {
        console.error('Error updating user:', error);
        return reply.code(500).send({
          success: false,
          message: 'Error updating user',
          error: error.message
        });
      }

    // DELETE /api/user/:id - Delete user
    } else if (request.url.match(/\/api\/user\/\w+/) && request.method === 'DELETE') {
      try {
        console.log('DELETE /api/user/:id called');
        
        const id = request.url.split('/')[3];
        const user = await User.findById(id);
        if (!user) {
          return reply.code(404).send({
            success: false,
            message: 'User not found'
          });
        }
        
        await User.findByIdAndDelete(id);
        
        console.log('User deleted successfully:', id);
        
        return reply.code(200).send({
          success: true,
          message: 'User deleted successfully'
        });
      } catch (error) {
        console.error('Error deleting user:', error);
        return reply.code(500).send({
          success: false,
          message: 'Error deleting user',
          error: error.message
        });
      }

    // 404 for unmatched routes
    } else {
      return reply.code(404).send({ message: 'Endpoint not found' });
    }

  } catch (error) {
    console.error('User API Error:', error);
    return reply.code(500).send({ 
      success: false,
      message: 'Internal server error',
      error: error.message 
    });
  }
};

export default userRouter;