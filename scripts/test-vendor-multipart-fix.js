#!/usr/bin/env node

// Quick test to check if the multipart fix works
import fetch from 'node-fetch';
import FormData from 'form-data';

console.log('🧪 Testing Updated Vendor Realisasi Endpoint...\n');

const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

// Test with actual form data structure
const formData = new FormData();
formData.append('terminId', '69036f04e5f339cce6907089');
formData.append('laporanDate', '2025-01-15');
formData.append('periodeMulai', '2025-01-01');
formData.append('periodeSampai', '2025-01-15');
formData.append('realisasiFisik', '75.5');
formData.append('realisasiBelanja', '1500000');

console.log('📋 FormData entries:');
for (const [key, value] of formData.entries()) {
  console.log(`  ${key}: ${value}`);
}

console.log('\n🔍 Testing endpoint with FormData...');

fetch(`${API_URL}/vendor/realisasi`, {
  method: 'POST',
  body: formData
})
.then(response => {
  console.log(`📡 Response status: ${response.status}`);
  return response.text();
})
.then(text => {
  console.log('📄 Response text:', text);
  try {
    const json = JSON.parse(text);
    console.log('📋 Parsed JSON:', JSON.stringify(json, null, 2));
  } catch (e) {
    console.log('⚠️  Response is not JSON');
  }
})
.catch(error => {
  console.error('❌ Error:', error.message);
});

console.log('\n⏳ Test in progress...');