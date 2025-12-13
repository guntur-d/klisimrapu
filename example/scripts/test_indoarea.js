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
                console.log('Raw response (first 200 chars):', data.substring(0, 200));
                
                try {
                    if (data.startsWith('<')) {
                        reject(new Error('Response is HTML, not JSON'));
                    } else {
                        resolve(JSON.parse(data));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

async function testIndoAreaAPI() {
    console.log('Testing indoarea.vercel.app APIs...\n');
    
    const endpoints = [
        'https://indoarea.vercel.app/provinces',
        'http://indoarea.vercel.app/provinces',
        'https://indoarea.vercel.app/api/provinces',
        'http://indoarea.vercel.app/api/provinces',
        'https://api.indoarea.vercel.app/provinces',
        'https://indoarea.vercel.app',
    ];
    
    for (const endpoint of endpoints) {
        console.log(`\nTrying: ${endpoint}`);
        try {
            const data = await testAPI(endpoint);
            console.log('Success! Sample data:', JSON.stringify(data.slice(0, 2), null, 2));
            break;
        } catch (error) {
            console.log('Failed:', error.message);
        }
    }
}

testIndoAreaAPI();