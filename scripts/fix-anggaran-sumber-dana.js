const mongoose = require('mongoose');
const Anggaran = require('../models/Anggaran').Anggaran;
const connectDB = require('../models/db');

async function fixAnggaranSumberDana() {
  try {
    console.log('=== CHECKING AND FIXING ANGGARAN SUMBER DANA DATA ===');
    
    // Find all anggaran records
    const anggaranList = await Anggaran.find({});
    console.log('Total anggaran records:', anggaranList.length);
    
    // Check each record
    let fixedCount = 0;
    for (let anggaran of anggaranList) {
      console.log(`\n--- Record ${anggaran._id} ---`);
      console.log('Budget Year:', anggaran.budgetYear);
      console.log('Has sumberDanaId field:', 'sumberDanaId' in anggaran);
      console.log('Current sumberDanaId:', anggaran.sumberDanaId);
      
      // If the record doesn't have sumberDanaId, set it to a default value
      if (!anggaran.sumberDanaId) {
        console.log('Setting default sumberDanaId...');
        anggaran.sumberDanaId = null; // or a default ID
        await anggaran.save();
        fixedCount++;
        console.log('Fixed record');
      }
    }
    
    console.log(`\n=== SUMMARY ===`);
    console.log(`Total records processed: ${anggaranList.length}`);
    console.log(`Records fixed: ${fixedCount}`);
    
    // Show a sample of what records look like now
    console.log(`\n=== SAMPLE RECORDS AFTER FIX ===`);
    const sampleRecords = await Anggaran.find({}).limit(2);
    for (let anggaran of sampleRecords) {
      console.log('\nRecord structure:');
      console.log('- ID:', anggaran._id);
      console.log('- Budget Year:', anggaran.budgetYear);
      console.log('- sumberDanaId:', anggaran.sumberDanaId);
      console.log('- All fields:', Object.keys(anggaran.toObject()));
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDatabase disconnected');
    process.exit(0);
  }
}

connectDB()
  .then(fixAnggaranSumberDana)
  .catch(error => {
    console.error('Database connection error:', error);
    process.exit(1);
  });