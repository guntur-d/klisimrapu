#!/usr/bin/env node

import mongoose from 'mongoose';
import 'dotenv/config';

console.log('🧪 Testing database connection...');

async function testConnection() {
  try {
    const mongoURI = process.env.MONGODB_URI;
    console.log('🔌 Attempting to connect to MongoDB...');
    console.log('📍 Connection URI:', mongoURI ? '***configured***' : 'mongodb://localhost:27017/simrapu');

    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // 10 second timeout for Atlas
    });

    console.log('✅ Database connected successfully!');
    console.log('📊 Database name:', conn.connection.name);
    console.log('🖥️ Host:', conn.connection.host);
    console.log('🔢 Port:', conn.connection.port);

    // Test basic operations
    console.log('\n🗄️ Testing database operations...');

    // List collections
    const collections = await conn.connection.db.listCollections().toArray();
    console.log(`📋 Collections found: ${collections.length}`);
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });

    // Test inserting a simple document
    console.log('\n💾 Testing insert operation...');
    const testCollection = conn.connection.db.collection('test_connection');

    const testDoc = {
      test: 'Database connection test',
      timestamp: new Date(),
      success: true
    };

    const insertResult = await testCollection.insertOne(testDoc);
    console.log(`✅ Test document inserted with ID: ${insertResult.insertedId}`);

    // Clean up test document
    await testCollection.deleteOne({ _id: insertResult.insertedId });
    console.log('🧹 Test document cleaned up');

    console.log('\n🎉 All database tests passed!');

  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('   Error:', error.message);

    if (error.code) {
      console.error('   Code:', error.code);
    }

    if (error.codeName) {
      console.error('   Code Name:', error.codeName);
    }

    console.error('\n🔍 Possible issues:');
    console.error('   1. MongoDB server is not running');
    console.error('   2. Connection URI is incorrect');
    console.error('   3. Network/firewall blocking connection');
    console.error('   4. MongoDB authentication issues');

    console.error('\n💡 Try these solutions:');
    console.error('   1. Start MongoDB server: mongod');
    console.error('   2. Check if MongoDB is running on port 27017');
    console.error('   3. Verify connection string in environment variables');

  } finally {
    try {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed');
    } catch (err) {
      console.error('❌ Error closing connection:', err.message);
    }
  }
}

testConnection();