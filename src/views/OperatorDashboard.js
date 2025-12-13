import m from 'mithril'
import { ToastUtils, UserUtils, APIUtils } from '../js/utils.js'

const OperatorDashboard = {
  // State management
  isLoading: false,
  currentUser: null,
  unitInfo: null,
  dashboardData: {
    paketCount: 0,
    totalBudget: 0,
    activePackages: 0,
    completedPackages: 0,
    recentActivity: []
  },

  oninit: function() {
    // Check if user is operator
    if (!UserUtils.isAuthenticated()) {
      ToastUtils.warning('Silakan masuk terlebih dahulu');
      m.route.set('/login');
      return;
    }

    this.currentUser = UserUtils.getUserData();

    // Only allow operators to access this view
    if (this.currentUser.role !== 'operator') {
      ToastUtils.warning('Halaman ini hanya dapat diakses oleh operator');
      m.route.set('/dashboard');
      return;
    }

    this.loadDashboardData();
  },

  // Load dashboard data
  loadDashboardData: async function() {
    this.isLoading = true;
    m.redraw();

    try {
      const userData = UserUtils.getUserData();
      const subPerangkatDaerahId = userData.subPerangkatDaerahId;
      const currentYear = new Date().getFullYear();
      const budgetYears = ['2026-Murni', '2026-PAK'];
      const currentBudgetYear = budgetYears[0];

      if (!subPerangkatDaerahId) {
        ToastUtils.warning('Informasi unit kerja tidak ditemukan');
        return;
      }

      // Get unit information
      const unitResponse = await APIUtils.request(`/api/subperangkatdaerah/${subPerangkatDaerahId}`);
      this.unitInfo = unitResponse.data;

      // Get paket/pengadaan data for this unit
      const paketResponse = await APIUtils.request(`/api/pengadaan?subPerangkatDaerahId=${subPerangkatDaerahId}&budgetYear=${encodeURIComponent(currentBudgetYear)}`);
      const paketList = paketResponse.data || [];

      // Calculate dashboard metrics
      this.dashboardData = {
        paketCount: paketList.length,
        totalBudget: paketList.reduce((sum, paket) => sum + (paket.estimatedBudget || 0), 0),
        activePackages: paketList.filter(p => p.status === 'active').length,
        completedPackages: paketList.filter(p => p.status === 'completed').length,
        recentActivity: paketList
          .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
          .slice(0, 5)
      };

      console.log('Dashboard data loaded:', this.dashboardData);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      
      // Handle specific API errors more gracefully
      if (error.message && error.message.includes('404')) {
        ToastUtils.warning('Data pengadaan tidak ditemukan untuk unit kerja ini');
        // Set empty data to prevent UI errors
        this.dashboardData = {
          paketCount: 0,
          totalBudget: 0,
          activePackages: 0,
          completedPackages: 0,
          recentActivity: []
        };
      } else if (error.message && error.message.includes('500')) {
        ToastUtils.error('Terjadi kesalahan server saat memuat data');
      } else {
        ToastUtils.error('Gagal memuat data dashboard. Pastikan koneksi server berjalan normal.');
      }
    }

    this.isLoading = false;
    m.redraw();
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
      // Header
      m('div', { class: 'bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-6' }, [
        m('div', { class: 'flex items-center justify-between' }, [
          m('div', [
            m('h1', { class: 'text-2xl font-bold' }, 'Dashboard Unit'),
            m('p', { class: 'text-blue-100 mt-1' }, this.unitInfo?.nama || 'Unit Kerja'),
            m('p', { class: 'text-blue-200 text-sm mt-1' }, `Pimpinan: ${this.unitInfo?.pimpinan || 'Tidak ada data'}`)
          ]),
          m('div', { class: 'text-right' }, [
            m('div', { class: 'w-16 h-16 bg-white bg-opacity-75 rounded-full flex items-center justify-center' }, [
              m('i', { class: 'ri-building-fill text-2xl' })
            ])
          ])
        ])
      ]),

      // Quick Stats
      m('div', { class: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6' }, [
        // Total Packages
        m('div', { class: 'bg-white rounded-lg shadow-sm border border-gray-200 p-6' }, [
          m('div', { class: 'flex items-center justify-between' }, [
            m('div', [
              m('p', { class: 'text-sm font-medium text-gray-600' }, 'Total Paket'),
              m('p', { class: 'text-2xl font-bold text-gray-900' }, this.dashboardData?.paketCount || 0)
            ]),
            m('div', { class: 'w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center' }, [
               m('i', { class: 'ri-shopping-bag-line text-blue-600 text-xl' })
             ])
          ])
        ]),

        // Total Budget
        m('div', { class: 'bg-white rounded-lg shadow-sm border border-gray-200 p-6' }, [
          m('div', { class: 'flex items-center justify-between' }, [
            m('div', [
              m('p', { class: 'text-sm font-medium text-gray-600' }, 'Total Anggaran'),
              m('p', { class: 'text-2xl font-bold text-gray-900' }, `Rp ${(this.dashboardData.totalBudget || 0).toLocaleString('id-ID')}`)
            ]),
            m('div', { class: 'w-12 h-12 bg-green-100 rounded-full flex items-center justify-center' }, [
              m('i', { class: 'ri-money-dollar-circle-line text-green-600 text-xl' })
            ])
          ])
        ]),

        // Active Packages
        m('div', { class: 'bg-white rounded-lg shadow-sm border border-gray-200 p-6' }, [
          m('div', { class: 'flex items-center justify-between' }, [
            m('div', [
              m('p', { class: 'text-sm font-medium text-gray-600' }, 'Paket Aktif'),
              m('p', { class: 'text-2xl font-bold text-gray-900' }, this.dashboardData?.activePackages || 0)
            ]),
            m('div', { class: 'w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center' }, [
              m('i', { class: 'ri-play-circle-line text-yellow-600 text-xl' })
            ])
          ])
        ]),

        // Completed Packages
        m('div', { class: 'bg-white rounded-lg shadow-sm border border-gray-200 p-6' }, [
          m('div', { class: 'flex items-center justify-between' }, [
            m('div', [
              m('p', { class: 'text-sm font-medium text-gray-600' }, 'Paket Selesai'),
              m('p', { class: 'text-2xl font-bold text-gray-900' }, this.dashboardData?.completedPackages || 0)
            ]),
            m('div', { class: 'w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center' }, [
              m('i', { class: 'ri-check-circle-line text-purple-600 text-xl' })
            ])
          ])
        ])
      ]),

      // Recent Activity
      m('div', { class: 'bg-white rounded-lg shadow-sm border border-gray-200' }, [
        m('div', { class: 'p-6 border-b border-gray-200' }, [
          m('h3', { class: 'text-lg font-semibold text-gray-900' }, 'Aktivitas Terbaru'),
          m('p', { class: 'text-sm text-gray-500 mt-1' }, 'Paket kegiatan yang baru dibuat atau diupdate')
        ]),

        this.isLoading ?
          m('div', { class: 'flex justify-center items-center h-32' }, [
            m('div', { class: 'w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin' })
          ]) :

          this.dashboardData.recentActivity.length === 0 ?
            m('div', { class: 'text-center py-12' }, [
              m('div', { class: 'mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-4' }, [
                m('i', { class: 'ri-time-fill text-blue-500' })
              ]),
              m('h3', { class: 'text-lg font-medium text-gray-900 mb-2' }, 'Belum ada aktivitas'),
              m('p', { class: 'text-gray-500' }, 'Paket kegiatan yang baru dibuat akan muncul di sini')
            ]) :

            m('div', { class: 'divide-y divide-gray-200' }, [
              this.dashboardData.recentActivity.map(paket =>
                m('div', { class: 'p-4 hover:bg-gray-50 transition-colors' }, [
                  m('div', { class: 'flex items-center justify-between' }, [
                    m('div', { class: 'flex items-center space-x-3' }, [
                      m('div', {
                        class: 'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold',
                        style: `background-color: ${paket.status === 'active' ? '#FEF3C7' : paket.status === 'completed' ? '#D1FAE5' : '#F3F4F6'}; color: ${paket.status === 'active' ? '#D97706' : paket.status === 'completed' ? '#065F46' : '#6B7280'};`
                      }, paket.kode?.substring(0, 2) || 'PK'),
                      m('div', [
                        m('p', { class: 'text-sm font-medium text-gray-900' }, paket.nama || 'Nama paket'),
                        m('p', { class: 'text-xs text-gray-500' }, `Kode: ${paket.kode || 'Tidak ada'}`)
                      ])
                    ]),
                    m('div', { class: 'text-right' }, [
                      m('div', { class: 'flex items-center space-x-2' }, [
                        m('span', {
                          class: `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${paket.status === 'active' ? 'bg-green-100 text-green-800' : paket.status === 'completed' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`
                        }, paket.status || 'draft'),
                        m('span', { class: 'text-sm text-gray-500' }, `Rp ${(paket.estimatedBudget || 0).toLocaleString('id-ID')}`)
                      ])
                    ])
                  ])
                ])
              )
            ])
      ]),

      // Quick Actions
      m('div', { class: 'bg-white rounded-lg shadow-sm border border-gray-200' }, [
        m('div', { class: 'p-6 border-b border-gray-200' }, [
          m('h3', { class: 'text-lg font-semibold text-gray-900' }, 'Aksi Cepat'),
          m('p', { class: 'text-sm text-gray-500 mt-1' }, 'Menuju halaman yang sering digunakan')
        ]),

        m('div', { class: 'p-6' }, [
          m('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-4' }, [
            m('a', {
              href: '/operator/pengadaan',
              class: 'flex items-center p-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl'
            }, [
              m('div', { class: 'w-12 h-12 bg-white bg-opacity-75 rounded-full flex items-center justify-center mr-4' }, [
                 m('i', { class: 'ri-shopping-bag-fill text-xl text-gray-700' })
               ]),
              m('div', [
                m('h4', { class: 'font-semibold' }, 'Kelola Pengadaan'),
                m('p', { class: 'text-green-100 text-sm' }, 'Lihat dan kelola paket kegiatan')
              ])
            ]),

            m('a', {
              href: '/operator/pengadaan',
              class: 'flex items-center p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl'
            }, [
              m('div', { class: 'w-12 h-12 bg-white bg-opacity-75 rounded-full flex items-center justify-center mr-4' }, [
                m('i', { class: 'ri-add-circle-fill text-xl text-gray-700' })
              ]),
              m('div', [
                m('h4', { class: 'font-semibold' }, 'Tambah Paket Baru'),
                m('p', { class: 'text-blue-100 text-sm' }, 'Buat paket kegiatan baru')
              ])
            ])
          ])
        ])
      ])
    ]);
  }
}

export default OperatorDashboard