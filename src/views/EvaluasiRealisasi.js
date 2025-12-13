import m from 'mithril'
import { UserUtils, APIUtils, ToastUtils, JWTUtils } from '../js/utils.js'

const EvaluasiRealisasi = {
  // State management
  isLoading: false,
  loadingEvaluations: false,

  // Data collections
  subPerangkatDaerahList: [],
  kinerjaList: [],
  anggaranList: [],
  subKegiatanList: [],
  kodeRekeningList: [],
  realisasiList: [],
  evaluasiList: [],

  // Selection state
  selectedSubPerangkatDaerahId: '',
  selectedSubKegiatanId: '',
  selectedBudgetYear: '',
  currentSubKegiatanId: '',

  // Filter and search
  searchQuery: '',
  selectedMonth: new Date().getMonth() + 1,
  selectedYear: new Date().getFullYear(),
  selectedEvaluationStatus: '',

  // Form state
  showModal: false,
  modalMode: 'create', // 'create', 'edit', or 'view'
  isModalLoading: false,

  // Evaluation form data
  evaluasiForm: {
    realisasiId: '',
    kodeRekeningId: '',
    budgetAmount: 0,
    realizationAmount: 0,
    absorptionRate: 0,
    evaluationStatus: '',
    constraints: [],
    problems: [],
    solutions: [],
    recommendations: [],
    speedOfExecution: '',
    fundAbsorptionEfficiency: '',
    procurementCapability: '',
    generalNotes: ''
  },

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
      this.vnode.attrs.setTitle('Evaluasi Realisasi Anggaran')
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

      // Load SubPerangkatDaerah data for unit selection
      const subPerangkatDaerahResponse = await fetch('/api/subperangkatdaerah', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (subPerangkatDaerahResponse.ok) {
        const subPerangkatDaerahResult = await subPerangkatDaerahResponse.json()
        this.subPerangkatDaerahList = subPerangkatDaerahResult.data || []
      }

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
      this.realisasiList = []
      this.evaluasiList = []
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

        // Extract anggaran and subkegiatan data from populated kinerja data
        const anggaranMap = new Map()
        const subKegiatanMap = new Map()

        this.kinerjaList.forEach(k => {
          if (k.anggaranId) {
            anggaranMap.set(k.anggaranId._id.toString(), k.anggaranId)
          }
          if (k.subKegiatanId) {
            subKegiatanMap.set(k.subKegiatanId._id.toString(), k.subKegiatanId)
          }
        })

        this.anggaranList = Array.from(anggaranMap.values())
        this.subKegiatanList = Array.from(subKegiatanMap.values())

        if (this.anggaranList.length > 0) {
          ToastUtils.success(`Data berhasil dimuat: ${this.anggaranList.length} anggaran, ${this.subKegiatanList.length} subkegiatan`)
        } else {
          ToastUtils.warning('Tidak ada data anggaran ditemukan untuk unit kerja ini')
        }
      } else {
        ToastUtils.warning('Tidak ada data kinerja ditemukan untuk unit kerja ini')
      }
    } catch (error) {
      console.error('Error loading kinerja data:', error)
      ToastUtils.error('Gagal memuat data kinerja')
      this.kinerjaList = []
      this.anggaranList = []
      this.subKegiatanList = []
    } finally {
      this.loadingKinerja = false
      m.redraw()
    }
  },

  loadEvaluasiData: async function() {
    if (!this.selectedSubKegiatanId) {
      this.evaluasiList = []
      return
    }

    this.loadingEvaluations = true
    m.redraw()

    try {
      const token = JWTUtils.getToken()
      if (!token) {
        throw new Error('No authentication token found')
      }

      // Load evaluations for selected subkegiatan and period
      const evaluasiResponse = await fetch(`/api/evaluasi-realisasi/subkegiatan/${this.selectedSubKegiatanId}?month=${this.selectedMonth}&year=${this.selectedYear}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (evaluasiResponse.ok) {
        const evaluasiResult = await evaluasiResponse.json()
        this.evaluasiList = evaluasiResult.data || []

        // Also load realisasi data to show budget vs realization comparison
        await this.loadRealisasiData()

        ToastUtils.success(`Data evaluasi berhasil dimuat: ${this.evaluasiList.length} evaluasi`)
      } else {
        console.error('Failed to load evaluasi data, status:', evaluasiResponse.status)
        this.evaluasiList = []
      }
    } catch (error) {
      console.error('Error loading evaluasi data:', error)
      ToastUtils.error('Gagal memuat data evaluasi')
      this.evaluasiList = []
    } finally {
      this.loadingEvaluations = false
      m.redraw()
    }
  },

  loadRealisasiData: async function() {
    if (!this.selectedSubKegiatanId) {
      this.realisasiList = []
      return
    }

    try {
      const token = JWTUtils.getToken()
      if (!token) {
        throw new Error('No authentication token found')
      }

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
      } else {
        this.realisasiList = []
      }
    } catch (error) {
      console.error('Error loading realisasi data:', error)
      this.realisasiList = []
    }
  },

  getEvaluationStatusLabel: function(status) {
    const statusLabels = {
      'excellent': { text: 'Sangat Baik', color: 'green' },
      'good': { text: 'Baik', color: 'blue' },
      'satisfactory': { text: 'Cukup', color: 'yellow' },
      'poor': { text: 'Kurang', color: 'orange' },
      'very_poor': { text: 'Sangat Kurang', color: 'red' }
    }
    return statusLabels[status] || { text: 'Tidak Diketahui', color: 'gray' }
  },

  getEvaluationStatusBadge: function(status) {
    const statusInfo = this.getEvaluationStatusLabel(status)
    return m('span', {
      class: `px-2 py-1 text-xs font-medium rounded-full ${
        status === 'excellent' ? 'bg-green-100 text-green-800' :
        status === 'good' ? 'bg-blue-100 text-blue-800' :
        status === 'satisfactory' ? 'bg-yellow-100 text-yellow-800' :
        status === 'poor' ? 'bg-orange-100 text-orange-800' :
        status === 'very_poor' ? 'bg-red-100 text-red-800' :
        'bg-gray-100 text-gray-800'
      }`
    }, statusInfo.text)
  },

  getPerformanceLabel: function(performance) {
    const performanceLabels = {
      'very_fast': 'Sangat Cepat',
      'fast': 'Cepat',
      'moderate': 'Sedang',
      'slow': 'Lambat',
      'very_slow': 'Sangat Lambat'
    }
    return performanceLabels[performance] || performance
  },

  resetForm: function() {
    this.evaluasiForm = {
      realisasiId: '',
      kodeRekeningId: '',
      budgetAmount: 0,
      realizationAmount: 0,
      absorptionRate: 0,
      evaluationStatus: '',
      constraints: [],
      problems: [],
      solutions: [],
      recommendations: [],
      speedOfExecution: '',
      fundAbsorptionEfficiency: '',
      procurementCapability: '',
      generalNotes: ''
    }
  },

  openCreateModal: function(realisasi) {
    this.modalMode = 'create'
    this.evaluasiForm = {
      realisasiId: realisasi._id,
      kodeRekeningId: realisasi.kodeRekeningId,
      budgetAmount: realisasi.budgetAmount || 0,
      realizationAmount: realisasi.realizationAmount || 0,
      absorptionRate: realisasi.budgetAmount > 0 ? (realisasi.realizationAmount / realisasi.budgetAmount) * 100 : 0,
      evaluationStatus: '',
      constraints: [],
      problems: [],
      solutions: [],
      recommendations: [],
      speedOfExecution: '',
      fundAbsorptionEfficiency: '',
      procurementCapability: '',
      generalNotes: ''
    }
    this.showModal = true
  },

  openEditModal: function(evaluasi) {
    this.modalMode = 'edit'
    this.evaluasiForm = {
      _id: evaluasi._id,
      realisasiId: evaluasi.realisasiId,
      kodeRekeningId: evaluasi.kodeRekeningId,
      budgetAmount: evaluasi.budgetAmount || 0,
      realizationAmount: evaluasi.realizationAmount || 0,
      absorptionRate: evaluasi.absorptionRate || 0,
      evaluationStatus: evaluasi.evaluationStatus || '',
      constraints: evaluasi.constraints || [],
      problems: evaluasi.problems || [],
      solutions: evaluasi.solutions || [],
      recommendations: evaluasi.recommendations || [],
      speedOfExecution: evaluasi.speedOfExecution || '',
      fundAbsorptionEfficiency: evaluasi.fundAbsorptionEfficiency || '',
      procurementCapability: evaluasi.procurementCapability || '',
      generalNotes: evaluasi.generalNotes || ''
    }
    this.showModal = true
  },

  openViewModal: function(evaluasi) {
    this.modalMode = 'view'
    this.evaluasiForm = {
      _id: evaluasi._id,
      realisasiId: evaluasi.realisasiId,
      kodeRekeningId: evaluasi.kodeRekeningId,
      budgetAmount: evaluasi.budgetAmount || 0,
      realizationAmount: evaluasi.realizationAmount || 0,
      absorptionRate: evaluasi.absorptionRate || 0,
      evaluationStatus: evaluasi.evaluationStatus || '',
      constraints: evaluasi.constraints || [],
      problems: evaluasi.problems || [],
      solutions: evaluasi.solutions || [],
      recommendations: evaluasi.recommendations || [],
      speedOfExecution: evaluasi.speedOfExecution || '',
      fundAbsorptionEfficiency: evaluasi.fundAbsorptionEfficiency || '',
      procurementCapability: evaluasi.procurementCapability || '',
      generalNotes: evaluasi.generalNotes || ''
    }
    this.showModal = true
  },

  closeModal: function() {
    this.showModal = false
    this.resetForm()
  },

  saveEvaluasi: async function() {
    if (!this.evaluasiForm.evaluationStatus || !this.evaluasiForm.speedOfExecution ||
        !this.evaluasiForm.fundAbsorptionEfficiency || !this.evaluasiForm.procurementCapability) {
      ToastUtils.warning('Status evaluasi, kecepatan eksekusi, efisiensi absorpsi dana, dan kemampuan pengadaan harus diisi')
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
        ? `/api/evaluasi-realisasi/${this.evaluasiForm._id}`
        : '/api/evaluasi-realisasi'

      const evaluasiData = {
        realisasiId: this.evaluasiForm.realisasiId,
        kodeRekeningId: this.evaluasiForm.kodeRekeningId,
        subKegiatanId: this.selectedSubKegiatanId,
        subPerangkatDaerahId: this.selectedSubPerangkatDaerahId,
        month: this.selectedMonth,
        year: this.selectedYear,
        budgetAmount: this.evaluasiForm.budgetAmount,
        realizationAmount: this.evaluasiForm.realizationAmount,
        evaluationStatus: this.evaluasiForm.evaluationStatus,
        constraints: this.evaluasiForm.constraints.filter(c => c.trim() !== ''),
        problems: this.evaluasiForm.problems.filter(p => p.trim() !== ''),
        solutions: this.evaluasiForm.solutions.filter(s => s.trim() !== ''),
        recommendations: this.evaluasiForm.recommendations.filter(r => r.trim() !== ''),
        speedOfExecution: this.evaluasiForm.speedOfExecution,
        fundAbsorptionEfficiency: this.evaluasiForm.fundAbsorptionEfficiency,
        procurementCapability: this.evaluasiForm.procurementCapability,
        generalNotes: this.evaluasiForm.generalNotes
      }

      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(evaluasiData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      ToastUtils.success(`Evaluasi berhasil di${this.modalMode === 'edit' ? 'perbarui' : 'simpan'}`)
      this.closeModal()
      this.loadEvaluasiData()
    } catch (error) {
      console.error('Error saving evaluasi:', error)
      ToastUtils.error(`Gagal ${this.modalMode === 'edit' ? 'memperbarui' : 'menyimpan'} evaluasi: ` + (error.message || 'Kesalahan tidak diketahui'))
    } finally {
      this.isModalLoading = false
      m.redraw()
    }
  },

  deleteEvaluasi: async function(evaluasi) {
    showConfirmation(
      `Apakah Anda yakin ingin menghapus evaluasi realisasi ini?`,
      async () => {
        try {
          const token = JWTUtils.getToken()
          if (!token) {
            throw new Error('No authentication token found')
          }

          const response = await fetch(`/api/evaluasi-realisasi/${evaluasi._id}`, {
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

          ToastUtils.success('Evaluasi berhasil dihapus')
          this.loadEvaluasiData()
        } catch (error) {
          console.error('Error deleting evaluasi:', error)
          ToastUtils.error('Gagal menghapus evaluasi: ' + (error.message || 'Kesalahan tidak diketahui'))
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
          m('h1', { class: 'text-2xl font-bold text-gray-900' }, 'Evaluasi Realisasi Anggaran'),
          m('p', { class: 'text-gray-600 mt-1' }, 'Evaluasi realisasi anggaran berdasarkan unit kerja dan subkegiatan')
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
                this.loadEvaluasiData()
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
                    this.loadEvaluasiData()
                  }
                  m.redraw()
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
                    this.loadEvaluasiData()
                  }
                  m.redraw()
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

      // Evaluasi Table
      this.selectedSubKegiatanId && m('div', { class: 'bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden' }, [
        m('div', { class: 'px-6 py-4 border-b border-gray-200' }, [
          m('div', { class: 'flex justify-between items-center' }, [
            m('div', [
              m('h3', { class: 'text-lg font-semibold text-gray-800' }, 'Tabel Evaluasi Realisasi'),
              m('p', { class: 'text-sm text-gray-600 mt-1' }, [
                'Periode: ',
                m('span', { class: 'font-medium' }, `${this.getMonthName(this.selectedMonth)} ${this.selectedYear}`)
              ])
            ]),
            m('button', {
              class: 'px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2',
              onclick: () => {
                // Show evaluations that need evaluation (realisasi without evaluation)
                const unevaluatedRealisasi = this.realisasiList.filter(r => {
                  return !this.evaluasiList.some(e => e.realisasiId === r._id)
                })
                if (unevaluatedRealisasi.length > 0) {
                  this.openCreateModal(unevaluatedRealisasi[0])
                } else {
                  ToastUtils.info('Semua realisasi sudah dievaluasi')
                }
              }
            }, [
              m('i', { class: 'ri-add-line' }),
              m('span', 'Tambah Evaluasi')
            ])
          ])
        ]),

        this.isLoading ?
          m('div', { class: 'flex justify-center items-center h-32' }, [
            m('div', { class: 'w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin' })
          ]) :

        // Show loading spinner when fetching evaluasi data
        this.loadingEvaluations && this.selectedSubKegiatanId ?
          m('div', { class: 'flex justify-center items-center h-32' }, [
            m('div', { class: 'flex items-center space-x-3' }, [
              m('div', { class: 'w-6 h-6 border-4 border-green-500 border-t-transparent rounded-full animate-spin' }),
              m('span', { class: 'text-gray-600' }, 'Memuat data evaluasi...')
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
                  m('th', { class: 'px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Absorpsi'),
                  m('th', { class: 'px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Status'),
                  m('th', { class: 'px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Aksi')
                ])
              ]),
              m('tbody', { class: 'bg-white divide-y divide-gray-200' },
                this.evaluasiList.length === 0 ?
                  m('tr', [
                    m('td', { class: 'px-6 py-12 text-center text-gray-500', colspan: '7' }, [
                      m('div', { class: 'flex flex-col items-center space-y-2' }, [
                        m('i', { class: 'ri-inbox-line text-4xl text-gray-300' }),
                        m('p', { class: 'text-sm' }, 'Belum ada evaluasi untuk periode ini'),
                        m('p', { class: 'text-xs text-gray-400' }, 'Pilih realisasi yang akan dievaluasi untuk menambah evaluasi baru')
                      ])
                    ])
                  ]) :

                this.evaluasiList.map(evaluasi => {
                  const budgetAmount = evaluasi.budgetAmount || 0
                  const realizationAmount = evaluasi.realizationAmount || 0
                  const absorptionRate = evaluasi.absorptionRate || 0

                  return m('tr', { class: 'hover:bg-gray-50' }, [
                    m('td', { class: 'px-6 py-4 whitespace-nowrap' }, [
                      m('span', { class: 'font-mono text-sm font-medium text-gray-900' }, evaluasi.kodeRekeningId?.fullCode || 'N/A')
                    ]),
                    m('td', { class: 'px-6 py-4' }, [
                      m('span', { class: 'text-sm text-gray-900' }, evaluasi.kodeRekeningId?.name || 'N/A')
                    ]),
                    m('td', { class: 'px-6 py-4 whitespace-nowrap text-right' }, [
                      m('span', { class: 'text-sm font-semibold text-green-600' }, this.formatCurrency(budgetAmount))
                    ]),
                    m('td', { class: 'px-6 py-4 whitespace-nowrap text-right' }, [
                      m('span', { class: 'text-sm font-semibold text-blue-600' }, this.formatCurrency(realizationAmount))
                    ]),
                    m('td', { class: 'px-6 py-4 whitespace-nowrap text-right' }, [
                      m('div', { class: 'flex flex-col items-end' }, [
                        m('span', {
                          class: `text-sm font-semibold ${absorptionRate < 80 ? 'text-red-600' : absorptionRate < 100 ? 'text-yellow-600' : 'text-green-600'}`
                        }, `${absorptionRate.toFixed(1)}%`),
                        m('div', {
                          class: 'w-16 h-2 bg-gray-200 rounded-full mt-1'
                        }, [
                          m('div', {
                            class: `h-full rounded-full transition-all duration-300 ${
                              absorptionRate < 80 ? 'bg-red-500' :
                              absorptionRate < 100 ? 'bg-yellow-500' : 'bg-green-500'
                            }`,
                            style: { width: `${Math.min(100, absorptionRate)}%` }
                          })
                        ])
                      ])
                    ]),
                    m('td', { class: 'px-6 py-4 whitespace-nowrap text-center' }, [
                      this.getEvaluationStatusBadge(evaluasi.evaluationStatus)
                    ]),
                    m('td', { class: 'px-6 py-4 whitespace-nowrap text-center' }, [
                      m('div', { class: 'flex justify-center space-x-2' }, [
                        m('button', {
                          class: 'text-purple-600 hover:text-purple-900 p-1 rounded-full hover:bg-purple-50',
                          onclick: () => this.openViewModal(evaluasi),
                          title: 'Lihat Detail Evaluasi'
                        }, [
                          m('i', { class: 'ri-eye-line text-sm' })
                        ]),

                        m('button', {
                          class: 'text-green-600 hover:text-green-900 p-1 rounded-full hover:bg-green-50',
                          onclick: () => this.openEditModal(evaluasi),
                          title: 'Edit Evaluasi'
                        }, [
                          m('i', { class: 'ri-edit-line text-sm' })
                        ]),

                        m('button', {
                          class: 'text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50',
                          onclick: () => this.deleteEvaluasi(evaluasi),
                          title: 'Hapus Evaluasi'
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
        class: 'bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-screen overflow-y-auto',
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
                  `${this.modalMode === 'edit' ? 'Edit' : this.modalMode === 'view' ? 'Lihat' : 'Input'} Evaluasi Realisasi`
                ]),
                m('p', { class: 'text-white text-opacity-80 text-sm' }, 'Formulir evaluasi realisasi anggaran')
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
          m('div', { class: 'grid grid-cols-1 lg:grid-cols-2 gap-6' }, [

            // Left Column - Basic Information
            m('div', { class: 'space-y-6' }, [
              m('h4', { class: 'text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2' }, 'Informasi Dasar'),

              // Kode Rekening (Read-only)
              m('div', [
                m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                  m('i', { class: 'ri-hashtag mr-1 text-blue-500' }),
                  'Kode Rekening'
                ]),
                m('div', { class: 'relative' }, [
                  (() => {
                    let kodeRekeningId = this.evaluasiForm.kodeRekeningId
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
                    this.formatCurrency(this.evaluasiForm.budgetAmount || 0)
                  )
                ])
              ]),

              // Budget and Realization
              m('div', { class: 'grid grid-cols-2 gap-4' }, [
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, 'Anggaran'),
                  m('input', {
                    type: 'text',
                    class: 'w-full pl-4 pr-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-100 text-gray-700 font-medium text-right',
                    value: this.formatCurrency(this.evaluasiForm.budgetAmount || 0),
                    disabled: true
                  })
                ]),
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, 'Realisasi'),
                  m('input', {
                    type: 'text',
                    class: 'w-full pl-4 pr-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-100 text-gray-700 font-medium text-right',
                    value: this.formatCurrency(this.evaluasiForm.realizationAmount || 0),
                    disabled: true
                  })
                ])
              ]),

              // Absorption Rate
              m('div', [
                m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, 'Tingkat Absorpsi Dana'),
                m('div', { class: 'relative' }, [
                  m('input', {
                    type: 'text',
                    class: 'w-full pl-4 pr-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-100 text-gray-700 font-medium text-right',
                    value: `${(this.evaluasiForm.absorptionRate || 0).toFixed(1)}%`,
                    disabled: true
                  }),
                  m('div', {
                    class: 'absolute right-3 top-1/2 transform -translate-y-1/2 w-16 h-2 bg-gray-200 rounded-full'
                  }, [
                    m('div', {
                      class: `h-full rounded-full transition-all duration-300 ${
                        (this.evaluasiForm.absorptionRate || 0) < 80 ? 'bg-red-500' :
                        (this.evaluasiForm.absorptionRate || 0) < 100 ? 'bg-yellow-500' : 'bg-green-500'
                      }`,
                      style: { width: `${Math.min(100, this.evaluasiForm.absorptionRate || 0)}%` }
                    })
                  ])
                ])
              ]),

              // Evaluation Status
              m('div', [
                m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                  m('i', { class: 'ri-star-line mr-1 text-yellow-500' }),
                  'Status Evaluasi'
                ]),
                m('select', {
                  class: `w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 ${
                    this.modalMode === 'view'
                      ? 'bg-gray-100 text-gray-600'
                      : 'bg-gray-50 focus:bg-white'
                  }`,
                  value: this.evaluasiForm.evaluationStatus || '',
                  onchange: (e) => {
                    if (this.modalMode !== 'view') {
                      this.evaluasiForm.evaluationStatus = e.target.value
                    }
                  },
                  disabled: this.isModalLoading || this.modalMode === 'view'
                }, [
                  m('option', { value: '' }, 'Pilih Status Evaluasi'),
                  m('option', { value: 'excellent' }, 'Sangat Baik'),
                  m('option', { value: 'good' }, 'Baik'),
                  m('option', { value: 'satisfactory' }, 'Cukup'),
                  m('option', { value: 'poor' }, 'Kurang'),
                  m('option', { value: 'very_poor' }, 'Sangat Kurang')
                ])
              ])
            ]),

            // Right Column - Performance Indicators
            m('div', { class: 'space-y-6' }, [
              m('h4', { class: 'text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2' }, 'Indikator Kinerja'),

              // Speed of Execution
              m('div', [
                m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                  m('i', { class: 'ri-time-line mr-1 text-blue-500' }),
                  'Kecepatan Eksekusi'
                ]),
                m('select', {
                  class: `w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 ${
                    this.modalMode === 'view'
                      ? 'bg-gray-100 text-gray-600'
                      : 'bg-gray-50 focus:bg-white'
                  }`,
                  value: this.evaluasiForm.speedOfExecution || '',
                  onchange: (e) => {
                    if (this.modalMode !== 'view') {
                      this.evaluasiForm.speedOfExecution = e.target.value
                    }
                  },
                  disabled: this.isModalLoading || this.modalMode === 'view'
                }, [
                  m('option', { value: '' }, 'Pilih Kecepatan Eksekusi'),
                  m('option', { value: 'very_fast' }, 'Sangat Cepat'),
                  m('option', { value: 'fast' }, 'Cepat'),
                  m('option', { value: 'moderate' }, 'Sedang'),
                  m('option', { value: 'slow' }, 'Lambat'),
                  m('option', { value: 'very_slow' }, 'Sangat Lambat')
                ])
              ]),

              // Fund Absorption Efficiency
              m('div', [
                m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                  m('i', { class: 'ri-money-dollar-circle-line mr-1 text-green-500' }),
                  'Efisiensi Absorpsi Dana'
                ]),
                m('select', {
                  class: `w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 ${
                    this.modalMode === 'view'
                      ? 'bg-gray-100 text-gray-600'
                      : 'bg-gray-50 focus:bg-white'
                  }`,
                  value: this.evaluasiForm.fundAbsorptionEfficiency || '',
                  onchange: (e) => {
                    if (this.modalMode !== 'view') {
                      this.evaluasiForm.fundAbsorptionEfficiency = e.target.value
                    }
                  },
                  disabled: this.isModalLoading || this.modalMode === 'view'
                }, [
                  m('option', { value: '' }, 'Pilih Efisiensi Absorpsi'),
                  m('option', { value: 'excellent' }, 'Sangat Efisien'),
                  m('option', { value: 'good' }, 'Efisien'),
                  m('option', { value: 'fair' }, 'Cukup Efisien'),
                  m('option', { value: 'poor' }, 'Kurang Efisien')
                ])
              ]),

              // Procurement Capability
              m('div', [
                m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                  m('i', { class: 'ri-shopping-cart-line mr-1 text-purple-500' }),
                  'Kemampuan Pengadaan'
                ]),
                m('select', {
                  class: `w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 ${
                    this.modalMode === 'view'
                      ? 'bg-gray-100 text-gray-600'
                      : 'bg-gray-50 focus:bg-white'
                  }`,
                  value: this.evaluasiForm.procurementCapability || '',
                  onchange: (e) => {
                    if (this.modalMode !== 'view') {
                      this.evaluasiForm.procurementCapability = e.target.value
                    }
                  },
                  disabled: this.isModalLoading || this.modalMode === 'view'
                }, [
                  m('option', { value: '' }, 'Pilih Kemampuan Pengadaan'),
                  m('option', { value: 'excellent' }, 'Sangat Baik'),
                  m('option', { value: 'good' }, 'Baik'),
                  m('option', { value: 'needs_improvement' }, 'Perlu Peningkatan'),
                  m('option', { value: 'poor' }, 'Kurang')
                ])
              ])
            ])
          ]),

          // Full Width - Analysis Sections
          m('div', { class: 'col-span-1 lg:col-span-2 space-y-6' }, [
            m('h4', { class: 'text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2' }, 'Analisis dan Rekomendasi'),

            // Kendala (Constraints/Challenges)
            m('div', [
              m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                m('i', { class: 'ri-road-map-line mr-1 text-red-500' }),
                'Kendala yang Dihadapi (Non Teknis/Administratif)'
              ]),
              m('div', { class: 'space-y-2' }, [
                (this.evaluasiForm.constraints || []).map((constraint, index) =>
                  m('div', { class: 'flex items-center space-x-2' }, [
                    m('input', {
                      type: 'text',
                      class: `flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-500 ${
                        this.modalMode === 'view'
                          ? 'bg-gray-100 text-gray-600'
                          : 'bg-gray-50 focus:bg-white'
                      }`,
                      value: constraint,
                      placeholder: 'Masukkan kendala...',
                      oninput: (e) => {
                        if (this.modalMode !== 'view') {
                          this.evaluasiForm.constraints[index] = e.target.value
                        }
                      },
                      disabled: this.isModalLoading || this.modalMode === 'view'
                    }),
                    this.modalMode !== 'view' && m('button', {
                      class: 'p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg',
                      onclick: () => {
                        if (this.modalMode !== 'view') {
                          this.evaluasiForm.constraints.splice(index, 1)
                          m.redraw()
                        }
                      }
                    }, [
                      m('i', { class: 'ri-delete-bin-line' })
                    ])
                  ])
                ),
                this.modalMode !== 'view' && m('button', {
                  class: 'w-full px-4 py-2 border-2 border-dashed border-gray-300 text-gray-600 hover:text-gray-800 hover:border-gray-400 rounded-lg transition-colors flex items-center justify-center space-x-2',
                  onclick: () => {
                    if (this.modalMode !== 'view') {
                      if (!this.evaluasiForm.constraints) this.evaluasiForm.constraints = []
                      this.evaluasiForm.constraints.push('')
                      m.redraw()
                    }
                  }
                }, [
                  m('i', { class: 'ri-add-line' }),
                  m('span', 'Tambah Kendala')
                ])
              ])
            ]),

            // Problems and Solutions Grid
            m('div', { class: 'grid grid-cols-1 lg:grid-cols-2 gap-6' }, [

              // Masalah (Problems)
              m('div', [
                m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                  m('i', { class: 'ri-error-warning-line mr-1 text-orange-500' }),
                  'Masalah yang Ditemukan'
                ]),
                m('div', { class: 'space-y-2' }, [
                  (this.evaluasiForm.problems || []).map((problem, index) =>
                    m('div', { class: 'flex items-center space-x-2' }, [
                      m('input', {
                        type: 'text',
                        class: `flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-500 ${
                          this.modalMode === 'view'
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-gray-50 focus:bg-white'
                        }`,
                        value: problem,
                        placeholder: 'Masukkan masalah...',
                        oninput: (e) => {
                          if (this.modalMode !== 'view') {
                            this.evaluasiForm.problems[index] = e.target.value
                          }
                        },
                        disabled: this.isModalLoading || this.modalMode === 'view'
                      }),
                      this.modalMode !== 'view' && m('button', {
                        class: 'p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg',
                        onclick: () => {
                          if (this.modalMode !== 'view') {
                            this.evaluasiForm.problems.splice(index, 1)
                            m.redraw()
                          }
                        }
                      }, [
                        m('i', { class: 'ri-delete-bin-line' })
                      ])
                    ])
                  ),
                  this.modalMode !== 'view' && m('button', {
                    class: 'w-full px-4 py-2 border-2 border-dashed border-gray-300 text-gray-600 hover:text-gray-800 hover:border-gray-400 rounded-lg transition-colors flex items-center justify-center space-x-2',
                    onclick: () => {
                      if (this.modalMode !== 'view') {
                        if (!this.evaluasiForm.problems) this.evaluasiForm.problems = []
                        this.evaluasiForm.problems.push('')
                        m.redraw()
                      }
                    }
                  }, [
                    m('i', { class: 'ri-add-line' }),
                    m('span', 'Tambah Masalah')
                  ])
                ])
              ]),

              // Solutions
              m('div', [
                m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                  m('i', { class: 'ri-lightbulb-line mr-1 text-green-500' }),
                  'Solusi yang Diterapkan'
                ]),
                m('div', { class: 'space-y-2' }, [
                  (this.evaluasiForm.solutions || []).map((solution, index) =>
                    m('div', { class: 'flex items-center space-x-2' }, [
                      m('input', {
                        type: 'text',
                        class: `flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-500 ${
                          this.modalMode === 'view'
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-gray-50 focus:bg-white'
                        }`,
                        value: solution,
                        placeholder: 'Masukkan solusi...',
                        oninput: (e) => {
                          if (this.modalMode !== 'view') {
                            this.evaluasiForm.solutions[index] = e.target.value
                          }
                        },
                        disabled: this.isModalLoading || this.modalMode === 'view'
                      }),
                      this.modalMode !== 'view' && m('button', {
                        class: 'p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg',
                        onclick: () => {
                          if (this.modalMode !== 'view') {
                            this.evaluasiForm.solutions.splice(index, 1)
                            m.redraw()
                          }
                        }
                      }, [
                        m('i', { class: 'ri-delete-bin-line' })
                      ])
                    ])
                  ),
                  this.modalMode !== 'view' && m('button', {
                    class: 'w-full px-4 py-2 border-2 border-dashed border-gray-300 text-gray-600 hover:text-gray-800 hover:border-gray-400 rounded-lg transition-colors flex items-center justify-center space-x-2',
                    onclick: () => {
                      if (this.modalMode !== 'view') {
                        if (!this.evaluasiForm.solutions) this.evaluasiForm.solutions = []
                        this.evaluasiForm.solutions.push('')
                        m.redraw()
                      }
                    }
                  }, [
                    m('i', { class: 'ri-add-line' }),
                    m('span', 'Tambah Solusi')
                  ])
                ])
              ])
            ]),

            // Recommendations
            m('div', [
              m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                m('i', { class: 'ri-feedback-line mr-1 text-blue-500' }),
                'Rekomendasi untuk Perbaikan'
              ]),
              m('div', { class: 'space-y-2' }, [
                (this.evaluasiForm.recommendations || []).map((recommendation, index) =>
                  m('div', { class: 'flex items-center space-x-2' }, [
                    m('input', {
                      type: 'text',
                      class: `flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 ${
                        this.modalMode === 'view'
                          ? 'bg-gray-100 text-gray-600'
                          : 'bg-gray-50 focus:bg-white'
                      }`,
                      value: recommendation,
                      placeholder: 'Masukkan rekomendasi...',
                      oninput: (e) => {
                        if (this.modalMode !== 'view') {
                          this.evaluasiForm.recommendations[index] = e.target.value
                        }
                      },
                      disabled: this.isModalLoading || this.modalMode === 'view'
                    }),
                    this.modalMode !== 'view' && m('button', {
                      class: 'p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg',
                      onclick: () => {
                        if (this.modalMode !== 'view') {
                          this.evaluasiForm.recommendations.splice(index, 1)
                          m.redraw()
                        }
                      }
                    }, [
                      m('i', { class: 'ri-delete-bin-line' })
                    ])
                  ])
                ),
                this.modalMode !== 'view' && m('button', {
                  class: 'w-full px-4 py-2 border-2 border-dashed border-gray-300 text-gray-600 hover:text-gray-800 hover:border-gray-400 rounded-lg transition-colors flex items-center justify-center space-x-2',
                  onclick: () => {
                    if (this.modalMode !== 'view') {
                      if (!this.evaluasiForm.recommendations) this.evaluasiForm.recommendations = []
                      this.evaluasiForm.recommendations.push('')
                      m.redraw()
                    }
                  }
                }, [
                  m('i', { class: 'ri-add-line' }),
                  m('span', 'Tambah Rekomendasi')
                ])
              ])
            ]),

            // General Notes
            m('div', [
              m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                m('i', { class: 'ri-file-text-line mr-1 text-gray-500' }),
                'Catatan Tambahan'
              ]),
              m('textarea', {
                class: `w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200 transition-all duration-200 resize-none ${
                  this.modalMode === 'view'
                    ? 'bg-gray-100 text-gray-600'
                    : 'bg-gray-50 focus:bg-white'
                }`,
                placeholder: 'Catatan tambahan mengenai evaluasi...',
                value: this.evaluasiForm.generalNotes || '',
                oninput: (e) => {
                  if (this.modalMode !== 'view') {
                    this.evaluasiForm.generalNotes = e.target.value
                  }
                },
                rows: 4,
                disabled: this.isModalLoading || this.modalMode === 'view'
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
            onclick: () => this.saveEvaluasi(),
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

export default EvaluasiRealisasi