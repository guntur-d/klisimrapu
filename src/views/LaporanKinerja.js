import m from 'mithril'
import { JWTUtils, UserUtils } from '../js/utils.js';
import toast from '../js/toaster.js';

const LaporanKinerja = {
  oninit: function() {
    // Check authentication before component initializes
    if (!UserUtils.isAuthenticated()) {
      toast.warning('Silakan masuk terlebih dahulu');
      m.route.set('/login');
      return;
    }

    this.userData = UserUtils.getUserData();
    this.isLoading = false;
    this.kinerjaData = [];
    this.subPerangkatDaerahList = [];
    this.budgetYear = new Date().getFullYear().toString();
    this.selectedSubPerangkatDaerah = '';
    this.selectedStatus = '';

    // Load both SubPerangkatDaerah options and kinerja data
    this.loadSubPerangkatDaerahOptions();
    this.loadData();
  },

  loadSubPerangkatDaerahOptions: async function() {
    try {
      const token = JWTUtils.getToken();
      if (!token) return;

      // Load Kinerja data for the selected budget year to get used SubPerangkatDaerah
      const kinerjaResponse = await fetch(`/api/kinerja?budgetYear=${this.budgetYear}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (kinerjaResponse.ok) {
        const kinerjaResult = await kinerjaResponse.json();
        const kinerjaData = kinerjaResult.data || [];

        // Extract unique SubPerangkatDaerah IDs from Kinerja data
        const usedSubPerangkatDaerahIds = [...new Set(kinerjaData.map(item => item.subPerangkatDaerahId?._id || item.subPerangkatDaerahId))];

        if (usedSubPerangkatDaerahIds.length > 0) {
          // Load all SubPerangkatDaerah and filter to only those used in Kinerja
          const subPerangkatDaerahResponse = await fetch('/api/subperangkatdaerah', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (subPerangkatDaerahResponse.ok) {
            const subPerangkatDaerahResult = await subPerangkatDaerahResponse.json();
            const allSubPerangkatDaerah = subPerangkatDaerahResult.data || [];

            // Filter to only SubPerangkatDaerah that are used in Kinerja for this budget year
            this.subPerangkatDaerahList = allSubPerangkatDaerah.filter(subPerangkatDaerah =>
              usedSubPerangkatDaerahIds.includes(subPerangkatDaerah._id)
            );

            console.log(`Filtered SubPerangkatDaerah options (used in Kinerja ${this.budgetYear}):`, this.subPerangkatDaerahList.length);
          } else {
            console.error('Failed to load all SubPerangkatDaerah for Kinerja:', subPerangkatDaerahResponse.status);
          }
        } else {
          console.log('No Kinerja data found for budget year:', this.budgetYear);
          this.subPerangkatDaerahList = [];
        }
      } else {
        console.error('Failed to load Kinerja data for filtering:', kinerjaResponse.status);
        this.subPerangkatDaerahList = [];
      }
    } catch (error) {
      console.error('Error loading filtered SubPerangkatDaerah options for Kinerja:', error);
      this.subPerangkatDaerahList = [];
    }

    m.redraw();
  },

  loadData: async function() {
    this.isLoading = true;
    m.redraw();

    try {
      const token = JWTUtils.getToken();
      if (!token) {
        toast.error('Token autentikasi tidak ditemukan');
        return;
      }

      const params = new URLSearchParams();
      params.append('budgetYear', this.budgetYear);
      if (this.selectedSubPerangkatDaerah) {
        params.append('subPerangkatDaerahId', this.selectedSubPerangkatDaerah);
      }
      if (this.selectedStatus) {
        params.append('status', this.selectedStatus);
      }

      const response = await fetch(`/api/kinerja?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        this.kinerjaData = result.data || [];
      } else {
        toast.error('Gagal memuat data kinerja');
      }
    } catch (error) {
      console.error('Error loading kinerja data:', error);
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

  formatPercentage: function(value) {
    return `${Math.round(value)}%`;
  },

  getPercentageColor: function(percentage) {
    if (percentage >= 90) return 'text-green-600 bg-green-100';
    if (percentage >= 70) return 'text-blue-600 bg-blue-100';
    if (percentage >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  },

  getStatusColor: function(status) {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'planning': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  },

  getPriorityColor: function(priority) {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  },

  exportToCSV: function() {
    if (this.kinerjaData.length === 0) {
      toast.warning('Tidak ada data untuk diekspor');
      return;
    }

    const headers = ['SubKegiatan', 'Unit Kerja', 'Target', 'Aktual', 'Pencapaian', 'Status', 'Prioritas', 'Target Date'];
    const csvContent = [
      headers.join(','),
      ...this.kinerjaData.map(item => [
        item.subKegiatanId?.nama || '',
        item.subPerangkatDaerahId?.nama || '',
        item.targetValue || 0,
        item.actualValue || 0,
        item.achievementPercentage || 0,
        item.status || '',
        item.priority || '',
        item.targetDate ? new Date(item.targetDate).toLocaleDateString('id-ID') : ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-kinerja-${this.budgetYear}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Laporan berhasil diekspor');
  },

  view: function() {
    const totalTarget = this.kinerjaData.reduce((sum, item) => sum + (item.targetValue || 0), 0);
    const totalActual = this.kinerjaData.reduce((sum, item) => sum + (item.actualValue || 0), 0);
    const avgPercentage = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;
    const completedCount = this.kinerjaData.filter(item => item.status === 'completed').length;
    const overdueCount = this.kinerjaData.filter(item => {
      return item.status !== 'completed' && item.targetDate && new Date(item.targetDate) < new Date();
    }).length;

    return m('div', { class: 'space-y-6' }, [
      // Header
      m('div', { class: 'bg-white rounded-lg shadow-sm p-6' }, [
        m('div', { class: 'flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6' }, [
          m('div', [
            m('h1', { class: 'text-2xl font-bold text-gray-900 mb-2' }, 'Laporan Kinerja'),
            m('p', { class: 'text-gray-600' }, 'Laporan pencapaian target kinerja per subkegiatan')
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
            m('label', { class: 'block text-sm font-medium text-gray-700 mb-2' }, 'Tahun Anggaran'),
            m('select', {
              class: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
              value: this.budgetYear,
              onchange: (e) => {
                this.budgetYear = e.target.value;
                this.selectedSubPerangkatDaerah = ''; // Reset SubPerangkatDaerah selection when year changes
                this.loadSubPerangkatDaerahOptions(); // Reload filtered SubPerangkatDaerah for new year
                this.loadData();
              }
            }, [
              m('option', { value: '2026' }, '2026'),
              m('option', { value: '2025' }, '2025'),
              m('option', { value: '2024' }, '2024')
            ])
          ]),
          m('div', [
            m('label', { class: 'block text-sm font-medium text-gray-700 mb-2' }, 'Unit Kerja'),
            m('select', {
              class: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
              value: this.selectedSubPerangkatDaerah,
              onchange: (e) => {
                this.selectedSubPerangkatDaerah = e.target.value;
                this.loadData();
              }
            }, [
              m('option', { value: '' }, 'Semua Unit Kerja'),
              // Populate with loaded SubPerangkatDaerah data
              this.subPerangkatDaerahList.map(subPerangkatDaerah =>
                m('option', {
                  value: subPerangkatDaerah._id
                }, `${subPerangkatDaerah.kode} - ${subPerangkatDaerah.nama}`)
              )
            ])
          ]),
          m('div', [
            m('label', { class: 'block text-sm font-medium text-gray-700 mb-2' }, 'Status'),
            m('select', {
              class: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
              value: this.selectedStatus,
              onchange: (e) => {
                this.selectedStatus = e.target.value;
                this.loadData();
              }
            }, [
              m('option', { value: '' }, 'Semua Status'),
              m('option', { value: 'planning' }, 'Planning'),
              m('option', { value: 'in_progress' }, 'In Progress'),
              m('option', { value: 'completed' }, 'Completed'),
              m('option', { value: 'cancelled' }, 'Cancelled')
            ])
          ])
        ])
      ]),

      // Summary Cards
      m('div', { class: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6' }, [
        m('div', { class: 'bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500' }, [
          m('div', { class: 'flex items-center' }, [
            m('div', { class: 'p-2 bg-blue-100 rounded-lg' }, [
              m('i', { class: 'ri-line-chart-line text-xl text-blue-600' })
            ]),
            m('div', { class: 'ml-4' }, [
              m('p', { class: 'text-sm font-medium text-gray-600' }, 'Total Kegiatan'),
              m('p', { class: 'text-2xl font-bold text-gray-900' }, this.kinerjaData.length)
            ])
          ])
        ]),
        m('div', { class: `bg-white rounded-lg shadow-sm p-6 border-l-4 ${avgPercentage >= 90 ? 'border-green-500' : avgPercentage >= 70 ? 'border-blue-500' : 'border-yellow-500'}` }, [
          m('div', { class: 'flex items-center' }, [
            m('div', { class: `p-2 rounded-lg ${this.getPercentageColor(avgPercentage).split(' ')[1]}` }, [
              m('i', { class: `ri-bar-chart-line text-xl ${this.getPercentageColor(avgPercentage).split(' ')[0]}` })
            ]),
            m('div', { class: 'ml-4' }, [
              m('p', { class: 'text-sm font-medium text-gray-600' }, 'Rata-rata Pencapaian'),
              m('p', { class: 'text-2xl font-bold text-gray-900' }, this.formatPercentage(avgPercentage))
            ])
          ])
        ]),
        m('div', { class: 'bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500' }, [
          m('div', { class: 'flex items-center' }, [
            m('div', { class: 'p-2 bg-green-100 rounded-lg' }, [
              m('i', { class: 'ri-check-circle-line text-xl text-green-600' })
            ]),
            m('div', { class: 'ml-4' }, [
              m('p', { class: 'text-sm font-medium text-gray-600' }, 'Selesai'),
              m('p', { class: 'text-2xl font-bold text-gray-900' }, completedCount)
            ])
          ])
        ]),
        m('div', { class: 'bg-white rounded-lg shadow-sm p-6 border-l-4 border-red-500' }, [
          m('div', { class: 'flex items-center' }, [
            m('div', { class: 'p-2 bg-red-100 rounded-lg' }, [
              m('i', { class: 'ri-time-line text-xl text-red-600' })
            ]),
            m('div', { class: 'ml-4' }, [
              m('p', { class: 'text-sm font-medium text-gray-600' }, 'Terlambat'),
              m('p', { class: 'text-2xl font-bold text-gray-900' }, overdueCount)
            ])
          ])
        ])
      ]),

      // Data Table
      m('div', { class: 'bg-white rounded-lg shadow-sm overflow-hidden' }, [
        m('div', { class: 'px-6 py-4 border-b border-gray-200' }, [
          m('h3', { class: 'text-lg font-medium text-gray-900' }, 'Detail Kinerja')
        ]),
        m('div', { class: 'overflow-x-auto' }, [
          this.isLoading ?
            m('div', { class: 'p-8 text-center' }, [
              m('i', { class: 'ri-loader-4-line animate-spin text-2xl text-gray-400 mb-2' }),
              m('p', { class: 'text-gray-500' }, 'Memuat data...')
            ]) :
            this.kinerjaData.length === 0 ?
              m('div', { class: 'p-8 text-center' }, [
                m('i', { class: 'ri-inbox-line text-4xl text-gray-300 mb-2' }),
                m('p', { class: 'text-gray-500' }, 'Tidak ada data kinerja')
              ]) :
              m('table', { class: 'min-w-full divide-y divide-gray-200' }, [
                m('thead', { class: 'bg-gray-50' }, [
                  m('tr', [
                    m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'SubKegiatan'),
                    m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Unit Kerja'),
                    m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Target'),
                    m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Aktual'),
                    m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Pencapaian'),
                    m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Status'),
                    m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Prioritas'),
                    m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Target Date'),
                    m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Aksi')
                  ])
                ]),
                m('tbody', { class: 'bg-white divide-y divide-gray-200' },
                  this.kinerjaData.map(item => [
                    m('tr', { class: 'hover:bg-gray-50' }, [
                      m('td', { class: 'px-6 py-4 whitespace-nowrap' }, [
                        m('div', { class: 'text-sm font-medium text-gray-900' }, item.subKegiatanId?.nama || ''),
                        m('div', { class: 'text-sm text-gray-500' }, item.subKegiatanId?.kode || '')
                      ]),
                      m('td', { class: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900' },
                        item.subPerangkatDaerahId?.nama || ''
                      ),
                      m('td', { class: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900' },
                        item.targetValue?.toLocaleString('id-ID') || '0'
                      ),
                      m('td', { class: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900' },
                        item.actualValue?.toLocaleString('id-ID') || '0'
                      ),
                      m('td', { class: 'px-6 py-4 whitespace-nowrap' }, [
                        m('div', { class: 'flex items-center' }, [
                          m('div', { class: 'flex-1 bg-gray-200 rounded-full h-2 mr-3' }, [
                            m('div', {
                              class: 'h-2 rounded-full',
                              style: `width: ${Math.min(100, item.achievementPercentage || 0)}%; background-color: ${
                                item.achievementPercentage >= 90 ? '#10b981' :
                                item.achievementPercentage >= 70 ? '#3b82f6' :
                                item.achievementPercentage >= 50 ? '#f59e0b' : '#ef4444'
                              };`
                            })
                          ]),
                          m('span', {
                            class: `text-sm font-medium ${this.getPercentageColor(item.achievementPercentage || 0).split(' ')[0]}`
                          }, this.formatPercentage(item.achievementPercentage || 0))
                        ])
                      ]),
                      m('td', { class: 'px-6 py-4 whitespace-nowrap' }, [
                        m('span', {
                          class: `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${this.getStatusColor(item.status)}`
                        }, item.status || 'planning')
                      ]),
                      m('td', { class: 'px-6 py-4 whitespace-nowrap' }, [
                        m('span', {
                          class: `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${this.getPriorityColor(item.priority)}`
                        }, item.priority || 'medium')
                      ]),
                      m('td', { class: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900' }, [
                        item.targetDate ? new Date(item.targetDate).toLocaleDateString('id-ID') : '-'
                      ]),
                      m('td', { class: 'px-6 py-4 whitespace-nowrap text-sm font-medium' }, [
                        m('button', {
                          class: 'text-blue-600 hover:text-blue-900',
                          onclick: () => m.route.set(`/kinerja/${item._id}`)
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

export default LaporanKinerja;