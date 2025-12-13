import m from 'mithril'
import { UserUtils, APIUtils, ToastUtils } from '../js/utils.js'

const KodeRekening = {
  // State management
  isLoading: false,
  accounts: [],
  filteredAccounts: [],

  // Modal states
  showModal: false,
  modalMode: 'create', // 'create' or 'edit'
  isModalLoading: false,

  // Form data
  formData: {
    code: '',
    name: '',
    fullCode: '',
    description: '',
    level: 1,
    parent: null
  },

  // Available parents for selection
  availableParents: [],

  // Search and filter
  searchQuery: '',
  selectedLevel: 'all',

  // Pagination
  currentPage: 1,
  itemsPerPage: 20,

  errors: {},

  // Indonesian locale for currency formatting
  formatCurrency: function(amount) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0)
  },

  // Helper function to extract clean hierarchical code
  getCleanFullCode: function(fullCode) {
    if (!fullCode) return '';

    // If fullCode contains dots and looks like a hierarchical code, return as is
    if (/^\d+(\.\d+)*\./.test(fullCode)) {
      return fullCode;
    }

    // Try to extract just the hierarchical code part (e.g., "4.2" from "4.2.PENDAPATAN TRANSFER")
    const parts = fullCode.split('.');
    if (parts.length > 1) {
      const codeParts = parts.slice(0, 3); // Take first 3 parts as they're likely the code
      if (codeParts.every(part => /^\d+$/.test(part.trim()))) {
        return codeParts.join('.');
      }
    }

    // If it starts with a number, try to extract just the number part
    const match = fullCode.match(/^(\d+(?:\.\d+)*)/);
    if (match) {
      return match[1];
    }

    // As a last resort, return a truncated version
    return fullCode.length > 20 ? fullCode.substring(0, 20) + '...' : fullCode;
  },

  // Build hierarchical tree structure from flat accounts array
  buildHierarchyTree: function(accounts) {
    const map = new Map();
    const roots = [];

    // First pass: create all nodes
    accounts.forEach(account => {
      map.set(account._id, {
        ...account,
        children: [],
        level: parseInt(account.level)
      });
    });

    // Second pass: build tree structure based on fullCode hierarchy
    accounts.forEach(account => {
      const node = map.get(account._id);
      const accountCode = account.fullCode;

      // Find parent based on fullCode structure
      let parent = null;
      for (let [id, potentialParent] of map) {
        if (potentialParent._id !== account._id &&
            accountCode.startsWith(potentialParent.fullCode + '.') &&
            accountCode !== potentialParent.fullCode) {

          // Check if this is the direct parent (no intermediate levels)
          const parentCodeParts = potentialParent.fullCode.split('.');
          const accountCodeParts = accountCode.split('.');
          if (accountCodeParts.length === parentCodeParts.length + 1) {
            parent = potentialParent;
            break;
          }
        }
      }

      if (parent) {
        // Add to parent's children
        parent.children.push(node);
      } else {
        // This is a root node
        roots.push(node);
      }
    });

    return roots;
  },

  // Flatten hierarchical tree for display with depth information
  flattenHierarchy: function(nodes, depth = 0) {
    const result = [];

    nodes.forEach(node => {
      result.push({
        ...node,
        depth: depth,
        hasChildren: node.children.length > 0
      });

      if (node.children.length > 0) {
        result.push(...this.flattenHierarchy(node.children, depth + 1));
      }
    });

    return result;
  },

  // Get hierarchical display data
  getHierarchicalAccounts: function() {
    if (this.accounts.length === 0) return [];

    const tree = this.buildHierarchyTree(this.accounts);
    return this.flattenHierarchy(tree);
  },

  // Get expected format for a given level
  getExpectedFormat: function(level) {
    const formats = {
      1: 'X',
      2: 'X.X',
      3: 'X.X.X',
      4: 'X.X.X.X',
      5: 'X.X.X.X.X',
      6: 'X.X.X.X.X.X'
    };
    return formats[level] || 'X.X.X';
  },

  // Get level name for a given level number
  getLevelName: function(level) {
    const levelNames = {
      1: 'Level 1 (Akun)',
      2: 'Level 2 (Kelompok)',
      3: 'Level 3 (Jenis)',
      4: 'Level 4 (Objek)',
      5: 'Level 5 (Rincian Objek)',
      6: 'Level 6 (Sub Rincian Objek)'
    };
    return levelNames[level] || `Level ${level}`;
  },

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
      this.vnode.attrs.setTitle('Manajemen Kode Rekening');
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
      // Use APIUtils.getAll() for loading kode rekening data
      const result = await APIUtils.getAll('koderekening');
      this.accounts = result.data || [];
      this.availableParents = this.accounts.filter(account => account.isLeaf === false);
      this.applyFilters();
      ToastUtils.success('Data Kode Rekening berhasil dimuat');
    } catch (error) {
      console.error('Error loading data:', error);

      if (error.code === 401 || (error.response && error.response.status === 401)) {
        ToastUtils.warning('Sesi login telah berakhir. Silakan masuk kembali.');
        setTimeout(() => m.route.set('/login'), 2000);
      } else {
        ToastUtils.error('Gagal memuat data Kode Rekening: ' + (error.message || 'Kesalahan tidak diketahui'));
      }

      this.accounts = [];
      this.availableParents = [];
      this.filteredAccounts = [];
    } finally {
      this.isLoading = false;
      m.redraw();
    }
  },

  applyFilters: function() {
    let filtered = [...this.accounts];

    // Apply search filter first
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(account =>
        account.code.toLowerCase().includes(query) ||
        account.name.toLowerCase().includes(query) ||
        account.fullCode.toLowerCase().includes(query) ||
        (account.description && account.description.toLowerCase().includes(query))
      );
    }

    // Apply level filter (UI level corresponds directly to database level)
    if (this.selectedLevel === 'hierarchy') {
      // For hierarchy view, organize filtered accounts hierarchically
      const filteredAccounts = filtered;
      const tree = this.buildHierarchyTree(filteredAccounts);
      this.filteredAccounts = this.flattenHierarchy(tree);
    } else if (this.selectedLevel !== 'all') {
      const uiLevel = parseInt(this.selectedLevel);
      filtered = filtered.filter(account => account.level === uiLevel);
      this.filteredAccounts = filtered;
    } else {
      this.filteredAccounts = filtered;
    }

    this.currentPage = 1; // Reset to first page when filters change
  },

  resetForm: function() {
    this.formData = {
      code: '',
      name: '',
      fullCode: '',
      description: '',
      level: 1, // Default to level 1
      parent: null
    };
    this.errors = {};
  },

  // Auto-generate kode lengkap based on parent selection
  generateFullCode: function(parentId, code) {
    if (!parentId || !code) {
      return code || '';
    }

    // Find the parent account
    const parent = this.accounts.find(account => account._id === parentId);
    if (!parent) {
      return code;
    }

    // Generate full code as parent.fullCode + '.' + code
    return `${parent.fullCode}.${code}`;
  },

  // Get next level based on parent
  getNextLevel: function(parentId) {
    if (!parentId) {
      return 1; // Root level
    }

    const parent = this.accounts.find(account => account._id === parentId);
    return parent ? parent.level + 1 : 1;
  },

  validateForm: function() {
    this.errors = {};

    if (!this.formData.code.trim()) {
      this.errors.code = 'Kode harus diisi';
    }

    if (!this.formData.name.trim()) {
      this.errors.name = 'Nama harus diisi';
    }

    // For create mode, Kode Lengkap is auto-generated, so we don't need to validate it
    // For edit mode, we still need to validate it
    if (this.modalMode === 'edit') {
      if (!this.formData.fullCode.trim()) {
        this.errors.fullCode = 'Kode Lengkap harus diisi';
      } else {
        // Validate Kode Lengkap format based on selected level
        const levelValidation = this.validateFullCodeFormat();
        if (!levelValidation.valid) {
          this.errors.fullCode = levelValidation.message;
        }
      }
    }

    return Object.keys(this.errors).length === 0;
  },

  // Validate that Kode Lengkap format matches the selected level
  validateFullCodeFormat: function() {
    const fullCode = this.formData.fullCode.trim();
    const selectedLevel = parseInt(this.formData.level);

    // Skip validation if in edit mode and fullCode is already set
    if (this.modalMode === 'edit' && fullCode) {
      // For edit mode, just validate that each part is a number
      const parts = fullCode.split('.');
      for (let i = 0; i < parts.length; i++) {
        if (!/^\d+$/.test(parts[i])) {
          return {
            valid: false,
            message: `Bagian ke-${i + 1} dari Kode Lengkap harus berupa angka.`
          };
        }
      }
      return { valid: true };
    }

    // Count dots in fullCode to determine actual level
    const dotCount = (fullCode.match(/\./g) || []).length;
    const actualLevel = dotCount + 1; // Level = dot count + 1

    // Check if actual level matches selected level
    if (actualLevel !== selectedLevel) {
      const levelNames = {
        1: 'Level 1 (Akun)',
        2: 'Level 2 (Kelompok)',
        3: 'Level 3 (Jenis)',
        4: 'Level 4 (Objek)',
        5: 'Level 5 (Rincian Objek)',
        6: 'Level 6 (Sub Rincian Objek)'
      };

      return {
        valid: false,
        message: `Format Kode Lengkap tidak sesuai dengan ${levelNames[selectedLevel]}. Seharusnya memiliki ${selectedLevel} bagian angka, tetapi memiliki ${actualLevel} bagian.`
      };
    }

    // Additional validation: each part should be a number
    const parts = fullCode.split('.');
    for (let i = 0; i < parts.length; i++) {
      if (!/^\d+$/.test(parts[i])) {
        return {
          valid: false,
          message: `Bagian ke-${i + 1} dari Kode Lengkap harus berupa angka.`
        };
      }
    }

    return { valid: true };
  },

  openCreateModal: function() {
    this.modalMode = 'create';
    this.resetForm();
    this.showModal = true;
  },

  openEditModal: function(account) {
    this.modalMode = 'edit';
    this.formData = {
      _id: account._id,
      code: account.code,
      name: account.name,
      fullCode: account.fullCode,
      description: account.description || '',
      level: account.level, // Keep database level for API calls
      parent: account.parent
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
      const method = this.modalMode === 'edit' ? 'PUT' : 'POST';
      const endpoint = this.modalMode === 'edit'
        ? `koderekening/${this.formData._id}`
        : 'koderekening';

      // Use APIUtils for create/update operations
      await APIUtils.request(`/api/${endpoint}`, {
        method: method,
        body: this.formData
      });

      const result = await response.json();

      ToastUtils.success(`Kode Rekening berhasil di${this.modalMode === 'edit' ? 'perbarui' : 'simpan'}`);
      this.closeModal();
      this.loadData();
    } catch (error) {
      console.error('Error saving data:', error);
      ToastUtils.error(`Gagal ${this.modalMode === 'edit' ? 'memperbarui' : 'menyimpan'} Kode Rekening: ` + (error.message || 'Kesalahan tidak diketahui'));
    } finally {
      this.isModalLoading = false;
      m.redraw();
    }
  },

  deleteItem: async function(account) {
    // First check if Kode Rekening is used in any Anggaran
    try {
      // Check if Kode Rekening is used in Anggaran using APIUtils
      const usageResult = await APIUtils.request(`/api/anggaran?kodeRekeningId=${account._id}`);

      const usageData = usageResult.data || [];

      if (usageData.length > 0) {
        // Kode Rekening is in use - show detailed usage information
        const usageDetails = usageData.map(anggaran =>
          `• ${anggaran.subKegiatanId?.nama} (${anggaran.budgetYear}) - ${this.formatCurrency(anggaran.allocations.find(a => a.kodeRekeningId === account._id)?.amount || 0)}`
        ).join('\n');

        ToastUtils.confirm(
          `Kode Rekening "${account.name}" sedang digunakan dalam ${usageData.length} anggaran dan tidak dapat dihapus:\n\n${usageDetails}\n\nHapus alokasi dari anggaran terlebih dahulu sebelum menghapus kode rekening ini.`,
          () => {
            ToastUtils.info('Hapus alokasi dari anggaran terlebih dahulu');
          },
          () => {
            ToastUtils.info('Penghapusan dibatalkan');
          }
        );
        return;
      }

      // Check if Kode Rekening has child records in hierarchy using APIUtils
      const childrenResult = await APIUtils.request(`/api/koderekening?search=${encodeURIComponent(account.fullCode + '.')}`);

      const childrenData = childrenResult.data || [];

      if (childrenData.length > 0) {
        // Kode Rekening has children - show hierarchy information
        const childrenDetails = childrenData.slice(0, 5).map(child =>
          `• ${child.fullCode} - ${child.name}`
        ).join('\n');

        const remainingCount = childrenData.length - 5;
        const moreText = remainingCount > 0 ? `\n...dan ${remainingCount} lagi` : '';

        ToastUtils.confirm(
          `Kode Rekening "${account.name}" memiliki ${childrenData.length} anak dalam hierarki dan tidak dapat dihapus:\n\n${childrenDetails}${moreText}\n\nHapus semua anak terlebih dahulu sebelum menghapus kode rekening induk ini.`,
          () => {
            ToastUtils.info('Hapus anak dalam hierarki terlebih dahulu');
          },
          () => {
            ToastUtils.info('Penghapusan dibatalkan');
          }
        );
        return;
      }

      // Kode Rekening is not in use - proceed with deletion using APIUtils
      ToastUtils.confirm(
        `Apakah Anda yakin ingin menghapus Kode Rekening "${account.name}" (${this.getCleanFullCode(account.fullCode)})?`,
        async () => {
          this.isLoading = true;
          m.redraw();

          try {
            await APIUtils.delete('koderekening', account._id, `Kode Rekening "${account.name}" (${this.getCleanFullCode(account.fullCode)})`);
            this.loadData();
          } catch (error) {
            console.error('Error deleting data:', error);
            ToastUtils.error('Gagal menghapus Kode Rekening: ' + (error.message || 'Kesalahan tidak diketahui'));
          } finally {
            this.isLoading = false;
            m.redraw();
          }
        },
        () => {
          ToastUtils.info('Penghapusan dibatalkan');
        }
      );

    } catch (error) {
      console.error('Error checking Kode Rekening usage:', error);
      ToastUtils.error('Gagal memeriksa penggunaan kode rekening');
    }
  },

  // Pagination helpers
  getTotalPages: function() {
    return Math.ceil(this.filteredAccounts.length / this.itemsPerPage);
  },

  getPaginatedAccounts: function() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredAccounts.slice(startIndex, endIndex);
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
          m('h1', { class: 'text-2xl font-bold text-gray-900' }, 'Kode Rekening'),
          m('p', { class: 'text-gray-600 mt-1' }, 'Kelola struktur kode rekening untuk anggaran')
        ]),
        m('button', {
          class: 'inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl',
          onclick: () => this.openCreateModal()
        }, [
          m('i', { class: 'ri-add-line mr-2' }),
          'Tambah Kode Rekening'
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
                placeholder: 'Cari kode, nama, atau deskripsi...',
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

          // Level filter
          m('div', [
            m('label', { class: 'block text-sm font-medium text-gray-700 mb-2' }, 'Level'),
            m('select', {
              class: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              value: this.selectedLevel,
              onchange: (e) => {
                this.selectedLevel = e.target.value;
                this.applyFilters();
              }
            }, [
              m('option', { value: 'all' }, 'Semua Level'),
              m('option', { value: 'hierarchy' }, 'Hierarki'),
              m('option', { value: '1' }, 'Level 1 (Akun)'),
              m('option', { value: '2' }, 'Level 2 (Kelompok)'),
              m('option', { value: '3' }, 'Level 3 (Jenis)'),
              m('option', { value: '4' }, 'Level 4 (Objek)'),
              m('option', { value: '5' }, 'Level 5 (Rincian Objek)'),
              m('option', { value: '6' }, 'Level 6 (Sub Rincian Objek)')
            ])
          ]),

          // Results info
          m('div', { class: 'flex items-end' }, [
            m('div', { class: 'text-sm text-gray-600' }, [
              m('div', this.selectedLevel === 'hierarchy'
                ? `Menampilkan ${this.filteredAccounts.length} rekening (Tampilan Hierarki)`
                : `Menampilkan ${this.filteredAccounts.length} dari ${this.accounts.length} rekening`
              ),
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

        // Accounts table
        m('div', { class: 'bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden' }, [
          m('div', { class: 'overflow-x-auto' }, [
            m('table', { class: 'min-w-full divide-y divide-gray-200' }, [
              m('thead', { class: 'bg-gray-50' }, [
                m('tr', [
                  m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Kode'),
                  m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Nama'),
                  m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Level'),
                  m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Deskripsi'),
                  m('th', { class: 'px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Aksi')
                ])
              ]),
              m('tbody', { class: 'bg-white divide-y divide-gray-200' },
                this.getPaginatedAccounts().map(account => [
                  m('tr', { class: 'hover:bg-gray-50' }, [
                    m('td', { class: 'px-6 py-4 whitespace-nowrap' }, [
                      m('div', {
                        class: 'text-sm font-mono font-medium text-gray-900 flex items-center',
                        style: this.selectedLevel === 'hierarchy' ? `padding-left: ${account.depth * 20}px;` : ''
                      }, [
                        this.selectedLevel === 'hierarchy' && account.depth > 0 ?
                          m('span', {
                            class: 'text-gray-400 mr-2 select-none',
                            style: 'font-family: monospace;'
                          }, '└' + '─'.repeat(account.depth)) : '',
                        this.selectedLevel === 'hierarchy' && account.hasChildren ?
                          m('span', {
                            class: 'text-gray-500 mr-1 text-xs',
                            title: 'Memiliki anak rekening'
                          }, '▼') : '',
                        this.getCleanFullCode(account.fullCode)
                      ])
                    ]),
                    m('td', { class: 'px-6 py-4' }, [
                      m('div', {
                        class: 'text-sm font-medium text-gray-900 flex items-center',
                        style: this.selectedLevel === 'hierarchy' ? `padding-left: ${account.depth * 20}px;` : ''
                      }, [
                        this.selectedLevel === 'hierarchy' && account.depth > 0 ?
                          m('span', {
                            class: 'text-gray-400 mr-2 select-none',
                            style: 'font-family: monospace;'
                          }, '└' + '─'.repeat(account.depth)) : '',
                        this.selectedLevel === 'hierarchy' && account.hasChildren ?
                          m('span', {
                            class: 'text-gray-500 mr-1 text-xs',
                            title: 'Memiliki anak rekening'
                          }, '▼') : '',
                        account.name
                      ])
                    ]),
                    m('td', { class: 'px-6 py-4 whitespace-nowrap' }, [
                      m('span', {
                        class: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          account.level <= 4 ? 'bg-blue-100 text-blue-800' :
                          account.level <= 7 ? 'bg-green-100 text-green-800' :
                          'bg-purple-100 text-purple-800'
                        }`
                      }, `Level ${account.level}`)
                    ]),
                    m('td', { class: 'px-6 py-4' }, [
                      m('div', {
                        class: 'text-sm text-gray-500 max-w-xs truncate flex items-center',
                        title: account.description,
                        style: this.selectedLevel === 'hierarchy' ? `padding-left: ${account.depth * 20}px;` : ''
                      }, [
                        this.selectedLevel === 'hierarchy' && account.depth > 0 ?
                          m('span', {
                            class: 'text-gray-400 mr-2 select-none',
                            style: 'font-family: monospace;'
                          }, '└' + '─'.repeat(account.depth)) : '',
                        account.description || '-'
                      ])
                    ]),
                    m('td', { class: 'px-6 py-4 whitespace-nowrap text-right text-sm font-medium' }, [
                      m('div', { class: 'flex justify-end space-x-2' }, [
                        m('button', {
                          class: 'text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-50',
                          onclick: () => this.openEditModal(account),
                          title: 'Edit'
                        }, [
                          m('i', { class: 'ri-edit-line text-lg' })
                        ]),
                        m('button', {
                          class: 'text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50',
                          onclick: () => this.deleteItem(account),
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
                  m('span', { class: 'font-medium' }, Math.min(this.currentPage * this.itemsPerPage, this.filteredAccounts.length)),
                  this.selectedLevel === 'hierarchy' ?
                    ' dari ' + m('span', { class: 'font-medium' }, this.filteredAccounts.length) + ' rekening (Hierarki)' :
                    ' dari ' + m('span', { class: 'font-medium' }, this.filteredAccounts.length) + ' hasil'
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
                        pageNum === this.currentPage ? 'z-10 bg-blue-50 border-blue-500 text-blue-600' : 'text-gray-500 hover:bg-gray-50'
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
          m('div', { class: 'bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-t-md' }, [
            m('div', { class: 'flex items-center justify-between' }, [
              m('div', { class: 'flex items-center space-x-3' }, [
                m('div', { class: 'w-10 h-10 bg-white bg-opacity-75 rounded-full flex items-center justify-center' }, [
                  m('i', { class: `${this.modalMode === 'create' ? 'ri-add-fill' : 'ri-edit-fill'} text-lg` })
                ]),
                m('div', [
                  m('h3', { class: 'text-lg font-bold' }, `${this.modalMode === 'create' ? 'Tambah' : 'Edit'} Kode Rekening`),
                  m('p', { class: 'text-white text-opacity-80 text-sm' }, 'Kelola informasi kode rekening')
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

          // Modal body
          m('div', { class: 'p-6' }, [
            m('div', { class: 'space-y-4' }, [

              // Parent selection field (only for create mode, at top)
              this.modalMode === 'create' && m('div', [
                m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                  m('i', { class: 'ri-node-tree mr-1 text-green-500' }),
                  'Induk Kode Rekening'
                ]),
                m('select', {
                  class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                  value: this.formData.parent || '',
                  onchange: (e) => {
                    const parentId = e.target.value || null;
                    this.formData.parent = parentId;

                    // Auto-set level based on parent
                    const newLevel = this.getNextLevel(parentId);
                    this.formData.level = newLevel;

                    // Auto-generate fullCode when code also changes
                    if (this.formData.code) {
                      this.formData.fullCode = this.generateFullCode(parentId, this.formData.code);
                    }

                    // Update placeholder for fullCode
                    const input = e.target.closest('.space-y-4').querySelector('input[placeholder*="Level"]');
                    if (input) {
                      input.placeholder = `Level ${newLevel}: ${this.getExpectedFormat(newLevel)}`;
                    }

                    // Clear any existing validation errors
                    this.errors.fullCode = null;
                    m.redraw();
                  },
                  disabled: this.isModalLoading
                }, [
                  m('option', { value: '' }, 'Tidak ada induk (Level 1)'),
                  ...this.availableParents.map(parent =>
                    m('option', { value: parent._id }, `${this.getCleanFullCode(parent.fullCode)} - ${parent.name}`)
                  )
                ]),
                m('p', { class: 'mt-2 text-xs text-gray-500' }, [
                  m('i', { class: 'ri-information-line mr-1' }),
                  'Pilih kode rekening induk untuk membuat anak rekening, atau biarkan kosong untuk level 1.'
                ])
              ]),

              // Kode field
              m('div', [
                m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                  m('i', { class: 'ri-hashtag mr-1 text-blue-500' }),
                  'Kode'
                ]),
                m('input', {
                  type: 'text',
                  class: `w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all duration-200 bg-gray-50 focus:bg-white ${
                    this.errors.code
                      ? 'border-red-500 focus:ring-2 focus:ring-red-200'
                      : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                  }`,
                  placeholder: 'Contoh: 1, 1.1, 1.1.1',
                  value: this.formData.code,
                  oninput: (e) => {
                    this.formData.code = e.target.value;
                    // Auto-generate fullCode if in create mode
                    if (this.modalMode === 'create') {
                      this.formData.fullCode = this.generateFullCode(this.formData.parent, e.target.value);
                    }
                  },
                  disabled: this.isModalLoading
                }),
                this.errors.code && m('p', { class: 'mt-1 text-sm text-red-600' }, [
                  m('i', { class: 'ri-error-warning-line mr-1' }),
                  this.errors.code
                ]),
                m('p', { class: 'mt-2 text-xs text-gray-500' }, [
                  m('i', { class: 'ri-information-line mr-1' }),
                  'Kode ini akan digabungkan dengan kode lengkap secara otomatis.'
                ])
              ]),

              // Nama field
              m('div', [
                m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                  m('i', { class: 'ri-edit-line mr-1 text-green-500' }),
                  'Nama'
                ]),
                m('input', {
                  type: 'text',
                  class: `w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all duration-200 bg-gray-50 focus:bg-white ${
                    this.errors.name
                      ? 'border-red-500 focus:ring-2 focus:ring-red-200'
                      : 'border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200'
                  }`,
                  placeholder: 'Nama lengkap rekening',
                  value: this.formData.name,
                  oninput: (e) => this.formData.name = e.target.value,
                  disabled: this.isModalLoading
                }),
                this.errors.name && m('p', { class: 'mt-1 text-sm text-red-600' }, [
                  m('i', { class: 'ri-error-warning-line mr-1' }),
                  this.errors.name
                ])
              ]),

              // Kode Lengkap field (read-only in create mode, editable in edit mode)
              m('div', [
                m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                  m('i', { class: 'ri-key-line mr-1 text-purple-500' }),
                  this.modalMode === 'create' ? 'Kode Lengkap (Otomatis)' : 'Kode Lengkap'
                ]),
                this.modalMode === 'create' ? m('div', {
                  class: `w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 text-gray-800 font-mono ${
                    this.formData.fullCode && this.formData.fullCode.trim()
                      ? 'border-purple-200 bg-purple-50'
                      : 'border-gray-200 bg-gray-50'
                  }`
                }, [
                  this.formData.fullCode && this.formData.fullCode.trim()
                    ? this.getCleanFullCode(this.formData.fullCode)
                    : 'Akan dihasilkan secara otomatis'
                ]) : m('input', {
                  type: 'text',
                  class: `w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all duration-200 bg-gray-50 focus:bg-white ${
                    this.errors.fullCode
                      ? 'border-red-500 focus:ring-2 focus:ring-red-200'
                      : 'border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200'
                  }`,
                  placeholder: `Level ${this.formData.level}: ${this.getExpectedFormat(this.formData.level)}`,
                  value: this.getCleanFullCode(this.formData.fullCode),
                  oninput: (e) => {
                    this.formData.fullCode = e.target.value;
                    // Real-time validation for fullCode
                    if (e.target.value.trim()) {
                      const validation = this.validateFullCodeFormat();
                      this.errors.fullCode = validation.valid ? null : validation.message;
                    } else {
                      this.errors.fullCode = null;
                    }
                    m.redraw();
                  },
                  disabled: this.isModalLoading
                }),
                this.modalMode === 'create' && m('p', { class: 'mt-2 text-xs text-gray-500' }, [
                  m('i', { class: 'ri-information-line mr-1' }),
                  'Kode lengkap dihasilkan otomatis dari induk + kode yang dimasukkan.'
                ]),
                this.modalMode === 'edit' && this.errors.fullCode && m('p', { class: 'mt-1 text-sm text-red-600' }, [
                  m('i', { class: 'ri-error-warning-line mr-1' }),
                  this.errors.fullCode
                ]),
                this.modalMode === 'edit' && m('p', { class: 'mt-2 text-xs text-gray-500' }, [
                  m('i', { class: 'ri-information-line mr-1' }),
                  `Format yang diharapkan untuk ${this.getLevelName(this.formData.level)}: ${this.getExpectedFormat(this.formData.level)}`
                ])
              ]),

              // Level field (read-only in create mode, editable in edit mode)
              this.modalMode === 'edit' && m('div', [
                m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                  m('i', { class: 'ri-layers-line mr-1 text-orange-500' }),
                  'Level'
                ]),
                m('select', {
                  class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                  value: this.formData.level,
                  onchange: (e) => {
                    const uiLevel = parseInt(e.target.value);
                    this.formData.level = uiLevel; // Store as database level (UI level = DB level)

                    // Update placeholder to show expected format
                    const input = e.target.closest('.space-y-4').querySelector('input[placeholder*="Level"]');
                    if (input) {
                      input.placeholder = `Level ${uiLevel}: ${this.getExpectedFormat(uiLevel)}`;
                    }

                    // Re-validate fullCode format for new level
                    if (this.formData.fullCode && this.formData.fullCode.trim()) {
                      const validation = this.validateFullCodeFormat();
                      this.errors.fullCode = validation.valid ? null : validation.message;
                      m.redraw();
                    }
                  },
                  disabled: this.isModalLoading
                }, [
                  m('option', { value: 1 }, 'Level 1 (Akun)'),
                  m('option', { value: 2 }, 'Level 2 (Kelompok)'),
                  m('option', { value: 3 }, 'Level 3 (Jenis)'),
                  m('option', { value: 4 }, 'Level 4 (Objek)'),
                  m('option', { value: 5 }, 'Level 5 (Rincian Objek)'),
                  m('option', { value: 6 }, 'Level 6 (Sub Rincian Objek)')
                ])
              ]),

              // Auto-generated Level display (for create mode)
              this.modalMode === 'create' && this.formData.parent && m('div', [
                m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                  m('i', { class: 'ri-layers-line mr-1 text-orange-500' }),
                  'Level (Otomatis)'
                ]),
                m('div', { class: 'w-full px-4 py-3 border-2 border-orange-200 rounded-lg bg-orange-50 text-orange-800 font-medium' }, [
                  `Level ${this.formData.level} (${this.getLevelName(this.formData.level)})`,
                  m('span', { class: 'ml-2 text-xs text-orange-600' }, 'ditentukan oleh induk')
                ]),
                m('p', { class: 'mt-2 text-xs text-gray-500' }, [
                  m('i', { class: 'ri-information-line mr-1' }),
                  'Level ditentukan secara otomatis berdasarkan kode rekening induk yang dipilih.'
                ])
              ]),

              // Deskripsi field
              m('div', [
                m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
                  m('i', { class: 'ri-file-text-line mr-1 text-teal-500' }),
                  'Deskripsi'
                ]),
                m('textarea', {
                  class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                  placeholder: 'Deskripsi lengkap tentang kode rekening ini',
                  value: this.formData.description,
                  oninput: (e) => this.formData.description = e.target.value,
                  rows: 3,
                  disabled: this.isModalLoading
                })
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
              class: `px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 ${
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
    ]);
  }
};

export default KodeRekening;