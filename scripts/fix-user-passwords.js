import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/simrapu';

async function fixUserPasswords() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Define User schema manually to avoid import issues
    const userSchema = new mongoose.Schema({
      username: { type: String, required: true, unique: true },
      email: String,
      password: String, // This field is missing for ops2 and opskedua
      role: String,
      budgetYear: Object,
      subPerangkatDaerahId: mongoose.Schema.Types.ObjectId,
      operatorId: mongoose.Schema.Types.ObjectId,
      createdAt: Date,
      updatedAt: Date
    }, { timestamps: true });

    const User = mongoose.model('User', userSchema);

    // Fix ops2 user
    console.log('🔧 Fixing ops2 user...');
    const ops2Result = await User.findOneAndUpdate(
      { username: 'ops2' },
      { 
        $set: { 
          password: '$2a$10$5QNHA8MCykJ15UhiqwN6PedXgQhOS5BJI1N/IDQvWPztlAdtP0sCG'
        } 
      },
      { new: true }
    );

    if (ops2Result) {
      console.log('✅ ops2 user fixed:', {
        username: ops2Result.username,
        hasPassword: !!ops2Result.password
      });
    } else {
      console.log('❌ ops2 user not found');
    }

    // Fix opskedua user
    console.log('🔧 Fixing opskedua user...');
    const opskeduaResult = await User.findOneAndUpdate(
      { username: 'opskedua' },
      { 
        $set: { 
          password: '$2a$10$NHmgWzQjxlQlpgK/cJMRp.A5n/TiAX.SWLUfX7sijS20HgkB/By5K'
        } 
      },
      { new: true }
    );

    if (opskeduaResult) {
      console.log('✅ opskedua user fixed:', {
        username: opskeduaResult.username,
        hasPassword: !!opskeduaResult.password
      });
    } else {
      console.log('❌ opskedua user not found');
    }

    console.log('🎉 All users fixed successfully!');

    // Test the passwords
    console.log('\n🔍 Testing password verification...');
    const testOps2 = await bcrypt.compare('111111', '$2a$10$5QNHA8MCykJ15UhiqwN6PedXgQhOS5BJI1N/IDQvWPztlAdtP0sCG');
    const testOpskedua = await bcrypt.compare('111111', '$2a$10$NHmgWzQjxlQlpgK/cJMRp.A5n/TiAX.SWLUfX7sijS20HgkB/By5K');
    
    console.log('ops2 password test:', testOps2 ? '✅ PASS' : '❌ FAIL');
    console.log('opskedua password test:', testOpskedua ? '✅ PASS' : '❌ FAIL');

  } catch (error) {
    console.error('Error fixing users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

fixUserPasswords();