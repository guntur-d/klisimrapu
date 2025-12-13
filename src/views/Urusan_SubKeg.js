import m from 'mithril'
import { Urusan, Bidang, Program, Kegiatan, SubKegiatan } from '../../models/Urusan.js';
import { UserUtils, JWTUtils, APIUtils } from '../js/utils.js';
import toast, { showConfirmation, showPrompt } from '../js/toaster.js';

const Urusan_SubKeg = {
  // State management
  isLoading: false,
  data: {
    urusan: [],
    bidang: [],
    program: [],
    kegiatan: [],
    subKegiatan: []
  },

  // Modal states
  showModal: false,
  modalMode: 'create', // 'create', 'edit', 'delete'
  modalLevel: '', // 'urusan', 'bidang', 'program', 'kegiatan', 'subkegiatan'
  currentItem: null,
  formData: {
    kode: '',
    nama: '',
    kinerja: '',
    indikator: '',
    satuan: ''
  },

  // Accordion states
  openAccordions: new Set(),

  oninit: function() {
    // Authentication check
    if (!UserUtils.isAuthenticated()) {
      toast.warning('🔐 Akses ditolak. Silakan masuk terlebih dahulu.');
      m.route.set('/login');
      return;
    }

    // Set page title in layout
    if (this.vnode && this.vnode.attrs && this.vnode.attrs.setTitle) {
      this.vnode.attrs.setTitle('Manajemen Urusan s.d. Sub Kegiatan');
    }

    // Load user data and hierarchy data
    this.userData = UserUtils.getUserData();
    this.loadHierarchyData();
  },

  loadHierarchyData: async function() {
    this.isLoading = true;
    m.redraw();

    try {
      console.log('🔄 Loading hierarchy data...');

      // Check authentication before making requests
      if (!UserUtils.isAuthenticated()) {
        console.log('❌ User not authenticated, redirecting to login');
        toast.warning('Silakan masuk terlebih dahulu');
        m.route.set('/login');
        return;
      }

      // Check if token exists but might be from old system
      const token = JWTUtils.getToken();
      if (!token) {
        console.log('❌ No token available, clearing auth data and redirecting to login');
        JWTUtils.clearAuthData();
        toast.warning('Sesi login tidak valid. Silakan masuk kembali.');
        setTimeout(() => m.route.set('/login'), 1500);
        return;
      }

      console.log('✅ Token available, proceeding with data load...');
      console.log('✅ User authenticated, loading data...');
      console.log('Token available:', !!JWTUtils.getToken());
      console.log('Token preview:', JWTUtils.getToken()?.substring(0, 20) + '...');

      // Load all data in parallel using APIUtils
      console.log('🔄 Making parallel API requests for hierarchy data...');
      const [urusan, bidang, program, kegiatan, subKegiatan] = await Promise.all([
        APIUtils.getAll('urusan').catch(error => {
          console.error('❌ Error fetching urusan:', error);
          return { success: false, data: [] };
        }),
        APIUtils.getAll('bidang').catch(error => {
          console.error('❌ Error fetching bidang:', error);
          return { success: false, data: [] };
        }),
        APIUtils.getAll('program').catch(error => {
          console.error('❌ Error fetching program:', error);
          return { success: false, data: [] };
        }),
        APIUtils.getAll('kegiatan').catch(error => {
          console.error('❌ Error fetching kegiatan:', error);
          return { success: false, data: [] };
        }),
        APIUtils.getAll('subkegiatan').catch(error => {
          console.error('❌ Error fetching subkegiatan:', error);
          return { success: false, data: [] };
        })
      ]);

      // Log API responses for debugging
      console.log('📊 API Responses:', {
        urusan: { success: urusan?.success, dataLength: urusan?.data?.length || 0 },
        bidang: { success: bidang?.success, dataLength: bidang?.data?.length || 0 },
        program: { success: program?.success, dataLength: program?.data?.length || 0 },
        kegiatan: { success: kegiatan?.success, dataLength: kegiatan?.data?.length || 0 },
        subKegiatan: { success: subKegiatan?.success, dataLength: subKegiatan?.data?.length || 0 }
      });

      // Update component data with proper fallbacks
      this.data.urusan = Array.isArray(urusan.data) ? urusan.data : [];
      this.data.bidang = Array.isArray(bidang.data) ? bidang.data : [];
      this.data.program = Array.isArray(program.data) ? program.data : [];
      this.data.kegiatan = Array.isArray(kegiatan.data) ? kegiatan.data : [];
      this.data.subKegiatan = Array.isArray(subKegiatan.data) ? subKegiatan.data : [];

      console.log('✅ Hierarchy data loaded:', {
        urusan: this.data.urusan?.length || 0,
        bidang: this.data.bidang?.length || 0,
        program: this.data.program?.length || 0,
        kegiatan: this.data.kegiatan?.length || 0,
        subKegiatan: this.data.subKegiatan?.length || 0
      });

      // Validate that all data arrays are properly initialized
      if (!Array.isArray(this.data.urusan)) {
        console.warn('⚠️ Urusan data is not an array, fixing...');
        this.data.urusan = [];
      }
      if (!Array.isArray(this.data.bidang)) {
        console.warn('⚠️ Bidang data is not an array, fixing...');
        this.data.bidang = [];
      }
      if (!Array.isArray(this.data.program)) {
        console.warn('⚠️ Program data is not an array, fixing...');
        this.data.program = [];
      }
      if (!Array.isArray(this.data.kegiatan)) {
        console.warn('⚠️ Kegiatan data is not an array, fixing...');
        this.data.kegiatan = [];
      }
      if (!Array.isArray(this.data.subKegiatan)) {
        console.warn('⚠️ SubKegiatan data is not an array, fixing...');
        this.data.subKegiatan = [];
      }

      // Debug: Log detailed urusan and bidang data
      console.log('🔍 Urusan data:', this.data.urusan.map(u => ({
        id: u._id,
        kode: u.kode,
        nama: u.nama,
        bidangCount: this.getBidangByUrusan(u._id).length
      })));

      console.log('🔍 Bidang data:', this.data.bidang.map(b => ({
        id: b._id,
        kode: b.kode,
        nama: b.nama,
        urusanId: b.urusanId?._id || b.urusanId,
        urusanIdType: typeof b.urusanId
      })));

      // Check for potential data inconsistencies
      const orphanedBidang = this.data.bidang.filter(b => {
        const bidangUrusanId = b.urusanId?._id || b.urusanId;
        return !this.data.urusan.some(u => u._id === bidangUrusanId);
      });

      if (orphanedBidang.length > 0) {
        console.warn('⚠️ Found orphaned bidang (no matching urusan):', orphanedBidang);
      }

    } catch (error) {
      console.error('❌ Error loading hierarchy data:', error);

      // Check if it's an authentication error
      if (error.code === 401 || (error.response && error.response.status === 401)) {
        console.log('❌ Authentication error, redirecting to login');
        toast.warning('Sesi login telah berakhir. Silakan masuk kembali.');
        m.route.set('/login');
      } else if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
        toast.error('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
      } else {
        toast.error('Gagal memuat data hierarki');
      }
    }

    this.isLoading = false;
    m.redraw();
  },

  // Modal functions
  openCreateModal: function(level, parentId = null) {
    this.modalMode = 'create';
    this.modalLevel = level;
    this.currentItem = { parentId };

    this.formData = {
      kode: '',
      nama: '',
      kinerja: '',
      indikator: '',
      satuan: ''
    };

    this.showModal = true;
    m.redraw();
  },

  openEditModal: function(level, item) {
    this.modalMode = 'edit';
    this.modalLevel = level;
    this.currentItem = item;

    // Populate form data based on the level
    this.formData = {
      kode: item.kode || '',
      nama: item.nama || ''
    };

    // Add level-specific fields
    if (level === 'subkegiatan') {
      this.formData.kinerja = item.kinerja || '';
      this.formData.indikator = item.indikator || '';
      this.formData.satuan = item.satuan || '';
    }

    this.showModal = true;
    m.redraw();
  },

  openDeleteModal: function(level, item) {
    this.modalMode = 'delete';
    this.modalLevel = level;
    this.currentItem = item;
    this.showModal = true;
    m.redraw();
  },

  closeModal: function() {
    this.showModal = false;
    this.currentItem = null;
    m.redraw();
  },

  // CRUD operations
  saveItem: async function() {
    // Check authentication before saving
    if (!UserUtils.isAuthenticated()) {
      toast.warning('Sesi login telah berakhir. Silakan masuk kembali.');
      m.route.set('/login');
      return;
    }

    if (!this.formData.kode || !this.formData.nama) {
      toast.warning('⚠️ Kode dan nama harus diisi dengan lengkap!');
      return;
    }

    this.isLoading = true;
    m.redraw();

    try {
      const endpoint = this.modalLevel;
      let result;

      if (this.modalMode === 'create') {
        // Add parent ID for nested creation
        const requestData = {
          ...this.formData,
          ...(this.currentItem.parentId && { [`${this.modalLevel === 'bidang' ? 'urusan' : this.modalLevel === 'program' ? 'bidang' : this.modalLevel === 'kegiatan' ? 'program' : 'kegiatan'}Id`]: this.currentItem.parentId })
        };
        result = await APIUtils.create(endpoint, requestData);
      } else {
        // Update existing item
        result = await APIUtils.update(endpoint, this.currentItem._id, this.formData);
      }

      if (result) {
        this.closeModal();
        this.loadHierarchyData();
      }
    } catch (error) {
      console.error('Error saving item:', error);
      // Error handling is already done in APIUtils
    }

    this.isLoading = false;
    m.redraw();
  },

  deleteItem: async function() {
    // Check authentication before deleting
    if (!UserUtils.isAuthenticated()) {
      toast.warning('Sesi login telah berakhir. Silakan masuk kembali.');
      m.route.set('/login');
      return;
    }

    if (!this.currentItem) return;

    // Check hierarchical relationships and Anggaran usage based on level
    try {
      const token = JWTUtils.getToken();
      if (!token) {
        toast.error('Token autentikasi tidak ditemukan');
        return;
      }

      // Define level hierarchy for checking children
      const levelHierarchy = {
        'urusan': 'bidang',
        'bidang': 'program',
        'program': 'kegiatan',
        'kegiatan': 'subkegiatan'
      };

      const nextLevel = levelHierarchy[this.modalLevel];

      // Check if current level has children in hierarchy
      if (nextLevel) {
        const childrenResponse = await fetch(`/api/${nextLevel}?${this.modalLevel}Id=${this.currentItem._id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (childrenResponse.ok) {
          const childrenResult = await childrenResponse.json();
          const childrenData = childrenResult.data || [];

          if (childrenData.length > 0) {
            // Has children - show hierarchy information
            const childrenDetails = childrenData.slice(0, 5).map(child =>
              `• ${child.kode} - ${child.nama}`
            ).join('\n');

            const remainingCount = childrenData.length - 5;
            const moreText = remainingCount > 0 ? `\n...dan ${remainingCount} lagi` : '';

            const levelNames = {
              'urusan': 'Urusan',
              'bidang': 'Bidang',
              'program': 'Program',
              'kegiatan': 'Kegiatan'
            };

            showConfirmation(
              `${levelNames[this.modalLevel]} "${this.currentItem.nama}" memiliki ${childrenData.length} anak dalam hierarki dan tidak dapat dihapus:\n\n${childrenDetails}${moreText}\n\nHapus semua ${nextLevel} anak terlebih dahulu sebelum menghapus ${this.modalLevel} ini.`,
              () => {
                toast.info(`Hapus semua ${nextLevel} anak terlebih dahulu`);
              },
              () => {
                toast.info('Penghapusan dibatalkan');
              }
            );
            return;
          }
        }
      }

      // Check if SubKegiatan is used in any Anggaran (only for subkegiatan level)
      if (this.modalLevel === 'subkegiatan') {
        const usageResponse = await fetch(`/api/anggaran?subKegiatanId=${this.currentItem._id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (usageResponse.ok) {
          const usageResult = await usageResponse.json();
          const usageData = usageResult.data || [];

          if (usageData.length > 0) {
            // SubKegiatan is in use - show detailed usage information
            const usageDetails = usageData.map(anggaran =>
              `• ${anggaran.budgetYear} - Rp ${new Intl.NumberFormat('id-ID').format(anggaran.totalAmount)}`
            ).join('\n');

            showConfirmation(
              `SubKegiatan "${this.currentItem.nama}" sedang digunakan dalam ${usageData.length} anggaran dan tidak dapat dihapus:\n\n${usageDetails}\n\nHapus anggaran terlebih dahulu sebelum menghapus subkegiatan ini.`,
              () => {
                toast.info('Hapus anggaran terlebih dahulu');
              },
              () => {
                toast.info('Penghapusan dibatalkan');
              }
            );
            return;
          }
        }
      }

    } catch (error) {
      console.error('Error checking hierarchical relationships:', error);
      toast.error('Gagal memeriksa hubungan hierarki');
      return;
    }

    this.isLoading = true;
    m.redraw();

    try {
      const endpoint = this.modalLevel;
      const nama = `${this.formData.kode} - ${this.formData.nama}`;

      const result = await APIUtils.delete(endpoint, this.currentItem._id, nama);

      if (result) {
        this.closeModal();
        this.loadHierarchyData();
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      // Error handling is already done in APIUtils
    }

    this.isLoading = false;
    m.redraw();
  },

  // Accordion functions
  toggleAccordion: function(id) {
    if (this.openAccordions.has(id)) {
      this.openAccordions.delete(id);
    } else {
      this.openAccordions.add(id);
    }
    m.redraw();
  },

  isAccordionOpen: function(id) {
    return this.openAccordions.has(id);
  },

  // Helper functions
  getBidangByUrusan: function(urusanId) {
    if (!Array.isArray(this.data.bidang)) {
      console.warn('⚠️ Bidang data is not an array');
      return [];
    }
    return this.data.bidang.filter(bidang => {
      // Handle both populated objects and string IDs
      const bidangUrusanId = bidang.urusanId?._id || bidang.urusanId;
      return bidangUrusanId === urusanId;
    });
  },

  getProgramByBidang: function(bidangId) {
    if (!Array.isArray(this.data.program)) {
      console.warn('⚠️ Program data is not an array');
      return [];
    }
    return this.data.program.filter(program => {
      const programBidangId = program.bidangId?._id || program.bidangId;
      return programBidangId === bidangId;
    });
  },

  getKegiatanByProgram: function(programId) {
    if (!Array.isArray(this.data.kegiatan)) {
      console.warn('⚠️ Kegiatan data is not an array');
      return [];
    }
    return this.data.kegiatan.filter(kegiatan => {
      const kegiatanProgramId = kegiatan.programId?._id || kegiatan.programId;
      return kegiatanProgramId === programId;
    });
  },

  getSubKegiatanByKegiatan: function(kegiatanId) {
    if (!Array.isArray(this.data.subKegiatan)) {
      console.warn('⚠️ SubKegiatan data is not an array');
      return [];
    }
    return this.data.subKegiatan.filter(subKegiatan => {
      const subKegiatanKegiatanId = subKegiatan.kegiatanId?._id || subKegiatan.kegiatanId;
      return subKegiatanKegiatanId === kegiatanId;
    });
  },

  // CRUD buttons for each item
  renderItemActions: function(level, item) {
    return m('div', {
      class: 'flex gap-1',
      style: 'display: flex; align-items: center; flex-shrink: 0;'
    }, [
      m('button', {
        class: 'w-8 h-8 bg-transparent hover:bg-gray-100 rounded border border-gray-300 flex items-center justify-center flex-shrink-0',
        onclick: (e) => {
          e.stopPropagation();
          this.openEditModal(level, item);
        },
        title: 'Edit'
      }, [
        m('i', { class: 'ri-edit-line text-yellow-500 text-sm' })
      ]),
      m('button', {
        class: 'w-8 h-8 bg-transparent hover:bg-gray-100 rounded border border-gray-300 flex items-center justify-center flex-shrink-0',
        onclick: (e) => {
          e.stopPropagation();
          this.openDeleteModal(level, item);
        },
        title: 'Delete'
      }, [
        m('i', { class: 'ri-delete-bin-line text-red-500 text-sm' })
      ])
    ]);
  },

  // Modal content
  renderModal: function() {
    if (!this.showModal) return null;

    const levelLabels = {
      urusan: 'Urusan',
      bidang: 'Bidang',
      program: 'Program',
      kegiatan: 'Kegiatan',
      subkegiatan: 'Sub Kegiatan'
    };

    const levelLabel = levelLabels[this.modalLevel];

    return m('div', {
      class: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4',
      onclick: (e) => e.target === e.currentTarget && this.closeModal()
    }, [
      m('div', {
        class: 'bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all',
        onclick: (e) => e.stopPropagation()
      }, [
        // Enhanced Modal Header
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
                  `${this.modalMode === 'create' ? 'Tambah' : this.modalMode === 'edit' ? 'Edit' : 'Hapus'} ${levelLabel}`
                ]),
                m('p', {
                  class: 'text-white text-opacity-80 text-sm'
                }, [
                  this.modalMode === 'delete'
                    ? 'Konfirmasi penghapusan data'
                    : `Formulir ${levelLabel.toLowerCase()}`
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

        // Modal Body
        m('div', { class: 'p-6' }, [

          // Delete Confirmation
          this.modalMode === 'delete' && m('div', { class: 'text-center py-6' }, [
            m('div', { class: 'mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center' }, [
              m('i', { class: 'ri-delete-bin-line text-2xl text-red-500' })
            ]),
            m('p', { class: 'text-gray-700 font-medium mb-2' },
              `Hapus ${levelLabel}:`
            ),
            m('p', { class: 'text-gray-600 mb-2' },
              `"${this.currentItem?.nama}"`
            ),
            m('p', { class: 'text-red-500 text-sm' }, '⚠️ Tindakan ini tidak dapat dibatalkan.')
          ]),

          // Create/Edit Form
          (this.modalMode === 'create' || this.modalMode === 'edit') && m('div', { class: 'space-y-6' }, [
            m('div', { class: 'grid grid-cols-1 gap-6' }, [
              // Kode Field
              m('div', [
                m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                  m('i', { class: 'ri-hashtag mr-1 text-blue-500' }),
                  'Kode'
                ]),
                m('div', { class: 'relative' }, [
                  m('input', {
                    type: 'text',
                    class: 'w-full pl-4 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                    placeholder: `Contoh: ${levelLabel === 'Urusan' ? '01' : levelLabel === 'Bidang' ? '01.01' : levelLabel === 'Program' ? '01.01.01' : '01.01.01.01'}`,
                    value: this.formData.kode,
                    oninput: (e) => this.formData.kode = e.target.value
                  }),
                  m('div', { class: 'absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm' },
                    this.formData.kode.length + '/10'
                  )
                ])
              ]),

              // Nama Field
              m('div', [
                m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                  m('i', { class: 'ri-text mr-1 text-green-500' }),
                  'Nama'
                ]),
                m('input', {
                  type: 'text',
                  class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                  placeholder: `Masukkan nama lengkap ${levelLabel.toLowerCase()}`,
                  value: this.formData.nama,
                  oninput: (e) => this.formData.nama = e.target.value
                })
              ])
            ]),

            // Additional fields for SubKegiatan
            this.modalLevel === 'subkegiatan' && m('div', { class: 'space-y-6 border-t border-gray-200 pt-6' }, [
              m('div', { class: 'text-center mb-4' }, [
                m('div', { class: 'inline-flex items-center space-x-2 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-sm font-medium' }, [
                  m('i', { class: 'ri-star-line' }),
                  m('span', 'Field Khusus Sub Kegiatan')
                ])
              ]),

              // Kinerja Field
              m('div', [
                m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                  m('i', { class: 'ri-target-line mr-1 text-amber-500' }),
                  'Target Kinerja'
                ]),
                m('textarea', {
                  class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all duration-200 bg-gray-50 focus:bg-white resize-vertical',
                  placeholder: 'Contoh: Tercapainya 100% pelayanan administrasi perijinan',
                  rows: '3',
                  value: this.formData.kinerja,
                  oninput: (e) => this.formData.kinerja = e.target.value
                })
              ]),

              m('div', { class: 'grid grid-cols-2 gap-6' }, [
                // Indikator Field
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                    m('i', { class: 'ri-bar-chart-line mr-1 text-emerald-500' }),
                    'Indikator'
                  ]),
                  m('input', {
                    type: 'text',
                    class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                    placeholder: 'Contoh: Jumlah dokumen',
                    value: this.formData.indikator,
                    oninput: (e) => this.formData.indikator = e.target.value
                  })
                ]),

                // Satuan Field
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                    m('i', { class: 'ri-scales-line mr-1 text-violet-500' }),
                    'Satuan'
                  ]),
                  m('input', {
                    type: 'text',
                    class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                    placeholder: 'Contoh: Dokumen',
                    value: this.formData.satuan,
                    oninput: (e) => this.formData.satuan = e.target.value
                  })
                ])
              ])
            ])
          ]),

          // Enhanced Modal Actions
          m('div', {
            class: 'flex justify-end gap-3 pt-6 border-t border-gray-200 bg-gray-50 px-6 py-4 rounded-b-xl'
          }, [
            m('button', {
              class: 'px-6 py-3 bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-gray-400 rounded-lg text-gray-700 font-medium transition-all duration-200 flex items-center space-x-2',
              onclick: () => this.closeModal()
            }, [
              m('i', { class: 'ri-close-fill' }),
              m('span', 'Batal')
            ]),

            this.modalMode === 'delete' ?
              m('button', {
                class: 'px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2',
                onclick: () => this.deleteItem()
              }, [
                m('i', { class: 'ri-delete-bin-line' }),
                m('span', 'Hapus')
              ]) :
              m('button', {
                class: `px-6 py-3 ${this.isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'} text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2`,
                disabled: this.isLoading,
                onclick: () => this.saveItem()
              }, [
                this.isLoading ? m('i', { class: 'ri-loader-4-line animate-spin' }) : m('i', { class: 'ri-save-line' }),
                m('span', this.isLoading ? 'Menyimpan...' : 'Simpan')
              ])
          ])
        ])
      ])
    ]);
  },

  view: function() {
    return m('div', {
      class: 'min-h-screen bg-gray-200',
      style: 'width: 100%; overflow-x: hidden;'
    }, [
      // Header
      m('div', { class: 'bg-white border-b border-gray-300 p-3 sm:p-6' }, [
        m('div', { class: 'flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0' }, [
          m('div', [
            m('h1', { class: 'text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900' }, 'Manajemen Urusan s.d. Sub Kegiatan'),
            m('p', { class: 'text-sm sm:text-base text-gray-500 mt-1' }, 'Hierarki Struktur Urusan sampai dengan Sub Kegiatan')
          ]),

          m('div', { class: 'flex gap-3' }, [
            m('button', {
              class: 'px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm sm:text-base',
              onclick: () => this.openCreateModal('urusan')
            }, [
              m('i', { class: 'ri-add-line mr-2' }),
              m('span', { class: 'hidden sm:inline' }, 'Tambah Urusan')
            ]),
            m('button', {
              class: 'px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm sm:text-base',
              onclick: () => this.loadHierarchyData()
            }, [
              m('i', { class: 'ri-refresh-line mr-2' }),
              m('span', { class: 'hidden sm:inline' }, 'Refresh Data')
            ])
          ])
        ])
      ]),

      // Loading state
      this.isLoading && m('div', { class: 'flex justify-center items-center py-12' }, [
        m('div', { class: 'flex items-center space-x-2' }, [
          m('span', { class: 'w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin' }),
          m('span', { class: 'text-gray-500' }, 'Memuat data hierarki...')
        ])
      ]),

      // Hierarchy accordion
      !this.isLoading && m('div', {
        class: 'p-3 sm:p-6 space-y-3 sm:space-y-4',
        style: 'width: 100%; padding-right: 2rem;'
      }, [
        // Urusan level (top level)
        this.data.urusan.map((urusan, index) => {
          const bidangCount = this.getBidangByUrusan(urusan._id).length;
          const bidangData = this.getBidangByUrusan(urusan._id);
          console.log(`🔍 Rendering Urusan ${index}:`, {
            id: urusan._id,
            kode: urusan.kode,
            nama: urusan.nama,
            bidangCount: bidangCount,
            hasBidang: bidangCount > 0,
            bidangData: bidangData.map(b => ({ id: b._id, kode: b.kode, urusanId: b.urusanId }))
          });

          return m('details', {
            class: 'bg-white border border-gray-300 rounded-lg mb-3',
            key: urusan._id,
            'data-urusan-index': index,
            'data-urusan-id': urusan._id,
            'data-bidang-count': bidangCount,
            style: 'position: relative; width: 100%; min-height: 4rem;'
          }, [
            m('summary', {
              class: 'text-lg font-semibold flex items-center justify-between cursor-pointer list-none p-4 min-h-[3rem] select-none',
              'data-debug-urusan': `kode:${urusan.kode}, bidang:${this.getBidangByUrusan(urusan._id).length}`,
              style: 'display: flex; align-items: center; justify-content: space-between; width: 100%; min-height: 3rem; padding-right: 2rem;'
            }, [
              m('div', {
                class: 'flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0',
                style: 'flex: 1; min-width: 0;'
              }, [
                m('i', { class: 'ri-folder-line text-blue-500 text-xl flex-shrink-0' }),
                m('div', { class: 'min-w-0 flex-1' }, [
                  m('span', { class: 'font-mono' }, urusan.kode),
                  m('span', { class: 'mx-1 sm:mx-2' }, '-'),
                  m('span', { class: 'truncate' }, urusan.nama)
                ])
              ]),
              m('div', {
                class: 'flex items-center gap-1 sm:gap-2 flex-shrink-0',
                'data-badge-count': this.getBidangByUrusan(urusan._id).length,
                style: 'flex-shrink: 0; margin-left: auto; margin-right: 1rem; display: flex; align-items: center; gap: 0.25rem; min-width: max-content; width: auto; max-width: 50%;'
              }, [
                // Always show badge, even if count is 0
                m('span', {
                  class: 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-500 text-white flex-shrink-0',
                  style: 'white-space: nowrap;'
                }, `${this.getBidangByUrusan(urusan._id).length} Bidang`),
                m('button', {
                  class: 'w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded flex items-center justify-center flex-shrink-0',
                  onclick: (e) => {
                    e.stopPropagation();
                    this.openCreateModal('bidang', urusan._id);
                  }
                }, [
                  m('i', { class: 'ri-add-line text-sm' })
                ]),
                this.renderItemActions('urusan', urusan)
              ])
            ]),

            m('div', { class: 'p-4 bg-gray-50' }, [
              // Bidang level
              this.getBidangByUrusan(urusan._id).map(bidang =>
                m('div', { class: 'ml-3 sm:ml-6 mt-3 sm:mt-4' }, [
                  m('details', { class: 'bg-gray-50 border border-gray-300 rounded-lg' }, [
                    m('summary', {
                      class: 'text-base font-medium flex items-center justify-between cursor-pointer list-none p-3 min-h-[2.5rem] select-none',
                      style: 'display: flex; align-items: center; justify-content: space-between; width: 100%; min-height: 2.5rem; padding-right: 2rem;'
                    }, [
                      m('div', {
                        class: 'flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0'
                      }, [
                        m('i', { class: 'ri-folder-2-line text-gray-500 text-lg flex-shrink-0' }),
                        m('div', { class: 'min-w-0 flex-1' }, [
                          m('span', { class: 'font-mono' }, bidang.kode),
                          m('span', { class: 'mx-1 sm:mx-2' }, '-'),
                          m('span', { class: 'truncate' }, bidang.nama)
                        ])
                      ]),
                      m('div', {
                        class: 'flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-auto',
                        style: 'margin-right: 1rem; max-width: 50%;'
                      }, [
                        m('span', {
                          class: 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-500 text-white'
                        }, `${this.getProgramByBidang(bidang._id).length} Program`),
                        m('button', {
                          class: 'w-8 h-8 bg-gray-500 hover:bg-gray-600 text-white rounded flex items-center justify-center',
                          onclick: (e) => {
                            e.stopPropagation();
                            this.openCreateModal('program', bidang._id);
                          }
                        }, [
                          m('i', { class: 'ri-add-line text-sm' })
                        ]),
                        m('div', {
                          class: 'flex gap-1',
                          onclick: (e) => e.stopPropagation()
                        }, this.renderItemActions('bidang', bidang))
                      ])
                    ]),

                    m('div', { class: 'p-4 bg-white' }, [
                      // Program level
                      this.getProgramByBidang(bidang._id).map(program =>
                        m('div', { class: 'ml-3 sm:ml-6 mt-3 sm:mt-4' }, [
                          m('details', { class: 'bg-gray-50 border border-gray-300 rounded-lg' }, [
                            m('summary', {
                              class: 'text-sm font-medium flex items-center justify-between cursor-pointer list-none p-3 min-h-[2.25rem] select-none',
                              style: 'display: flex; align-items: center; justify-content: space-between; width: 100%; min-height: 2.25rem; padding-right: 2rem;'
                            }, [
                              m('div', {
                                class: 'flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0'
                              }, [
                                m('i', { class: 'ri-folder-3-line text-purple-500 text-base flex-shrink-0' }),
                                m('div', { class: 'min-w-0 flex-1' }, [
                                  m('span', { class: 'font-mono' }, program.kode),
                                  m('span', { class: 'mx-1 sm:mx-2' }, '-'),
                                  m('span', { class: 'truncate' }, program.nama)
                                ])
                              ]),
                              m('div', {
                                class: 'flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-auto',
                                style: 'margin-right: 1rem; max-width: 50%;'
                              }, [
                                m('span', {
                                  class: 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-500 text-white'
                                }, `${this.getKegiatanByProgram(program._id).length} Kegiatan`),
                                m('button', {
                                  class: 'w-8 h-8 bg-purple-500 hover:bg-purple-600 text-white rounded flex items-center justify-center',
                                  onclick: (e) => {
                                    e.stopPropagation();
                                    this.openCreateModal('kegiatan', program._id);
                                  }
                                }, [
                                  m('i', { class: 'ri-add-line text-sm' })
                                ]),
                                m('div', {
                                  class: 'flex gap-1',
                                  onclick: (e) => e.stopPropagation()
                                }, this.renderItemActions('program', program))
                              ])
                            ]),

                            m('div', { class: 'p-4 bg-white' }, [
                              // Kegiatan level
                              this.getKegiatanByProgram(program._id).map(kegiatan =>
                                m('div', { class: 'ml-3 sm:ml-6 mt-3 sm:mt-4' }, [
                                  m('details', { class: 'bg-gray-50 border border-gray-300 rounded-lg' }, [
                                    m('summary', {
                                      class: 'text-sm font-medium flex items-center justify-between cursor-pointer list-none p-3 min-h-[2.25rem] select-none',
                                      style: 'display: flex; align-items: center; justify-content: space-between; width: 100%; min-height: 2.25rem; padding-right: 2rem;'
                                    }, [
                                      m('div', {
                                        class: 'flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0'
                                      }, [
                                        m('i', { class: 'ri-folder-4-line text-cyan-500 text-base flex-shrink-0' }),
                                        m('div', { class: 'min-w-0 flex-1' }, [
                                          m('span', { class: 'font-mono' }, kegiatan.kode),
                                          m('span', { class: 'mx-1 sm:mx-2' }, '-'),
                                          m('span', { class: 'truncate' }, kegiatan.nama)
                                        ])
                                      ]),
                                      m('div', {
                                        class: 'flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-auto',
                                        style: 'margin-right: 1rem; max-width: 50%;'
                                      }, [
                                        m('span', {
                                          class: 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-cyan-500 text-white'
                                        }, `${this.getSubKegiatanByKegiatan(kegiatan._id).length} Sub Kegiatan`),
                                        m('button', {
                                          class: 'w-8 h-8 bg-cyan-500 hover:bg-cyan-600 text-white rounded flex items-center justify-center',
                                          onclick: (e) => {
                                            e.stopPropagation();
                                            this.openCreateModal('subkegiatan', kegiatan._id);
                                          }
                                        }, [
                                          m('i', { class: 'ri-add-line text-sm' })
                                        ]),
                                        m('div', {
                                          class: 'flex gap-1',
                                          onclick: (e) => e.stopPropagation()
                                        }, this.renderItemActions('kegiatan', kegiatan))
                                      ])
                                    ]),

                                    m('div', { class: 'p-4 bg-white' }, [
                                      // SubKegiatan level
                                      m('div', { class: 'ml-3 sm:ml-6 mt-3 sm:mt-4 space-y-2 sm:space-y-3' }, [
                                        this.getSubKegiatanByKegiatan(kegiatan._id).map(subKegiatan =>
                                          m('div', {
                                            class: 'bg-white border border-gray-300 rounded-lg p-3 sm:p-4 hover:bg-gray-50 transition-colors'
                                          }, [
                                            m('div', { class: 'flex items-start justify-between' }, [
                                              m('div', { class: 'flex-1' }, [
                                                m('div', { class: 'flex items-center space-x-3 mb-2' }, [
                                                  m('i', { class: 'ri-folder-5-line text-green-500' }),
                                                  m('div', [
                                                    m('span', { class: 'font-mono text-sm' }, subKegiatan.kode),
                                                    m('span', { class: 'mx-2 text-gray-400' }, '-'),
                                                    m('span', { class: 'font-medium' }, subKegiatan.nama)
                                                  ])
                                                ]),
                                                m('div', { class: 'ml-3 sm:ml-6 space-y-1 text-xs sm:text-sm text-gray-500' }, [
                                                  m('div', [
                                                    m('span', { class: 'font-medium' }, 'Kinerja: '),
                                                    m('span', subKegiatan.kinerja)
                                                  ]),
                                                  m('div', [
                                                    m('span', { class: 'font-medium' }, 'Indikator: '),
                                                    m('span', subKegiatan.indikator)
                                                  ]),
                                                  m('div', [
                                                    m('span', { class: 'font-medium' }, 'Satuan: '),
                                                    m('span', subKegiatan.satuan)
                                                  ])
                                                ])
                                              ]),
                                              this.renderItemActions('subkegiatan', subKegiatan)
                                            ])
                                          ])
                                        ),

                                        // Show message if no SubKegiatan
                                        this.getSubKegiatanByKegiatan(kegiatan._id).length === 0 &&
                                        m('div', {
                                          class: 'text-center py-8 text-gray-400 bg-white border border-dashed border-gray-300 rounded-lg'
                                        }, [
                                          m('i', { class: 'ri-folder-5-line text-3xl mb-2 text-gray-300' }),
                                          m('p', 'Belum ada Sub Kegiatan'),
                                          m('p', { class: 'text-sm' }, 'Klik tombol + untuk menambah Sub Kegiatan baru')
                                        ])
                                      ])
                                    ])
                                  ])
                                ])
                              ),

                              // Show message if no Kegiatan
                              this.getKegiatanByProgram(program._id).length === 0 &&
                              m('div', {
                                class: 'text-center py-8 text-gray-400 bg-white border border-dashed border-gray-300 rounded-lg'
                              }, [
                                m('i', { class: 'ri-folder-4-line text-3xl mb-2 text-gray-300' }),
                                m('p', 'Belum ada Kegiatan'),
                                m('p', { class: 'text-sm' }, 'Klik tombol + untuk menambah Kegiatan baru')
                              ])
                            ])
                          ])
                        ])
                      ),

                      // Show message if no Program
                      this.getProgramByBidang(bidang._id).length === 0 &&
                      m('div', {
                        class: 'text-center py-8 text-gray-400 bg-white border border-dashed border-gray-300 rounded-lg'
                      }, [
                        m('i', { class: 'ri-folder-3-line text-3xl mb-2 text-gray-300' }),
                        m('p', 'Belum ada Program'),
                        m('p', { class: 'text-sm' }, 'Klik tombol + untuk menambah Program baru')
                      ])
                    ])
                  ])
                ])
              ),

              // Show message if no Bidang
              this.getBidangByUrusan(urusan._id).length === 0 &&
              m('div', {
                class: 'text-center py-8 text-gray-400 bg-white border border-dashed border-gray-300 rounded-lg'
              }, [
                m('i', { class: 'ri-folder-2-line text-3xl mb-2 text-gray-300' }),
                m('p', 'Belum ada Bidang'),
                m('p', { class: 'text-sm' }, 'Klik tombol + untuk menambah Bidang baru')
              ])
            ])
          ])
        }),

        // Show message if no Urusan
        this.data.urusan.length === 0 &&
        m('div', {
          class: 'text-center py-12 text-gray-400'
        }, [
          m('i', { class: 'ri-folder-line text-6xl mb-4 text-gray-300' }),
          m('h3', { class: 'text-xl font-semibold mb-2' }, 'Belum ada data hierarki'),
          m('p', { class: 'mb-4' }, 'Data akan muncul di sini setelah diimpor dari CSV'),
          m('button', {
            class: 'px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded',
            onclick: () => this.loadHierarchyData()
          }, [
            m('i', { class: 'ri-refresh-line mr-2' }),
            'Muat Ulang Data'
          ])
        ])
      ]),

      // Modal
      this.renderModal()
    ]);
  }
};

export default Urusan_SubKeg;