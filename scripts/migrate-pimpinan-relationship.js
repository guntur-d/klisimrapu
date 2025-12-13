#!/usr/bin/env node

/**
 * Migration script to establish proper relationship between SubPerangkatDaerah and Pejabat
 * This script will:
 * 1. Find existing SubPerangkatDaerah records with string 'pimpinan' fields
 * 2. Try to match them with existing Pejabat records by name similarity
 * 3. Update SubPerangkatDaerah to use ObjectId reference instead of string
 * 4. Remove the old string field
 */

const mongoose = require('mongoose');
const path = require('path');

// Import models
const SubPerangkatDaerah = require('../models/SubPerangkatDaerah');
const Pejabat = require('../models/Pejabat');

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

// Helper function to calculate string similarity
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 100;
  
  // Check if one string contains the other
  if (s1.includes(s2) || s2.includes(s1)) return 80;
  
  // Calculate Levenshtein distance
  const matrix = [];
  
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  const distance = matrix[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);
  return Math.round(((maxLength - distance) / maxLength) * 100);
}

// Main migration function
async function migratePimpinanRelationship() {
  try {
    console.log('\n🚀 Starting migration: Establish SubPerangkatDaerah ↔ Pejales relationship\n');
    
    // Step 1: Get all SubPerangkatDaerah records
    const subPerangkatDaerahList = await SubPerangkatDaerah.find({
      pimpinan: { $exists: true, $type: 'string' }
    }).populate('perangkatDaerahId');
    
    console.log(`📊 Found ${subPerangkatDaerahList.length} SubPerangkatDaerah records with string 'pimpinan' field`);
    
    if (subPerangkatDaerahList.length === 0) {
      console.log('✅ No records to migrate');
      return;
    }
    
    // Step 2: Get all Pejabat records for matching
    const pejabatList = await Pejabat.find({ status: 'Aktif' });
    console.log(`📊 Found ${pejabatList.length} active Pejabat records for matching`);
    
    let migratedCount = 0;
    let unmatchedCount = 0;
    let partiallyMatchedCount = 0;
    
    // Step 3: Process each record
    for (const subOrg of subPerangkatDaerahList) {
      const currentPimpinan = subOrg.pimpinan;
      console.log(`\n🔍 Processing: ${subOrg.nama} (Current pimpinan: "${currentPimpinan}")`);
      
      if (!currentPimpinan || currentPimpinan.trim() === '') {
        console.log('⚠️  Empty pimpinan field, skipping...');
        continue;
      }
      
      // Try to find best matching Pejabat
      let bestMatch = null;
      let bestScore = 0;
      
      for (const pejabat of pejabatList) {
        const score = calculateSimilarity(currentPimpinan, pejabat.nama);
        if (score > bestScore && score >= 70) { // 70% similarity threshold
          bestScore = score;
          bestMatch = pejabat;
        }
      }
      
      if (bestMatch) {
        console.log(`✅ Found match: ${bestMatch.nama} (similarity: ${bestScore}%)`);
        
        // Update the SubPerangkatDaerah with ObjectId reference
        subOrg.pimpinanId = bestMatch._id;
        subOrg.pimpinan = bestMatch.nama; // Keep for backward compatibility initially
        
        await subOrg.save();
        migratedCount++;
        
      } else {
        console.log(`❌ No match found for "${currentPimpinan}"`);
        
        // If no match found, try partial matching with lower threshold
        let partialMatch = null;
        let partialScore = 0;
        
        for (const pejabat of pejabatList) {
          const score = calculateSimilarity(currentPimpinan, pejabat.nama);
          if (score > partialScore && score >= 50) { // 50% for partial match
            partialScore = score;
            partialMatch = pejabat;
          }
        }
        
        if (partialMatch) {
          console.log(`🔶 Partial match found: ${partialMatch.nama} (similarity: ${partialScore}%)`);
          subOrg.pimpinanId = partialMatch._id;
          subOrg.pimpinan = partialMatch.nama;
          await subOrg.save();
          partiallyMatchedCount++;
        } else {
          unmatchedCount++;
        }
      }
    }
    
    // Step 4: Add index for performance
    console.log('\n📈 Adding indexes for better performance...');
    await SubPerangkatDaerah.collection.createIndex({ pimpinanId: 1 });
    await SubPerangkatDaerah.collection.createIndex({ nama: 1, perangkatDaerahId: 1 });
    console.log('✅ Indexes added');
    
    // Step 5: Summary
    console.log('\n📋 Migration Summary:');
    console.log(`✅ Successfully migrated: ${migratedCount} records`);
    console.log(`🔶 Partially matched: ${partiallyMatchedCount} records`);
    console.log(`❌ Unmatched: ${unmatchedCount} records`);
    console.log(`📊 Total processed: ${subPerangkatDaerahList.length} records`);
    
    if (unmatchedCount > 0) {
      console.log('\n⚠️  Action Required:');
      console.log('Some records could not be automatically matched.');
      console.log('Please review unmatched records and manually assign correct Pejabat references.');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Cleanup function to remove old string field (run after manual review)
async function cleanupOldField() {
  try {
    console.log('\n🧹 Starting cleanup: Removing old string fields...');
    
    // Only proceed if all records have ObjectId references
    const recordsWithStringOnly = await SubPerangkatDaerah.countDocuments({
      pimpinanId: { $exists: false },
      pimpinan: { $exists: true, $type: 'string' }
    });
    
    if (recordsWithStringOnly > 0) {
      console.log(`❌ Cannot cleanup: ${recordsWithStringOnly} records still have string-only fields`);
      console.log('Please ensure all records have been properly migrated first.');
      return;
    }
    
    // Remove the old string field
    await SubPerangkatDaerah.updateMany(
      { },
      { $unset: { pimpinan: "" } }
    );
    
    console.log('✅ Old string fields removed successfully');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  }
}

// Main execution
async function main() {
  await connectDB();
  
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'migrate':
        await migratePimpinanRelationship();
        break;
      case 'cleanup':
        await cleanupOldField();
        break;
      case 'both':
        await migratePimpinanRelationship();
        await cleanupOldField();
        break;
      default:
        console.log('Usage: node migrate-pimpinan-relationship.js [migrate|cleanup|both]');
        console.log('  migrate - Run the migration to establish relationships');
        console.log('  cleanup - Remove old string fields after manual review');
        console.log('  both    - Run migration then cleanup');
        break;
    }
  } catch (error) {
    console.error('💥 Script failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { migratePimpinanRelationship, cleanupOldField, calculateSimilarity };