#!/usr/bin/env node

import mongoose from 'mongoose';
import { connectDB } from '../models/db.js';
import AkunLRA from '../models/AkunLRA.js';

console.log('🧪 Testing model connection and collection creation...');

async function testModel() {
  try {
    console.log('🔌 Connecting to database...');
    await connectDB();

    // Wait for connection to stabilize
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('📋 Testing model registration...');

    // Check if model is registered
    const modelNames = mongoose.modelNames();
    console.log('📝 Registered models:', modelNames);

    const akunLRARegistered = modelNames.includes('AkunLRA');
    console.log('✅ AkunLRA model registered:', akunLRARegistered);

    // Try to get collection name
    const collectionName = AkunLRA.collection.name;
    console.log('📦 Collection name:', collectionName);

    // Check if collection exists in database
    const collections = await mongoose.connection.db.listCollections({ name: collectionName }).toArray();
    const collectionExists = collections.length > 0;

    console.log('🗄️ Collection exists in DB:', collectionExists);

    if (!collectionExists) {
      console.log('🔨 Creating collection by inserting test document...');

      const testAccount = new AkunLRA({
        code: 'TEST',
        name: 'Test Account',
        fullCode: 'TEST',
        description: 'Test account for collection creation',
        level: 1,
        isLeaf: true
      });

      const savedAccount = await testAccount.save();
      console.log('✅ Test document inserted:', savedAccount._id);

      // Clean up test document
      await AkunLRA.deleteOne({ _id: savedAccount._id });
      console.log('🧹 Test document cleaned up');
    }

    // Now check again
    const collectionsAfter = await mongoose.connection.db.listCollections({ name: collectionName }).toArray();
    console.log('🗄️ Collection exists after test:', collectionsAfter.length > 0);

    // Check document count
    const count = await AkunLRA.countDocuments();
    console.log('📊 Document count:', count);

    console.log('\n🎉 Model test completed!');

  } catch (error) {
    console.error('❌ Model test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    try {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed');
    } catch (err) {
      console.error('❌ Error closing connection:', err.message);
    }
  }
}

testModel();