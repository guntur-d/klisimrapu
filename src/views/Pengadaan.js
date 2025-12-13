import m from 'mithril'
import { ToastUtils, UserUtils, APIUtils, JWTUtils } from '../js/utils.js'
import toast, { showConfirmation } from '../js/toaster.js'

const Pengadaan = {
  // State management
  isLoading: false,
  currentUser: null,
  activeTab: 'informasi',

  // First tab data (Anggaran and SubKegiatan info)
  anggaranList: [],
  kinerjaList: [],
  subKegiatanList: [],
  pejabatList: [], // For pengguna anggaran selection

  // Second tab data (Pengadaan)
  pengadaanList: [],

  // Third tab data (Paket Kegiatan)
  paketKegiatanList: [],

  // Fourth tab data (Kontrak)
  kontrakList: [],

  // Current context for kontrak modal
  currentKontrakContext: {
    anggaranId: null,
    kodeRekeningId: null,
    subKegiatanId: null
  },

  // Modal states
  showModal: false,
  modalMode: 'create',
  isModalLoading: false,

  // Form data for creating/editing pengadaan
  formData: {
    subKegiatanId: '',
    kode: '',
    nama: '',
    deskripsi: '',
    budgetYear: '',
    status: 'draft',
    estimatedBudget: 0,
    actualBudget: 0,
    startDate: '',
    endDate: '',
    location: ''
  },

  // Selected subkegiatan for accordion display
  selectedSubKegiatan: null,
  expandedAccordions: new Set(),
  expandedKodeRekeningAccordions: new Set(), // For kode rekening accordions

  // Cache for kode rekening data to avoid infinite loops
  kodeRekeningCache: new Map(),
  maxCacheSize: 100, // Maximum cache entries to prevent memory leaks

  // New state to prevent auto-expanding kode rekening accordions
  preventAutoExpand: true,

  // Modal states for kinerja editing
  showKinerjaModal: false,
  isKinerjaModalLoading: false,
  editingKinerjaId: null,
  kinerjaFormData: {
    lokasi: '',
    penggunaAnggaranId: ''
  },

  // Modal states for paket kegiatan
  showPaketModal: false,
  paketModalMode: 'create',
  isPaketModalLoading: false,
  paketFormData: {
    anggaranId: '',
    kodeRekeningId: '',
    uraian: '',
    volume: 1,
    satuan: '',
    hargaSatuan: 0,
    budgetYear: '',
    deskripsi: '',
    createdBy: '',
    updatedBy: ''
  },

  // Modal states for kontrak
  showKontrakModal: false,
  kontrakModalMode: 'create',
  isKontrakModalLoading: false,
  kontrakFormData: {
    paketKegiatanId: '',
    kodeSirupLkpp: '',
    penyediaId: '',
    noKontrak: '',
    tglKontrak: '',
    noSpmk: '',
    tglSpmk: '',
    jangkaWaktu: 0,
    jangkaWaktuUnit: 'Hari',
    tglPelaksanaanDari: '',
    tglPelaksanaanSampai: '',
    lokasi: '',
    hps: 0,
    nilaiKontrak: 0,
    tipe: 'Konstruksi',
    metodePengadaanId: '',
    kualifikasiPengadaan: 'Prakualifikasi',
    budgetYear: '',
    deskripsi: ''
  },

  // Additional data for kontrak form
  penyediaList: [],
  metodePengadaanList: [],
  
  // Tahapan Pekerjaan tab states for each kontrak
  tahapanPekerjaanTabs: new Map(), // Map of kontrakId -> { activeTab, formData }
  
  // Modal states for Target editing
  showTargetModal: false,
  targetModalMode: 'create',
  isTargetModalLoading: false,
  editingTargetId: null,
  targetFormData: {
    kontrakId: '',
    tanggal: '',
    targetFisik: 0,
    targetDana: 0,
    targetDanaRp: 0,
    keterangan: ''
  },

  // Target tracking data for each kontrak
  targetTrackingData: new Map(), // Map of kontrakId -> [target entries]

  // Current kontrak for target data loading
  currentKontrakForTargetData: null,

  // Termin tab states for each kontrak
  terminData: [], // Current termin data being edited
  isSavingTermin: false, // Loading state for saving termin
  currentKontrakForTermin: null, // Current kontrak context for termin
  terminTrackingData: new Map(), // Map of kontrakId -> [termin entries]

  // Jaminan tab states for each kontrak
  jaminanData: [], // Current jaminan data being edited
  isSavingJaminan: false, // Loading state for saving jaminan
  currentKontrakForJaminan: null, // Current kontrak context for jaminan
  jaminanTrackingData: new Map(), // Map of kontrakId -> [jaminan entries]

  // Default active tab
  defaultTahapanTab: 'informasi',
  
  // Allocation information for kontrak modal
  currentAllocationInfo: {
    totalAllocation: 0,
    usedAllocation: 0,
    remainingAllocation: 0
  },
  // kontrakList: [], // Already declared above as "Fourth tab data (Kontrak)"

  oninit: function() {
    // Check if user is operator
    if (!UserUtils.isAuthenticated()) {
      ToastUtils.warning('Silakan masuk terlebih dahulu');
      m.route.set('/login');
      return;
    }

    this.currentUser = UserUtils.getUserData();
    
    // Debug: log current user data
    console.log('Pengadaan.js - Current user data:', this.currentUser);
    console.log('Pengadaan.js - namaPerangkatDaerah:', this.currentUser?.namaPerangkatDaerah);
    console.log('Pengadaan.js - subPerangkatDaerah:', this.currentUser?.subPerangkatDaerah);

    // Only allow operators to access this view
    if (this.currentUser.role !== 'operator') {
      ToastUtils.warning('Halaman ini hanya dapat diakses oleh operator');
      m.route.set('/dashboard');
      return;
    }

    // Check if operator has unit information
    if (!this.currentUser.subPerangkatDaerahId) {
      ToastUtils.warning('Informasi unit kerja tidak ditemukan. Silakan masuk kembali.');
      m.route.set('/login');
      return;
    }

    this.loadData();
  },

  // Load all data based on active tab
  loadData: async function() {
    this.isLoading = true;
    m.redraw();

    try {
      if (this.activeTab === 'informasi') {
        await this.loadInformasiData();
      } else if (this.activeTab === 'pengadaan') {
        await this.loadPengadaanData();
      } else if (this.activeTab === 'paket-kegiatan') {
        await this.loadPaketKegiatanData();
      } else if (this.activeTab === 'kontrak') {
        await this.loadKontrakData();
      }
    } catch (error) {
      console.error('Error loading data:', error);
      // Only show error for actual failures, not for empty data scenarios
      if (error.code === 500 || (error.response && error.response.status === 500)) {
        console.log('500 error received, but may be due to empty data - not showing error toast');
      } else {
        ToastUtils.error('Gagal memuat data');
      }
    }

    this.isLoading = false;
    m.redraw();
  },

  // Load data for Informasi tab
  loadInformasiData: async function() {
    try {
      // Get current user's unit information
      const userData = UserUtils.getUserData();
      const subPerangkatDaerahId = userData.subPerangkatDaerahId;

      if (!subPerangkatDaerahId) {
        ToastUtils.warning('Informasi unit kerja tidak ditemukan');
        return;
      }

      // Load kinerja data for current unit
      const currentYear = new Date().getFullYear();
      const budgetYears = ['2026-Murni', '2026-PAK'];
      const currentBudgetYear = budgetYears[0]; // Default to first option

      this.formData.budgetYear = currentBudgetYear;

      const kinerjaResponse = await APIUtils.request(`/api/kinerja?subPerangkatDaerahId=${subPerangkatDaerahId}&budgetYear=${encodeURIComponent(currentBudgetYear)}`);
      this.kinerjaList = kinerjaResponse.data || [];
      // console.log('Kinerja data for unit', subPerangkatDaerahId, ':', JSON.stringify(this.kinerjaList, null, 2));

      // Load pejabat data for pengguna anggaran selection
      try {
        const pejabatResponse = await APIUtils.request('/api/pejabat?jabatanFungsional=Pengguna Anggaran');
        this.pejabatList = pejabatResponse.data || [];
        console.log('Pejabat data loaded:', this.pejabatList);
      } catch (error) {
        console.error('Failed to load pejabat data:', error);
        this.pejabatList = [];
      }

      // Load anggaran data for the unit - get anggaran that are referenced by kinerja for this unit
      let anggaranData = [];
      const anggaranIds = new Set();

      // Get anggaran IDs from kinerja data
      this.kinerjaList.forEach(kinerja => {
        if (kinerja.anggaranId && kinerja.anggaranId._id) {
          anggaranIds.add(kinerja.anggaranId._id);
        }
      });

      // Load anggaran details if we have IDs
      if (anggaranIds.size > 0) {
        const anggaranPromises = Array.from(anggaranIds).map(id =>
          APIUtils.request(`/api/anggaran/${id}`)
        );
        const anggaranResponses = await Promise.all(anggaranPromises);
        anggaranData = anggaranResponses.map(res => res.data).filter(data => data);
      }

      this.anggaranList = anggaranData;

      // Extract unique subkegiatan from anggaran and kinerja
      const subKegiatanIds = new Set();
      this.anggaranList.forEach(anggaran => {
        if (anggaran.subKegiatanId) subKegiatanIds.add(anggaran.subKegiatanId._id || anggaran.subKegiatanId);
      });

      this.kinerjaList.forEach(kinerja => {
        if (kinerja.subKegiatanId) subKegiatanIds.add(kinerja.subKegiatanId._id || kinerja.subKegiatanId);
      });

      // Load subkegiatan details
      if (subKegiatanIds.size > 0) {
        const subKegiatanResponse = await APIUtils.getAll('subkegiatan');
        const allSubKegiatan = subKegiatanResponse.data || [];
        this.subKegiatanList = allSubKegiatan.filter(subKeg =>
          subKegiatanIds.has(subKeg._id)
        );
      } else {
        this.subKegiatanList = [];
      }


    } catch (error) {
      console.error('Error loading informasi data:', error);
      // Only show error for actual failures, not for empty data scenarios
      if (error.code === 500 || (error.response && error.response.status === 500)) {
        console.log('500 error received, but may be due to empty data - not showing error toast');
      } else {
        ToastUtils.error('Gagal memuat data informasi unit kerja');
      }
    }
  },

  // Load data for Pengadaan tab
  loadPengadaanData: async function() {
    try {
      // Load informasi data first to get the hierarchy
      await this.loadInformasiData();

      const userData = UserUtils.getUserData();
      const subPerangkatDaerahId = userData.subPerangkatDaerahId;
      const currentYear = new Date().getFullYear();
      const budgetYears = ['2026-Murni', '2026-PAK'];
      const currentBudgetYear = budgetYears[0];

      if (!subPerangkatDaerahId) {
        ToastUtils.warning('Informasi unit kerja tidak ditemukan');
        return;
      }

      // Load penyedia and metode pengadaan data for kontrak form
      try {
        const [penyediaResponse, metodePengadaanResponse] = await Promise.all([
          APIUtils.getAll('penyedia'),
          APIUtils.getAll('metode-pengadaan')
        ]);
        this.penyediaList = penyediaResponse.data || [];
        this.metodePengadaanList = metodePengadaanResponse.data || [];
      } catch (error) {
        console.error('Error loading penyedia/metode pengadaan data:', error);
        this.penyediaList = [];
        this.metodePengadaanList = [];
      }

      // Load paket kegiatan data so it's available for kontrak modal
      try {
        await this.loadPaketKegiatanData();
      } catch (error) {
        console.error('Error loading paket kegiatan data:', error);
        // Don't show error toast for paket kegiatan as it might be empty in new installations
        this.paketKegiatanList = [];
      }

      // Load kontrak data for current unit - kontrak is related to paket kegiatan
      try {
        await this.loadKontrakData();
      } catch (error) {
        console.error('Error loading kontrak data:', error);
        // Don't show error toast for kontrak as it might be empty in new installations
        this.kontrakList = [];
      }

      console.log('Pengadaan data loaded, penyedia:', this.penyediaList.length, 'metode pengadaan:', this.metodePengadaanList.length, 'paket kegiatan:', this.paketKegiatanList.length, 'kontrak:', this.kontrakList.length);

    } catch (error) {
      console.error('Error loading pengadaan data:', error);
      ToastUtils.error('Gagal memuat data pengadaan');
    }
  },

  // Load data for Paket Kegiatan tab
  loadPaketKegiatanData: async function() {
    try {
      // Load informasi data first to get the hierarchy (kinerja -> anggaran -> subkegiatan -> kode rekening)
      await this.loadInformasiData();

      // Load paket kegiatan for current unit - filter based on kode rekening from anggaran that belong to this unit's kinerja
      const userData = UserUtils.getUserData();
      const subPerangkatDaerahId = userData.subPerangkatDaerahId;
      const currentYear = new Date().getFullYear();
      const budgetYears = ['2026-Murni', '2026-PAK'];
      const currentBudgetYear = budgetYears[0];

      if (!subPerangkatDaerahId) {
        ToastUtils.warning('Informasi unit kerja tidak ditemukan');
        return;
      }

      // Collect all kode rekening IDs and anggaran IDs from anggaran allocations that belong to this unit's kinerja
      // Group by kinerja to maintain the hierarchy
      const kinerjaGroupedData = {};

      this.kinerjaList.forEach(kinerja => {
        const anggaranId = kinerja.anggaranId?._id || kinerja.anggaranId;
        const subKegiatanId = kinerja.subKegiatanId?._id || kinerja.subKegiatanId;

        if (!kinerjaGroupedData[kinerja._id]) {
          kinerjaGroupedData[kinerja._id] = {
            kinerja,
            anggaranId,
            subKegiatanId,
            kodeRekeningIds: new Set()
          };
        }

        // Find the corresponding anggaran and collect kode rekening IDs
        const anggaran = this.anggaranList.find(a => a._id === anggaranId);
        if (anggaran && anggaran.allocations) {
          anggaran.allocations.forEach(allocation => {
            if (allocation.kodeRekeningId) {
              const kodeRekeningId = typeof allocation.kodeRekeningId === 'string'
                ? allocation.kodeRekeningId
                : allocation.kodeRekeningId._id || allocation.kodeRekeningId;
              kinerjaGroupedData[kinerja._id].kodeRekeningIds.add(kodeRekeningId);
            }
          });
        }
      });

      // Build query - load paket kegiatan for all kode rekening that are allocated in anggaran from this unit's kinerja
      let queryParams = `subPerangkatDaerahId=${subPerangkatDaerahId}&budgetYear=${encodeURIComponent(currentBudgetYear)}`;

      const allKodeRekeningIds = new Set();
      const allAnggaranIds = new Set();
      Object.values(kinerjaGroupedData).forEach(group => {
        allAnggaranIds.add(group.anggaranId);
        group.kodeRekeningIds.forEach(id => allKodeRekeningIds.add(id));
      });

      if (allAnggaranIds.size > 0) {
        const idsArray = Array.from(allAnggaranIds);
        queryParams += `&anggaranIds=${idsArray.join(',')}`;
      }

      if (allKodeRekeningIds.size > 0) {
        const idsArray = Array.from(allKodeRekeningIds);
        queryParams += `&kodeRekeningIds=${idsArray.join(',')}`;
      }

      console.log('Loading paket kegiatan with query:', queryParams);

      // Load paket kegiatan for current unit and allocated kode rekening
      const paketKegiatanResponse = await APIUtils.request(`/api/paketkegiatan?${queryParams}`);
      this.paketKegiatanList = paketKegiatanResponse.data || [];

      // Don't show error for empty data - it's normal
      if (this.paketKegiatanList.length === 0) {
        console.log('No paket kegiatan data found - this is normal for new installations');
      }

    } catch (error) {
      console.error('Error loading paket kegiatan data:', error);

      // Only show error for actual failures, not for empty data
      if (error.code === 500 || (error.response && error.response.status === 500)) {
        console.log('500 error received, but may be due to empty data - not showing error toast');
        this.paketKegiatanList = [];
      } else {
        ToastUtils.error('Gagal memuat data paket kegiatan');
        this.paketKegiatanList = [];
      }
    }
  },

  // Load data for Kontrak tab
  loadKontrakData: async function() {
    try {
      // Load paket kegiatan first to get the hierarchy
      await this.loadPaketKegiatanData();

      // Load kontrak data - kontrak is related to paket kegiatan
      const userData = UserUtils.getUserData();
      const subPerangkatDaerahId = userData.subPerangkatDaerahId;
      const currentYear = new Date().getFullYear();
      const budgetYears = ['2026-Murni', '2026-PAK'];
      const currentBudgetYear = budgetYears[0];

      if (!subPerangkatDaerahId) {
        ToastUtils.warning('Informasi unit kerja tidak ditemukan');
        return;
      }

      // Collect all kode rekening IDs from paket kegiatan that belong to this unit
      const allKodeRekeningIds = new Set();
      const allAnggaranIds = new Set();

      this.paketKegiatanList.forEach(paket => {
        if (paket.kodeRekeningId) {
          const kodeRekeningId = typeof paket.kodeRekeningId === 'string'
            ? paket.kodeRekeningId
            : paket.kodeRekeningId._id || paket.kodeRekeningId;
          allKodeRekeningIds.add(kodeRekeningId);
        }
        if (paket.anggaranId) {
          const anggaranId = typeof paket.anggaranId === 'string'
            ? paket.anggaranId
            : paket.anggaranId._id || paket.anggaranId;
          allAnggaranIds.add(anggaranId);
        }
      });

      // Build query to load kontrak for current unit's paket kegiatan
      let queryParams = `subPerangkatDaerahId=${subPerangkatDaerahId}&budgetYear=${encodeURIComponent(currentBudgetYear)}`;

      if (allKodeRekeningIds.size > 0) {
        const idsArray = Array.from(allKodeRekeningIds);
        queryParams += `&kodeRekeningIds=${idsArray.join(',')}`;
      }

      if (allAnggaranIds.size > 0) {
        const idsArray = Array.from(allAnggaranIds);
        queryParams += `&anggaranIds=${idsArray.join(',')}`;
      }

      console.log('Loading kontrak with query:', queryParams);

      // Load kontrak data from API
      const kontrakResponse = await APIUtils.request(`/api/kontrak?${queryParams}`);
      this.kontrakList = kontrakResponse.data || [];

      // Load related data for kontrak display (penyedia, paket kegiatan, etc.)
      await this.loadKontrakRelatedData();

      console.log('Kontrak data loaded:', this.kontrakList.length, 'kontrak found');

    } catch (error) {
      console.error('Error loading kontrak data:', error);
      // Don't show error for empty data - it's normal for new installations
      if (error.code === 500 || (error.response && error.response.status === 500)) {
        console.log('500 error received, but may be due to empty data - not showing error toast');
        this.kontrakList = [];
      } else {
        ToastUtils.error('Gagal memuat data kontrak');
        this.kontrakList = [];
      }
    }
  },

  // Load related data for kontrak display (penyedia, paket kegiatan, etc.)
  loadKontrakRelatedData: async function() {
    try {
      // Load penyedia data for kontrak display
      if (this.penyediaList.length === 0) {
        try {
          const penyediaResponse = await APIUtils.getAll('penyedia');
          this.penyediaList = penyediaResponse.data || [];
        } catch (error) {
          console.error('Error loading penyedia data for kontrak:', error);
          this.penyediaList = [];
        }
      }

      // Load paket kegiatan data for kontrak-paket relationship
      // This ensures we have the latest paket kegiatan data
      try {
        await this.loadPaketKegiatanData();
      } catch (error) {
        console.error('Error refreshing paket kegiatan data for kontrak:', error);
        // Don't fail completely if paket kegiatan fails to load
      }

      // Enrich kontrak data with related information
      this.kontrakList.forEach(kontrak => {
        // Add penyedia information if available
        if (kontrak.penyediaId) {
          const penyediaId = typeof kontrak.penyediaId === 'string'
            ? kontrak.penyediaId
            : kontrak.penyediaId._id || kontrak.penyediaId;
          const penyedia = this.penyediaList.find(p => p._id === penyediaId);
          if (penyedia) {
            kontrak.penyediaId = penyedia; // Replace ID with full penyedia object
          }
        }

        // Add paket kegiatan information if available
        if (kontrak.paketKegiatanId) {
          const paketId = typeof kontrak.paketKegiatanId === 'string'
            ? kontrak.paketKegiatanId
            : kontrak.paketKegiatanId._id || kontrak.paketKegiatanId;
          const paket = this.paketKegiatanList.find(p => p._id === paketId);
          if (paket) {
            kontrak.paketKegiatanId = paket; // Replace ID with full paket object
          }
        }
      });

    } catch (error) {
      console.error('Error loading related data for kontrak:', error);
      // Don't fail completely - kontrak data should still be displayed even without related data
    }
  },

  // Toggle accordion expansion
  toggleAccordion: function(subKegiatanId) {
    if (this.expandedAccordions.has(subKegiatanId)) {
      this.expandedAccordions.delete(subKegiatanId);
    } else {
      this.expandedAccordions.add(subKegiatanId);

      // Fetch kode rekening data when accordion is opened in ALL tabs (informasi, paket-kegiatan, pengadaan, kontrak)
      this.ensureKodeRekeningDataLoaded(subKegiatanId);
    }
    m.redraw();
  },

  // Toggle kode rekening accordion expansion
  toggleKodeRekeningAccordion: function(kodeRekeningId) {
    // Ensure kodeRekeningId is a string
    const id = typeof kodeRekeningId === 'string' ? kodeRekeningId :
               (kodeRekeningId && kodeRekeningId._id) ? kodeRekeningId._id :
               String(kodeRekeningId);
    
    if (this.expandedKodeRekeningAccordions.has(id)) {
      this.expandedKodeRekeningAccordions.delete(id);
    } else {
      this.expandedKodeRekeningAccordions.add(id);
    }
    m.redraw();
  },

  // Ensure kode rekening data is loaded for a specific subkegiatan
  ensureKodeRekeningDataLoaded: function(subKegiatanId) {
    console.log('=== DEBUG: ensureKodeRekeningDataLoaded called for subKegiatanId:', subKegiatanId);
    
    const allocations = this.getKodeRekeningAllocationsForSubKegiatan(subKegiatanId);
    console.log('=== DEBUG: Found allocations:', allocations.length);
    console.log('=== DEBUG: Allocation details:', allocations.map(a => ({
      anggaranId: a.anggaranId,
      kodeRekeningId: a.kodeRekeningId,
      isTemp: a.kodeRekeningId && a.kodeRekeningId._temp,
      kodeId: a.kodeRekeningId && a.kodeRekeningId._id
    })));
    
    const missingIds = allocations
      .filter(allocation => allocation.kodeRekeningId && allocation.kodeRekeningId._temp)
      .map(allocation => allocation.kodeRekeningId._id);

    console.log('=== DEBUG: Missing IDs found:', missingIds.length, missingIds);

    if (missingIds.length > 0) {
      console.log('Fetching missing kode rekening data for IDs:', missingIds);
      this.fetchMissingKodeRekeningData(missingIds, allocations);
    } else {
      console.log('=== DEBUG: No missing IDs found, checking if data needs refresh...');
      // Force a refresh anyway to ensure data is up to date
      const uniqueIds = allocations
        .filter(allocation => allocation.kodeRekeningId && allocation.kodeRekeningId._id)
        .map(allocation => allocation.kodeRekeningId._id);
      
      if (uniqueIds.length > 0) {
        console.log('=== DEBUG: Forcing refresh for IDs:', uniqueIds);
        this.fetchMissingKodeRekeningData(uniqueIds, allocations);
      }
    }
  },

  // Open modal for creating new pengadaan
  openCreateModal: function() {
    this.modalMode = 'create';
    this.formData = {
      subKegiatanId: '',
      kode: '',
      nama: '',
      deskripsi: '',
      budgetYear: this.formData.budgetYear || '2026-Murni',
      status: 'draft',
      estimatedBudget: 0,
      actualBudget: 0,
      startDate: '',
      endDate: '',
      location: ''
    };
    this.showModal = true;
    m.redraw();
  },

  // Close modal
  closeModal: function() {
    this.showModal = false;
    this.formData = {
      subKegiatanId: '',
      kode: '',
      nama: '',
      deskripsi: '',
      budgetYear: '2026-Murni',
      status: 'draft',
      estimatedBudget: 0,
      actualBudget: 0,
      startDate: '',
      endDate: '',
      location: ''
    };
    m.redraw();
  },

  // Save pengadaan
  savePengadaan: async function() {
    if (!this.formData.subKegiatanId || !this.formData.kode || !this.formData.nama || !this.formData.budgetYear) {
      ToastUtils.warning('SubKegiatan, kode, nama, dan tahun anggaran harus diisi');
      return;
    }

    this.isModalLoading = true;
    m.redraw();

    try {
      const userData = UserUtils.getUserData();
      const payload = {
        ...this.formData,
        subPerangkatDaerahId: userData.subPerangkatDaerahId,
        createdBy: userData.username,
        updatedBy: userData.username
      };

      await APIUtils.create('pengadaan', payload);
      this.closeModal();
      this.loadPengadaanData(); // Refresh data
    } catch (error) {
      console.error('Error saving pengadaan:', error);
      // Error handling is done by APIUtils
    }

    this.isModalLoading = false;
    m.redraw();
  },

  // Edit pengadaan
  editItem: function(item) {
    this.modalMode = 'edit';
    this.formData = {
      subKegiatanId: item.subKegiatanId?._id || item.subKegiatanId,
      kode: item.kode,
      nama: item.nama,
      deskripsi: item.deskripsi || '',
      budgetYear: item.budgetYear,
      status: item.status,
      estimatedBudget: item.estimatedBudget || 0,
      actualBudget: item.actualBudget || 0,
      startDate: item.startDate ? item.startDate.split('T')[0] : '',
      endDate: item.endDate ? item.endDate.split('T')[0] : '',
      location: item.location || ''
    };
    this.showModal = true;
    m.redraw();
  },

  // Delete pengadaan
  deleteItem: function(item) {
    APIUtils.delete('pengadaan', item._id, item.nama);
    // Refresh data after successful delete (handled by APIUtils)
    setTimeout(() => this.loadPengadaanData(), 1000);
  },

  // Edit paket kegiatan
  editPaketKegiatan: function(paket) {
    this.paketModalMode = 'edit';
    this.paketFormData = {
      _id: paket._id, // Add ID for updates
      anggaranId: paket.anggaranId?._id || paket.anggaranId,
      kodeRekeningId: paket.kodeRekeningId?._id || paket.kodeRekeningId,
      uraian: paket.uraian || '',
      volume: paket.volume || 1,
      satuan: paket.satuan || '',
      hargaSatuan: paket.hargaSatuan || 0,
      budgetYear: paket.budgetYear || '2026-Murni',
      deskripsi: paket.deskripsi || '',
      status: paket.status || 'draft'
    };
    this.showPaketModal = true;
    m.redraw();
  },

  // Delete paket kegiatan
  deletePaketKegiatan: async function(paket) {
    try {
      await APIUtils.delete('paketkegiatan', paket._id, paket.uraian);
      // Refresh data after successful delete
      await this.loadPaketKegiatanData();
    } catch (error) {
      console.error('Error deleting paket kegiatan:', error);
    }
  },

  // Edit kinerja info modal
  editKinerjaInfo: function(subKegiatanId) {
    // Find the kinerja record for this subkegiatan
    const kinerjaForSubKegiatan = this.kinerjaList.filter(k =>
      (k.subKegiatanId?._id || k.subKegiatanId) === subKegiatanId
    );

    if (kinerjaForSubKegiatan.length > 0) {
      const kinerja = kinerjaForSubKegiatan[0];
      this.editingKinerjaId = kinerja._id;
      this.kinerjaFormData = {
        lokasi: kinerja.lokasi || this.currentUser.subPerangkatDaerah?.perangkatDaerahId?.namaPemda || '',
        penggunaAnggaranId: kinerja.penggunaAnggaran?._id || kinerja.penggunaAnggaran || ''
      };
    } else {
      // If no kinerja exists, create default values
      this.editingKinerjaId = null;
      this.kinerjaFormData = {
        lokasi: this.currentUser.subPerangkatDaerah?.perangkatDaerahId?.namaPemda || '',
        penggunaAnggaranId: ''
      };
    }

    this.showKinerjaModal = true;
    m.redraw();
  },

  // Close kinerja modal
  closeKinerjaModal: function() {
    this.showKinerjaModal = false;
    this.editingKinerjaId = null;
    this.kinerjaFormData = {
      lokasi: '',
      penggunaAnggaranId: ''
    };
    m.redraw();
  },

  // Close paket modal
  closePaketModal: function() {
    this.showPaketModal = false;
    this.paketModalMode = 'create';
    this.paketFormData = {
      anggaranId: '',
      kodeRekeningId: '',
      uraian: '',
      volume: 1,
      satuan: '',
      hargaSatuan: 0,
      budgetYear: '',
      deskripsi: '',
      createdBy: '',
      updatedBy: ''
    };
    m.redraw();
  },

  // Open Target modal for creating/editing progress tracking
  openTargetModal: function(kontrak, target = null) {
    this.targetModalMode = target ? 'edit' : 'create';
    this.editingTargetId = target ? target._id : null;
    
    this.targetFormData = {
      kontrakId: kontrak._id,
      tanggal: target ? (target.tanggal ? target.tanggal.split('T')[0] : '') : '',
      targetFisik: target ? (target.targetFisik || 0) : 0,
      targetDana: target ? (target.targetDana || 0) : 0,
      targetDanaRp: target ? (target.targetDanaRp || 0) : 0,
      keterangan: target ? (target.keterangan || '') : ''
    };
    
    // Get kontrakt data for date validation
    this.currentKontrakForValidation = kontrak;
    
    this.showTargetModal = true;
    m.redraw();
  },

  // Edit target record
  editTarget: function(kontrak, target) {
    this.targetModalMode = 'edit';
    this.editingTargetId = target._id;
    this.targetFormData = {
      kontrakId: kontrak._id, // Ensure kontrakId is set
      tanggal: target.tanggal ? target.tanggal.split('T')[0] : '',
      targetFisik: target.targetFisik || 0,
      targetDana: target.targetDana || 0,
      targetDanaRp: target.targetDanaRp || 0,
      keterangan: target.keterangan || ''
    };
    this.currentKontrakForValidation = kontrak;
    console.log('Edit target - kontrakId:', kontrak._id, 'targetId:', target._id);
    this.showTargetModal = true;
    m.redraw();
  },

  // Delete target record
  deleteTarget: function(kontrak, targetId, targetTanggal) {
    const targetName = `Target Progress ${targetTanggal}`;
    
    // Show confirmation dialog
    showConfirmation(
      `Apakah Anda yakin ingin menghapus target progress ini?`,
      async () => {
        try {
          await APIUtils.delete('target', targetId, targetName);
          ToastUtils.success('Target progress berhasil dihapus');
          
          // Refresh target data for this kontrak
          await this.loadTargetData(kontrak._id);
          
          // Close any open modal
          if (this.showTargetModal) {
            this.closeTargetModal();
          }
          
          // Force redraw to show updated data
          m.redraw();
        } catch (error) {
          console.error('Error deleting target:', error);
          // Error handling is done by APIUtils
        }
      },
      () => {
        console.log('Penghapusan target progress dibatalkan');
      }
    );
  },

  // Close Target modal
  closeTargetModal: function() {
    this.showTargetModal = false;
    this.targetModalMode = 'create';
    this.editingTargetId = null;
    // Don't clear currentKontrakForValidation immediately to preserve context
    this.currentKontrakForValidation = null;
    this.targetFormData = {
      kontrakId: '',
      tanggal: '',
      targetFisik: 0,
      targetDana: 0,
      targetDanaRp: 0,
      keterangan: ''
    };
    // Force redraw to show updated data
    m.redraw();
  },

  // Close kontrak modal
  closeKontrakModal: function() {
    this.showKontrakModal = false;
    this.kontrakModalMode = 'create';
    this.kontrakFormData = {
      paketKegiatanId: '',
      kodeSirupLkpp: '',
      penyediaId: '',
      noKontrak: '',
      tglKontrak: '',
      noSpmk: '',
      tglSpmk: '',
      jangkaWaktu: 0,
      jangkaWaktuUnit: 'Hari',
      tglPelaksanaanDari: '',
      tglPelaksanaanSampai: '',
      lokasi: '',
      hps: 0,
      nilaiKontrak: 0,
      tipe: 'Konstruksi',
      metodePengadaanId: '',
      kualifikasiPengadaan: 'Prakualifikasi',
      budgetYear: '',
      deskripsi: ''
    };
    m.redraw();
  },

  // Calculate end date based on start date and duration
  calculateEndDate: function() {
    const { tglPelaksanaanDari, jangkaWaktu, jangkaWaktuUnit } = this.kontrakFormData;
    
    // Only calculate if start date and duration are provided
    if (!tglPelaksanaanDari || !jangkaWaktu || jangkaWaktu <= 0) {
      this.kontrakFormData.tglPelaksanaanSampai = '';
      m.redraw();
      return;
    }

    const startDate = new Date(tglPelaksanaanDari);
    if (isNaN(startDate.getTime())) {
      this.kontrakFormData.tglPelaksanaanSampai = '';
      m.redraw();
      return;
    }

    let endDate = new Date(startDate);
    
    // Add duration based on unit
    switch (jangkaWaktuUnit) {
      case 'Hari':
        endDate.setDate(endDate.getDate() + parseInt(jangkaWaktu));
        break;
      case 'Minggu':
        endDate.setDate(endDate.getDate() + (parseInt(jangkaWaktu) * 7));
        break;
      case 'Bulan':
        endDate.setMonth(endDate.getMonth() + parseInt(jangkaWaktu));
        break;
      case 'Tahun':
        endDate.setFullYear(endDate.getFullYear() + parseInt(jangkaWaktu));
        break;
      default:
        endDate.setDate(endDate.getDate() + parseInt(jangkaWaktu));
    }

    // Format date as YYYY-MM-DD for input field
    const formattedEndDate = endDate.toISOString().split('T')[0];
    this.kontrakFormData.tglPelaksanaanSampai = formattedEndDate;
    m.redraw();
  },

  // Get default lokasi from Informasi tab logic
  getDefaultLokasi: function(subKegiatanId) {
    // Find the kinerja record for this subkegiatan
    const kinerjaForSubKegiatan = this.kinerjaList.filter(kinerja =>
      (kinerja.subKegiatanId?._id || kinerja.subKegiatanId) === subKegiatanId
    );

    let lokasi = 'Tidak ditentukan';

    if (kinerjaForSubKegiatan.length > 0 && kinerjaForSubKegiatan[0].lokasi) {
      lokasi = kinerjaForSubKegiatan[0].lokasi;
    } else if (this.currentUser.subPerangkatDaerah?.perangkatDaerahId?.namaPemda) {
      // Clean up the namaPemda according to the rules (same as in Informasi tab)
      let namaPemda = this.currentUser.subPerangkatDaerah.perangkatDaerahId.namaPemda;

      if (namaPemda) {
        // Remove "Pemerintah" prefix if present
        namaPemda = namaPemda.replace(/^ Pemerintah\s+/, '');

        // Handle Pemkab/Pemkot abbreviations
        namaPemda = namaPemda.replace(/^Pemkab\s+/, 'Kabupaten ');
        // Handle Pemex/Pemkot abbreviations and standardize
        namaPemda = namaPemda.replace(/^Pemkab\s+/, 'Kabupaten ');
        namaPemda = namaPemda.replace(/^Pemkot\s+/, 'Kota ');

        // Additional standardization patterns
        namaPemda = namaPemda.replace(/^Kabupaten\s+([A-Za-z\s]+)/, 'Kabupaten $1');
        namaPemda = namaPemda.replace(/^Kota\s+([A-Za-z\s]+)/, 'Kota $1');
        namaPemda = namaPemda.replace(/^Pemkot\s+/, 'Kota ');
      }

      lokasi = namaPemda;
    }

    return lokasi;
  },

  // Get formatted location directly from user data (fallback function)
  getFormattedLocation: function() {
    if (this.currentUser.subPerangkatDaerah?.perangkatDaerahId?.namaPemda) {
      // Clean up the namaPemda according to the rules
      let namaPemda = this.currentUser.subPerangkatDaerah.perangkatDaerahId.namaPemda;

      // Debug: Log the original namaPemda
      console.log('Original namaPemda:', namaPemda);

      if (namaPemda) {
        // Comprehensive cleanup patterns
        // Remove various prefixes and problematic text
        namaPemda = namaPemda.replace(/^.*?(Kota|Kabupaten)\s+/, '$1 '); // Remove any text before "Kota" or "Kabupaten"
        namaPemda = namaPemda.replace(/^戊府\s+/, '');
        namaPemda = namaPemda.replace(/^ Pemerintah\s+/, '');
        namaPemda = namaPemda.replace(/^戴尔\s+/, 'Kabupaten ');
        namaPemda = namaPemda.replace(/^Pemkab\s+/, 'Kabupaten ');
        namaPemda = namaPemda.replace(/^Pemkot\s+/, 'Kota ');
        namaPemda = namaPemda.replace(/^Clinton\s+/, ''); // Remove Clinton prefix specifically
        namaPemda = namaPemda.replace(/^Democratic\s+/, ''); // Remove Democratic prefix
        namaPemda = namaPemda.replace(/^Democrats\s+/, ''); // Remove Democrats prefix

        // Additional standardization patterns
        namaPemda = namaPemda.replace(/^Kabupaten\s+([A-Za-z\s]+)/, 'Kabupaten $1');
        namaPemda = namaPemda.replace(/^Kota\s+([A-Za-z\s]+)/, 'Kota $1');
        namaPemda = namaPemda.replace(/^Pemkot\s+/, 'Kota ');

        // Debug: Log the cleaned namaPemda
        console.log('Cleaned namaPemda:', namaPemda);

        return namaPemda || 'Tidak ditentukan';
      }
    }
    
    return 'Tidak ditentukan';
  },

  // Render Tahapan Pekerjaan tabbed interface for each kontrak
  renderTahapanPekerjaanTabs: function(kontrak) {
    // Initialize tab state for this kontrak if not exists
    if (!this.tahapanPekerjaanTabs.has(kontrak._id)) {
      this.tahapanPekerjaanTabs.set(kontrak._id, {
        activeTab: this.defaultTahapanTab,
        formData: {}
      });
    }

    const kontrakTab = this.tahapanPekerjaanTabs.get(kontrak._id);
    const activeTab = kontrakTab.activeTab;

    return m('div', { class: 'mt-4' }, [
      // Tab Navigation
      m('div', { class: 'border-b border-gray-200' }, [
        m('nav', { class: 'flex space-x-8' }, [
          m('button', {
            class: `py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
              activeTab === 'informasi'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`,
            onclick: () => {
              const tab = this.tahapanPekerjaanTabs.get(kontrak._id);
              tab.activeTab = 'informasi';
              m.redraw();
            }
          }, [
            m('i', { class: 'ri-information-line mr-2' }),
            'Informasi'
          ]),
          m('button', {
            class: `py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
              activeTab === 'target'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`,
            onclick: () => {
              const tab = this.tahapanPekerjaanTabs.get(kontrak._id);
              tab.activeTab = 'target';
              
              // Set current kontrak for target data loading
              this.currentKontrakForTargetData = kontrak._id;
              
              // Load target data for this kontrak if not already loaded
              if (!this.targetTrackingData.has(kontrak._id)) {
                this.loadTargetData(kontrak._id);
              } else {
                // Update form data if we have cached data
                const cachedTargetData = this.targetTrackingData.get(kontrak._id);
                if (cachedTargetData && cachedTargetData.length > 0) {
                  // Target data is already loaded and displayed from cache
                }
              }
              
              m.redraw();
            }
          }, [
            m('i', { class: 'ri-target-fill mr-2' }),
            'Target'
          ]),
          m('button', {
            class: `py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
              activeTab === 'termin'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`,
            onclick: () => {
              const tab = this.tahapanPekerjaanTabs.get(kontrak._id);
              tab.activeTab = 'termin';
              
              // Set current kontrak for termin data loading
              this.currentKontrakForTermin = kontrak._id;
              
              // Load termin data for this kontrak if not already loaded
              if (!this.terminTrackingData.has(kontrak._id)) {
                this.loadTerminData(kontrak._id);
              } else {
                // Update form data if we have cached data
                const cachedTerminData = this.terminTrackingData.get(kontrak._id);
                if (cachedTerminData && cachedTerminData.length > 0) {
                  this.terminData = cachedTerminData;
                }
              }
              
              m.redraw();
            }
          }, [
            m('i', { class: 'ri-timer-line mr-2' }),
            'Termin'
          ]),
          m('button', {
            class: `py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
              activeTab === 'jaminan'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`,
            onclick: () => {
              const tab = this.tahapanPekerjaanTabs.get(kontrak._id);
              tab.activeTab = 'jaminan';
              
              // Set current kontrak for jaminan data loading
              this.currentKontrakForJaminan = kontrak._id;
              
              // Load jaminan data for this kontrak if not already loaded
              if (!this.jaminanTrackingData.has(kontrak._id)) {
                this.loadJaminanData(kontrak._id);
              } else {
                // Update form data if we have cached data
                const cachedJaminanData = this.jaminanTrackingData.get(kontrak._id);
                if (cachedJaminanData && cachedJaminanData.length > 0) {
                  this.jaminanData = cachedJaminanData;
                }
              }
              
              m.redraw();
            }
          }, [
            m('i', { class: 'ri-shield-check-line mr-2' }),
            'Jaminan'
          ])
        ])
      ]),

      // Tab Content
      m('div', { class: 'p-4' }, [
        activeTab === 'informasi' && m('div', { class: 'bg-white' }, [
          // Header
          m('div', { class: 'bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-t-lg' }, [
            m('div', { class: 'flex items-center space-x-3' }, [
              m('div', { class: 'w-10 h-10 bg-white bg-opacity-75 rounded-full flex items-center justify-center' }, [
                m('i', { class: 'ri-file-contract-fill text-lg' })
              ]),
              m('div', [
                m('h3', { class: 'text-lg font-bold' }, 'Informasi Kontrak'),
                m('p', { class: 'text-white text-opacity-80 text-sm' }, 'Detail informasi tahapan pekerjaan')
              ])
            ])
          ]),
          
          // Content
          m('div', { class: 'p-6 space-y-4' }, [
            // Row 1: No. Kontrak and Tgl. Kontrak
            m('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-4' }, [
              m('div', [
                m('label', { class: 'block text-sm font-semibold text-gray-700 mb-1' }, [
                  m('i', { class: 'ri-hashtag mr-1 text-blue-500' }),
                  'No. Kontrak'
                ]),
                m('div', { class: 'px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm font-mono text-gray-900' },
                  kontrak.noKontrak || 'N/A'
                )
              ]),
              m('div', [
                m('label', { class: 'block text-sm font-semibold text-gray-700 mb-1' }, [
                  m('i', { class: 'ri-calendar-line mr-1 text-green-500' }),
                  'Tgl. Kontrak'
                ]),
                m('div', { class: 'px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-900' },
                  kontrak.tglKontrak ? new Date(kontrak.tglKontrak).toLocaleDateString('id-ID') : 'N/A'
                )
              ])
            ]),
            
            // Row 2: Nama Penyedia and No. SPMK
            m('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-4' }, [
              m('div', [
                m('label', { class: 'block text-sm font-semibold text-gray-700 mb-1' }, [
                  m('i', { class: 'ri-building-line mr-1 text-purple-500' }),
                  'Nama Penyedia (Penyedia B/J)'
                ]),
                m('div', { class: 'px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-900' },
                  kontrak.penyediaId?.NamaVendor || 'N/A'
                )
              ]),
              m('div', [
                m('label', { class: 'block text-sm font-semibold text-gray-700 mb-1' }, [
                  m('i', { class: 'ri-file-text-line mr-1 text-orange-500' }),
                  'No. SPMK'
                ]),
                m('div', { class: 'px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm font-mono text-gray-900' },
                  kontrak.noSpmk || 'N/A'
                )
              ])
            ]),
            
            // Row 3: Tgl. SPMK and Tgl Pelaksanaan - selesai
            m('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-4' }, [
              m('div', [
                m('label', { class: 'block text-sm font-semibold text-gray-700 mb-1' }, [
                  m('i', { class: 'ri-calendar-check-line mr-1 text-indigo-500' }),
                  'Tgl. SPMK'
                ]),
                m('div', { class: 'px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-900' },
                  kontrak.tglSpmk ? new Date(kontrak.tglSpmk).toLocaleDateString('id-ID') : 'N/A'
                )
              ]),
              m('div', [
                m('label', { class: 'block text-sm font-semibold text-gray-700 mb-1' }, [
                  m('i', { class: 'ri-calendar-event-line mr-1 text-red-500' }),
                  'Tgl Pelaksanaan - selesai'
                ]),
                m('div', { class: 'px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-900' },
                  kontrak.tglPelaksanaanSampai ? new Date(kontrak.tglPelaksanaanSampai).toLocaleDateString('id-ID') : 'N/A'
                )
              ])
            ]),
            
            // Row 4: Lokasi Kegiatan and Nilai Kontrak
            m('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-4' }, [
              m('div', [
                m('label', { class: 'block text-sm font-semibold text-gray-700 mb-1' }, [
                  m('i', { class: 'ri-map-pin-line mr-1 text-teal-500' }),
                  'Lokasi Kegiatan'
                ]),
                m('div', { class: 'px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-900' },
                  kontrak.lokasi || 'N/A'
                )
              ]),
              m('div', [
                m('label', { class: 'block text-sm font-semibold text-gray-700 mb-1' }, [
                  m('i', { class: 'ri-money-dollar-circle-line mr-1 text-yellow-500' }),
                  'Nilai Kontrak'
                ]),
                m('div', { class: 'px-3 py-2 bg-green-50 border border-green-200 rounded-md text-sm font-bold text-green-800' },
                  `Rp ${kontrak.nilaiKontrak?.toLocaleString('id-ID') || '0'}`
                )
              ])
            ])
          ])
        ]),

        activeTab === 'target' && (() => {
          // Set current kontrak for target data loading (following termin pattern)
          this.currentKontrakForTargetData = kontrak._id;
          
          // Load target data for this kontrak if not already loaded
          if (!this.targetTrackingData.has(kontrak._id)) {
            this.loadTargetData(kontrak._id);
          }
          
          // Get current target data (either cached or loading)
          const targetData = this.targetTrackingData.get(kontrak._id) || [];
          
          return m('div', { class: 'space-y-4' }, [
            // Header with tambah button
            m('div', { class: 'flex justify-between items-center' }, [
              m('h4', { class: 'text-lg font-semibold text-gray-800 flex items-center' }, [
                m('i', { class: 'ri-target-line mr-2 text-blue-500' }),
                'Target Progress'
              ]),
              m('button', {
                class: 'px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center space-x-2',
                onclick: (e) => {
                  e.preventDefault();
                  this.openTargetModal(kontrak);
                }
              }, [
                m('i', { class: 'ri-add-line' }),
                m('span', 'Tambah Target')
              ])
            ]),

            // Contract period info for validation
            kontrak.tglPelaksanaanDari && kontrak.tglPelaksanaanSampai && m('div', {
              class: 'bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4'
            }, [
              m('div', { class: 'flex items-center text-sm text-blue-700' }, [
                m('i', { class: 'ri-information-line mr-2' }),
                'Periode Kontrak: ',
                m('span', { class: 'font-medium' }, new Date(kontrak.tglPelaksanaanDari).toLocaleDateString('id-ID')),
                m('span', { class: 'mx-1' }, '-'),
                m('span', { class: 'font-medium' }, new Date(kontrak.tglPelaksanaanSampai).toLocaleDateString('id-ID'))
              ])
            ]),

            // Target progress table
            m('div', { class: 'bg-white rounded-lg border border-gray-200 overflow-hidden' }, [
              m('table', { class: 'w-full' }, [
                m('thead', { class: 'bg-gray-50' }, [
                  m('tr', [
                    m('th', { class: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Tanggal'),
                    m('th', { class: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Target Fisik (%)'),
                    m('th', { class: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Target Dana (%)'),
                    m('th', { class: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Target Dana (Rp)'),
                    m('th', { class: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Keterangan'),
                    m('th', { class: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Aksi')
                  ])
                ]),
                m('tbody', { class: 'bg-white divide-y divide-gray-200' },
                  targetData.length > 0
                    ? targetData.map((target, index) => m('tr', { key: target._id || index }, [
                        m('td', { class: 'px-4 py-3 text-sm text-gray-900' }, new Date(target.tanggal).toLocaleDateString('id-ID')),
                        m('td', { class: 'px-4 py-3 text-sm text-gray-900' }, `${target.targetFisik || target.target_fisik || 0}%`),
                        m('td', { class: 'px-4 py-3 text-sm text-gray-900' }, `${target.targetDana || target.target_dana || 0}%`),
                        m('td', { class: 'px-4 py-3 text-sm text-gray-900' }, `Rp ${new Intl.NumberFormat('id-ID').format(target.targetDanaRp || target.target_dana_rp || 0)}`),
                        m('td', { class: 'px-4 py-3 text-sm text-gray-900' }, target.keterangan || '-'),
                        m('td', { class: 'px-4 py-3 text-sm' }, [
                          m('button', {
                            class: 'text-blue-600 hover:text-blue-800 text-sm font-medium mr-3',
                            onclick: (e) => {
                              e.preventDefault();
                              this.editTarget(kontrak, target);
                            }
                          }, [
                            m('i', { class: 'ri-edit-line mr-1' }),
                            'Edit'
                          ]),
                          m('button', {
                            class: 'text-red-600 hover:text-red-800 text-sm font-medium',
                            onclick: (e) => {
                              e.preventDefault();
                              this.deleteTarget(kontrak, target._id, target.tanggal);
                            }
                          }, [
                            m('i', { class: 'ri-delete-bin-line mr-1' }),
                            'Hapus'
                          ])
                        ])
                      ]))
                    : [m('tr', [
                        m('td', { class: 'px-4 py-8 text-center text-gray-500', colSpan: 6 }, [
                          m('i', { class: 'ri-target-line text-4xl text-gray-300 mb-2 block' }),
                          'Belum ada target progress',
                          m('div', { class: 'text-sm text-gray-400 mt-1' }, 'Klik "Tambah Target" untuk menambahkan target progress')
                        ])
                      ])]
                )
              ])
            ]),

            // Validation summary
            targetData.length > 0 && (() => {
              const totalFisik = targetData.reduce((sum, target) => sum + (target.targetFisik || target.target_fisik || 0), 0);
              const totalDana = targetData.reduce((sum, target) => sum + (target.targetDana || target.target_dana || 0), 0);
              const isValid = totalFisik === 100 && totalDana === 100;
              
              return m('div', {
                class: `rounded-lg p-3 mt-4 ${isValid
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-orange-50 border border-orange-200'
                }`
              }, [
                m('div', { class: 'flex items-start' }, [
                  m('i', {
                    class: `${isValid ? 'ri-check-line text-green-500' : 'ri-alert-line text-orange-500'} mr-2 mt-0.5`
                  }),
                  m('div', { class: 'text-sm' }, [
                    m('div', {
                      class: `font-medium mb-1 ${isValid ? 'text-green-700' : 'text-orange-700'}`
                    }, 'Status Validasi Target:'),
                    m('div', {
                      class: `${isValid ? 'text-green-600' : 'text-orange-600'}`
                    }, isValid
                      ? 'Target progress sudah mencapai 100% untuk fisik dan dana!'
                      : 'Target progress belum mencapai 100% untuk fisik dan dana'
                    ),
                    m('div', {
                      class: `mt-2 text-xs ${isValid ? 'text-green-600' : 'text-orange-600'}`
                    }, [
                      'Total Fisik: ',
                      m('span', { class: 'font-medium' }, `${totalFisik}%`),
                      ' | Total Dana: ',
                      m('span', { class: 'font-medium' }, `${totalDana}%`)
                    ])
                  ])
                ])
              ]);
            })(),

            // Validation notes
            m('div', { class: 'bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4' }, [
              m('div', { class: 'flex items-start' }, [
                m('i', { class: 'ri-warning-line text-amber-500 mr-2 mt-0.5' }),
                m('div', { class: 'text-sm text-amber-700' }, [
                  m('div', { class: 'font-medium mb-1' }, 'Catatan Validasi:'),
                  m('ul', { class: 'list-disc list-inside space-y-1' }, [
                    m('li', 'Tanggal target harus berada dalam periode kontrak'),
                    m('li', 'Target total harus mencapai 100% untuk fisik dan dana'),
                    m('li', 'Target dana dalam Rupiah akan dihitung otomatis dari persentase')
                  ])
                ])
              ])
            ])
          ]);
        })(),

        activeTab === 'termin' && (() => {
          // Set current kontrak for termin data loading
          this.currentKontrakForTermin = kontrak._id;
          
          // Load termin data for this kontrak if not already loaded
          if (!this.terminTrackingData.has(kontrak._id)) {
            this.loadTerminData(kontrak._id);
          }
          
          // Get current termin data (either cached or loading)
          const terminData = this.terminTrackingData.get(kontrak._id) || [];
          
          // Update the form data if we have saved data
          if (terminData.length > 0 && this.terminData.length === 0) {
            this.terminData = terminData;
          }
          
          // Initialize termin data for this kontrak if not exists
          if (!this.terminData) {
            this.terminData = [];
          }
          
          return m('div', { class: 'space-y-4' }, [
            // Header
            m('div', { class: 'flex justify-between items-center' }, [
              m('h4', { class: 'text-lg font-semibold text-gray-800 flex items-center' }, [
                m('i', { class: 'ri-timer-line mr-2 text-green-500' }),
                'Termin Pembayaran'
              ]),
              m('button', {
                class: 'px-4 py-2 bg-gradient-to-r from-green-500 to-teal-600 text-white text-sm font-medium rounded-lg hover:from-green-600 hover:to-teal-700 transition-all duration-200 flex items-center space-x-2',
                onclick: () => this.addTerminRow()
              }, [
                m('i', { class: 'ri-add-line' }),
                m('span', 'Tambah Termin')
              ])
            ]),

            // Contract value info for validation
            m('div', {
              class: 'bg-green-50 border border-green-200 rounded-lg p-3 mb-4'
            }, [
              m('div', { class: 'flex items-center text-sm text-green-700' }, [
                m('i', { class: 'ri-information-line mr-2' }),
                'Nilai Kontrak: ',
                m('span', { class: 'font-medium' }, `Rp ${(kontrak.nilaiKontrak || 0).toLocaleString('id-ID')}`)
              ])
            ]),

            // Termin table form
            m('div', { class: 'bg-white rounded-lg border border-gray-200 overflow-hidden' }, [
              m('table', { class: 'w-full' }, [
                m('thead', { class: 'bg-gray-50' }, [
                  m('tr', [
                    m('th', { class: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Termin'),
                    m('th', { class: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, '% Termin'),
                    m('th', { class: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Jumlah Dana (Rp)'),
                    m('th', { class: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, '% Progress'),
                    m('th', { class: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Aksi')
                  ])
                ]),
                m('tbody', { class: 'bg-white divide-y divide-gray-200' }, [
                  // Termin rows
                  this.terminData.length > 0 ? this.terminData.map((termin, index) =>
                    m('tr', { key: index }, [
                      m('td', { class: 'px-4 py-3' }, [
                        m('input', {
                          type: 'text',
                          class: 'w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-200',
                          value: termin.termin || '',
                          placeholder: 'I, II, Pertama, Kedua...',
                          oninput: (e) => {
                            termin.termin = e.target.value;
                            this.calculateTerminPercentages();
                            m.redraw();
                          }
                        })
                      ]),
                      m('td', { class: 'px-4 py-3' }, [
                        m('input', {
                          type: 'number',
                          class: 'w-full px-3 py-2 border border-gray-200 rounded text-sm bg-gray-50',
                          value: termin.terminPercent || 0,
                          readonly: true,
                          placeholder: '0'
                        })
                      ]),
                      m('td', { class: 'px-4 py-3' }, [
                        m('input', {
                          type: 'text',
                          class: 'w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-200',
                          value: termin.jumlahDana ? termin.jumlahDana.toLocaleString('id-ID') : '',
                          placeholder: '0',
                          oninput: (e) => {
                            const cleanValue = e.target.value.replace(/[^\d]/g, '');
                            termin.jumlahDana = parseInt(cleanValue) || 0;
                            e.target.value = termin.jumlahDana.toLocaleString('id-ID');
                            this.validateTerminTotals();
                            m.redraw();
                          }
                        })
                      ]),
                      m('td', { class: 'px-4 py-3' }, [
                        m('input', {
                          type: 'number',
                          min: '0',
                          max: '100',
                          step: '0.01',
                          class: 'w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-200',
                          value: termin.progressPercent || 0,
                          placeholder: '0-100',
                          oninput: (e) => {
                            termin.progressPercent = parseFloat(e.target.value) || 0;
                            this.validateTerminTotals();
                            m.redraw();
                          }
                        })
                      ]),
                      m('td', { class: 'px-4 py-3' }, [
                        m('button', {
                          class: 'text-red-600 hover:text-red-800 text-sm font-medium',
                          onclick: () => this.removeTerminRow(index)
                        }, [
                          m('i', { class: 'ri-delete-bin-line mr-1' }),
                          'Hapus'
                        ])
                      ])
                    ])
                  ) : [m('tr', [
                    m('td', { class: 'px-4 py-8 text-center text-gray-500', colSpan: 5 }, [
                      m('i', { class: 'ri-timer-line text-4xl text-gray-300 mb-2 block' }),
                      'Belum ada termin pembayaran',
                      m('div', { class: 'text-sm text-gray-400 mt-1' }, 'Klik "Tambah Termin" untuk menambahkan termin pembayaran')
                    ])
                  ])],

                  // Totals row
                  this.terminData.length > 0 && m('tr', { class: 'bg-gray-50 font-semibold' }, [
                    m('td', { class: 'px-4 py-3 text-sm text-gray-900' }, 'TOTAL'),
                    m('td', { class: 'px-4 py-3 text-sm text-gray-900' }, `${this.terminData.length} Termin`),
                    m('td', { class: 'px-4 py-3 text-sm text-gray-900' },
                      `Rp ${this.terminData.reduce((sum, t) => sum + (t.jumlahDana || 0), 0).toLocaleString('id-ID')}`
                    ),
                    m('td', { class: 'px-4 py-3 text-sm text-gray-900' },
                      `${this.terminData.reduce((sum, t) => sum + (t.progressPercent || 0), 0).toFixed(2)}%`
                    ),
                    m('td', { class: 'px-4 py-3 text-sm' }, '')
                  ])
                ])
              ])
            ]),

            // Validation messages
            m('div', { class: 'space-y-3 mt-4' }, [
              // Contract value validation
              (() => {
                const totalDana = this.terminData.reduce((sum, t) => sum + (t.jumlahDana || 0), 0);
                const contractValue = kontrak.nilaiKontrak || 0;
                const isValidDana = totalDana <= contractValue;
                
                return m('div', {
                  class: `rounded-lg p-3 ${isValidDana
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                  }`
                }, [
                  m('div', { class: 'flex items-start' }, [
                    m('i', {
                      class: `${isValidDana ? 'ri-check-line text-green-500' : 'ri-error-warning-line text-red-500'} mr-2 mt-0.5`
                    }),
                    m('div', { class: 'text-sm' }, [
                      m('div', {
                        class: `font-medium mb-1 ${isValidDana ? 'text-green-700' : 'text-red-700'}`
                      }, 'Validasi Jumlah Dana:'),
                      m('div', {
                        class: `${isValidDana ? 'text-green-600' : 'text-red-600'}`
                      }, `Total Jumlah Dana: Rp ${totalDana.toLocaleString('id-ID')} / Rp ${contractValue.toLocaleString('id-ID')}`),
                      !isValidDana && m('div', { class: 'text-red-600 text-xs mt-1' },
                        `Melebihi nilai kontrak sebesar Rp ${(totalDana - contractValue).toLocaleString('id-ID')}`
                      )
                    ])
                  ])
                ]);
              })(),

              // Progress validation
              (() => {
                const totalProgress = this.terminData.reduce((sum, t) => sum + (t.progressPercent || 0), 0);
                const isValidProgress = Math.abs(totalProgress - 100) < 0.01; // Allow small floating point error
                
                return m('div', {
                  class: `rounded-lg p-3 ${isValidProgress
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-orange-50 border border-orange-200'
                  }`
                }, [
                  m('div', { class: 'flex items-start' }, [
                    m('i', {
                      class: `${isValidProgress ? 'ri-check-line text-green-500' : 'ri-alert-line text-orange-500'} mr-2 mt-0.5`
                    }),
                    m('div', { class: 'text-sm' }, [
                      m('div', {
                        class: `font-medium mb-1 ${isValidProgress ? 'text-green-700' : 'text-orange-700'}`
                      }, 'Validasi Progress:'),
                      m('div', {
                        class: `${isValidProgress ? 'text-green-600' : 'text-orange-600'}`
                      }, `Total Progress: ${totalProgress.toFixed(2)}%`),
                      !isValidProgress && m('div', { class: 'text-orange-600 text-xs mt-1' },
                        totalProgress < 100
                          ? `Kurang ${(100 - totalProgress).toFixed(2)}% untuk mencapai 100%`
                          : `Lebih ${(totalProgress - 100).toFixed(2)}% dari 100%`
                      )
                    ])
                  ])
                ]);
              })()
            ]),

            // Save button
            this.terminData.length > 0 && m('div', { class: 'flex justify-end mt-6' }, [
              m('button', {
                class: `px-6 py-3 font-medium rounded-lg transition-all duration-200 flex items-center space-x-2 ${
                  this.isTerminValid()
                    ? 'bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`,
                onclick: () => this.saveTerminData(kontrak),
                disabled: !this.isTerminValid() || this.isSavingTermin
              }, [
                this.isSavingTermin ? m('i', { class: 'ri-loader-4-line animate-spin' }) : m('i', { class: 'ri-save-line' }),
                m('span', this.isSavingTermin ? 'Menyimpan...' : 'Simpan Semua Termin')
              ])
            ])
          ]);
        })(),

        activeTab === 'jaminan' && (() => {
          // Set current kontrak for jaminan data loading
          this.currentKontrakForJaminan = kontrak._id;
          
          // Load jaminan data for this kontrak if not already loaded
          if (!this.jaminanTrackingData.has(kontrak._id)) {
            this.loadJaminanData(kontrak._id);
          }
          
          // Get current jaminan data (either cached or loading)
          const jaminanData = this.jaminanTrackingData.get(kontrak._id) || [];
          
          // Update the form data if we have saved data
          if (jaminanData.length > 0 && this.jaminanData.length === 0) {
            this.jaminanData = jaminanData;
          }
          
          // Initialize jaminan data for this kontrak if not exists
          if (!this.jaminanData) {
            this.jaminanData = [];
          }
          
          return m('div', { class: 'space-y-4' }, [
            // Header
            m('div', { class: 'flex justify-between items-center' }, [
              m('h4', { class: 'text-lg font-semibold text-gray-800 flex items-center' }, [
                m('i', { class: 'ri-shield-check-line mr-2 text-purple-500' }),
                'Jaminan'
              ]),
              m('button', {
                class: 'px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all duration-200 flex items-center space-x-2',
                onclick: () => this.addJaminanRow(kontrak)
              }, [
                m('i', { class: 'ri-add-line' }),
                m('span', 'Tambah Jaminan')
              ])
            ]),

            // Contract period info for validation
            kontrak.tglPelaksanaanDari && kontrak.tglPelaksanaanSampai && m('div', {
              class: 'bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4'
            }, [
              m('div', { class: 'flex items-center text-sm text-purple-700' }, [
                m('i', { class: 'ri-information-line mr-2' }),
                'Periode Kontrak: ',
                m('span', { class: 'font-medium' }, new Date(kontrak.tglPelaksanaanDari).toLocaleDateString('id-ID')),
                m('span', { class: 'mx-1' }, '-'),
                m('span', { class: 'font-medium' }, new Date(kontrak.tglPelaksanaanSampai).toLocaleDateString('id-ID'))
              ])
            ]),

            // Jaminan table form
            m('div', { class: 'bg-white rounded-lg border border-gray-200 overflow-hidden' }, [
              m('table', { class: 'w-full' }, [
                m('thead', { class: 'bg-gray-50' }, [
                  m('tr', [
                    m('th', { class: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Nomor'),
                    m('th', { class: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Jenis'),
                    m('th', { class: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Tanggal Mulai'),
                    m('th', { class: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Tanggal Berakhir'),
                    m('th', { class: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Nilai (Rp)'),
                    m('th', { class: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Tanggal Terbit'),
                    m('th', { class: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Penerbit'),
                    m('th', { class: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Aksi')
                  ])
                ]),
                m('tbody', { class: 'bg-white divide-y divide-gray-200' }, [
                  // Jaminan rows
                  this.jaminanData.length > 0 ? this.jaminanData.map((jaminan, index) =>
                    m('tr', { key: index }, [
                      m('td', { class: 'px-4 py-3' }, [
                        m('input', {
                          type: 'text',
                          class: 'w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-200',
                          value: jaminan.nomor || '',
                          placeholder: 'Nomor jaminan',
                          oninput: (e) => {
                            jaminan.nomor = e.target.value;
                            m.redraw();
                          }
                        })
                      ]),
                      m('td', { class: 'px-4 py-3' }, [
                        m('select', {
                          class: 'w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-200',
                          value: jaminan.jenis || '',
                          onchange: (e) => {
                            jaminan.jenis = e.target.value;
                            m.redraw();
                          }
                        }, [
                          m('option', { value: '' }, 'Pilih Jenis'),
                          m('option', { value: 'Bank Garansi' }, 'Bank Garansi'),
                          m('option', { value: 'Surety Bond' }, 'Surety Bond'),
                          m('option', { value: 'Jaminan dari Lembaga Keuangan Non-Bank' }, 'Jaminan dari Lembaga Keuangan Non-Bank')
                        ])
                      ]),
                      m('td', { class: 'px-4 py-3' }, [
                        m('input', {
                          type: 'date',
                          class: 'w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-200',
                          value: jaminan.tanggalMulai || '',
                          oninput: (e) => {
                            jaminan.tanggalMulai = e.target.value;
                            m.redraw();
                          }
                        })
                      ]),
                      m('td', { class: 'px-4 py-3' }, [
                        m('input', {
                          type: 'date',
                          class: 'w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-200',
                          value: jaminan.tanggalBerakhir || '',
                          oninput: (e) => {
                            jaminan.tanggalBerakhir = e.target.value;
                            m.redraw();
                          }
                        })
                      ]),
                      m('td', { class: 'px-4 py-3' }, [
                        m('input', {
                          type: 'text',
                          class: 'w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-200',
                          value: jaminan.nilai ? jaminan.nilai.toLocaleString('id-ID') : '',
                          placeholder: '0',
                          oninput: (e) => {
                            const cleanValue = e.target.value.replace(/[^\d]/g, '');
                            jaminan.nilai = parseInt(cleanValue) || 0;
                            e.target.value = jaminan.nilai.toLocaleString('id-ID');
                            this.validateJaminanTotals();
                            m.redraw();
                          }
                        })
                      ]),
                      m('td', { class: 'px-4 py-3' }, [
                        m('input', {
                          type: 'date',
                          class: 'w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-200',
                          value: jaminan.tanggalTerbit || '',
                          oninput: (e) => {
                            jaminan.tanggalTerbit = e.target.value;
                            m.redraw();
                          }
                        })
                      ]),
                      m('td', { class: 'px-4 py-3' }, [
                        m('input', {
                          type: 'text',
                          class: 'w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-200',
                          value: jaminan.penerbit || '',
                          placeholder: 'Nama penerbit',
                          oninput: (e) => {
                            jaminan.penerbit = e.target.value;
                            m.redraw();
                          }
                        })
                      ]),
                      m('td', { class: 'px-4 py-3' }, [
                        m('button', {
                          class: 'text-red-600 hover:text-red-800 text-sm font-medium',
                          onclick: (e) => {
                            e.preventDefault();
                            // Call API delete directly to avoid double confirmation dialogs
                            const jaminanName = `Jaminan ${jaminan.nomor || index + 1}`;
                            
                            // Override APIUtils.delete success handler to refresh data
                            const originalDelete = APIUtils.delete;
                            APIUtils.delete = async (endpoint, id, name) => {
                              try {
                                await originalDelete.call(APIUtils, endpoint, id, name);
                                
                                // After successful deletion, refresh jaminan data
                                console.log('Refreshing jaminan data after deletion...');
                                this.jaminanTrackingData.delete(kontrak._id);
                                await this.loadJaminanData(kontrak._id);
                                m.redraw();
                              } catch (error) {
                                console.error('Error in delete with refresh:', error);
                                throw error; // Re-throw to maintain error handling
                              }
                            };
                            
                            APIUtils.delete('jaminan', jaminan._id, jaminanName);
                          }
                        }, [
                          m('i', { class: 'ri-delete-bin-line mr-1' }),
                          'Hapus'
                        ])
                      ])
                    ])
                  ) : [m('tr', [
                    m('td', { class: 'px-4 py-8 text-center text-gray-500', colSpan: 8 }, [
                      m('i', { class: 'ri-shield-check-line text-4xl text-gray-300 mb-2 block' }),
                      'Belum ada jaminan',
                      m('div', { class: 'text-sm text-gray-400 mt-1' }, 'Klik "Tambah Jaminan" untuk menambahkan jaminan')
                    ])
                  ])]
                ])
              ])
            ]),

            // Validation messages
            m('div', { class: 'space-y-3 mt-4' }, [
              // Contract value validation
              (() => {
                const totalNilai = this.jaminanData.reduce((sum, j) => sum + (j.nilai || 0), 0);
                const contractValue = kontrak.nilaiKontrak || 0;
                const isValidNilai = totalNilai <= contractValue;
                
                return m('div', {
                  class: `rounded-lg p-3 ${isValidNilai
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                  }`
                }, [
                  m('div', { class: 'flex items-start' }, [
                    m('i', {
                      class: `${isValidNilai ? 'ri-check-line text-green-500' : 'ri-error-warning-line text-red-500'} mr-2 mt-0.5`
                    }),
                    m('div', { class: 'text-sm' }, [
                      m('div', {
                        class: `font-medium mb-1 ${isValidNilai ? 'text-green-700' : 'text-red-700'}`
                      }, 'Validasi Nilai Jaminan:'),
                      m('div', {
                        class: `${isValidNilai ? 'text-green-600' : 'text-red-600'}`
                      }, `Total Nilai Jaminan: Rp ${totalNilai.toLocaleString('id-ID')} / Rp ${contractValue.toLocaleString('id-ID')}`),
                      !isValidNilai && m('div', { class: 'text-red-600 text-xs mt-1' },
                        `Melebihi nilai kontrak sebesar Rp ${(totalNilai - contractValue).toLocaleString('id-ID')}`
                      )
                    ])
                  ])
                ]);
              })()
            ]),

            // Save button
            this.jaminanData.length > 0 && m('div', { class: 'flex justify-end mt-6' }, [
              m('button', {
                class: `px-6 py-3 font-medium rounded-lg transition-all duration-200 flex items-center space-x-2 ${
                  this.isJaminanValid()
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`,
                onclick: () => this.saveJaminanData(kontrak),
                disabled: !this.isJaminanValid() || this.isSavingJaminan
              }, [
                this.isSavingJaminan ? m('i', { class: 'ri-loader-4-line animate-spin' }) : m('i', { class: 'ri-save-line' }),
                m('span', this.isSavingJaminan ? 'Menyimpan...' : 'Simpan Semua Jaminan')
              ])
            ]),

            // Validation notes
            m('div', { class: 'bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4' }, [
              m('div', { class: 'flex items-start' }, [
                m('i', { class: 'ri-information-line text-blue-500 mr-2 mt-0.5' }),
                m('div', { class: 'text-sm text-blue-700' }, [
                  m('div', { class: 'font-medium mb-1' }, 'Catatan Validasi Jaminan:'),
                  m('ul', { class: 'list-disc list-inside space-y-1' }, [
                    m('li', 'Tanggal terbit jaminan harus lebih awal dari tanggal mulai kontrak'),
                    m('li', 'Tanggal mulai jaminan default mengikuti tanggal mulai kontrak'),
                    m('li', 'Tanggal berakhir jaminan default mengikuti tanggal selesai kontrak'),
                    m('li', 'Tanggal mulai jaminan harus lebih awal dari tanggal berakhir jaminan'),
                    m('li', 'Nilai jaminan tidak boleh melebihi nilai kontrak')
                  ])
                ])
              ])
            ])
          ]);
        })()
      ])
    ]);
  },

  // Handle penyedia selection with auto-population
  onPenyediaChange: function() {
    const selectedPenyedia = this.penyediaList.find(p => p._id === this.kontrakFormData.penyediaId);
    if (selectedPenyedia) {
      this.kontrakFormData.pimpinanPenyedia = selectedPenyedia.NamaPimpinan || '';
      this.kontrakFormData.alamatPenyedia = selectedPenyedia.Alamat || '';
      this.kontrakFormData.telpPenyedia = selectedPenyedia.Telepon || '';
    } else {
      this.kontrakFormData.pimpinanPenyedia = '';
      this.kontrakFormData.alamatPenyedia = '';
      this.kontrakFormData.telpPenyedia = '';
    }
  },

  // Save paket kegiatan
  savePaketKegiatan: async function() {
    if (!this.paketFormData.anggaranId || !this.paketFormData.kodeRekeningId ||
        !this.paketFormData.uraian || this.paketFormData.volume <= 0 ||
        !this.paketFormData.satuan || this.paketFormData.hargaSatuan <= 0 ||
        !this.paketFormData.budgetYear) {
      ToastUtils.warning('Semua field harus diisi dengan benar');
      return;
    }

    // For edit mode, check if we're changing volume or hargaSatuan
    if (this.paketModalMode === 'edit') {
      // Get original paket to check if values changed
      const originalPaket = this.paketKegiatanList.find(p => p._id === this.paketFormData._id);
      if (originalPaket) {
        const originalJumlah = originalPaket.volume * originalPaket.hargaSatuan;
        const newJumlah = this.paketFormData.volume * this.paketFormData.hargaSatuan;

        // If jumlah changed, we need to validate budget
        if (newJumlah !== originalJumlah) {
          const allocation = this.getKodeRekeningAllocationsForSubKegiatan(this.selectedSubKegiatan)
            .find(alloc => alloc.kodeRekeningId._id === this.paketFormData.kodeRekeningId ||
                          alloc.kodeRekeningId === this.paketFormData.kodeRekeningId);

          if (allocation) {
            // Get existing paket jumlah for this kode rekening (excluding the current one being edited)
            const existingPaket = this.getPaketKegiatanForKodeRekening(this.paketFormData.kodeRekeningId)
              .filter(p => p._id !== this.paketFormData._id); // Exclude current paket being edited
            const totalExistingJumlah = existingPaket.reduce((total, paket) => total + (paket.jumlah || 0), 0);

            const newTotalJumlah = totalExistingJumlah + newJumlah;

            if (newTotalJumlah > allocation.amount) {
              const remainingBudget = allocation.amount - totalExistingJumlah;
              ToastUtils.warning(
                `Anggaran tidak mencukupi untuk perubahan ini. Jumlah yang dibutuhkan: Rp ${newJumlah.toLocaleString('id-ID')}. ` +
                `Sisa anggaran: Rp ${remainingBudget.toLocaleString('id-ID')}. ` +
                `Total yang akan terpakai: Rp ${newTotalJumlah.toLocaleString('id-ID')} (melebihi batas Rp ${allocation.amount.toLocaleString('id-ID')})`
              );
              return;
            }
          }
        }
      }
    }

    // Calculate jumlah for validation
    const calculatedJumlah = this.paketFormData.volume * this.paketFormData.hargaSatuan;

    // Get allocation data to check budget
    const allocation = this.getKodeRekeningAllocationsForSubKegiatan(this.selectedSubKegiatan)
      .find(alloc => alloc.kodeRekeningId._id === this.paketFormData.kodeRekeningId ||
                    alloc.kodeRekeningId === this.paketFormData.kodeRekeningId);

    if (allocation) {
      // Get existing paket jumlah for this kode rekening
      const existingPaket = this.getPaketKegiatanForKodeRekening(this.paketFormData.kodeRekeningId);
      const totalExistingJumlah = existingPaket.reduce((total, paket) => total + (paket.jumlah || 0), 0);

      const newTotalJumlah = totalExistingJumlah + calculatedJumlah;

      if (newTotalJumlah > allocation.amount) {
        const remainingBudget = allocation.amount - totalExistingJumlah;
        ToastUtils.warning(
          `Anggaran tidak mencukupi. Jumlah yang dibutuhkan: Rp ${calculatedJumlah.toLocaleString('id-ID')}. ` +
          `Sisa anggaran: Rp ${remainingBudget.toLocaleString('id-ID')}. ` +
          `Total yang akan terpakai: Rp ${newTotalJumlah.toLocaleString('id-ID')} (melebihi batas Rp ${allocation.amount.toLocaleString('id-ID')})`
        );
        return;
      }
    }

    this.isPaketModalLoading = true;
    m.redraw();

    try {
      const userData = UserUtils.getUserData();
      const payload = {
        ...this.paketFormData,
        subKegiatanId: this.selectedSubKegiatan,
        subPerangkatDaerahId: userData.subPerangkatDaerahId,
        createdBy: userData.username,
        updatedBy: userData.username
      };

      if (this.paketModalMode === 'create') {
        await APIUtils.create('paketkegiatan', payload);
        ToastUtils.success('Paket kegiatan berhasil dibuat');
      } else {
        // Implement edit functionality
        await APIUtils.update('paketkegiatan', this.paketFormData._id, payload);
        ToastUtils.success('Paket kegiatan berhasil diperbarui');
      }

      this.closePaketModal();
      console.log('Paket kegiatan saved successfully, refreshing data...');
      // Refresh data immediately after successful save
      await this.loadPaketKegiatanData();
      console.log('Data refreshed, paketKegiatanList length:', this.paketKegiatanList.length);
      // Force Mithril to redraw to ensure UI updates
      m.redraw();
      console.log('Mithril redraw called');
    } catch (error) {
      console.error('Error saving paket kegiatan:', error);
      // Error handling is done by APIUtils
    }

    this.isPaketModalLoading = false;
    m.redraw();
  },

  // Save kontrak
  saveKontrak: async function() {
    // Validate required fields
    if (!this.kontrakFormData.paketKegiatanId) {
      ToastUtils.warning('Paket Kegiatan harus dipilih');
      return;
    }

    if (!this.kontrakFormData.noKontrak) {
      ToastUtils.warning('Nomor Kontrak harus diisi');
      return;
    }

    // Check for duplicate contract number
    const isDuplicateKontrak = this.kontrakList.some(kontrak => {
      // Skip the current contract if we're editing (comparing with itself)
      if (this.kontrakModalMode === 'edit' && kontrak._id === this.kontrakFormData._id) {
        return false;
      }
      return kontrak.noKontrak && kontrak.noKontrak.trim().toLowerCase() === this.kontrakFormData.noKontrak.trim().toLowerCase();
    });

    if (isDuplicateKontrak) {
      ToastUtils.error(`Nomor Kontrak "${this.kontrakFormData.noKontrak}" sudah digunakan. Mohon gunakan nomor kontrak yang berbeda.`);
      return;
    }

    if (!this.kontrakFormData.tglKontrak) {
      ToastUtils.warning('Tanggal Kontrak harus diisi');
      return;
    }

    if (!this.kontrakFormData.noSpmk) {
      ToastUtils.warning('Nomor SPMK harus diisi');
      return;
    }

    if (!this.kontrakFormData.tglSpmk) {
      ToastUtils.warning('Tanggal SPMK harus diisi');
      return;
    }

    if (!this.kontrakFormData.jangkaWaktu) {
      ToastUtils.warning('Jangka Waktu harus diisi');
      return;
    }

    if (!this.kontrakFormData.penyediaId) {
      ToastUtils.warning('Penyedia harus dipilih');
      return;
    }

    if (!this.kontrakFormData.metodePengadaanId) {
      ToastUtils.warning('Metode Pengadaan harus dipilih');
      return;
    }

    if (!this.kontrakFormData.nilaiKontrak || this.kontrakFormData.nilaiKontrak <= 0) {
      ToastUtils.warning('Nilai Kontrak harus diisi dan lebih dari 0');
      return;
    }

    // Check allocation limits
    if (this.kontrakFormData.nilaiKontrak > this.currentAllocationInfo.remainingAllocation) {
      ToastUtils.warning(`Nilai kontrak melebihi sisa alokasi (Max: Rp ${this.currentAllocationInfo.remainingAllocation.toLocaleString('id-ID')})`);
      return;
    }

    // Add missing required fields validation
    if (!this.kontrakFormData.kodeSirupLkpp) {
      ToastUtils.warning('Kode SIRUP LKPP harus diisi');
      return;
    }

    if (!this.kontrakFormData.hps || this.kontrakFormData.hps <= 0) {
      ToastUtils.warning('HPS harus diisi dan lebih dari 0');
      return;
    }

    if (!this.kontrakFormData.tglPelaksanaanDari) {
      ToastUtils.warning('Tanggal Pelaksanaan (Dari) harus diisi');
      return;
    }

    if (!this.kontrakFormData.tglPelaksanaanSampai) {
      ToastUtils.warning('Tanggal Pelaksanaan (Sampai) harus diisi');
      return;
    }

    if (!this.kontrakFormData.lokasi) {
      ToastUtils.warning('Lokasi harus diisi');
      return;
    }

    // Add auto-populated fields from user context
    const userData = UserUtils.getUserData();
    this.kontrakFormData.subPerangkatDaerahId = userData.subPerangkatDaerahId;
    this.kontrakFormData.budgetYear = `${userData.budgetYear?.year || '2026'}-${userData.budgetYear?.status || 'Murni'}`;
    this.kontrakFormData.createdBy = userData.userId;
    this.kontrakFormData.updatedBy = userData.userId;
    
    // Ensure default values for fields that might not be set
    if (!this.kontrakFormData.jangkaWaktuUnit) {
      this.kontrakFormData.jangkaWaktuUnit = 'Hari';
    }
    
    if (!this.kontrakFormData.tipe) {
      this.kontrakFormData.tipe = 'Konstruksi';
    }
    
    if (!this.kontrakFormData.kualifikasiPengadaan) {
      this.kontrakFormData.kualifikasiPengadaan = 'Prakualifikasi';
    }

    this.isKontrakModalLoading = true;
    m.redraw();

    try {
      let response;
      if (this.kontrakModalMode === 'create') {
        response = await APIUtils.create('kontrak', this.kontrakFormData);
      } else {
        response = await APIUtils.update('kontrak', this.kontrakFormData._id, this.kontrakFormData);
      }

      console.log('Kontrak save response:', response);
      console.log('Response type:', typeof response);
      console.log('Response keys:', response ? Object.keys(response) : 'null');
      
      // APIUtils.create returns the data part, but we need to check success
      // Since API calls succeed when no error is thrown, we can assume success
      if (response) {
        ToastUtils.success(`Kontrak berhasil ${this.kontrakModalMode === 'create' ? 'disimpan' : 'diperbarui'}`);
        this.closeKontrakModal();
        console.log('Modal closed, new state:', this.showKontrakModal);
        // Refresh data to show updated contract count
        await this.loadKontrakData();
        await this.loadPengadaanData();
      } else {
        console.error('Save failed - no response data:', response);
      }
    } catch (error) {
      console.error('Error saving kontrak:', error);
      // Error handling is done by APIUtils
    }

    this.isKontrakModalLoading = false;
    m.redraw();
  },

  // Edit kontrak
  editKontrak: function(kontrak) {
    console.log('Editing kontrak:', kontrak);
    this.kontrakModalMode = 'edit';
    
    // Properly populate all form fields from the kontrak data
    this.kontrakFormData = {
      _id: kontrak._id,
      paketKegiatanId: kontrak.paketKegiatanId?._id || kontrak.paketKegiatanId || '',
      kodeSirupLkpp: kontrak.kodeSirupLkpp || '',
      penyediaId: kontrak.penyediaId?._id || kontrak.penyediaId || '',
      noKontrak: kontrak.noKontrak || '',
      tglKontrak: kontrak.tglKontrak ? kontrak.tglKontrak.split('T')[0] : '',
      noSpmk: kontrak.noSpmk || '',
      tglSpmk: kontrak.tglSpmk ? kontrak.tglSpmk.split('T')[0] : '',
      jangkaWaktu: kontrak.jangkaWaktu || 0,
      jangkaWaktuUnit: kontrak.jangkaWaktuUnit || 'Hari',
      tglPelaksanaanDari: kontrak.tglPelaksanaanDari ? kontrak.tglPelaksanaanDari.split('T')[0] : '',
      tglPelaksanaanSampai: kontrak.tglPelaksanaanSampai ? kontrak.tglPelaksanaanSampai.split('T')[0] : '',
      lokasi: kontrak.lokasi || '',
      hps: kontrak.hps || 0,
      nilaiKontrak: kontrak.nilaiKontrak || 0,
      tipe: kontrak.tipe || 'Konstruksi',
      metodePengadaanId: kontrak.metodePengadaanId?._id || kontrak.metodePengadaanId || '',
      kualifikasiPengadaan: kontrak.kualifikasiPengadaan || 'Prakualifikasi',
      budgetYear: kontrak.budgetYear || '',
      deskripsi: kontrak.deskripsi || ''
    };
    
    // Auto-populate penyedia fields if penyedia is selected
    if (this.kontrakFormData.penyediaId) {
      this.onPenyediaChange();
    }
    
    // Set context information for allocation display
    if (kontrak.paketKegiatanId) {
      const paketId = kontrak.paketKegiatanId?._id || kontrak.paketKegiatanId;
      const paketKegiatan = this.paketKegiatanList.find(p => p._id === paketId);
      if (paketKegiatan) {
        this.currentKontrakContext = {
          anggaranId: paketKegiatan.anggaranId?._id || paketKegiatan.anggaranId,
          kodeRekeningId: paketKegiatan.kodeRekeningId?._id || paketKegiatan.kodeRekeningId,
          subKegiatanId: paketKegiatan.subKegiatanId?._id || paketKegiatan.subKegiatanId
        };
        
        // Calculate allocation info for display
        const subKegiatanId = paketKegiatan.subKegiatanId?._id || paketKegiatan.subKegiatanId;
        const kodeRekeningId = paketKegiatan.kodeRekeningId?._id || paketKegiatan.kodeRekeningId;
        if (kodeRekeningId && subKegiatanId) {
          this.currentAllocationInfo = this.calculateAllocationInfoForKodeRekening(kodeRekeningId, subKegiatanId);
        }
      }
    }
    
    this.showKontrakModal = true;
    m.redraw();
  },

  // Delete kontrak (using APIUtils.delete for automatic confirmation dialog)
  deleteKontrak: async function(kontrak) {
    try {
      // APIUtils.delete() automatically shows confirmation dialog and handles all UX requirements
      await APIUtils.delete('kontrak', kontrak._id, kontrak.noKontrak);
      
      // Refresh data after successful deletion
      await this.loadKontrakData();
      await this.loadPengadaanData(); // Also refresh pengadaan data to update counts
    } catch (error) {
      // Error handling is already done by APIUtils, but we can log for debugging
      console.error('Delete kontrak error:', error);
    }
  },

  // Calculate target dana in Rupiah from percentage
  calculateTargetDanaRp: function(persentase) {
    if (!this.currentKontrakForValidation) return 0;
    const nilaiKontrak = this.currentKontrakForValidation.nilaiKontrak || 0;
    return Math.round((persentase / 100) * nilaiKontrak);
  },

  // Auto-update target dana Rp when percentage changes
  onTargetDanaChange: function() {
    const calculatedRp = this.calculateTargetDanaRp(this.targetFormData.targetDana);
    this.targetFormData.targetDanaRp = calculatedRp;
    m.redraw();
  },

  // Auto-update target dana Rp when Target fisik changes
  onTargetFisikChange: function() {
    // Auto-calculate if needed, but for now just trigger redraw
    m.redraw();
  },

  // Load target data for a specific kontrak
  loadTargetData: async function(kontrakId) {
    try {
      const response = await APIUtils.request(`/api/target/by-kontrak/${kontrakId}`);
      const targetData = response.data || [];
      this.targetTrackingData.set(kontrakId, targetData);
      console.log(`Loaded ${targetData.length} target entries for kontrak ${kontrakId}`);
      
      // Force redraw to update UI with new data
      m.redraw();
      
      return targetData;
    } catch (error) {
      console.error('Error loading target data for kontrak:', kontrakId, error);
      // Don't show error toast for empty data scenarios
      if (error.response && error.response.status === 404) {
        this.targetTrackingData.set(kontrakId, []);
        m.redraw(); // Force redraw even for empty state
        return [];
      }
      // For other errors, set empty array as fallback
      this.targetTrackingData.set(kontrakId, []);
      m.redraw(); // Force redraw for error state
      return [];
    }
  },

  // Compare termin values for sorting
  compareTermin: function(a, b) {
    // Convert termin values to comparable numbers
    const convertTerminToNumber = (termin) => {
      const terminStr = termin.toLowerCase().trim();
      
      // Roman numeral mapping
      const romanNumerals = {
        'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5,
        'vi': 6, 'vii': 7, 'viii': 8, 'ix': 9, 'x': 10,
        'xi': 11, 'xii': 12, 'xiii': 13, 'xiv': 14, 'xv': 15,
        'xvi': 16, 'xvii': 17, 'xviii': 18, 'xix': 19, 'xx': 20
      };
      
      // Regular numbers
      if (/^\d+$/.test(terminStr)) {
        return parseInt(terminStr);
      }
      
      // Roman numerals
      if (romanNumerals[terminStr]) {
        return romanNumerals[terminStr];
      }
      
      // Text descriptions (Pertama, Kedua, etc.) - assign sequential numbers
      const textTerms = {
        'pertama': 1, 'kedua': 2, 'ketiga': 3, 'keempat': 4, 'kelima': 5,
        'keenam': 6, 'ketujuh': 7, 'kedelapan': 8, 'kesembilan': 9, 'kesepuluh': 10,
        'awal': 1, 'akhir': 999, 'terakhir': 999
      };
      
      if (textTerms[terminStr]) {
        return textTerms[terminStr];
      }
      
      // Default: alphabetical sort for unknown termin types
      return terminStr.charCodeAt(0);
    };
    
    const aNum = convertTerminToNumber(a);
    const bNum = convertTerminToNumber(b);
    
    return aNum - bNum;
  },

  // Load termin data for a specific kontrak
  loadTerminData: async function(kontrakId) {
    try {
      const response = await APIUtils.request(`/api/termin/by-kontrak/${kontrakId}`);
      const terminData = response.data || [];
      
      // Transform database fields to form fields and sort
      const transformedData = terminData.map(termin => ({
        termin: termin.termin,
        terminPercent: termin.persentaseDana,
        jumlahDana: termin.jumlahDana,
        progressPercent: termin.progressPersen
      }));
      
      // Sort the transformed data by termin field
      transformedData.sort((a, b) => {
        return this.compareTermin(a.termin, b.termin);
      });
      
      this.terminTrackingData.set(kontrakId, transformedData);
      console.log(`Loaded ${terminData.length} termin entries for kontrak ${kontrakId}`);
      
      // Update current termin data for editing if this is the current kontrak
      if (this.currentKontrakForTermin === kontrakId) {
        this.terminData = transformedData;
      }
      
      // Force redraw to update UI with new data
      m.redraw();
      
      return transformedData;
    } catch (error) {
      console.error('Error loading termin data for kontrak:', kontrakId, error);
      // Don't show error toast for empty data scenarios
      if (error.response && error.response.status === 404) {
        this.terminTrackingData.set(kontrakId, []);
        if (this.currentKontrakForTermin === kontrakId) {
          this.terminData = [];
        }
        m.redraw(); // Force redraw even for empty state
        return [];
      }
      // For other errors, set empty array as fallback
      this.terminTrackingData.set(kontrakId, []);
      if (this.currentKontrakForTermin === kontrakId) {
        this.terminData = [];
      }
      m.redraw(); // Force redraw for error state
      return [];
    }
  },

  // Get target data for a specific kontrak (from cache or load if not exists)
  getTargetData: function(kontrakId) {
    if (!this.targetTrackingData.has(kontrakId)) {
      // Data not cached, load it asynchronously
      this.loadTargetData(kontrakId);
      // Return empty array with loading indicator
      return null; // Use null to indicate loading state
    }
    return this.targetTrackingData.get(kontrakId);
  },

  // Validate target date against kontrakt execution period
  validateTargetDate: function() {
    if (!this.targetFormData.tanggal || !this.currentKontrakForValidation) {
      return { valid: false, message: 'Tanggal target harus diisi' };
    }

    const targetDate = new Date(this.targetFormData.tanggal);
    const pelaksanaanStart = new Date(this.currentKontrakForValidation.tglPelaksanaanDari);
    const pelaksanaanEnd = new Date(this.currentKontrakForValidation.tglPelaksanaanSampai);

    if (isNaN(pelaksanaanStart.getTime()) || isNaN(pelaksanaanEnd.getTime())) {
      return { valid: false, message: 'Data tanggal pelaksanaan kontrak tidak lengkap' };
    }

    if (targetDate < pelaksanaanStart) {
      return { valid: false, message: 'Tanggal target tidak boleh lebih awal dari Tgl Pelaksanaan' };
    }

    if (targetDate > pelaksanaanEnd) {
      return { valid: false, message: 'Tanggal target tidak boleh lebih akhir dari Tgl Selesai' };
    }

    return { valid: true };
  },

  // Check if final target entry has 100% achievement
  validateFinalTarget: function() {
    const kontrakNilai = this.currentKontrakForValidation?.nilaiKontrak || 0;
    
    if (this.targetFormData.targetFisik === 100 || this.targetFormData.targetDana === 100) {
      if (this.targetFormData.targetFisik !== 100 || this.targetFormData.targetDana !== 100) {
        return {
          valid: false,
          message: 'Target akhir harus mencapai 100% untuk both fisik dan dana'
        };
      }
    }
    
    return { valid: true };
  },

  // Save Target
  saveTarget: async function() {
    // Validate required fields
    if (!this.targetFormData.tanggal) {
      ToastUtils.warning('Tanggal target harus diisi');
      return;
    }

    if (this.targetFormData.targetFisik <= 0 || this.targetFormData.targetDana <= 0) {
      ToastUtils.warning('Target fisik dan dana harus lebih dari 0%');
      return;
    }

    if (this.targetFormData.targetFisik > 100 || this.targetFormData.targetDana > 100) {
      ToastUtils.warning('Target fisik dan dana tidak boleh melebihi 100%');
      return;
    }

    // Validate target date against kontrakt execution period
    const dateValidation = this.validateTargetDate();
    if (!dateValidation.valid) {
      ToastUtils.warning(dateValidation.message);
      return;
    }

    // Validate final target if it's 100% (both fisik and dana must be 100%)
    if (this.targetFormData.targetFisik === 100 || this.targetFormData.targetDana === 100) {
      const finalValidation = this.validateFinalTarget();
      if (!finalValidation.valid) {
        ToastUtils.warning(finalValidation.message);
        return;
      }
    }

    if (!this.targetFormData.keterangan) {
      ToastUtils.warning('Keterangan harus diisi');
      return;
    }

    // Validate that Target Dana (Rp) is properly calculated or manually set
    if (this.targetFormData.targetDanaRp <= 0) {
      ToastUtils.warning('Target Dana (Rp) harus lebih dari 0');
      return;
    }

    this.isTargetModalLoading = true;
    m.redraw();

    try {
      const kontrakId = this.targetFormData.kontrakId; // Store kontrakId before closing modal
      const payload = {
        kontrakId: kontrakId,
        tanggal: this.targetFormData.tanggal,
        targetFisik: this.targetFormData.targetFisik,
        targetDana: this.targetFormData.targetDana,
        targetDanaRp: this.targetFormData.targetDanaRp,
        keterangan: this.targetFormData.keterangan,
        createdBy: this.currentUser.username,
        updatedBy: this.currentUser.username
      };

      if (this.targetModalMode === 'create') {
        await APIUtils.create('target', payload);
        ToastUtils.success('Target progress berhasil ditambahkan');
      } else {
        await APIUtils.update('target', this.editingTargetId, payload);
        ToastUtils.success('Target progress berhasil diperbarui');
      }

      // Clear the cached data FIRST, before closing modal
      this.targetTrackingData.delete(kontrakId);
      
      // Store kontrakId in a local variable to use after modal close
      const currentKontrakId = kontrakId;
      
      this.closeTargetModal();
      
      // Load fresh data with the stored kontrakId
      console.log(`Reloading target data for kontrak: ${kontrakId}`);
      await this.loadTargetData(kontrakId);
      
      // Force immediate redraw to show loading state
      m.redraw();
      
      // Additional redraw after a short delay to ensure data is loaded
      setTimeout(() => {
        console.log('Additional redraw after target save');
        m.redraw();
      }, 200);
       
    } catch (error) {
      console.error('Error saving target:', error);
      // Error handling is done by APIUtils
    }

    this.isTargetModalLoading = false;
    m.redraw();
  },

  // Add new termin row
  addTerminRow: function() {
    const terminNames = ['I', 'II', 'III', 'IV', 'V'];
    const existingCount = this.terminData.length;
    const terminName = terminNames[existingCount] || `Termin ${existingCount + 1}`;
    
    // Create new termin row
    const newTerminRow = {
      termin: terminName,
      terminPercent: 0,
      jumlahDana: 0,
      progressPercent: 0
    };
    
    // Add the new row to the array
    this.terminData.push(newTerminRow);
    
    // Sort the entire array to maintain proper order (I, II, III, IV, V, etc.)
    this.terminData.sort((a, b) => {
      return this.compareTermin(a.termin, b.termin);
    });
    
    // Recalculate percentages for all rows after sorting
    this.calculateTerminPercentages();
    m.redraw();
  },

  // Remove termin row
  removeTerminRow: function(index) {
    if (index >= 0 && index < this.terminData.length) {
      this.terminData.splice(index, 1);
      // Recalculate percentages for remaining rows
      this.calculateTerminPercentages();
      m.redraw();
    }
  },

  // Calculate termin percentages based on number of termin
  calculateTerminPercentages: function() {
    if (this.terminData.length === 0) return;
    
    const basePercent = Math.floor(100 / this.terminData.length);
    const remainder = 100 % this.terminData.length;
    
    this.terminData.forEach((termin, index) => {
      // Add 1% to first few termin if there's a remainder
      termin.terminPercent = basePercent + (index < remainder ? 1 : 0);
    });
    
    m.redraw();
  },

  // Validate termin totals
  validateTerminTotals: function() {
    // This method is called when user changes values
    // The actual validation happens in isTerminValid() and UI displays
    m.redraw();
  },

  // Check if termin data is valid for saving
  isTerminValid: function() {
    if (this.terminData.length === 0) return false;
    
    // Check if all rows have required data
    for (let termin of this.terminData) {
      if (!termin.termin || termin.termin.trim() === '') return false;
      if (termin.jumlahDana <= 0) return false;
      if (termin.progressPercent < 0 || termin.progressPercent > 100) return false;
    }
    
    // Check totals
    const totalDana = this.terminData.reduce((sum, t) => sum + (t.jumlahDana || 0), 0);
    const totalProgress = this.terminData.reduce((sum, t) => sum + (t.progressPercent || 0), 0);
    
    // Total progress should be 100%
    if (Math.abs(totalProgress - 100) > 0.01) return false;
    
    return true;
  },

  // Save termin data for kontrak
  saveTerminData: async function(kontrak) {
    if (!this.isTerminValid()) {
      ToastUtils.warning('Data termin tidak valid. Pastikan semua field terisi dan total progress 100%');
      return;
    }

    this.isSavingTermin = true;
    m.redraw();

    try {
      // Clear existing termin data for this kontrak first (to avoid duplicates)
      const existingTerminResponse = await APIUtils.request(`/api/termin/by-kontrak/${kontrak._id}`);
      const existingTermin = existingTerminResponse.data || [];
      
      // Delete existing termin data
      for (let termin of existingTermin) {
        await APIUtils.delete('termin', termin._id, `Termin ${termin.termin}`);
      }

      // Prepare payload for saving (map form fields to database fields)
      const terminPayloads = this.terminData.map(termin => ({
        kontrakId: kontrak._id,
        termin: termin.termin,
        persentaseDana: termin.terminPercent || termin.persentaseDana,
        jumlahDana: termin.jumlahDana,
        progressPersen: termin.progressPercent || termin.progressPersen,
        createdBy: this.currentUser.username,
        updatedBy: this.currentUser.username
      }));

      // Save all termin data
      for (let payload of terminPayloads) {
        await APIUtils.create('termin', payload);
      }

      // Clear the cached data FIRST, before clearing form
      this.terminTrackingData.delete(kontrak._id);
      
      // Store kontrakId in a local variable to use after form clear
      const currentKontrakId = kontrak._id;
      
      // Clear the form after successful save
      this.terminData = [];
      
      // Reload fresh data with the stored kontrakId
      console.log(`Reloading termin data for kontrak: ${kontrak._id}`);
      await this.loadTerminData(currentKontrakId);
      
      ToastUtils.success(`Data termin berhasil disimpan untuk kontrak ${kontrak.noKontrak}`);
      
      // Force immediate redraw to show loading state
      m.redraw();

    } catch (error) {
      console.error('Error saving termin data:', error);
      ToastUtils.error('Gagal menyimpan data termin');
      // Error handling is done by APIUtils
    }

    this.isSavingTermin = false;
    m.redraw();
  },

  // Save kinerja info
  saveKinerjaInfo: async function() {
    if (!this.editingKinerjaId) {
      ToastUtils.warning('Data kinerja tidak ditemukan');
      return;
    }

    this.isKinerjaModalLoading = true;
    m.redraw();

    try {
      await APIUtils.update('kinerja', this.editingKinerjaId, this.kinerjaFormData);
      this.closeKinerjaModal();
      this.loadInformasiData(); // Refresh data
    } catch (error) {
      console.error('Error saving kinerja info:', error);
      // Error handling is done by APIUtils
    }

    this.isKinerjaModalLoading = false;
    m.redraw();
  },

  // Add new jaminan row
  addJaminanRow: function(kontrak) {
    // Get kontrak dates for default values
    const kontrakStartDate = kontrak.tglPelaksanaanDari ? kontrak.tglPelaksanaanDari.split('T')[0] : '';
    const kontrakEndDate = kontrak.tglPelaksanaanSampai ? kontrak.tglPelaksanaanSampai.split('T')[0] : '';
    
    // Create new jaminan row with default dates from kontrak
    const newJaminanRow = {
      nomor: '',
      jenis: '',
      tanggalMulai: kontrakStartDate, // Default to kontrak start date
      tanggalBerakhir: kontrakEndDate, // Default to kontrak end date
      nilai: 0,
      tanggalTerbit: '', // User must set this manually (must be before kontrak start)
      penerbit: ''
    };
    
    // Add the new row to the array
    this.jaminanData.push(newJaminanRow);
    m.redraw();
  },

  // Delete jaminan record with API call
  deleteJaminan: function(kontrak, jaminanData, index) {
    const jaminanName = `Jaminan ${jaminanData.nomor || index + 1}`;
    
    // Show confirmation dialog
    showConfirmation(
      'Apakah Anda yakin ingin menghapus jaminan ini?',
      async () => {
        try {
          // Check if this is a saved record (has _id) or a new unsaved row
          if (jaminanData._id) {
            // Delete from API if it has an ID (saved record)
            await APIUtils.delete('jaminan', jaminanData._id, jaminanName);
            ToastUtils.success('Jaminan berhasil dihapus');
            
            // Clear the cached data and refresh
            this.jaminanTrackingData.delete(kontrak._id);
            
            // Reload fresh data
            await this.loadJaminanData(kontrak._id);
          } else {
            // Just remove from local array if no ID (unsaved row)
            this.removeJaminanRow(index);
            ToastUtils.success('Jaminan berhasil dihapus');
          }
          
          // Force redraw to show updated data
          m.redraw();
        } catch (error) {
          console.error('Error deleting jaminan:', error);
          // Error handling is done by APIUtils
        }
      },
      () => {
        console.log('Penghapusan jaminan dibatalkan');
      }
    );
  },

  // Remove jaminan row from local array only
  removeJaminanRow: function(index) {
    if (index >= 0 && index < this.jaminanData.length) {
      this.jaminanData.splice(index, 1);
      this.validateJaminanTotals();
      m.redraw();
    }
  },

  // Validate jaminan totals
  validateJaminanTotals: function() {
    // This method is called when user changes values
    // Perform real-time date validation if kontrak data is available
    if (this.jaminanData.length > 0 && this.currentKontrakForJaminan) {
      // Find the current kontrak data for validation
      const kontrak = this.kontrakList.find(k => k._id === this.currentKontrakForJaminan);
      if (kontrak) {
        // Validate dates for each row for real-time feedback
        let hasDateErrors = false;
        for (let jaminan of this.jaminanData) {
          if (jaminan.tanggalMulai && jaminan.tanggalBerakhir && jaminan.tanggalTerbit) {
            const dateValidation = this.validateJaminanDates(jaminan, kontrak);
            if (!dateValidation.valid) {
              hasDateErrors = true;
              break;
            }
          }
        }
        
        // Store validation state for UI feedback
        this.hasJaminanDateErrors = hasDateErrors;
      }
    }
    
    m.redraw();
  },

  // Check if jaminan data is valid for saving
  isJaminanValid: function() {
    if (this.jaminanData.length === 0) return false;
    
    // Check if all rows have required data
    for (let jaminan of this.jaminanData) {
      if (!jaminan.nomor || jaminan.nomor.trim() === '') return false;
      if (!jaminan.jenis || jaminan.jenis.trim() === '') return false;
      if (!jaminan.tanggalMulai || jaminan.tanggalMulai.trim() === '') return false;
      if (!jaminan.tanggalBerakhir || jaminan.tanggalBerakhir.trim() === '') return false;
      if (!jaminan.nilai || jaminan.nilai <= 0) return false;
      if (!jaminan.tanggalTerbit || jaminan.tanggalTerbit.trim() === '') return false;
      if (!jaminan.penerbit || jaminan.penerbit.trim() === '') return false;
    }
    
    return true;
  },

  // Validate jaminan dates against kontrak period
  validateJaminanDates: function(jaminan, kontrak) {
    const errors = [];
    
    if (!kontrak.tglPelaksanaanDari || !kontrak.tglPelaksanaanSampai) {
      errors.push('Data periode kontrak tidak lengkap untuk validasi tanggal jaminan');
      return { valid: false, errors };
    }
    
    const kontrakStart = new Date(kontrak.tglPelaksanaanDari);
    const kontrakEnd = new Date(kontrak.tglPelaksanaanSampai);
    const jaminanMulai = new Date(jaminan.tanggalMulai);
    const jaminanBerakhir = new Date(jaminan.tanggalBerakhir);
    const jaminanTerbit = new Date(jaminan.tanggalTerbit);
    
    // Validate tanggal terbit must be before kontrak start date
    if (jaminanTerbit >= kontrakStart) {
      errors.push('Tanggal terbit jaminan harus lebih awal dari tanggal mulai kontrak');
    }
    
    // Validate tanggal berlaku (mulai) should be before or equal to kontrak start
    if (jaminanMulai > kontrakStart) {
      errors.push('Tanggal mulai jaminan tidak boleh lebih akhir dari tanggal mulai kontrak');
    }
    
    // Validate tanggal berlaku (berakhir) should be after or equal to kontrak end
    if (jaminanBerakhir < kontrakEnd) {
      errors.push('Tanggal berakhir jaminan tidak boleh lebih awal dari tanggal selesai kontrak');
    }
    
    // Validate tanggal mulai harus sebelum tanggal berakhir
    if (jaminanMulai >= jaminanBerakhir) {
      errors.push('Tanggal mulai jaminan harus lebih awal dari tanggal berakhir jaminan');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  },

  // Load jaminan data for a specific kontrak
  loadJaminanData: async function(kontrakId) {
    try {
      const response = await APIUtils.request(`/api/jaminan/by-kontrak/${kontrakId}`);
      const jaminanData = response.data || [];
      
      // Transform database fields to form fields
      const transformedData = jaminanData.map(jaminan => ({
        _id: jaminan._id, // Preserve the ID for delete operations
        nomor: jaminan.nomor,
        jenis: jaminan.jenis,
        tanggalMulai: jaminan.tanggalMulai ? jaminan.tanggalMulai.split('T')[0] : '',
        tanggalBerakhir: jaminan.tanggalBerakhir ? jaminan.tanggalBerakhir.split('T')[0] : '',
        nilai: jaminan.nilai,
        tanggalTerbit: jaminan.tanggalTerbit ? jaminan.tanggalTerbit.split('T')[0] : '',
        penerbit: jaminan.penerbit
      }));
      
      this.jaminanTrackingData.set(kontrakId, transformedData);
      console.log(`Loaded ${jaminanData.length} jaminan entries for kontrak ${kontrakId}`);
      
      // Update current jaminan data for editing if this is the current kontrak
      if (this.currentKontrakForJaminan === kontrakId) {
        this.jaminanData = transformedData;
      }
      
      // Force redraw to update UI with new data
      m.redraw();
      
      return transformedData;
    } catch (error) {
      console.error('Error loading jaminan data for kontrak:', kontrakId, error);
      // Don't show error toast for empty data scenarios
      if (error.response && error.response.status === 404) {
        this.jaminanTrackingData.set(kontrakId, []);
        if (this.currentKontrakForJaminan === kontrakId) {
          this.jaminanData = [];
        }
        m.redraw(); // Force redraw even for empty state
        return [];
      }
      // For other errors, set empty array as fallback
      this.jaminanTrackingData.set(kontrakId, []);
      if (this.currentKontrakForJaminan === kontrakId) {
        this.jaminanData = [];
      }
      m.redraw(); // Force redraw for error state
      return [];
    }
  },

  // Save jaminan data for kontrak
  saveJaminanData: async function(kontrak) {
    if (!this.isJaminanValid()) {
      ToastUtils.warning('Data jaminan tidak valid. Pastikan semua field terisi dengan benar');
      return;
    }

    // Validate dates for each jaminan row
    for (let jaminan of this.jaminanData) {
      const dateValidation = this.validateJaminanDates(jaminan, kontrak);
      if (!dateValidation.valid) {
        ToastUtils.warning(`Validasi tanggal gagal untuk jaminan ${jaminan.nomor}: ${dateValidation.errors.join(', ')}`);
        return;
      }
    }

    this.isSavingJaminan = true;
    m.redraw();

    try {
      // Clear existing jaminan data for this kontrak first (to avoid duplicates)
      // Use direct API call instead of APIUtils.delete() to avoid confirmation dialogs during save
      const existingJaminanResponse = await APIUtils.request(`/api/jaminan/by-kontrak/${kontrak._id}`);
      const existingJaminan = existingJaminanResponse.data || [];

      // Delete existing jaminan data without confirmation dialogs (programmatic operation)
      for (let jaminan of existingJaminan) {
        await APIUtils.request(`/api/jaminan/${jaminan._id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${JWTUtils.getToken()}`
          }
        });
      }

      // Prepare payload for saving (map form fields to database fields)
      const jaminanPayloads = this.jaminanData.map(jaminan => ({
        kontrakId: kontrak._id,
        nomor: jaminan.nomor,
        jenis: jaminan.jenis,
        tanggalMulai: jaminan.tanggalMulai,
        tanggalBerakhir: jaminan.tanggalBerakhir,
        nilai: jaminan.nilai,
        tanggalTerbit: jaminan.tanggalTerbit,
        penerbit: jaminan.penerbit,
        createdBy: this.currentUser.username,
        updatedBy: this.currentUser.username
      }));

      // Save all jaminan data
      for (let payload of jaminanPayloads) {
        await APIUtils.create('jaminan', payload);
      }

      // Clear the cached data FIRST, before clearing form
      this.jaminanTrackingData.delete(kontrak._id);

      // Store kontrakId in a local variable to use after form clear
      const currentKontrakId = kontrak._id;

      // Clear the form after successful save
      this.jaminanData = [];

      // Reload fresh data with the stored kontrakId
      console.log(`Reloading jaminan data for kontrak: ${kontrak._id}`);
      await this.loadJaminanData(currentKontrakId);

      ToastUtils.success(`Data jaminan berhasil disimpan untuk kontrak ${kontrak.noKontrak}`);

      // Force immediate redraw to show loading state
      m.redraw();

    } catch (error) {
      console.error('Error saving jaminan data:', error);
      ToastUtils.error('Gagal menyimpan data jaminan');
      // Error handling is done by APIUtils
    }

    this.isSavingJaminan = false;
    m.redraw();
  },

  // Get kinerja for a specific subkegiatan
  getKinerjaForSubKegiatan: function(subKegiatanId) {
    return this.kinerjaList.filter(kinerja =>
      (kinerja.subKegiatanId?._id || kinerja.subKegiatanId) === subKegiatanId
    );
  },

  // Get anggaran for a specific subkegiatan
  getAnggaranForSubKegiatan: function(subKegiatanId) {
    return this.anggaranList.filter(anggaran =>
      (anggaran.subKegiatanId?._id || anggaran.subKegiatanId) === subKegiatanId
    );
  },

  // Get total budget amount for a specific subkegiatan
  getTotalBudgetForSubKegiatan: function(subKegiatanId) {
    const anggaranForSubKegiatan = this.getAnggaranForSubKegiatan(subKegiatanId);
    const total = anggaranForSubKegiatan.reduce((total, anggaran) => total + (anggaran.totalAmount || 0), 0);
    return total;
  },

  // Get pengadaan for a specific subkegiatan
  getPengadaanForSubKegiatan: function(subKegiatanId) {
    return this.pengadaanList.filter(pengadaan =>
      (pengadaan.subKegiatanId?._id || pengadaan.subKegiatanId) === subKegiatanId
    );
  },

  // Get paket kegiatan for a specific kode rekening
  getPaketKegiatanForKodeRekening: function(kodeRekeningId) {
    return this.paketKegiatanList.filter(paket =>
      (paket.kodeRekeningId?._id || paket.kodeRekeningId) === kodeRekeningId
    );
  },

  // Get kode rekening allocations for a specific anggaran and subkegiatan
  getKodeRekeningAllocations: function(anggaranId, subKegiatanId) {
    const anggaran = this.anggaranList.find(a => a._id === anggaranId);
    if (!anggaran || !anggaran.allocations) return [];

    return anggaran.allocations.filter(allocation =>
      allocation.kodeRekeningId && allocation.amount > 0
    );
  },

  // Get kode rekening allocations for a specific subkegiatan (across all anggaran)
  getKodeRekeningAllocationsForSubKegiatan: function(subKegiatanId) {
    const allocations = [];
    const missingKodeRekeningIds = new Set();

    this.anggaranList
      .filter(anggaran => (anggaran.subKegiatanId?._id || anggaran.subKegiatanId) === subKegiatanId)
      .forEach(anggaran => {
        if (anggaran.allocations) {
          anggaran.allocations.forEach(allocation => {
            if (allocation.kodeRekeningId && allocation.amount > 0) {
              // Ensure kodeRekeningId is properly populated with hierarchical data
              let kodeRekeningData = allocation.kodeRekeningId;

              // Check if kodeRekeningId is properly populated (object with data) or just an ID (string)
              if (typeof kodeRekeningData === 'string') {
                // Check if we have this data in cache first
                const cachedData = this.kodeRekeningCache.get(kodeRekeningData);
                if (cachedData) {
                  kodeRekeningData = cachedData;
                } else {
                  // If it's just an ID string and not in cache, collect it for bulk fetching
                  missingKodeRekeningIds.add(kodeRekeningData);
                  // Create a temporary object with the ID
                  kodeRekeningData = {
                    _id: kodeRekeningData,
                    code: 'Loading...',
                    name: 'Loading...',
                    fullCode: 'Loading...',
                    _temp: true // Mark as temporary
                  };
                }
              } else {
                // Ensure we have the necessary fields for display
                if (!kodeRekeningData.fullCode && kodeRekeningData.code) {
                  // If we have code but no fullCode, try to use code as fallback
                  kodeRekeningData.fullCode = kodeRekeningData.code;
                }
              }

              allocations.push({
                ...allocation,
                anggaranId: anggaran._id,
                subKegiatanId: subKegiatanId,
                kodeRekeningId: kodeRekeningData
              });
            }
          });
        }
      });

    // Auto-fetch data for kode rekening when allocations are created
    if (missingKodeRekeningIds.size > 0) {
      console.log('Auto-fetching kode rekening data for IDs:', Array.from(missingKodeRekeningIds));
      this.fetchMissingKodeRekeningData(Array.from(missingKodeRekeningIds), allocations);
    }

    return allocations;
  },

  // Fetch missing kode rekening data in bulk
  fetchMissingKodeRekeningData: async function(kodeRekeningIds, allocations) {
    try {
      console.log('Inside fetchMissingKodeRekeningData with IDs:', kodeRekeningIds);

      // Check cache first to avoid duplicate fetches
      const uncachedIds = kodeRekeningIds.filter(id => !this.kodeRekeningCache.has(id));

      if (uncachedIds.length === 0) {
        // All data is already cached, just update allocations
        allocations.forEach(allocation => {
          if (allocation.kodeRekeningId && allocation.kodeRekeningId._temp) {
            const kodeRekeningId = allocation.kodeRekeningId._id;
            const cachedData = this.kodeRekeningCache.get(kodeRekeningId);
            if (cachedData) {
              allocation.kodeRekeningId = cachedData;
            }
          }
        });
        console.log('All data cached, triggering redraw');
        m.redraw();
        return;
      }

      // Fetch only uncached data
      console.log('Making API call with uncachedIds:', uncachedIds);
      const koderekeningResponse = await APIUtils.request(`/api/koderekening?ids=${uncachedIds.join(',')}`);
      const kodeRekeningData = koderekeningResponse.data || [];
      console.log('API Response received:', kodeRekeningData);

      // Cache the fetched data
      kodeRekeningData.forEach(kr => {
        this.kodeRekeningCache.set(kr._id, {
          ...kr,
          fullCode: kr.fullCode || kr.code || 'XX'
        });
      });
      
      // Manage cache size to prevent memory leaks
      this.manageCacheSize();
      
      console.log('Cached data:', Array.from(this.kodeRekeningCache.entries()));

      // Update the allocations with the fetched data
      console.log('Before updating allocations:', allocations.map(a => ({ id: a.kodeRekeningId._id, temp: a.kodeRekeningId._temp })));
      allocations.forEach(allocation => {
        if (allocation.kodeRekeningId && allocation.kodeRekeningId._temp) {
          const kodeRekeningId = allocation.kodeRekeningId._id;
          const fetchedData = this.kodeRekeningCache.get(kodeRekeningId);

          if (fetchedData) {
            allocation.kodeRekeningId = fetchedData;
            console.log('Updated allocation for ID:', kodeRekeningId, 'with data:', fetchedData);
          } else {
            // If still not found, create fallback data and cache it
            const fallbackData = {
              _id: kodeRekeningId,
              code: 'XX',
              name: 'Data Not Found',
              fullCode: 'XX'
            };
            this.kodeRekeningCache.set(kodeRekeningId, fallbackData);
            allocation.kodeRekeningId = fallbackData;
            console.log('Using fallback data for ID:', kodeRekeningId);
          }
        }
      });
      
      // Manage cache size to prevent memory leaks
      this.manageCacheSize();
      
      console.log('After updating allocations:', allocations.map(a => ({ id: a.kodeRekeningId._id, name: a.kodeRekeningId.name })));

      // Force Mithril to re-render after updating the data
      console.log('Calling m.redraw() after API fetch');
      m.redraw();
      
    } catch (error) {
      console.error('Error fetching kode rekening data:', error);
      // Keep the fallback data if fetching fails
    }
  },

  // Manage cache size to prevent memory leaks
  manageCacheSize: function() {
    if (this.kodeRekeningCache.size > this.maxCacheSize) {
      const entriesToRemove = this.kodeRekeningCache.size - this.maxCacheSize;
      const keys = Array.from(this.kodeRekeningCache.keys());
      for (let i = 0; i < entriesToRemove; i++) {
        this.kodeRekeningCache.delete(keys[i]);
      }
      console.log(`Cache cleaned: removed ${entriesToRemove} entries, current size: ${this.kodeRekeningCache.size}`);
    }
  },

  // Get full hierarchical code for kode rekening (mimicking the subkegiatan pattern)
  getFullKodeRekeningCode: function(kodeRekening) {
    if (!kodeRekening) return 'XX';
    
    // Use fullCode from AkunLRA model if available, otherwise build from hierarchy
    if (kodeRekening.fullCode) {
      return kodeRekening.fullCode;
    }
    
    // If no fullCode, build from individual code components
    const codes = [];
    
    // Check if there's parent hierarchy data (like parent akun)
    if (kodeRekening.parentCode) {
      codes.push(kodeRekening.parentCode);
    }
    
    // Add the current code
    if (kodeRekening.code) {
      codes.push(kodeRekening.code);
    }
    
    return codes.length > 0 ? codes.join('.') : (kodeRekening.code || 'XX');
  },

  // Get formatted kode rekening display info
  getKodeRekeningDisplayInfo: function(kodeRekening) {
    if (!kodeRekening) {
      return {
        name: 'Loading...',
        code: 'Loading...',
        fullDisplay: 'Loading... - Loading...'
      };
    }

    const name = kodeRekening.name || kodeRekening.nama || 'Loading...';
    const code = this.getFullKodeRekeningCode(kodeRekening);
    const fullDisplay = `${code} - ${name}`;

    return { name, code, fullDisplay };
  },

  // Get total paket jumlah for subkegiatan
  getTotalPaketJumlahForSubKegiatan: function(subKegiatanId) {
    return this.paketKegiatanList
      .filter(paket => paket.subKegiatanId === subKegiatanId)
      .reduce((total, paket) => total + (paket.jumlah || 0), 0);
  },

  // Open paket modal for specific kode rekening
  openPaketModal: function(allocation) {
    if (allocation) {
      // When called with allocation, pre-fill form
      this.paketFormData.anggaranId = allocation.anggaranId;
      this.paketFormData.kodeRekeningId = allocation.kodeRekeningId._id || allocation.kodeRekeningId;
      this.selectedSubKegiatan = allocation.subKegiatanId;
    }

    // Set current budget year from UserUtils (only log once when modal opens)
    const budgetData = UserUtils.getBudgetYear();
    let budgetYearString = '2026-Murni';
    if (budgetData && typeof budgetData === 'object') {
      budgetYearString = `${budgetData.year || 2026}-${budgetData.status || 'Murni'}`;
    } else if (typeof budgetData === 'string') {
      budgetYearString = budgetData;
    }
    this.paketFormData.budgetYear = budgetYearString;

    this.paketModalMode = 'create';
    this.showPaketModal = true;
    m.redraw();
  },

  // Open kontrak modal for specific paket kegiatan
  openKontrakModal: async function(paketKegiatanId = null) {
    // Reset context
    this.currentKontrakContext = {
      anggaranId: null,
      kodeRekeningId: null,
      subKegiatanId: null
    };

    // Ensure paket kegiatan data is loaded before proceeding
    if (this.paketKegiatanList.length === 0) {
      console.log('Loading paket kegiatan data for kontrak modal...');
      try {
        await this.loadPaketKegiatanData();
      } catch (error) {
        console.error('Failed to load paket kegiatan data for kontrak modal:', error);
        ToastUtils.warning('Gagal memuat data paket kegiatan. Silakan coba lagi.');
        return;
      }
    }

    if (paketKegiatanId) {
      this.kontrakFormData.paketKegiatanId = paketKegiatanId;
      
      // Find the paket kegiatan and set context
      const paketKegiatan = this.paketKegiatanList.find(p => p._id === paketKegiatanId);
      if (paketKegiatan) {
        this.currentKontrakContext.anggaranId = paketKegiatan.anggaranId?._id || paketKegiatan.anggaranId;
        this.currentKontrakContext.kodeRekeningId = paketKegiatan.kodeRekeningId?._id || paketKegiatan.kodeRekeningId;
        this.currentKontrakContext.subKegiatanId = paketKegiatan.subKegiatanId?._id || paketKegiatan.subKegiatanId;
        
        // Set subKegiatanId for filtering if not already set
        if (!this.selectedSubKegiatan) {
          this.selectedSubKegiatan = this.currentKontrakContext.subKegiatanId;
        }
      }
    }

    // Get the subKegiatanId from either selectedSubKegiatan or from paket kegiatan data
    let subKegiatanId = this.selectedSubKegiatan;
    if (!subKegiatanId && paketKegiatanId) {
      // Try to get subKegiatanId from paket kegiatan data
      const paketKegiatan = this.paketKegiatanList.find(p => p._id === paketKegiatanId);
      if (paketKegiatan) {
        subKegiatanId = paketKegiatan.subKegiatanId;
      }
    }

    // Calculate allocation information for display
    if (this.currentKontrakContext.kodeRekeningId && subKegiatanId) {
      this.currentAllocationInfo = this.calculateAllocationInfoForKodeRekening(
        this.currentKontrakContext.kodeRekeningId,
        subKegiatanId
      );
    } else {
      // Reset allocation info if no context
      this.currentAllocationInfo = {
        totalAllocation: 0,
        usedAllocation: 0,
        remainingAllocation: 0
      };
    }

    // Set default lokasi with proper formatting
    if (subKegiatanId) {
      this.kontrakFormData.lokasi = this.getDefaultLokasi(subKegiatanId);
    } else {
      // Fallback: format location directly from user data
      this.kontrakFormData.lokasi = this.getFormattedLocation();
    }

    this.kontrakModalMode = 'create';
    this.showKontrakModal = true;
    m.redraw();
  },

  // Get kontrak for a specific paket kegiatan
  getKontrakForPaketKegiatan: function(paketKegiatanId) {
    return this.kontrakList.filter(kontrak =>
      (kontrak.paketKegiatanId?._id || kontrak.paketKegiatanId) === paketKegiatanId
    );
  },

  // Get kontrak for a specific kode rekening (across all paket kegiatan)
  getKontrakForKodeRekening: function(kodeRekeningId) {
    return this.kontrakList.filter(kontrak => {
      // First check if kontrak directly references kode rekening
      if (kontrak.kodeRekeningId === kodeRekeningId) {
        return true;
      }
      
      // Check if kontrak has paket kegiatan that references the kode rekening
      if (kontrak.paketKegiatanId) {
        const paketKodeRekeningId = kontrak.paketKegiatanId.kodeRekeningId?._id || kontrak.paketKegiatanId.kodeRekeningId;
        if (paketKodeRekeningId === kodeRekeningId) {
          return true;
        }
      }
      
      return false;
    });
  },

  // Calculate allocation information for a specific kode rekening
  calculateAllocationInfoForKodeRekening: function(kodeRekeningId, subKegiatanId) {
    // Get the allocation for this kode rekening
    const allocation = this.getKodeRekeningAllocationsForSubKegiatan(subKegiatanId)
      .find(alloc => {
        const allocKodeRekeningId = typeof alloc.kodeRekeningId === 'string'
          ? alloc.kodeRekeningId
          : alloc.kodeRekeningId._id || alloc.kodeRekeningId;
        return allocKodeRekeningId === kodeRekeningId;
      });

    if (!allocation) {
      return {
        totalAllocation: 0,
        usedAllocation: 0,
        remainingAllocation: 0
      };
    }

    const totalAllocation = allocation.amount;

    // Calculate used allocation from existing kontrak
    const kontrakForKodeRekening = this.getKontrakForKodeRekening(kodeRekeningId);
    const usedAllocation = kontrakForKodeRekening.reduce((total, kontrak) => total + (kontrak.nilaiKontrak || 0), 0);

    const remainingAllocation = Math.max(0, totalAllocation - usedAllocation);

    return {
      totalAllocation,
      usedAllocation,
      remainingAllocation
    };
  },

  // Get full hierarchical code for subkegiatan
  getFullCode: function(subKegiatan) {
    const codes = [];
    if (subKegiatan.kegiatanId?.programId?.bidangId?.urusanId?.kode) {
      codes.push(subKegiatan.kegiatanId.programId.bidangId.urusanId.kode);
    }
    if (subKegiatan.kegiatanId?.programId?.bidangId?.kode) {
      codes.push(subKegiatan.kegiatanId.programId.bidangId.kode);
    }
    if (subKegiatan.kegiatanId?.programId?.kode) {
      codes.push(subKegiatan.kegiatanId.programId.kode);
    }
    if (subKegiatan.kegiatanId?.kode) {
      codes.push(subKegiatan.kegiatanId.kode);
    }
    codes.push(subKegiatan.kode);
    return codes.join('.');
  },

  view: function() {
    // Check authentication and role
    if (!this.currentUser || this.currentUser.role !== 'operator') {
      return m('div', { class: 'flex justify-center items-center h-64' }, [
        m('div', { class: 'text-center' }, [
          m('i', { class: 'ri-shield-user-line text-6xl text-gray-400 mb-4' }),
          m('h3', { class: 'text-lg font-semibold text-gray-600' }, 'Akses Ditolak'),
          m('p', { class: 'text-gray-500' }, 'Halaman ini hanya dapat diakses oleh operator')
        ])
      ]);
    }

    return m('div', { class: 'space-y-6' }, [
      // Header with title
      m('div', { class: 'flex justify-between items-center' }, [
        m('div', [
          m('h1', { class: 'text-2xl font-bold text-gray-900' }, 'Pengadaan'),
          m('p', { class: 'text-gray-600 mt-1' }, `Unit Kerja: ${this.currentUser.subPerangkatDaerah?.nama || 'Tidak ditemukan'}`)
        ]),
        m('div', { class: 'flex items-center space-x-4' }, [
          m('button', {
            class: 'px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl',
            onclick: () => this.loadData()
          }, [
            m('i', { class: 'ri-refresh-line mr-2' }),
            'Refresh'
          ])
        ])
      ]),

      // Tab Navigation
      m('div', { class: 'bg-white rounded-lg shadow-sm border border-gray-200' }, [
        m('div', { class: 'border-b border-gray-200' }, [
          m('nav', { class: 'flex space-x-8 px-6', 'aria-label': 'Tabs' }, [
            m('button', {
              class: `py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                this.activeTab === 'informasi'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`,
              onclick: async () => {
                this.activeTab = 'informasi';
                this.expandedAccordions.clear(); // Reset accordions when switching tabs
                this.expandedKodeRekeningAccordions.clear(); // Reset kode rekening accordions when switching tabs
                m.redraw(); // Immediate UI update
                await this.loadInformasiData();
              }
            }, [
              m('i', { class: 'ri-information-line mr-2' }),
              'Informasi'
            ]),
             m('button', {
               class: `py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                 this.activeTab === 'paket-kegiatan'
                   ? 'border-blue-500 text-blue-600'
                   : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
               }`,
               onclick: async () => {
                 this.activeTab = 'paket-kegiatan';
                 this.expandedAccordions.clear(); // Reset accordions when switching tabs
                 this.expandedKodeRekeningAccordions.clear(); // Reset kode rekening accordions when switching tabs
                 m.redraw(); // Immediate UI update
                 await this.loadPaketKegiatanData();
               }
             }, [
               m('i', { class: 'ri-archive-line mr-2' }),
               'Paket Kegiatan'
             ]),
             m('button', {
               class: `py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                 this.activeTab === 'pengadaan'
                   ? 'border-blue-500 text-blue-600'
                   : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
               }`,
               onclick: async () => {
                 this.activeTab = 'pengadaan';
                 this.expandedAccordions.clear(); // Reset accordions when switching tabs
                 this.expandedKodeRekeningAccordions.clear(); // Reset kode rekening accordions when switching tabs
                 m.redraw(); // Immediate UI update
                 await this.loadPengadaanData();
               }
             }, [
               m('i', { class: 'ri-shopping-bag-line mr-2' }),
               'Kontrak Pengadaan'
             ]),
             m('button', {
               class: `py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                 this.activeTab === 'kontrak'
                   ? 'border-blue-500 text-blue-600'
                   : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
               }`,
               onclick: async () => {
                 this.activeTab = 'kontrak';
                 this.expandedAccordions.clear(); // Reset accordions when switching tabs
                 this.expandedKodeRekeningAccordions.clear(); // Reset kode rekening accordions when switching tabs
                 m.redraw(); // Immediate UI update
                 await this.loadKontrakData();
               }
             }, [
               m('i', { class: 'ri-file-contract-line mr-2' }),
               'Tahapan Pekerjaan'
             ])
          ])
        ]),

        // Tab Content
        m('div', { class: 'p-6' }, [
          // Loading indicator
          this.isLoading ?
            m('div', { class: 'flex justify-center items-center h-64' }, [
              m('div', { class: 'w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin' })
            ]) :

            // Tab 1: Informasi
            this.activeTab === 'informasi' ?
              m('div', { class: 'space-y-4' }, [
                this.subKegiatanList.length === 0 ?
                  m('div', { class: 'text-center py-12' }, [
                    m('div', { class: 'mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-4' }, [
                      m('i', { class: 'ri-information-fill text-blue-500' })
                    ]),
                    m('h3', { class: 'text-lg font-medium text-gray-900 mb-2' }, 'Belum ada data anggaran'),
                    m('p', { class: 'text-gray-500' }, 'Buat data anggaran terlebih dahulu untuk melihat informasi subkegiatan')
                  ]) :

                  this.subKegiatanList.map(subKegiatan =>
                    m('div', { class: 'border border-gray-200 rounded-lg' }, [
                      // Accordion Header
                      m('button', {
                        class: 'w-full flex justify-between items-center p-4 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors',
                        onclick: () => this.toggleAccordion(subKegiatan._id)
                      }, [
                        m('div', [
                          m('div', { class: 'flex items-center space-x-3' }, [
                            m('div', {
                              class: 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-center',
                              style: (this.expandedAccordions.has(subKegiatan._id) ? 'background-color: #3B82F6; color: white;' : 'background-color: #E5E7EB; color: #6B7280;') + ' overflow: hidden; white-space: nowrap; text-overflow: ellipsis;'
                            }, this.getFullCode(subKegiatan) || 'XX'),
                            m('div', [
                              m('h3', { class: 'font-semibold text-gray-900' }, subKegiatan.nama || 'Nama SubKegiatan'),
                              m('p', { class: 'text-xs text-gray-500 mt-0.5' }, this.getFullCode(subKegiatan) || 'XX')
                            ])
                          ])
                        ]),
                        m('div', { class: 'flex items-center space-x-2' }, [
                          m('span', {
                            class: `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              this.getAnggaranForSubKegiatan(subKegiatan._id).length > 0
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`
                          }, `Rp ${this.getTotalBudgetForSubKegiatan(subKegiatan._id).toLocaleString('id-ID')}`),
                          m('i', {
                            class: `ri-arrow-${this.expandedAccordions.has(subKegiatan._id) ? 'up' : 'down'}-line text-gray-400`
                          })
                        ])
                      ]),

                      // Accordion Content
                      this.expandedAccordions.has(subKegiatan._id) &&
                        m('div', { class: 'px-4 pb-4 border-t border-gray-200 bg-gray-50' }, [
                          m('div', { class: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4' }, [
                            // Kinerja Information
                            m('div', { class: 'bg-white rounded-lg p-4 border border-gray-200' }, [
                              m('div', { class: 'flex items-center mb-3' }, [
                                m('div', { class: 'w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-2' }, [
                                  m('i', { class: 'ri-bar-chart-line text-blue-600 text-sm' })
                                ]),
                                m('h4', { class: 'font-semibold text-gray-900' }, 'Kinerja')
                              ]),
                              m('div', { class: 'space-y-2' }, [
                                m('p', { class: 'text-sm text-gray-600' }, subKegiatan.kinerja || 'Tidak ada data kinerja'),
                                this.getKinerjaForSubKegiatan(subKegiatan._id).length > 0 &&
                                  m('div', { class: 'mt-2' }, [
                                    m('p', { class: 'text-xs text-gray-500 mb-1' }, `${this.getKinerjaForSubKegiatan(subKegiatan._id).length} target kinerja:`),
                                    this.getKinerjaForSubKegiatan(subKegiatan._id).slice(0, 3).map(kinerja =>
                                      m('div', { class: 'text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded mb-1' }, [
                                        `${kinerja.targetValue || 0} ${kinerja.subKegiatanId?.satuan || subKegiatan.satuan || 'unit'} (${kinerja.status || 'planning'})`
                                      ])
                                    ),
                                    this.getKinerjaForSubKegiatan(subKegiatan._id).length > 3 &&
                                      m('p', { class: 'text-xs text-gray-500' }, `... dan ${this.getKinerjaForSubKegiatan(subKegiatan._id).length - 3} lainnya`)
                                  ])
                              ])
                            ]),

                            // Indikator Information
                            m('div', { class: 'bg-white rounded-lg p-4 border border-gray-200' }, [
                              m('div', { class: 'flex items-center mb-3' }, [
                                m('div', { class: 'w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-2' }, [
                                  m('i', { class: 'ri-line-chart-line text-green-600 text-sm' })
                                ]),
                                m('h4', { class: 'font-semibold text-gray-900' }, 'Indikator')
                              ]),
                              m('p', { class: 'text-sm text-gray-600' }, subKegiatan.indikator || 'Tidak ada indikator')
                            ]),

                            // Satuan Information
                            m('div', { class: 'bg-white rounded-lg p-4 border border-gray-200' }, [
                              m('div', { class: 'flex items-center mb-3' }, [
                                m('div', { class: 'w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-2' }, [
                                  m('i', { class: 'ri-scales-line text-purple-600 text-sm' })
                                ]),
                                m('h4', { class: 'font-semibold text-gray-900' }, 'Satuan')
                              ]),
                              m('p', { class: 'text-sm text-gray-600' }, subKegiatan.satuan || 'Tidak ada satuan')
                            ])
                          ]),

                          // Anggaran Information
                          this.getAnggaranForSubKegiatan(subKegiatan._id).length > 0 &&
                            m('div', { class: 'mt-4 bg-white rounded-lg p-4 border border-gray-200' }, [
                              m('div', { class: 'flex items-center mb-3' }, [
                                m('div', { class: 'w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mr-2' }, [
                                  m('i', { class: 'ri-money-dollar-circle-line text-yellow-600 text-sm' })
                                ]),
                                m('h4', { class: 'font-semibold text-gray-900' }, 'Anggaran')
                              ]),
                              m('div', { class: 'space-y-2' }, [
                                this.getAnggaranForSubKegiatan(subKegiatan._id).map(anggaran =>
                                  m('div', { class: 'bg-yellow-50 border border-yellow-200 rounded p-3' }, [
                                    m('div', { class: 'flex justify-between items-center mb-2' }, [
                                      m('span', { class: 'text-sm font-medium text-gray-900' }, `Tahun: ${anggaran.budgetYear || 'Tidak ditentukan'}`),
                                      m('span', {
                                        class: 'px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800'
                                      }, `Rp ${(anggaran.totalAmount || 0).toLocaleString('id-ID')}`)
                                    ]),
                                    anggaran.allocations && anggaran.allocations.length > 0 &&
                                      m('div', { class: 'text-xs text-gray-600' }, [
                                        `${anggaran.allocations.length} alokasi kode rekening`
                                      ])
                                  ])
                                )
                              ])
                            ]),

                          // Lokasi and Pengguna Anggaran Information
                          m('div', { class: 'mt-4 bg-white rounded-lg p-4 border border-gray-200' }, [
                            m('div', { class: 'flex items-center justify-between mb-3' }, [
                              m('div', { class: 'flex items-center' }, [
                                m('div', { class: 'w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-2' }, [
                                  m('i', { class: 'ri-map-pin-line text-purple-600 text-sm' })
                                ]),
                                m('h4', { class: 'font-semibold text-gray-900' }, 'Informasi Tambahan')
                              ]),
                              m('button', {
                                class: 'px-3 py-1.5 bg-blue-500 text-white text-sm font-medium rounded hover:bg-blue-600 transition-colors',
                                onclick: () => this.editKinerjaInfo(subKegiatan._id)
                              }, 'Edit')
                            ]),
                            m('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-4' }, [
                              // Lokasi
                              m('div', { class: 'space-y-2' }, [
                                m('div', { class: 'text-xs text-gray-500 uppercase tracking-wide' }, 'Lokasi'),
                                (() => {
                                  const kinerjaForSubKegiatan = this.kinerjaList.filter(k =>
                                    (k.subKegiatanId?._id || k.subKegiatanId) === subKegiatan._id
                                  );
                                  let lokasi = 'Tidak ditentukan';

                                  if (kinerjaForSubKegiatan.length > 0 && kinerjaForSubKegiatan[0].lokasi) {
                                    lokasi = kinerjaForSubKegiatan[0].lokasi;
                                  } else if (this.currentUser.subPerangkatDaerah?.perangkatDaerahId?.namaPemda) {
                                    // Clean up the namaPemda according to the rules
                                    let namaPemda = this.currentUser.subPerangkatDaerah.perangkatDaerahId.namaPemda;
                                      // Handle、、 Pem八ab/Pemkot abbreviations and standardize
                                      namaPemda = namaPemda.replace(/^Pemkab\s+/, 'Kabupaten ');
                                      namaPemda = namaPemda.replace(/^Pemkot\s+/, 'Kota ');

                                      // Additional standardization patterns
                                      namaPemda = namaPemda.replace(/^Kabupaten\s+([A-Za-z\s]+)/, 'Kabupaten $1');
                                      namaPemda = namaPemda.replace(/^Kota\s+([A-Za-z\s]+)/, 'Kota $1');

                                    if (namaPemda) {
                                      // Remove "Pemerintah" prefix if present
                                      namaPemda = namaPemda.replace(/^Pemerintah\s+/, '');

                                      // Handle Pemkab/Pemkot abbreviations
                                      namaPemda = namaPemda.replace(/^Pemkab\s+/, 'Kabupaten ');
                                      namaPemda = namaPemda.replace(/^Pemkot\s+/, 'Kota ');
                                    }

                                    lokasi = namaPemda;
                                  } else {
                                    // Fallback: try to get from populated user data
                                    console.log('Current user data:', this.currentUser);
                                    console.log('SubPerangkatDaerah data:', this.currentUser.subPerangkatDaerah);
                                  }

                                  return m('div', { class: 'text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded' }, lokasi);
                                })()
                              ]),

                              // Pengguna Anggaran
                              m('div', { class: 'space-y-2' }, [
                                m('div', { class: 'text-xs text-gray-500 uppercase tracking-wide' }, 'Pengguna Anggaran'),
                                (() => {
                                  const kinerjaForSubKegiatan = this.kinerjaList.filter(k =>
                                    (k.subKegiatanId?._id || k.subKegiatanId) === subKegiatan._id
                                  );
                                  const penggunaAnggaran = kinerjaForSubKegiatan.length > 0 && kinerjaForSubKegiatan[0].penggunaAnggaran;
                                  let displayText = 'Tidak ditentukan';

                                  if (penggunaAnggaran) {
                                    displayText = `${penggunaAnggaran.nama} (${penggunaAnggaran.jabatanFungsional})`;
                                  } else if (this.pejabatList.length > 0) {
                                    // Default to first PA if no specific one is set
                                    const defaultPA = this.pejabatList[0];
                                    displayText = `${defaultPA.nama} (${defaultPA.jabatanFungsional})`;
                                  }

                                  return m('div', { class: 'text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded' }, displayText);
                                })()
                              ])
                            ])
                          ])
                        ])
                    ])
                  )
              ]) :

            // Tab 3: Paket Kegiatan
            this.activeTab === 'paket-kegiatan' ?
              m('div', { class: 'space-y-4' }, [
                this.subKegiatanList.length === 0 ?
                  m('div', { class: 'text-center py-12' }, [
                    m('div', { class: 'mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-4' }, [
                      m('i', { class: 'ri-archive-fill text-blue-500' })
                    ]),
                    m('h3', { class: 'text-lg font-medium text-gray-900 mb-2' }, 'Belum ada subkegiatan'),
                    m('p', { class: 'text-gray-500' }, 'Buat data anggaran terlebih dahulu untuk melihat paket kegiatan')
                  ]) :

                  this.subKegiatanList.map(subKegiatan =>
                    m('div', { class: 'border border-gray-200 rounded-lg' }, [
                      // Accordion Header
                      m('button', {
                        class: 'w-full flex justify-between items-center p-4 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors',
                        onclick: () => this.toggleAccordion(subKegiatan._id)
                      }, [
                        m('div', [
                          m('div', { class: 'flex items-center space-x-3' }, [
                            m('div', {
                              class: 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-center',
                              style: (this.expandedAccordions.has(subKegiatan._id) ? 'background-color: #8B5CF6; color: white;' : 'background-color: #E5E7EB; color: #6B7280;') + ' overflow: hidden; white-space: nowrap; text-overflow: ellipsis;'
                            }, this.getFullCode(subKegiatan) || 'XX'),
                            m('div', [
                              m('h3', { class: 'font-semibold text-gray-900' }, subKegiatan.nama || 'Nama SubKegiatan'),
                              m('p', { class: 'text-xs text-gray-500 mt-0.5' }, this.getFullCode(subKegiatan) || 'XX')
                            ])
                          ])
                        ]),
                        m('div', { class: 'flex items-center space-x-2' }, [
                          m('span', {
                            class: `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              this.getKodeRekeningAllocationsForSubKegiatan(subKegiatan._id).length > 0
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-gray-100 text-gray-800'
                            }`
                          }, `${this.getKodeRekeningAllocationsForSubKegiatan(subKegiatan._id).length} kode rekening`),
                          m('i', {
                            class: `ri-arrow-${this.expandedAccordions.has(subKegiatan._id) ? 'up' : 'down'}-line text-gray-400`
                          })
                        ])
                      ]),

                      // Accordion Content
                      this.expandedAccordions.has(subKegiatan._id) &&
                        m('div', { class: 'px-4 pb-4 border-t border-gray-200 bg-gray-50' }, [
                          m('div', { class: 'space-y-4 pt-4' }, [
                            this.getKodeRekeningAllocationsForSubKegiatan(subKegiatan._id).length === 0 ?
                              m('div', { class: 'text-center py-8' }, [
                                m('div', { class: 'mx-auto flex items-center justify-center h-10 w-10 rounded-full bg-gray-100 mb-3' }, [
                                  m('i', { class: 'ri-money-dollar-circle-fill text-blue-500' })
                                ]),
                                m('p', { class: 'text-sm text-gray-500 mb-3' }, 'Belum ada alokasi kode rekening untuk subkegiatan ini'),
                                m('p', { class: 'text-xs text-gray-400' }, 'Tambahkan alokasi kode rekening pada data anggaran')
                              ]) :

                              this.getKodeRekeningAllocationsForSubKegiatan(subKegiatan._id).map(allocation => {
                                const kodeRekeningId = typeof allocation.kodeRekeningId === 'string' ? allocation.kodeRekeningId : allocation.kodeRekeningId._id || allocation.kodeRekeningId;
                                const paketKegiatanForKodeRekening = this.getPaketKegiatanForKodeRekening(kodeRekeningId);
                                const totalPaketJumlah = paketKegiatanForKodeRekening.reduce((total, paket) => total + (paket.jumlah || 0), 0);

                                return m('div', { class: 'bg-white rounded-lg border border-gray-200 overflow-hidden' }, [
                                  // Kode Rekening Accordion Header (Level 2)
                                  m('button', {
                                    class: 'w-full flex justify-between items-center p-4 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors',
                                    onclick: () => this.toggleKodeRekeningAccordion(kodeRekeningId)
                                  }, [
                                    m('div', [
                                      // Display full hierarchical kode rekening like in Informasi tab
                                      (() => {
                                        const displayInfo = this.getKodeRekeningDisplayInfo(allocation.kodeRekeningId);
                                        return [
                                          m('h4', { class: 'font-semibold text-gray-900' }, displayInfo.name || 'Loading...'),
                                          m('p', { class: 'text-sm text-gray-500' }, displayInfo.code || 'Loading...')
                                        ];
                                      })()
                                    ]),
                                    m('div', { class: 'flex items-center space-x-2' }, [
                                      m('span', {
                                        class: 'inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800'
                                      }, `Rp ${allocation.amount.toLocaleString('id-ID')}`),
                                      m('span', {
                                        class: 'inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800'
                                      }, `${paketKegiatanForKodeRekening.length} paket`),
                                      m('i', {
                                        class: `ri-arrow-${this.expandedKodeRekeningAccordions.has(kodeRekeningId) ? 'up' : 'down'}-line text-gray-400`
                                      })
                                    ])
                                  ]),

                                  // Paket Kegiatan Content (Level 3) - Only show when kode rekening accordion is expanded
                                  this.expandedKodeRekeningAccordions.has(kodeRekeningId) && m('div', { class: 'border-t border-gray-200 bg-gray-50' }, [
                                    m('div', { class: 'p-4' }, [
                                      paketKegiatanForKodeRekening.length === 0 ?
                                        m('div', { class: 'text-center py-8' }, [
                                          m('div', { class: 'mx-auto flex items-center justify-center h-10 w-10 rounded-full bg-gray-100 mb-3' }, [
                                            m('i', { class: 'ri-inbox-fill text-blue-500' })
                                          ]),
                                          m('p', { class: 'text-sm text-gray-500 mb-3' }, 'Belum ada data Paket Kegiatan'),
                                          m('button', {
                                            class: 'px-3 py-1.5 bg-purple-500 text-white text-sm font-medium rounded hover:bg-purple-600 transition-colors',
                                            onclick: () => this.openPaketModal(allocation)
                                          }, 'Tambah Paket')
                                        ]) :

                                        m('div', [
                                          // Table Header with Add Button
                                          m('div', { class: 'flex justify-between items-center mb-4' }, [
                                            m('h5', { class: 'text-sm font-semibold text-gray-900' }, `Paket Kegiatan (${paketKegiatanForKodeRekening.length})`),
                                            m('button', {
                                              class: 'px-3 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-sm font-medium rounded hover:from-purple-600 hover:to-indigo-700 transition-all duration-200 flex items-center',
                                              onclick: () => this.openPaketModal(allocation)
                                            }, [
                                              m('i', { class: 'ri-add-line mr-1' }),
                                              'Tambah Paket'
                                            ])
                                          ]),

                                          // Table
                                          m('div', { class: 'overflow-x-auto' }, [
                                            m('table', { class: 'min-w-full divide-y divide-gray-200' }, [
                                              m('thead', { class: 'bg-gray-50' }, [
                                                m('tr', [
                                                  m('th', { class: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'No'),
                                                  m('th', { class: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Uraian'),
                                                  m('th', { class: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Volume'),
                                                  m('th', { class: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Satuan'),
                                                  m('th', { class: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Harga Satuan'),
                                                  m('th', { class: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Jumlah'),
                                                  m('th', { class: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Aksi')
                                                ])
                                              ]),
                                              m('tbody', { class: 'bg-white divide-y divide-gray-200' }, [
                                                paketKegiatanForKodeRekening.map((paket, index) =>
                                                         m('tr', { class: 'hover:bg-gray-50' }, [
                                                           m('td', { class: 'px-4 py-3 whitespace-nowrap' }, [
                                                             m('div', { class: 'text-sm font-medium text-gray-900' }, `${index + 1}.`),
                                                           ]),
                                                    m('td', { class: 'px-4 py-3' }, [
                                                      m('div', { class: 'text-sm font-medium text-gray-900' }, paket.uraian || '-')
                                                    ]),
                                                    m('td', { class: 'px-4 py-3 whitespace-nowrap' }, [
                                                      m('div', { class: 'text-sm text-gray-900' }, paket.volume?.toLocaleString('id-ID') || '0')
                                                    ]),
                                                    m('td', { class: 'px-4 py-3 whitespace-nowrap' }, [
                                                      m('div', { class: 'text-sm text-gray-900' }, paket.satuan || '-')
                                                    ]),
                                                    m('td', { class: 'px-4 py-3 whitespace-nowrap' }, [
                                                      m('div', { class: 'text-sm text-gray-900' }, `Rp ${paket.hargaSatuan?.toLocaleString('id-ID') || '0'}`)
                                                    ]),
                                                    m('td', { class: 'px-4 py-3 whitespace-nowrap' }, [
                                                      m('div', { class: 'text-sm font-medium text-gray-900' }, `Rp ${paket.jumlah?.toLocaleString('id-ID') || '0'}`)
                                                    ]),
                                                    m('td', { class: 'px-4 py-3 whitespace-nowrap text-sm font-medium' }, [
                                                      m('button', {
                                                        class: 'text-blue-600 hover:text-blue-900 mr-3',
                                                        onclick: () => this.editPaketKegiatan(paket)
                                                      }, 'Edit'),
                                                      m('button', {
                                                        class: 'text-red-600 hover:text-red-900',
                                                        onclick: () => this.deletePaketKegiatan(paket)
                                                      }, 'Hapus')
                                                    ])
                                                  ])
                                                )
                                              ])
                                            ])
                                          ])
                                        ])
                                    ])
                                  ])
                                ]);
                              })
                          ])
                        ])
                    ])
                  )
              ]) :

            // Tab 2: Pengadaan
            this.activeTab === 'pengadaan' ?
              m('div', { class: 'space-y-4' }, [
                this.subKegiatanList.length === 0 ?
                  m('div', { class: 'text-center py-12' }, [
                     m('div', { class: 'mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-4' }, [
                       m('i', { class: 'ri-shopping-bag-fill text-blue-500' })
                     ]),
                     m('h3', { class: 'text-lg font-medium text-gray-900 mb-2' }, 'Belum ada subkegiatan'),
                     m('p', { class: 'text-gray-500' }, 'Buat data anggaran terlebih dahulu untuk mengelola pengadaan')
                  ]) :

                  this.subKegiatanList.map(subKegiatan =>
                    m('div', { class: 'border border-gray-200 rounded-lg' }, [
                      // Accordion Header
                      m('button', {
                        class: 'w-full flex justify-between items-center p-4 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors',
                        onclick: () => this.toggleAccordion(subKegiatan._id)
                      }, [
                        m('div', [
                          m('div', { class: 'flex items-center space-x-3' }, [
                            m('div', {
                              class: 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-center',
                              style: (this.expandedAccordions.has(subKegiatan._id) ? 'background-color: #10B981; color: white;' : 'background-color: #E5E7EB; color: #6B7280;') + ' overflow: hidden; white-space: nowrap; text-overflow: ellipsis;'
                            }, this.getFullCode(subKegiatan) || 'XX'),
                            m('div', [
                              m('h3', { class: 'font-semibold text-gray-900' }, subKegiatan.nama || 'Nama SubKegiatan'),
                              m('p', { class: 'text-xs text-gray-500 mt-0.5' }, this.getFullCode(subKegiatan) || 'XX')
                            ])
                          ])
                        ]),
                        m('div', { class: 'flex items-center space-x-2' }, [
                          m('span', {
                            class: `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              this.getKodeRekeningAllocationsForSubKegiatan(subKegiatan._id).length > 0
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`
                          }, `${this.getKodeRekeningAllocationsForSubKegiatan(subKegiatan._id).length} kode rekening`),
                          m('i', {
                            class: `ri-arrow-${this.expandedAccordions.has(subKegiatan._id) ? 'up' : 'down'}-line text-gray-400`
                          })
                        ])
                      ]),

                      // Accordion Content - Kode Rekening Accordions
                      this.expandedAccordions.has(subKegiatan._id) &&
                        m('div', { class: 'px-4 pb-4 border-t border-gray-200 bg-gray-50' }, [
                          m('div', { class: 'space-y-4 pt-4' }, [
                            this.getKodeRekeningAllocationsForSubKegiatan(subKegiatan._id).length === 0 ?
                              m('div', { class: 'text-center py-8' }, [
                                m('div', { class: 'mx-auto flex items-center justify-center h-10 w-10 rounded-full bg-gray-100 mb-3' }, [
                                  m('i', { class: 'ri-money-dollar-circle-fill text-blue-500' })
                                ]),
                                m('p', { class: 'text-sm text-gray-500 mb-3' }, 'Belum ada alokasi kode rekening untuk subkegiatan ini'),
                                m('p', { class: 'text-xs text-gray-400' }, 'Tambahkan alokasi kode rekening pada data anggaran')
                              ]) :

                              this.getKodeRekeningAllocationsForSubKegiatan(subKegiatan._id).map(allocation => {
                                const kodeRekeningId = typeof allocation.kodeRekeningId === 'string' ? allocation.kodeRekeningId : allocation.kodeRekeningId._id || allocation.kodeRekeningId;
                                const paketKegiatanForKodeRekening = this.getPaketKegiatanForKodeRekening(kodeRekeningId);
                                const kontrakForKodeRekening = this.getKontrakForKodeRekening(kodeRekeningId);

                                return m('div', { class: 'bg-white rounded-lg border border-gray-200 overflow-hidden' }, [
                                  // Kode Rekening Accordion Header (Level 2)
                                  m('button', {
                                    class: 'w-full flex justify-between items-center p-4 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors',
                                    onclick: () => this.toggleKodeRekeningAccordion(kodeRekeningId)
                                  }, [
                                    m('div', [
                                      // Display full hierarchical kode rekening
                                      (() => {
                                        const displayInfo = this.getKodeRekeningDisplayInfo(allocation.kodeRekeningId);
                                        return [
                                          m('h4', { class: 'font-semibold text-gray-900' }, displayInfo.name || 'Loading...'),
                                          m('p', { class: 'text-sm text-gray-500' }, displayInfo.code || 'Loading...')
                                        ];
                                      })()
                                    ]),
                                    m('div', { class: 'flex items-center space-x-2' }, [
                                      m('span', {
                                        class: 'inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800'
                                      }, `Rp ${allocation.amount.toLocaleString('id-ID')}`),
                                      m('span', {
                                        class: 'inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800'
                                      }, `${paketKegiatanForKodeRekening.length} paket`),
                                      m('span', {
                                        class: 'inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800'
                                      }, `${kontrakForKodeRekening.length} kontrak`),
                                      m('i', {
                                        class: `ri-arrow-${this.expandedKodeRekeningAccordions.has(kodeRekeningId) ? 'up' : 'down'}-line text-gray-400`
                                      })
                                    ])
                                  ]),

                                  // Kontrak Content (Level 3) - Only show when kode rekening accordion is expanded
                                  this.expandedKodeRekeningAccordions.has(kodeRekeningId) && m('div', { class: 'border-t border-gray-200 bg-gray-50' }, [
                                    m('div', { class: 'p-4' }, [
                                      // Show kontrak directly - paket kegiatan management is in Paket Kegiatan tab
                                      kontrakForKodeRekening.length === 0 ?
                                        m('div', { class: 'text-center py-6 border-2 border-dashed border-gray-300 rounded-lg' }, [
                                          m('i', { class: 'ri-file-contract-line text-2xl text-gray-400 mb-2 block' }),
                                          m('p', { class: 'text-sm text-gray-500' }, 'Belum ada pengadaan untuk kode rekening ini'),
                                          m('button', {
                                            class: 'mt-2 px-3 py-1.5 bg-orange-500 text-white text-sm font-medium rounded hover:bg-orange-600 transition-colors',
                                            onclick: async () => await this.openKontrakModal(paketKegiatanForKodeRekening.length > 0 ? paketKegiatanForKodeRekening[0]._id : null)
                                          }, 'Tambah Pengadaan')
                                        ]) :

                                        m('div', [
                                          m('div', { class: 'flex justify-between items-center mb-4' }, [
                                            m('h5', { class: 'text-sm font-semibold text-gray-900' }, `Kontrak (${kontrakForKodeRekening.length})`),
                                            paketKegiatanForKodeRekening.length > 0 && m('button', {
                                              class: 'px-3 py-1.5 bg-gradient-to-r from-orange-500 to-red-600 text-white text-sm font-medium rounded hover:from-orange-600 hover:to-red-700 transition-all duration-200 flex items-center',
                                              onclick: async () => await this.openKontrakModal(paketKegiatanForKodeRekening[0]._id)
                                            }, [
                                              m('i', { class: 'ri-add-line mr-1' }),
                                              'Tambah Pengadaan'
                                            ])
                                          ]),

                                          m('div', { class: 'overflow-x-auto' }, [
                                            m('table', { class: 'min-w-full divide-y divide-gray-200' }, [
                                              m('thead', { class: 'bg-gray-50' }, [
                                                m('tr', [
                                                  m('th', { class: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'No'),
                                                  m('th', { class: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Kode SIRUP LKPP'),
                                                  m('th', { class: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Penyedia'),
                                                  m('th', { class: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'No. Kontrak'),
                                                  m('th', { class: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Nilai Kontrak'),
                                                  m('th', { class: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Tipe'),
                                                  m('th', { class: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Aksi')
                                                ])
                                              ]),
                                              m('tbody', { class: 'bg-white divide-y divide-gray-200' }, [
                                                kontrakForKodeRekening.map((kontrak, index) =>
                                                  m('tr', { class: 'hover:bg-gray-50' }, [
                                                    m('td', { class: 'px-4 py-3 whitespace-nowrap' }, [
                                                      m('div', { class: 'text-sm font-medium text-gray-900' }, `${index + 1}.`)
                                                    ]),
                                                    m('td', { class: 'px-4 py-3 whitespace-nowrap' }, [
                                                      m('div', { class: 'text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded' }, kontrak.kodeSirupLkpp || '-')
                                                    ]),
                                                    m('td', { class: 'px-4 py-3' }, [
                                                      m('div', { class: 'text-sm font-medium text-gray-900' }, kontrak.penyediaId?.NamaVendor || 'Penyedia Tidak Ditemukan'),
                                                      kontrak.penyediaId?.NamaPimpinan && m('div', { class: 'text-xs text-gray-500' }, kontrak.penyediaId.NamaPimpinan)
                                                    ]),
                                                    m('td', { class: 'px-4 py-3 whitespace-nowrap' }, [
                                                      m('div', { class: 'text-sm text-gray-900' }, kontrak.noKontrak || '-'),
                                                      kontrak.tglKontrak && m('div', { class: 'text-xs text-gray-500' }, new Date(kontrak.tglKontrak).toLocaleDateString('id-ID'))
                                                    ]),
                                                    m('td', { class: 'px-4 py-3 whitespace-nowrap' }, [
                                                      m('div', { class: 'text-sm font-medium text-gray-900' }, `Rp ${kontrak.nilaiKontrak?.toLocaleString('id-ID') || '0'}`)
                                                    ]),
                                                    m('td', { class: 'px-4 py-3 whitespace-nowrap' }, [
                                                      m('span', {
                                                        class: `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                          kontrak.tipe === 'Konstruksi'
                                                            ? 'bg-blue-100 text-blue-800'
                                                            : 'bg-green-100 text-green-800'
                                                        }`
                                                      }, kontrak.tipe || 'Konstruksi')
                                                    ]),
                                                    m('td', { class: 'px-4 py-3 whitespace-nowrap text-sm font-medium' }, [
                                                      m('button', {
                                                        class: 'text-blue-600 hover:text-blue-900 mr-3',
                                                        onclick: () => this.editKontrak(kontrak)
                                                      }, 'Edit'),
                                                      m('button', {
                                                        class: 'text-red-600 hover:text-red-900',
                                                        onclick: () => this.deleteKontrak(kontrak)
                                                      }, 'Hapus')
                                                    ])
                                                  ])
                                                )
                                              ])
                                            ])
                                          ])
                                        ])
                                    ])
                                  ])
                                ]);
                              })
                          ])
                        ])
                    ])
                  )
              ]) :

            // Tab 4: Tahapan Pekerjaan
            this.activeTab === 'kontrak' ?
              m('div', { class: 'space-y-4' }, [
                this.subKegiatanList.length === 0 ?
                  m('div', { class: 'text-center py-12' }, [
                    m('div', { class: 'mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-4' }, [
                      m('i', { class: 'ri-file-contract-fill text-blue-500' })
                    ]),
                    m('h3', { class: 'text-lg font-medium text-gray-900 mb-2' }, 'Belum ada subkegiatan'),
                    m('p', { class: 'text-gray-500' }, 'Buat data anggaran terlebih dahulu untuk mengelola tahapan pekerjaan')
                  ]) :

                  this.subKegiatanList.map(subKegiatan =>
                    m('div', { class: 'border border-gray-200 rounded-lg' }, [
                      // Accordion Header
                      m('button', {
                        class: 'w-full flex justify-between items-center p-4 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors',
                        onclick: () => this.toggleAccordion(subKegiatan._id)
                      }, [
                        m('div', [
                          m('div', { class: 'flex items-center space-x-3' }, [
                            m('div', {
                              class: 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-center',
                              style: (this.expandedAccordions.has(subKegiatan._id) ? 'background-color: #8B5CF6; color: white;' : 'background-color: #E5E7EB; color: #6B7280;') + ' overflow: hidden; white-space: nowrap; text-overflow: ellipsis;'
                            }, this.getFullCode(subKegiatan) || 'XX'),
                            m('div', [
                              m('h3', { class: 'font-semibold text-gray-900' }, subKegiatan.nama || 'Nama SubKegiatan'),
                              m('p', { class: 'text-xs text-gray-500 mt-0.5' }, this.getFullCode(subKegiatan) || 'XX')
                            ])
                          ])
                        ]),
                        m('div', { class: 'flex items-center space-x-2' }, [
                          m('span', {
                            class: `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              this.getKodeRekeningAllocationsForSubKegiatan(subKegiatan._id).length > 0
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-gray-100 text-gray-800'
                            }`
                          }, `${this.getKodeRekeningAllocationsForSubKegiatan(subKegiatan._id).length} kode rekening`),
                          m('i', {
                            class: `ri-arrow-${this.expandedAccordions.has(subKegiatan._id) ? 'up' : 'down'}-line text-gray-400`
                          })
                        ])
                      ]),

                      // Accordion Content - Kode Rekening Accordions
                      this.expandedAccordions.has(subKegiatan._id) &&
                        m('div', { class: 'px-4 pb-4 border-t border-gray-200 bg-gray-50' }, [
                          m('div', { class: 'space-y-4 pt-4' }, [
                            this.getKodeRekeningAllocationsForSubKegiatan(subKegiatan._id).length === 0 ?
                              m('div', { class: 'text-center py-8' }, [
                                m('div', { class: 'mx-auto flex items-center justify-center h-10 w-10 rounded-full bg-gray-100 mb-3' }, [
                                  m('i', { class: 'ri-money-dollar-circle-fill text-blue-500' })
                                ]),
                                m('p', { class: 'text-sm text-gray-500 mb-3' }, 'Belum ada alokasi kode rekening untuk subkegiatan ini'),
                                m('p', { class: 'text-xs text-gray-400' }, 'Tambahkan alokasi kode rekening pada data anggaran')
                              ]) :

                              this.getKodeRekeningAllocationsForSubKegiatan(subKegiatan._id).map(allocation => {
                                const kodeRekeningId = typeof allocation.kodeRekeningId === 'string' ? allocation.kodeRekeningId : allocation.kodeRekeningId._id || allocation.kodeRekeningId;
                                const kontrakForKodeRekening = this.getKontrakForKodeRekening(kodeRekeningId);

                                return m('div', { class: 'bg-white rounded-lg border border-gray-200 overflow-hidden' }, [
                                  // Kode Rekening Accordion Header (Level 2)
                                  m('button', {
                                    class: 'w-full flex justify-between items-center p-4 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors',
                                    onclick: () => this.toggleKodeRekeningAccordion(kodeRekeningId)
                                  }, [
                                    m('div', [
                                      // Display full hierarchical kode rekening
                                      (() => {
                                        const displayInfo = this.getKodeRekeningDisplayInfo(allocation.kodeRekeningId);
                                        return [
                                          m('h4', { class: 'font-semibold text-gray-900' }, displayInfo.name || 'Loading...'),
                                          m('p', { class: 'text-sm text-gray-500' }, displayInfo.code || 'Loading...')
                                        ];
                                      })()
                                    ]),
                                    m('div', { class: 'flex items-center space-x-2' }, [
                                      m('span', {
                                        class: 'inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800'
                                      }, `Rp ${allocation.amount.toLocaleString('id-ID')}`),
                                      m('span', {
                                        class: 'inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800'
                                      }, `${kontrakForKodeRekening.length} kontrak`),
                                      m('i', {
                                        class: `ri-arrow-${this.expandedKodeRekeningAccordions.has(kodeRekeningId) ? 'up' : 'down'}-line text-gray-400`
                                      })
                                    ])
                                  ]),

                                  // Tahap Pekerjaan Content (Level 3) - Only show when kode rekening accordion is expanded
                                  this.expandedKodeRekeningAccordions.has(kodeRekeningId) && m('div', { class: 'border-t border-gray-200 bg-gray-50' }, [
                                    m('div', { class: 'p-4' }, [
                                      // Check if there are kontrak for this kode rekening
                                      kontrakForKodeRekening.length === 0 ?
                                        m('div', { class: 'text-center py-8 border-2 border-dashed border-gray-300 rounded-lg' }, [
                                          m('i', { class: 'ri-timeline-line text-2xl text-gray-400 mb-2 block' }),
                                          m('p', { class: 'text-sm text-gray-500 mb-3' }, 'Belum ada tahapan pekerjaan untuk kode rekening ini'),
                                          m('p', { class: 'text-xs text-gray-400 mb-4' }, 'Tahapan pekerjaan akan muncul setelah kontrak pengadaan dibuat'),
                                          m('button', {
                                            class: 'px-4 py-2 bg-purple-500 text-white text-sm font-medium rounded hover:bg-purple-600 transition-colors',
                                            onclick: () => {
                                              ToastUtils.info('Fitur tambah tahap pekerjaan akan segera hadir');
                                            }
                                          }, 'Tambah Tahap Pekerjaan')
                                        ]) :

                                        m('div', [
                                          // Show kontrak list with placeholder for tahap pekerjaan
                                          m('div', { class: 'space-y-4' }, [
                                            kontrakForKodeRekening.map((kontrak, index) =>
                                              m('div', { class: 'bg-white border border-gray-200 rounded-lg p-4' }, [
                                                m('div', { class: 'flex items-center justify-between mb-3' }, [
                                                  m('div', [
                                                    m('h6', { class: 'text-sm font-semibold text-gray-900' }, `${index + 1}. Kontrak ${kontrak.noKontrak || 'N/A'}`),
                                                    m('p', { class: 'text-xs text-gray-500' }, kontrak.penyediaId?.NamaVendor || 'Penyedia tidak diketahui')
                                                  ]),
                                                  m('span', {
                                                    class: 'inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800'
                                                  }, `Rp ${kontrak.nilaiKontrak?.toLocaleString('id-ID') || '0'}`)
                                                ]),
                                                
                                                // Tabbed Tahapan Pekerjaan Section
                                                this.renderTahapanPekerjaanTabs(kontrak)
                                              ])
                                            )
                                          ])
                                        ])
                                    ])
                                  ])
                                ]);
                              })
                          ])
                        ])
                    ])
                  )
              ]) : null
        ])
      ]),

      // Modal for editing kinerja info
      this.showKinerjaModal && m('div', {
        class: 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50',
        onclick: (e) => {
          if (e.target === e.currentTarget) this.closeKinerjaModal();
        }
      }, [
        m('div', {
          class: 'relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-lg bg-white'
        }, [
          // Modal Header
          m('div', {
            class: 'bg-gradient-to-r from-purple-500 to-pink-600 text-white p-6 rounded-t-lg'
          }, [
            m('div', { class: 'flex items-center justify-between' }, [
              m('div', { class: 'flex items-center space-x-3' }, [
                m('div', {
                  class: 'w-8 h-8 bg-blue-600 bg-opacity-25 rounded-full flex items-center justify-center'
                }, [
                  m('i', { class: 'ri-edit-line text-xl text-white' })
                ]),
                m('div', [
                  m('h3', { class: 'text-xl font-bold' }, 'Edit Informasi Kinerja'),
                  m('p', { class: 'text-white text-opacity-80 text-sm' }, 'Update lokasi dan pengguna anggaran')
                ])
              ]),
              m('button', {
                class: 'w-8 h-8 bg-blue-600 bg-opacity-25 rounded-full flex items-center justify-center',
                onclick: () => this.closeKinerjaModal()
              }, [
                m('i', { class: 'ri-close-fill' })
              ])
            ])
          ]),

          // Modal Body
          m('div', { class: 'p-6 max-h-96 overflow-y-auto' }, [
            m('div', { class: 'space-y-6' }, [
              // Lokasi
              m('div', [
                m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                  m('i', { class: 'ri-map-pin-line mr-1 text-red-500' }),
                  'Lokasi'
                ]),
                m('input', {
                  type: 'text',
                  class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                  placeholder: 'Masukkan lokasi pelaksanaan',
                  value: this.kinerjaFormData.lokasi,
                  oninput: (e) => this.kinerjaFormData.lokasi = e.target.value
                })
              ]),

              // Pengguna Anggaran Selection
              m('div', [
                m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                  m('i', { class: 'ri-user-line mr-1 text-blue-500' }),
                  'Pengguna Anggaran'
                ]),
                m('select', {
                  class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                  value: this.kinerjaFormData.penggunaAnggaranId,
                  onchange: (e) => this.kinerjaFormData.penggunaAnggaranId = e.target.value
                }, [
                  m('option', { value: '' }, 'Pilih Pengguna Anggaran'),
                  this.pejabatList.map(pejabat =>
                    m('option', {
                      value: pejabat._id,
                      key: pejabat._id
                    }, `${pejabat.nama} (${pejabat.jabatanFungsional})`)
                  )
                ])
              ])
            ])
          ]),

          // Modal Actions
          m('div', {
            class: 'flex justify-end gap-3 pt-6 border-t border-gray-200 bg-gray-50 px-6 py-4 rounded-b-lg'
          }, [
            m('button', {
              class: 'px-6 py-3 bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-gray-400 rounded-lg text-gray-700 font-medium transition-all duration-200 flex items-center space-x-2',
              onclick: () => this.closeKinerjaModal()
            }, [
              m('i', { class: 'ri-close-fill' }),
              m('span', 'Batal')
            ]),
            m('button', {
              class: `px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 ${
                this.isKinerjaModalLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`,
              onclick: () => this.saveKinerjaInfo(),
              disabled: this.isKinerjaModalLoading
            }, [
              this.isKinerjaModalLoading ? m('i', { class: 'ri-loader-4-line animate-spin' }) : m('i', { class: 'ri-save-line' }),
              m('span', this.isKinerjaModalLoading ? 'Menyimpan...' : 'Simpan')
            ])
          ])
        ])
      ]),

      // Modal for creating/editing paket kegiatan
      this.showPaketModal && m('div', {
        class: 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50',
        onclick: (e) => {
          if (e.target === e.currentTarget) this.closePaketModal();
        }
      }, [
        m('div', {
          class: 'relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-lg bg-white'
        }, [
          // Modal Header
          m('div', {
            class: 'bg-gradient-to-r from-purple-500 to-pink-600 text-white p-6 rounded-t-lg'
          }, [
            m('div', { class: 'flex items-center justify-between' }, [
              m('div', { class: 'flex items-center space-x-3' }, [
                m('div', {
                  class: 'w-8 h-8 bg-blue-600 bg-opacity-25 rounded-full flex items-center justify-center'
                }, [
                  m('i', { class: `ri-${this.paketModalMode === 'create' ? 'add' : 'edit'}-line text-xl text-white` })
                ]),
                m('div', [
                  m('h3', { class: 'text-xl font-bold' }, this.paketModalMode === 'create' ? 'Tambah Paket Kegiatan' : 'Edit Paket Kegiatan'),
                  m('p', { class: 'text-white text-opacity-80 text-sm' }, 'Formulir input paket kegiatan')
                ])
              ]),
              m('button', {
                class: 'w-8 h-8 bg-blue-600 bg-opacity-25 rounded-full flex items-center justify-center',
                onclick: () => this.closePaketModal()
              }, [
                m('i', { class: 'ri-close-fill' })
              ])
            ])
          ]),

          // Modal Body
          m('div', { class: 'p-6 max-h-96 overflow-y-auto' }, [
            m('div', { class: 'space-y-6' }, [
              // Uraian
              m('div', [
                m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                  m('i', { class: 'ri-file-text-line mr-1 text-blue-500' }),
                  'Uraian Paket'
                ]),
                m('input', {
                  type: 'text',
                  class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                  placeholder: 'Masukkan uraian paket kegiatan',
                  value: this.paketFormData.uraian,
                  oninput: (e) => this.paketFormData.uraian = e.target.value
                })
              ]),

              // Volume and Satuan row
              m('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-4' }, [
                // Volume
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                    m('i', { class: 'ri-numbers-line mr-1 text-green-500' }),
                    'Volume'
                  ]),
                  m('input', {
                    type: 'number',
                    min: '0.01',
                    step: '0.01',
                    class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                    placeholder: '0.00',
                    value: this.paketFormData.volume,
                    oninput: (e) => this.paketFormData.volume = parseFloat(e.target.value) || 0
                  })
                ]),

                // Satuan
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                    m('i', { class: 'ri-scales-line mr-1 text-purple-500' }),
                    'Satuan'
                  ]),
                  m('input', {
                    type: 'text',
                    class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                    placeholder: 'Contoh: Meter, Liter, Unit',
                    value: this.paketFormData.satuan,
                    oninput: (e) => this.paketFormData.satuan = e.target.value
                  })
                ])
              ]),

              // Harga Satuan
              m('div', [
                m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                  m('i', { class: 'ri-money-dollar-circle-line mr-1 text-yellow-500' }),
                  'Harga Satuan (Rp)'
                ]),
                m('input', {
                  type: 'text',
                  class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                  placeholder: '0',
                  value: this.paketFormData.hargaSatuan ? this.paketFormData.hargaSatuan.toLocaleString('id-ID') : '',
                  oninput: (e) => {
                    // Remove existing delimiters and parse
                    const cleanValue = e.target.value.replace(/[^\d]/g, '');
                    this.paketFormData.hargaSatuan = parseInt(cleanValue) || 0;
                    // Update input display with delimiters
                    e.target.value = this.paketFormData.hargaSatuan.toLocaleString('id-ID');
                  }
                })
              ]),

              // Jumlah (calculated)
              m('div', [
                m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                  m('i', { class: 'ri-calculator-line mr-1 text-indigo-500' }),
                  'Jumlah Total (Rp)'
                ]),
                m('div', { class: 'px-4 py-3 bg-gray-100 border-2 border-gray-200 rounded-lg' }, [
                  m('span', { class: 'text-lg font-bold text-gray-900' },
                    `Rp ${(this.paketFormData.volume * this.paketFormData.hargaSatuan).toLocaleString('id-ID')}`
                  )
                ])
              ]),

              // Budget Year (read-only display)
              m('div', [
                m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                  m('i', { class: 'ri-calendar-line mr-1 text-red-500' }),
                  'Tahun Anggaran'
                ]),
                m('div', { class: 'px-4 py-3 bg-gray-100 border-2 border-gray-200 rounded-lg text-gray-900' }, [
                  m('span', { class: 'font-medium' },
                    (() => {
                      const formBudgetData = UserUtils.getBudgetYear();
                      if (formBudgetData && typeof formBudgetData === 'object') {
                        return `${formBudgetData.year || 2026}-${formBudgetData.status || 'Murni'}`;
                      }
                      return formBudgetData || '2026-Murni';
                    })()
                  )
                ])
              ]),

              // Description
              m('div', [
                m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                  m('i', { class: 'ri-file-text-line mr-1 text-gray-500' }),
                  'Deskripsi'
                ]),
                m('textarea', {
                  class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                  placeholder: 'Deskripsi paket kegiatan (opsional)',
                  value: this.paketFormData.deskripsi || '',
                  oninput: (e) => this.paketFormData.deskripsi = e.target.value,
                  rows: 3
                })
              ])
            ])
          ]),

          // Modal Actions
          m('div', {
            class: 'flex justify-end gap-3 pt-6 border-t border-gray-200 bg-gray-50 px-6 py-4 rounded-b-lg'
          }, [
            m('button', {
              class: 'px-6 py-3 bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-gray-400 rounded-lg text-gray-700 font-medium transition-all duration-200 flex items-center space-x-2',
              onclick: () => this.closePaketModal()
            }, [
              m('i', { class: 'ri-close-fill' }),
              m('span', 'Batal')
            ]),
            m('button', {
              class: `px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 ${
                this.isPaketModalLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`,
              onclick: () => this.savePaketKegiatan(),
              disabled: this.isPaketModalLoading
            }, [
              this.isPaketModalLoading ? m('i', { class: 'ri-loader-4-line animate-spin' }) : m('i', { class: 'ri-save-line' }),
              m('span', this.isPaketModalLoading ? 'Menyimpan...' : 'Simpan')
            ])
          ])
        ])
      ]),

      // Modal for creating/editing Target
      this.showTargetModal && m('div', {
        class: 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50',
        onclick: (e) => {
          if (e.target === e.currentTarget) this.closeTargetModal();
        }
      }, [
        m('div', {
          class: 'relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-lg bg-white'
        }, [
          // Modal Header
          m('div', {
            class: 'bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-lg'
          }, [
            m('div', { class: 'flex items-center justify-between' }, [
              m('div', { class: 'flex items-center space-x-3' }, [
                m('div', {
                  class: 'w-8 h-8 bg-blue-600 bg-opacity-25 rounded-full flex items-center justify-center'
                }, [
                  m('i', { class: 'ri-target-fill text-xl text-white' })
                ]),
                m('div', [
                  m('h3', { class: 'text-xl font-bold' }, this.targetModalMode === 'create' ? 'Tambah Target' : 'Edit Target'),
                  m('p', { class: 'text-white text-opacity-80 text-sm' }, 'Formulir input target tahapan pekerjaan')
                ])
              ]),
              m('button', {
                class: 'w-8 h-8 bg-blue-600 bg-opacity-25 rounded-full flex items-center justify-center',
                onclick: () => this.closeTargetModal()
              }, [
                m('i', { class: 'ri-close-fill' })
              ])
            ])
          ]),

          // Modal Body
          m('div', { class: 'p-6 max-h-96 overflow-y-auto' }, [
            m('div', { class: 'space-y-6' }, [
              // Tanggal
              m('div', [
                m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                  m('i', { class: 'ri-calendar-line mr-1 text-red-500' }),
                  'Tanggal'
                ]),
                // Contract execution period reference
                this.currentKontrakForValidation && m('div', { class: 'mb-2 p-2 bg-gray-100 rounded text-sm' }, [
                  m('div', { class: 'text-gray-600 mb-1' }, 'Periode Pelaksanaan Kontrak:'),
                  m('div', { class: 'flex space-x-4' }, [
                    m('div', [
                      m('span', { class: 'text-gray-500 text-xs' }, 'Mulai: '),
                      m('span', { class: 'font-semibold text-gray-800' },
                        this.currentKontrakForValidation.tglPelaksanaanDari ?
                        new Date(this.currentKontrakForValidation.tglPelaksanaanDari).toLocaleDateString('id-ID') :
                        'Tidak ditentukan'
                      )
                    ]),
                    m('div', [
                      m('span', { class: 'text-gray-500 text-xs' }, 'Selesai: '),
                      m('span', { class: 'font-semibold text-gray-800' },
                        this.currentKontrakForValidation.tglPelaksanaanSampai ?
                        new Date(this.currentKontrakForValidation.tglPelaksanaanSampai).toLocaleDateString('id-ID') :
                        'Tidak ditentukan'
                      )
                    ])
                  ])
                ]),
                m('input', {
                  type: 'date',
                  class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                  value: this.targetFormData.tanggal,
                  oninput: (e) => this.targetFormData.tanggal = e.target.value,
                  min: this.currentKontrakForValidation?.tglPelaksanaanDari || '',
                  max: this.currentKontrakForValidation?.tglPelaksanaanSampai || ''
                }),
                m('span', { class: 'text-xs text-gray-500 mt-1 block' }, '(Tanggal harus berada dalam periode pelaksanaan kontrak)')
              ]),

              // Target Fisik (%) and Target Dana (%) row
              m('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-4' }, [
                // Target Fisik (%)
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                    m('i', { class: 'ri-progress-1-line mr-1 text-blue-500' }),
                    'Target Fisik (%)'
                  ]),
                  m('input', {
                    type: 'number',
                    min: '0',
                    max: '100',
                    step: '0.01',
                    class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                    placeholder: '0.00',
                    value: this.targetFormData.targetFisik,
                    oninput: (e) => {
                      this.targetFormData.targetFisik = parseFloat(e.target.value) || 0;
                      this.onTargetFisikChange();
                    }
                  })
                ]),

                // Target Dana (%)
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                    m('i', { class: 'ri-money-dollar-circle-line mr-1 text-green-500' }),
                    'Target Dana (%)'
                  ]),
                  m('input', {
                    type: 'number',
                    min: '0',
                    max: '100',
                    step: '0.01',
                    class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                    placeholder: '0.00',
                    value: this.targetFormData.targetDana,
                    oninput: (e) => {
                      this.targetFormData.targetDana = parseFloat(e.target.value) || 0;
                      this.onTargetDanaChange();
                    }
                  })
                ])
              ]),

              // Target Dana (Rp) - Auto-calculated but editable
              m('div', [
                m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                  m('i', { class: 'ri-money-dollar-box-line mr-1 text-yellow-500' }),
                  'Target Dana (Rp)'
                ]),
                // Contract value info display
                this.currentKontrakForValidation && m('div', { class: 'mb-2 p-2 bg-gray-100 rounded text-sm' }, [
                  m('span', { class: 'text-gray-600' }, `Nilai Kontrak: `),
                  m('span', { class: 'font-semibold text-gray-800' }, `Rp ${(this.currentKontrakForValidation.nilaiKontrak || 0).toLocaleString('id-ID')}`),
                  m('span', { class: 'text-gray-500 ml-2' }, '(Dasar perhitungan otomatis)')
                ]),
                m('input', {
                  type: 'text',
                  class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                  placeholder: '0',
                  value: this.targetFormData.targetDanaRp ? this.targetFormData.targetDanaRp.toLocaleString('id-ID') : '',
                  oninput: (e) => {
                    const cleanValue = e.target.value.replace(/[^\d]/g, '');
                    this.targetFormData.targetDanaRp = parseInt(cleanValue) || 0;
                    e.target.value = this.targetFormData.targetDanaRp.toLocaleString('id-ID');
                  }
                }),
                // Calculation breakdown display
                (this.targetFormData.targetDana > 0 && this.currentKontrakForValidation) && m('div', { class: 'mt-2 p-2 bg-blue-50 rounded border border-blue-200' }, [
                  m('div', { class: 'text-xs text-blue-700' }, [
                    m('span', 'Perhitungan: '),
                    m('span', { class: 'font-mono' }, `${this.targetFormData.targetDana}% × Rp ${(this.currentKontrakForValidation.nilaiKontrak || 0).toLocaleString('id-ID')} = `),
                    m('span', { class: 'font-bold' }, `Rp ${((this.targetFormData.targetDana / 100) * (this.currentKontrakForValidation.nilaiKontrak || 0)).toLocaleString('id-ID')}`)
                  ])
                ]),
                m('div', { class: 'flex justify-between items-center mt-1' }, [
                  m('span', { class: 'text-xs text-gray-500' }, '(Dapat diedit untuk pembulatan atau penyesuaian)'),
                  m('button', {
                    class: 'text-xs text-blue-600 hover:text-blue-800 underline',
                    onclick: () => {
                      // Recalculate from percentage
                      this.onTargetDanaChange();
                      m.redraw();
                      ToastUtils.info('Target Dana (Rp) dihitung ulang dari persentase');
                    }
                  }, 'Hitung Ulang dari Persentase')
                ])
              ]),

              // Keterangan
              m('div', [
                m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                  m('i', { class: 'ri-file-text-line mr-1 text-gray-500' }),
                  'Keterangan'
                ]),
                m('textarea', {
                  class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                  placeholder: 'Keterangan target progress (contoh: Pekerjaan awal, persiapan material)',
                  value: this.targetFormData.keterangan,
                  oninput: (e) => this.targetFormData.keterangan = e.target.value,
                  rows: 3
                })
              ]),

              // Validation messages
              m('div', { class: 'bg-blue-50 rounded-lg p-4 border border-blue-200' }, [
                m('div', { class: 'flex items-center mb-2' }, [
                  m('i', { class: 'ri-information-line text-blue-500 mr-2' }),
                  m('h5', { class: 'text-sm font-semibold text-blue-900' }, 'Validasi Target')
                ]),
                m('div', { class: 'text-sm text-blue-800' }, [
                  m('p', '• Tanggal harus berada dalam periode pelaksanaan kontrak'),
                  m('p', '• Target akhir harus mencapai 100% untuk fisik dan dana'),
                  m('p', '• Target Dana (Rp) dihitung otomatis dari persentase × nilai kontrak')
                ])
              ])
            ])
          ]),

          // Modal Actions
          m('div', {
            class: 'flex justify-end gap-3 pt-6 border-t border-gray-200 bg-gray-50 px-6 py-4 rounded-b-lg'
          }, [
            m('button', {
              class: 'px-6 py-3 bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-gray-400 rounded-lg text-gray-700 font-medium transition-all duration-200 flex items-center space-x-2',
              onclick: () => this.closeTargetModal()
            }, [
              m('i', { class: 'ri-close-fill' }),
              m('span', 'Batal')
            ]),
            m('button', {
              class: `px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 ${
                this.isTargetModalLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`,
              onclick: () => this.saveTarget(),
              disabled: this.isTargetModalLoading
            }, [
              this.isTargetModalLoading ? m('i', { class: 'ri-loader-4-line animate-spin' }) : m('i', { class: 'ri-save-line' }),
              m('span', this.isTargetModalLoading ? 'Menyimpan...' : 'Simpan')
            ])
          ])
        ])
      ]),

      // Modal for creating/editing kontrak
      this.showKontrakModal && m('div', {
        class: 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50',
        onclick: (e) => {
          if (e.target === e.currentTarget) this.closeKontrakModal();
        }
      }, [
        m('div', {
          class: 'relative top-20 mx-auto p-5 border w-11/12 md:w-4/5 xl:w-2/3 shadow-lg rounded-lg bg-white max-h-[90vh] overflow-y-auto'
        }, [
          // Modal Header
          m('div', {
            class: 'bg-gradient-to-r from-orange-500 to-red-600 text-white p-6 rounded-t-lg'
          }, [
            m('div', { class: 'space-y-4' }, [
              // Header with title and close button
              m('div', { class: 'flex items-center justify-between' }, [
                m('div', { class: 'flex items-center space-x-3' }, [
                  m('div', {
                    class: 'w-8 h-8 bg-blue-600 bg-opacity-25 rounded-full flex items-center justify-center'
                  }, [
                    m('i', { class: 'ri-file-contract-fill text-xl text-white' })
                  ]),
                  m('div', [
                    m('h3', { class: 'text-xl font-bold' }, this.kontrakModalMode === 'create' ? 'Tambah Pengadaan' : 'Edit Pengadaan'),
                    m('p', { class: 'text-white text-opacity-80 text-sm' }, 'Formulir input kontrak pengadaan')
                  ])
                ]),
                m('button', {
                  class: 'w-8 h-8 bg-blue-600 bg-opacity-25 rounded-full flex items-center justify-center',
                  onclick: () => this.closeKontrakModal()
                }, [
                  m('i', { class: 'ri-close-fill' })
                ])
              ]),
              
              // Allocation Information Display
              (this.currentAllocationInfo.totalAllocation > 0) && m('div', {
                class: 'bg-gray-800 rounded-lg p-4 border-2 border-gray-600 shadow-xl'
              }, [
                m('div', { class: 'flex items-center space-x-2 mb-3' }, [
                  m('i', { class: 'ri-money-dollar-circle-line text-xl text-yellow-400' }),
                  m('h4', { class: 'font-bold text-white text-lg' }, 'Informasi Alokasi Anggaran')
                ]),
                m('div', { class: 'grid grid-cols-1 md:grid-cols-3 gap-4' }, [
                  m('div', [
                    m('div', { class: 'text-gray-300 text-sm font-medium uppercase tracking-wide' }, 'Total Alokasi'),
                    m('div', { class: 'font-bold text-xl text-white' }, `Rp ${this.currentAllocationInfo.totalAllocation.toLocaleString('id-ID')}`)
                  ]),
                  m('div', [
                    m('div', { class: 'text-orange-400 text-sm font-medium uppercase tracking-wide' }, 'Sudah Digunakan'),
                    m('div', { class: 'font-bold text-xl text-orange-300' }, `Rp ${this.currentAllocationInfo.usedAllocation.toLocaleString('id-ID')}`)
                  ]),
                  m('div', [
                    m('div', { class: this.currentAllocationInfo.remainingAllocation > 0 ? 'text-green-400' : 'text-red-400', className: 'text-sm font-medium uppercase tracking-wide' }, 'Sisa Anggaran'),
                    m('div', {
                      class: 'font-bold text-xl',
                      style: this.currentAllocationInfo.remainingAllocation <= 0 ? 'color: #F87171;' : 'color: #34D399;'
                    }, `Rp ${this.currentAllocationInfo.remainingAllocation.toLocaleString('id-ID')}`)
                  ])
                ])
              ])
            ])
          ]),

          // Modal Body
          m('div', { class: 'p-6' }, [
            m('div', { class: 'space-y-6' }, [
              // Row 1: Paket Kegiatan Selection
              m('div', [
                m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                  m('i', { class: 'ri-archive-line mr-1 text-purple-500' }),
                  'Paket Kegiatan'
                ]),
                m('select', {
                  class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                  value: this.kontrakFormData.paketKegiatanId || '',
                  onchange: (e) => {
                    this.kontrakFormData.paketKegiatanId = e.target.value;
                    
                    // Auto-populate context when paket kegiatan is selected
                    if (e.target.value) {
                      const selectedPaket = this.paketKegiatanList.find(p => p._id === e.target.value);
                      if (selectedPaket) {
                        this.currentKontrakContext.anggaranId = selectedPaket.anggaranId?._id || selectedPaket.anggaranId;
                        this.currentKontrakContext.kodeRekeningId = selectedPaket.kodeRekeningId?._id || selectedPaket.kodeRekeningId;
                        this.currentKontrakContext.subKegiatanId = selectedPaket.subKegiatanId?._id || selectedPaket.subKegiatanId;
                        
                        // Recalculate allocation information for the new kode rekening
                        const subKegiatanId = selectedPaket.subKegiatanId?._id || selectedPaket.subKegiatanId;
                        const kodeRekeningId = selectedPaket.kodeRekeningId?._id || selectedPaket.kodeRekeningId;
                        if (kodeRekeningId && subKegiatanId) {
                          this.currentAllocationInfo = this.calculateAllocationInfoForKodeRekening(kodeRekeningId, subKegiatanId);
                        }
                      }
                    }
                  }
                }, [
                  m('option', { value: '' }, 'Pilih Paket Kegiatan'),
                  this.paketKegiatanList
                    .filter(paket => {
                      // Filter based on current context (subperangkatdaerah, subkegiatan, anggaran, koderekening)
                      
                      // Filter by subperangkatdaerah (current user unit)
                      const userData = UserUtils.getUserData();
                      const paketSubPerangkatDaerahId = paket.subPerangkatDaerahId?._id || paket.subPerangkatDaerahId;
                      if (paketSubPerangkatDaerahId && paketSubPerangkatDaerahId !== userData.subPerangkatDaerahId) {
                        return false;
                      }
                      
                      // Filter by subkegiatan if we have a selected context
                      const paketSubKegiatanId = paket.subKegiatanId?._id || paket.subKegiatanId;
                      if (this.selectedSubKegiatan && paketSubKegiatanId !== this.selectedSubKegiatan) {
                        return false;
                      }
                      
                      // Filter by anggaran if we have a context
                      if (this.currentKontrakContext.anggaranId) {
                        const paketAnggaranId = paket.anggaranId?._id || paket.anggaranId;
                        if (paketAnggaranId && paketAnggaranId !== this.currentKontrakContext.anggaranId) {
                          return false;
                        }
                      }
                      
                      // Filter by koderekening if we have a context
                      if (this.currentKontrakContext.kodeRekeningId) {
                        const paketKodeRekeningId = paket.kodeRekeningId?._id || paket.kodeRekeningId;
                        if (paketKodeRekeningId && paketKodeRekeningId !== this.currentKontrakContext.kodeRekeningId) {
                          return false;
                        }
                      }
                      
                      return true;
                    })
                    .map(paket => {
                      const uraian = paket.uraian || 'Paket tanpa uraian';
                      const volume = paket.volume || 0;
                      const satuan = paket.satuan || '';
                      const displayText = `${uraian} (${volume} ${satuan})`;
                      
                      return m('option', {
                        value: paket._id,
                        key: paket._id
                      }, displayText);
                    })
                ])
              ]),

              // Row 2: Kode SIRUP LKPP and Penyedia
              m('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-4' }, [
                // Kode SIRUP LKPP
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                    m('i', { class: 'ri-barcode-line mr-1 text-blue-500' }),
                    'Kode SIRUP LKPP'
                  ]),
                  m('input', {
                    type: 'text',
                    class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                    placeholder: 'Masukkan kode SIRUP LKPP',
                    value: this.kontrakFormData.kodeSirupLkpp || '',
                    oninput: (e) => this.kontrakFormData.kodeSirupLkpp = e.target.value
                  })
                ]),
    
                // Penyedia Selection
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                    m('i', { class: 'ri-building-line mr-1 text-green-500' }),
                    'Penyedia B/J'
                  ]),
                  m('select', {
                    class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                    value: this.kontrakFormData.penyediaId || '',
                    onchange: (e) => {
                      this.kontrakFormData.penyediaId = e.target.value;
                      this.onPenyediaChange();
                    }
                  }, [
                    m('option', { value: '' }, 'Pilih Penyedia'),
                    this.penyediaList.map(penyedia =>
                      m('option', {
                        value: penyedia._id,
                        key: penyedia._id
                      }, penyedia.NamaVendor)
                    )
                  ])
                ])
              ]),
    
              // Row 2: Pimpinan Penyedia and Alamat Penyedia
              m('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-4' }, [
                // Pimpinan Penyedia
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                    m('i', { class: 'ri-user-line mr-1 text-purple-500' }),
                    'Pimpinan Penyedia B/J'
                  ]),
                  m('input', {
                    type: 'text',
                    class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                    placeholder: 'Otomatis terisi saat memilih penyedia',
                    value: this.kontrakFormData.pimpinanPenyedia || '',
                    readonly: true
                  })
                ]),
    
                // Alamat Penyedia
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                    m('i', { class: 'ri-map-pin-line mr-1 text-amber-500' }),
                    'Alamat Penyedia B/J'
                  ]),
                  m('input', {
                    type: 'text',
                    class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                    placeholder: 'Otomatis terisi saat memilih penyedia',
                    value: this.kontrakFormData.alamatPenyedia || '',
                    readonly: true
                  })
                ])
              ]),
    
              // Row 3: Telepon Penyedia and No. Kontrak
              m('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-4' }, [
                // Telepon Penyedia
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                    m('i', { class: 'ri-phone-line mr-1 text-indigo-500' }),
                    'Telp. Penyedia B/J'
                  ]),
                  m('input', {
                    type: 'text',
                    class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                    placeholder: 'Otomatis terisi saat memilih penyedia',
                    value: this.kontrakFormData.telpPenyedia || '',
                    readonly: true
                  })
                ]),
    
                // No. Kontrak
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                    m('i', { class: 'ri-file-contract-line mr-1 text-red-500' }),
                    'No. Kontrak'
                  ]),
                  m('input', {
                    type: 'text',
                    class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                    placeholder: 'Masukkan nomor kontrak',
                    value: this.kontrakFormData.noKontrak || '',
                    oninput: (e) => this.kontrakFormData.noKontrak = e.target.value
                  })
                ])
              ]),
    
              // Row 4: Tgl Kontrak and No. SPMK
              m('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-4' }, [
                // Tgl Kontrak
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                    m('i', { class: 'ri-calendar-line mr-1 text-blue-500' }),
                    'Tgl Kontrak'
                  ]),
                  m('input', {
                    type: 'date',
                    class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                    value: this.kontrakFormData.tglKontrak || '',
                    oninput: (e) => this.kontrakFormData.tglKontrak = e.target.value
                  })
                ]),
    
                // No. SPMK
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                    m('i', { class: 'ri-file-text-line mr-1 text-green-500' }),
                    'No. SPMK'
                  ]),
                  m('input', {
                    type: 'text',
                    class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                    placeholder: 'Masukkan nomor SPMK',
                    value: this.kontrakFormData.noSpmk || '',
                    oninput: (e) => this.kontrakFormData.noSpmk = e.target.value
                  })
                ])
              ]),
    
              // Row 5: Tgl SPMK and Jangka Waktu
              m('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-4' }, [
                // Tgl SPMK
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                    m('i', { class: 'ri-calendar-check-line mr-1 text-purple-500' }),
                    'Tgl SPMK'
                  ]),
                  m('input', {
                    type: 'date',
                    class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                    value: this.kontrakFormData.tglSpmk || '',
                    oninput: (e) => this.kontrakFormData.tglSpmk = e.target.value
                  })
                ]),
    
                // Jangka Waktu
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                    m('i', { class: 'ri-time-line mr-1 text-amber-500' }),
                    'Jangka Waktu'
                  ]),
                  m('div', { class: 'flex items-center space-x-2' }, [
                    m('input', {
                      type: 'number',
                      min: '1',
                      class: 'flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                      placeholder: '0',
                      value: this.kontrakFormData.jangkaWaktu || 0,
                      oninput: (e) => {
                        this.kontrakFormData.jangkaWaktu = parseInt(e.target.value) || 0;
                        this.calculateEndDate();
                      }
                    }),
                    m('select', {
                      class: 'px-3 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                      value: this.kontrakFormData.jangkaWaktuUnit || 'Hari',
                      onchange: (e) => {
                        this.kontrakFormData.jangkaWaktuUnit = e.target.value;
                        this.calculateEndDate();
                      }
                    }, [
                      m('option', { value: 'Hari' }, 'Hari'),
                      m('option', { value: 'Minggu' }, 'Minggu'),
                      m('option', { value: 'Bulan' }, 'Bulan'),
                      m('option', { value: 'Tahun' }, 'Tahun')
                    ])
                  ])
                ])
              ]),

              // Row 6: Tgl Pelaksanaan (Auto-calculated end date)
              m('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-4' }, [
                // Tgl Pelaksanaan Dari
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                    m('i', { class: 'ri-calendar-event-line mr-1 text-red-500' }),
                    'Tgl. Pelaksanaan (Dari)'
                  ]),
                  m('input', {
                    type: 'date',
                    class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                    value: this.kontrakFormData.tglPelaksanaanDari || '',
                    oninput: (e) => {
                      this.kontrakFormData.tglPelaksanaanDari = e.target.value;
                      this.calculateEndDate();
                    }
                  })
                ]),

                // Tgl Pelaksanaan Sampai (Auto-calculated)
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                    m('i', { class: 'ri-calendar-event-line mr-1 text-pink-500' }),
                    'Tgl. Pelaksanaan (Sampai)'
                  ]),
                  m('input', {
                    type: 'date',
                    class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                    value: this.kontrakFormData.tglPelaksanaanSampai || '',
                    oninput: (e) => this.kontrakFormData.tglPelaksanaanSampai = e.target.value
                  }),
                  m('span', { class: 'text-xs text-gray-500 mt-1 block' }, '(Dapat diubah manual untuk hari libur)')
                ])
              ]),

              // Row 7: Lokasi
              m('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-4' }, [
                // Lokasi
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                    m('i', { class: 'ri-map-pin-line mr-1 text-teal-500' }),
                    'Lokasi'
                  ]),
                  m('input', {
                    type: 'text',
                    class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                    placeholder: 'Lokasi pelaksanaan',
                    value: this.kontrakFormData.lokasi || '',
                    oninput: (e) => this.kontrakFormData.lokasi = e.target.value
                  })
                ])
              ]),
    
              // Row 8: HPS and Nilai Kontrak
              m('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-4' }, [
                // HPS
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                    m('i', { class: 'ri-money-dollar-circle-line mr-1 text-yellow-500' }),
                    'HPS (Rp)'
                  ]),
                  m('input', {
                    type: 'text',
                    class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                    placeholder: '0',
                    value: this.kontrakFormData.hps ? this.kontrakFormData.hps.toLocaleString('id-ID') : '',
                    oninput: (e) => {
                      const cleanValue = e.target.value.replace(/[^\d]/g, '');
                      this.kontrakFormData.hps = parseInt(cleanValue) || 0;
                      e.target.value = this.kontrakFormData.hps.toLocaleString('id-ID');
                    }
                  })
                ]),
    
                // Nilai Kontrak
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                    m('i', { class: 'ri-money-dollar-box-line mr-1 text-green-500' }),
                    'Nilai Kontrak (Rp)',
                    this.currentAllocationInfo.remainingAllocation > 0 && m('span', {
                      class: 'ml-2 text-xs text-orange-600 font-normal'
                    }, `(Max: Rp ${this.currentAllocationInfo.remainingAllocation.toLocaleString('id-ID')})`)
                  ]),
                  m('input', {
                    type: 'text',
                    class: `w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-200 transition-all duration-200 bg-gray-50 focus:bg-white ${
                      this.kontrakFormData.nilaiKontrak > this.currentAllocationInfo.remainingAllocation && this.currentAllocationInfo.remainingAllocation > 0
                        ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                        : 'border-gray-200 focus:border-green-500 focus:ring-green-200'
                    }`,
                    placeholder: '0',
                    value: this.kontrakFormData.nilaiKontrak ? this.kontrakFormData.nilaiKontrak.toLocaleString('id-ID') : '',
                    oninput: (e) => {
                      const cleanValue = e.target.value.replace(/[^\d]/g, '');
                      this.kontrakFormData.nilaiKontrak = parseInt(cleanValue) || 0;
                      e.target.value = this.kontrakFormData.nilaiKontrak.toLocaleString('id-ID');
                    }
                  }),
                  // Warning message for exceeding allocation
                  this.kontrakFormData.nilaiKontrak > this.currentAllocationInfo.remainingAllocation && this.currentAllocationInfo.remainingAllocation > 0 && m('div', {
                    class: 'mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm flex items-center'
                  }, [
                    m('i', { class: 'ri-warning-line mr-2' }),
                    `Nilai kontrak melebihi sisa anggaran sebesar Rp ${this.currentAllocationInfo.remainingAllocation.toLocaleString('id-ID')}. Kelebihan: Rp ${(this.kontrakFormData.nilaiKontrak - this.currentAllocationInfo.remainingAllocation).toLocaleString('id-ID')}`
                  ])
                ])
              ]),
    
              // Row 9: Tipe and Metode Pengadaan
              m('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-4' }, [
                // Tipe
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                    m('i', { class: 'ri-settings-line mr-1 text-blue-500' }),
                    'Tipe'
                  ]),
                  m('select', {
                    class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                    value: this.kontrakFormData.tipe || 'Konstruksi',
                    onchange: (e) => this.kontrakFormData.tipe = e.target.value
                  }, [
                    m('option', { value: 'Konstruksi' }, 'Konstruksi'),
                    m('option', { value: 'Non Konstruksi' }, 'Non Konstruksi')
                  ])
                ]),
    
                // Metode Pengadaan
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                    m('i', { class: 'ri-route-line mr-1 text-purple-500' }),
                    'Metode Pengadaan'
                  ]),
                  m('select', {
                    class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                    value: this.kontrakFormData.metodePengadaanId || '',
                    onchange: (e) => this.kontrakFormData.metodePengadaanId = e.target.value
                  }, [
                    m('option', { value: '' }, 'Pilih Metode Pengadaan'),
                    this.metodePengadaanList.map(metode =>
                      m('option', {
                        value: metode._id,
                        key: metode._id
                      }, metode.nama)
                    )
                  ])
                ])
              ]),
    
              // Row 10: Kualifikasi Pengadaan and Deskripsi
              m('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-4' }, [
                // Kualifikasi Pengadaan
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                    m('i', { class: 'ri-star-line mr-1 text-amber-500' }),
                    'Kualifikasi Pengadaan'
                  ]),
                  m('select', {
                    class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                    value: this.kontrakFormData.kualifikasiPengadaan || 'Prakualifikasi',
                    onchange: (e) => this.kontrakFormData.kualifikasiPengadaan = e.target.value
                  }, [
                    m('option', { value: 'Prakualifikasi' }, 'Prakualifikasi'),
                    m('option', { value: 'Pascakualifikasi' }, 'Pascakualifikasi')
                  ])
                ]),
    
                // Deskripsi
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                    m('i', { class: 'ri-file-text-line mr-1 text-gray-500' }),
                    'Deskripsi'
                  ]),
                  m('textarea', {
                    class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                    placeholder: 'Deskripsi kontrak (opsional)',
                    value: this.kontrakFormData.deskripsi || '',
                    oninput: (e) => this.kontrakFormData.deskripsi = e.target.value,
                    rows: 3
                  })
                ])
              ])
            ])
          ]),

          // Allocation Information Display (in footer)
          this.currentAllocationInfo.totalAllocation > 0 && m('div', {
            class: 'bg-gray-800 rounded-lg p-4 mb-4 border-2 border-gray-600 shadow-xl'
          }, [
            m('div', { class: 'flex items-center justify-between' }, [
              m('div', { class: 'flex items-center space-x-2' }, [
                m('i', { class: 'ri-money-dollar-circle-line text-lg text-yellow-400' }),
                m('h5', { class: 'font-bold text-white' }, 'Informasi Alokasi Anggaran')
              ]),
              m('div', {
                class: 'text-right',
                style: 'min-width: 200px;'
              }, [
                m('div', {
                  class: 'text-sm font-medium',
                  style: this.currentAllocationInfo.remainingAllocation > 0 ? 'color: #34D399;' : 'color: #F87171;'
                }, `Sisa Anggaran: Rp ${this.currentAllocationInfo.remainingAllocation.toLocaleString('id-ID')}`),
                m('div', {
                  class: 'text-xs',
                  style: 'color: #D1D5DB;'
                }, `Digunakan: Rp ${this.currentAllocationInfo.usedAllocation.toLocaleString('id-ID')} dari Rp ${this.currentAllocationInfo.totalAllocation.toLocaleString('id-ID')}`)
              ])
            ])
          ]),

          // Modal Actions
          m('div', {
            class: 'flex justify-end gap-3 pt-6 border-t border-gray-200 bg-gray-50 px-6 py-4 rounded-b-lg'
          }, [
            m('button', {
              class: 'px-6 py-3 bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-gray-400 rounded-lg text-gray-700 font-medium transition-all duration-200 flex items-center space-x-2',
              onclick: () => this.closeKontrakModal()
            }, [
              m('i', { class: 'ri-close-fill' }),
              m('span', 'Batal')
            ]),
            m('button', {
              class: `px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 ${
                this.isKontrakModalLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`,
              onclick: () => this.saveKontrak(),
              disabled: this.isKontrakModalLoading
            }, [
              this.isKontrakModalLoading ? m('i', { class: 'ri-loader-4-line animate-spin' }) : m('i', { class: 'ri-save-line' }),
              m('span', this.isKontrakModalLoading ? 'Menyimpan...' : 'Simpan')
            ])
          ])
        ])
      ])
    ]);
  }
}

export default Pengadaan