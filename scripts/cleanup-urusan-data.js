#!/usr/bin/env node

/**
 * Cleanup script to remove existing Urusan data before re-import
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

async function cleanupData() {
  console.log('🧹 Cleaning up existing Urusan data...\n');
  
  try {
    // Connect to database
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error('MONGODB_URI environment variable not set');
    }
    
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB\n');
    
    // Drop collections in reverse dependency order
    console.log('🗑️  Dropping collections...');
    
    const collections = [
      { name: 'SubKegiatan', model: SubKegiatan },
      { name: 'Kegiatan', model: Kegiatan },
      { name: 'Program', model: Program },
      { name: 'Bidang', model: Bidang },
      { name: 'Urusan', model: Urusan }
    ];
    
    for (const { name, model } of collections) {
      const result = await model.deleteMany({});
      console.log(`   • Cleared ${name}: ${result.deletedCount} records`);
    }
    
    console.log('\n✅ All existing data cleaned up successfully!');
    
    // Database cleanup
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    
    // Ensure database connection is closed
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    
    process.exit(1);
  }
}

// Run the cleanup
cleanupData();