import m from 'mithril'
import { UserUtils, APIUtils, ToastUtils } from '../js/utils.js';

const LaporanRealisasi = {
  oninit: function() {
    // Check authentication before component initializes
    if (!UserUtils.isAuthenticated()) {
      ToastUtils.warning('Silakan masuk terlebih dahulu');
      m.route.set('/login');
      return;
    }

    this.userData = UserUtils.getUserData();
    this.isLoading = false;
    this.realisasiData = [];
    this.subKegiatanList = [];
    this.budgetYear = new Date().getFullYear().toString();
    this.selectedMonth = (new Date().getMonth() + 1).toString();
    this.selectedSubKegiatan = '';

    // Load both SubKegiatan options and realisasi data
    this.loadSubKegiatanOptions();
    this.loadData();
  },

  loadSubKegiatanOptions: async function() {
    try {
      // Load Realisasi data for the selected year to get used SubKegiatan using APIUtils
      const realisasiResult = await APIUtils.request(`/api/realisasi?year=${this.budgetYear}`);

      const realisasiData = realisasiResult.data || [];

      // Extract unique SubKegiatan IDs from Realisasi data
      const usedSubKegiatanIds = [...new Set(realisasiData.map(item => item.subKegiatanId?._id || item.subKegiatanId))];

      if (usedSubKegiatanIds.length > 0) {
        // Load all SubKegiatan and filter to only those used in Realisasi using APIUtils
        const allSubKegiatan = subKegiatanResult.data || [];

        // Filter to only SubKegiatan that are used in Realisasi for this year
        this.subKegiatanList = allSubKegiatan.filter(subKegiatan =>
          usedSubKegiatanIds.includes(subKegiatan._id)
        );

        console.log(`Filtered SubKegiatan options (used in Realisasi ${this.budgetYear}):`, this.subKegiatanList.length);
      } else {
        console.log('No Realisasi data found for year:', this.budgetYear);
        this.subKegiatanList = [];
      }
    } catch (error) {
      console.error('Error loading filtered SubKegiatan options for Realisasi:', error);
      this.subKegiatanList = [];
    }

    m.redraw();
  },

  loadData: async function() {
    this.isLoading = true;
    m.redraw();

    try {
      const params = new URLSearchParams();
      params.append('year', this.budgetYear);
      params.append('month', this.selectedMonth);
      if (this.selectedSubKegiatan) {
        params.append('subKegiatanId', this.selectedSubKegiatan);
      }

      // Use APIUtils.request for custom query
      const result = await APIUtils.request(`/api/realisasi?${params}`);
      this.realisasiData = result.data || [];
    } catch (error) {
      console.error('Error loading realisasi data:', error);
      ToastUtils.error('Terjadi kesalahan saat memuat data');
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

  formatPercentage: function(value) {
    return `${Math.round(value)}%`;
  },

  getPercentageColor: function(percentage) {
    if (percentage >= 90) return 'text-green-600 bg-green-100';
    if (percentage >= 70) return 'text-blue-600 bg-blue-100';
    if (percentage >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  },

  exportToCSV: function() {
    if (this.realisasiData.length === 0) {
      ToastUtils.warning('Tidak ada data untuk diekspor');
      return;
    }

    const headers = ['SubKegiatan', 'Kode Rekening', 'Nama Rekening', 'Anggaran', 'Realisasi', 'Sisa', 'Persentase'];
    const csvContent = [
      headers.join(','),
      ...this.realisasiData.map(item => [
        item.subKegiatanId?.nama || '',
        item.kodeRekeningId?.kode || '',
        item.kodeRekeningId?.nama || '',
        item.budgetAmount || 0,
        item.realizationAmount || 0,
        item.remainingAmount || 0,
        item.realizationPercentage || 0
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-realisasi-${this.budgetYear}-${this.selectedMonth}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    ToastUtils.success('Laporan berhasil diekspor');
  },

  view: function() {
    const totalBudget = this.realisasiData.reduce((sum, item) => sum + item.budgetAmount, 0);
    const totalRealization = this.realisasiData.reduce((sum, item) => sum + item.realizationAmount, 0);
    const avgPercentage = totalBudget > 0 ? (totalRealization / totalBudget) * 100 : 0;

    return m('div', { class: 'space-y-6' }, [
      // Header
      m('div', { class: 'bg-white rounded-lg shadow-sm p-6' }, [
        m('div', { class: 'flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6' }, [
          m('div', [
            m('h1', { class: 'text-2xl font-bold text-gray-900 mb-2' }, 'Laporan Realisasi'),
            m('p', { class: 'text-gray-600' }, 'Laporan realisasi anggaran vs pencapaian aktual')
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
        m('div', { class: 'grid grid-cols-1 sm:grid-cols-3 gap-4' }, [
          m('div', [
            m('label', { class: 'block text-sm font-medium text-gray-700 mb-2' }, 'Tahun'),
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
            m('label', { class: 'block text-sm font-medium text-gray-700 mb-2' }, 'Bulan'),
            m('select', {
              class: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
              value: this.selectedMonth,
              onchange: (e) => {
                this.selectedMonth = e.target.value;
                this.loadData();
              }
            }, [
              m('option', { value: '1' }, 'Januari'),
              m('option', { value: '2' }, 'Februari'),
              m('option', { value: '3' }, 'Maret'),
              m('option', { value: '4' }, 'April'),
              m('option', { value: '5' }, 'Mei'),
              m('option', { value: '6' }, 'Juni'),
              m('option', { value: '7' }, 'Juli'),
              m('option', { value: '8' }, 'Agustus'),
              m('option', { value: '9' }, 'September'),
              m('option', { value: '10' }, 'Oktober'),
              m('option', { value: '11' }, 'November'),
              m('option', { value: '12' }, 'Desember')
            ])
          ]),
          m('div', [
            m('label', { class: 'block text-sm font-medium text-gray-700 mb-2' }, 'SubKegiatan'),
            m('select', {
              class: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
              value: this.selectedSubKegiatan,
              onchange: (e) => {
                this.selectedSubKegiatan = e.target.value;
                this.loadData();
              }
            }, [
              m('option', { value: '' }, 'Semua SubKegiatan'),
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
        m('div', { class: 'bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500' }, [
          m('div', { class: 'flex items-center' }, [
            m('div', { class: 'p-2 bg-green-100 rounded-lg' }, [
              m('i', { class: 'ri-money-dollar-circle-line text-xl text-green-600' })
            ]),
            m('div', { class: 'ml-4' }, [
              m('p', { class: 'text-sm font-medium text-gray-600' }, 'Total Anggaran'),
              m('p', { class: 'text-2xl font-bold text-gray-900' }, this.formatCurrency(totalBudget))
            ])
          ])
        ]),
        m('div', { class: 'bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500' }, [
          m('div', { class: 'flex items-center' }, [
            m('div', { class: 'p-2 bg-blue-100 rounded-lg' }, [
              m('i', { class: 'ri-check-circle-line text-xl text-blue-600' })
            ]),
            m('div', { class: 'ml-4' }, [
              m('p', { class: 'text-sm font-medium text-gray-600' }, 'Total Realisasi'),
              m('p', { class: 'text-2xl font-bold text-gray-900' }, this.formatCurrency(totalRealization))
            ])
          ])
        ]),
        m('div', { class: 'bg-white rounded-lg shadow-sm p-6 border-l-4 border-yellow-500' }, [
          m('div', { class: 'flex items-center' }, [
            m('div', { class: 'p-2 bg-yellow-100 rounded-lg' }, [
              m('i', { class: 'ri-wallet-line text-xl text-yellow-600' })
            ]),
            m('div', { class: 'ml-4' }, [
              m('p', { class: 'text-sm font-medium text-gray-600' }, 'Sisa Anggaran'),
              m('p', { class: 'text-2xl font-bold text-gray-900' }, this.formatCurrency(totalBudget - totalRealization))
            ])
          ])
        ]),
        m('div', { class: `bg-white rounded-lg shadow-sm p-6 border-l-4 ${avgPercentage >= 90 ? 'border-green-500' : avgPercentage >= 70 ? 'border-blue-500' : avgPercentage >= 50 ? 'border-yellow-500' : 'border-red-500'}` }, [
          m('div', { class: 'flex items-center' }, [
            m('div', { class: `p-2 rounded-lg ${this.getPercentageColor(avgPercentage).split(' ')[1]}` }, [
              m('i', { class: `ri-bar-chart-line text-xl ${this.getPercentageColor(avgPercentage).split(' ')[0]}` })
            ]),
            m('div', { class: 'ml-4' }, [
              m('p', { class: 'text-sm font-medium text-gray-600' }, 'Rata-rata Pencapaian'),
              m('p', { class: 'text-2xl font-bold text-gray-900' }, this.formatPercentage(avgPercentage))
            ])
          ])
        ])
      ]),

      // Data Table
      m('div', { class: 'bg-white rounded-lg shadow-sm overflow-hidden' }, [
        m('div', { class: 'px-6 py-4 border-b border-gray-200' }, [
          m('h3', { class: 'text-lg font-medium text-gray-900' }, 'Detail Realisasi')
        ]),
        m('div', { class: 'overflow-x-auto' }, [
          this.isLoading ?
            m('div', { class: 'p-8 text-center' }, [
              m('i', { class: 'ri-loader-4-line animate-spin text-2xl text-gray-400 mb-2' }),
              m('p', { class: 'text-gray-500' }, 'Memuat data...')
            ]) :
            this.realisasiData.length === 0 ?
              m('div', { class: 'p-8 text-center' }, [
                m('i', { class: 'ri-inbox-line text-4xl text-gray-300 mb-2' }),
                m('p', { class: 'text-gray-500' }, 'Tidak ada data realisasi')
              ]) :
              m('table', { class: 'min-w-full divide-y divide-gray-200' }, [
                m('thead', { class: 'bg-gray-50' }, [
                  m('tr', [
                    m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'SubKegiatan'),
                    m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Kode Rekening'),
                    m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Anggaran'),
                    m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Realisasi'),
                    m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Sisa'),
                    m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Pencapaian'),
                    m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Aksi')
                  ])
                ]),
                m('tbody', { class: 'bg-white divide-y divide-gray-200' },
                  this.realisasiData.map(item => [
                    m('tr', { class: 'hover:bg-gray-50' }, [
                      m('td', { class: 'px-6 py-4 whitespace-nowrap' }, [
                        m('div', { class: 'text-sm font-medium text-gray-900' }, item.subKegiatanId?.nama || ''),
                        m('div', { class: 'text-sm text-gray-500' }, item.subKegiatanId?.kode || '')
                      ]),
                      m('td', { class: 'px-6 py-4 whitespace-nowrap' }, [
                        m('div', { class: 'text-sm font-medium text-gray-900' }, item.kodeRekeningId?.kode || ''),
                        m('div', { class: 'text-sm text-gray-500' }, item.kodeRekeningId?.nama || '')
                      ]),
                      m('td', { class: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900' },
                        this.formatCurrency(item.budgetAmount || 0)
                      ),
                      m('td', { class: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900' },
                        this.formatCurrency(item.realizationAmount || 0)
                      ),
                      m('td', { class: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900' },
                        this.formatCurrency(item.remainingAmount || 0)
                      ),
                      m('td', { class: 'px-6 py-4 whitespace-nowrap' }, [
                        m('div', { class: 'flex items-center' }, [
                          m('div', { class: 'flex-1 bg-gray-200 rounded-full h-2 mr-3' }, [
                            m('div', {
                              class: 'h-2 rounded-full',
                              style: `width: ${Math.min(100, item.realizationPercentage || 0)}%; background-color: ${
                                item.realizationPercentage >= 90 ? '#10b981' :
                                item.realizationPercentage >= 70 ? '#3b82f6' :
                                item.realizationPercentage >= 50 ? '#f59e0b' : '#ef4444'
                              };`
                            })
                          ]),
                          m('span', {
                            class: `text-sm font-medium ${this.getPercentageColor(item.realizationPercentage || 0).split(' ')[0]}`
                          }, this.formatPercentage(item.realizationPercentage || 0))
                        ])
                      ]),
                      m('td', { class: 'px-6 py-4 whitespace-nowrap text-sm font-medium' }, [
                        m('button', {
                          class: 'text-blue-600 hover:text-blue-900',
                          onclick: () => m.route.set(`/realisasi/${item._id}`)
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

export default LaporanRealisasi;