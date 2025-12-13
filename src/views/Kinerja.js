import m from 'mithril'
import { UserUtils, JWTUtils, APIUtils, ToastUtils } from '../js/utils.js'

const Kinerja = {
  // State management
  isLoading: false,
  kinerjaList: [],
  filteredKinerja: [],

  // Selection states
  selectedSubPerangkatDaerah: null,
  selectedAnggaran: null,
  availableAnggaran: [],
  availableSubKegiatan: [],

  // Modal states
  showModal: false,
  modalMode: 'create',
  isModalLoading: false,

  // Form data
  formData: {
    subPerangkatDaerahId: '',
    anggaranId: '',
    budgetYear: '',
    targetValue: '',
    targetDate: '',
    description: '',
    priority: 'medium'
  },

  // Filter and search
  searchQuery: '',
  selectedStatus: 'all',
  selectedPriority: 'all',

  // Pagination
  currentPage: 1,
  itemsPerPage: 10,

  // Helper functions
  formatDate: function(dateString) {
    if (!dateString) return '-'
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(new Date(dateString))
  },

  formatPercentage: function(value) {
    return new Intl.NumberFormat('id-ID', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format((value || 0) / 100)
  },

  getStatusBadgeClass: function(status) {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'planning': return 'bg-gray-100 text-gray-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  },

  getStatusText: function(status) {
    switch (status) {
      case 'completed': return 'Selesai'
      case 'in_progress': return 'Dalam Proses'
      case 'planning': return 'Perencanaan'
      case 'cancelled': return 'Dibatalkan'
      default: return status
    }
  },

  getPriorityBadgeClass: function(priority) {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  },

  getPriorityText: function(priority) {
    switch (priority) {
      case 'critical': return 'Kritis'
      case 'high': return 'Tinggi'
      case 'medium': return 'Sedang'
      case 'low': return 'Rendah'
      default: return priority
    }
  },

  // Load sub perangkat daerah (using APIUtils as mandated)
  loadSubPerangkatDaerah: async function() {
    try {
      const result = await APIUtils.getAll('subperangkatdaerah')
      this.availableSubPerangkatDaerah = result.data || []
    } catch (error) {
      console.error('Error loading sub perangkat daerah:', error)
      // APIUtils already handles user-facing toasts
      this.availableSubPerangkatDaerah = []
    }
  },

  // Load anggaran for selected unit (currently not filtered by unit; uses APIUtils)
  loadAnggaranForSubPerangkatDaerah: async function(subPerangkatDaerahId) {
    if (!subPerangkatDaerahId) {
      this.availableAnggaran = []
      this.selectedAnggaran = null
      return
    }

    try {
      const result = await APIUtils.getAll('anggaran')
      this.availableAnggaran = result.data || []
      console.log('Loaded anggaran:', this.availableAnggaran.length, 'items')
    } catch (error) {
      console.error('Error loading anggaran:', error)
      // APIUtils handles toasts; keep local state safe
      this.availableAnggaran = []
    }
  },

  // Load sub kegiatan for selected anggaran (auto-populate from anggaran data)
  // Build fullCode using the SAME hierarchy logic as loadKinerja (lines 371-397)
  loadSubKegiatanForAnggaran: function(anggaranId) {
    if (!anggaranId) {
      this.selectedSubKegiatan = null
      return
    }

    const selectedAnggaran = (this.availableAnggaran || []).find(ang => ang._id === anggaranId)
    if (!selectedAnggaran || !selectedAnggaran.subKegiatanId) {
      this.selectedSubKegiatan = null
      return
    }

    const sk = selectedAnggaran.subKegiatanId
    const subKeg =
      typeof sk === 'object'
        ? sk
        : { _id: sk }

    const kegiatanId =
      (subKeg.kegiatanId && (subKeg.kegiatanId._id || subKeg.kegiatanId.$oid || subKeg.kegiatanId)) ||
      subKeg.kegiatanId

    // We reuse the same datasets that loadKinerja uses when building fullCode
    // (urusanData, bidangData, programData, kegiatanData)
    // If they weren't cached on `this`, fallback to empty arrays (then fullCode may be empty)
    const urusanData = this._urusanDataForKinerja || []
    const bidangData = this._bidangDataForKinerja || []
    const programData = this._programDataForKinerja || []
    const kegiatanData = this._kegiatanDataForKinerja || []

    const kegiatan = kegiatanData.find(k =>
      k._id === kegiatanId ||
      k._id?.$oid === kegiatanId ||
      k._id?.toString() === kegiatanId
    )

    const programId =
      kegiatan &&
      ((kegiatan.programId && (kegiatan.programId._id || kegiatan.programId.$oid || kegiatan.programId)) ||
       kegiatan.programId)

    const program = programData.find(p =>
      p._id === programId ||
      p._id?.$oid === programId ||
      p._id?.toString() === programId
    )

    const bidangId =
      program &&
      ((program.bidangId && (program.bidangId._id || program.bidangId.$oid || program.bidangId)) ||
       program.bidangId)

    const bidang = bidangData.find(b =>
      b._id === bidangId ||
      b._id?.$oid === bidangId ||
      b._id?.toString() === bidangId
    )

    const urusanId =
      bidang &&
      ((bidang.urusanId && (bidang.urusanId._id || bidang.urusanId.$oid || bidang.urusanId)) ||
       bidang.urusanId)

    const urusan = urusanData.find(u =>
      u._id === urusanId ||
      u._id?.$oid === urusanId ||
      u._id?.toString() === urusanId
    )

    // Build fullCode exactly as in loadKinerja (lines 377-384)
    const fullCode = [
      urusan?.kode,
      bidang?.kode,
      program?.kode,
      kegiatan?.kode,
      subKeg.kode
    ].filter(kode => kode).join('.')

    if (!fullCode) {
      console.error('Failed to build fullCode for SubKegiatan from anggaran linkage', {
        subKeg,
        kegiatan,
        program,
        bidang,
        urusan
      })
      this.selectedSubKegiatan = null
      return
    }

    this.selectedSubKegiatan = {
      ...subKeg,
      fullCode,
      // normalize id/name for safety
      _id: subKeg._id || subKeg.$oid,
      nama: subKeg.nama
    }

    this.formData.subKegiatanId = this.selectedSubKegiatan._id
    this.formData.anggaranId = anggaranId

    m.redraw()
  },

  // Load kinerja data with hierarchical data for fullCode (APIUtils-compliant)
  loadKinerja: async function(subPerangkatDaerahId, budgetYear) {
    if (!UserUtils.isAuthenticated()) {
      ToastUtils.warning('Silakan masuk terlebih dahulu')
      m.route.set('/login')
      return
    }

    this.isLoading = true
    m.redraw()

    try {
      // Build query parameters
      const params = {}
      if (subPerangkatDaerahId) params.subPerangkatDaerahId = subPerangkatDaerahId
      if (budgetYear) params.budgetYear = budgetYear

      const query = new URLSearchParams(params).toString()
      const url = `/api/kinerja${query ? `?${query}` : ''}`
      console.log('Loading kinerja with URL:', url)

      // Centralized request (injects token, handles 401/500, toasts)
      const result = await APIUtils.request(url)
      this.kinerjaList = result.data || []

      // Load hierarchy datasets (all via APIUtils)
      let urusanData = []
      let bidangData = []
      let programData = []
      let kegiatanData = []

      try {
        const res = await APIUtils.getAll('urusan')
        urusanData = res.data || []
      } catch (err) {
        console.warn('Failed to load urusan data:', err)
      }

      try {
        const res = await APIUtils.getAll('bidang')
        bidangData = res.data || []
      } catch (err) {
        console.warn('Failed to load bidang data:', err)
      }

      try {
        const res = await APIUtils.getAll('program')
        programData = res.data || []
      } catch (err) {
        console.warn('Failed to load program data:', err)
      }

      try {
        const res = await APIUtils.getAll('kegiatan')
        kegiatanData = res.data || []
      } catch (err) {
        console.warn('Failed to load kegiatan data:', err)
      }

      // Build fullCode for each subkegiatan in the kinerja data
      this.kinerjaList = this.kinerjaList.map(kinerja => {
        if (kinerja.subKegiatanId && kinerja.subKegiatanId.kode) {
          const kegiatan = kegiatanData.find(k =>
            k._id === (kinerja.subKegiatanId.kegiatanId?.$oid || kinerja.subKegiatanId.kegiatanId)
          )
          const program = programData.find(p =>
            p._id === (kegiatan?.programId?.$oid || kegiatan?.programId)
          )
          const bidang = bidangData.find(b =>
            b._id === (program?.bidangId?.$oid || program?.bidangId)
          )
          const urusan = urusanData.find(u =>
            u._id === (bidang?.urusanId?.$oid || bidang?.urusanId)
          )

          const fullCode = [
            urusan?.kode,
            bidang?.kode,
            program?.kode,
            kegiatan?.kode,
            kinerja.subKegiatanId.kode
          ].filter(Boolean).join('.')

          kinerja.subKegiatanId = {
            ...kinerja.subKegiatanId,
            fullCode,
            urusanKode: urusan?.kode || '',
            bidangKode: bidang?.kode || '',
            programKode: program?.kode || '',
            kegiatanKode: kegiatan?.kode || ''
          }
        }
        return kinerja
      })

      // Cache hierarchy for reuse in loadSubKegiatanForAnggaran
      this._urusanDataForKinerja = urusanData
      this._bidangDataForKinerja = bidangData
      this._programDataForKinerja = programData
      this._kegiatanDataForKinerja = kegiatanData

      this.applyFilters()
      console.log('Loaded kinerja data:', this.kinerjaList.length, 'items')
      if (this.kinerjaList.length === 0 && subPerangkatDaerahId && budgetYear) {
        ToastUtils.warning('Tidak ada data kinerja untuk unit dan tahun yang dipilih')
      }
    } catch (error) {
      console.error('Error loading kinerja:', error)
      // APIUtils already surfaced any major error; keep state consistent
      this.kinerjaList = []
      this.filteredKinerja = []
    } finally {
      this.isLoading = false
      m.redraw()
    }
  },

  // Apply filters
  applyFilters: function() {
    let filtered = [...this.kinerjaList]

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase()
      filtered = filtered.filter(item =>
        (item.subKegiatanId?.nama || item.subKegiatanId)?.toLowerCase().includes(query) ||
        (item.subKegiatanId?.fullCode || item.subKegiatanId?.kode || '').toLowerCase().includes(query) ||
        (item.subPerangkatDaerahId?.nama || '').toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      )
    }

    if (this.selectedStatus !== 'all') {
      filtered = filtered.filter(item => item.status === this.selectedStatus)
    }

    if (this.selectedPriority !== 'all') {
      filtered = filtered.filter(item => item.priority === this.selectedPriority)
    }

    this.filteredKinerja = filtered
    this.currentPage = 1
  },

  // Reset form
  resetForm: function() {
    this.formData = {
      subPerangkatDaerahId: this.selectedSubPerangkatDaerah?._id || '',
      anggaranId: '',
      budgetYear: this.userData?.budgetYear || '',
      targetValue: '',
      targetDate: '',
      description: '',
      priority: 'medium'
    }
  },

  // Get list of Anggaran that do NOT yet have a Kinerja for current unit (unassigned targets)
  getAvailableAnggaranOptions: function() {
    if (!this.selectedSubPerangkatDaerah || !Array.isArray(this.availableAnggaran)) {
      return this.availableAnggaran || []
    }

    const unitId = this.selectedSubPerangkatDaerah._id
    const budgetYear = this.userData?.budgetYear

    // Build a Set of anggaranId that already have kinerja for this unit + year
    const usedAnggaranIds = new Set(
      (this.kinerjaList || [])
        .filter(k =>
          (k.subPerangkatDaerahId === unitId ||
           k.subPerangkatDaerahId?._id === unitId) &&
          (!budgetYear || !k.budgetYear || k.budgetYear === budgetYear)
        )
        .map(k => (typeof k.anggaranId === 'object' ? k.anggaranId?._id : k.anggaranId))
        .filter(Boolean)
    )

    // Return only anggaran that are not yet used in kinerja for this unit/year
    return this.availableAnggaran.filter(ang => !usedAnggaranIds.has(ang._id))
  },

  // Open create modal
  openCreateModal: function() {
    if (!this.selectedSubPerangkatDaerah) {
      toast.warning('Pilih unit kerja terlebih dahulu')
      return
    }

    this.modalMode = 'create'
    this.resetForm()
    // Auto-load SubKegiatan if anggaran is already selected
    if (this.selectedAnggaran) {
      this.loadSubKegiatanForAnggaran(this.selectedAnggaran._id)
    }
    this.showModal = true
  },

  // Open edit modal
  openEditModal: async function(kinerja) {
    this.modalMode = 'edit'

    if (kinerja.anggaranId && !this.selectedSubKegiatan) {
      this.loadSubKegiatanForAnggaran(kinerja.anggaranId)
    }

    // Helper function to format date for date input (YYYY-MM-DD)
    const formatDateForInput = function(dateString) {
      if (!dateString) return ''
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return ''
      return date.toISOString().split('T')[0] // Returns YYYY-MM-DD format
    }

    this.formData = {
      _id: kinerja._id,
      subPerangkatDaerahId: kinerja.subPerangkatDaerahId?._id || kinerja.subPerangkatDaerahId,
      anggaranId: kinerja.anggaranId?._id || kinerja.anggaranId,
      budgetYear: kinerja.budgetYear,
      targetValue: kinerja.targetValue,
      targetDate: formatDateForInput(kinerja.targetDate),
      description: kinerja.description || '',
      priority: kinerja.priority || 'medium'
    }

    // Set selections for UI
    this.selectedSubPerangkatDaerah = this.availableSubPerangkatDaerah.find(
      org => org._id === kinerja.subPerangkatDaerahId?._id || org._id === kinerja.subPerangkatDaerahId
    )
    this.selectedAnggaran = this.availableAnggaran.find(
      ang => ang._id === kinerja.anggaranId?._id || ang._id === kinerja.anggaranId
    )

    this.showModal = true
  },

  // Close modal
  closeModal: function() {
    this.showModal = false
    this.resetForm()
  },

  // Save item (APIUtils-compliant)
  saveItem: async function() {
    // Basic validation
    if (!this.formData.targetValue || !this.formData.targetDate) {
      ToastUtils.warning('Target nilai dan tanggal target harus diisi')
      return
    }

    const targetDate = new Date(this.formData.targetDate)
    if (isNaN(targetDate.getTime())) {
      ToastUtils.warning('Format tanggal target tidak valid')
      return
    }

    if (this.modalMode === 'create') {
      if (!this.formData.subPerangkatDaerahId) {
        ToastUtils.warning('Pilih unit kerja')
        return
      }
      if (!this.formData.anggaranId) {
        ToastUtils.warning('Pilih anggaran untuk menentukan SubKegiatan')
        return
      }
      if (!this.formData.subKegiatanId) {
        ToastUtils.warning('Pilih SubKegiatan')
        return
      }
    }

    this.isModalLoading = true
    m.redraw()

    try {
      if (this.modalMode === 'edit') {
        await APIUtils.update('kinerja', this.formData._id, {
          targetValue: this.formData.targetValue,
          targetDate: targetDate.toISOString(),
          description: this.formData.description,
          priority: this.formData.priority
        })
      } else {
        await APIUtils.create('kinerja', {
          subKegiatanId: this.formData.subKegiatanId,
          subPerangkatDaerahId: this.formData.subPerangkatDaerahId,
          anggaranId: this.formData.anggaranId,
          budgetYear: this.formData.budgetYear,
          targetValue: this.formData.targetValue,
          targetDate: targetDate.toISOString(),
          description: this.formData.description,
          priority: this.formData.priority
        })
      }

      this.closeModal()
      // Reload with current unit context
      this.loadKinerja(this.selectedSubPerangkatDaerah?._id || this.formData.subPerangkatDaerahId, this.userData?.budgetYear)
    } catch (error) {
      console.error('Error saving kinerja:', error)
      // APIUtils already shows error toasts
    } finally {
      this.isModalLoading = false
      m.redraw()
    }
  },

  // Delete item (APIUtils.delete-compliant)
  deleteItem: async function(kinerja) {
    try {
      await APIUtils.delete('kinerja', kinerja._id, kinerja.subKegiatanId?.nama || 'kinerja')
      // Reload with current unit context
      this.loadKinerja(this.selectedSubPerangkatDaerah?._id, this.userData?.budgetYear)
    } catch (error) {
      console.error('Error deleting kinerja:', error)
      // APIUtils.delete already handles confirmation & toasts
    }
  },

  // Pagination helpers
  getTotalPages: function() {
    return Math.ceil(this.filteredKinerja.length / this.itemsPerPage)
  },

  getPaginatedKinerja: function() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage
    const endIndex = startIndex + this.itemsPerPage
    return this.filteredKinerja.slice(startIndex, endIndex)
  },

  changePage: function(page) {
    if (page >= 1 && page <= this.getTotalPages()) {
      this.currentPage = page
      m.redraw()
    }
  },

  // Initialize component
  oninit: function() {
    if (!UserUtils.isAuthenticated()) {
      toast.warning('Silakan masuk terlebih dahulu')
      m.route.set('/login')
      return
    }

    if (this.vnode && this.vnode.attrs && this.vnode.attrs.setTitle) {
      this.vnode.attrs.setTitle('Manajemen Kinerja')
    }

    this.userData = UserUtils.getUserData()

    if (this.userData.budgetYear && typeof this.userData.budgetYear === 'object') {
      this.userData.budgetYear = `${this.userData.budgetYear.year}-${this.userData.budgetYear.status}`
    }

    this.loadSubPerangkatDaerah()
    // Don't load kinerja initially - wait for unit selection
  },

  // Main view
  view: function() {
    return m('div', { class: 'space-y-6' }, [

      // Header with selections
      m('div', { class: 'bg-white rounded-xl shadow-sm border border-gray-200 p-6' }, [
        m('div', { class: 'flex justify-between items-center mb-6' }, [
          m('div', [
            m('h1', { class: 'text-2xl font-bold text-gray-900' }, 'Manajemen Kinerja'),
            m('p', { class: 'text-gray-600 mt-1' }, 'Lihat dan kelola semua target kinerja yang telah ditetapkan untuk unit kerja')
          ]),
          m('button', {
            class: 'inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl',
            onclick: () => this.openCreateModal(),
            disabled: !this.selectedSubPerangkatDaerah,
            title: !this.selectedSubPerangkatDaerah ? 'Pilih unit kerja terlebih dahulu' : 'Tambah target kinerja baru'
          }, [
            m('i', { class: 'ri-add-line mr-2' }),
            'Tambah Target Kinerja'
          ])
        ]),

        // Unit and Anggaran Selection
        m('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-6' }, [
          // Sub Perangkat Daerah Selection
          m('div', [
            m('label', { class: 'block text-sm font-semibold text-gray-800 mb-3' }, [
              m('i', { class: 'ri-building-line mr-2 text-blue-500' }),
              'Unit Kerja'
            ]),

            // Selected Unit Display
            this.selectedSubPerangkatDaerah && m('div', {
              class: 'bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4'
            }, [
              m('div', { class: 'flex items-center justify-between' }, [
                m('div', [
                  m('div', { class: 'font-semibold text-blue-900 text-lg' }, this.selectedSubPerangkatDaerah.nama),
                  m('div', { class: 'text-sm text-blue-700 mt-1' }, `Pimpinan: ${this.selectedSubPerangkatDaerah.pimpinan}`)
                ]),
                m('button', {
                  type: 'button',
                  class: 'text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-100',
                  onclick: () => {
                    this.selectedSubPerangkatDaerah = null
                    this.selectedAnggaran = null
                    this.availableAnggaran = []
                    this.availableSubKegiatan = []
                  }
                }, [
                  m('i', { class: 'ri-close-fill' })
                ])
              ])
            ]),

            // Main page Unit Kerja selection MUST remain active to drive Kinerja context
            m('select', {
              class: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white',
              value: this.selectedSubPerangkatDaerah?._id || '',
              onchange: (e) => {
                const selectedId = e.target.value
                this.selectedSubPerangkatDaerah = (this.availableSubPerangkatDaerah || []).find(
                  org => org._id === selectedId
                ) || null

                this.loadAnggaranForSubPerangkatDaerah(selectedId)
                this.selectedAnggaran = null
                this.availableSubKegiatan = []

                if (selectedId) {
                  // Load all kinerja for this unit
                  this.loadKinerja(selectedId, null)
                } else {
                  this.kinerjaList = []
                  this.filteredKinerja = []
                  m.redraw()
                }
              }
            }, [
              m('option', { value: '' }, 'Pilih Unit Kerja'),
              (this.availableSubPerangkatDaerah || []).map(org =>
                m('option', {
                  value: org._id,
                  key: org._id
                }, org.nama)
              )
            ])
          ]),

          // Anggaran info is now selected only inside the modal when creating target.
          // We intentionally remove the main-page Anggaran <select> to avoid duplicate UX.
          m('div', [
            m('label', { class: 'block text-sm font-semibold text-gray-800 mb-3' }, [
              m('i', { class: 'ri-wallet-line mr-2 text-green-500' }),
              'Anggaran'
            ]),
            m('p', { class: 'text-sm text-gray-500' },
              'Pilih anggaran dan subkegiatan langsung di form setelah klik "Tambah Target Kinerja".'
            )
          ])
        ])
      ]),

      // Search and filters (only show when selections are made)
      this.selectedSubPerangkatDaerah && m('div', { class: 'bg-white rounded-xl shadow-sm border border-gray-200 p-6' }, [
        m('div', { class: 'grid grid-cols-1 md:grid-cols-4 gap-4' }, [
          // Search input
          m('div', [
            m('label', { class: 'block text-sm font-medium text-gray-700 mb-2' }, 'Pencarian'),
            m('div', { class: 'relative' }, [
              m('input', {
                type: 'text',
                class: 'w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                placeholder: 'Cari subkegiatan atau deskripsi...',
                value: this.searchQuery,
                oninput: (e) => {
                  this.searchQuery = e.target.value
                  this.applyFilters()
                }
              }),
              m('div', { class: 'absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none' }, [
                m('i', { class: 'ri-search-line text-gray-400' })
              ])
            ])
          ]),

          // Status filter
          m('div', [
            m('label', { class: 'block text-sm font-medium text-gray-700 mb-2' }, 'Status'),
            m('select', {
              class: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              value: this.selectedStatus,
              onchange: (e) => {
                this.selectedStatus = e.target.value
                this.applyFilters()
              }
            }, [
              m('option', { value: 'all' }, 'Semua Status'),
              m('option', { value: 'planning' }, 'Perencanaan'),
              m('option', { value: 'in_progress' }, 'Dalam Proses'),
              m('option', { value: 'completed' }, 'Selesai'),
              m('option', { value: 'cancelled' }, 'Dibatalkan')
            ])
          ]),

          // Priority filter
          m('div', [
            m('label', { class: 'block text-sm font-medium text-gray-700 mb-2' }, 'Prioritas'),
            m('select', {
              class: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              value: this.selectedPriority,
              onchange: (e) => {
                this.selectedPriority = e.target.value
                this.applyFilters()
              }
            }, [
              m('option', { value: 'all' }, 'Semua Prioritas'),
              m('option', { value: 'low' }, 'Rendah'),
              m('option', { value: 'medium' }, 'Sedang'),
              m('option', { value: 'high' }, 'Tinggi'),
              m('option', { value: 'critical' }, 'Kritis')
            ])
          ]),

          // Results info
          m('div', { class: 'flex items-end' }, [
            m('div', { class: 'text-sm text-gray-600' }, [
              m('div', `Menampilkan ${this.filteredKinerja.length} dari ${this.kinerjaList.length} kinerja`),
              this.searchQuery && m('div', { class: 'text-blue-600' }, `Pencarian: "${this.searchQuery}"`)
            ])
          ])
        ])
      ]),

      // Loading indicator
      this.isLoading ?
        m('div', { class: 'flex justify-center items-center h-64' }, [
          m('div', { class: 'w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin' })
        ]) :

        // Show table or empty state
        this.selectedSubPerangkatDaerah ?
          this.filteredKinerja.length === 0 ?
            // Empty state
            m('div', { class: 'bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden' }, [
              m('div', { class: 'text-center py-12' }, [
                m('div', { class: 'mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-4' }, [
                  m('i', { class: 'ri-target-fill text-blue-500' })
                ]),
                m('h3', { class: 'text-lg font-medium text-gray-900 mb-2' }, 'Belum ada data kinerja'),
                m('p', { class: 'text-gray-500 mb-6 max-w-sm mx-auto' }, 'Klik tombol di bawah untuk mulai menambahkan target kinerja. Anda dapat memilih anggaran dan subkegiatan dalam form.'),
                m('button', {
                  class: 'inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl',
                  onclick: () => this.openCreateModal(),
                  disabled: !this.selectedSubPerangkatDaerah,
                  title: !this.selectedSubPerangkatDaerah ? 'Pilih unit kerja terlebih dahulu' : 'Tambah target kinerja pertama'
                }, [
                  m('i', { class: 'ri-add-line mr-2' }),
                  'Tambah Target Kinerja Pertama'
                ])
              ])
            ]) :
            // Kinerja table
            m('div', { class: 'bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden' }, [
              m('div', { class: 'overflow-x-auto' }, [
                m('table', { class: 'min-w-full divide-y divide-gray-200' }, [
                  m('thead', { class: 'bg-gray-50' }, [
                    m('tr', [
                      m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'SubKegiatan'),
                      m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Target'),
                      m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Aktual'),
                      m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Capaian'),
                      m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Status'),
                      m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Prioritas'),
                      m('th', { class: 'px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Aksi')
                    ])
                  ]),
                  m('tbody', { class: 'bg-white divide-y divide-gray-200' },
                    (this.getPaginatedKinerja() || []).map(kinerja => [
                      m('tr', { class: 'hover:bg-gray-50' }, [
                        m('td', { class: 'px-6 py-4' }, [
                          m('div', { class: 'text-sm font-medium text-gray-900' }, [
                            (kinerja.subKegiatanId?.fullCode || kinerja.subKegiatanId?.kode || kinerja.subKegiatanId) && m('span', { class: 'font-mono text-xs text-gray-500 mr-2' }, kinerja.subKegiatanId?.fullCode || kinerja.subKegiatanId?.kode || kinerja.subKegiatanId),
                            kinerja.subKegiatanId?.nama || kinerja.subKegiatanId || 'SubKegiatan tidak ditemukan'
                          ]),
                          m('div', { class: 'text-sm text-gray-500 mt-1' }, [
                            m('span', { class: 'font-medium' }, kinerja.subKegiatanId?.kinerja || 'Kinerja'),
                            m('span', { class: 'mx-2' }, '•'),
                            m('span', kinerja.subKegiatanId?.satuan || 'Satuan')
                          ])
                        ]),
                        m('td', { class: 'px-6 py-4 whitespace-nowrap' }, [
                          m('div', { class: 'text-sm text-gray-900' }, [
                            m('span', { class: 'font-semibold' }, kinerja.targetValue?.toLocaleString('id-ID')),
                            m('div', { class: 'text-xs text-gray-500 mt-1' }, this.formatDate(kinerja.targetDate))
                          ])
                        ]),
                       m('td', { class: 'px-6 py-4 whitespace-nowrap' }, [
                          m('span', { class: 'text-sm font-semibold text-blue-600' }, kinerja.actualValue?.toLocaleString('id-ID'))
                        ]),
                        m('td', { class: 'px-6 py-4 whitespace-nowrap' }, [
                          m('div', { class: 'text-sm text-center' }, [
                            m('div', { class: 'font-bold text-lg' }, [
                              m('span', {
                                class: `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  kinerja.achievementPercentage >= 100 ? 'bg-green-100 text-green-800' :
                                  kinerja.achievementPercentage >= 75 ? 'bg-blue-100 text-blue-800' :
                                  kinerja.achievementPercentage >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`
                              }, this.formatPercentage(kinerja.achievementPercentage))
                            ]),
                            m('div', { class: 'text-xs text-gray-500 mt-1' }, `${kinerja.achievementPercentage?.toFixed(1)}%`)
                          ])
                        ]),
                        m('td', { class: 'px-6 py-4 whitespace-nowrap' }, [
                          m('span', {
                            class: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${this.getStatusBadgeClass(kinerja.status)}`
                          }, this.getStatusText(kinerja.status))
                        ]),
                        m('td', { class: 'px-6 py-4 whitespace-nowrap' }, [
                          m('span', {
                            class: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${this.getPriorityBadgeClass(kinerja.priority)}`
                          }, this.getPriorityText(kinerja.priority))
                        ]),
                        m('td', { class: 'px-6 py-4 whitespace-nowrap text-right text-sm font-medium' }, [
                          m('div', { class: 'flex justify-end space-x-2' }, [
                            m('button', {
                              class: 'text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-50',
                              onclick: () => this.openEditModal(kinerja),
                              title: 'Edit'
                            }, [
                              m('i', { class: 'ri-edit-line text-lg' })
                            ]),
                            m('button', {
                              class: 'text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50',
                              onclick: () => this.deleteItem(kinerja),
                              title: 'Hapus'
                            }, [
                              m('i', { class: 'ri-delete-bin-line text-lg' })
                            ])
                          ])
                        ])
                      ])
                    ])
                  )
                ])
              ]),

              // Pagination
              this.getTotalPages() > 1 && m('div', { class: 'bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6' }, [
                m('div', { class: 'flex-1 flex justify-between sm:hidden' }, [
                  m('button', {
                    class: `relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                      this.currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`,
                    onclick: () => this.changePage(this.currentPage - 1),
                    disabled: this.currentPage === 1
                  }, 'Sebelumnya'),
                  m('button', {
                    class: `ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                      this.currentPage === this.getTotalPages() ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`,
                    onclick: () => this.changePage(this.currentPage + 1),
                    disabled: this.currentPage === this.getTotalPages()
                  }, 'Selanjutnya')
                ]),
                m('div', { class: 'hidden sm:flex-1 sm:flex sm:items-center sm:justify-between' }, [
                  m('div', [
                    m('p', { class: 'text-sm text-gray-700' }, [
                      'Menampilkan ',
                      m('span', { class: 'font-medium' }, ((this.currentPage - 1) * this.itemsPerPage) + 1),
                      ' sampai ',
                      m('span', { class: 'font-medium' }, Math.min(this.currentPage * this.itemsPerPage, this.filteredKinerja.length)),
                      ' dari ',
                      m('span', { class: 'font-medium' }, this.filteredKinerja.length),
                      ' hasil'
                    ])
                  ]),
                  m('div', [
                    m('nav', { class: 'relative z-0 inline-flex rounded-md shadow-sm -space-x-px' }, [
                      // Previous button
                      m('button', {
                        class: `relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                          this.currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                        }`,
                        onclick: () => this.changePage(this.currentPage - 1),
                        disabled: this.currentPage === 1
                      }, [
                        m('i', { class: 'ri-arrow-left-s-line' })
                      ]),

                      // Page numbers (show max 5 pages)
                      Array.from({ length: Math.min(5, this.getTotalPages() || 0) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(this.getTotalPages() - 4, this.currentPage - 2)) + i
                        return m('button', {
                          class: `relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${
                            pageNum === this.currentPage ? 'z-10 bg-blue-50 border-blue-500 text-blue-600' : 'text-gray-500 hover:bg-gray-50'
                          }`,
                          onclick: () => this.changePage(pageNum)
                        }, pageNum)
                      }),

                      // Next button
                      m('button', {
                        class: `relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                          this.currentPage === this.getTotalPages() ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                        }`,
                        onclick: () => this.changePage(this.currentPage + 1),
                        disabled: this.currentPage === this.getTotalPages()
                      }, [
                        m('i', { class: 'ri-arrow-right-s-line' })
                      ])
                    ])
                  ])
                ])
              ])
            ]) :
          // Instructions when no selections made
          m('div', { class: 'bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden' }, [
            m('div', { class: 'text-center py-12' }, [
              m('div', { class: 'mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4' }, [
                m('i', { class: 'ri-information-line text-blue-400 text-2xl' })
              ]),
              m('h3', { class: 'text-lg font-medium text-gray-900 mb-2' }, 'Pilih Unit Kerja'),
              m('p', { class: 'text-gray-500 max-w-md mx-auto' }, 'Pilih unit kerja untuk melihat semua target kinerja yang telah ditetapkan. Klik "Tambah Target Kinerja" untuk memulai, kemudian pilih anggaran dan subkegiatan dalam form.')
            ])
          ]),

      // Modal for creating/editing kinerja
      this.showModal && m('div', {
        class: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4',
        onclick: (e) => e.target === e.currentTarget && this.closeModal()
      }, [
        m('div', {
          class: 'bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 transform transition-all max-h-[95vh] overflow-y-auto',
          onclick: (e) => e.stopPropagation()
        }, [
          // Modal Header
          m('div', {
            class: `bg-gradient-to-r ${this.modalMode === 'create' ? 'from-blue-500 to-purple-600' : 'from-green-500 to-blue-600'} text-white p-6 rounded-t-xl`
          }, [
            m('div', { class: 'flex items-center justify-between' }, [
              m('div', { class: 'flex items-center space-x-3' }, [
                m('div', {
                  class: 'w-8 h-8 bg-blue-600 bg-opacity-25 rounded-full flex items-center justify-center'
                }, [
                  m('i', {
                    class: `ri-${this.modalMode === 'create' ? 'add' : 'edit'}-line text-xl text-white`
                  })
                ]),
                m('div', [
                  m('h3', { class: 'text-xl font-bold' }, [
                    `${this.modalMode === 'create' ? 'Tambah' : 'Edit'} Target Kinerja`
                  ]),
                  m('p', {
                    class: 'text-white text-opacity-80 text-sm'
                  }, [
                    this.modalMode === 'create'
                      ? 'Tentukan target kinerja untuk subkegiatan'
                      : 'Perbarui target dan informasi kinerja'
                  ])
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

         // SubKegiatan Information Display
         this.selectedSubKegiatan && m('div', { class: 'px-8 pb-6' }, [
           m('div', { class: 'bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 rounded-xl p-6 border border-indigo-100 shadow-sm' }, [
             // Header
             m('div', { class: 'flex items-center justify-between mb-6' }, [
               m('h4', { class: 'text-lg font-bold text-gray-800 flex items-center' }, [
                 m('div', { class: 'w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-3' }, [
                   m('i', { class: 'ri-information-line text-indigo-600 text-sm' })
                 ]),
                 'Informasi SubKegiatan'
               ]),
               m('div', { class: 'w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center' }, [
                 m('i', { class: 'ri-node-tree text-indigo-600 text-xs' })
               ])
             ]),

             // Main Information Cards
             m('div', { class: 'grid grid-cols-1 md:grid-cols-3 gap-4 mb-6' }, [
               // Kode (STRICT: show fullCode built from hierarchy)
               m('div', { class: 'bg-white rounded-lg border border-indigo-100 shadow-sm overflow-hidden' }, [
                 m('div', { class: 'bg-indigo-50 px-4 py-2 border-b border-indigo-100' }, [
                   m('div', { class: 'text-xs font-bold text-indigo-600 uppercase tracking-wider text-center' }, 'Kode')
                 ]),
                 m('div', { class: 'p-4 text-center' }, [
                   m('div', {
                     class: 'text-2xl font-mono font-bold text-indigo-600 break-all'
                   }, this.selectedSubKegiatan?.fullCode || '')
                 ])
               ]),

               // Nama SubKegiatan
               m('div', { class: 'bg-white rounded-lg border border-purple-100 shadow-sm overflow-hidden' }, [
                 m('div', { class: 'bg-purple-50 px-4 py-2 border-b border-purple-100' }, [
                   m('div', { class: 'text-xs font-bold text-purple-600 uppercase tracking-wider text-center' }, 'Nama SubKegiatan')
                 ]),
                 m('div', { class: 'p-4 text-center' }, [
                   m('div', { class: 'text-sm font-semibold text-gray-900 leading-tight' }, this.selectedSubKegiatan.nama || 'Rehabilitasi Sumur Air Tanah untuk Air Baku')
                 ])
               ]),

               // Kinerja
               m('div', { class: 'bg-white rounded-lg border border-blue-100 shadow-sm overflow-hidden' }, [
                 m('div', { class: 'bg-blue-50 px-4 py-2 border-b border-blue-100' }, [
                   m('div', { class: 'text-xs font-bold text-blue-600 uppercase tracking-wider text-center' }, 'Kinerja')
                 ]),
                 m('div', { class: 'p-4 text-center' }, [
                   m('div', { class: 'text-sm font-semibold text-blue-600 leading-tight' }, this.selectedSubKegiatan.kinerja || 'Terehabilitasinya Sumur Air Tanah untuk Air Baku')
                 ])
               ])
             ]),

             // Additional Information Cards
             m('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-4' }, [
               // Indikator
               m('div', { class: 'bg-white rounded-lg border border-emerald-100 shadow-sm overflow-hidden' }, [
                 m('div', { class: 'bg-emerald-50 px-4 py-2 border-b border-emerald-100' }, [
                   m('div', { class: 'text-xs font-bold text-emerald-600 uppercase tracking-wider text-center' }, 'Indikator')
                 ]),
                 m('div', { class: 'p-4' }, [
                   m('div', { class: 'text-sm font-medium text-gray-900 leading-relaxed' }, this.selectedSubKegiatan.indikator || 'Jumlah Sumur Air Tanah untuk Air Baku yang Direhabilitasi')
                 ])
               ]),

               // Satuan
               m('div', { class: 'bg-white rounded-lg border border-violet-100 shadow-sm overflow-hidden' }, [
                 m('div', { class: 'bg-violet-50 px-4 py-2 border-b border-violet-100' }, [
                   m('div', { class: 'text-xs font-bold text-violet-600 uppercase tracking-wider text-center' }, 'Satuan')
                 ]),
                 m('div', { class: 'p-4 text-center' }, [
                   m('div', { class: 'text-lg font-semibold text-violet-600' }, this.selectedSubKegiatan.satuan || 'Titik')
                 ])
               ])
             ])
           ])
         ]),

         // Modal Body
         m('div', { class: 'p-8' }, [
            // Selection Section
            m('div', { class: 'mb-8' }, [
              m('h4', { class: 'text-xl font-semibold text-gray-800 mb-6 flex items-center' }, [
                m('i', { class: 'ri-organization-chart mr-3 text-blue-500' }),
                'Pemilihan Unit dan Anggaran'
              ]),

              m('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-6' }, [
                // Sub Perangkat Daerah Selection
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-3' }, [
                    m('i', { class: 'ri-building-line mr-2 text-blue-500' }),
                    'Unit Kerja'
                  ]),
                  this.modalMode === 'edit'
                    ? [
                        // Read-only display for edit mode
                        m('div', {
                          class: 'w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700'
                        }, this.selectedSubPerangkatDaerah ? this.selectedSubPerangkatDaerah.nama : 'Unit kerja tidak ditemukan')
                      ]
                    : [
                        // LOCK Unit Kerja inside modal to the Unit selected on main page
                        m('select', {
                          class: 'w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed',
                          value: this.selectedSubPerangkatDaerah?._id || this.formData.subPerangkatDaerahId || '',
                          disabled: true
                        }, [
                          m('option', {
                            value: this.selectedSubPerangkatDaerah?._id || this.formData.subPerangkatDaerahId || ''
                          }, this.selectedSubPerangkatDaerah?.nama || 'Unit Kerja belum dipilih'),
                          // keep options for completeness (no-op due to disabled)
                          (this.availableSubPerangkatDaerah || []).map(org =>
                            m('option', {
                              value: org._id,
                              key: org._id
                            }, org.nama)
                          )
                        ])
                      ]
                ]),

                // Anggaran Selection
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-3' }, [
                    m('i', { class: 'ri-wallet-line mr-2 text-green-500' }),
                    'Anggaran'
                  ]),
                  this.modalMode === 'edit' ? [
                    // Read-only display for edit mode
                    m('div', {
                      class: 'w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700'
                    }, this.selectedAnggaran ? `${this.selectedAnggaran.budgetYear} - ${this.selectedSubKegiatan?.nama || 'SubKegiatan tidak ditemukan'}` : 'Anggaran tidak ditemukan')
                  ] : [
                    // Editable select for create mode:
                    // show ONLY anggaran that do NOT yet have a kinerja for this unit (unassigned targets)
                    m('select', {
                      class: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white',
                      value: this.formData.anggaranId,
                      onchange: (e) => {
                        this.formData.anggaranId = e.target.value
                        this.selectedAnggaran = (this.availableAnggaran || []).find(
                          ang => ang._id === e.target.value
                        ) || null
                        this.loadSubKegiatanForAnggaran(e.target.value)
                      },
                      disabled: this.isModalLoading || !this.formData.subPerangkatDaerahId
                    }, [
                      m('option', { value: '' }, 'Pilih Anggaran yang belum memiliki target'),
                      this.getAvailableAnggaranOptions().map(anggaran =>
                        m('option', {
                          value: anggaran._id,
                          key: anggaran._id
                        }, `${anggaran.budgetYear} - ${anggaran.subKegiatanId?.nama}`)
                      )
                    ])
                  ]
                ])
              ])
            ]),

            // SubKegiatan Selection
            this.availableSubKegiatan.length > 0 && m('div', { class: 'mb-8' }, [
              m('h4', { class: 'text-xl font-semibold text-gray-800 mb-6 flex items-center' }, [
                m('i', { class: 'ri-node-tree mr-3 text-purple-500' }),
                'Pemilihan SubKegiatan'
              ]),

              m('div', { class: 'bg-gray-50 rounded-lg p-6 border border-gray-200' }, [
                m('div', { class: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' }, [
                  (this.availableSubKegiatan || []).map(subKeg =>
                    m('div', {
                      class: `border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        this.formData.subKegiatanId === subKeg._id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`,
                      onclick: () => {
                        this.formData.subKegiatanId = subKeg._id
                      },
                      key: subKeg._id
                    }, [
                      m('div', { class: 'font-mono text-sm font-bold text-gray-800 mb-1' }, this.selectedSubKegiatan?.kode || 'Kode'),
                      m('div', { class: 'font-medium text-gray-900 mb-2' }, this.selectedSubKegiatan?.nama || 'Nama SubKegiatan'),
                      m('div', { class: 'space-y-1 text-sm' }, [
                        m('div', { class: 'flex justify-between' }, [
                          m('span', { class: 'text-gray-600' }, 'Kinerja:'),
                          m('span', { class: 'font-medium text-blue-600' }, this.selectedSubKegiatan?.kinerja || 'Kinerja')
                        ]),
                        m('div', { class: 'flex justify-between' }, [
                          m('span', { class: 'text-gray-600' }, 'Indikator:'),
                          m('span', { class: 'font-medium text-green-600' }, this.selectedSubKegiatan?.indikator || 'Indikator')
                        ]),
                        m('div', { class: 'flex justify-between' }, [
                          m('span', { class: 'text-gray-600' }, 'Satuan:'),
                          m('span', { class: 'font-medium text-purple-600' }, this.selectedSubKegiatan?.satuan || 'Satuan')
                        ])
                      ])
                    ])
                  )
                ])
              ])
            ]),

            // Target Information Section
            (this.selectedSubKegiatan || this.modalMode === 'edit') && m('div', { class: 'mb-8' }, [
              m('h4', { class: 'text-xl font-semibold text-gray-800 mb-6 flex items-center' }, [
                m('i', { class: 'ri-target-line mr-3 text-orange-500' }),
                'Informasi Target'
              ]),

              m('div', { class: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' }, [
                // Target Value
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-3' }, [
                    m('i', { class: 'ri-number-1 mr-2 text-blue-500' }),
                    'Nilai Target'
                  ]),
                  m('input', {
                    type: 'number',
                    class: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white',
                    placeholder: 'Masukkan nilai target',
                    value: this.formData.targetValue,
                    oninput: (e) => {
                      this.formData.targetValue = e.target.value
                    },
                    min: '0',
                    step: '0.01',
                    disabled: this.isModalLoading
                  })
                ]),

                // Target Date
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-3' }, [
                    m('i', { class: 'ri-calendar-line mr-2 text-green-500' }),
                    'Tanggal Target'
                  ]),
                  m('input', {
                    type: 'date',
                    class: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white',
                    value: this.formData.targetDate,
                    oninput: (e) => {
                      this.formData.targetDate = e.target.value
                    },
                    disabled: this.isModalLoading
                  })
                ]),

                // Priority
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-3' }, [
                    m('i', { class: 'ri-flag-line mr-2 text-red-500' }),
                    'Prioritas'
                  ]),
                  m('select', {
                    class: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white',
                    value: this.formData.priority,
                    onchange: (e) => this.formData.priority = e.target.value,
                    disabled: this.isModalLoading
                  }, [
                    m('option', { value: 'low' }, 'Rendah'),
                    m('option', { value: 'medium' }, 'Sedang'),
                    m('option', { value: 'high' }, 'Tinggi'),
                    m('option', { value: 'critical' }, 'Kritis')
                  ])
                ])
              ]),

              // Description
              m('div', { class: 'mt-6' }, [
                m('label', { class: 'block text-sm font-semibold text-gray-800 mb-3' }, [
                  m('i', { class: 'ri-file-text-line mr-2 text-gray-500' }),
                  'Deskripsi'
                ]),
                m('textarea', {
                  class: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 bg-white resize-vertical',
                  placeholder: 'Deskripsi tambahan untuk target kinerja ini',
                  value: this.formData.description,
                  oninput: (e) => this.formData.description = e.target.value,
                  rows: 3,
                  disabled: this.isModalLoading
                })
              ])
            ])
          ]),

          // Modal Actions
          m('div', {
            class: 'flex justify-end gap-4 pt-6 border-t border-gray-200 bg-gray-50 px-8 py-6 rounded-b-xl'
          }, [
            m('button', {
              class: 'px-8 py-3 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg text-gray-700 font-medium transition-colors',
              onclick: () => this.closeModal(),
              disabled: this.isModalLoading
            }, [
              m('i', { class: 'ri-close-fill mr-2' }),
              'Batal'
            ]),

            m('button', {
              class: `px-8 py-3 ${this.isModalLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'} text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl`,
              disabled: this.isModalLoading,
              onclick: () => this.saveItem()
            }, [
              this.isModalLoading ? m('i', { class: 'ri-loader-4-line animate-spin mr-2' }) : m('i', { class: 'ri-save-line mr-2' }),
              this.isModalLoading ? 'Menyimpan...' : 'Simpan Kinerja'
            ])
          ])
        ])
      ])
    ])
  }
}

export default Kinerja