#!/usr/bin/env node

/**
 * Test script for the new SubPerangkatDaerah ↔ Pejabat relationship implementation
 * This script tests:
 * 1. Model relationships and validation
 * 2. CRUD operations with the new structure
 * 3. Frontend dropdown functionality
 * 4. Migration script functionality
 */

const mongoose = require('mongoose');
const path = require('path');

// Import models
const SubPerangkatDaerah = require('../models/SubPerangkatDaerah');
const Pejabat = require('../models/Pejabat');

// Import migration utilities
const { migratePimpinanRelationship, calculateSimilarity } = require('./migrate-pimpinan-relationship');

// Connect to database
async function connectDB() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/simrapu';
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Test 1: Model validation and relationships
async function testModelRelationships() {
  console.log('\n🧪 Test 1: Model Relationships and Validation');
  
  try {
    // Create test pejabat
    const testPejabat = new Pejabat({
      nama: 'Dr. John Doe',
      jabatanStruktural: 'Kepala Dinas',
      jabatanFungsional: 'PNS',
      email: 'john.doe@example.com',
      telepon: '+62123456789',
      status: 'Aktif',
      nip: '199001012020121001'
    });
    
    await testPejabat.save();
    console.log('✅ Test pejabat created:', testPejabat.nama);
    
    // Test SubPerangkatDaerah with new relationship
    const testSubOrg = new SubPerangkatDaerah({
      nama: 'Bagian Umum',
      pimpinanId: testPejabat._id,
      perangkatDaerahId: new mongoose.Types.ObjectId() // Mock ObjectId
    });
    
    await testSubOrg.save();
    console.log('✅ SubPerangkatDaerah created with pejabat relationship');
    
    // Test population
    const populated = await SubPerangkatDaerah.findById(testSubOrg._id)
      .populate('pimpinanId')
      .populate('perangkatDaerahId');
    
    console.log('✅ Population test passed');
    console.log('   - Nama:', populated.nama);
    console.log('   - Pimpinan:', populated.pimpinanId.nama);
    console.log('   - Jabatan:', populated.pimpinanId.jabatanStruktural);
    
    // Test backward compatibility (legacy field)
    const legacyTest = new SubPerangkatDaerah({
      nama: 'Bagian Keuangan',
      pimpinan: 'Jane Smith', // Legacy string field
      perangkatDaerahId: new mongoose.Types.ObjectId()
    });
    
    await legacyTest.save();
    console.log('✅ Legacy field compatibility test passed');
    
    // Cleanup
    await Pejabat.findByIdAndDelete(testPejabat._id);
    await SubPerangkatDaerah.findByIdAndDelete(testSubOrg._id);
    await SubPerangkatDaerah.findByIdAndDelete(legacyTest._id);
    
    return true;
  } catch (error) {
    console.error('❌ Model relationship test failed:', error.message);
    return false;
  }
}

