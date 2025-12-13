import http from 'http';

// Test login and CRUD operations for procurement module
const testProcurementCRUD = async () => {
  try {
    console.log('🔐 Testing Authentication...');
    
    // Login to get JWT token
    const loginData = {
      username: 'ops',
      password: '111111',
      budgetYear: '2026-Murni'
    };
    
    console.log('📝 Login data:', loginData);
    
    // Make login request
    const loginOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const loginReq = http.request(loginOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('📊 Login response status:', res.statusCode);
        console.log('📊 Login response:', data);
        
        if (res.statusCode === 200) {
          const response = JSON.parse(data);
          if (response.token) {
            console.log('✅ Authentication successful!');
            testProcurementEndpoints(response.token);
          } else {
            console.log('❌ No token received');
          }
        } else {
          console.log('❌ Authentication failed');
        }
      });
    });
    
    loginReq.on('error', (error) => {
      console.error('❌ Login error:', error);
    });
    
    loginReq.write(JSON.stringify(loginData));
    loginReq.end();
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
};

const testProcurementEndpoints = (token) => {
  console.log('\n🧪 Testing Procurement Module Endpoints...');
  
  // Test endpoints that the procurement module needs
  const endpoints = [
    '/api/kinerja?subPerangkatDaerahId=68f46a885e051327dc600285&budgetYear=2026-Murni',
    '/api/anggaran/68f4882b7400b5bb78be6c71',
    '/api/subkegiatan',
    '/api/koderekening',
    '/api/penyedia',
    '/api/metode-pengadaan',
    '/api/pejabat?jabatanFungsional=PA',
    '/api/kontrak',
    '/api/pengadaan'
  ];
  
  endpoints.forEach((endpoint, index) => {
    setTimeout(() => {
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: endpoint,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };
      
      console.log(`\n📡 Testing endpoint ${index + 1}: ${endpoint}`);
      
      const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          console.log(`📊 Response status: ${res.statusCode}`);
          
          if (res.statusCode === 200) {
            try {
              const response = JSON.parse(data);
              if (Array.isArray(response)) {
                console.log(`✅ Success: Array with ${response.length} items`);
              } else if (response.data && Array.isArray(response.data)) {
                console.log(`✅ Success: Array with ${response.data.length} items`);
              } else {
                console.log('✅ Success: Object response');
                console.log('🔍 Sample data keys:', Object.keys(response).slice(0, 5));
              }
            } catch (e) {
              console.log('✅ Success: Raw response received');
            }
          } else {
            console.log(`❌ Error: ${res.statusCode}`);
            console.log('📋 Response preview:', data.substring(0, 200));
          }
        });
      });
      
      req.on('error', (error) => {
        console.error(`❌ Request error: ${error.message}`);
      });
      
      req.end();
    }, index * 500); // Stagger requests by 500ms
  });
};

// Run the test
console.log('🚀 Starting Procurement Module CRUD Test...');
testProcurementCRUD();