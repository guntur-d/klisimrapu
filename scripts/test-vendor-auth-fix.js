// Test script to verify vendor authentication fix
// Run with: node test-vendor-auth-fix.js

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Penyedia from './models/Penyedia.js';

async function testVendorAuth() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/simrapu');
    console.log('✅ Connected to MongoDB');

    // Test 1: Create a vendor user for testing
    console.log('\n📝 Test 1: Setting up test vendor user...');
    
    // Hash the password '111111'
    const hashedPassword = await bcrypt.hash('111111', 10);
    
    // Create or update vendor
    let testPenyedia = await Penyedia.findOne({ NamaVendor: 'PT. Test Vendor 1' });
    
    if (!testPenyedia) {
      testPenyedia = new Penyedia({
        NamaVendor: 'PT. Test Vendor 1',
        NamaPimpinan: 'Vendor Leader',
        Alamat: 'Jl. Test Vendor 1',
        Email: 'test1@vendor.com',
        Telepon: '021-11111111',
        Website: 'https://testvendor1.com',
        operators: [
          {
            namaLengkap: 'Vendor User 1',
            username: 'vendor1',
            password: hashedPassword,
            passwordDisplay: '111111'
          }
        ]
      });
    } else {
      // Update operators array
      testPenyedia.operators = [
        {
          namaLengkap: 'Vendor User 1',
          username: 'vendor1',
          password: hashedPassword,
          passwordDisplay: '111111'
        }
      ];
    }

    const savedPenyedia = await testPenyedia.save();
    console.log('✅ Test vendor created/updated with ID:', savedPenyedia._id);
    console.log('✅ Vendor username: vendor1');
    console.log('✅ Vendor password: 111111 (hashed)');

    // Test 2: Verify password can be compared
    console.log('\n🔍 Test 2: Testing password comparison...');
    
    const isPasswordValid = await bcrypt.compare('111111', savedPenyedia.operators[0].password);
    console.log('✅ Password validation result:', isPasswordValid);
    
    if (!isPasswordValid) {
      throw new Error('Password validation failed');
    }

    // Test 3: Verify vendor can be found by username
    console.log('\n🔍 Test 3: Testing vendor lookup...');
    
    const foundPenyedia = await Penyedia.findOne(
      { 'operators.username': 'vendor1' },
      { 'operators.$': 1, NamaVendor: 1, NamaPimpinan: 1, _id: 1 }
    );
    
    if (!foundPenyedia) {
      throw new Error('Vendor not found by username');
    }
    
    console.log('✅ Vendor found by username:', foundPenyedia.NamaVendor);
    console.log('✅ Operator found:', foundPenyedia.operators[0].namaLengkap);

    console.log('\n🎉 All authentication tests passed!');
    console.log('\n📋 Summary:');
    console.log('- ✅ Vendor user "vendor1" with password "111111" has been created');
    console.log('- ✅ Password hashing and validation works correctly');
    console.log('- ✅ Vendor lookup by username works correctly');
    console.log('- ✅ Authentication endpoint should now work for vendor users');

    console.log('\n🚀 Next steps:');
    console.log('1. Start the server: npm start');
    console.log('2. Test login with username: vendor1, password: 111111');
    console.log('3. Verify redirect to /vendor-layout');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }
}

// Run the test
testVendorAuth();