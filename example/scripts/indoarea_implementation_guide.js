// INDOAREA API INTEGRATION GUIDE
// ================================

// OPTION 1: IMMEDIATE REPLACEMENT (Recommended)
// Replace the existing fetch in dist/migrate/index.html around lines 103-129

function fetchWilayahDataFromIndoarea() {
    console.log('Fetching wilayah data from Indoarea API...');
    
    return fetch("https://indoarea.vercel.app/api/provinsi", {
        method: "GET",
        headers: {
            "Accept": "application/json"
        }
    }).then(function (response) {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    }).then(function (data) {
        console.log('Indoarea API response:', data);
        
        // Transform indoarea format to match your current system
        const transformedData = data.data.map(item => ({
            kode: item.code,
            nama: item.name
        }));
        
        console.log('Transformed wilayah data:', transformedData);
        
        // Store in sessionStorage with same format as before
        sessionStorage.setItem("efinSite", JSON.stringify({ 
            'wilayah': transformedData 
        }));
        
        console.log('Wilayah data stored in sessionStorage');
        return transformedData;
        
    }).catch(function (err) {
        console.error('Error fetching from Indoarea API:', err);
        
        // Fallback: Show error message to user
        $.toast({
            heading: 'Error',
            text: 'Gagal memuat data wilayah. Silakan refresh halaman.',
            showHideTransition: 'fade',
            icon: 'error',
            position: 'mid-center',
        });
        
        throw err;
    });
}

// Enhanced version with both provinces and regencies
function fetchCompleteWilayahData() {
    console.log('Fetching complete wilayah data from Indoarea API...');
    
    // First get all provinces
    return fetch("https://indoarea.vercel.app/api/provinsi", {
        method: "GET",
        headers: { "Accept": "application/json" }
    }).then(response => response.json())
    .then(provinceData => {
        console.log('Provinces loaded:', provinceData.data.length);
        
        const provinces = provinceData.data.map(item => ({
            kode: item.code,
            nama: item.name
        }));
        
        // Get regencies for each province (this is more comprehensive)
        const regencyPromises = provinces.map(province => {
            return fetch(`https://indoarea.vercel.app/api/kabupaten-kota?provinsi_code=${province.kode}`)
                .then(response => response.json())
                .then(regencyData => {
                    console.log(`Regencies for ${province.nama}:`, regencyData.data?.length || 0);
                    return regencyData.data?.map(item => ({
                        kode: item.code,
                        nama: item.name,
                        parent_code: province.kode
                    })) || [];
                })
                .catch(err => {
                    console.warn(`Failed to fetch regencies for ${province.kode}:`, err);
                    return [];
                });
        });
        
        return Promise.all(regencyPromises).then(allRegencies => {
            const flatRegencies = allRegencies.flat();
            
            // Combine provinces and regencies into single array
            const completeData = [...provinces, ...flatRegencies];
            
            console.log('Complete wilayah data:', {
                provinces: provinces.length,
                regencies: flatRegencies.length,
                total: completeData.length
            });
            
            // Store in sessionStorage
            sessionStorage.setItem("efinSite", JSON.stringify({ 
                'wilayah': completeData 
            }));
            
            return completeData;
        });
    });
}

// OPTION 2: GRADUAL MIGRATION
// Keep existing MongoDB for backward compatibility but add Indoarea as alternative

// OPTION 3: SERVER-SIDE PROXY
// Create a server endpoint that fetches from Indoarea and stores in MongoDB
// This maintains your existing API structure

// IMPLEMENTATION IN dist/migrate/index.html:
// ===========================================

// Replace lines 103-129 in your existing file:

// OLD CODE (remove this):
// fetch("/api/service", {
//    method: "POST",
//    body: JSON.stringify({
//       method: "getAll",
//       tableName: "wilModel",
//    }),
//    headers: {
//       "Content-type": "application/json; charset=UTF-8"
//    }
// }).then(function (response) {
//    return response.json();
// }).then(function (data) {
//    sessionStorage.setItem("efinSite", JSON.stringify({ 'wilayah': data.message }));
// });

// NEW CODE (replace with this):
fetch("https://indoarea.vercel.app/api/provinsi", {
    method: "GET",
    headers: {
        "Accept": "application/json"
    }
}).then(function (response) {
    return response.json();
}).then(function (data) {
    // Transform indoarea format to match your current system
    const transformedData = data.data.map(item => ({
        kode: item.code,
        nama: item.name
    }));
    
    sessionStorage.setItem("efinSite", JSON.stringify({ 
        'wilayah': transformedData 
    }));
    
    console.log('Wilayah data loaded from Indoarea API');
}).catch(function (err) {
    console.warn('Something went wrong.', err);
});

// DATA MAPPING COMPARISON:
// =======================

// Your Current MongoDB Data Structure:
// [
//   { kode: "11", nama: "Aceh" },
//   { kode: "12", nama: "Sumatera Utara" },
//   { kode: "31", nama: "DKI Jakarta" }
// ]

// Indoarea API Response:
// {
//   "success": true,
//   "data": [
//     { 
//       "code": "11", 
//       "name": "Aceh", 
//       "type": "provinsi",
//       "createdAt": "2025-11-20T21:15:55.000Z"
//     }
//   ]
// }

// Transformed Data (what your client expects):
// [
//   { kode: "11", nama: "Aceh" },
//   { kode: "12", nama: "Sumatera Utara" },
//   { kode: "31", nama: "DKI Jakarta" }
// ]

// BENEFITS OF SWITCHING TO INDOAREA:
// =================================

// 1. **Always Updated**: Indoarea is maintained and updated regularly
// 2. **No Database Required**: Reduces server load and complexity
// 3. **More Comprehensive**: Includes all administrative levels
// 4. **Free**: No cost compared to maintaining your own MongoDB
// 5. **Reliable**: Hosted on Vercel with high uptime
// 6. **CORS Enabled**: Supports direct browser requests

// CONSIDERATIONS:
// ==============

// 1. **Internet Dependency**: Requires internet connection
// 2. **API Rate Limits**: Be mindful of request frequency
// 3. **Data Transformation**: Need to transform response format
// 4. **Error Handling**: Handle API failures gracefully

// RECOMMENDED IMPLEMENTATION:
// =========================

// 1. Start with Option 1 (immediate replacement)
// 2. Add caching mechanism to reduce API calls
// 3. Implement fallback to local data if API fails
// 4. Consider progressive enhancement for offline use