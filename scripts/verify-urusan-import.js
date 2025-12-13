#!/usr/bin/env node

/**
 * Verification script to check if Urusan import was successful
 * Shows summary statistics and sample data from each collection
 */

import mongoose from 'mongoose';
import {
  Urusan,
  Bidang,
  Program,
  Kegiatan,
  SubKegiatan
} from '../models/Urusan.js';
import 'dotenv/config';

/**
 * Main verification function
 */
async function verifyImport() {
  console.log('🔍 Verifying Urusan Import Results...\n');
  
  try {
    // Connect to database
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error('MONGODB_URI environment variable not set');
    }
    
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB\n');
    
    // Get counts for each collection
    const counts = {
      urusan: await Urusan.countDocuments(),
      bidang: await Bidang.countDocuments(),
      program: await Program.countDocuments(),
      kegiatan: await Kegiatan.countDocuments(),
      subKegiatan: await SubKegiatan.countDocuments()
    };
    
    console.log('📊 Import Statistics:');
    console.log(`   Urusan: ${counts.urusan} records`);
    console.log(`   Bidang: ${counts.bidang} records`);
    console.log(`   Program: ${counts.program} records`);
    console.log(`   Kegiatan: ${counts.kegiatan} records`);
    console.log(`   SubKegiatan: ${counts.subKegiatan} records`);
    console.log(`   Total: ${Object.values(counts).reduce((a, b) => a + b, 0)} records\n`);
    
    // Sample data from each collection
    console.log('📋 Sample Data:\n');
    
    // Sample Urusan
    const sampleUrusan = await Urusan.find().limit(3).lean();
    if (sampleUrusan.length > 0) {
      console.log('🏛️  Sample Urusan:');
      sampleUrusan.forEach(urusan => {
        console.log(`   • ${urusan.kode} - ${urusan.nama}`);
      });
      console.log('');
    }
    
    // Sample Bidang with Urusan relationship
    const sampleBidang = await Bidang.find()
      .populate('urusanId', 'kode nama')
      .limit(3)
      .lean();
    if (sampleBidang.length > 0) {
      console.log('🏢 Sample Bidang:');
      sampleBidang.forEach(bidang => {
        console.log(`   • ${bidang.kode} - ${bidang.nama} (${bidang.urusanId?.kode})`);
      });
      console.log('');
    }
    
    // Sample Program with Bidang relationship
    const sampleProgram = await Program.find()
      .populate({
        path: 'bidangId',
        populate: {
          path: 'urusanId',
          select: 'kode nama'
        }
      })
      .limit(3)
      .lean();
    if (sampleProgram.length > 0) {
      console.log('📋 Sample Program:');
      sampleProgram.forEach(program => {
        console.log(`   • ${program.kode} - ${program.nama}`);
        console.log(`     Urusan: ${program.bidangId?.urusanId?.kode || 'N/A'}`);
      });
      console.log('');
    }
    
    // Sample Kegiatan with Program relationship
    const sampleKegiatan = await Kegiatan.find()
      .populate({
        path: 'programId',
        populate: {
          path: 'bidangId',
          select: 'kode nama'
        }
      })
      .limit(3)
      .lean();
    if (sampleKegiatan.length > 0) {
      console.log('⚡ Sample Kegiatan:');
      sampleKegiatan.forEach(kegiatan => {
        console.log(`   • ${kegiatan.kode} - ${kegiatan.nama}`);
        console.log(`     Program: ${kegiatan.programId?.kode || 'N/A'}`);
      });
      console.log('');
    }
    
    // Sample SubKegiatan with Kegiatan relationship
    const sampleSubKegiatan = await SubKegiatan.find()
      .populate({
        path: 'kegiatanId',
        populate: {
          path: 'programId',
          select: 'kode nama'
        }
      })
      .limit(3)
      .lean();
    if (sampleSubKegiatan.length > 0) {
      console.log('📝 Sample SubKegiatan:');
      sampleSubKegiatan.forEach(subKegiatan => {
        console.log(`   • ${subKegiatan.kode} - ${subKegiatan.nama}`);
        console.log(`     Kegiatan: ${subKegiatan.kegiatanId?.kode || 'N/A'}`);
        console.log(`     Indikator: ${subKegiatan.indikator || 'N/A'}`);
        console.log(`     Satuan: ${subKegiatan.satuan || 'N/A'}`);
      });
      console.log('');
    }
    
    // Check for relationship integrity
    console.log('🔗 Relationship Integrity Check:');
    
    // Check if all Bidang have valid Urusan references
    const orphanBidang = await Bidang.countDocuments({ 
      urusanId: { $in: [null, undefined] } 
    });
    console.log(`   • Orphan Bidang (no Urusan): ${orphanBidang}`);
    
    // Check if all Program have valid Bidang references
    const orphanProgram = await Program.countDocuments({ 
      bidangId: { $in: [null, undefined] } 
    });
    console.log(`   • Orphan Program (no Bidang): ${orphanProgram}`);
    
    // Check if all Kegiatan have valid Program references
    const orphanKegiatan = await Kegiatan.countDocuments({ 
      programId: { $in: [null, undefined] } 
    });
    console.log(`   • Orphan Kegiatan (no Program): ${orphanKegiatan}`);
    
    // Check if all SubKegiatan have valid Kegiatan references
    const orphanSubKegiatan = await SubKegiatan.countDocuments({ 
      kegiatanId: { $in: [null, undefined] } 
    });
    console.log(`   • Orphan SubKegiatan (no Kegiatan): ${orphanSubKegiatan}`);
    
    // Overall assessment
    console.log('\n📈 Assessment:');
    const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0);
    const orphanCount = orphanBidang + orphanProgram + orphanKegiatan + orphanSubKegiatan;
    
    if (totalRecords > 0 && orphanCount === 0) {
      console.log('   ✅ Import appears to be successful!');
      console.log('   ✅ All relationships are properly linked.');
      console.log('   ✅ Data structure is complete.');
    } else if (totalRecords > 0) {
      console.log('   ⚠️  Import completed with some issues.');
      console.log(`   ⚠️  Found ${orphanCount} orphaned records.`);
    } else {
      console.log('   ❌ No data found. Import may have failed.');
    }
    
    // Database cleanup
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    
    // Ensure database connection is closed
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    
    process.exit(1);
  }
}

// Run the verification
verifyImport();