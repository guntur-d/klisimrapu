import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';

// Test authentication and koderekening API
async function testAuthenticationAndKodeRekening() {
  console.log('=== Testing Authentication and Kode Rekening API ===\n');
  
  try {
    // Step 1: Login to get JWT token
    console.log('1. Testing login with ops/111111...');
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

    console.log(`Login response status: ${loginResponse.status}`);
    
    if (loginResponse.status === 200) {
      const loginData = await loginResponse.json();
      console.log('Login successful!');
      console.log('User data:', loginData.user);
      console.log('Token (first 50 chars):', loginData.token ? loginData.token.substring(0, 50) + '...' : 'NO TOKEN');
      
      if (loginData.token) {
        // Step 2: Test koderekening API with JWT token
        console.log('\n2. Testing koderekening API with JWT token...');
        const kodeRekeningResponse = await fetch('http://localhost:3000/api/koderekening', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${loginData.token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log(`Kode rekening API response status: ${kodeRekeningResponse.status}`);
        
        if (kodeRekeningResponse.status === 200) {
          const kodeRekeningData = await kodeRekeningResponse.json();
          console.log('Kode rekening API successful!');
          console.log('Number of records:', kodeRekeningData.data ? kodeRekeningData.data.length : 0);
          
          if (kodeRekeningData.data && kodeRekeningData.data.length > 0) {
            console.log('Sample records:');
            kodeRekeningData.data.slice(0, 3).forEach((record, index) => {
              console.log(`  ${index + 1}. ID: ${record._id}, Code: ${record.code}, Name: ${record.name}`);
            });
          }
        } else {
          const errorData = await kodeRekeningResponse.text();
          console.log('Kode rekening API failed!');
          console.log('Error response:', errorData);
        }

        // Step 3: Test koderekening API with specific IDs
        console.log('\n3. Testing koderekening API with specific IDs...');
        
        // Store the data from step 2
        const fullKodeRekeningData = kodeRekeningData;
        
        // Get some IDs from the full list
        if (fullKodeRekeningData.data && fullKodeRekeningData.data.length > 0) {
          const sampleIds = fullKodeRekeningData.data.slice(0, 2).map(r => r._id).join(',');
          console.log('Testing with IDs:', sampleIds);
          
          const specificResponse = await fetch(`http://localhost:3000/api/koderekening?ids=${sampleIds}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${loginData.token}`,
              'Content-Type': 'application/json'
            }
          });

          console.log(`Specific koderekening API response status: ${specificResponse.status}`);
          
          if (specificResponse.status === 200) {
            const specificData = await specificResponse.json();
            console.log('Specific koderekening API successful!');
            console.log('Number of specific records:', specificData.data ? specificData.data.length : 0);
            
            if (specificData.data) {
              specificData.data.forEach((record, index) => {
                console.log(`  ${index + 1}. ID: ${record._id}, Code: ${record.code}, Name: ${record.name}`);
              });
            }
          } else {
            const errorData = await specificResponse.text();
            console.log('Specific koderekening API failed!');
            console.log('Error response:', errorData);
          }
        }
      } else {
        console.log('No token received from login!');
      }
    } else {
      const errorData = await loginResponse.text();
      console.log('Login failed!');
      console.log('Error response:', errorData);
    }

  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
testAuthenticationAndKodeRekening();