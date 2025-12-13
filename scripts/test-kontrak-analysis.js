import http from 'http';

// Test kontrak data analysis
const analyzeKontrakData = async () => {
  try {
    console.log('🔐 Getting authentication token...');
    
    // Login first
    const loginData = {
      username: 'ops',
      password: '111111',
      budgetYear: '2026-Murni'
    };
    
    const loginOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const loginResponse = await new Promise((resolve, reject) => {
      const loginReq = http.request(loginOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      });
      loginReq.on('error', reject);
      loginReq.write(JSON.stringify(loginData));
      loginReq.end();
    });
    
    if (!loginResponse.token) {
      console.log('❌ Login failed');
      return;
    }
    
    console.log('✅ Login successful');
    const token = loginResponse.token;
    
    // Get target subkegiatan
    console.log('\n📊 Finding target subkegiatan...');
    const subkegiatanResponse = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/subkegiatan',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };
      
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      });
      req.on('error', reject);
      req.end();
    });
    
    // Handle different response formats
    const subkegiatanData = Array.isArray(subkegiatanResponse) ? subkegiatanResponse :
                           (subkegiatanResponse.data || subkegiatanResponse.items || []);
    
    console.log(`📊 Response format: ${Array.isArray(subkegiatanResponse) ? 'Array' : typeof subkegiatanResponse}`);
    console.log(`📊 Subkegiatan count: ${subkegiatanData.length}`);
    
    // Find "Peningkatan Jaringan Irigasi Tambak"
    const targetSubkegiatan = subkegiatanData.find(s =>
      s.nama && s.nama.toLowerCase().includes('peningkatan') &&
      s.nama.toLowerCase().includes('irigasi') &&
      s.nama.toLowerCase().includes('tambak')
    );
    
    if (targetSubkegiatan) {
      console.log(`✅ Found target subkegiatan: ${targetSubkegiatan.nama}`);
      console.log(`📋 ID: ${targetSubkegiatan._id}`);
      
      // Get existing kontrak for this subkegiatan
      console.log('\n📊 Checking existing kontrak data...');
      const kontrakResponse = await new Promise((resolve, reject) => {
        const options = {
          hostname: 'localhost',
          port: 3000,
          path: `/api/kontrak?subKegiatanId=${targetSubkegiatan._id}`,
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        };
        
        const req = http.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', reject);
        req.end();
      });
      
      console.log(`📊 Existing kontrak count: ${kontrakResponse.length}`);
      if (kontrakResponse.length > 0) {
        console.log('📋 Sample kontrak record:');
        console.log(JSON.stringify(kontrakResponse[0], null, 2));
      }
      
    } else {
      console.log('❌ Target subkegiatan not found');
      console.log('🔍 Available subkegiatan with "tambak":');
      const tambakSubkeg = subkegiatanResponse.filter(s => 
        s.nama && s.nama.toLowerCase().includes('tambak')
      );
      tambakSubkeg.forEach(s => console.log(`- ${s.nama}`));
    }
    
  } catch (error) {
    console.error('❌ Analysis error:', error);
  }
};

console.log('🚀 Starting Kontrak Data Analysis...');
analyzeKontrakData();