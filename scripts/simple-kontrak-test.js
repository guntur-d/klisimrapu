const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/simrapu';

console.log('🚀 Testing kontrak API endpoint...');

// Test with browser to see the exact error
fetch('http://localhost:3000/api/kontrak?subKegiatanId=68f0782626a9b3bbec4e7a54')
  .then(response => {
    console.log(`Status: ${response.status}`);
    console.log(`Status Text: ${response.statusText}`);
    console.log(`Headers:`, Object.fromEntries(response.headers.entries()));
    return response.json();
  })
  .then(data => {
    console.log('✅ Success:', data);
  })
  .catch(error => {
    console.log('❌ Error:', error.message);
  });