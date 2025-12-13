# Indonesian Administrative Areas API Documentation

🌐 **Live API Base URL:** `https://indoarea.vercel.app/api`

## 📋 **Table of Contents**
- [Overview](#overview)
- [Authentication](#authentication)
- [Response Format](#response-format)
- [API Endpoints](#api-endpoints)
- [Data Structure](#data-structure)
- [Usage Examples](#usage-examples)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

## 🔍 **Overview**

This API provides complete Indonesian administrative area data including:
- **38 Provinces** (Provinsi)
- **514 Regencies/Cities** (Kabupaten/Kota)  
- **7,288 Districts** (Kecamatan)
- **83,762 Villages** (Kelurahan/Desa)
- **Complete postal code integration** for villages

### **Data Hierarchy**
```
Province (2 digits)
└── Regency/City (2 digits + dot + 2 digits) → Province.Regency
    └── District (2 digits + dot + 2 digits + dot + 2 digits) → Province.Regency.District
        └── Village (2 digits + dot + 2 digits + dot + 2 digits + dot + 4 digits) → Province.Regency.District.Village
```

### **Code Examples**
- Province: `11` (Aceh)
- Regency: `34.04` (Sleman Regency in Yogyakarta)
- District: `34.04.06` (Mlati District)
- Village: `34.04.06.2001` (Sinduadi Village)

## 🔐 **Authentication**

Currently **no authentication required** - API is publicly accessible for read-only operations.

## 📝 **Response Format**

All endpoints return JSON in this format:

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 25
  }
}
```

### **Error Response Format**
```json
{
  "success": false,
  "error": "Error Type",
  "message": "Detailed error message"
}
```

## 🌐 **API Endpoints**

### **1. Get All Provinces**
```http
GET /api/provinsi
```
**Description:** Returns all 38 Indonesian provinces.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "code": "11",
      "name": "Aceh",
      "type": "provinsi",
      "createdAt": "2025-11-20T21:15:55.000Z",
      "updatedAt": "2025-11-20T21:15:55.000Z"
    }
  ]
}
```

### **2. Get Regencies by Province**
```http
GET /api/kabupaten-kota?provinsi_code={province_code}
```
**Description:** Returns all regencies/cities within a specific province.

**Parameters:**
- `provinsi_code` (required): Province code (e.g., "11" for Aceh, "34" for Yogyakarta)

**Examples:**
```bash
# Get regencies in Aceh
curl "https://indoarea.vercel.app/api/kabupaten-kota?provinsi_code=11"

# Get regencies in Yogyakarta
curl "https://indoarea.vercel.app/api/kabupaten-kota?provinsi_code=34"

# Search regencies with filter
curl "https://indoarea.vercel.app/api/kabupaten-kota?provinsi_code=33&search=solo"
```

### **3. Get Districts by Regency**
```http
GET /api/kecamatan?kabkota_code={regency_code}
```
**Description:** Returns all districts within a specific regency/city.

**Parameters:**
- `kabkota_code` (required): Regency code (e.g., "34.04" for Sleman)

**Examples:**
```bash
# Get districts in Sleman Regency
curl "https://indoarea.vercel.app/api/kecamatan?kabkota_code=34.04"

# Search districts
curl "https://indoarea.vercel.app/api/kecamatan?kabkota_code=31.01&search=jakarta"
```

### **4. Get Villages by District**
```http
GET /api/kelurahan-desa?kecamatan_code={district_code}
```
**Description:** Returns all villages within a specific district.

**Parameters:**
- `kecamatan_code` (required): District code (e.g., "34.04.06" for Mlati)

**Examples:**
```bash
# Get villages in Mlati District
curl "https://indoarea.vercel.app/api/kelurahan-desa?kecamatan_code=34.04.06"

# Search villages
curl "https://indoarea.vercel.app/api/kelurahan-desa?kecamatan_code=11.01&search=aceh"
```

### **5. Unified Search**
```http
GET /api/wilayah?search={query}&type={type}&provinsi_code={code}&limit={n}
```
**Description:** Search across all administrative levels with filters.

**Parameters:**
- `search` (optional): Search term for area names
- `type` (optional): Filter by type (`kabupaten_kota`, `kecamatan`, `kelurahan_desa`)
- `provinsi_code` (optional): Filter by province
- `limit` (optional): Number of results (default: 100)

**Examples:**
```bash
# Search all areas containing "jakarta"
curl "https://indoarea.vercel.app/api/wilayah?search=jakarta"

# Search only regencies containing "solo"
curl "https://indoarea.vercel.app/api/wilayah?search=solo&type=kabupaten_kota"

# Search villages in specific province
curl "https://indoarea.vercel.app/api/wilayah?type=kelurahan_desa&provinsi_code=33"
```

### **6. Postal Code Lookup**
```http
GET /api/postal-code?kodepos={postal_code}
```
**Description:** Find all administrative areas for a specific postal code.

**Parameters:**
- `kodepos` (required): 5-digit postal code

**Examples:**
```bash
# Look up postal code 55284
curl "https://indoarea.vercel.app/api/postal-code?kodepos=55284"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "postalCode": "55284",
    "found": true,
    "count": 1,
    "results": [
      {
        "province": {
          "code": "34",
          "name": "Daerah Istimewa Yogyakarta"
        },
        "regency": {
          "code": "34.04",
          "name": "Sleman"
        },
        "district": {
          "code": "34.04.01", 
          "name": "Mlati"
        },
        "village": {
          "code": "34.04.01.2001",
          "name": "Balecatur"
        }
      }
    ]
  }
}
```

### **7. Postal Code Prefix Search**
```http
GET /api/postal-code?prefix={prefix}
```
**Description:** Find postal codes starting with specific digits.

**Parameters:**
- `prefix` (required): 1-5 digit prefix

**Examples:**
```bash
# Find all postal codes starting with 55
curl "https://indoarea.vercel.app/api/postal-code?prefix=55"

# Find all postal codes starting with 552
curl "https://indoarea.vercel.app/api/postal-code?prefix=552"
```

### **8. Database Statistics**
```http
GET /api/stats
```
**Description:** Get total counts of all administrative areas.

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 91599,
    "provinces": 38,
    "regencies": 514,
    "districts": 7285,
    "villages": 83762
  }
}
```

### **9. Health Check**
```http
GET /api/health
```
**Description:** Check API availability and status.

## 📋 **Data Structure**

### **Administrative Area Object**
```json
{
  "code": "34.04.06.2001",
  "name": "Sinduadi",
  "type": "wilayah",
  "provinsiCode": "34",
  "kabupatenKotaCode": "34.04",
  "kecamatanCode": "34.04.06",
  "kabupatenKotaFullCode": "34.04",
  "kecamatanFullCode": "34.04.06",
  "kodepos": "55284",
  "createdAt": "2025-11-20T21:15:55.000Z",
  "updatedAt": "2025-11-20T21:15:55.000Z"
}
```

**Field Descriptions:**
- `code`: Administrative area code
- `name`: Area name (localized)
- `type`: Always "wilayah" (unified table)
- `*Code` fields: Parent hierarchy codes
- `kodepos`: Postal code (villages only)
- `createdAt`, `updatedAt`: Timestamps

## 💻 **Usage Examples**

### **JavaScript/Node.js**
```javascript
// Get all provinces
async function getProvinces() {
  const response = await fetch('https://indoarea.vercel.app/api/provinsi');
  const data = await response.json();
  return data.data;
}

// Get regencies for a province
async function getRegencies(provinceCode) {
  const response = await fetch(
    `https://indoarea.vercel.app/api/kabupaten-kota?provinsi_code=${provinceCode}`
  );
  const data = await response.json();
  return data.data;
}

// Find postal code location
async function findByPostalCode(postalCode) {
  const response = await fetch(
    `https://indoarea.vercel.app/api/postal-code?kodepos=${postalCode}`
  );
  const data = await response.json();
  return data.data;
}
```

### **Python**
```python
import requests

def get_provinces():
    response = requests.get('https://indoarea.vercel.app/api/provinsi')
    return response.json()['data']

def get_regencies(province_code):
    response = requests.get(
        f'https://indoarea.vercel.app/api/kabupaten-kota?provinsi_code={province_code}'
    )
    return response.json()['data']

def find_by_postal_code(postal_code):
    response = requests.get(
        f'https://indoarea.vercel.app/api/postal-code?kodepos={postal_code}'
    )
    return response.json()['data']
```

### **PHP**
```php
function getProvinces() {
    $response = file_get_contents('https://indoarea.vercel.app/api/provinsi');
    $data = json_decode($response, true);
    return $data['data'];
}

function getRegencies($province_code) {
    $url = "https://indoarea.vercel.app/api/kabupaten-kota?provinsi_code=" . urlencode($province_code);
    $response = file_get_contents($url);
    $data = json_decode($response, true);
    return $data['data'];
}
```

### **cURL Examples**
```bash
# Get all provinces
curl -X GET "https://indoarea.vercel.app/api/provinsi"

# Search for areas containing "jakarta"
curl -X GET "https://indoarea.vercel.app/api/wilayah?search=jakarta"

# Get villages in specific district with postal codes
curl -X GET "https://indoarea.vercel.app/api/kelurahan-desa?kecamatan_code=34.04.06"

# Find postal code locations
curl -X GET "https://indoarea.vercel.app/api/postal-code?kodepos=55284"
```

## 🚨 **Error Handling**

### **Common HTTP Status Codes**
- `200` - Success
- `400` - Bad Request (missing/invalid parameters)
- `404` - Not Found
- `500` - Internal Server Error

### **Error Response Examples**
```json
{
  "success": false,
  "error": "Validation Error",
  "message": "Postal code must be exactly 5 digits"
}
```

### **Best Practices**
1. **Always check `success` field** in responses
2. **Handle network errors** gracefully
3. **Validate parameters** before making requests
4. **Implement retry logic** for temporary failures

## ⚡ **Rate Limiting**

- **No strict rate limits** currently enforced
- **Recommended:** Max 100 requests per minute per IP
- **For higher usage:** Contact the maintainers

## 🎯 **Use Cases**

### **1. Address Validation**
Validate Indonesian addresses and postal codes for e-commerce, shipping, or forms.

### **2. Dropdown Cascading**
Create hierarchical dropdown components that cascade from Province → Regency → District → Village.

### **3. Location Services**
Integrate with mapping services to display Indonesian administrative boundaries.

### **4. Data Import**
Use the API to populate databases with Indonesian administrative area data.

### **5. Search & Filtering**
Enable users to search and filter locations within Indonesia.

## 🔗 **Integration Tips**

1. **Cache frequently accessed data** (provinces rarely change)
2. **Use the unified search endpoint** for complex queries
3. **Implement client-side caching** for better performance
4. **Handle postal code lookups** separately for shipping features

---

**API Base URL:** `https://indoarea.vercel.app/api`
**Version:** 1.0.0
**Last Updated:** November 21, 2025

For questions or support, please refer to the project documentation or create an issue in the repository.

--Gareng Pong --
