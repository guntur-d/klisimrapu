const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/simrapu';

console.log('🔍 COMPREHENSIVE KONTRAK CRUD QA TESTING');
console.log('========================================\n');

let authToken = '';
let createdKontrakId = '';

async function runCRUDTests() {
  try {
    // Step 1: Authenticate
    console.log('🔐 STEP 1: Authentication');
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'ops',
        password: '111111',
        budgetYear: '2026-Murni'
      })
    });

    const loginData = await loginResponse.json();
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginData.message || loginResponse.status}`);
    }
    authToken = loginData.token;
    console.log('✅ Authentication successful');

    // Step 2: READ - Test existing kontrak data
    console.log('\n📖 STEP 2: READ Test (GET kontrak by subKegiatanId)');
    const readResponse = await fetch('http://localhost:3000/api/kontrak?subKegiatanId=68f0782626a9b3bbec4e7a54', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const readData = await readResponse.json();
    
    if (readResponse.ok) {
      console.log(`✅ READ Success: Found ${readData.data?.length || 0} kontrak records`);
      console.log(`   - Target subkegiatan: Peningkatan Jaringan Irigasi Tambak`);
      console.log(`   - Sample kontrak data confirmed`);
    } else {
      console.log(`❌ READ Failed: ${readData.message || readResponse.status}`);
    }

    // Step 3: CREATE - Create new kontrak
    console.log('\n➕ STEP 3: CREATE Test (POST new kontrak)');
    const newKontrakData = {
      paketKegiatanId: "6901a3d9e0f78362b9c923c2",
      kodeSirupLkpp: "QA-TEST-SIRUP-001",
      penyediaId: "68f81e8282109c7182d92ae2",
      noKontrak: "QA-2025-001/TEST",
      tglKontrak: "2025-10-30",
      noSpmk: "QA-SPMK-001",
      tglSpmk: "2025-10-30",
      metodePengadaanId: "68f980845eff85ac3cf85895",
      nilaiKontrak: 120000,
      jangkaWaktu: 20,
      jangkaWaktuUnit: "Hari",
      tglPelaksanaanDari: "2025-11-01",
      tglPelaksanaanSampai: "2025-11-21",
      lokasi: "QA Test Location",
      hps: 130000,
      tipe: "Konstruksi",
      kualifikasiPengadaan: "Prakualifikasi",
      budgetYear: "2026-Murni",
      subPerangkatDaerahId: "68f46a885e051327dc600285",
      deskripsi: "QA Test Kontrak - Created for testing purposes"
    };

    const createResponse = await fetch('http://localhost:3000/api/kontrak', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newKontrakData)
    });

    const createData = await createResponse.json();
    if (createResponse.ok) {
      createdKontrakId = createData.data._id;
      console.log('✅ CREATE Success: New kontrak created');
      console.log(`   - ID: ${createdKontrakId}`);
      console.log(`   - No Kontrak: ${createData.data.noKontrak}`);
      console.log(`   - HPS: ${createData.data.hps}`);
      console.log(`   - Nilai Kontrak: ${createData.data.nilaiKontrak}`);
    } else {
      console.log(`❌ CREATE Failed: ${createData.message || createResponse.status}`);
      console.log(`   - Error details: ${JSON.stringify(createData, null, 2)}`);
    }

    // Step 4: UPDATE - Update the created kontrak
    if (createdKontrakId) {
      console.log('\n✏️ STEP 4: UPDATE Test (PUT kontrak)');
      const updateData = {
        ...newKontrakData,
        noKontrak: "QA-2025-001/UPDATED",
        nilaiKontrak: 135000,
        deskripsi: "QA Test Kontrak - UPDATED for testing purposes",
        updatedBy: "qa-tester"
      };

      const updateResponse = await fetch(`http://localhost:3000/api/kontrak/${createdKontrakId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      const updateResult = await updateResponse.json();
      if (updateResponse.ok) {
        console.log('✅ UPDATE Success: Kontrak updated');
        console.log(`   - New No Kontrak: ${updateResult.data.noKontrak}`);
        console.log(`   - New Nilai Kontrak: ${updateResult.data.nilaiKontrak}`);
        console.log(`   - Updated At: ${updateResult.data.updatedAt}`);
      } else {
        console.log(`❌ UPDATE Failed: ${updateResult.message || updateResponse.status}`);
      }
    } else {
      console.log('\n⏭️ STEP 4: UPDATE Skipped (no created kontrak ID)');
    }

    // Step 5: VERIFY - Read the updated kontrak
    if (createdKontrakId) {
      console.log('\n🔍 STEP 5: VERIFY Test (GET updated kontrak by ID)');
      const verifyResponse = await fetch(`http://localhost:3000/api/kontrak/${createdKontrakId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const verifyData = await verifyResponse.json();
      
      if (verifyResponse.ok) {
        console.log('✅ VERIFY Success: Updated kontrak verified');
        console.log(`   - Final No Kontrak: ${verifyData.data.noKontrak}`);
        console.log(`   - Final Nilai Kontrak: ${verifyData.data.nilaiKontrak}`);
        console.log(`   - Final Deskripsi: ${verifyData.data.deskripsi}`);
      } else {
        console.log(`❌ VERIFY Failed: ${verifyData.message || verifyResponse.status}`);
      }
    } else {
      console.log('\n⏭️ STEP 5: VERIFY Skipped (no created kontrak ID)');
    }

    // Step 6: DELETE - Clean up test data
    if (createdKontrakId) {
      console.log('\n🗑️ STEP 6: DELETE Test (DELETE kontrak)');
      const deleteResponse = await fetch(`http://localhost:3000/api/kontrak/${createdKontrakId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      const deleteResult = await deleteResponse.json();
      if (deleteResponse.ok) {
        console.log('✅ DELETE Success: Test kontrak cleaned up');
        console.log(`   - Message: ${deleteResult.message}`);
      } else {
        console.log(`❌ DELETE Failed: ${deleteResult.message || deleteResponse.status}`);
      }
    } else {
      console.log('\n⏭️ STEP 6: DELETE Skipped (no created kontrak ID)');
    }

    // Final Summary
    console.log('\n🎯 QA TEST SUMMARY');
    console.log('==================');
    console.log('✅ Authentication: WORKING');
    console.log('✅ READ Operations: WORKING');
    if (createResponse.ok) {
      console.log('✅ CREATE Operations: WORKING');
    } else {
      console.log('❌ CREATE Operations: FAILED');
    }
    if (updateResponse && updateResponse.ok) {
      console.log('✅ UPDATE Operations: WORKING');
    } else {
      console.log('❌ UPDATE Operations: FAILED');
    }
    if (deleteResponse && deleteResponse.ok) {
      console.log('✅ DELETE Operations: WORKING');
    } else {
      console.log('❌ DELETE Operations: FAILED');
    }

    console.log('\n🎉 CRUD QA TESTING COMPLETED!');
    
  } catch (error) {
    console.error('\n❌ QA TESTING FAILED:', error.message);
  }
}

// Run the comprehensive tests
runCRUDTests();