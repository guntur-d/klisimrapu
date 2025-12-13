import m from 'mithril'
import { ToastUtils, UserUtils, APIUtils, JWTUtils } from '../js/utils.js'
import toast, { showConfirmation } from '../js/toaster.js'

const Monitoring = {
  // State management
  isLoading: false,
  currentUser: null,
  activeTab: 'informasi',

  // First tab data (Anggaran and SubKegiatan info - copied from Pengadaan)
  anggaranList: [],
  kinerjaList: [],
  subKegiatanList: [],
  pejabatList: [], // For pengguna anggaran selection

  // Second tab data (Realisasi - based on Tahapan Pekerjaan structure)
  monitoringList: [],
  
  // Current context for monitoring modal
  currentMonitoringContext: {
    kontrakId: null,
    budgetYear: null
  },

  // Modal states
  showModal: false,
  modalMode: 'create',
  isModalLoading: false,

  // Form data for creating/editing monitoring
  formData: {
    kontrakId: '',
    realisasiProgress: 0,
    realisasiDana: 0,
    realisasiDanaRp: 0,
    progressFisik: 0,
    progressKeuangan: 0,
    status: 'planning',
    tanggalUpdate: '',
    keterangan: '',
    kendala: '',
    solusi: ''
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

  // Additional data for monitoring form
  kontrakList: [],

  // Realisasi tab states for each kontrak (based on Tahapan Pekerjaan pattern)
  realisasiTabs: new Map(), // Map of kontrakId -> { activeTab, formData }
  
  // Default active tab
  defaultRealisasiTab: 'informasi',

  oninit: function() {
    // Check if user is operator
    if (!UserUtils.isAuthenticated()) {
      ToastUtils.warning('Silakan masuk terlebih dahulu');
      m.route.set('/login');
      return;
    }

    this.currentUser = UserUtils.getUserData();
    
    // Debug: log current user data
    console.log('Monitoring.js - Current user data:', this.currentUser);
    console.log('Monitoring.js - namaPerangkatDaerah:', this.currentUser?.namaPerangkatDaerah);
    console.log('Monitoring.js - subPerangkatDaerah:', this.currentUser?.subPerangkatDaerah);

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
      } else if (this.activeTab === 'realisasi') {
        await this.loadRealisasiData();
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

  // Load data for Informasi tab (copied from Pengadaan.js)
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
        const pejabatResponse = await APIUtils.request('/api/pejabat?jabatanFungsional=PA');
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

  // Load data for Realisasi tab (based on kontrak data)
  loadRealisasiData: async function() {
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

      // Load kontrak data for current unit - kontraks that can be monitored
      try {
        await this.loadKontrakData();
      } catch (error) {
        console.error('Error loading kontrak data:', error);
        // Don't show error toast for kontrak as it might be empty in new installations
        this.kontrakList = [];
      }

      console.log('Realisasi data loaded, kontrak:', this.kontrakList.length);

    } catch (error) {
      console.error('Error loading realisasi data:', error);
      ToastUtils.error('Gagal memuat data realisasi');
    }
  },

  // Load kontrak data (simplified version from Pengadaan.js)
  loadKontrakData: async function() {
    try {
      // Load paket kegiatan first to get the hierarchy
      // For monitoring, we need kontrak data that can be monitored

      const userData = UserUtils.getUserData();
      const subPerangkatDaerahId = userData.subPerangkatDaerahId;
      const currentYear = new Date().getFullYear();
      const budgetYears = ['2026-Murni', '2026-PAK'];
      const currentBudgetYear = budgetYears[0];

      if (!subPerangkatDaerahId) {
        ToastUtils.warning('Informasi unit kerja tidak ditemukan');
        return;
      }

      // Build query to load kontrak for current unit's monitoring
      let queryParams = `subPerangkatDaerahId=${subPerangkatDaerahId}&budgetYear=${encodeURIComponent(currentBudgetYear)}`;

      console.log('Loading kontrak with query:', queryParams);

      // Load kontrak data from API
      const kontrakResponse = await APIUtils.request(`/api/kontrak?${queryParams}`);
      this.kontrakList = kontrakResponse.data || [];

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

  // Toggle accordion expansion
  toggleAccordion: function(subKegiatanId) {
    if (this.expandedAccordions.has(subKegiatanId)) {
      this.expandedAccordions.delete(subKegiatanId);
    } else {
      this.expandedAccordions.add(subKegiatanId);

      // Fetch kode rekening data when accordion is opened in ALL tabs (informasi, realisasi)
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

  // Render Realisasi tabbed interface for each kontrak (based on Tahapan Pekerjaan)
  renderRealisasiTabs: function(kontrak) {
    // Initialize tab state for this kontrak if not exists
    if (!this.realisasiTabs.has(kontrak._id)) {
      this.realisasiTabs.set(kontrak._id, {
        activeTab: this.defaultRealisasiTab,
        formData: {}
      });
    }

    const kontrakTab = this.realisasiTabs.get(kontrak._id);
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
              const tab = this.realisasiTabs.get(kontrak._id);
              tab.activeTab = 'informasi';
              m.redraw();
            }
          }, [
            m('i', { class: 'ri-information-line mr-2' }),
            'Informasi'
          ]),
          m('button', {
            class: `py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
              activeTab === 'progress'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`,
            onclick: () => {
              const tab = this.realisasiTabs.get(kontrak._id);
              tab.activeTab = 'progress';
              
              // Set current kontrak for monitoring data loading
              this.currentMonitoringContext.kontrakId = kontrak._id;
              
              // Load monitoring data for this kontrak if not already loaded
              this.loadMonitoringData(kontrak._id);
              
              m.redraw();
            }
          }, [
            m('i', { class: 'ri-progress-1-line mr-2' }),
            'Progress'
          ])
        ])
      ]),

      // Tab Content
      m('div', { class: 'p-4' }, [
        activeTab === 'informasi' && m('div', { class: 'bg-white' }, [
          // Header
          m('div', { class: 'bg-gradient-to-r from-green-500 to-teal-600 text-white p-4 rounded-t-lg' }, [
            m('div', { class: 'flex items-center space-x-3' }, [
              m('div', { class: 'w-10 h-10 bg-white bg-opacity-75 rounded-full flex items-center justify-center' }, [
                m('i', { class: 'ri-file-contract-fill text-lg' })
              ]),
              m('div', [
                m('h3', { class: 'text-lg font-bold' }, 'Informasi Kontrak'),
                m('p', { class: 'text-white text-opacity-80 text-sm' }, 'Detail informasi untuk monitoring')
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

        activeTab === 'progress' && m('div', { class: 'space-y-4' }, [
          // Header with tambah button
          m('div', { class: 'flex justify-between items-center' }, [
            m('h4', { class: 'text-lg font-semibold text-gray-800 flex items-center' }, [
              m('i', { class: 'ri-progress-1-line mr-2 text-green-500' }),
              'Progress Monitoring'
            ]),
            m('button', {
              class: 'px-4 py-2 bg-gradient-to-r from-green-500 to-teal-600 text-white text-sm font-medium rounded-lg hover:from-green-600 hover:to-teal-700 transition-all duration-200 flex items-center space-x-2',
              onclick: (e) => {
                e.preventDefault();
                this.openMonitoringModal(kontrak);
              }
            }, [
              m('i', { class: 'ri-add-line' }),
              m('span', 'Tambah Progress')
            ])
          ]),

          // Contract period info for validation
          kontrak.tglPelaksanaanDari && kontrak.tglPelaksanaanSampai && m('div', {
            class: 'bg-green-50 border border-green-200 rounded-lg p-3 mb-4'
          }, [
            m('div', { class: 'flex items-center text-sm text-green-700' }, [
              m('i', { class: 'ri-information-line mr-2' }),
              'Periode Kontrak: ',
              m('span', { class: 'font-medium' }, new Date(kontrak.tglPelaksanaanDari).toLocaleDateString('id-ID')),
              m('span', { class: 'mx-1' }, '-'),
              m('span', { class: 'font-medium' }, new Date(kontrak.tglPelaksanaanSampai).toLocaleDateString('id-ID'))
            ])
          ]),

          // Progress tracking table
          m('div', { class: 'bg-white rounded-lg border border-gray-200 overflow-hidden' }, [
            m('table', { class: 'w-full' }, [
              m('thead', { class: 'bg-gray-50' }, [
                m('tr', [
                  m('th', { class: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Tanggal Update'),
                  m('th', { class: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Progress Fisik (%)'),
                  m('th', { class: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Progress Keuangan (%)'),
                  m('th', { class: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Realisasi Dana (Rp)'),
                  m('th', { class: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Status'),
                  m('th', { class: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Aksi')
                ])
              ]),
              m('tbody', { class: 'bg-white divide-y divide-gray-200' }, [
                // Placeholder for monitoring data - will be loaded dynamically
                m('tr', [
                  m('td', { class: 'px-4 py-8 text-center text-gray-500', colSpan: 6 }, [
                    m('i', { class: 'ri-progress-1-line text-4xl text-gray-300 mb-2 block' }),
                    'Belum ada data progress monitoring',
                    m('div', { class: 'text-sm text-gray-400 mt-1' }, 'Klik "Tambah Progress" untuk menambahkan monitoring progress')
                  ])
                ])
              ])
            ])
          ]),

          // Progress summary
          m('div', { class: 'bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4' }, [
            m('div', { class: 'flex items-start' }, [
              m('i', { class: 'ri-information-line text-blue-500 mr-2 mt-0.5' }),
              m('div', { class: 'text-sm text-blue-700' }, [
                m('div', { class: 'font-medium mb-1' }, 'Catatan Progress Monitoring:'),
                m('ul', { class: 'list-disc list-inside space-y-1' }, [
                  m('li', 'Update progress secara berkala sesuai dengan perkembangan pekerjaan'),
                  m('li', 'Pastikan data realisasi dana sesuai dengan progress fisik'),
                  m('li', 'Dokumentasikan kendala dan solusi yang dihadapi')
                ])
              ])
            ])
          ])
        ])
      ])
    ]);
  },

  // Open modal for creating/editing monitoring
  openMonitoringModal: function(kontrak = null, monitoring = null) {
    this.modalMode = monitoring ? 'edit' : 'create';
    this.currentMonitoringContext.kontrakId = kontrak ? kontrak._id : null;
    
    this.formData = {
      kontrakId: monitoring ? monitoring.kontrakId?._id || monitoring.kontrakId : (kontrak ? kontrak._id : ''),
      realisasiProgress: monitoring ? (monitoring.realisasiProgress || 0) : 0,
      realisasiDana: monitoring ? (monitoring.realisasiDana || 0) : 0,
      realisasiDanaRp: monitoring ? (monitoring.realisasiDanaRp || 0) : 0,
      progressFisik: monitoring ? (monitoring.progressFisik || 0) : 0,
      progressKeuangan: monitoring ? (monitoring.progressKeuangan || 0) : 0,
      status: monitoring ? (monitoring.status || 'planning') : 'planning',
      tanggalUpdate: monitoring ? (monitoring.tanggalUpdate ? monitoring.tanggalUpdate.split('T')[0] : '') : '',
      keterangan: monitoring ? (monitoring.keterangan || '') : '',
      kendala: monitoring ? (monitoring.kendala || '') : '',
      solusi: monitoring ? (monitoring.solusi || '') : ''
    };
    
    this.showModal = true;
    m.redraw();
  },

  // Close modal
  closeModal: function() {
    this.showModal = false;
    this.modalMode = 'create';
    this.formData = {
      kontrakId: '',
      realisasiProgress: 0,
      realisasiDana: 0,
      realisasiDanaRp: 0,
      progressFisik: 0,
      progressKeuangan: 0,
      status: 'planning',
      tanggalUpdate: '',
      keterangan: '',
      kendala: '',
      solusi: ''
    };
    this.currentMonitoringContext.kontrakId = null;
    m.redraw();
  },

  // Load monitoring data for a specific kontrak
  loadMonitoringData: async function(kontrakId) {
    try {
      const response = await APIUtils.request(`/api/monitoring/by-kontrak/${kontrakId}`);
      const monitoringData = response.data || [];
      console.log(`Loaded ${monitoringData.length} monitoring entries for kontrak ${kontrakId}`);
      
      // Force redraw to update UI with new data
      m.redraw();
      
      return monitoringData;
    } catch (error) {
      console.error('Error loading monitoring data for kontrak:', kontrakId, error);
      // Don't show error toast for empty data scenarios
      if (error.response && error.response.status === 404) {
        m.redraw(); // Force redraw even for empty state
        return [];
      }
      // For other errors, set empty array as fallback
      m.redraw(); // Force redraw for error state
      return [];
    }
  },

  // Save monitoring
  saveMonitoring: async function() {
    if (!this.formData.kontrakId || !this.formData.tanggalUpdate) {
      ToastUtils.warning('Kontrak dan tanggal update harus diisi');
      return;
    }

    this.isModalLoading = true;
    m.redraw();

    try {
      const userData = UserUtils.getUserData();
      const payload = {
        ...this.formData,
        subPerangkatDaerahId: userData.subPerangkatDaerahId,
        budgetYear: userData.budgetYear?.year ? `${userData.budgetYear.year}-${userData.budgetYear.status}` : '2026-Murni',
        createdBy: userData.username,
        updatedBy: userData.username
      };

      if (this.modalMode === 'create') {
        await APIUtils.create('monitoring', payload);
        ToastUtils.success('Data monitoring berhasil ditambahkan');
      } else {
        // For edit mode, we need the monitoring ID
        // This would be passed from the edit function
        // await APIUtils.update('monitoring', this.editingMonitoringId, payload);
        ToastUtils.info('Edit mode will be implemented');
      }

      this.closeModal();
      this.loadRealisasiData(); // Refresh data
    } catch (error) {
      console.error('Error saving monitoring:', error);
      // Error handling is done by APIUtils
    }

    this.isModalLoading = false;
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

  // Get kode rekening allocations for a specific subkegiatan (copied from Pengadaan.js)
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

  // Fetch missing kode rekening data in bulk (copied from Pengadaan.js)
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

  // Manage cache size to prevent memory leaks (copied from Pengadaan.js)
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

  // Get full hierarchical code for subkegiatan (copied from Pengadaan.js)
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

  // Get formatted kode rekening display info (copied from Pengadaan.js)
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

  // Get full hierarchical code for kode rekening (mimicking the subkegiatan pattern) (copied from Pengadaan.js)
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
          m('h1', { class: 'text-2xl font-bold text-gray-900' }, 'Monitoring'),
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
                this.activeTab === 'realisasi'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`,
              onclick: async () => {
                this.activeTab = 'realisasi';
                this.expandedAccordions.clear(); // Reset accordions when switching tabs
                this.expandedKodeRekeningAccordions.clear(); // Reset kode rekening accordions when switching tabs
                m.redraw(); // Immediate UI update
                await this.loadRealisasiData();
              }
            }, [
              m('i', { class: 'ri-progress-1-line mr-2' }),
              'Realisasi'
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

            // Tab 1: Informasi (copied from Pengadaan.js)
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

                      // Accordion Content (copied from Pengadaan.js)
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
                              ])
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
                                      // Remove " Pemerintah" prefix if present
                                      namaPemda = namaPemda.replace(/^ Pemerintah\s+/, '');

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

            // Tab 2: Realisasi (based on Tahapan Pekerjaan structure)
            this.activeTab === 'realisasi' ?
              m('div', { class: 'space-y-4' }, [
                this.subKegiatanList.length === 0 ?
                  m('div', { class: 'text-center py-12' }, [
                    m('div', { class: 'mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-4' }, [
                      m('i', { class: 'ri-progress-1-fill text-blue-500' })
                    ]),
                    m('h3', { class: 'text-lg font-medium text-gray-900 mb-2' }, 'Belum ada subkegiatan'),
                    m('p', { class: 'text-gray-500' }, 'Buat data anggaran terlebih dahulu untuk melihat data realisasi')
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
                                const kontrakForKodeRekening = this.kontrakList.filter(kontrak => {
                                  // Check if kontrak has kode rekening that matches
                                  if (kontrak.kodeRekeningId === kodeRekeningId) return true;
                                  if (kontrak.paketKegiatanId?.kodeRekeningId === kodeRekeningId) return true;
                                  return false;
                                });

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
                                      }, `${kontrakForKodeRekening.length} kontrak`),
                                      m('i', {
                                        class: `ri-arrow-${this.expandedKodeRekeningAccordions.has(kodeRekeningId) ? 'up' : 'down'}-line text-gray-400`
                                      })
                                    ])
                                  ]),

                                  // Realisasi Content (Level 3) - Based on Tahapan Pekerjaan structure
                                  this.expandedKodeRekeningAccordions.has(kodeRekeningId) && m('div', { class: 'border-t border-gray-200 bg-gray-50' }, [
                                    m('div', { class: 'p-4' }, [
                                      // Show kontrak list with Realisasi tabs
                                      kontrakForKodeRekening.length === 0 ?
                                        m('div', { class: 'text-center py-8 border-2 border-dashed border-gray-300 rounded-lg' }, [
                                          m('i', { class: 'ri-progress-1-line text-2xl text-gray-400 mb-2 block' }),
                                          m('p', { class: 'text-sm text-gray-500 mb-3' }, 'Belum ada kontrak untuk monitoring pada kode rekening ini'),
                                          m('p', { class: 'text-xs text-gray-400 mb-4' }, 'Kontrak akan muncul setelah pengadaan dibuat')
                                        ]) :

                                        m('div', [
                                          // Show kontrak list with Realisasi tabs
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
                                                
                                                // Realisasi Tabbed Section (based on Tahapan Pekerjaan pattern)
                                                this.renderRealisasiTabs(kontrak)
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

      // Modal for creating/editing monitoring
      this.showModal && m('div', {
        class: 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50',
        onclick: (e) => {
          if (e.target === e.currentTarget) this.closeModal();
        }
      }, [
        m('div', {
          class: 'relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-lg bg-white'
        }, [
          // Modal Header
          m('div', {
            class: 'bg-gradient-to-r from-green-500 to-teal-600 text-white p-6 rounded-t-lg'
          }, [
            m('div', { class: 'flex items-center justify-between' }, [
              m('div', { class: 'flex items-center space-x-3' }, [
                m('div', {
                  class: 'w-8 h-8 bg-blue-600 bg-opacity-25 rounded-full flex items-center justify-center'
                }, [
                  m('i', { class: 'ri-progress-1-fill text-xl text-white' })
                ]),
                m('div', [
                  m('h3', { class: 'text-xl font-bold' }, this.modalMode === 'create' ? 'Tambah Progress' : 'Edit Progress'),
                  m('p', { class: 'text-white text-opacity-80 text-sm' }, 'Formulir input progress monitoring')
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

          // Modal Body
          m('div', { class: 'p-6 max-h-96 overflow-y-auto' }, [
            m('div', { class: 'space-y-6' }, [
              // Progress Fields
              m('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-4' }, [
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                    m('i', { class: 'ri-progress-1-line mr-1 text-blue-500' }),
                    'Progress Fisik (%)'
                  ]),
                  m('input', {
                    type: 'number',
                    min: '0',
                    max: '100',
                    class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                    placeholder: '0-100',
                    value: this.formData.progressFisik,
                    oninput: (e) => this.formData.progressFisik = parseFloat(e.target.value) || 0
                  })
                ]),
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                    m('i', { class: 'ri-money-dollar-circle-line mr-1 text-green-500' }),
                    'Progress Keuangan (%)'
                  ]),
                  m('input', {
                    type: 'number',
                    min: '0',
                    max: '100',
                    class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                    placeholder: '0-100',
                    value: this.formData.progressKeuangan,
                    oninput: (e) => this.formData.progressKeuangan = parseFloat(e.target.value) || 0
                  })
                ])
              ]),

              // Realisasi Dana
              m('div', [
                m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                  m('i', { class: 'ri-money-dollar-box-line mr-1 text-yellow-500' }),
                  'Realisasi Dana (Rp)'
                ]),
                m('input', {
                  type: 'text',
                  class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                  placeholder: '0',
                  value: this.formData.realisasiDanaRp ? this.formData.realisasiDanaRp.toLocaleString('id-ID') : '',
                  oninput: (e) => {
                    const cleanValue = e.target.value.replace(/[^\d]/g, '');
                    this.formData.realisasiDanaRp = parseInt(cleanValue) || 0;
                    e.target.value = this.formData.realisasiDanaRp.toLocaleString('id-ID');
                  }
                })
              ]),

              // Status and Date
              m('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-4' }, [
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                    m('i', { class: 'ri-information-line mr-1 text-purple-500' }),
                    'Status'
                  ]),
                  m('select', {
                    class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                    value: this.formData.status,
                    onchange: (e) => this.formData.status = e.target.value
                  }, [
                    m('option', { value: 'planning' }, 'Planning'),
                    m('option', { value: 'in_progress' }, 'In Progress'),
                    m('option', { value: 'completed' }, 'Completed'),
                    m('option', { value: 'on_hold' }, 'On Hold'),
                    m('option', { value: 'cancelled' }, 'Cancelled')
                  ])
                ]),
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                    m('i', { class: 'ri-calendar-line mr-1 text-red-500' }),
                    'Tanggal Update'
                  ]),
                  m('input', {
                    type: 'date',
                    class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                    value: this.formData.tanggalUpdate,
                    oninput: (e) => this.formData.tanggalUpdate = e.target.value
                  })
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
                  placeholder: 'Keterangan progress (opsional)',
                  value: this.formData.keterangan,
                  oninput: (e) => this.formData.keterangan = e.target.value,
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
              onclick: () => this.closeModal()
            }, [
              m('i', { class: 'ri-close-fill' }),
              m('span', 'Batal')
            ]),
            m('button', {
              class: `px-6 py-3 bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 ${
                this.isModalLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`,
              onclick: () => this.saveMonitoring(),
              disabled: this.isModalLoading
            }, [
              this.isModalLoading ? m('i', { class: 'ri-loader-4-line animate-spin' }) : m('i', { class: 'ri-save-line' }),
              m('span', this.isModalLoading ? 'Menyimpan...' : 'Simpan')
            ])
          ])
        ])
      ])
    ]);
  }
}

export default Monitoring