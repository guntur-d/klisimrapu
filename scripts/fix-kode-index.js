import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PaketKegiatan from '../models/PaketKegiatan.js';

// Load environment variables
dotenv.config();

async function fixKodeIndex() {
  try {
    // Connect to MongoDB using the URI from .env
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/simrapu';
    await mongoose.connect(mongoUri);

    console.log('Connected to MongoDB');

    // Drop the existing index that doesn't have sparse: true
    const collection = mongoose.connection.db.collection('paketkegiatans');

    console.log('Dropping existing kode_1 index...');
    await collection.dropIndex('kode_1').catch(err => {
      console.log('Index might not exist:', err.message);
    });

    // Recreate the index with sparse: true
    console.log('Creating new sparse index on kode field...');
    await collection.createIndex({ kode: 1 }, { unique: true, sparse: true });

    console.log('Index fixed successfully!');
    console.log('Multiple null values in kode field are now allowed.');

  } catch (error) {
    console.error('Error fixing index:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

fixKodeIndex();