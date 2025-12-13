import fetch from 'node-fetch';

async function testSumberDanaAPI() {
  const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTAyZTg4YzQzZDg2ZmYwNDFhMzAzNGQiLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzY0NTYwMjk3LCJleHAiOjE3NjUxNjUwOTd9.TCiOe1GaN7S4YNmbAoi0yDHBRfmVtXIW8TDohvkOGQ4";
  
  try {
    console.log('🧪 Testing SumberDana API...');
    
    const response = await fetch('http://localhost:3000/api/sumberdana', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', response.headers.raw());
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Response:', JSON.stringify(data, null, 2));
      
      if (data.success && data.data) {
        console.log(`📊 Found ${data.data.length} SumberDana records:`);
        data.data.forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.kode} - ${item.nama} (${item.isActive ? 'Aktif' : 'Non Aktif'})`);
        });
      } else {
        console.log('⚠️ No data found in response');
      }
    } else {
      const errorText = await response.text();
      console.log('❌ API Error:', response.status, errorText);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSumberDanaAPI();