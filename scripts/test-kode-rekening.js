import fetch from 'node-fetch';

async function testKodeRekeningAPI() {
  try {
    console.log('Testing kode rekening API...');
    
    // Test basic kode rekening endpoint
    const response = await fetch('http://localhost:3000/api/koderekening');
    const data = await response.json();
    console.log('API Response status:', response.status);
    console.log('Number of kode rekening records:', data.data ? data.data.length : 0);
    
    if (data.data && data.data.length > 0) {
      console.log('Sample kode rekening record:');
      console.log(JSON.stringify(data.data[0], null, 2));
    }
    
    // Test with specific IDs if we have some
    if (data.data && data.data.length > 0) {
      const sampleIds = data.data.slice(0, 3).map(item => item._id).join(',');
      console.log('\nTesting specific IDs endpoint with IDs:', sampleIds);
      const specificResponse = await fetch(`http://localhost:3000/api/koderekening?ids=${sampleIds}`);
      const specificData = await specificResponse.json();
      console.log('Specific IDs response count:', specificData.data ? specificData.data.length : 0);
    }
    
  } catch (error) {
    console.error('Error testing API:', error.message);
  }
}

testKodeRekeningAPI();