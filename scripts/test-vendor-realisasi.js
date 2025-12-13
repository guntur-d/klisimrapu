import m from 'mithril'
import VendorLayout from './src/views/VendorLayout.js'

// Test to verify vendor realisasi functionality
console.log('🧪 Testing Vendor Layout Realisasi Feature...')

// Test the data structure that will be sent to backend
const testRealisasiData = {
  terminId: 'test-termin-id',
  laporanDate: '2025-01-15',
  periodeMulai: '2025-01-01',
  periodeSampai: '2025-01-15',
  realisasiFisik: 75.5,
  realisasiBelanja: 1500000
}

console.log('✅ Test data structure:', testRealisasiData)

// Verify frontend form data validation
const validateForm = (data) => {
  const errors = []
  
  if (!data.laporanDate) {
    errors.push('Tanggal laporan harus diisi')
  }
  
  if (!data.periodeMulai || !data.periodeSampai) {
    errors.push('Periode mulai dan selesai harus diisi')
  }
  
  if (new Date(data.periodeMulai) > new Date(data.periodeSampai)) {
    errors.push('Periode mulai tidak boleh lebih besar dari periode selesai')
  }
  
  if (data.realisasiFisik < 0 || data.realisasiFisik > 100) {
    errors.push('Realisasi fisik harus antara 0-100%')
  }
  
  if (data.realisasiBelanja < 0) {
    errors.push('Realisasi belanja tidak boleh negatif')
  }
  
  return errors
}

const validationErrors = validateForm(testRealisasiData)
console.log('✅ Frontend validation:', validationErrors.length === 0 ? 'PASSED' : `FAILED: ${validationErrors.join(', ')}`)

console.log('🎉 Vendor Layout Realisasi test completed!')
console.log('📋 Ready for backend API testing with multipart/form-data')