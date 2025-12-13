// Debug script to test Indoarea API for regencies
const https = require('https');
const http = require('http');

function testAPI(url, useHTTPS = true) {
    return new Promise((resolve, reject) => {
        const client = useHTTPS ? https : http;
        
        client.get(url, (response) => {
            let data = '';
            response.on('data', (chunk) => {
                data += chunk;
            });
            response.on('end', () => {
                console.log('Response status:', response.statusCode);
                console.log('Response headers:', response.headers);
                
                try {
                    if (data.startsWith('<')) {
                        reject(new Error('Response is HTML, not JSON'));
                    } else {
                        resolve(JSON.parse(data));
                    }
                } catch (e) {
                    console.log('Raw response (first 500 chars):', data.substring(0, 500));
                    reject(e);
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

async function debugIndoareaAPI() {
    console.log('Debugging Indoarea API for regencies...\n');
    
    // Test different province codes
    const testProvinces = ['31', '33', '34', '35']; // Jakarta, Central Java, Yogyakarta, East Java
    
    for (const provinceCode of testProvinces) {
        console.log(`\n=== Testing Province Code: ${provinceCode} ===`);
        
        try {
            // Test the endpoint
            const url = `https://indoarea.vercel.app/api/kabupaten-kota?provinsi_code=${provinceCode}`;
            console.log('Fetching:', url);
            
            const data = await testAPI(url);
            console.log('Success! Response structure:');
            console.log('- success:', data.success);
            console.log('- data type:', typeof data.data);
            console.log('- data length:', Array.isArray(data.data) ? data.data.length : 'N/A');
            
            if (data.data && data.data.length > 0) {
                console.log('- First regency sample:', data.data[0]);
                console.log('- Regencies found for province', provinceCode, ':', data.data.map(r => r.name));
            } else {
                console.log('- No regencies found in response');
            }
            
        } catch (error) {
            console.log('Failed:', error.message);
        }
    }
}

debugIndoareaAPI();