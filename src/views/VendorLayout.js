import m from 'mithril'
import { JWTUtils, UserUtils, APIUtils, ToastUtils } from '../js/utils.js'
import toast from '../js/toaster.js'

const VendorLayout = {
  // State management
  isLoading: false,
  userData: null,
  selectedKontrak: null,
  showRealisasiModal: false,
  showKontrakDetail: false,

  // Organizational data
  perangkatDaerah: null,
  penyedia: null,

  // Realisasi form data
  realisasiFormData: {
    terminId: '',
    laporanDate: '',
    periodeMulai: '',
    periodeSampai: '',
    realisasiFisik: 0,
    realisasiBelanja: 0,
    laporanFile: null,
    laporanPreview: null
  },

  // Data
  kontrakList: [],
  filteredKontrak: [],
  availableTermin: [],

  // Filter states
  searchQuery: '',
  statusFilter: 'all', // 'all', 'active', 'completed'

  oninit: function() {
    // Check authentication
    if (!UserUtils.isAuthenticated()) {
      toast.warning('Silakan masuk terlebih dahulu')
      m.route.set('/login')
      return
    }

    // Get user data
    this.userData = UserUtils.getUserData()
    
    // Verify user is vendor
    if (this.userData.role !== 'vendor') {
      toast.warning('Akses ditolak. Halaman ini hanya untuk vendor.')
      m.route.set('/dashboard')
      return
    }

    this.loadOrganizationalData()
    this.loadKontrak()
  },

  // Load organizational data
  loadOrganizationalData: async function() {
    try {
      // Load PerangkatDaerah (main organization)
      const perangkatResponse = await APIUtils.request('/api/perangkatdaerah')
      if (perangkatResponse.data && perangkatResponse.data.length > 0) {
        this.perangkatDaerah = perangkatResponse.data[0]
      }

      // Load Penyedia (vendor company)
      if (this.userData.penyediaId) {
        const penyediaResponse = await APIUtils.request(`/api/penyedia/${this.userData.penyediaId}`)
        this.penyedia = penyediaResponse.data
      }
    } catch (error) {
      console.error('Error loading organizational data:', error)
    }
  },

  // Load vendor's contracts
  loadKontrak: async function() {
    this.isLoading = true
    try {
      // Get contracts for this vendor's penyedia
      const response = await APIUtils.request('/api/kontrak/by-penyedia', {
        params: {
          penyediaId: this.userData.penyediaId,
          budgetYear: this.userData.budgetYear.value || this.userData.budgetYear
        }
      })
      
      this.kontrakList = response.data || []
      this.filteredKontrak = this.kontrakList
      this.searchQuery = ''
      this.statusFilter = 'all'
      
    } catch (error) {
      console.error('Error loading kontrak:', error)
      toast.error('Gagal memuat data kontrak')
    } finally {
      this.isLoading = false
      m.redraw()
    }
  },

  // Handle search
  handleSearch: function() {
    if (!this.searchQuery) {
      this.filteredKontrak = this.kontrakList
    } else {
      const query = this.searchQuery.toLowerCase()
      this.filteredKontrak = this.kontrakList.filter(kontrak =>
        kontrak.noKontrak.toLowerCase().includes(query) ||
        kontrak.kodeSirupLkpp.toLowerCase().includes(query) ||
        kontrak.lokasi.toLowerCase().includes(query)
      )
    }
  },

  // Filter by status
  filterByStatus: function() {
    if (this.statusFilter === 'all') {
      this.filteredKontrak = this.kontrakList
    } else {
      const today = new Date()
      this.filteredKontrak = this.kontrakList.filter(kontrak => {
        const endDate = new Date(kontrak.tglPelaksanaanSampai)
        
        switch (this.statusFilter) {
          case 'active':
            return endDate > today && kontrak.status !== 'completed'
          case 'completed':
            return kontrak.status === 'completed' || endDate <= today
          default:
            return true
        }
      })
    }
  },

  // Open contract detail
  openKontrakDetail: async function(kontrak) {
    this.selectedKontrak = kontrak
    this.showKontrakDetail = true
    await this.loadTerminForKontrak(kontrak._id)
    m.redraw()
  },

  // Close contract detail
  closeKontrakDetail: function() {
    this.showKontrakDetail = false
    this.selectedKontrak = null
    this.availableTermin = []
  },

  // Load termin for a contract
  loadTerminForKontrak: async function(kontrakId) {
    try {
      const response = await APIUtils.request('/api/termin/by-kontrak', {
        params: { kontrakId }
      })
      
      this.availableTermin = response.data || []
    } catch (error) {
      console.error('Error loading termin:', error)
      this.availableTermin = []
    }
  },

  // Helper: check if a termin has meaningful realisasi
  hasTerminRealisasi: function(termin) {
    return (
      (termin.realisasiFisik !== undefined && termin.realisasiFisik !== null && termin.realisasiFisik > 0) ||
      (termin.realisasiBelanja !== undefined && termin.realisasiBelanja !== null && termin.realisasiBelanja > 0) ||
      !!termin.laporanDate
    )
  },

  // Open realisasi modal
  openRealisasiModal: function(termin) {
    console.log('📝 openRealisasiModal called with termin:', termin.termin);
    console.log('📝 Termin ID:', termin._id);
    
    const today = new Date().toISOString().split('T')[0] // Current date in YYYY-MM-DD format
    
    // Check if this termin already has realization data
    const hasExistingRealisasi = termin.realisasiFisik !== undefined && termin.realisasiFisik !== null;
    console.log('📝 Has existing realisasi:', hasExistingRealisasi);
    console.log('📝 Termin realisasi data:', {
      realisasiFisik: termin.realisasiFisik,
      realisasiBelanja: termin.realisasiBelanja,
      laporanDate: termin.laporanDate
    });
    
    this.realisasiFormData = {
      terminId: termin._id,
      laporanDate: termin.laporanDate ? termin.laporanDate.split('T')[0] : today,
      periodeMulai: termin.periodeMulai ? termin.periodeMulai.split('T')[0] : (this.selectedKontrak.tglPelaksanaanDari || ''),
      periodeSampai: termin.periodeSampai ? termin.periodeSampai.split('T')[0] : (this.selectedKontrak.tglPelaksanaanSampai || ''),
      realisasiFisik: termin.realisasiFisik || 0,
      realisasiBelanja: termin.realisasiBelanja || 0,
      laporanFile: null,
      laporanPreview: null,
      isEditing: hasExistingRealisasi // Flag to indicate we're editing existing data
    }
    
    console.log('📝 Form data created:', this.realisasiFormData);
    
    // If there's an existing file, create preview info
    if (termin.laporanFile && termin.laporanFile.filename) {
      try {
        console.log('📝 Full laporanFile structure:', termin.laporanFile);
        console.log('📝 laporanFile.data type:', typeof termin.laporanFile.data);
        console.log('📝 laporanFile.data constructor:', termin.laporanFile.data?.constructor?.name);
        console.log('📝 laporanFile contentType:', termin.laporanFile.contentType);
        
        const fileSize = termin.laporanFile.data ?
          (typeof termin.laporanFile.data === 'number' ? termin.laporanFile.data :
           termin.laporanFile.data.length || 0) : 0;
        
        console.log('📝 File size detected:', fileSize);
        
        // Generate proper data URL for database-stored files
        let dataUrl = null;
        
        if (termin.laporanFile.data && termin.laporanFile.contentType) {
          console.log('🔄 Attempting to convert database file to data URL...');
          
          // Handle MongoDB Buffer objects (most common case)
          if (termin.laporanFile.data && typeof termin.laporanFile.data === 'object') {
            // Check if it's a Buffer using multiple methods
            const isBuffer = Buffer.isBuffer(termin.laporanFile.data) ||
                            termin.laporanFile.data.constructor?.name === 'Buffer' ||
                            (termin.laporanFile.data.type === 'Buffer' && Array.isArray(termin.laporanFile.data.data));
            
            if (isBuffer) {
              console.log('🔄 Converting Buffer to base64...');
              
              let buffer;
              // Handle different Buffer formats
              if (termin.laporanFile.data.type === 'Buffer' && Array.isArray(termin.laporanFile.data.data)) {
                // MongoDB Buffer format: { type: 'Buffer', data: [numbers] }
                buffer = Buffer.from(termin.laporanFile.data.data);
              } else if (termin.laporanFile.data.constructor?.name === 'Buffer') {
                // Standard Buffer object
                buffer = termin.laporanFile.data;
              } else if (termin.laporanFile.data.buffer) {
                // ArrayBuffer
                buffer = Buffer.from(termin.laporanFile.data.buffer);
              } else {
                // Try to convert directly
                buffer = Buffer.from(termin.laporanFile.data);
              }
              
              const base64 = buffer.toString('base64');
              dataUrl = `data:${termin.laporanFile.contentType};base64,${base64}`;
              console.log('✅ Generated data URL from Buffer:', dataUrl.substring(0, 100) + '...');
              console.log('✅ Base64 length:', base64.length);
            }
            
            // Check if it's a plain object that might contain binary data
            else if (termin.laporanFile.data.type === 'Buffer' && Array.isArray(termin.laporanFile.data.data)) {
              console.log('🔄 Converting MongoDB Buffer object to base64...');
              const buffer = Buffer.from(termin.laporanFile.data.data);
              const base64 = buffer.toString('base64');
              dataUrl = `data:${termin.laporanFile.contentType};base64,${base64}`;
              console.log('✅ Generated data URL from MongoDB Buffer object:', dataUrl.substring(0, 100) + '...');
            }
          }
          
          // Handle string data (already base64 or data URL)
          if (!dataUrl && typeof termin.laporanFile.data === 'string') {
            // Check if it's already a complete data URL
            if (termin.laporanFile.data.startsWith('data:')) {
              console.log('✅ Data is already a data URL');
              dataUrl = termin.laporanFile.data;
            }
            
            // Check if it looks like base64 data
            else if (/^[A-Za-z0-9+/]*={0,2}$/.test(termin.laporanFile.data) && termin.laporanFile.data.length > 100) {
              console.log('✅ Data appears to be base64 encoded');
              dataUrl = `data:${termin.laporanFile.contentType};base64,${termin.laporanFile.data}`;
              console.log('✅ Generated data URL from base64 string:', dataUrl.substring(0, 100) + '...');
            }
          }
          
          // Try to extract binary data from various formats
          if (!dataUrl && termin.laporanFile.data && typeof termin.laporanFile.data === 'object') {
            // Check for _bsontype (BSON specific)
            if (termin.laporanFile.data._bsontype === 'Binary' || termin.laporanFile.data._bsontype === 'Binary') {
              console.log('🔄 Converting BSON Binary to base64...');
              const buffer = Buffer.from(termin.laporanFile.data.value || termin.laporanFile.data.buffer || termin.laporanFile.data.data);
              const base64 = buffer.toString('base64');
              dataUrl = `data:${termin.laporanFile.contentType};base64,${base64}`;
              console.log('✅ Generated data URL from BSON Binary:', dataUrl.substring(0, 100) + '...');
            }
            
            // Check for other binary data patterns
            else if (termin.laporanFile.data.buffer && typeof termin.laporanFile.data.buffer === 'object') {
              console.log('🔄 Converting data with buffer property...');
              const buffer = Buffer.from(termin.laporanFile.data.buffer);
              const base64 = buffer.toString('base64');
              dataUrl = `data:${termin.laporanFile.contentType};base64,${base64}`;
              console.log('✅ Generated data URL from buffer property:', dataUrl.substring(0, 100) + '...');
            }
          }
          
          // Debug: log the actual structure for troubleshooting
          if (!dataUrl) {
            console.log('📝 Full laporanFile structure for debugging:', JSON.stringify(termin.laporanFile, null, 2));
            console.log('📝 Data property:', termin.laporanFile.data);
            console.log('📝 Data type:', typeof termin.laporanFile.data);
            console.log('📝 Data constructor:', termin.laporanFile.data?.constructor?.name);
          }
        }
        
        console.log('📝 Final dataUrl result:', dataUrl ? 'SUCCESS - ' + dataUrl.substring(0, 100) + '...' : 'FAILED - No data URL generated');
        
        this.realisasiFormData.laporanPreview = {
          name: termin.laporanFile.filename,
          size: fileSize,
          type: termin.laporanFile.contentType || 'application/pdf',
          lastModified: new Date(),
          isExisting: true, // Flag to indicate this is an existing file
          dataUrl: dataUrl // Store data URL for preview (may be null)
        }
        console.log('📝 File preview created:', this.realisasiFormData.laporanPreview);
      } catch (error) {
        console.error('❌ Error creating file preview:', error);
        console.error('📝 Error details:', error.message);
        console.error('📝 Stack trace:', error.stack);
        
        // Continue without file preview info
        this.realisasiFormData.laporanPreview = {
          name: termin.laporanFile.filename,
          size: 0,
          type: termin.laporanFile.contentType || 'application/pdf',
          lastModified: new Date(),
          isExisting: true,
          dataUrl: null
        }
      }
    }
    
    this.showRealisasiModal = true
    console.log('📝 Modal state set to true, forcing redraw');
    m.redraw()
    console.log('📝 Redraw completed');
  },

  // Close realisasi modal
  closeRealisasiModal: function() {
    this.showRealisasiModal = false
    this.realisasiFormData = {
      terminId: '',
      laporanDate: '',
      periodeMulai: '',
      periodeSampai: '',
      realisasiFisik: 0,
      realisasiBelanja: 0,
      laporanFile: null,
      laporanPreview: null
    }
  },

  // Handle PDF file upload with validation and preview
  handleFileUpload: function(e) {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type - only PDFs allowed
    if (file.type !== 'application/pdf') {
      toast.error('Hanya file PDF yang diperbolehkan')
      return
    }

    // Validate file size (1MB max)
    if (file.size > 1024 * 1024) {
      toast.error('Ukuran file maksimal 1MB')
      return
    }

    console.log('PDF file selected:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified)
    })

    // Create PDF preview using FileReader (similar to logo preview)
    const reader = new FileReader()
    reader.onload = (e) => {
      // Store the file and create preview data
      this.realisasiFormData.laporanFile = file
      
      // Create a preview object with file info
      this.realisasiFormData.laporanPreview = {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified),
        // For PDF preview, we'll use the file directly in the iframe
        dataUrl: e.target.result
      }
      
      console.log('PDF file and preview set:', this.realisasiFormData.laporanPreview)
      m.redraw()
    }
    
    reader.onerror = (error) => {
      console.error('Error reading PDF file:', error)
      toast.error('Gagal membaca file PDF')
    }
    
    // Read the file as data URL for potential preview use
    reader.readAsDataURL(file)
  },

  // Remove uploaded file
  removeFile: function() {
    this.realisasiFormData.laporanFile = null
    this.realisasiFormData.laporanPreview = null
    
    // If this was an existing file, we need to handle it specially
    if (this.realisasiFormData.isEditing) {
      // For editing mode with existing files, just clear the preview but keep file info
      console.log('📝 Removing new file upload, keeping existing file reference');
    }
    
    // Reset file input
    const fileInput = document.querySelector('input[type="file"][accept="application/pdf"]')
    if (fileInput) {
      fileInput.value = ''
    }
    
    m.redraw()
  },

  // Save realisasi using fetch API for proper FormData support
  saveRealisasi: async function() {
    // Validation
    if (!this.realisasiFormData.laporanDate) {
      toast.error('Tanggal laporan harus diisi')
      return
    }

    if (!this.realisasiFormData.periodeMulai || !this.realisasiFormData.periodeSampai) {
      toast.error('Periode mulai dan selesai harus diisi')
      return
    }

    if (new Date(this.realisasiFormData.periodeMulai) > new Date(this.realisasiFormData.periodeSampai)) {
      toast.error('Periode mulai tidak boleh lebih besar dari periode selesai')
      return
    }

    // Check if period is within contract dates
    if (this.selectedKontrak) {
      const contractStart = new Date(this.selectedKontrak.tglPelaksanaanDari)
      const contractEnd = new Date(this.selectedKontrak.tglPelaksanaanSampai)
      const periodStart = new Date(this.realisasiFormData.periodeMulai)
      const periodEnd = new Date(this.realisasiFormData.periodeSampai)

      if (periodStart < contractStart || periodStart > contractEnd) {
        toast.error('Periode mulai harus berada dalam rentang tanggal kontrak')
        return
      }

      if (periodEnd < contractStart || periodEnd > contractEnd) {
        toast.error('Periode selesai harus berada dalam rentang tanggal kontrak')
        return
      }
    }

    if (this.realisasiFormData.realisasiFisik < 0 || this.realisasiFormData.realisasiFisik > 100) {
      toast.error('Realisasi fisik harus antara 0-100%')
      return
    }

    if (this.realisasiFormData.realisasiBelanja < 0) {
      toast.error('Realisasi belanja tidak boleh negatif')
      return
    }

    this.isLoading = true

    try {
      const formData = new FormData()
      formData.append('terminId', this.realisasiFormData.terminId)
      formData.append('laporanDate', this.realisasiFormData.laporanDate)
      formData.append('periodeMulai', this.realisasiFormData.periodeMulai)
      formData.append('periodeSampai', this.realisasiFormData.periodeSampai)
      formData.append('realisasiFisik', this.realisasiFormData.realisasiFisik.toString())
      formData.append('realisasiBelanja', this.realisasiFormData.realisasiBelanja.toString())
      
      if (this.realisasiFormData.laporanFile) {
        formData.append('laporan', this.realisasiFormData.laporanFile)
      }

      // Use fetch API directly for FormData support
      const token = JWTUtils.getToken()
      const response = await fetch('/api/vendor/realisasi', {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
          // Don't set Content-Type for FormData - let browser set it with correct boundary
        },
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      toast.success(result.message || 'Realisasi berhasil disimpan')
      this.closeRealisasiModal()
      
      // Refresh termin data
      if (this.selectedKontrak) {
        await this.loadTerminForKontrak(this.selectedKontrak._id)
      }
      
    } catch (error) {
      console.error('Error saving realisasi:', error)
      toast.error(`Gagal menyimpan realisasi: ${error.message}`)
    } finally {
      this.isLoading = false
      m.redraw()
    }
  },

  // Calculate progress percentage based on realization data
  getProgressPercentage: function(kontrak) {
    if (!kontrak.termin || kontrak.termin.length === 0) return 0

    // If any termin has realisasi, compute based only on actual realizationFisik
    const reportedTermin = kontrak.termin.filter(t => this.hasTerminRealisasi(t))

    if (reportedTermin.length > 0) {
      const totalReported = reportedTermin.reduce((sum, termin) => {
        return sum + (termin.realisasiFisik || 0)
      }, 0)
      return Math.round(totalReported / reportedTermin.length)
    }

    // Fallback: use planning weights (persentaseDana) if no realisasi reported yet
    const totalProgress = kontrak.termin.reduce((sum, termin) => {
      return sum + (termin.persentaseDana || 0)
    }, 0)

    return Math.round(totalProgress / kontrak.termin.length)
  },

  // Determine if this contract has any reported realization (for UX emphasis)
  hasReportedRealisasi: function(kontrak) {
    if (!kontrak.termin || kontrak.termin.length === 0) return false
    return kontrak.termin.some(t => this.hasTerminRealisasi(t))
  },

  // Check if contract is overdue
  isOverdue: function(kontrak) {
    const today = new Date()
    const endDate = new Date(kontrak.tglPelaksanaanSampai)
    return endDate < today && kontrak.status !== 'completed'
  },

  // Get status badge color
  getStatusColor: function(kontrak) {
    if (kontrak.status === 'completed') return 'bg-green-100 text-green-800'
    if (this.isOverdue(kontrak)) return 'bg-red-100 text-red-800'
    return 'bg-blue-100 text-blue-800'
  },

  // Get status text
  getStatusText: function(kontrak) {
    if (kontrak.status === 'completed') return 'Selesai'
    if (this.isOverdue(kontrak)) return 'Terlambat'
    return 'Aktif'
  },

  // Format currency
  formatCurrency: function(amount) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount)
  },

  // Format number with thousands separator
  formatNumber: function(amount) {
    if (!amount || isNaN(amount)) return '0'
    return new Intl.NumberFormat('id-ID').format(amount)
  },

  // Parse formatted number back to raw number
  parseFormattedNumber: function(formattedValue) {
    if (!formattedValue) return 0
    // Remove all non-digit characters except decimal point
    const numericValue = formattedValue.replace(/[^\d]/g, '')
    return parseInt(numericValue) || 0
  },

  // Format date
  formatDate: function(dateString) {
    return new Date(dateString).toLocaleDateString('id-ID')
  },

  // Logout
  logout: function() {
    ToastUtils.confirm(
      'Apakah Anda yakin ingin keluar?',
      () => {
        JWTUtils.clearAuthData()
        m.route.set('/login')
      }
    )
  },

  view: function() {
    return m('div', {
      class: 'min-h-screen bg-gray-50'
    }, [
      // Header with improved organization info
      m('div', {
        class: 'bg-white shadow-sm border-b border-gray-200'
      }, [
        m('div', {
          class: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'
        }, [
          m('div', {
            class: 'flex justify-between items-center py-4'
          }, [
            m('div', [
              // Main title
              m('h1', {
                class: 'text-2xl font-bold text-gray-900'
              }, 'Portal Penyedia Barang dan Jasa'),
              
              // Organization details
              m('div', {
                class: 'mt-2 space-y-1'
              }, [
                // For Perangkat Daerah
                this.perangkatDaerah && m('p', {
                  class: 'text-sm text-gray-700 font-medium'
                }, `${this.perangkatDaerah.nama}`),
                
                // Nama Pemerintah Daerah
                this.perangkatDaerah && this.perangkatDaerah.namaPemda && m('p', {
                  class: 'text-sm text-gray-600'
                }, this.perangkatDaerah.namaPemda),
                
                // Vendor company info
                this.penyedia && m('div', { class: 'mt-2' }, [
                  m('p', {
                    class: 'text-sm text-gray-800 font-medium'
                  }, this.penyedia.NamaVendor),
                  this.penyedia.Alamat && m('p', {
                    class: 'text-sm text-gray-600'
                  }, this.penyedia.Alamat)
                ]),
                
                // User info
                m('p', {
                  class: 'text-xs text-gray-500 mt-1'
                }, `Pengguna: ${this.userData?.username} | ${this.userData?.budgetYear ? `${this.userData.budgetYear.year}-${this.userData.budgetYear.status}` : 'N/A'}`)
              ])
            ]),
            m('button', {
              class: 'bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors',
              onclick: () => this.logout()
            }, [
              m('i', {
                class: 'ri-logout-box-r-line mr-2'
              }),
              'Keluar'
            ])
          ])
        ])
      ]),

      // Main Content
      m('div', {
        class: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'
      }, [
        // Dashboard Stats
        m('div', {
          class: 'grid grid-cols-1 md:grid-cols-4 gap-6 mb-8'
        }, [
          m('div', {
            class: 'bg-white rounded-xl shadow-sm border border-gray-200 p-6'
          }, [
            m('div', {
              class: 'flex items-center'
            }, [
              m('div', {
                class: 'w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center'
              }, [
                m('i', {
                  class: 'ri-file-list-3-line text-blue-600 text-xl'
                })
              ]),
              m('div', {
                class: 'ml-4'
              }, [
                m('p', {
                  class: 'text-sm font-medium text-gray-600'
                }, 'Total Kontrak'),
                m('p', {
                  class: 'text-2xl font-bold text-gray-900'
                }, this.kontrakList.length)
              ])
            ])
          ]),

          m('div', {
            class: 'bg-white rounded-xl shadow-sm border border-gray-200 p-6'
          }, [
            m('div', {
              class: 'flex items-center'
            }, [
              m('div', {
                class: 'w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center'
              }, [
                m('i', {
                  class: 'ri-check-line text-green-600 text-xl'
                })
              ]),
              m('div', {
                class: 'ml-4'
              }, [
                m('p', {
                  class: 'text-sm font-medium text-gray-600'
                }, 'Kontrak Selesai'),
                m('p', {
                  class: 'text-2xl font-bold text-gray-900'
                }, this.kontrakList.filter(k => k.status === 'completed').length)
              ])
            ])
          ]),

          m('div', {
            class: 'bg-white rounded-xl shadow-sm border border-gray-200 p-6'
          }, [
            m('div', {
              class: 'flex items-center'
            }, [
              m('div', {
                class: 'w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center'
              }, [
                m('i', {
                  class: 'ri-time-line text-yellow-600 text-xl'
                })
              ]),
              m('div', {
                class: 'ml-4'
              }, [
                m('p', {
                  class: 'text-sm font-medium text-gray-600'
                }, 'Kontrak Aktif'),
                m('p', {
                  class: 'text-2xl font-bold text-gray-900'
                }, this.kontrakList.filter(k => !this.isOverdue(k) && k.status !== 'completed').length)
              ])
            ])
          ]),

          m('div', {
            class: 'bg-white rounded-xl shadow-sm border border-gray-200 p-6'
          }, [
            m('div', {
              class: 'flex items-center'
            }, [
              m('div', {
                class: 'w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center'
              }, [
                m('i', {
                  class: 'ri-error-warning-line text-red-600 text-xl'
                })
              ]),
              m('div', {
                class: 'ml-4'
              }, [
                m('p', {
                  class: 'text-sm font-medium text-gray-600'
                }, 'Terlambat'),
                m('p', {
                  class: 'text-2xl font-bold text-gray-900'
                }, this.kontrakList.filter(k => this.isOverdue(k)).length)
              ])
            ])
          ])
        ]),

        // Contracts Section
        m('div', {
          class: 'bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden'
        }, [
          // Section Header
          m('div', {
            class: 'p-6 border-b border-gray-200'
          }, [
            m('div', {
              class: 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'
            }, [
              m('div', [
                m('h2', {
                  class: 'text-lg font-semibold text-gray-900'
                }, 'Daftar Kontrak'),
                m('p', {
                  class: 'text-sm text-gray-600 mt-1'
                }, 'Kontrak yang tersedia untuk pelaporan realisasi')
              ])
            ])
          ]),

          // Search and Filter
          m('div', {
            class: 'p-6 border-b border-gray-200 bg-gray-50'
          }, [
            m('div', {
              class: 'flex flex-col sm:flex-row gap-4'
            }, [
              // Search
              m('div', {
                class: 'flex-1'
              }, [
                m('div', {
                  class: 'relative'
                }, [
                  m('input', {
                    type: 'text',
                    placeholder: 'Cari kontrak...',
                    class: 'w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                    value: this.searchQuery,
                    oninput: (e) => {
                      this.searchQuery = e.target.value
                      this.handleSearch()
                    }
                  }),
                  m('i', {
                    class: 'ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400'
                  })
                ])
              ]),

              // Status Filter
              m('select', {
                class: 'px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                value: this.statusFilter,
                onchange: (e) => {
                  this.statusFilter = e.target.value
                  this.filterByStatus()
                }
              }, [
                m('option', { value: 'all' }, 'Semua Status'),
                m('option', { value: 'active' }, 'Aktif'),
                m('option', { value: 'completed' }, 'Selesai')
              ])
            ])
          ]),

          // Contracts List
          m('div', {
            class: 'p-6'
          }, [
            this.isLoading ?
              m('div', {
                class: 'flex justify-center items-center py-12'
              }, [
                m('div', {
                  class: 'w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin'
                })
              ]) :

            this.filteredKontrak.length === 0 ?
              m('div', {
                class: 'text-center py-12'
              }, [
                m('i', {
                  class: 'ri-file-list-line text-4xl text-gray-400 mb-4'
                }),
                m('p', {
                  class: 'text-gray-500'
                }, 'Belum ada kontrak')
              ]) :

              m('div', {
                class: 'grid grid-cols-1 lg:grid-cols-2 gap-6'
              }, [
                this.filteredKontrak.map(kontrak => {
                  const progress = this.getProgressPercentage(kontrak)
                  const hasReported = this.hasReportedRealisasi(kontrak)
                  const isOverdue = this.isOverdue(kontrak)

                  // Card state classes:
                  // - Reported: strong green highlight
                  // - Overdue without report: red warning
                  // - Others: neutral
                  const elevatedClass = hasReported
                    ? 'border-green-500 bg-green-50 shadow-lg ring-1 ring-green-200'
                    : isOverdue
                    ? 'border-red-200 bg-red-50/40'
                    : 'border-gray-200 bg-white'

                  const progressBarColor = hasReported
                    ? 'bg-green-500'
                    : isOverdue
                    ? 'bg-red-500'
                    : 'bg-blue-600'

                  return m('div', {
                    key: kontrak._id,
                    class: `rounded-lg p-6 transition-all cursor-pointer hover:shadow-lg hover:-translate-y-0.5 ${elevatedClass}`,
                    onclick: () => this.openKontrakDetail(kontrak)
                  }, [
                    m('div', {
                      class: 'flex justify-between items-start mb-4 gap-3'
                    }, [
                      m('div', [
                        m('h3', {
                          class: 'font-semibold text-gray-900 text-lg'
                        }, kontrak.noKontrak),
                        m('p', {
                          class: 'text-sm text-gray-600 mt-1'
                        }, kontrak.kodeSirupLkpp),
                        // Vendor label (for clarity when same vendor has many kontrak)
                        this.penyedia && m('p', {
                          class: 'text-[11px] text-gray-500 mt-0.5'
                        }, this.penyedia.NamaVendor)
                      ]),
                      m('div', { class: 'flex flex-col items-end space-y-1' }, [
                        // Main status badge
                        m('span', {
                          class: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${this.getStatusColor(kontrak)}`
                        }, this.getStatusText(kontrak)),
                        // Highlight when realization already reported
                        hasReported && m('span', {
                          class: 'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-800 border border-green-200'
                        }, [
                          m('i', { class: 'ri-check-double-line mr-1 text-[11px]' }),
                          'Realisasi dilaporkan'
                        ]),
                        // Overdue + no realization hint
                        isOverdue && !hasReported && m('span', {
                          class: 'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-700 border border-red-200'
                        }, [
                          m('i', { class: 'ri-alert-line mr-1 text-[11px]' }),
                          'Terlambat, belum ada realisasi'
                        ])
                      ])
                    ]),

                    m('div', {
                      class: 'grid grid-cols-2 gap-4 mb-4'
                    }, [
                      m('div', [
                        m('p', {
                          class: 'text-xs text-gray-500 uppercase tracking-wide'
                        }, 'Nilai Kontrak'),
                        m('p', {
                          class: 'font-semibold text-gray-900'
                        }, this.formatCurrency(kontrak.nilaiKontrak))
                      ]),
                      m('div', [
                        m('p', {
                          class: 'text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1'
                        }, [
                          'Progress',
                          hasReported && m('span', {
                            class: 'inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] bg-green-600 text-white'
                          }, 'Real')
                        ]),
                        m('div', {
                          class: 'flex items-center mt-1'
                        }, [
                          m('div', {
                            class: 'w-20 bg-gray-200 rounded-full h-2 mr-2 overflow-hidden'
                          }, [
                            m('div', {
                              class: `${progressBarColor} h-2 rounded-full transition-all duration-300`,
                              style: { width: `${progress}%` }
                            })
                          ]),
                          m('span', {
                            class: `text-xs font-semibold ${hasReported ? 'text-green-700' : isOverdue ? 'text-red-700' : 'text-gray-900'}`
                          }, `${progress}%`)
                        ])
                      ])
                    ]),

                    m('div', {
                      class: 'text-sm text-gray-600'
                    }, [
                      m('div', {
                        class: 'flex items-center mb-1'
                      }, [
                        m('i', {
                          class: 'ri-map-pin-line mr-2'
                        }),
                        kontrak.lokasi
                      ]),
                      m('div', {
                        class: 'flex items-center'
                      }, [
                        m('i', {
                          class: 'ri-calendar-line mr-2'
                        }),
                        `${this.formatDate(kontrak.tglPelaksanaanDari)} - ${this.formatDate(kontrak.tglPelaksanaanSampai)}`
                      ])
                    ])
                  ])
                })
              ])
          ])
        ])
      ]),

      // Contract Detail Modal
      this.showKontrakDetail && this.selectedKontrak && m('div', {
        class: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4',
        onclick: (e) => {
          if (e.target === e.currentTarget) this.closeKontrakDetail()
        }
      }, [
        m('div', {
          class: 'bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto'
        }, [
          // Modal Header
          m('div', {
            class: 'bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-xl'
          }, [
            m('div', {
              class: 'flex items-center justify-between'
            }, [
              m('div', [
                m('h3', {
                  class: 'text-xl font-bold'
                }, 'Detail Kontrak'),
                m('p', {
                  class: 'text-white text-opacity-80 text-sm'
                }, this.selectedKontrak.noKontrak)
              ]),
              m('button', {
                class: 'w-8 h-8 bg-blue-600 bg-opacity-25 rounded-full flex items-center justify-center',
                onclick: () => this.closeKontrakDetail()
              }, [
                m('i', {
                  class: 'ri-close-fill'
                })
              ])
            ])
          ]),

          // Modal Body
          m('div', {
            class: 'p-6'
          }, [
            // Contract Info
            m('div', {
              class: 'grid grid-cols-1 md:grid-cols-2 gap-6 mb-8'
            }, [
              m('div', [
                m('h4', {
                  class: 'text-lg font-semibold text-gray-900 mb-4'
                }, 'Informasi Kontrak'),
                m('div', {
                  class: 'space-y-3'
                }, [
                  m('div', [
                    m('span', {
                      class: 'text-sm text-gray-600'
                    }, 'No. Kontrak: '),
                    m('span', {
                      class: 'font-medium'
                    }, this.selectedKontrak.noKontrak)
                  ]),
                  m('div', [
                    m('span', {
                      class: 'text-sm text-gray-600'
                    }, 'Kode SIRUP/LKPP: '),
                    m('span', {
                      class: 'font-medium'
                    }, this.selectedKontrak.kodeSirupLkpp)
                  ]),
                  m('div', [
                    m('span', {
                      class: 'text-sm text-gray-600'
                    }, 'Nilai Kontrak: '),
                    m('span', {
                      class: 'font-medium'
                    }, this.formatCurrency(this.selectedKontrak.nilaiKontrak))
                  ]),
                  m('div', [
                    m('span', {
                      class: 'text-sm text-gray-600'
                    }, 'Lokasi: '),
                    m('span', {
                      class: 'font-medium'
                    }, this.selectedKontrak.lokasi)
                  ]),
                  m('div', [
                    m('span', {
                      class: 'text-sm text-gray-600'
                    }, 'Periode: '),
                    m('span', {
                      class: 'font-medium'
                    }, `${this.formatDate(this.selectedKontrak.tglPelaksanaanDari)} - ${this.formatDate(this.selectedKontrak.tglPelaksanaanSampai)}`)
                  ])
                ])
              ]),

              m('div', [
                m('h4', {
                  class: 'text-lg font-semibold text-gray-900 mb-4'
                }, 'Progress Summary'),
                m('div', {
                  class: 'bg-gray-50 rounded-lg p-4'
                }, [
                  m('div', {
                    class: 'flex justify-between items-center mb-2'
                  }, [
                    m('span', {
                      class: 'text-sm text-gray-600'
                    }, 'Progress Keseluruhan'),
                    m('span', {
                      class: 'font-bold text-blue-600'
                    }, `${this.getProgressPercentage(this.selectedKontrak)}%`)
                  ]),
                  m('div', {
                    class: 'w-full bg-gray-200 rounded-full h-3'
                  }, [
                    m('div', {
                      class: 'bg-blue-600 h-3 rounded-full transition-all duration-300',
                      style: { width: `${this.getProgressPercentage(this.selectedKontrak)}%` }
                    })
                  ])
                ])
              ])
            ]),

            // Termin List
            m('div', [
              m('h4', {
                class: 'text-lg font-semibold text-gray-900 mb-4'
              }, 'Termin Pembayaran'),
              
              this.availableTermin.length === 0 ?
                m('div', {
                  class: 'text-center py-8 text-gray-500'
                }, [
                  m('i', {
                    class: 'ri-file-list-line text-3xl mb-2'
                  }),
                  m('p', 'Belum ada termin')
                ]) :

                m('div', {
                  class: 'space-y-4'
                }, [
                  // Sort termin alphabetically/numerically (I, II, III, IV, etc.)
                  this.availableTermin.sort((a, b) => {
                    // Extract the numeric part from termin string (e.g., "I", "II", "III", "1", "2", etc.)
                    const getTerminNumber = (termin) => {
                      if (typeof termin === 'string') {
                        // Handle Roman numerals
                        const romanToNum = {
                          'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5,
                          'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10
                        };
                        return romanToNum[termin.toUpperCase()] || parseInt(termin) || 999;
                      }
                      return 0;
                    };
                    
                    return getTerminNumber(a.termin) - getTerminNumber(b.termin);
                  }).map(termin => {
                    // Check if realization has been reported with meaningful data
                    const hasRealisasi = termin.realisasiFisik !== undefined &&
                                       termin.realisasiFisik !== null &&
                                       termin.realisasiFisik > 0;
                    const hasLaporanFile = termin.laporanFile && termin.laporanFile.filename;
                    const hasMeaningfulData = hasRealisasi || (termin.realisasiBelanja && termin.realisasiBelanja > 0);
                    
                    return m('div', {
                      key: termin._id,
                      class: `border rounded-lg p-4 ${hasMeaningfulData ? 'border-green-200 bg-green-50' : 'border-gray-200'}`
                    }, [
                      m('div', {
                        class: 'flex justify-between items-start'
                      }, [
                        m('div', [
                          m('div', {
                            class: 'flex items-center gap-2 mb-1'
                          }, [
                            m('h5', {
                              class: 'font-medium text-gray-900'
                            }, termin.termin),
                            // Status badges - only show if there's meaningful data
                            hasMeaningfulData && m('span', {
                              class: 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800'
                            }, [
                              m('i', { class: 'ri-check-line mr-1' }),
                              'Dilaporkan'
                            ]),
                            hasLaporanFile && m('span', {
                              class: 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800'
                            }, [
                              m('i', { class: 'ri-file-pdf-line mr-1' }),
                              'PDF'
                            ])
                          ]),
                          m('p', {
                            class: 'text-sm text-gray-600 mb-2'
                          }, `Persentase: ${termin.persentaseDana}% | Dana: ${this.formatCurrency(termin.jumlahDana)}`),
                          
                          // Realisasi data display - only show if there's meaningful data
                          hasMeaningfulData ? m('div', {
                            class: 'bg-white rounded p-3 border border-gray-200 mt-2'
                          }, [
                            m('div', {
                              class: 'grid grid-cols-2 gap-4 text-sm'
                            }, [
                              m('div', [
                                m('span', { class: 'text-gray-500' }, 'Realisasi Fisik: '),
                                m('span', { class: 'font-medium text-green-700' }, `${termin.realisasiFisik || 0}%`)
                              ]),
                              m('div', [
                                m('span', { class: 'text-gray-500' }, 'Realisasi Belanja: '),
                                m('span', { class: 'font-medium text-green-700' }, this.formatCurrency(termin.realisasiBelanja || 0))
                              ])
                            ]),
                            termin.laporanDate && m('div', {
                              class: 'mt-2 text-xs text-gray-500'
                            }, [
                              m('i', { class: 'ri-calendar-line mr-1' }),
                              `Dilaporkan: ${this.formatDate(termin.laporanDate)}`
                            ]),
                            termin.periodeMulai && termin.periodeSampai && m('div', {
                              class: 'text-xs text-gray-500'
                            }, [
                              m('i', { class: 'ri-time-line mr-1' }),
                              `Periode: ${this.formatDate(termin.periodeMulai)} - ${this.formatDate(termin.periodeSampai)}`
                            ])
                          ]) : null
                        ]),
                        m('div', {
                          class: 'flex items-center space-x-2'
                        }, [
                          termin.isPaid ?
                            m('span', {
                              class: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800'
                            }, 'Sudah Dibayar') :
                            m('div', {
                              class: 'flex flex-col gap-2'
                            }, [
                              // Always show "Lapor Realisasi" for termin without meaningful data
                              !hasMeaningfulData ? m('button', {
                                class: 'bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors',
                                onclick: (e) => {
                                  e.stopPropagation();
                                  this.openRealisasiModal(termin);
                                }
                              }, 'Lapor Realisasi') :
                              // Show "Edit Laporan" for termin with meaningful data
                              m('button', {
                                class: 'bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors',
                                onclick: (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('🔧 Edit button clicked for termin:', termin.termin);
                                  console.log('🔧 Termin data:', termin);
                                  this.openRealisasiModal(termin);
                                },
                                title: 'Klik untuk edit laporan realisasi'
                              }, [
                                m('i', { class: 'ri-edit-line mr-1' }),
                                'Edit Laporan'
                              ])
                            ])
                        ])
                      ])
                    ])
                  })
                ])
            ])
          ])
        ])
      ]),

      // Realisasi Modal
      this.showRealisasiModal && m('div', {
        class: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4',
        onclick: (e) => {
          if (e.target === e.currentTarget) this.closeRealisasiModal()
        }
      }, [
        m('div', {
          class: 'bg-white rounded-xl shadow-2xl max-w-6xl w-full'
        }, [
          // Modal Header
          m('div', {
            class: 'bg-gradient-to-r from-green-500 to-teal-600 text-white p-6 rounded-t-xl'
          }, [
            m('div', {
              class: 'flex items-center justify-between'
            }, [
              m('div', [
                m('h3', {
                  class: 'text-xl font-bold'
                }, this.realisasiFormData.isEditing ? 'Edit Realisasi' : 'Lapor Realisasi'),
                m('p', {
                  class: 'text-white text-opacity-80 text-sm'
                }, 'Input data realisasi progresso berdasarkan periode')
              ]),
              m('button', {
                class: 'w-8 h-8 bg-green-600 bg-opacity-25 rounded-full flex items-center justify-center',
                onclick: () => this.closeRealisasiModal()
              }, [
                m('i', {
                  class: 'ri-close-fill'
                })
              ])
            ])
          ]),

          // Modal Body
          m('div', {
            class: 'p-6'
          }, [
            // Two-column layout: Form (left) + PDF Preview (right)
            m('div', {
              class: 'grid grid-cols-1 lg:grid-cols-2 gap-8'
            }, [
              // Left Column: Form Fields
              m('div', {
                class: 'space-y-4'
              }, [
              // Tanggal Laporan
              m('div', [
                m('label', {
                  class: 'block text-sm font-semibold text-gray-800 mb-2'
                }, [
                  m('i', {
                    class: 'ri-calendar-todo-line mr-1 text-purple-500'
                  }),
                  'Tanggal Laporan'
                ]),
                m('input', {
                  type: 'date',
                  class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200',
                  value: this.realisasiFormData.laporanDate,
                  oninput: (e) => {
                    this.realisasiFormData.laporanDate = e.target.value
                  }
                })
              ]),

              // Periode Mulai
              m('div', [
                m('label', {
                  class: 'block text-sm font-semibold text-gray-800 mb-2'
                }, [
                  m('i', {
                    class: 'ri-calendar-line mr-1 text-blue-500'
                  }),
                  'Periode Mulai'
                ]),
                // Contract date info for user guidance
                this.selectedKontrak && m('p', {
                  class: 'text-xs text-gray-500 mb-2'
                }, `Kontrak mulai: ${this.selectedKontrak.tglPelaksanaanDari ? new Date(this.selectedKontrak.tglPelaksanaanDari).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}`),
                m('input', {
                  type: 'date',
                  class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200',
                  value: this.realisasiFormData.periodeMulai,
                  min: this.selectedKontrak ? this.selectedKontrak.tglPelaksanaanDari : '',
                  max: this.selectedKontrak ? this.selectedKontrak.tglPelaksanaanSampai : '',
                  oninput: (e) => {
                    this.realisasiFormData.periodeMulai = e.target.value
                  }
                })
              ]),

              // Periode Sampai
              m('div', [
                m('label', {
                  class: 'block text-sm font-semibold text-gray-800 mb-2'
                }, [
                  m('i', {
                    class: 'ri-calendar-line mr-1 text-green-500'
                  }),
                  'Periode Sampai'
                ]),
                // Contract date info for user guidance
                this.selectedKontrak && m('p', {
                  class: 'text-xs text-gray-500 mb-2'
                }, `Kontrak selesai: ${this.selectedKontrak.tglPelaksanaanSampai ? new Date(this.selectedKontrak.tglPelaksanaanSampai).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}`),
                m('input', {
                  type: 'date',
                  class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200',
                  value: this.realisasiFormData.periodeSampai,
                  min: this.selectedKontrak ? this.selectedKontrak.tglPelaksanaanDari : '',
                  max: this.selectedKontrak ? this.selectedKontrak.tglPelaksanaanSampai : '',
                  oninput: (e) => {
                    this.realisasiFormData.periodeSampai = e.target.value
                  }
                })
              ]),

              // Realisasi Fisik
              m('div', [
                m('label', {
                  class: 'block text-sm font-semibold text-gray-800 mb-2'
                }, [
                  m('i', {
                    class: 'ri-bar-chart-line mr-1 text-green-500'
                  }),
                  'Realisasi Fisik'
                ]),
                m('div', { class: 'relative' }, [
                  m('input', {
                    type: 'number',
                    min: '0',
                    max: '100',
                    step: '0.1',
                    class: 'w-full px-4 py-3 pr-8 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200',
                    placeholder: '0-100',
                    value: this.realisasiFormData.realisasiFisik || '',
                    oninput: (e) => {
                      const value = parseFloat(e.target.value) || 0
                      this.realisasiFormData.realisasiFisik = Math.min(Math.max(value, 0), 100)
                    }
                  }),
                  m('div', {
                    class: 'absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm pointer-events-none'
                  }, '%')
                ])
              ]),

              // Realisasi Belanja
              m('div', [
                m('label', {
                  class: 'block text-sm font-semibold text-gray-800 mb-2'
                }, [
                  m('i', {
                    class: 'ri-money-dollar-circle-line mr-1 text-amber-500'
                  }),
                  'Realisasi Belanja (Rp)'
                ]),
                m('input', {
                  type: 'text',
                  class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all duration-200',
                  placeholder: '0',
                  value: this.realisasiFormData.realisasiBelanja ? this.formatNumber(this.realisasiFormData.realisasiBelanja) : '',
                  oninput: (e) => {
                    const rawValue = this.parseFormattedNumber(e.target.value)
                    this.realisasiFormData.realisasiBelanja = rawValue
                    // Update display to show formatted number
                    e.target.value = this.formatNumber(rawValue)
                  }
                })
              ]),

              // Laporan File
              m('div', [
                m('label', {
                  class: 'block text-sm font-semibold text-gray-800 mb-2'
                }, [
                  m('i', {
                    class: 'ri-file-pdf-line mr-1 text-red-500'
                  }),
                  'Laporan (PDF max 1MB)'
                ]),
                m('input', {
                  type: 'file',
                  accept: 'application/pdf',
                  class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all duration-200',
                  onchange: (e) => this.handleFileUpload(e)
                }),
                
                // File info and actions - only show for new uploads, not database files
                this.realisasiFormData.laporanPreview && !this.realisasiFormData.laporanPreview.isExisting && m('div', {
                  class: 'mt-3 p-3 bg-red-50 rounded-lg border border-red-200'
                }, [
                  m('div', {
                    class: 'flex items-center justify-between'
                  }, [
                    m('div', [
                      m('div', {
                        class: 'flex items-center text-sm font-medium text-red-800'
                      }, [
                        m('i', {
                          class: 'ri-file-pdf-line mr-2'
                        }),
                        this.realisasiFormData.laporanPreview.name
                      ]),
                      m('div', {
                        class: 'text-xs text-red-600 mt-1'
                      }, `Size: ${(this.realisasiFormData.laporanPreview.size / 1024).toFixed(1)} KB | Type: ${this.realisasiFormData.laporanPreview.type}`)
                    ]),
                    m('button', {
                      type: 'button',
                      class: 'ml-3 text-red-500 hover:text-red-700 text-sm',
                      onclick: () => this.removeFile()
                    }, [
                      m('i', {
                        class: 'ri-delete-bin-line mr-1'
                      }),
                      'Remove'
                    ])
                  ])
                ]),
                
                // Database file info - show separately for existing files
                this.realisasiFormData.laporanPreview && this.realisasiFormData.laporanPreview.isExisting && m('div', {
                  class: 'mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200'
                }, [
                  m('div', {
                    class: 'flex items-center justify-between'
                  }, [
                    m('div', [
                      m('div', {
                        class: 'flex items-center text-sm font-medium text-blue-800'
                      }, [
                        m('i', {
                          class: 'ri-file-pdf-line mr-2'
                        }),
                        this.realisasiFormData.laporanPreview.name,
                        m('span', { class: 'ml-2 text-xs bg-blue-100 px-2 py-1 rounded' }, 'File Database')
                      ]),
                      m('div', {
                        class: 'text-xs text-blue-600 mt-1'
                      }, 'File tersimpan di database. Upload file baru untuk mengganti.')
                    ])
                  ])
                ])
              ])
              ]),
              
              // Right Column: PDF Preview
              m('div', {
                class: 'bg-gray-50 rounded-lg p-4'
              }, [
                m('h4', {
                  class: 'text-lg font-semibold text-gray-900 mb-4'
                }, 'Preview Laporan'),
                
                this.realisasiFormData.laporanPreview ?
                  // PDF Preview (when file is uploaded)
                  m('div', {
                    class: 'space-y-4'
                  }, [
                    // PDF Info
                    m('div', {
                      class: 'bg-white rounded-lg p-4 border border-gray-200'
                    }, [
                      m('div', {
                        class: 'flex items-center text-sm text-gray-600'
                      }, [
                        m('i', {
                          class: 'ri-file-pdf-line text-red-500 mr-2'
                        }),
                        m('span', {
                          class: 'font-medium'
                        }, this.realisasiFormData.laporanPreview.name),
                        this.realisasiFormData.laporanPreview.size ? m('span', {
                          class: 'ml-2 text-xs'
                        }, `(${this.realisasiFormData.laporanPreview.size ? (this.realisasiFormData.laporanPreview.size / 1024).toFixed(1) : 'N/A'} KB)`) : null
                      ])
                    ]),
                    
                    // PDF viewer
                    (this.realisasiFormData.laporanFile || (this.realisasiFormData.laporanPreview && this.realisasiFormData.laporanPreview.dataUrl)) ?
                      m('div', {
                        class: 'h-80 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 overflow-hidden'
                      }, [
                        // Use object URL for new uploads or data URL for database files
                        m('iframe', {
                          src: this.realisasiFormData.laporanFile ?
                            URL.createObjectURL(this.realisasiFormData.laporanFile) :
                            this.realisasiFormData.laporanPreview.dataUrl,
                          class: 'w-full h-full border-0',
                          title: 'PDF Preview'
                        })
                      ]) :
                      // Show info for existing files without preview capability
                      m('div', {
                        class: 'h-80 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center'
                      }, [
                        m('div', { class: 'text-center' }, [
                          m('i', { class: 'ri-file-pdf-line text-4xl text-gray-400 mb-2' }),
                          m('p', { class: 'text-gray-600 font-medium' }, this.realisasiFormData.laporanPreview.name),
                          m('p', { class: 'text-xs text-gray-500 mt-1' }, 'File tersimpan di database'),
                          m('p', { class: 'text-xs text-gray-500' }, 'Upload file baru untuk mengganti')
                        ])
                      ]),
                    
                    // Additional info
                    m('div', {
                      class: 'text-xs text-gray-500 text-center mt-2'
                    }, [
                      this.realisasiFormData.laporanFile ?
                        'PDF dapat dilihat menggunakan browser atau diunduh untuk review' :
                        'File tersimpan di database - upload file baru untuk memperbarui'
                    ])
                  ]) :
                  
                  // No file uploaded state
                  m('div', {
                    class: 'border-2 border-dashed border-gray-300 rounded-lg p-8 text-center'
                  }, [
                    m('i', {
                      class: 'ri-file-add-line text-4xl text-gray-400 mb-4'
                    }),
                    m('p', {
                      class: 'text-gray-500 mb-2'
                    }, 'Upload file PDF untuk preview'),
                    m('p', {
                      class: 'text-xs text-gray-400'
                    }, 'File akan muncul di viewer setelah upload')
                  ])
              ])
            ])
          ]),

          // Modal Actions
          m('div', {
            class: 'flex justify-end gap-3 pt-6 border-t border-gray-200 bg-gray-50 px-6 py-4 rounded-b-xl'
          }, [
            m('button', {
              class: 'px-6 py-3 bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-gray-400 rounded-lg text-gray-700 font-medium transition-all duration-200 flex items-center space-x-2',
              onclick: () => this.closeRealisasiModal()
            }, [
              m('i', {
                class: 'ri-close-fill'
              }),
              m('span', 'Batal')
            ]),
            m('button', {
              class: `px-6 py-3 bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 ${this.isLoading ? 'opacity-75 cursor-not-allowed' : ''}`,
              onclick: () => this.saveRealisasi(),
              disabled: this.isLoading
            }, [
              this.isLoading ? 
                m('i', {
                  class: 'ri-loader-4-line animate-spin'
                }) : 
                m('i', {
                  class: 'ri-save-line'
                }),
              m('span', this.isLoading ? 'Menyimpan...' : (this.realisasiFormData.isEditing ? 'Perbarui Laporan' : 'Simpan Laporan'))
            ])
          ])
        ])
      ])
    ])
  }
}

export default VendorLayout