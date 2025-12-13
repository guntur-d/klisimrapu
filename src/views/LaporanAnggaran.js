import m from 'mithril'
import { JWTUtils, UserUtils } from '../js/utils.js';
import toast from '../js/toaster.js';

const LaporanAnggaran = {
  oninit: function() {
    // Check authentication before component initializes
    if (!UserUtils.isAuthenticated()) {
      toast.warning('Silakan masuk terlebih dahulu');
      m.route.set('/login');
      return;
    }

    this.userData = UserUtils.getUserData();
    this.isLoading = false;
    this.anggaranData = [];
    this.subKegiatanList = [];
    // Use 2026-Murni to match the actual data in database
    this.budgetYear = '2026-Murni';
    console.log('📅 Using budget year that matches database:', this.budgetYear);
    this.selectedSubKegiatan = '';

    // Load both SubKegiatan options and anggaran data
    this.loadSubKegiatanOptions();
    this.loadData();
  },

  getSubKegiatanPlaceholder: function() {
    if (this.noAnggaranData) {
      return 'Tidak ada data anggaran - buat anggaran terlebih dahulu';
    }
    if (this.apiFailed) {
      return 'Gagal memuat data - periksa koneksi';
    }
    if (this.subKegiatanList.length === 0) {
      return 'Memuat SubKegiatan...';
    }
    return 'Semua SubKegiatan';
  },


  loadSubKegiatanOptions: async function() {
    try {
      const token = JWTUtils.getToken();
      if (!token) {
        console.log('❌ No token available');
        this.subKegiatanList = [];
        m.redraw();
        return;
      }

      console.log('🔍 STEP 1: Starting to load SubKegiatan options for budget year:', this.budgetYear);

      // Step 1: Fetch Anggaran documents
      console.log('📡 STEP 2: Fetching Anggaran data from /api/anggaran?budgetYear=' + this.budgetYear);
      console.log('🔍 Debug: Current budgetYear value:', this.budgetYear, 'Type:', typeof this.budgetYear);

      // Check if budgetYear needs formatting (e.g., "2026" -> "2026-Murni")
      let queryBudgetYear = this.budgetYear;
      if (/^\d{4}$/.test(this.budgetYear)) {
        queryBudgetYear = `${this.budgetYear}-Murni`;
        console.log('🔄 Converted budget year to:', queryBudgetYear);
      }

      const requestUrl = `/api/anggaran?budgetYear=${encodeURIComponent(queryBudgetYear)}`;
      console.log('📡 Making request to:', requestUrl);

      const anggaranResponse = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📊 STEP 3: Anggaran API Response status:', anggaranResponse.status);

      if (anggaranResponse.ok) {
        const anggaranResult = await anggaranResponse.json();
        const anggaranData = anggaranResult.data || [];

        console.log('📋 STEP 4: Found Anggaran documents:', anggaranData.length);
        console.log('📄 Full API response:', anggaranResult);
        console.log('📝 Sample Anggaran document:', anggaranData[0] ? {
          id: anggaranData[0]._id,
          budgetYear: anggaranData[0].budgetYear,
          subKegiatanId: anggaranData[0].subKegiatanId,
          status: anggaranData[0].status
        } : 'No documents');

        if (anggaranData.length > 0) {
          // Step 2: Get all subKegiatanId from Anggaran documents
          console.log('🔍 STEP 5: Extracting subKegiatanId from Anggaran documents...');
          const subKegiatanIds = anggaranData.map(item => {
            const subKegiatanId = item.subKegiatanId;
            console.log('   - Anggaran ID:', item._id, 'subKegiatanId:', subKegiatanId);

            // Handle both populated object and ID string formats
            if (typeof subKegiatanId === 'object' && subKegiatanId._id) {
              console.log('   - Extracting _id from populated object:', subKegiatanId._id);
              return subKegiatanId._id; // Extract _id from populated object
            } else if (typeof subKegiatanId === 'string') {
              console.log('   - Using string ID:', subKegiatanId);
              return subKegiatanId; // Already a string ID
            } else {
              console.log('   - Unknown format:', typeof subKegiatanId, subKegiatanId);
              return null;
            }
          }).filter(id => id); // Remove null/undefined values

          console.log('🎯 STEP 6: Raw subKegiatanIds found:', subKegiatanIds.length);
          console.log('📝 STEP 7: Unique subKegiatanIds:', [...new Set(subKegiatanIds)].length);
          console.log('🔍 STEP 7.1: Actual IDs being matched:', subKegiatanIds);

          const uniqueSubKegiatanIds = [...new Set(subKegiatanIds)];

          if (uniqueSubKegiatanIds.length > 0) {
            // Step 3: Fetch the correct SubKegiatan documents based on found IDs
            console.log('📡 STEP 8: Fetching SubKegiatan from /api/subkegiatan');
            const subKegiatanResponse = await fetch('/api/subkegiatan', {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });

            if (subKegiatanResponse.ok) {
              const subKegiatanResult = await subKegiatanResponse.json();
              const allSubKegiatan = subKegiatanResult.data || [];

              console.log('📋 STEP 9: Loaded all SubKegiatan documents:', allSubKegiatan.length);

              // Step 4: Filter SubKegiatan to only those used in Anggaran
              const filteredSubKegiatan = allSubKegiatan.filter(subKegiatan => {
                const isMatch = uniqueSubKegiatanIds.includes(subKegiatan._id);
                if (isMatch) {
                  console.log('   ✅ Matched SubKegiatan:', subKegiatan.kode, subKegiatan.nama);
                }
                return isMatch;
              });

              console.log('✅ STEP 10: Final filtered SubKegiatan count:', filteredSubKegiatan.length);
              this.subKegiatanList = filteredSubKegiatan;
            } else {
              console.error('❌ STEP 11: Failed to load SubKegiatan, status:', subKegiatanResponse.status);
              this.subKegiatanList = [];
            }
          } else {
            console.log('⚠️ STEP 12: No valid subKegiatanIds found in Anggaran data');
            console.log('🚫 STEP 12.1: CORRECT BEHAVIOR - No SubKegiatan shown because no Anggaran exists');
            console.log('💡 STEP 12.2: User should create Anggaran data first');

            // CORRECT: Don't show SubKegiatan when no Anggaran IDs found
            this.subKegiatanList = [];
            this.noAnggaranData = true;
          }
        } else {
          console.log('⚠️ STEP 13: No Anggaran data found for budget year:', this.budgetYear);
          console.log('🚫 STEP 13.1: CORRECT BEHAVIOR - No SubKegiatan shown because no Anggaran exists');
          console.log('💡 STEP 13.2: User should create Anggaran data first before viewing reports');

          // CORRECT: Don't show SubKegiatan when no Anggaran data exists
          this.subKegiatanList = [];
          this.noAnggaranData = true; // Flag to show appropriate message in UI
        }
      } else {
        console.error('❌ STEP 14: Anggaran API failed with status:', anggaranResponse.status);
        const errorText = await anggaranResponse.text();
        console.error('❌ Error response body:', errorText);
        console.log('🚫 STEP 15: Anggaran API failed - cannot load SubKegiatan options');

        // CORRECT: Don't show SubKegiatan when Anggaran API fails
        this.subKegiatanList = [];
        this.apiFailed = true; // Flag for UI to show appropriate message
      }
    } catch (error) {
      console.error('❌ STEP 18: Error in loadSubKegiatanOptions:', error);
      this.subKegiatanList = [];
    }

    console.log('🎯 FINAL RESULT: SubKegiatan list length:', this.subKegiatanList.length);
    console.log('📋 Sample of matched SubKegiatan:', this.subKegiatanList.slice(0, 5).map(sk => ({ id: sk._id, kode: sk.kode, nama: sk.nama })));
    m.redraw();
  },

  loadData: async function() {
    this.isLoading = true;
    m.redraw();

    try {
      const token = JWTUtils.getToken();
      console.log('Token retrieved:', token ? 'Token exists' : 'No token', token ? 'Length: ' + token.length : '');

      if (!token) {
        toast.error('Token autentikasi tidak ditemukan');
        return;
      }

      const params = new URLSearchParams();

      // Fix budget year format (2026 -> 2026-Murni)
      let queryBudgetYear = this.budgetYear;
      if (/^\d{4}$/.test(this.budgetYear)) {
        queryBudgetYear = `${this.budgetYear}-Murni`;
      }
      params.append('budgetYear', queryBudgetYear);

      if (this.selectedSubKegiatan) {
        params.append('subKegiatanId', this.selectedSubKegiatan);
      }

      console.log('Making API request to:', `/api/anggaran?${params}`);
      console.log('Debug: Original budgetYear:', this.budgetYear, 'Query budgetYear:', queryBudgetYear);

      const response = await fetch(`/api/anggaran?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('API Response status:', response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();
        console.log('API Response data length:', result.data ? result.data.length : 'No data');
        this.anggaranData = result.data || [];
      } else {
        const errorText = await response.text();
        console.error('API Error response:', errorText);
        if (response.status === 401) {
          toast.error('Sesi login telah berakhir. Silakan masuk kembali.');
          JWTUtils.clearAuthData();
          m.route.set('/login');
        } else {
          toast.error(`Gagal memuat data anggaran: ${response.status}`);
        }
      }
    } catch (error) {
      console.error('Error loading anggaran data:', error);
      toast.error('Terjadi kesalahan saat memuat data');
    }

    this.isLoading = false;
    m.redraw();
  },

  formatCurrency: function(amount) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  },

  exportToCSV: function() {
    if (this.anggaranData.length === 0) {
      toast.warning('Tidak ada data untuk diekspor');
      return;
    }

    const headers = ['Kode SubKegiatan', 'Nama SubKegiatan', 'Kode Rekening', 'Nama Rekening', 'Jumlah', 'Status'];
    const csvContent = [
      headers.join(','),
      ...this.anggaranData.map(item => [
        item.subKegiatanId?.kode || '',
        item.subKegiatanId?.nama || '',
        item.allocations?.map(a => a.kodeRekeningId?.kode || '').join('; ') || '',
        item.allocations?.map(a => a.kodeRekeningId?.nama || '').join('; ') || '',
        item.totalAmount || 0,
        item.status || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-anggaran-${this.budgetYear}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Laporan berhasil diekspor');
  },

  view: function() {
    return m('div', { class: 'space-y-6' }, [
      // Header
      m('div', { class: 'bg-white rounded-lg shadow-sm p-6' }, [
        m('div', { class: 'flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6' }, [
          m('div', [
            m('h1', { class: 'text-2xl font-bold text-gray-900 mb-2' }, 'Laporan Anggaran'),
            m('p', { class: 'text-gray-600' }, 'Laporan alokasi anggaran berdasarkan subkegiatan dan kode rekening')
          ]),
          m('div', { class: 'flex items-center space-x-3 mt-4 sm:mt-0' }, [
            m('button', {
              class: 'bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2',
              onclick: () => this.exportToCSV()
            }, [
              m('i', { class: 'ri-download-line' }),
              m('span', 'Ekspor CSV')
            ])
          ])
        ]),

        // Filters
        m('div', { class: 'grid grid-cols-1 sm:grid-cols-2 gap-4' }, [
          m('div', [
            m('label', { class: 'block text-sm font-medium text-gray-700 mb-2' }, 'Tahun Anggaran'),
            m('select', {
              class: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
              value: this.budgetYear,
              onchange: (e) => {
                this.budgetYear = e.target.value;
                this.selectedSubKegiatan = ''; // Reset SubKegiatan selection when year changes
                this.loadSubKegiatanOptions(); // Reload filtered SubKegiatan for new year
                this.loadData();
              }
            }, [
              m('option', { value: '2026' }, '2026'),
              m('option', { value: '2025' }, '2025'),
              m('option', { value: '2024' }, '2024')
            ])
          ]),
          m('div', [
           m('label', { class: 'block text-sm font-medium text-gray-700 mb-2' }, [
             'SubKegiatan',
             this.subKegiatanList.length > 0 && m('span', { class: 'text-xs text-green-600 ml-1' }, `(${this.subKegiatanList.length} pilihan)`)
           ]),
           m('select', {
             class: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
             value: this.selectedSubKegiatan,
             disabled: this.noAnggaranData || this.apiFailed,
             onchange: (e) => {
               this.selectedSubKegiatan = e.target.value;
               this.loadData();
             }
           }, [
             m('option', { value: '' }, this.getSubKegiatanPlaceholder()),
             // Populate with loaded SubKegiatan data
             this.subKegiatanList.map(subKegiatan =>
               m('option', {
                 value: subKegiatan._id
               }, `${subKegiatan.kode} - ${subKegiatan.nama}`)
             )
           ])
         ])
        ])
      ]),

      // Summary Cards
      m('div', { class: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6' }, [
        m('div', { class: 'bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500' }, [
          m('div', { class: 'flex items-center' }, [
            m('div', { class: 'p-2 bg-blue-100 rounded-lg' }, [
              m('i', { class: 'ri-wallet-line text-xl text-blue-600' })
            ]),
            m('div', { class: 'ml-4' }, [
              m('p', { class: 'text-sm font-medium text-gray-600' }, 'Total Anggaran'),
              m('p', { class: 'text-2xl font-bold text-gray-900' },
                this.formatCurrency(this.anggaranData.reduce((total, item) => total + item.totalAmount, 0))
              )
            ])
          ])
        ]),
        m('div', { class: 'bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500' }, [
          m('div', { class: 'flex items-center' }, [
            m('div', { class: 'p-2 bg-green-100 rounded-lg' }, [
              m('i', { class: 'ri-file-list-line text-xl text-green-600' })
            ]),
            m('div', { class: 'ml-4' }, [
              m('p', { class: 'text-sm font-medium text-gray-600' }, 'Jumlah SubKegiatan'),
              m('p', { class: 'text-2xl font-bold text-gray-900' }, this.anggaranData.length)
            ])
          ])
        ]),
        m('div', { class: 'bg-white rounded-lg shadow-sm p-6 border-l-4 border-yellow-500' }, [
          m('div', { class: 'flex items-center' }, [
            m('div', { class: 'p-2 bg-yellow-100 rounded-lg' }, [
              m('i', { class: 'ri-time-line text-xl text-yellow-600' })
            ]),
            m('div', { class: 'ml-4' }, [
              m('p', { class: 'text-sm font-medium text-gray-600' }, 'Status Draft'),
              m('p', { class: 'text-2xl font-bold text-gray-900' },
                this.anggaranData.filter(item => item.status === 'draft').length
              )
            ])
          ])
        ]),
        m('div', { class: 'bg-white rounded-lg shadow-sm p-6 border-l-4 border-purple-500' }, [
          m('div', { class: 'flex items-center' }, [
            m('div', { class: 'p-2 bg-purple-100 rounded-lg' }, [
              m('i', { class: 'ri-check-line text-xl text-purple-600' })
            ]),
            m('div', { class: 'ml-4' }, [
              m('p', { class: 'text-sm font-medium text-gray-600' }, 'Status Approved'),
              m('p', { class: 'text-2xl font-bold text-gray-900' },
                this.anggaranData.filter(item => item.status === 'approved').length
              )
            ])
          ])
        ])
      ]),

      // Data Table
      m('div', { class: 'bg-white rounded-lg shadow-sm overflow-hidden' }, [
        m('div', { class: 'px-6 py-4 border-b border-gray-200' }, [
          m('h3', { class: 'text-lg font-medium text-gray-900' }, 'Detail Anggaran')
        ]),
        m('div', { class: 'overflow-x-auto' }, [
          this.isLoading ?
            m('div', { class: 'p-8 text-center' }, [
              m('i', { class: 'ri-loader-4-line animate-spin text-2xl text-gray-400 mb-2' }),
              m('p', { class: 'text-gray-500' }, 'Memuat data...')
            ]) :
            this.anggaranData.length === 0 ?
              m('div', { class: 'p-8 text-center' }, [
                m('i', { class: 'ri-inbox-line text-4xl text-gray-300 mb-2' }),
                m('p', { class: 'text-gray-500' }, 'Tidak ada data anggaran')
              ]) :
              m('table', { class: 'min-w-full divide-y divide-gray-200' }, [
                m('thead', { class: 'bg-gray-50' }, [
                  m('tr', [
                    m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'SubKegiatan'),
                    m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Kode Rekening'),
                    m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Jumlah'),
                    m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Status'),
                    m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Aksi')
                  ])
                ]),
                m('tbody', { class: 'bg-white divide-y divide-gray-200' },
                  this.anggaranData.map(item => [
                    m('tr', { class: 'hover:bg-gray-50' }, [
                      m('td', { class: 'px-6 py-4 whitespace-nowrap' }, [
                        m('div', { class: 'text-sm font-medium text-gray-900' }, item.subKegiatanId?.nama || ''),
                        m('div', { class: 'text-sm text-gray-500' }, item.subKegiatanId?.kode || '')
                      ]),
                      m('td', { class: 'px-6 py-4 whitespace-nowrap' }, [
                        m('div', { class: 'text-sm text-gray-900' },
                          item.allocations?.map(a => a.kodeRekeningId?.kode || '').join(', ') || ''
                        )
                      ]),
                      m('td', { class: 'px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900' },
                        this.formatCurrency(item.totalAmount || 0)
                      ),
                      m('td', { class: 'px-6 py-4 whitespace-nowrap' }, [
                        m('span', {
                          class: `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            item.status === 'approved' ? 'bg-green-100 text-green-800' :
                            item.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`
                        }, item.status || 'draft')
                      ]),
                      m('td', { class: 'px-6 py-4 whitespace-nowrap text-sm font-medium' }, [
                        m('button', {
                          class: 'text-blue-600 hover:text-blue-900 mr-3',
                          onclick: () => m.route.set(`/anggaran/${item._id}`)
                        }, [
                          m('i', { class: 'ri-eye-line' })
                        ])
                      ])
                    ])
                  ])
                )
              ])
        ])
      ])
    ]);
  }
};

export default LaporanAnggaran;