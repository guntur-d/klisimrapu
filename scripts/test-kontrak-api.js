const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/simrapu';

// Test the kontrak API endpoint
async function testKontrakAPI() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get a valid JWT token by logging in
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'ops',
        password: '111111',
        budgetYear: '2026-Murni'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login successful');
    
    // Test the kontrak endpoint with subKegiatanId parameter
    const kontrakResponse = await fetch(`http://localhost:3000/api/kontrak?subKegiatanId=68f0782626a9b3bbec4e7a54`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${loginData.token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`📡 Kontrak API Response Status: ${kontrakResponse.status}`);
    
    const kontrakData = await kontrakResponse.json();
    
    if (kontrakResponse.ok) {
      console.log(`✅ Success! Found ${kontrakData.data?.length || 0} kontrak records`);
      console.log('📋 Sample kontrak data:', JSON.stringify(kontrakData.data?.[0], null, 2));
    } else {
      console.log('❌ Error:', kontrakData);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testKontrakAPI();