import m from 'mithril'
import { UserUtils, APIUtils, ToastUtils } from '../js/utils.js'
import toast from '../js/toaster.js'

const Anggaran = {
  // State management
  isLoading: false,
  anggaran: [],
  filteredAnggaran: [],

  // Modal states
  showModal: false,
  modalMode: 'create', // 'create' or 'edit'
  isModalLoading: false,

  // Inline editing for allocations in modal
  editingAllocationRow: null,
  editAllocationForm: {
    kodeRekeningId: '',
    amount: '',
    description: ''
  },

  // Form data for Anggaran
  formData: {
    subKegiatanId: '',
    budgetYear: '',
    sumberDanaId: '',
    allocations: [],
    description: ''
  },

  // Form data for allocations (Kode Rekening + Amount)
  allocationForm: {
    kodeRekeningId: '',
    amount: '',
    description: ''
  },

  // Data for dropdowns
  subKegiatanList: [],
  sumberDanaList: [],
  kodeRekeningList: [],
  // Hierarchical data for building fullCode
  urusanList: [],
  bidangList: [],
  programList: [],
  kegiatanList: [],

  // Search and filter
  searchQuery: '',
  selectedStatus: 'all',
  kodeRekeningSearch: '',
  subKegiatanSearch: '',

  // Pagination
  currentPage: 1,
  itemsPerPage: 10,

  // Indonesian locale for currency formatting
  formatCurrency: function (amount) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0)
  },

  // Parse Indonesian currency format to number
  parseCurrencyInput: function (value) {
    if (!value) return 0

    // Remove currency symbols and formatting
    const cleaned = value.toString()
      .replace(/Rp\s?/g, '')
      .replace(/[.,]/g, '')
      .replace(/\s+/g, '')

    return parseInt(cleaned) || 0
  },

  // Format number for input display
  formatNumberInput: function (value) {
    if (!value) return ''
    return new Intl.NumberFormat('id-ID').format(value)
  },

  // Parse number input with Indonesian locale
  parseNumberInput: function (value) {
    if (!value) return 0
    const cleaned = value.toString().replace(/[.,]/g, '')
    return parseInt(cleaned) || 0
  },

  // Recover corrupted kode rekening ID from corrupted "[object Object]" data
  recoverKodeRekeningId: function (allocation, index) {
    // Strategy 1: Try to find by description pattern matching
    if (allocation.description) {
      const description = allocation.description.toLowerCase()

      // Enhanced pattern matching for common Indonesian construction/building terms
      const patterns = [
        // Construction materials - prioritize this for "semen dll"
        { pattern: /semen|cement|concrete/i, keywords: ['semen', 'cement', 'concrete', 'beton', 'bahan', 'material'] },
        { pattern: /besi|steel|iron/i, keywords: ['besi', 'steel', 'iron', 'logam'] },
        { pattern: /kayu|wood|timber/i, keywords: ['kayu', 'wood', 'timber', 'lumber'] },
        { pattern: /cat|paint|coating/i, keywords: ['cat', 'paint', 'coating', 'finishing'] },
        { pattern: /keramik|tile|ceramic/i, keywords: ['keramik', 'tile', 'ceramic', 'ubin'] },
        { pattern: /piping|pipa|pipe/i, keywords: ['pipa', 'piping', 'plumbing'] },
        { pattern: /electrical|listrik|electric/i, keywords: ['listrik', 'electrical', 'wiring'] },
        { pattern: /equipment|alat|equipment/i, keywords: ['alat', 'equipment', 'tool'] },
        { pattern: /material|materials|building/i, keywords: ['material', 'materials', 'building'] },
        { pattern: /dll|etc|lainnya/i, keywords: ['dll', 'etc', 'lainnya', 'others'] }
      ]

      for (const { pattern, keywords } of patterns) {
        if (pattern.test(description)) {
          // Look for kode rekening that might match this category
          // Prioritize "Bahan Baku" (raw materials) for "semen dll"
          const kodeRekening = this.kodeRekeningList.find(k => {
            const kodeName = k.name.toLowerCase()
            const kodeCode = k.code.toLowerCase()
            const kodeFullCode = k.fullCode.toLowerCase()

            // For "semen dll", prioritize "Bahan Baku" (5.1.2.1.x) over "Pemeliharaan" (5.1.2.3.x)
            if (description.includes('semen')) {
              return kodeName.includes('bahan baku') || kodeName.includes('material') ||
                kodeFullCode.includes('5.1.2.1') || kodeFullCode.includes('5.1.2.2')
            }

            return keywords.some(keyword =>
              kodeName.includes(keyword) ||
              kodeCode.includes(keyword) ||
              kodeFullCode.includes(keyword)
            )
          })

          if (kodeRekening) {
            return kodeRekening._id
          }
        }
      }

      // Fallback: Try direct text matching
      const kodeRekening = this.kodeRekeningList.find(k =>
        k.name.toLowerCase().includes(description) ||
        description.includes(k.name.toLowerCase()) ||
        k.fullCode.toLowerCase().includes(description)
      )

      if (kodeRekening) {
        return kodeRekening._id
      }
    }

    // Strategy 2: Show a warning and ask user to manually select
    ToastUtils.warning(`Alokasi ${index + 1}: Data kode rekening corrupted - silakan pilih manual`)

    // Return null to indicate manual selection needed
    return null
  },

  // Get filtered SubKegiatan list based on search,
  // excluding SubKegiatan that already have Anggaran for the current budget year
  getFilteredSubKegiatan: function () {
    // Build a Set of subKegiatanId that are already used in Anggaran for the active budget year
    const usedSubKegiatanIds = new Set(
      (this.anggaran || [])
        .filter(a => a.budgetYear === this.userData?.budgetYear)
        .map(a => {
          const sk = a.subKegiatanId
          if (!sk) return null
          if (typeof sk === 'string') return sk
          if (typeof sk === 'object') {
            return sk._id || sk.$oid || null
          }
          return null
        })
        .filter(Boolean)
    )

    // When no search, return all unused SubKegiatan
    if (!this.subKegiatanSearch.trim()) {
      return this.subKegiatanList.filter(subKeg => !usedSubKegiatanIds.has(subKeg._id))
    }

    const searchTerm = this.subKegiatanSearch.toLowerCase()
    return this.subKegiatanList.filter(subKeg => {
      // Skip already used SubKegiatan
      if (usedSubKegiatanIds.has(subKeg._id)) return false

      const fullCode = (subKeg.fullCode || subKeg.kode || '').toLowerCase()
      return (
        (subKeg.kode || '').toLowerCase().includes(searchTerm) ||
        (subKeg.nama || '').toLowerCase().includes(searchTerm) ||
        fullCode.includes(searchTerm)
      )
    })
  },

  // Get filtered Kode Rekening list based on search
  getFilteredKodeRekening: function () {
    if (!this.kodeRekeningSearch.trim()) {
      return this.kodeRekeningList
    }

    const searchTerm = this.kodeRekeningSearch.toLowerCase()
    return this.kodeRekeningList.filter(kode =>
      kode.fullCode.toLowerCase().includes(searchTerm) ||
      kode.name.toLowerCase().includes(searchTerm) ||
      kode.code.toLowerCase().includes(searchTerm)
    )
  },

  oninit: function () {
    // Authentication check
    if (!UserUtils.isAuthenticated()) {
      toast.warning('Silakan masuk terlebih dahulu')
      m.route.set('/login')
      return
    }

    // Set page title in layout
    if (this.vnode && this.vnode.attrs && this.vnode.attrs.setTitle) {
      this.vnode.attrs.setTitle('Manajemen Anggaran')
    }

    // Load user data and initial data
    this.userData = UserUtils.getUserData()

    // Handle budget year object format from user data
    if (this.userData.budgetYear && typeof this.userData.budgetYear === 'object') {
      this.userData.budgetYear = `${this.userData.budgetYear.year}-${this.userData.budgetYear.status}`
    }

    this.loadData()
  },

  loadData: async function () {
    this.isLoading = true
    m.redraw()

    try {
      // Load all required data using APIUtils
      const [anggaranResult, subKegiatanResult, kodeRekeningResult, sumberDanaResult] = await Promise.all([
        APIUtils.getAll('anggaran'),
        APIUtils.getAll('subkegiatan'),
        APIUtils.getAll('koderekening'),
        APIUtils.getAll('sumberdana')
      ])

      this.anggaran = anggaranResult.data || []
      this.subKegiatanList = subKegiatanResult.data || []
      this.kodeRekeningList = kodeRekeningResult.data || []
      this.sumberDanaList = sumberDanaResult.data || []

      // Load hierarchical data for building fullCode with error handling
      let urusanData = []
      let bidangData = []
      let programData = []
      let kegiatanData = []

      try {
        const [urusanResult] = await Promise.all([APIUtils.getAll('urusan')])
        urusanData = urusanResult.data || []
      } catch (error) {
        console.warn('Failed to load urusan data:', error)
      }

      try {
        const [bidangResult] = await Promise.all([APIUtils.getAll('bidang')])
        bidangData = bidangResult.data || []
      } catch (error) {
        console.warn('Failed to load bidang data:', error)
      }

      try {
        const [programResult] = await Promise.all([APIUtils.getAll('program')])
        programData = programResult.data || []
      } catch (error) {
        console.warn('Failed to load program data:', error)
      }

      try {
        const [kegiatanResult] = await Promise.all([APIUtils.getAll('kegiatan')])
        kegiatanData = kegiatanResult.data || []
      } catch (error) {
        console.warn('Failed to load kegiatan data:', error)
      }

      // Build fullCode for each subkegiatan with fallback
      this.subKegiatanList = this.subKegiatanList.map(subKeg => {
        const kegiatan = kegiatanData.find(k => k._id === subKeg.kegiatanId?.$oid || subKeg.kegiatanId)
        const program = programData.find(p => p._id === kegiatan?.programId?.$oid || kegiatan?.programId)
        const bidang = bidangData.find(b => b._id === program?.bidangId?.$oid || program?.bidangId)
        const urusan = urusanData.find(u => u._id === bidang?.urusanId?.$oid || bidang?.urusanId)

        // Build fullCode: urusanKode.bidangKode.programKode.kegiatanKode.kode
        const fullCode = [
          urusan?.kode,
          bidang?.kode,
          program?.kode,
          kegiatan?.kode,
          subKeg.kode
        ].filter(kode => kode).join('.')

        return {
          ...subKeg,
          fullCode: fullCode || subKeg.kode, // Fallback to basic kode if fullCode is empty
          // Also store individual codes for easier access
          urusanKode: urusan?.kode || '',
          bidangKode: bidang?.kode || '',
          programKode: program?.kode || '',
          kegiatanKode: kegiatan?.kode || ''
        }
      })

      // Enhance anggaran data with fullCode for subkegiatan references AFTER building fullCode
      this.anggaran = this.anggaran.map(anggaran => {
        if (anggaran.subKegiatanId) {
          // Find the corresponding subkegiatan from our enhanced list
          const enhancedSubKegiatan = this.subKegiatanList.find(sk =>
            sk._id === anggaran.subKegiatanId._id ||
            sk._id === anggaran.subKegiatanId ||
            sk._id?.$oid === anggaran.subKegiatanId._id ||
            sk._id?.$oid === anggaran.subKegiatanId
          )

          if (enhancedSubKegiatan) {
            anggaran.subKegiatanId = {
              ...anggaran.subKegiatanId,
              fullCode: enhancedSubKegiatan.fullCode,
              urusanKode: enhancedSubKegiatan.urusanKode,
              bidangKode: enhancedSubKegiatan.bidangKode,
              programKode: enhancedSubKegiatan.programKode,
              kegiatanKode: enhancedSubKegiatan.kegiatanKode
            }
          }
        }
        return anggaran
      })

      this.applyFilters()
    } catch (error) {
      console.error('Error loading data:', error)
      this.anggaran = []
      this.filteredAnggaran = []
      this.subKegiatanList = []
      this.kodeRekeningList = []
      this.sumberDanaList = []
      this.urusanList = []
      this.bidangList = []
      this.programList = []
      this.kegiatanList = []
    } finally {
      this.isLoading = false
      m.redraw()
    }
  },

  applyFilters: function () {
    let filteredAnggaran = [...this.anggaran]

    // Apply search filter - search in allocation data
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase()
      filteredAnggaran = filteredAnggaran.filter(anggaran => {
        // Search in subkegiatan
        const subKegFullCode = anggaran.subKegiatanId?.fullCode || ''

        const subKegMatch = anggaran.subKegiatanId?.nama?.toLowerCase().includes(query) ||
          anggaran.subKegiatanId?.kode?.toLowerCase().includes(query) ||
          subKegFullCode.toLowerCase().includes(query) ||
          anggaran.budgetYear?.toLowerCase().includes(query)

        if (subKegMatch) return true

        // Search in allocations
        return anggaran.allocations?.some(allocation => {
          // Search in kode rekening
          let kodeRekeningId = allocation.kodeRekeningId
          if (typeof kodeRekeningId === 'object' && kodeRekeningId !== null) {
            if (kodeRekeningId.$oid) kodeRekeningId = kodeRekeningId.$oid
            else if (kodeRekeningId._id) kodeRekeningId = kodeRekeningId._id
            else if (kodeRekeningId.fullCode) kodeRekeningId = kodeRekeningId.fullCode
            else kodeRekeningId = kodeRekeningId.toString()
          }

          const kodeRekening = this.kodeRekeningList.find(k => k._id === kodeRekeningId)
          const kodeRekMatch = kodeRekening && (
            kodeRekening.fullCode.toLowerCase().includes(query) ||
            kodeRekening.name.toLowerCase().includes(query) ||
            kodeRekening.code.toLowerCase().includes(query)
          )

          // Search in description and amount
          const descMatch = allocation.description?.toLowerCase().includes(query)
          const amountMatch = this.formatCurrency(allocation.amount).toLowerCase().includes(query)

          return kodeRekMatch || descMatch || amountMatch
        })
      })
    }

    this.filteredAnggaran = filteredAnggaran
    this.currentPage = 1 // Reset to first page when filters change
  },

  resetForm: function () {
    this.formData = {
      subKegiatanId: '',
      budgetYear: this.userData.budgetYear || '',
      sumberDanaId: '',
      allocations: [],
      description: ''
    }
    this.allocationForm = {
      kodeRekeningId: '',
      amount: '',
      description: ''
    }
  },

  openCreateModal: function () {
    this.modalMode = 'create'
    this.resetForm()
    this.showModal = true
  },

  openEditModal: async function (anggaran) {
    this.modalMode = 'edit'

    // Refresh kode rekening data to ensure we have the latest
    const kodeRekeningResult = await APIUtils.getAll('koderekening')
    this.kodeRekeningList = kodeRekeningResult.data || []

    // Refresh sumber dana data to ensure we have the latest
    const sumberDanaResult = await APIUtils.getAll('sumberdana')
    this.sumberDanaList = sumberDanaResult.data || []

    // Get current user for allocation tracking
    const currentUser = UserUtils.getUserData()
    const userId = currentUser?.id || currentUser?.userId

    // Debug: Log anggaran sumber Dana data
    console.log('=== EDIT MODAL DEBUG ===')
    console.log('anggaran.sumberDanaId:', anggaran.sumberDanaId)
    console.log('Type of anggaran.sumberDanaId:', typeof anggaran.sumberDanaId)
    
    // Handle sumberDanaId extraction properly
    let sumberDanaId = ''
    if (anggaran.sumberDanaId) {
      if (typeof anggaran.sumberDanaId === 'object') {
        if (anggaran.sumberDanaId.$oid) {
          sumberDanaId = anggaran.sumberDanaId.$oid
        } else if (anggaran.sumberDanaId._id) {
          sumberDanaId = anggaran.sumberDanaId._id
        } else {
          sumberDanaId = String(anggaran.sumberDanaId)
        }
      } else {
        sumberDanaId = anggaran.sumberDanaId
      }
    }
    
    console.log('Processed sumberDanaId:', sumberDanaId)
    console.log('sumberDanaList length:', this.sumberDanaList.length)

    // Ensure allocations have allocatedBy field and proper structure
    const allocationsWithUser = (anggaran.allocations || []).map((allocation, index) => {
      console.log(`=== PROCESSING ALLOCATION ${index} ===`)
      console.log('Raw allocation object:', JSON.stringify(allocation, null, 2))
      console.log('Raw kodeRekeningId:', allocation.kodeRekeningId)
      console.log('Type of kodeRekeningId:', typeof allocation.kodeRekeningId)

      // Handle different possible structures for kodeRekeningId
      let kodeRekeningId = allocation.kodeRekeningId

      // SPECIAL CASE: Handle corrupted "[object Object]" string data
      if (typeof kodeRekeningId === 'string' && kodeRekeningId === '[object Object]') {
        console.log('Found corrupted kodeRekeningId string, attempting recovery...')
        kodeRekeningId = this.recoverKodeRekeningId(allocation, index)
      }
      // If kodeRekeningId is an object (including MongoDB extended JSON format)
      else if (typeof kodeRekeningId === 'object' && kodeRekeningId !== null) {
        console.log('kodeRekeningId is an object, processing...')
        if (kodeRekeningId.$oid) {
          // Handle MongoDB extended JSON format
          kodeRekeningId = kodeRekeningId.$oid
          console.log('Using MongoDB $oid:', kodeRekeningId)
        } else if (kodeRekeningId._id) {
          kodeRekeningId = kodeRekeningId._id
          console.log('Using kodeRekeningId._id:', kodeRekeningId)
        } else if (kodeRekeningId.fullCode) {
          kodeRekeningId = kodeRekeningId.fullCode
          console.log('Using kodeRekeningId.fullCode:', kodeRekeningId)
        } else {
          kodeRekeningId = String(kodeRekeningId)
          console.log('Converting to string:', kodeRekeningId)
        }
      }

      // If allocation has kodeRekening object instead of just ID
      if (allocation.kodeRekening && typeof allocation.kodeRekening === 'object') {
        console.log('Found nested kodeRekening object:', allocation.kodeRekening)
        if (allocation.kodeRekening._id) {
          kodeRekeningId = allocation.kodeRekening._id
          console.log('Using nested kodeRekening._id:', kodeRekeningId)
        } else if (allocation.kodeRekening.fullCode) {
          kodeRekeningId = allocation.kodeRekening.fullCode
          console.log('Using nested kodeRekening.fullCode:', kodeRekeningId)
        }
      }

      console.log('Final processed kodeRekeningId:', kodeRekeningId)

      // Handle case where we couldn't recover the ID
      if (kodeRekeningId === null) {
        console.warn(`Could not recover kode rekening ID for allocation ${index}, will need manual selection`)
        kodeRekeningId = '' // Set to empty string to indicate manual selection needed
      }

      const result = {
        ...allocation,
        kodeRekeningId: kodeRekeningId,
        allocatedBy: allocation.allocatedBy || userId,
        needsManualSelection: kodeRekeningId === '' // Flag to indicate manual selection needed
      }

      console.log(`Final allocation ${index} result:`, result)
      return result
    })

    this.formData = {
      _id: anggaran._id,
      subKegiatanId: anggaran.subKegiatanId?._id || anggaran.subKegiatanId,
      budgetYear: anggaran.budgetYear,
      sumberDanaId: sumberDanaId,
      allocations: allocationsWithUser,
      description: anggaran.description || ''
    }
    
    console.log('Final formData:', this.formData)
    this.showModal = true
  },

  closeModal: function () {
    this.showModal = false
    this.resetForm()
  },

  addAllocation: function () {
    if (!this.allocationForm.kodeRekeningId || !this.allocationForm.amount) {
      toast.warning('Pilih kode rekening dan masukkan jumlah')
      return
    }

    // Ensure kodeRekeningId is a string, not an object
    let kodeRekeningId = this.allocationForm.kodeRekeningId
    if (typeof kodeRekeningId === 'object' && kodeRekeningId !== null) {
      kodeRekeningId = kodeRekeningId.$oid || kodeRekeningId._id || kodeRekeningId.toString()
    }

    // Check if allocation already exists
    const exists = this.formData.allocations.findIndex(
      alloc => {
        let allocId = alloc.kodeRekeningId
        if (typeof allocId === 'object' && allocId !== null) {
          allocId = allocId.$oid || allocId._id || allocId.toString()
        }
        return allocId === kodeRekeningId
      }
    ) >= 0

    if (exists) {
      toast.warning('Kode rekening sudah ditambahkan')
      return
    }

    // Get current user ID
    const currentUser = UserUtils.getUserData()
    const userId = currentUser?.id || currentUser?.userId

    // Add new allocation
    this.formData.allocations.push({
      kodeRekeningId: kodeRekeningId,
      amount: this.parseNumberInput(this.allocationForm.amount),
      description: this.allocationForm.description,
      allocatedBy: userId
    })

    // Reset allocation form
    this.allocationForm = {
      kodeRekeningId: '',
      amount: '',
      description: ''
    }

    m.redraw()
  },

  removeAllocation: function (index) {
    this.formData.allocations.splice(index, 1)
    m.redraw()
  },

  // Inline editing functions for allocations in modal
  startEditingAllocation: function (allocation, index) {
    this.editingAllocationRow = index
    this.editAllocationForm = {
      kodeRekeningId: allocation.kodeRekeningId || '',
      amount: this.formatNumberInput(allocation.amount),
      description: allocation.description || ''
    }
    m.redraw()
  },

  cancelEditingAllocation: function () {
    this.editingAllocationRow = null
    this.editAllocationForm = { kodeRekeningId: '', amount: '', description: '' }
    m.redraw()
  },

  saveAllocationEdit: function (index) {
    if (!this.editAllocationForm.kodeRekeningId || !this.editAllocationForm.amount) {
      toast.warning('Kode rekening dan jumlah harus diisi')
      return
    }

    // Update the allocation
    const kodeRekeningId = this.editAllocationForm.kodeRekeningId
    if (typeof kodeRekeningId === 'object' && kodeRekeningId !== null) {
      this.formData.allocations[index].kodeRekeningId = kodeRekeningId.$oid || kodeRekeningId._id || kodeRekeningId.toString()
    } else {
      this.formData.allocations[index].kodeRekeningId = kodeRekeningId
    }

    this.formData.allocations[index].amount = this.parseNumberInput(this.editAllocationForm.amount)
    this.formData.allocations[index].description = this.editAllocationForm.description

    // Reset editing state
    this.editingAllocationRow = null
    this.editAllocationForm = { kodeRekeningId: '', amount: '', description: '' }

    m.redraw()
  },

  // Replace corrupted allocation with manual kode rekening selection
  replaceCorruptedAllocation: function (allocationIndex) {
    const allocation = this.formData.allocations[allocationIndex]
    if (!allocation) return

    // Set the allocation form with current values for easy editing
    this.allocationForm = {
      kodeRekeningId: '',
      amount: this.formatNumberInput(allocation.amount),
      description: allocation.description || ''
    }

    // Remove the corrupted allocation
    this.removeAllocation(allocationIndex)

    // Focus on the kode rekening dropdown
    setTimeout(() => {
      const kodeRekeningSelect = document.querySelector('select[value=""]')
      if (kodeRekeningSelect) {
        kodeRekeningSelect.focus()
      }
    }, 100)

    toast.info('Alokasi dihapus. Silakan pilih kode rekening yang benar dan tambah alokasi baru.')
  },

  saveItem: async function () {
    if (!this.formData.subKegiatanId || !this.formData.budgetYear || !this.formData.sumberDanaId || this.formData.allocations.length === 0) {
      toast.warning('SubKegiatan, tahun anggaran, sumber dana, dan alokasi harus diisi')
      return
    }

    this.isModalLoading = true
    m.redraw()

    try {
      console.log('Sending Anggaran data:', JSON.stringify(this.formData, null, 2))

      let result
      if (this.modalMode === 'edit') {
        result = await APIUtils.update('anggaran', this.formData._id, this.formData)
      } else {
        result = await APIUtils.create('anggaran', this.formData)
      }

      this.closeModal()
      this.loadData()
    } catch (error) {
      console.error('Error saving data:', error)
      // Error handling is already managed by APIUtils
    } finally {
      this.isModalLoading = false
      m.redraw()
    }
  },

  deleteItem: async function (anggaran) {
    // First, check if this anggaran is being used by any Kinerja records
    try {
      // Check if any Kinerja records reference this Anggaran using APIUtils
      const kinerjaResult = await APIUtils.request(`/api/kinerja?anggaranId=${anggaran._id}`)
      const kinerjaCount = kinerjaResult.data?.length || 0

      if (kinerjaCount > 0) {
        ToastUtils.confirm(
          `Anggaran ini sedang digunakan oleh ${kinerjaCount} target kinerja. Menghapus anggaran akan mempengaruhi data kinerja yang ada.\n\nApakah Anda yakin ingin menghapus anggaran untuk "${anggaran.subKegiatanId?.nama}" (${anggaran.budgetYear})?`,
          async () => {
            await this.performDelete(anggaran)
          },
          () => {
            ToastUtils.info('Penghapusan dibatalkan')
          }
        )
        return
      }
    } catch (error) {
      console.error('Error checking kinerja dependencies:', error)
      // Continue with deletion attempt even if check fails
    }

    // If no kinerja dependencies or check failed, proceed with normal deletion
    ToastUtils.confirm(
      `Apakah Anda yakin ingin menghapus anggaran untuk "${anggaran.subKegiatanId?.nama}" (${anggaran.budgetYear})?`,
      async () => {
        await this.performDelete(anggaran)
      },
      () => {
        ToastUtils.info('Penghapusan dibatalkan')
      }
    )
  },

  performDelete: async function (anggaran) {
    this.isLoading = true
    m.redraw()

    try {
      const result = await APIUtils.delete('anggaran', anggaran._id, `anggaran untuk "${anggaran.subKegiatanId?.nama}" (${anggaran.budgetYear})`)

      if (result) {
        this.loadData()
      }
    } catch (error) {
      console.error('Error deleting data:', error)

      // Handle special case for existing anggaran (409 conflict)
      if (error.message && error.message.includes('sudah ada')) {
        try {
          // Find existing anggaran for this subkegiatan and budget year
          const existingResult = await APIUtils.request(`/api/anggaran?subKegiatanId=${this.formData.subKegiatanId}&budgetYear=${encodeURIComponent(this.formData.budgetYear)}`)
          const existingAnggaran = existingResult.data?.[0]

          if (existingAnggaran) {
            ToastUtils.confirm(
              `Anggaran untuk SubKegiatan ini dengan tahun "${this.formData.budgetYear}" sudah ada. Apakah Anda ingin mengedit anggaran yang sudah ada?`,
              () => {
                // Open edit modal with existing data
                this.openEditModal(existingAnggaran)
              },
              () => {
                toast.info('Pilih SubKegiatan atau tahun anggaran yang berbeda')
              }
            )
            return
          }
        } catch (existingError) {
          console.error('Error checking existing anggaran:', existingError)
        }
      }

      // Error handling is already managed by APIUtils
    } finally {
      this.isLoading = false
      m.redraw()
    }
  },

  // Pagination helpers
  getTotalPages: function () {
    return Math.ceil(this.filteredAnggaran.length / this.itemsPerPage)
  },

  getPaginatedAnggaran: function () {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage
    const endIndex = startIndex + this.itemsPerPage
    return this.filteredAnggaran.slice(startIndex, endIndex)
  },

  // Get all allocations for display in the table
  getAllAllocations: function () {
    const allocations = []
    this.filteredAnggaran.forEach(anggaran => {
      if (anggaran.allocations && anggaran.allocations.length > 0) {
        anggaran.allocations.forEach((allocation, index) => {
          allocations.push({
            ...allocation,
            anggaranId: anggaran._id,
            subKegiatanNama: anggaran.subKegiatanId?.nama || 'Tidak ditemukan',
            subKegiatanKode: anggaran.subKegiatanId?.fullCode || anggaran.subKegiatanId?.kode || '',
            budgetYear: anggaran.budgetYear,
            allocationIndex: index,
            needsManualSelection: allocation.kodeRekeningId === '' || allocation.needsManualSelection
          })
        })
      }
    })
    return allocations
  },

  // Get paginated allocations for the table
  getPaginatedAllocations: function () {
    const allAllocations = this.getAllAllocations()
    const startIndex = (this.currentPage - 1) * this.itemsPerPage
    const endIndex = startIndex + this.itemsPerPage
    return allAllocations.slice(startIndex, endIndex)
  },

  // Helper function to save anggaran after allocation changes
  saveAnggaran: async function (anggaran) {
    try {
      await APIUtils.update('anggaran', anggaran._id, anggaran)
      this.loadData() // Reload to ensure consistency
    } catch (error) {
      console.error('Error saving anggaran:', error)
      this.loadData() // Reload to revert changes
    }
  },

  changePage: function (page) {
    if (page >= 1 && page <= this.getTotalPages()) {
      this.currentPage = page
      m.redraw()
    }
  },

  // Helper function to render allocation table row
  renderAllocationRow: function (allocation, index) {
    const isEditingRow = this.editingAllocationRow === index
    
    return m('tr', { 
      class: 'hover:bg-gray-50', 
      key: `${allocation.kodeRekeningId}-${index}` 
    }, [
      // Kode Rekening column
      m('td', { class: 'px-4 py-3 whitespace-nowrap' }, [
        isEditingRow ? 
          m('select', {
            class: 'w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white',
            value: this.editAllocationForm.kodeRekeningId || '',
            oninput: (e) => {
              this.editAllocationForm.kodeRekeningId = e.target.value
            }
          }, [
            m('option', { value: '' }, 'Pilih Kode Rekening'),
            this.kodeRekeningList.map(kode =>
              m('option', {
                value: kode._id,
                key: kode._id
              }, `${kode.fullCode} - ${kode.name}`)
            )
          ]) :
          this.renderKodeRekeningDisplay(allocation)
      ]),

      // Keterangan column
      m('td', { class: 'px-4 py-3' }, [
        isEditingRow ?
          m('input', {
            type: 'text',
            class: 'w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white',
            value: this.editAllocationForm.description,
            oninput: (e) => {
              this.editAllocationForm.description = e.target.value
            },
            placeholder: 'Keterangan alokasi'
          }) :
          m('div', { class: 'text-sm text-gray-600' }, allocation.description || '-')
      ]),

      // Jumlah column
      m('td', { class: 'px-4 py-3 whitespace-nowrap text-right' }, [
        isEditingRow ?
          m('input', {
            type: 'text',
            class: 'w-full px-2 py-1 text-sm border border-gray-300 rounded text-right focus:outline-none focus:ring-2 focus:ring-green-500 bg-white',
            value: this.editAllocationForm.amount,
            oninput: (e) => {
              this.editAllocationForm.amount = e.target.value
            },
            placeholder: '0'
          }) :
          m('span', { class: 'text-sm font-semibold text-green-600' }, this.formatCurrency(allocation.amount))
      ]),

      // Aksi column
      m('td', { class: 'px-4 py-3 whitespace-nowrap text-center' }, [
        m('div', { class: 'flex justify-center space-x-2' }, [
          // Edit button
          m('button', {
            class: 'text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-50',
            onclick: () => this.startEditingAllocation(allocation, index),
            disabled: this.isModalLoading,
            title: 'Edit alokasi'
          }, [
            m('i', { class: 'ri-edit-line text-sm' })
          ]),

          // Save button (only show when editing this row)
          isEditingRow && m('button', {
            class: 'text-green-600 hover:text-green-900 p-1 rounded-full hover:bg-green-50',
            onclick: () => this.saveAllocationEdit(index),
            title: 'Simpan'
          }, [
            m('i', { class: 'ri-check-line text-sm' })
          ]),

          // Cancel button (only show when editing this row)
          isEditingRow && m('button', {
            class: 'text-gray-600 hover:text-gray-900 p-1 rounded-full hover:bg-gray-50',
            onclick: () => this.cancelEditingAllocation(),
            title: 'Batal'
          }, [
            m('i', { class: 'ri-close-fill text-sm' })
          ]),

          // Delete button (only show when not editing)
          !isEditingRow && m('button', {
            class: 'text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50',
            onclick: (e) => {
              e.stopPropagation()
              this.removeAllocation(index)
            },
            disabled: this.isModalLoading,
            title: 'Hapus alokasi'
          }, [
            m('i', { class: 'ri-delete-bin-line text-sm' })
          ])
        ])
      ])
    ])
  },

  // Helper function to render kode rekening display
  renderKodeRekeningDisplay: function (allocation) {
    let kodeRekeningId = allocation.kodeRekeningId

    // Handle case where kodeRekeningId is an object (including MongoDB extended JSON format)
    if (typeof kodeRekeningId === 'object' && kodeRekeningId !== null) {
      if (kodeRekeningId.$oid) {
        kodeRekeningId = kodeRekeningId.$oid
      } else if (kodeRekeningId._id) {
        kodeRekeningId = kodeRekeningId._id
      } else if (kodeRekeningId.fullCode) {
        kodeRekeningId = kodeRekeningId.fullCode
      } else {
        kodeRekeningId = kodeRekeningId.toString()
      }
    }

    const kodeRekening = this.kodeRekeningList.find(k => k._id === kodeRekeningId)

    if (kodeRekening) {
      return m('div', { class: 'text-sm font-medium text-gray-900' }, `${kodeRekening.fullCode} - ${kodeRekening.name}`)
    }

    // Handle case where kodeRekeningId is empty (needs manual selection)
    if (kodeRekeningId === '') {
      return m('div', [
        m('span', {
          class: 'text-amber-600 font-medium'
        }, [
          m('i', { class: 'ri-error-warning-line mr-1' }),
          'Perlu pemilihan manual'
        ])
      ])
    }

    return m('div', { class: 'text-sm font-medium text-gray-900' }, `Kode: ${kodeRekeningId || 'Tidak tersedia'}`)
  },

  renderForm: function () {
    if (!this.showModal) return null

    // Calculate total allocation amount
    const totalAllocation = this.formData.allocations.reduce((total, alloc) => total + alloc.amount, 0)

    return m('div', {
      class: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4',
      onclick: (e) => e.target === e.currentTarget && this.closeModal()
    }, [
      m('div', {
        class: 'bg-white rounded-xl shadow-2xl max-w-6xl w-full mx-4 transform transition-all max-h-[95vh] overflow-y-auto',
        onclick: (e) => e.stopPropagation()
      }, [
        // Enhanced Header
        m('div', {
          class: `bg-gradient-to-r ${this.modalMode === 'delete' ? 'from-red-500 to-red-600' : 'from-blue-500 to-purple-600'} text-white p-6 rounded-t-xl`
        }, [
          m('div', { class: 'flex items-center justify-between' }, [
            m('div', { class: 'flex items-center space-x-3' }, [
              m('div', {
                class: 'w-8 h-8 bg-blue-600 bg-opacity-25 rounded-full flex items-center justify-center'
              }, [
                m('i', {
                  class: `ri-${this.modalMode === 'delete' ? 'delete-bin' : this.modalMode === 'create' ? 'add' : 'edit'}-line text-xl text-white`
                })
              ]),
              m('div', [
                m('h3', { class: 'text-xl font-bold' }, [
                  `${this.modalMode === 'create' ? 'Tambah' : this.modalMode === 'edit' ? 'Edit' : 'Hapus'} Anggaran`
                ]),
                m('p', {
                  class: 'text-white text-opacity-80 text-sm'
                }, [
                  this.modalMode === 'delete'
                    ? 'Konfirmasi penghapusan data'
                    : 'Formulir input anggaran dengan alokasi kode rekening'
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

        // Form Body - More spacious layout
        m('div', { class: 'p-8' }, [
          // Basic Information Section
          m('div', { class: 'mb-8' }, [
            m('h4', { class: 'text-xl font-semibold text-gray-800 mb-6 flex items-center' }, [
              m('i', { class: 'ri-information-line mr-3 text-blue-500' }),
              'Informasi Anggaran'
            ]),

            m('div', { class: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' }, [
              // SubKegiatan Selection
              m('div', { class: 'md:col-span-2' }, [
                m('label', { class: 'block text-sm font-semibold text-gray-800 mb-3' }, [
                  m('i', { class: 'ri-node-tree mr-2 text-blue-500' }),
                  'SubKegiatan'
                ]),

                // Selected SubKegiatan Display
                this.formData.subKegiatanId && (() => {
                  const selectedSubKeg = this.subKegiatanList.find(s => s._id === this.formData.subKegiatanId)
                  return selectedSubKeg ? m('div', {
                    class: 'bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4'
                  }, [
                    m('div', { class: 'flex items-center justify-between' }, [
                      m('div', [
                        m('div', { class: 'font-semibold text-blue-900 text-lg' }, selectedSubKeg.nama),
                        m('div', { class: 'text-sm text-blue-700 font-mono mt-1' }, selectedSubKeg.fullCode || selectedSubKeg.kode)
                      ]),
                      m('button', {
                        type: 'button',
                        class: 'text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-100',
                        onclick: () => {
                          this.formData.subKegiatanId = ''
                          this.subKegiatanSearch = ''
                        },
                        disabled: this.isModalLoading
                      }, [
                        m('i', { class: 'ri-close-fill' })
                      ])
                    ])
                  ]) : null
                })(),

                m('div', { class: 'space-y-3' }, [
                  // Search input for SubKegiatan
                  m('div', { class: 'relative' }, [
                    m('input', {
                      type: 'text',
                      class: 'w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white text-sm',
                      placeholder: this.formData.subKegiatanId ? 'Ganti subkegiatan...' : 'Cari subkegiatan...',
                      value: this.subKegiatanSearch,
                      oninput: (e) => {
                        this.subKegiatanSearch = e.target.value
                        m.redraw()
                      },
                      disabled: this.isModalLoading
                    }),
                    m('div', { class: 'absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none' }, [
                      m('i', { class: 'ri-search-line text-gray-400' })
                    ])
                  ]),

                  // SubKegiatan dropdown
                  m('select', {
                    class: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white',
                    value: this.formData.subKegiatanId,
                    onchange: (e) => {
                      this.formData.subKegiatanId = e.target.value
                      if (e.target.value) {
                        this.subKegiatanSearch = ''
                      }
                    },
                    disabled: this.isModalLoading
                  }, [
                    m('option', { value: '' }, this.subKegiatanSearch ?
                      `Pilih dari ${this.getFilteredSubKegiatan().length} hasil` :
                      'Pilih SubKegiatan'),
                    this.getFilteredSubKegiatan().map(subKeg => {
                      return m('option', {
                        value: subKeg._id,
                        key: subKeg._id
                      }, `${subKeg.fullCode || subKeg.kode} - ${subKeg.nama}`)
                    })
                  ])
                ])
              ]),

              // Budget Year
              m('div', [
                m('label', { class: 'block text-sm font-semibold text-gray-800 mb-3' }, [
                  m('i', { class: 'ri-calendar-line mr-2 text-green-500' }),
                  'Tahun Anggaran'
                ]),
                m('input', {
                  type: 'text',
                  class: 'w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 font-medium',
                  value: this.formData.budgetYear,
                  disabled: true
                }),
                m('p', { class: 'mt-1 text-xs text-gray-500' }, 'Otomatis dari login pengguna')
              ]),

              // Sumber Dana Selection
              m('div', [
                m('label', { class: 'block text-sm font-semibold text-gray-800 mb-3' }, [
                  m('i', { class: 'ri-wallet-3-line mr-2 text-green-500' }),
                  'Sumber Dana'
                ]),
                m('select', {
                  class: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white',
                  value: this.formData.sumberDanaId,
                  onchange: (e) => {
                    this.formData.sumberDanaId = e.target.value
                  },
                  disabled: this.isModalLoading
                }, [
                  m('option', { value: '' }, 'Pilih Sumber Dana'),
                  this.sumberDanaList.map(sumberDana =>
                    m('option', {
                      value: sumberDana._id,
                      key: sumberDana._id
                    }, `${sumberDana.kode} - ${sumberDana.nama}`)
                  )
                ]),
                m('p', { class: 'mt-1 text-xs text-gray-500' }, 'Pilih sumber dana untuk anggaran ini')
              ]),

            ]),

            // Description
            m('div', { class: 'mt-6' }, [
              m('label', { class: 'block text-sm font-semibold text-gray-800 mb-3' }, [
                m('i', { class: 'ri-file-text-line mr-2 text-teal-500' }),
                'Deskripsi'
              ]),
              m('textarea', {
                class: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white resize-vertical',
                placeholder: 'Deskripsi tambahan untuk anggaran ini',
                value: this.formData.description,
                oninput: (e) => this.formData.description = e.target.value,
                rows: 4,
                disabled: this.isModalLoading
              })
            ])
          ]),

          // Allocations Section
          m('div', { class: 'border-t border-gray-200 pt-8' }, [
            m('div', { class: 'flex items-center justify-between mb-6' }, [
              m('h4', { class: 'text-xl font-semibold text-gray-800 flex items-center' }, [
                m('i', { class: 'ri-wallet-line mr-3 text-green-500' }),
                'Alokasi Kode Rekening'
              ]),
              m('div', { class: 'text-right' }, [
                m('div', { class: 'text-sm text-gray-600' }, 'Total Alokasi'),
                m('div', { class: 'text-2xl font-bold text-green-600' }, this.formatCurrency(totalAllocation))
              ])
            ]),

            // Add new allocation form
            m('div', { class: 'bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200' }, [
              m('h5', { class: 'text-lg font-medium text-gray-700 mb-4' }, 'Tambah Alokasi Baru'),

              m('div', { class: 'grid grid-cols-1 md:grid-cols-3 gap-4' }, [
                // Kode Rekening search and selection
                m('div', [
                  m('label', { class: 'block text-sm font-medium text-gray-700 mb-2' }, 'Kode Rekening'),
                  m('div', { class: 'space-y-2' }, [
                    // Search input
                    m('div', { class: 'relative' }, [
                      m('input', {
                        type: 'text',
                        class: 'w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white',
                        placeholder: 'Cari kode rekening...',
                        value: this.kodeRekeningSearch,
                        oninput: (e) => {
                          this.kodeRekeningSearch = e.target.value
                          m.redraw()
                        },
                        disabled: this.isModalLoading
                      }),
                      m('div', { class: 'absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none' }, [
                        m('i', { class: 'ri-search-line text-gray-400' })
                      ])
                    ]),

                    // Dropdown
                    m('select', {
                      class: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white',
                      value: this.allocationForm.kodeRekeningId || '',
                      onchange: (e) => {
                        const selectedValue = e.target.value
                        this.allocationForm.kodeRekeningId = selectedValue
                        if (selectedValue) {
                          this.kodeRekeningSearch = ''
                        }
                      },
                      disabled: this.isModalLoading
                    }, [
                      m('option', { value: '' }, this.kodeRekeningSearch ?
                        `Pilih dari ${this.getFilteredKodeRekening().length} hasil` :
                        'Pilih Kode Rekening'),
                      this.getFilteredKodeRekening().map(kode =>
                        m('option', {
                          value: kode._id,
                          key: kode._id
                        }, `${kode.fullCode} - ${kode.name}`)
                      )
                    ])
                  ])
                ]),

                // Amount input
                m('div', [
                  m('label', { class: 'block text-sm font-medium text-gray-700 mb-2' }, 'Jumlah (Rp)'),
                  m('input', {
                    type: 'text',
                    class: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-right text-lg',
                    placeholder: '0',
                    value: this.formatNumberInput(this.allocationForm.amount),
                    oninput: (e) => {
                      this.allocationForm.amount = this.parseNumberInput(e.target.value)
                    },
                    disabled: this.isModalLoading
                  })
                ]),

                // Description and button
                m('div', { class: 'flex flex-col justify-between' }, [
                  m('div', [
                    m('label', { class: 'block text-sm font-medium text-gray-700 mb-2' }, 'Keterangan'),
                    m('input', {
                      type: 'text',
                      class: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white',
                      placeholder: 'Keterangan alokasi',
                      value: this.allocationForm.description,
                      oninput: (e) => this.allocationForm.description = e.target.value,
                      disabled: this.isModalLoading
                    })
                  ]),

                  m('button', {
                    class: 'mt-4 w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors',
                    onclick: () => this.addAllocation(),
                    disabled: this.isModalLoading || !this.allocationForm.kodeRekeningId || !this.allocationForm.amount
                  }, [
                    m('i', { class: 'ri-add-line mr-2' }),
                    'Tambah Alokasi'
                  ])
                ])
              ])
            ]),

            // Existing allocations list
            this.formData.allocations.length > 0 && m('div', [
              m('h5', { class: 'text-lg font-medium text-gray-700 mb-4' }, `Alokasi yang Ditambahkan (${this.formData.allocations.length})`),

              // Table layout for allocations
              m('div', { class: 'bg-white border border-gray-200 rounded-lg overflow-hidden' }, [
                m('div', { class: 'overflow-x-auto' }, [
                  m('table', { class: 'min-w-full divide-y divide-gray-200' }, [
                    m('thead', { class: 'bg-gray-50' }, [
                      m('tr', [
                        m('th', { class: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Kode Rekening'),
                        m('th', { class: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Keterangan'),
                        m('th', { class: 'px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Jumlah'),
                        m('th', { class: 'px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20' }, 'Aksi')
                      ])
                    ]),
                    m('tbody', { class: 'bg-white divide-y divide-gray-200' },
                      this.formData.allocations.map((allocation, index) => 
                        this.renderAllocationRow(allocation, index)
                      )
                    )
                  ])
                ])
              ])
            ])
          ])
        ]),

        // Actions
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
            this.isModalLoading ? 'Menyimpan...' : 'Simpan Anggaran'
          ])
        ])
      ])
    ])
  },

  view: function () {
    return m('div', { class: 'space-y-6' }, [

      // Header
      m('div', { class: 'flex justify-between items-center' }, [
        m('div', [
          m('h1', { class: 'text-2xl font-bold text-gray-900' }, 'Manajemen Anggaran'),
          m('p', { class: 'text-gray-600 mt-1' }, 'Kelola alokasi anggaran untuk setiap subkegiatan')
        ]),
        m('button', {
          class: 'inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl',
          onclick: () => this.openCreateModal()
        }, [
          m('i', { class: 'ri-add-line mr-2' }),
          'Tambah Anggaran'
        ])
      ]),

      // Search and filters
      m('div', { class: 'bg-white rounded-xl shadow-sm border border-gray-200 p-6' }, [
        m('div', { class: 'grid grid-cols-1 md:grid-cols-3 gap-4' }, [

          // Search input
          m('div', [
            m('label', { class: 'block text-sm font-medium text-gray-700 mb-2' }, 'Pencarian'),
            m('div', { class: 'relative' }, [
              m('input', {
                type: 'text',
                class: 'w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                placeholder: 'Cari subkegiatan atau tahun anggaran...',
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

          // Results info
          m('div', { class: 'flex items-end' }, [
            m('div', { class: 'text-sm text-gray-600' }, [
              m('div', `Menampilkan ${this.filteredAnggaran.length} anggaran`),
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

        // Anggaran summary table (more scalable)
        m('div', { class: 'bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden' }, [
          m('div', { class: 'overflow-x-auto' }, [
            m('table', { class: 'min-w-full divide-y divide-gray-200' }, [
              m('thead', { class: 'bg-gray-50' }, [
                m('tr', [
                  m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'SubKegiatan'),
                  m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Tahun Anggaran'),
                  m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Total Alokasi'),
                  m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Jumlah Akun'),
                  m('th', { class: 'px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Aksi')
                ])
              ]),
              m('tbody', { class: 'bg-white divide-y divide-gray-200' },
                this.getPaginatedAnggaran().map(anggaran => [
                  m('tr', { class: 'hover:bg-gray-50' }, [
                    m('td', { class: 'px-6 py-4 whitespace-nowrap' }, [
                      m('div', { class: 'text-sm font-medium text-gray-900' }, [
                        anggaran.subKegiatanId?.kode && m('span', { class: 'font-mono text-xs text-gray-500 mr-2' }, anggaran.subKegiatanId.fullCode || anggaran.subKegiatanId.kode || ''),
                        anggaran.subKegiatanId?.nama || 'SubKegiatan tidak ditemukan'
                      ])
                    ]),
                    m('td', { class: 'px-6 py-4 whitespace-nowrap' }, [
                      m('span', { class: 'text-sm text-gray-900 font-medium' }, anggaran.budgetYear)
                    ]),
                    m('td', { class: 'px-6 py-4 whitespace-nowrap' }, [
                      m('span', { class: 'text-sm font-semibold text-green-600' }, this.formatCurrency(anggaran.totalAmount))
                    ]),
                    m('td', { class: 'px-6 py-4 whitespace-nowrap' }, [
                      m('span', { class: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800' },
                        anggaran.allocations ? anggaran.allocations.length : 0)
                    ]),
                    m('td', { class: 'px-6 py-4 whitespace-nowrap text-right text-sm font-medium' }, [
                      m('div', { class: 'flex justify-end space-x-2' }, [
                        m('button', {
                          class: 'text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-50',
                          onclick: async () => {
                            this.isEditLoading = true
                            m.redraw()
                            try {
                              await this.openEditModal(anggaran)
                            } finally {
                              this.isEditLoading = false
                              m.redraw()
                            }
                          },
                          disabled: this.isEditLoading,
                          title: 'Edit Anggaran dan Alokasi'
                        }, [
                          this.isEditLoading
                            ? m('i', { class: 'ri-loader-4-line animate-spin text-lg' })
                            : m('i', { class: 'ri-edit-line text-lg' })
                        ]),
                        m('button', {
                          class: 'text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50',
                          onclick: () => this.deleteItem(anggaran),
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
                class: `relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${this.currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}`,
                onclick: () => this.changePage(this.currentPage - 1),
                disabled: this.currentPage === 1
              }, 'Sebelumnya'),
              m('button', {
                class: `ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${this.getTotalPages() === this.currentPage ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}`,
                onclick: () => this.changePage(this.currentPage + 1),
                disabled: this.getTotalPages() === this.currentPage
              }, 'Selanjutnya')
            ]),
            m('div', { class: 'hidden sm:flex-1 sm:flex sm:items-center sm:justify-between' }, [
              m('div', [
                m('p', { class: 'text-sm text-gray-700' }, [
                  'Menampilkan ',
                  m('span', { class: 'font-medium' }, ((this.currentPage - 1) * this.itemsPerPage) + 1),
                  ' sampai ',
                  m('span', { class: 'font-medium' }, Math.min(this.currentPage * this.itemsPerPage, this.filteredAnggaran.length)),
                  ' dari ',
                  m('span', { class: 'font-medium' }, this.filteredAnggaran.length),
                  ' anggaran'
                ])
              ]),
              m('div', [
                m('nav', { class: 'relative z-0 inline-flex rounded-md shadow-sm -space-x-px' }, [
                  // Previous button
                  m('button', {
                    class: `relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${this.currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'}`,
                    onclick: () => this.changePage(this.currentPage - 1),
                    disabled: this.currentPage === 1
                  }, [
                    m('i', { class: 'ri-arrow-left-s-line' })
                  ]),

                  // Page numbers (show max 5 pages)
                  Array.from({ length: Math.min(5, this.getTotalPages()) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(this.getTotalPages() - 4, this.currentPage - 2)) + i
                    return m('button', {
                      class: `relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${pageNum === this.currentPage ? 'z-10 bg-blue-50 border-blue-500 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`,
                      onclick: () => this.changePage(pageNum)
                    }, pageNum)
                  }),

                  // Next button
                  m('button', {
                    class: `relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${this.getTotalPages() === this.currentPage ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'}`,
                    onclick: () => this.changePage(this.currentPage + 1),
                    disabled: this.getTotalPages() === this.currentPage
                  }, [
                    m('i', { class: 'ri-arrow-right-s-line' })
                  ])
                ])
              ])
            ])
          ])
        ]),

      // Modal
      this.renderForm()
    ])
  }
}

export default Anggaran