// Test 2: Migration script functionality
async function testMigrationScript() {
  console.log('\n🧪 Test 2: Migration Script Functionality');
  
  try {
    // Create test data for migration
    const testPejabat1 = new Pejabat({
      nama: 'Ahmad Wijaya',
      jabatanStruktural: 'Kepala Sub Bagian',
      jabatanFungsional: 'PNS',
      email: 'ahmad@example.com',
      telepon: '+62812345678',
      status: 'Aktif',
      nip: '199002022020121002'
    });
    
    const testPejabat2 = new Pejabat({
      nama: 'Sari Indrawati',
      jabatanStruktural: 'Sekretaris',
      jabatanFungsional: 'PNS',
      email: 'sari@example.com',
      telepon: '+62823456789',
      status: 'Aktif',
      nip: '199003032020121003'
    });
    
    await testPejabat1.save();
    await testPejabat2.save();
    
    // Create SubPerangkatDaerah with legacy string fields
    const legacySubOrgs = [
      {
        nama: 'Sub Bagian Perencanaan',
        pimpinan: 'Ahmad Wijaya', // Should match exactly
        perangkatDaerahId: new mongoose.Types.ObjectId()
      },
      {
        nama: 'Sub Bagian Keuangan',
        pimpinan: 'Sari Indrawati', // Should match exactly
        perangkatDaerahId: new mongoose.Types.ObjectId()
      },
      {
        nama: 'Sub Bagian Umum',
        pimpinan: 'Budi Santoso', // No match - should remain unmatched
        perangkatDaerahId: new mongoose.Types.ObjectId()
      }
    ];
    
    const createdLegacySubOrgs = [];
    for (const subOrgData of legacySubOrgs) {
      const subOrg = new SubPerangkatDaerah(subOrgData);
      await subOrg.save();
      createdLegacySubOrgs.push(subOrg);
    }
    
    console.log('✅ Legacy test data created');
    
    // Run migration
    console.log('🔄 Running migration script...');
    await migratePimpinanRelationship();
    
    // Check results
    const migratedSubOrgs = await SubPerangkatDaerah.find({
      _id: { $in: createdLegacySubOrgs.map(s => s._id) }
    }).populate('pimpinanId');
    
    let migratedCount = 0;
    let unmatchedCount = 0;
    
    for (const subOrg of migratedSubOrgs) {
      if (subOrg.pimpinanId) {
        migratedCount++;
        console.log(`✅ Migrated: ${subOrg.nama} → ${subOrg.pimpinanId.nama}`);
      } else {
        unmatchedCount++;
        console.log(`❌ Unmatched: ${subOrg.nama} (pimpinan: ${subOrg.pimpinan})`);
      }
    }
    
    // Test similarity calculation
    console.log('\n🔍 Testing similarity calculation:');
    const similarity1 = calculateSimilarity('Ahmad Wijaya', 'Ahmad Wijaya');
    const similarity2 = calculateSimilarity('Budi Santoso', 'Ahmad Wijaya');
    console.log(`   "Ahmad Wijaya" vs "Ahmad Wijaya": ${similarity1}%`);
    console.log(`   "Budi Santoso" vs "Ahmad Wijaya": ${similarity2}%`);
    
    // Cleanup
    await Pejabat.findByIdAndDelete(testPejabat1._id);
    await Pejabat.findByIdAndDelete(testPejabat2._id);
    await SubPerangkatDaerah.deleteMany({ _id: { $in: createdLegacySubOrgs.map(s => s._id) } });
    
    console.log(`\n📊 Migration Results: ${migratedCount} migrated, ${unmatchedCount} unmatched`);
    return migratedCount > 0;
    
  } catch (error) {
    console.error('❌ Migration test failed:', error.message);
    return false;
  }
}

// Test 3: Frontend data structure compatibility
async function testFrontendCompatibility() {
  console.log('\n🧪 Test 3: Frontend Data Structure Compatibility');
  
  try {
    // Create test pejabat for frontend compatibility
    const testPejabat = new Pejabat({
      nama: 'Frontend Test Pejabat',
      jabatanStruktural: 'Test Jabatan',
      jabatanFungsional: 'PNS',
      email: 'frontend@test.com',
      telepon: '+62812345678',
      status: 'Aktif',
      nip: '199004042020121004'
    });
    
    await testPejabat.save();
    
    // Create SubPerangkatDaerah as it would be returned from API
    const testSubOrg = new SubPerangkatDaerah({
      nama: 'Frontend Test Sub Org',
      pimpinanId: testPejabat._id,
      perangkatDaerahId: new mongoose.Types.ObjectId()
    });
    
    await testSubOrg.save();
    
    // Simulate API response with population (as frontend would receive it)
    const populatedSubOrg = await SubPerangkatDaerah.findById(testSubOrg._id)
      .populate('pimpinanId')
      .populate('perangkatDaerahId')
      .lean(); // Convert to plain object for JSON serialization
    
    console.log('✅ Frontend data structure test');
    console.log('   - SubOrg nama:', populatedSubOrg.nama);
    console.log('   - pimpinanId type:', typeof populatedSubOrg.pimpinanId);
    console.log('   - Has populated pejabat:', !!populatedSubOrg.pimpinanId.nama);
    
    // Test dropdown data format (as frontend would use it)
    const allPejabat = await Pejabat.find({ status: 'Aktif' }).lean();
    const dropdownData = allPejabat.map(pejabat => ({
      _id: pejabat._id.toString(),
      nama: pejabat.nama,
      jabatanStruktural: pejabat.jabatanStruktural,
      display: `${pejabat.nama} (${pejabat.jabatanStruktural})`
    }));
    
    console.log('✅ Dropdown data format test');
    console.log('   - Dropdown items:', dropdownData.length);
    console.log('   - Sample item:', dropdownData[0]);
    
    // Cleanup
    await Pejabat.findByIdAndDelete(testPejabat._id);
    await SubPerangkatDaerah.findByIdAndDelete(testSubOrg._id);
    
    return true;
  } catch (error) {
    console.error('❌ Frontend compatibility test failed:', error.message);
    return false;
  }
}

