import m from 'mithril'
import { UserUtils } from '../js/utils.js';

const Dashboard = {
  oninit: function(vnode) {
    this.userData = UserUtils.getUserData();
  },

  view: function() {
    return m('div', {
      class: 'p-6 bg-gray-50 min-h-full'
    }, [
      // Header
      m('div', { class: 'mb-8' }, [
        m('h1', {
          class: 'text-3xl font-bold text-gray-900 mb-2'
        }, 'Dashboard'),
        m('p', {
          class: 'text-gray-600'
        }, `Welcome back, ${this.userData.username || 'User'}!`),
        m('p', {
          class: 'text-sm text-gray-500 mt-1'
        }, `Budget Year: ${this.userData.budgetYear ? `${this.userData.budgetYear.year} (${this.userData.budgetYear.status})` : 'Not selected'}`)
      ]),

      // Stats Cards
      m('div', {
        class: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'
      }, [
        // Total Budget Card
        m('div', {
          class: 'bg-white rounded-lg shadow p-6 border-l-4 border-blue-500'
        }, [
          m('div', { class: 'flex items-center' }, [
            m('div', { class: 'p-2 bg-blue-100 rounded-lg' }, [
              m('svg', {
                class: 'w-6 h-6 text-blue-600',
                fill: 'none',
                stroke: 'currentColor',
                viewBox: '0 0 24 24'
              }, [
                m('path', {
                  'stroke-linecap': 'round',
                  'stroke-linejoin': 'round',
                  'stroke-width': '2',
                  d: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1'
                })
              ])
            ]),
            m('div', { class: 'ml-4' }, [
              m('p', { class: 'text-sm font-medium text-gray-600' }, 'Total Budget'),
              m('p', { class: 'text-2xl font-semibold text-gray-900' }, 'Rp 0')
            ])
          ])
        ]),

        // Realization Card
        m('div', {
          class: 'bg-white rounded-lg shadow p-6 border-l-4 border-green-500'
        }, [
          m('div', { class: 'flex items-center' }, [
            m('div', { class: 'p-2 bg-green-100 rounded-lg' }, [
              m('svg', {
                class: 'w-6 h-6 text-green-600',
                fill: 'none',
                stroke: 'currentColor',
                viewBox: '0 0 24 24'
              }, [
                m('path', {
                  'stroke-linecap': 'round',
                  'stroke-linejoin': 'round',
                  'stroke-width': '2',
                  d: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                })
              ])
            ]),
            m('div', { class: 'ml-4' }, [
              m('p', { class: 'text-sm font-medium text-gray-600' }, 'Realization'),
              m('p', { class: 'text-2xl font-semibold text-gray-900' }, 'Rp 0')
            ])
          ])
        ]),

        // Active Projects Card
        m('div', {
          class: 'bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500'
        }, [
          m('div', { class: 'flex items-center' }, [
            m('div', { class: 'p-2 bg-yellow-100 rounded-lg' }, [
              m('svg', {
                class: 'w-6 h-6 text-yellow-600',
                fill: 'none',
                stroke: 'currentColor',
                viewBox: '0 0 24 24'
              }, [
                m('path', {
                  'stroke-linecap': 'round',
                  'stroke-linejoin': 'round',
                  'stroke-width': '2',
                  d: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'
                })
              ])
            ]),
            m('div', { class: 'ml-4' }, [
              m('p', { class: 'text-sm font-medium text-gray-600' }, 'Active Projects'),
              m('p', { class: 'text-2xl font-semibold text-gray-900' }, '0')
            ])
          ])
        ]),

        // Pending Approvals Card
        m('div', {
          class: 'bg-white rounded-lg shadow p-6 border-l-4 border-red-500'
        }, [
          m('div', { class: 'flex items-center' }, [
            m('div', { class: 'p-2 bg-red-100 rounded-lg' }, [
              m('svg', {
                class: 'w-6 h-6 text-red-600',
                fill: 'none',
                stroke: 'currentColor',
                viewBox: '0 0 24 24'
              }, [
                m('path', {
                  'stroke-linecap': 'round',
                  'stroke-linejoin': 'round',
                  'stroke-width': '2',
                  d: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
                })
              ])
            ]),
            m('div', { class: 'ml-4' }, [
              m('p', { class: 'text-sm font-medium text-gray-600' }, 'Pending Approvals'),
              m('p', { class: 'text-2xl font-semibold text-gray-900' }, '0')
            ])
          ])
        ]),

        // Report Summary Cards
        m('div', { class: 'bg-white rounded-lg shadow p-6 border-l-4 border-orange-500' }, [
          m('div', { class: 'flex items-center' }, [
            m('div', { class: 'p-2 bg-orange-100 rounded-lg' }, [
              m('i', { class: 'ri-file-chart-line text-xl text-orange-600' })
            ]),
            m('div', { class: 'ml-4' }, [
              m('p', { class: 'text-sm font-medium text-gray-600' }, 'Laporan Tersedia'),
              m('p', { class: 'text-2xl font-bold text-gray-900' }, '4')
            ])
          ])
        ])
      ]),

      // Quick Actions - Pelaporan Section
      m('div', { class: 'bg-white rounded-lg shadow p-6 mb-6' }, [
        m('h2', {
          class: 'text-lg font-medium text-gray-900 mb-4 flex items-center'
        }, [
          m('i', { class: 'ri-file-chart-line mr-2 text-blue-500' }),
          'Laporan & Analisis'
        ]),

        m('div', {
          class: 'grid grid-cols-2 md:grid-cols-4 gap-4 mb-4'
        }, [
          m('button', {
            class: 'flex flex-col items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
            onclick: () => m.route.set('/laporan-anggaran')
          }, [
            m('i', { class: 'ri-wallet-line text-2xl text-blue-500 mb-2' }),
            m('span', 'Laporan'),
            m('span', 'Anggaran')
          ]),

          m('button', {
            class: 'flex flex-col items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
            onclick: () => m.route.set('/laporan-realisasi')
          }, [
            m('i', { class: 'ri-money-dollar-circle-line text-2xl text-green-500 mb-2' }),
            m('span', 'Laporan'),
            m('span', 'Realisasi')
          ]),

          m('button', {
            class: 'flex flex-col items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
            onclick: () => m.route.set('/laporan-kinerja')
          }, [
            m('i', { class: 'ri-line-chart-line text-2xl text-purple-500 mb-2' }),
            m('span', 'Laporan'),
            m('span', 'Kinerja')
          ]),

          m('button', {
            class: 'flex flex-col items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
            onclick: () => m.route.set('/laporan-konsolidasi')
          }, [
            m('i', { class: 'ri-bar-chart-line text-2xl text-orange-500 mb-2' }),
            m('span', 'Laporan'),
            m('span', 'Konsolidasi')
          ])
        ])
      ]),

      // Quick Actions - Management Section
      m('div', { class: 'bg-white rounded-lg shadow p-6' }, [
        m('h2', {
          class: 'text-lg font-medium text-gray-900 mb-4 flex items-center'
        }, [
          m('i', { class: 'ri-settings-line mr-2 text-gray-500' }),
          'Manajemen Data'
        ]),

        m('div', {
          class: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
        }, [
          m('button', {
            class: 'flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
          }, [
            m('i', { class: 'ri-add-line mr-2 text-gray-500' }),
            'Tambah Proyek Baru'
          ]),

          m('button', {
            class: 'flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
          }, [
            m('i', { class: 'ri-file-list-line mr-2 text-gray-500' }),
            'Laporan Generate'
          ]),

          m('button', {
            class: 'flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
          }, [
            m('i', { class: 'ri-settings-line mr-2 text-gray-500' }),
            'Pengaturan Sistem'
          ])
        ])
      ])
    ]);
  }
};

export default Dashboard;