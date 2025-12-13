import m from 'mithril'
import { UserUtils, APIUtils, ToastUtils } from '../js/utils.js'

const SumberDana = {
  // State management
  isLoading: false,
  sumberDanaList: [],
  filteredSumberDana: [],

  // Modal states
  showModal: false,
  modalMode: 'create', // 'create' or 'edit'
  isModalLoading: false,

  // Form data
  formData: {
    kode: '',
    nama: '',
    isActive: true
  },

  // Search and filter
  searchQuery: '',
  filterStatus: 'all',

  // Pagination
  currentPage: 1,
  itemsPerPage: 10,

  errors: {},

  oninit: function() {
    // Authentication check
    if (!UserUtils.isAuthenticated()) {
      ToastUtils.warning('Silakan masuk terlebih dahulu');
      setTimeout(() => {
        m.route.set('/login');
      }, 100);
      return;
    }

    // Set page title in layout
    if (this.vnode && this.vnode.attrs && this.vnode.attrs.setTitle) {
      this.vnode.attrs.setTitle('Manajemen Sumber Dana');
    }

    this.loadData();
  },

  loadData: async function() {
    // Double-check authentication before making API call
    if (!UserUtils.isAuthenticated()) {
      ToastUtils.warning('Silakan masuk terlebih dahulu');
      setTimeout(() => {
        m.route.set('/login');
      }, 100);
      return;
    }

    this.isLoading = true;
    m.redraw();

    try {
      // DEBUG: Log authentication status
      console.log('🔍 DEBUG [SumberDana] Authentication check:', {
        isAuthenticated: UserUtils.isAuthenticated(),
        userData: UserUtils.getUserData()
      });

      // DEBUG: Log what URL APIUtils will call
      console.log('🔍 DEBUG [SumberDana] About to call APIUtils.getAll("sumberdana")');

      // Use APIUtils.getAll() for loading sumber dana data
      const result = await APIUtils.getAll('sumberdana');
      
      // DEBUG: Log API response structure - individual properties to avoid truncation
      console.log('🔍 DEBUG [SumberDana] API Response - result:', result);
      console.log('🔍 DEBUG [SumberDana] API Response - resultType:', typeof result);
      console.log('🔍 DEBUG [SumberDana] API Response - resultKeys:', Object.keys(result || {}));
      console.log('🔍 DEBUG [SumberDana] API Response - hasData:', result?.data ? 'YES' : 'NO');
      console.log('🔍 DEBUG [SumberDana] API Response - result.data:', result?.data);
      console.log('🔍 DEBUG [SumberDana] API Response - result.data.length:', result?.data?.length);
      console.log('🔍 DEBUG [SumberDana] API Response - isResultDataArray:', Array.isArray(result?.data));
      
      // NEW: Deep dive into the data structure
      console.log('🔍 DEBUG [SumberDana] API Response - result.data?.data:', result?.data?.data);
      console.log('🔍 DEBUG [SumberDana] API Response - result.data?.data?.length:', result?.data?.data?.length);
      console.log('🔍 DEBUG [SumberDana] API Response - result.data?.pagination:', result?.data?.pagination);

      // DEBUG: Log what we're assigning - FIXED to use correct path (APIUtils now returns array directly)
      const dataToAssign = result.data || [];
      console.log('🔍 DEBUG [SumberDana] Data to assign:', {
        source: 'result.data (array from fixed APIUtils)',
        length: Array.isArray(dataToAssign) ? dataToAssign.length : 0,
        firstItem: Array.isArray(dataToAssign) && dataToAssign[0] ? dataToAssign[0] : null,
        isArray: Array.isArray(dataToAssign)
      });

      this.sumberDanaList = Array.isArray(dataToAssign) ? dataToAssign : [];
      
      // DEBUG: Log after assignment
      console.log('🔍 DEBUG [SumberDana] After assignment:', {
        this_sumberDanaList_length: this.sumberDanaList.length,
        this_sumberDanaList_first: this.sumberDanaList[0] || null,
        this_sumberDanaList_type: typeof this.sumberDanaList,
        this_sumberDanaList_isArray: Array.isArray(this.sumberDanaList)
      });

      this.applyFilters();
      ToastUtils.success('Data Sumber Dana berhasil dimuat');
    } catch (error) {
      console.error('❌ DEBUG [SumberDana] Error loading data:', error);

      if (error.code === 401 || (error.response && error.response.status === 401)) {
        ToastUtils.warning('Sesi login telah berakhir. Silakan masuk kembali.');
        setTimeout(() => m.route.set('/login'), 2000);
      } else {
        ToastUtils.error('Gagal memuat data Sumber Dana: ' + (error.message || 'Kesalahan tidak diketahui'));
      }

      this.sumberDanaList = [];
      this.filteredSumberDana = [];
    } finally {
      this.isLoading = false;
      m.redraw();
    }
  },

  applyFilters: function() {
    let filtered = [...this.sumberDanaList];

    // Apply search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.kode.toLowerCase().includes(query) ||
        item.nama.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (this.filterStatus !== 'all') {
      const isActive = this.filterStatus === 'active';
      filtered = filtered.filter(item => item.isActive === isActive);
    }

    this.filteredSumberDana = filtered;
    this.currentPage = 1; // Reset to first page when filters change
  },

  resetForm: function() {
    this.formData = {
      kode: '',
      nama: '',
      isActive: true
    };
    this.errors = {};
  },

  validateForm: function() {
    this.errors = {};

    if (!this.formData.kode.trim()) {
      this.errors.kode = 'Kode harus diisi';
    }

    if (!this.formData.nama.trim()) {
      this.errors.nama = 'Nama harus diisi';
    }

    return Object.keys(this.errors).length === 0;
  },

  openCreateModal: function() {
    this.modalMode = 'create';
    this.resetForm();
    this.showModal = true;
  },

  openEditModal: item => {
    this.modalMode = 'edit';
    this.formData = {
      _id: item._id,
      kode: item.kode,
      nama: item.nama,
      isActive: item.isActive
    };
    this.errors = {};
    this.showModal = true;
  },

  closeModal: function() {
    this.showModal = false;
    this.resetForm();
  },

  saveItem: async function() {
    if (!this.validateForm()) {
      ToastUtils.warning('Harap lengkapi semua field yang wajib diisi');
      return;
    }

    this.isModalLoading = true;
    m.redraw();

    try {
      if (this.modalMode === 'edit') {
        await APIUtils.update('sumberdana', this.formData._id, this.formData);
        ToastUtils.success('Sumber Dana berhasil diperbarui');
      } else {
        await APIUtils.create('sumberdana', this.formData);
        ToastUtils.success('Sumber Dana berhasil ditambahkan');
      }
      
      this.closeModal();
      this.loadData();
    } catch (error) {
      console.error('Error saving data:', error);
      // APIUtils handles error display
    } finally {
      this.isModalLoading = false;
      m.redraw();
    }
  },

  deleteItem: async function(item) {
    ToastUtils.confirm(
      `Apakah Anda yakin ingin menghapus Sumber Dana "${item.nama}"?`,
      async () => {
        this.isLoading = true;
        m.redraw();

        try {
          await APIUtils.delete('sumberdana', item._id, `Sumber Dana "${item.nama}"`);
          this.loadData();
        } catch (error) {
          console.error('Error deleting data:', error);
          ToastUtils.error('Gagal menghapus Sumber Dana: ' + (error.message || 'Kesalahan tidak diketahui'));
        } finally {
          this.isLoading = false;
          m.redraw();
        }
      },
      () => {
        ToastUtils.info('Penghapusan dibatalkan');
      }
    );
  },

  // Pagination helpers
  getTotalPages: function() {
    return Math.ceil(this.filteredSumberDana.length / this.itemsPerPage);
  },

  getPaginatedItems: function() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredSumberDana.slice(startIndex, endIndex);
  },

  changePage: function(page) {
    if (page >= 1 && page <= this.getTotalPages()) {
      this.currentPage = page;
      m.redraw();
    }
  },

  view: function() {
    return m('div', { class: 'space-y-6' }, [

      // Header
      m('div', { class: 'flex justify-between items-center' }, [
        m('div', [
          m('h1', { class: 'text-2xl font-bold text-gray-900' }, 'Sumber Dana'),
          m('p', { class: 'text-gray-600 mt-1' }, 'Kelola sumber dana untuk anggaran')
        ]),
        m('button', {
          class: 'inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl',
          onclick: () => this.openCreateModal()
        }, [
          m('i', { class: 'ri-add-line mr-2' }),
          'Tambah Sumber Dana'
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
                class: 'w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent',
                placeholder: 'Cari kode atau nama...',
                value: this.searchQuery,
                oninput: (e) => {
                  this.searchQuery = e.target.value;
                  this.applyFilters();
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
              class: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent',
              value: this.filterStatus,
              onchange: (e) => {
                this.filterStatus = e.target.value;
                this.applyFilters();
              }
            }, [
              m('option', { value: 'all' }, 'Semua Status'),
              m('option', { value: 'active' }, 'Aktif'),
              m('option', { value: 'inactive' }, 'Non Aktif')
            ])
          ]),

          // Results info
          m('div', { class: 'flex items-end' }, [
            m('div', { class: 'text-sm text-gray-600' }, [
              m('div', `Menampilkan ${this.filteredSumberDana.length} dari ${this.sumberDanaList.length} sumber dana`),
              this.searchQuery && m('div', { class: 'text-green-600' }, `Pencarian: "${this.searchQuery}"`)
            ])
          ])
        ])
      ]),

      // Loading indicator
      this.isLoading ?
        m('div', { class: 'flex justify-center items-center h-64' }, [
          m('div', { class: 'w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin' })
        ]) :

        // Items table
        m('div', { class: 'bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden' }, [
          m('div', { class: 'overflow-x-auto' }, [
            m('table', { class: 'min-w-full divide-y divide-gray-200' }, [
              m('thead', { class: 'bg-gray-50' }, [
                m('tr', [
                  m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Kode'),
                  m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Nama'),
                  m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Status'),
                  m('th', { class: 'px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Aksi')
                ])
              ]),
              m('tbody', { class: 'bg-white divide-y divide-gray-200' },
                this.getPaginatedItems().map(item => [
                  m('tr', { class: 'hover:bg-gray-50' }, [
                    m('td', { class: 'px-6 py-4 whitespace-nowrap' }, [
                      m('div', { class: 'text-sm font-mono font-medium text-gray-900' }, item.kode)
                    ]),
                    m('td', { class: 'px-6 py-4' }, [
                      m('div', { class: 'text-sm font-medium text-gray-900' }, item.nama)
                    ]),
                    m('td', { class: 'px-6 py-4 whitespace-nowrap' }, [
                      m('span', {
                        class: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`
                      }, item.isActive ? 'Aktif' : 'Non Aktif')
                    ]),
                    m('td', { class: 'px-6 py-4 whitespace-nowrap text-right text-sm font-medium' }, [
                      m('div', { class: 'flex justify-end space-x-2' }, [
                        m('button', {
                          class: 'text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-50',
                          onclick: () => this.openEditModal(item),
                          title: 'Edit'
                        }, [
                          m('i', { class: 'ri-edit-line text-lg' })
                        ]),
                        m('button', {
                          class: 'text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50',
                          onclick: () => this.deleteItem(item),
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
                  m('span', { class: 'font-medium' }, Math.min(this.currentPage * this.itemsPerPage, this.filteredSumberDana.length)),
                  ' dari ',
                  m('span', { class: 'font-medium' }, this.filteredSumberDana.length),
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
                  Array.from({ length: Math.min(5, this.getTotalPages()) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(this.getTotalPages() - 4, this.currentPage - 2)) + i;
                    return m('button', {
                      class: `relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${
                        pageNum === this.currentPage ? 'z-10 bg-green-50 border-green-500 text-green-600' : 'text-gray-500 hover:bg-gray-50'
                      }`,
                      onclick: () => this.changePage(pageNum)
                    }, pageNum);
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
        ]),

      // Modal for Create/Edit
      this.showModal && m('div', {
        class: 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50',
        onclick: (e) => {
          if (e.target === e.currentTarget) this.closeModal();
        }
      }, [
        m('div', { class: 'relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white' }, [
          // Modal header
          m('div', { class: 'bg-gradient-to-r from-green-500 to-teal-600 text-white p-4 rounded-t-md' }, [
            m('div', { class: 'flex items-center justify-between' }, [
              m('div', { class: 'flex items-center space-x-3' }, [
                m('div', { class: 'w-10 h-10 bg-white bg-opacity-75 rounded-full flex items-center justify-center' }, [
                  m('i', { class: `${this.modalMode === 'create' ? 'ri-add-fill' : 'ri-edit-fill'} text-lg` })
                ]),
                m('div', [
                  m('h3', { class: 'text-lg font-bold' }, `${this.modalMode === 'create' ? 'Tambah' : 'Edit'} Sumber Dana`),
                  m('p', { class: 'text-white text-opacity-80 text-sm' }, 'Kelola informasi sumber dana')
                ])
              ]),
              m('button', {
                class: 'w-8 h-8 bg-green-600 bg-opacity-25 rounded-full flex items-center justify-center',
                onclick: () => this.closeModal()
              }, [
                m('i', { class: 'ri-close-fill' })
              ])
            ])
          ]),

          // Modal body
          m('div', { class: 'p-6' }, [
            m('div', { class: 'space-y-6' }, [

              // Kode field
              m('div', [
                m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                  m('i', { class: 'ri-hashtag mr-1 text-green-500' }),
                  'Kode',
                  m('span', { class: 'text-red-500 ml-1' }, '*')
                ]),
                m('input', {
                  type: 'text',
                  class: `w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all duration-200 bg-gray-50 focus:bg-white ${
                    this.errors.kode
                      ? 'border-red-500 focus:ring-2 focus:ring-red-200'
                      : 'border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200'
                  }`,
                  placeholder: 'Contoh: 1, 2, 3',
                  value: this.formData.kode,
                  oninput: (e) => this.formData.kode = e.target.value,
                  disabled: this.isModalLoading
                }),
                this.errors.kode && m('p', { class: 'mt-1 text-sm text-red-600' }, [
                  m('i', { class: 'ri-error-warning-line mr-1' }),
                  this.errors.kode
                ])
              ]),

              // Nama field
              m('div', [
                m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                  m('i', { class: 'ri-text mr-1 text-blue-500' }),
                  'Nama Sumber Dana',
                  m('span', { class: 'text-red-500 ml-1' }, '*')
                ]),
                m('input', {
                  type: 'text',
                  class: `w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all duration-200 bg-gray-50 focus:bg-white ${
                    this.errors.nama
                      ? 'border-red-500 focus:ring-2 focus:ring-red-200'
                      : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                  }`,
                  placeholder: 'Nama lengkap sumber dana',
                  value: this.formData.nama,
                  oninput: (e) => this.formData.nama = e.target.value,
                  disabled: this.isModalLoading
                }),
                this.errors.nama && m('p', { class: 'mt-1 text-sm text-red-600' }, [
                  m('i', { class: 'ri-error-warning-line mr-1' }),
                  this.errors.nama
                ])
              ]),

              // Status field
              m('div', [
                m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                  m('i', { class: 'ri-toggle-line mr-1 text-purple-500' }),
                  'Status'
                ]),
                m('div', { class: 'flex items-center space-x-4' }, [
                  m('label', { class: 'flex items-center' }, [
                    m('input', {
                      type: 'radio',
                      name: 'isActive',
                      value: 'true',
                      checked: this.formData.isActive === true,
                      onchange: () => this.formData.isActive = true,
                      disabled: this.isModalLoading
                    }),
                    m('span', { class: 'ml-2 text-sm text-gray-700' }, 'Aktif')
                  ]),
                  m('label', { class: 'flex items-center' }, [
                    m('input', {
                      type: 'radio',
                      name: 'isActive',
                      value: 'false',
                      checked: this.formData.isActive === false,
                      onchange: () => this.formData.isActive = false,
                      disabled: this.isModalLoading
                    }),
                    m('span', { class: 'ml-2 text-sm text-gray-700' }, 'Non Aktif')
                  ])
                ])
              ])
            ])
          ]),

          // Modal actions
          m('div', { class: 'flex justify-end gap-3 pt-6 border-t border-gray-200 bg-gray-50 px-6 py-4 rounded-b-md' }, [
            m('button', {
              class: 'px-6 py-3 bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-gray-400 rounded-lg text-gray-700 font-medium transition-all duration-200 flex items-center space-x-2',
              onclick: () => this.closeModal(),
              disabled: this.isModalLoading
            }, [
              m('i', { class: 'ri-close-fill' }),
              m('span', 'Batal')
            ]),
            m('button', {
              class: `px-6 py-3 bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 ${
                this.isModalLoading ? 'cursor-not-allowed opacity-50' : ''
              }`,
              onclick: () => this.saveItem(),
              disabled: this.isModalLoading
            }, [
              this.isModalLoading ? m('i', { class: 'ri-loader-4-line animate-spin' }) : m('i', { class: 'ri-save-line' }),
              m('span', this.isModalLoading ? 'Menyimpan...' : 'Simpan')
            ])
          ])
        ])
      ])
    ])
  }
}

export default SumberDana;