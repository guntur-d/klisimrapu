import m from 'mithril'
import { UserUtils, APIUtils, ToastUtils, JWTUtils } from '../js/utils.js'

const Realisasi = {
  // State management
   isLoading: false,
   loadingRealisasi: false,
   loadingKinerja: false, // Loading state for kinerja data

  // Data collections
  subPerangkatDaerahList: [],
  kinerjaList: [],
  anggaranList: [],
  subKegiatanList: [],
  kodeRekeningList: [],
  realisasiList: [],

  // Selection state
   selectedSubPerangkatDaerahId: '',
   selectedSubKegiatanId: '',
   selectedBudgetYear: '',
   currentSubKegiatanId: '', // Track which subkegiatan's kode rekening data is loaded

  // Form state
   showModal: false,
   modalMode: 'create', // 'create', 'edit', or 'view'
   isModalLoading: false,

  // Realisasi form data
  realisasiForm: {
    kodeRekeningId: '',
    budgetAmount: 0,
    realizationAmount: '',
    description: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  },

  // Filter and search
  searchQuery: '',
  selectedMonth: new Date().getMonth() + 1,
  selectedYear: new Date().getFullYear(),

  // Indonesian locale for currency formatting
  formatCurrency: function(amount) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0)
  },

  // Parse Indonesian currency format to number
  parseCurrencyInput: function(value) {
    if (!value) return 0

    // Remove currency symbols and formatting
    const cleaned = value.toString()
      .replace(/Rp\s?/g, '')
      .replace(/[.,]/g, '')
      .replace(/\s+/g, '')

    return parseInt(cleaned) || 0
  },

  // Format number for input display
  formatNumberInput: function(value) {
    if (!value) return ''
    return new Intl.NumberFormat('id-ID').format(value)
  },

  // Parse number input with Indonesian locale
  parseNumberInput: function(value) {
    if (!value) return 0
    const cleaned = value.toString().replace(/[.,]/g, '')
    return parseInt(cleaned) || 0
  },

  oninit: function() {
    // Authentication check
    if (!UserUtils.isAuthenticated()) {
      ToastUtils.warning('Silakan masuk terlebih dahulu')
      m.route.set('/login')
      return
    }

    // Set page title in layout
    if (this.vnode && this.vnode.attrs && this.vnode.attrs.setTitle) {
      this.vnode.attrs.setTitle('Realisasi Anggaran')
    }

    // Load user data and initial data
    this.userData = UserUtils.getUserData()

    // Handle budget year object format from user data
    if (this.userData.budgetYear && typeof this.userData.budgetYear === 'object') {
      this.userData.budgetYear = `${this.userData.budgetYear.year}-${this.userData.budgetYear.status}`
    }

    this.selectedBudgetYear = this.userData.budgetYear || ''

    this.loadInitialData()
  },

  // Watch for changes in selectedSubKegiatanId and automatically load realisasi data
  onbeforeupdate: function() {
    // This will trigger when selectedSubKegiatanId changes
    // We can use this to auto-load realisasi data when subkegiatan is selected
  },

  // Proper data flow: load realisasi data when kinerja data is loaded

  oncreate: function() {
    // Component is ready, but data loading is handled by user interactions and proper state management
    // No need for retry logic if the data flow is designed correctly
    console.log('Realisasi component created and ready')
  },

  loadInitialData: async function() {
    if (!UserUtils.isAuthenticated()) {
      ToastUtils.warning('Silakan masuk terlebih dahulu')
      m.route.set('/login')
      return
    }

    this.isLoading = true
    m.redraw()

    try {
      const token = JWTUtils.getToken()
      if (!token) {
        throw new Error('No authentication token found')
      }

      // Load SubPerangkatDaerah data for unit selection using APIUtils
      const subPerangkatDaerahResult = await APIUtils.getAll('subperangkatdaerah')
      this.subPerangkatDaerahList = subPerangkatDaerahResult.data || []

      ToastUtils.success('Data berhasil dimuat')
    } catch (error) {
      console.error('Error loading initial data:', error)

      if (error.message && error.message.includes('401')) {
        ToastUtils.warning('Sesi login telah berakhir. Silakan masuk kembali.')
        setTimeout(() => m.route.set('/login'), 2000)
      } else {
        ToastUtils.error('Gagal memuat data: ' + (error.message || 'Kesalahan tidak diketahui'))
      }

      this.subPerangkatDaerahList = []
      this.kodeRekeningList = []
    } finally {
      this.isLoading = false
      m.redraw()
    }
  },

  loadKinerjaData: async function() {
    if (!this.selectedSubPerangkatDaerahId) {
      this.kinerjaList = []
      this.anggaranList = []
      this.subKegiatanList = []
      this.kodeRekeningList = []
      return
    }

    this.loadingKinerja = true
    m.redraw()

    try {
      const token = JWTUtils.getToken()
      if (!token) {
        throw new Error('No authentication token found')
      }

      // Load Kinerja data for selected unit and budget year
      const kinerjaResponse = await fetch(`/api/kinerja?subPerangkatDaerahId=${this.selectedSubPerangkatDaerahId}&budgetYear=${encodeURIComponent(this.selectedBudgetYear)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (kinerjaResponse.ok) {
        const kinerjaResult = await kinerjaResponse.json()
        this.kinerjaList = kinerjaResult.data || []

        console.log('Received kinerja data:', this.kinerjaList)
        if (this.kinerjaList.length > 0) {
          console.log('First kinerja item structure:', {
            anggaranId: this.kinerjaList[0].anggaranId,
            anggaranIdType: typeof this.kinerjaList[0].anggaranId,
            subKegiatanId: this.kinerjaList[0].subKegiatanId,
            subKegiatanIdType: typeof this.kinerjaList[0].subKegiatanId
          })
        }

        // Extract anggaran and subkegiatan data from populated kinerja data
        const anggaranMap = new Map()
        const subKegiatanMap = new Map()

        this.kinerjaList.forEach(k => {
          // Process populated anggaran data
          if (k.anggaranId) {
            console.log('Processing populated anggaran:', k.anggaranId)
            anggaranMap.set(k.anggaranId._id.toString(), k.anggaranId)
          }

          // Process populated subkegiatan data
          if (k.subKegiatanId) {
            console.log('Processing populated subkegiatan:', k.subKegiatanId)
            subKegiatanMap.set(k.subKegiatanId._id.toString(), k.subKegiatanId)
          }
        })

        this.anggaranList = Array.from(anggaranMap.values())
        this.subKegiatanList = Array.from(subKegiatanMap.values())

        console.log('Processed data:', {
          anggaranCount: this.anggaranList.length,
          subKegiatanCount: this.subKegiatanList.length
        })

        if (this.anggaranList.length > 0) {
          ToastUtils.success(`Data berhasil dimuat: ${this.anggaranList.length} anggaran, ${this.subKegiatanList.length} subkegiatan`)

          // Load realisasi data if subkegiatan is already selected
          if (this.selectedSubKegiatanId) {
            console.log('Loading realisasi data for selected subkegiatan:', this.selectedSubKegiatanId)
            this.loadRealisasiData()
          }
        } else {
          ToastUtils.warning('Tidak ada data anggaran ditemukan untuk unit kerja ini')
        }
      } else {
        ToastUtils.warning('Tidak ada data kinerja ditemukan untuk unit kerja ini')
      }
    } catch (error) {
      console.error('Error loading kinerja data:', error)

      if (error.message && error.message.includes('401')) {
        ToastUtils.warning('Sesi login telah berakhir. Silakan masuk kembali.')
        setTimeout(() => m.route.set('/login'), 2000)
      } else {
        ToastUtils.error('Gagal memuat data kinerja')
      }

      this.kinerjaList = []
      this.anggaranList = []
      this.subKegiatanList = []
    } finally {
      this.loadingKinerja = false
      m.redraw()
    }
  },


  loadRealisasiData: async function() {
    if (!this.selectedSubKegiatanId) {
      this.realisasiList = []
      return
    }

    this.loadingRealisasi = true
    m.redraw()

    try {
      const token = JWTUtils.getToken()
      if (!token) {
        throw new Error('No authentication token found')
      }

      // Load Realisasi data for selected subkegiatan and period
      console.log('Loading realisasi with params:', {
        subKegiatanId: this.selectedSubKegiatanId,
        month: this.selectedMonth,
        year: this.selectedYear
      })

      const realisasiResponse = await fetch(`/api/realisasi?subKegiatanId=${this.selectedSubKegiatanId}&month=${this.selectedMonth}&year=${this.selectedYear}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (realisasiResponse.ok) {
        const realisasiResult = await realisasiResponse.json()
        this.realisasiList = realisasiResult.data || []

        console.log('=== REALISASI DEBUG INFO ===')
        console.log('Loaded realisasi data:', this.realisasiList)
        console.log('Realisasi count:', this.realisasiList.length)

        if (this.realisasiList.length > 0) {
          this.realisasiList.forEach((r, index) => {
            console.log(`Realisasi ${index + 1}:`, {
              kodeRekeningId: r.kodeRekeningId,
              realizationAmount: r.realizationAmount,
              month: r.month,
              year: r.year,
              subKegiatanId: r.subKegiatanId
            })
          })

          // Load kode rekening data for this subkegiatan if needed
          await this.loadKodeRekeningForSubKegiatan(this.selectedSubKegiatanId)
        }

        // Always redraw after API call to update table (whether data exists or not)
        m.redraw()

        console.log('Selected subkegiatan ID:', this.selectedSubKegiatanId)
        console.log('Selected period:', `${this.selectedMonth}/${this.selectedYear}`)
        console.log('========================')
      } else {
        console.error('Failed to load realisasi data, status:', realisasiResponse.status)
        throw new Error(`HTTP ${realisasiResponse.status}: ${realisasiResponse.statusText}`)
      }
    } catch (error) {
      console.error('Error loading realisasi data:', error)
      ToastUtils.error('Gagal memuat data realisasi')
      this.realisasiList = []
    } finally {
      this.loadingRealisasi = false
      m.redraw()
    }
  },

  loadKodeRekeningForSubKegiatan: async function(subKegiatanId) {
    if (!subKegiatanId || this.currentSubKegiatanId === subKegiatanId) return []

    // Find anggaran for selected subkegiatan
    const anggaran = this.anggaranList.find(a => a.subKegiatanId === subKegiatanId)
    if (!anggaran || !anggaran.allocations) return []

    // Get kode rekening IDs from allocations
    const kodeRekeningIds = anggaran.allocations.map(alloc => alloc.kodeRekeningId)

    console.log('Loading kode rekening data for subkegiatan:', subKegiatanId)
    console.log('Kode rekening IDs from allocations:', kodeRekeningIds)

    try {
      const token = JWTUtils.getToken()
      if (!token) {
        throw new Error('No authentication token found')
      }

      // Load only the kode rekening records that are in the allocations
      const kodeRekeningResponse = await fetch(`/api/koderekening?ids=${kodeRekeningIds.join(',')}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (kodeRekeningResponse.ok) {
        const kodeRekeningResult = await kodeRekeningResponse.json()
        this.kodeRekeningList = kodeRekeningResult.data || []
        this.currentSubKegiatanId = subKegiatanId // Track which subkegiatan this data is for
        console.log(`Loaded ${this.kodeRekeningList.length} kode rekening records`)
        m.redraw() // Trigger re-render with new data
      } else {
        console.error('Failed to load kode rekening data, status:', kodeRekeningResponse.status)
        this.kodeRekeningList = []
      }
    } catch (error) {
      console.error('Error loading kode rekening:', error)
      this.kodeRekeningList = []
    }

    return this.kodeRekeningList
  },

  getAvailableKodeRekening: function() {
    if (!this.selectedSubKegiatanId) return []

    // Find anggaran for selected subkegiatan
    const anggaran = this.anggaranList.find(a => a.subKegiatanId === this.selectedSubKegiatanId)
    if (!anggaran || !anggaran.allocations) return []

    // Get kode rekening IDs from allocations
    const kodeRekeningIds = anggaran.allocations.map(alloc => alloc.kodeRekeningId)

    // Filter kode rekening list to only include those in the allocations
    const filtered = this.kodeRekeningList.filter(kode => {
      return kodeRekeningIds.includes(kode._id)
    })

    return filtered
  },

  getBudgetAmount: function(kodeRekeningId) {
    if (!this.selectedSubKegiatanId) return 0

    // Find anggaran for selected subkegiatan
    const anggaran = this.anggaranList.find(a => a.subKegiatanId === this.selectedSubKegiatanId)
    if (!anggaran || !anggaran.allocations) return 0

    // Find allocation for this kode rekening
    const allocation = anggaran.allocations.find(alloc => alloc.kodeRekeningId === kodeRekeningId)
    return allocation ? allocation.amount : 0
  },

  getRealizationAmount: function(kodeRekeningId) {
    // Find existing realization for this kode rekening
    const realisasi = this.realisasiList.find(r => {
      // Handle different formats of kodeRekeningId in realization data
      let realisasiKodeId = r.kodeRekeningId

      // If kodeRekeningId is a populated object, extract the _id
      if (typeof realisasiKodeId === 'object' && realisasiKodeId !== null && realisasiKodeId._id) {
        realisasiKodeId = realisasiKodeId._id
      }
      // Handle ObjectId objects with $oid
      else if (typeof realisasiKodeId === 'object' && realisasiKodeId !== null && realisasiKodeId.$oid) {
        realisasiKodeId = realisasiKodeId.$oid
      }
      // Handle other object types
      else if (typeof realisasiKodeId === 'object' && realisasiKodeId !== null) {
        realisasiKodeId = realisasiKodeId.toString()
      }

      return realisasiKodeId === kodeRekeningId
    })

    return realisasi ? realisasi.realizationAmount : 0
  },

  resetForm: function() {
    this.realisasiForm = {
      kodeRekeningId: '',
      budgetAmount: 0,
      realizationAmount: '',
      description: '',
      month: this.selectedMonth || new Date().getMonth() + 1,
      year: this.selectedYear || new Date().getFullYear()
    }
  },

  openCreateModal: function(kodeRekening) {
    this.modalMode = 'create'
    this.realisasiForm = {
      kodeRekeningId: kodeRekening._id,
      budgetAmount: this.getBudgetAmount(kodeRekening._id),
      realizationAmount: this.getRealizationAmount(kodeRekening._id) || '',
      description: '',
      month: this.selectedMonth || new Date().getMonth() + 1,
      year: this.selectedYear || new Date().getFullYear()
    }
    this.showModal = true
  },

  openEditModal: function(realisasi) {
    this.modalMode = 'edit'
    this.realisasiForm = {
      _id: realisasi._id,
      kodeRekeningId: realisasi.kodeRekeningId,
      budgetAmount: realisasi.budgetAmount || 0,
      realizationAmount: realisasi.realizationAmount || 0,
      description: realisasi.description || '',
      month: realisasi.month,
      year: realisasi.year
    }
    this.showModal = true
  },

  openViewModal: function(realisasi) {
    this.modalMode = 'view'
    this.realisasiForm = {
      _id: realisasi._id,
      kodeRekeningId: realisasi.kodeRekeningId,
      budgetAmount: realisasi.budgetAmount || 0,
      realizationAmount: realisasi.realizationAmount || 0,
      description: realisasi.description || '',
      month: realisasi.month,
      year: realisasi.year
    }
    this.showModal = true
  },

  closeModal: function() {
    this.showModal = false
    this.resetForm()
  },

  saveRealisasi: async function() {
    if (!this.realisasiForm.kodeRekeningId || !this.realisasiForm.realizationAmount) {
      ToastUtils.warning('Kode rekening dan jumlah realisasi harus diisi')
      return
    }

    this.isModalLoading = true
    m.redraw()

    try {
      const token = JWTUtils.getToken()
      if (!token) {
        throw new Error('No authentication token found')
      }

      const method = this.modalMode === 'edit' ? 'PUT' : 'POST'
      const url = this.modalMode === 'edit'
        ? `/api/realisasi/${this.realisasiForm._id}`
        : '/api/realisasi'

      const realisasiData = {
        kodeRekeningId: this.realisasiForm.kodeRekeningId,
        budgetAmount: this.realisasiForm.budgetAmount,
        realizationAmount: this.parseNumberInput(this.realisasiForm.realizationAmount),
        description: this.realisasiForm.description,
        subKegiatanId: this.selectedSubKegiatanId,
        month: this.realisasiForm.month,
        year: this.realisasiForm.year
      }

      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(realisasiData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      ToastUtils.success(`Realisasi berhasil di${this.modalMode === 'edit' ? 'perbarui' : 'simpan'}`)
      this.closeModal()
      this.loadRealisasiData()
    } catch (error) {
      console.error('Error saving realisasi:', error)
      ToastUtils.error(`Gagal ${this.modalMode === 'edit' ? 'memperbarui' : 'menyimpan'} realisasi: ` + (error.message || 'Kesalahan tidak diketahui'))
    } finally {
      this.isModalLoading = false
      m.redraw()
    }
  },

  deleteRealisasi: async function(realisasi) {
    showConfirmation(
      `Apakah Anda yakin ingin menghapus realisasi untuk kode rekening ini?`,
      async () => {
        try {
          const token = JWTUtils.getToken()
          if (!token) {
            throw new Error('No authentication token found')
          }

          const response = await fetch(`/api/realisasi/${realisasi._id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
          }

          ToastUtils.success('Realisasi berhasil dihapus')
          this.loadRealisasiData()
        } catch (error) {
          console.error('Error deleting realisasi:', error)
          ToastUtils.error('Gagal menghapus realisasi: ' + (error.message || 'Kesalahan tidak diketahui'))
        }
      },
      () => {
        ToastUtils.info('Penghapusan dibatalkan')
      }
    )
  },

  getMonthName: function(month) {
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ]
    return monthNames[month - 1] || 'Tidak Valid'
  },

  view: function() {
    return m('div', { class: 'space-y-6' }, [

      // Header
      m('div', { class: 'flex justify-between items-center' }, [
        m('div', [
          m('h1', { class: 'text-2xl font-bold text-gray-900' }, 'Realisasi Anggaran'),
          m('p', { class: 'text-gray-600 mt-1' }, 'Kelola realisasi anggaran berdasarkan unit kerja dan subkegiatan')
        ])
      ]),

      // Selection Panel
      m('div', { class: 'bg-white rounded-xl shadow-sm border border-gray-200 p-6' }, [
        m('h3', { class: 'text-lg font-semibold text-gray-800 mb-4' }, 'Pilih Unit Kerja dan Subkegiatan'),

        m('div', { class: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' }, [

          // SubPerangkatDaerah Selection
          m('div', [
            m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
              m('i', { class: 'ri-building-line mr-2 text-blue-500' }),
              'Unit Kerja'
            ]),
            m('select', {
              class: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white',
              value: this.selectedSubPerangkatDaerahId,
              onchange: (e) => {
                this.selectedSubPerangkatDaerahId = e.target.value
                this.selectedSubKegiatanId = ''
                this.loadKinerjaData()
              },
              disabled: this.isLoading
            }, [
              m('option', { value: '' }, this.isLoading ? 'Memuat...' : 'Pilih Unit Kerja'),
              this.subPerangkatDaerahList.map(unit =>
                m('option', {
                  value: unit._id,
                  key: unit._id
                }, `${unit.nama} (${unit.pimpinan})`)
              )
            ])
          ]),

          // SubKegiatan Selection
          m('div', [
            m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
              m('i', { class: 'ri-node-tree mr-2 text-green-500' }),
              'Subkegiatan'
            ]),
            m('select', {
              class: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white',
              value: this.selectedSubKegiatanId,
              onchange: (e) => {
                this.selectedSubKegiatanId = e.target.value
                this.loadRealisasiData()
              },
              disabled: this.isLoading || !this.selectedSubPerangkatDaerahId || this.loadingKinerja
            }, [
              m('option', { value: '' }, this.loadingKinerja ? 'Memuat...' : 'Pilih Subkegiatan'),
              this.subKegiatanList.map(subKeg =>
                m('option', {
                  value: subKeg._id,
                  key: subKeg._id
                }, `${subKeg.kode} - ${subKeg.nama}`)
              )
            ])
          ]),

          // Period Selection
          m('div', [
            m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
              m('i', { class: 'ri-calendar-line mr-2 text-purple-500' }),
              'Periode'
            ]),
            m('div', { class: 'flex space-x-2' }, [
              m('select', {
                class: 'flex-1 px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white',
                value: this.selectedMonth,
                onchange: (e) => {
                  this.selectedMonth = parseInt(e.target.value)
                  if (this.selectedSubKegiatanId) {
                    this.loadRealisasiData()
                  }
                  m.redraw() // Force immediate redraw to update table
                }
              }, [
                Array.from({ length: 12 }, (_, i) => i + 1).map(month =>
                  m('option', { value: month, key: month }, this.getMonthName(month))
                )
              ]),
              m('select', {
                class: 'flex-1 px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white',
                value: this.selectedYear,
                onchange: (e) => {
                  this.selectedYear = parseInt(e.target.value)
                  if (this.selectedSubKegiatanId) {
                    this.loadRealisasiData()
                  }
                  m.redraw() // Force immediate redraw to update table
                }
              }, [
                Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i).map(year =>
                  m('option', { value: year, key: year }, year)
                )
              ])
            ])
          ])
        ])
      ]),

      // Realisasi Table
      this.selectedSubKegiatanId && m('div', { class: 'bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden' }, [
        m('div', { class: 'px-6 py-4 border-b border-gray-200' }, [
          m('h3', { class: 'text-lg font-semibold text-gray-800' }, 'Tabel Realisasi'),
          m('p', { class: 'text-sm text-gray-600 mt-1' }, [
            'Periode: ',
            m('span', { class: 'font-medium' }, `${this.getMonthName(this.selectedMonth)} ${this.selectedYear}`)
          ])
        ]),

        this.isLoading ?
          m('div', { class: 'flex justify-center items-center h-32' }, [
            m('div', { class: 'w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin' })
          ]) :

        // Show loading spinner when fetching realisasi data
        this.loadingRealisasi && this.selectedSubKegiatanId ?
          m('div', { class: 'flex justify-center items-center h-32' }, [
            m('div', { class: 'flex items-center space-x-3' }, [
              m('div', { class: 'w-6 h-6 border-4 border-green-500 border-t-transparent rounded-full animate-spin' }),
              m('span', { class: 'text-gray-600' }, 'Memuat data realisasi...')
            ])
          ]) :

          m('div', { class: 'overflow-x-auto' }, [
            m('table', { class: 'min-w-full divide-y divide-gray-200' }, [
              m('thead', { class: 'bg-gray-50' }, [
                m('tr', [
                  m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Kode Rekening'),
                  m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Nama Rekening'),
                  m('th', { class: 'px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Anggaran'),
                  m('th', { class: 'px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Realisasi'),
                  m('th', { class: 'px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Sisa'),
                  m('th', { class: 'px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Aksi')
                ])
              ]),
              m('tbody', { class: 'bg-white divide-y divide-gray-200' },
                this.getAvailableKodeRekening().map(kodeRekening => {
                  const budgetAmount = this.getBudgetAmount(kodeRekening._id)
                  const realizationAmount = this.getRealizationAmount(kodeRekening._id)
                  const remainingAmount = budgetAmount - realizationAmount


                  return m('tr', { class: 'hover:bg-gray-50' }, [
                    m('td', { class: 'px-6 py-4 whitespace-nowrap' }, [
                      m('span', { class: 'font-mono text-sm font-medium text-gray-900' }, kodeRekening.fullCode)
                    ]),
                    m('td', { class: 'px-6 py-4' }, [
                      m('span', { class: 'text-sm text-gray-900' }, kodeRekening.name)
                    ]),
                    m('td', { class: 'px-6 py-4 whitespace-nowrap text-right' }, [
                      m('span', { class: 'text-sm font-semibold text-green-600' }, this.formatCurrency(budgetAmount))
                    ]),
                    m('td', { class: 'px-6 py-4 whitespace-nowrap text-right' }, [
                      m('span', { class: 'text-sm font-semibold text-blue-600' }, this.formatCurrency(realizationAmount))
                    ]),
                    m('td', { class: 'px-6 py-4 whitespace-nowrap text-right' }, [
                      m('span', {
                        class: `text-sm font-semibold ${remainingAmount < 0 ? 'text-red-600' : 'text-gray-600'}`
                      }, this.formatCurrency(remainingAmount))
                    ]),
                    m('td', { class: 'px-6 py-4 whitespace-nowrap text-center' }, [
                      m('div', { class: 'flex justify-center space-x-2' }, [
                        // Show Add or View Details button
                        realizationAmount === 0 ?
                          m('button', {
                            class: 'text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-50',
                            onclick: () => this.openCreateModal(kodeRekening),
                            title: 'Input Realisasi'
                          }, [
                            m('i', { class: 'ri-add-line text-sm' })
                          ]) :
                          m('button', {
                            class: 'text-purple-600 hover:text-purple-900 p-1 rounded-full hover:bg-purple-50',
                            onclick: () => {
                              // Find existing realisasi for viewing details
                              const realisasi = this.realisasiList.find(r => {
                                let realisasiKodeId = r.kodeRekeningId
                                if (typeof realisasiKodeId === 'object' && realisasiKodeId !== null && realisasiKodeId._id) {
                                  realisasiKodeId = realisasiKodeId._id
                                }
                                return realisasiKodeId === kodeRekening._id
                              })
                              if (realisasi) {
                                this.openViewModal(realisasi)
                              }
                            },
                            title: 'Lihat Detail Realisasi'
                          }, [
                            m('i', { class: 'ri-eye-line text-sm' })
                          ]),

                        // Edit button (only show if has realization data)
                        realizationAmount > 0 && m('button', {
                          class: 'text-green-600 hover:text-green-900 p-1 rounded-full hover:bg-green-50',
                          onclick: () => {
                            const realisasi = this.realisasiList.find(r => {
                              let realisasiKodeId = r.kodeRekeningId
                              if (typeof realisasiKodeId === 'object' && realisasiKodeId !== null && realisasiKodeId._id) {
                                realisasiKodeId = realisasiKodeId._id
                              }
                              return realisasiKodeId === kodeRekening._id
                            })
                            if (realisasi) {
                              this.openEditModal(realisasi)
                            }
                          },
                          title: 'Edit Realisasi'
                        }, [
                          m('i', { class: 'ri-edit-line text-sm' })
                        ]),

                        // Delete button (only show if has realization data)
                        realizationAmount > 0 && m('button', {
                          class: 'text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50',
                          onclick: () => {
                            const realisasi = this.realisasiList.find(r => {
                              let realisasiKodeId = r.kodeRekeningId
                              if (typeof realisasiKodeId === 'object' && realisasiKodeId !== null && realisasiKodeId._id) {
                                realisasiKodeId = realisasiKodeId._id
                              }
                              return realisasiKodeId === kodeRekening._id
                            })
                            if (realisasi) {
                              this.deleteRealisasi(realisasi)
                            }
                          },
                          title: 'Hapus Realisasi'
                        }, [
                          m('i', { class: 'ri-delete-bin-line text-sm' })
                        ])
                      ])
                    ])
                  ])
                })
              )
            ])
          ])
      ]),

      // Modal Form
      this.renderForm()
    ])
  },

  renderForm: function() {
    if (!this.showModal) return null

    return m('div', {
      class: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4',
      onclick: (e) => e.target === e.currentTarget && this.closeModal()
    }, [
      m('div', {
        class: 'bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all',
        onclick: (e) => e.stopPropagation()
      }, [
        // Header
        m('div', {
          class: 'bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-xl'
        }, [
          m('div', { class: 'flex items-center justify-between' }, [
            m('div', { class: 'flex items-center space-x-3' }, [
              m('div', {
                class: 'w-8 h-8 bg-blue-600 bg-opacity-25 rounded-full flex items-center justify-center'
              }, [
                m('i', { class: `ri-${this.modalMode === 'edit' ? 'edit' : this.modalMode === 'view' ? 'eye' : 'add'}-line text-xl text-white` })
              ]),
              m('div', [
                m('h3', { class: 'text-xl font-bold' }, [
                  `${this.modalMode === 'edit' ? 'Edit' : this.modalMode === 'view' ? 'Lihat' : 'Input'} Realisasi`
                ]),
                m('p', { class: 'text-white text-opacity-80 text-sm' }, 'Formulir realisasi anggaran')
              ])
            ]),
            m('button', {
              class: 'w-8 h-8 bg-blue-600 bg-opacity-25 rounded-full flex items-center justify-center',
              onclick: () => this.closeModal()
            }, [
              m('i', { class: 'ri-close-fill' })
            ])
          ])
        ]),

        // Form Body
        m('div', { class: 'p-6' }, [
          m('div', { class: 'space-y-6' }, [

            // Kode Rekening (Read-only)
            m('div', [
              m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                m('i', { class: 'ri-hashtag mr-1 text-blue-500' }),
                'Kode Rekening'
              ]),
              m('div', { class: 'relative' }, [
                (() => {
                  // Handle both string and object formats for kodeRekeningId
                  let kodeRekeningId = this.realisasiForm.kodeRekeningId
                  if (typeof kodeRekeningId === 'object' && kodeRekeningId !== null && kodeRekeningId._id) {
                    kodeRekeningId = kodeRekeningId._id
                  }

                  const kodeRekening = this.kodeRekeningList.find(k => k._id === kodeRekeningId)
                  return m('input', {
                    type: 'text',
                    class: 'w-full pl-4 pr-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-700 font-medium',
                    value: kodeRekening ? `${kodeRekening.fullCode} - ${kodeRekening.name}` : 'Tidak ditemukan',
                    disabled: true
                  })
                })(),
                m('div', { class: 'absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm' },
                  this.formatCurrency(this.realisasiForm.budgetAmount || 0)
                )
              ])
            ]),

            // Realization Amount
            m('div', [
              m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                m('i', { class: 'ri-money-dollar-circle-line mr-1 text-green-500' }),
                'Jumlah Realisasi'
              ]),
              m('div', { class: 'relative' }, [
                m('input', {
                  type: 'text',
                  class: `w-full pl-4 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 text-right text-lg ${
                    this.modalMode === 'view'
                      ? 'bg-gray-100 text-gray-600'
                      : 'bg-gray-50 focus:bg-white'
                  }`,
                  placeholder: '0',
                  value: this.formatNumberInput(this.realisasiForm.realizationAmount || 0),
                  oninput: (e) => {
                    if (this.modalMode !== 'view') {
                      this.realisasiForm.realizationAmount = this.parseNumberInput(e.target.value)
                    }
                  },
                  disabled: this.isModalLoading || this.modalMode === 'view',
                  readonly: this.modalMode === 'view'
                }),
                m('div', { class: 'absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm' }, 'Rp')
              ])
            ]),

            // Description
            m('div', [
              m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                m('i', { class: 'ri-file-text-line mr-1 text-purple-500' }),
                'Keterangan'
              ]),
              m('textarea', {
                class: `w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 resize-none ${
                  this.modalMode === 'view'
                    ? 'bg-gray-100 text-gray-600'
                    : 'bg-gray-50 focus:bg-white'
                }`,
                placeholder: 'Keterangan realisasi (opsional)',
                value: this.realisasiForm.description || '',
                oninput: (e) => {
                  if (this.modalMode !== 'view') {
                    this.realisasiForm.description = e.target.value
                  }
                },
                rows: 3,
                disabled: this.isModalLoading || this.modalMode === 'view',
                readonly: this.modalMode === 'view'
              })
            ]),

            // Period (Read-only)
            m('div', [
              m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                m('i', { class: 'ri-calendar-line mr-1 text-orange-500' }),
                'Periode'
              ]),
              m('input', {
                type: 'text',
                class: 'w-full pl-4 pr-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-700 font-medium',
                value: `${this.getMonthName(this.realisasiForm.month || 1)} ${this.realisasiForm.year || new Date().getFullYear()}`,
                disabled: true
              })
            ])
          ])
        ]),

        // Actions
        m('div', {
          class: 'flex justify-end gap-3 pt-6 border-t border-gray-200 bg-gray-50 px-6 py-4 rounded-b-xl'
        }, [
          m('button', {
            class: 'px-6 py-3 bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-gray-400 rounded-lg text-gray-700 font-medium transition-all duration-200 flex items-center space-x-2',
            onclick: () => this.closeModal(),
            disabled: this.isModalLoading
          }, [
            m('i', { class: 'ri-close-fill' }),
            m('span', 'Batal')
          ]),
          // Only show Save button for create/edit modes
          this.modalMode !== 'view' && m('button', {
            class: `px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 ${this.isModalLoading ? 'opacity-50 cursor-not-allowed' : ''}`,
            onclick: () => this.saveRealisasi(),
            disabled: this.isModalLoading
          }, [
            this.isModalLoading ? m('i', { class: 'ri-loader-4-line animate-spin' }) : m('i', { class: 'ri-save-line' }),
            m('span', this.isModalLoading ? 'Menyimpan...' : 'Simpan')
          ])
        ])
      ])
    ])
  }
}

export default Realisasi