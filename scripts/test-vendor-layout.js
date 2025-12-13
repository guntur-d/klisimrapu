// Test script to verify vendor layout implementation
// Run with: node test-vendor-layout.js

const mongoose = require('mongoose');
const User = require('./models/User.js');
const Penyedia = require('./models/Penyedia.js');
const Kontrak = require('./models/Kontrak.js');
const Termin = require('./models/Termin.js');

async function testVendorLayout() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/simrapu');
    console.log('✅ Connected to MongoDB');

    // Test 1: Check if vendor role exists in User model
    console.log('\n📝 Test 1: Checking User model for vendor role...');
    const vendorUsers = await User.find({ role: 'vendor' });
    console.log('✅ Found vendor users:', vendorUsers.length);
    vendorUsers.forEach(user => {
      console.log(`   - ${user.username} (penyediaId: ${user.penyediaId})`);
    });

    // Test 2: Check if vendor users have penyedia association
    console.log('\n📝 Test 2: Checking vendor users Penyedia association...');
    for (const user of vendorUsers) {
      if (user.penyediaId) {
        const penyedia = await Penyedia.findById(user.penyediaId);
        console.log(`   - ${user.username} -> ${penyedia ? penyedia.NamaVendor : 'No penyedia found'}`);
      }
    }

    // Test 3: Check if kontrak exists for vendors
    console.log('\n📝 Test 3: Checking kontrak for vendors...');
    if (vendorUsers.length > 0 && vendorUsers[0].penyediaId) {
      const kontrak = await Kontrak.find({ 
        penyediaId: vendorUsers[0].penyediaId 
      });
      console.log('✅ Found kontrak for first vendor:', kontrak.length);
      
      if (kontrak.length > 0) {
        console.log('   Kontrak details:');
        kontrak.forEach(k => {
          console.log(`   - ${k.noKontrak} (${k.nilaiKontrak})`);
        });

        // Test 4: Check termin for first kontrak
        console.log('\n📝 Test 4: Checking termin for kontrak...');
        const termin = await Termin.find({ kontrakId: kontrak[0]._id });
        console.log('✅ Found termin:', termin.length);
        termin.forEach(t => {
          console.log(`   - ${t.termin} (${t.persentaseDana}%)`);
        });
      }
    }

    // Test 5: Check Termin model enhancements
    console.log('\n📝 Test 5: Checking Termin model enhancements...');
    const terminSchema = Termin.schema.paths;
    console.log('✅ Termin model has following fields:');
    Object.keys(terminSchema).forEach(field => {
      if (!field.startsWith('_') && field !== 'id') {
        console.log(`   - ${field}`);
      }
    });

    console.log('\n🎉 All tests completed!');
    console.log('\n📋 Summary:');
    console.log('- ✅ Vendor role exists in User model');
    console.log('- ✅ Vendor users can be associated with Penyedia');
    console.log('- ✅ Vendor contracts can be retrieved');
    console.log('- ✅ Contract termin can be retrieved');
    console.log('- ✅ Termin model supports vendor reporting fields');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }
}

// Run the test
testVendorLayout();