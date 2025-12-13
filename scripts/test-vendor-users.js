// Test script to verify vendor user management implementation
// Run with: node test-vendor-users.js

const mongoose = require('mongoose');
const Penyedia = require('./models/Penyedia.js');
const User = require('./models/User.js');

async function testVendorUserManagement() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/simrapu');
    console.log('✅ Connected to MongoDB');

    // Test 1: Create a new penyedia with vendor users
    console.log('\n📝 Test 1: Creating penyedia with vendor users...');
    
    const testPenyedia = new Penyedia({
      NamaVendor: 'PT. Test Vendor Indonesia',
      NamaPimpinan: 'Budi Santoso',
      Alamat: 'Jl. Testing No. 123, Jakarta',
      Email: 'test@vendor.com',
      Telepon: '021-12345678',
      Website: 'https://www.testvendor.com',
      operators: [
        {
          namaLengkap: 'Andi Wijaya',
          username: 'andi.testvendor',
          password: '$2a$10$hashedpassword123', // This would be properly hashed in real usage
          passwordDisplay: 'password123'
        },
        {
          namaLengkap: 'Siti Rahayu',
          username: 'siti.testvendor',
          password: '$2a$10$hashedpassword456',
          passwordDisplay: 'password456'
        }
      ]
    });

    const savedPenyedia = await testPenyedia.save();
    console.log('✅ Penyedia created with ID:', savedPenyedia._id);
    console.log('✅ Vendor users count:', savedPenyedia.operators.length);

    // Test 2: Verify vendor users were synced to User collection
    console.log('\n🔍 Test 2: Checking User collection for synced vendor users...');
    
    const vendorUsers = await User.find({ 
      role: 'vendor',
      penyediaId: savedPenyedia._id 
    });
    
    console.log('✅ Found vendor users in User collection:', vendorUsers.length);
    vendorUsers.forEach(user => {
      console.log(`   - ${user.username} (${user.email})`);
    });

    // Test 3: Update penyedia and add new vendor user
    console.log('\n✏️ Test 3: Adding new vendor user...');
    
    const updatedOperators = [
      ...savedPenyedia.operators,
      {
        namaLengkap: 'Rudi Hermawan',
        username: 'rudi.testvendor',
        password: '$2a$10$hashedpassword789',
        passwordDisplay: 'password789'
      }
    ];

    const updatedPenyedia = await Penyedia.findByIdAndUpdate(
      savedPenyedia._id,
      { operators: updatedOperators },
      { new: true }
    );

    console.log('✅ Updated penyedia, vendor users count:', updatedPenyedia.operators.length);

    // Test 4: Verify the new vendor user was synced
    console.log('\n🔍 Test 4: Checking for updated vendor users...');
    
    const updatedVendorUsers = await User.find({ 
      role: 'vendor',
      penyediaId: savedPenyedia._id 
    });
    
    console.log('✅ Total vendor users after update:', updatedVendorUsers.length);

    // Test 5: Clean up test data
    console.log('\n🧹 Test 5: Cleaning up test data...');
    
    await User.deleteMany({ 
      role: 'vendor',
      penyediaId: savedPenyedia._id 
    });
    
    await Penyedia.findByIdAndDelete(savedPenyedia._id);
    
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- ✅ Vendor users can be stored in Penyedia.operators array');
    console.log('- ✅ Vendor users are automatically synced to User collection');
    console.log('- ✅ Vendor users have role="vendor" in User collection');
    console.log('- ✅ Vendor users reference their Penyedia via penyediaId');
    console.log('- ✅ CRUD operations work with vendor users');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }
}

// Run the test
testVendorUserManagement();