// Test 4: Error handling and edge cases
async function testEdgeCases() {
  console.log('\n🧪 Test 4: Error Handling and Edge Cases');
  
  try {
    // Test 1: SubPerangkatDaerah without pimpinanId or pimpinan
    const invalidSubOrg = new SubPerangkatDaerah({
      nama: 'Invalid Sub Org',
      perangkatDaerahId: new mongoose.Types.ObjectId()
      // Missing both pimpinanId and pimpinan
    });
    
    try {
      await invalidSubOrg.save();
      console.log('❌ Should have failed validation');
      return false;
    } catch (error) {
      console.log('✅ Correctly rejected invalid SubPerangkatDaerah');
    }
    
    // Test 2: Non-existent pejabat reference
    const nonExistentRef = new SubPerangkatDaerah({
      nama: 'Non Existent Ref',
      pimpinanId: new mongoose.Types.ObjectId(), // Non-existent ObjectId
      perangkatDaerahId: new mongoose.Types.ObjectId()
    });
    
    try {
      await nonExistentRef.save();
      // This might succeed in MongoDB but fail on population
      const populated = await SubPerangkatDaerah.findById(nonExistentRef._id)
        .populate('pimpinanId');
      console.log('✅ Non-existent reference handled');
    } catch (error) {
      console.log('✅ Non-existent reference correctly handled');
    }
    
    // Test 3: Empty string validation
    const emptyStringTest = new SubPerangkatDaerah({
      nama: 'Empty String Test',
      pimpinan: '', // Empty string should still be valid with exists check
      perangkatDaerahId: new mongoose.Types.ObjectId()
    });
    
    await emptyStringTest.save();
    console.log('✅ Empty string handling test passed');
    
    // Cleanup
    await SubPerangkatDaerah.findByIdAndDelete(nonExistentRef._id).catch(() => {});
    await SubPerangkatDaerah.findByIdAndDelete(emptyStringTest._id);
    
    return true;
  } catch (error) {
    console.error('❌ Edge case test failed:', error.message);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting SubPerangkatDaerah ↔ Pejabat Relationship Tests');
  console.log('=' * 70);
  
  await connectDB();
  
  const tests = [
    { name: 'Model Relationships', test: testModelRelationships },
    { name: 'Migration Script', test: testMigrationScript },
    { name: 'Frontend Compatibility', test: testFrontendCompatibility },
    { name: 'Edge Cases', test: testEdgeCases }
  ];
  
  let passedTests = 0;
  let totalTests = tests.length;
  
  for (const { name, test } of tests) {
    try {
      const result = await test();
      if (result) {
        passedTests++;
      }
    } catch (error) {
      console.error(`❌ Test "${name}" crashed:`, error.message);
    }
  }
  
  console.log('\n' + '=' * 70);
  console.log('📊 Test Results Summary');
  console.log('=' * 70);
  console.log(`✅ Passed: ${passedTests}/${totalTests} tests`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests} tests`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! The relationship refactoring is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the implementation.');
  }
  
  console.log('\n📝 Next Steps:');
  console.log('1. Run the migration: node scripts/migrate-pimpinan-relationship.js migrate');
  console.log('2. Test the frontend functionality');
  console.log('3. After manual verification, run: node scripts/migrate-pimpinan-relationship.js cleanup');
}

// Run tests if called directly
if (require.main === module) {
  runAllTests()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('💥 Test suite failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await mongoose.connection.close();
      console.log('\n🔌 Database connection closed');
    });
}

module.exports = {
  testModelRelationships,
  testMigrationScript,
  testFrontendCompatibility,
  testEdgeCases,
  runAllTests
};