import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/simrapu';

async function fixOps2User() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Define User schema manually to avoid import issues
    const userSchema = new mongoose.Schema({
      username: { type: String, required: true, unique: true },
      email: String,
      password: String, // This field is missing for ops2
      role: String,
      budgetYear: Object,
      subPerangkatDaerahId: mongoose.Schema.Types.ObjectId,
      operatorId: mongoose.Schema.Types.ObjectId,
      createdAt: Date,
      updatedAt: Date
    }, { timestamps: true });

    const User = mongoose.model('User', userSchema);

    // Find ops2 user
    const ops2User = await User.findOne({ username: 'ops2' });
    if (!ops2User) {
      console.log('ops2 user not found');
      return;
    }

    console.log('Current ops2 user data:', JSON.stringify(ops2User, null, 2));

    // Add the missing password field
    // This is the same hash that's in SubPerangkatDaerah.operators
    const ops2PasswordHash = '$2a$10$5QNHA8MCykJ15UhiqwN6PedXgQhOS5BJI1N/IDQvWPztlAdtP0sCG';

    ops2User.password = ops2PasswordHash;
    await ops2User.save();

    console.log('✅ Successfully added password field to ops2 user');
    console.log('Updated ops2 user data:', JSON.stringify(ops2User, null, 2));

    // Verify the fix by testing bcrypt comparison
    const isValid = await bcrypt.compare('111111', ops2PasswordHash);
    console.log('Password verification test:', isValid ? '✅ PASS' : '❌ FAIL');

  } catch (error) {
    console.error('Error fixing ops2 user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

fixOps2User();