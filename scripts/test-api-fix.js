const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/simrapu';

console.log('🚀 Testing kontrak API fix...');

// Test with browser to see if the 404 is now resolved
fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'ops',
    password: '111111',
    budgetYear: '2026-Murni'
  })
})
.then(response => response.json())
.then(loginData => {
  console.log('✅ Login successful, token received');
  
  // Now test the kontrak API with subKegiatanId parameter
  return fetch('http://localhost:3000/api/kontrak?subKegiatanId=68f0782626a9b3bbec4e7a54', {
    headers: { 'Authorization': `Bearer ${loginData.token}` }
  })
  .then(response => {
    console.log(`📡 API Response Status: ${response.status}`);
    return response.json();
  });
})
.then(data => {
  if (data.success) {
    console.log(`✅ SUCCESS! Found ${data.data?.length || 0} kontrak records`);
    console.log('📋 First kontrak:', JSON.stringify(data.data?.[0], null, 2));
  } else {
    console.log('❌ API returned error:', data);
  }
})
.catch(error => {
  console.log('❌ Error:', error.message);
});