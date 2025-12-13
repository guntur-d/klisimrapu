import m from 'mithril'
import { JWTUtils, UserUtils, APIUtils } from '../js/utils.js';
import toast, { showConfirmation } from '../js/toaster.js';

const Layout = {
  oninit: function(vnode) {
    this.isSidebarOpen = true;
    this.title = vnode.attrs.title || "SIMRAPU";
    this.settingsDropdown = false;
    this.perencanaanDropdown = false;
    this.monitoringDropdown = false;
    this.evaluasiDropdown = false;
    this.pelaporanDropdown = false;
    this.penyediaDropdown = false;
    
    // Database connection monitoring
    this.isDbConnected = true;
    this.connectionCheckInterval = null;
    this.connectionRetries = 0;
    this.maxRetries = 3;
    
    // Start monitoring database connection
    this.startConnectionMonitoring();
  },

  onremove: function() {
    // Cleanup connection monitoring on component removal
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }
  },

  // Monitor database connection status
  startConnectionMonitoring: function() {
    const checkConnection = async () => {
      try {
        // Use a lightweight endpoint to check database connectivity
        const response = await fetch('/api/auth/health', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${JWTUtils.getToken()}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          // Connection is healthy
          this.isDbConnected = true;
          this.connectionRetries = 0;
          
          // If we were disconnected and now reconnected, show success message
          if (this.wasDisconnected) {
            toast.success('Koneksi database telah pulih');
            this.wasDisconnected = false;
          }
        } else {
          throw new Error('Database health check failed');
        }
      } catch (error) {
        console.error('Database connection check failed:', error);
        this.connectionRetries++;
        
        if (this.connectionRetries >= this.maxRetries) {
          this.isDbConnected = false;
          this.wasDisconnected = true;
          toast.error('Koneksi database terputus. Beberapa fitur mungkin tidak tersedia.');
        }
      }
      
      m.redraw();
    };

    // Check immediately
    checkConnection();
    
    // Check every 30 seconds
    this.connectionCheckInterval = setInterval(checkConnection, 30000);
  },

  // Get connection status display
  getConnectionStatus: function() {
    if (!this.isDbConnected) {
      return {
        color: 'text-red-500',
        bgColor: 'bg-red-50',
        text: 'Terputus',
        icon: 'ri-wifi-off-line'
      };
    } else {
      return {
        color: 'text-green-500',
        bgColor: 'bg-green-50',
        text: 'Terhubung',
        icon: 'ri-wifi-line'
      };
    }
  },

  toggleSidebar: function() {
    this.isSidebarOpen = !this.isSidebarOpen;
  },

  handleLogout: function() {
    showConfirmation(
      'Apakah Anda yakin ingin keluar?',
      () => {
        // User confirmed logout
        JWTUtils.clearAuthData();
        toast.success('Berhasil keluar dari sistem');

        // Small delay to show the success message before redirecting
        setTimeout(() => {
          m.route.set('/');
        }, 1000);
      },
      () => {
        // User cancelled logout - show cancellation message
        toast.info('Logout dibatalkan');
      }
    );
  },

  handleDocumentClick: function(e) {
    // Close settings dropdown when clicking outside
    if (!e.target.closest('.settings-dropdown') && this.settingsDropdown) {
      this.settingsDropdown = false;
      m.redraw();
    }
    // Close perencanaan dropdown when clicking outside
    if (!e.target.closest('.perencanaan-dropdown') && this.perencanaanDropdown) {
      this.perencanaanDropdown = false;
      m.redraw();
    }
    // Close monitoring dropdown when clicking outside
    if (!e.target.closest('.monitoring-dropdown') && this.monitoringDropdown) {
      this.monitoringDropdown = false;
      m.redraw();
    }
    // Close evaluasi dropdown when clicking outside
    if (!e.target.closest('.evaluasi-dropdown') && this.evaluasiDropdown) {
      this.evaluasiDropdown = false;
      m.redraw();
    }
    // Close pelaporan dropdown when clicking outside
    if (!e.target.closest('.pelaporan-dropdown') && this.pelaporanDropdown) {
      this.pelaporanDropdown = false;
      m.redraw();
    }
  },

  view: function(vnode) {
    const isAuthenticated = UserUtils.isAuthenticated();
    const isAdmin = UserUtils.isAdmin();
    const isOperator = UserUtils.isOperator();
    const connectionStatus = this.getConnectionStatus();

    return m('div', {
      class: 'flex h-screen bg-gray-100',
      onclick: (e) => this.handleDocumentClick(e)
    }, [
      // Sidebar - only show if authenticated
      isAuthenticated ? m('div', {
        class: `${this.isSidebarOpen ? 'w-64' : 'w-16'} bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out`
      }, [
        // Sidebar header
        m('div', {
          class: 'flex items-center justify-between p-4 border-b border-gray-200'
        }, [
          this.isSidebarOpen ?
            m('div', { class: 'flex items-center space-x-3' }, [
              m('div', { class: 'w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center' }, [
                m('i', { class: 'ri-government-line text-white text-lg' })
              ]),
              m('div', [
                m('h1', { class: 'font-semibold text-gray-900' }, 'SIMRAPU'),
                m('p', { class: 'text-xs text-gray-500' }, 'Budget Management')
              ])
            ]) :
            m('div', { class: 'w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mx-auto' }, [
              m('i', { class: 'ri-government-line text-white text-lg' })
            ]),

          m('button', {
            class: 'text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100',
            onclick: () => this.toggleSidebar()
          }, [
            m('i', {
              class: `text-lg ${this.isSidebarOpen ? 'ri-menu-fold-line' : 'ri-menu-unfold-line'}`
            })
          ])
        ]),

       // Sidebar menu
       m('div', { class: 'flex-1 py-4' }, [
         m('ul', { class: 'space-y-1' }, [
           // Dashboard menu (different for admin and operator)
           m('li', [
             m('a', {
               href: UserUtils.isAdmin() ? '/dashboard' : '/operator-dashboard',
               class: `flex items-center px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg mx-2 transition-colors ${
                 this.isSidebarOpen ? 'space-x-3' : 'justify-center'
               } ${m.route.get() === (UserUtils.isAdmin() ? '/dashboard' : '/operator-dashboard') ? 'bg-blue-50 border-l-4 border-blue-500 text-blue-700' : ''}`,
               oncreate: m.route.link
             }, [
               m('i', { class: 'ri-home-line text-lg' }),
               this.isSidebarOpen && m('span', { class: 'font-medium' }, 'Dashboard')
             ])
           ]),

           // Show admin menus only for admin users
           UserUtils.isAdmin() ? [
             // Perencanaan dropdown
             m('li', { class: 'relative perencanaan-dropdown' }, [
               m('button', {
                 class: `w-full flex items-center px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg mx-2 transition-colors ${
                   this.isSidebarOpen ? 'space-x-3 justify-start' : 'justify-center'
                 } ${m.route.get() === '/anggaran' ? 'bg-blue-50 border-l-4 border-blue-500 text-blue-700' : ''}`,
                 onclick: () => {
                   if (this.isSidebarOpen) {
                     this.perencanaanDropdown = !this.perencanaanDropdown;
                   }
                 }
               }, [
                 m('i', { class: 'ri-file-list-line text-lg' }),
                 this.isSidebarOpen && [
                   m('span', { class: 'font-medium flex-1 text-left' }, 'Perencanaan'),
                   m('i', { class: `ri-arrow-down-s-line text-sm transition-transform ${this.perencanaanDropdown ? 'rotate-180' : ''}` })
                 ]
               ]),

               this.isSidebarOpen && this.perencanaanDropdown && m('div', {
                 class: 'absolute left-0 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50'
               }, [
                 m('a', {
                   href: '/anggaran',
                   class: `flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors ${
                     m.route.get() === '/anggaran' ? 'bg-blue-50 text-blue-700' : ''
                   }`,
                   oncreate: m.route.link
                 }, [
                   m('i', { class: 'ri-wallet-3-line mr-3 text-base' }),
                   'Anggaran'
                 ]),
                 m('a', {
                   href: '/kinerja',
                   class: `flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors ${
                     m.route.get() === '/kinerja' ? 'bg-blue-50 text-blue-700' : ''
                   }`,
                   oncreate: m.route.link
                 }, [
                   m('i', { class: 'ri-line-chart-line mr-3 text-base' }),
                   'Kinerja'
                 ])
               ])
             ]),

             // Monitoring dropdown
             m('li', { class: 'relative monitoring-dropdown' }, [
               m('button', {
                 class: `w-full flex items-center px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg mx-2 transition-colors ${
                   this.isSidebarOpen ? 'space-x-3 justify-start' : 'justify-center'
                 } ${m.route.get() === '/realisasi' || m.route.get() === '/pencapaian' ? 'bg-blue-50 border-l-4 border-blue-500 text-blue-700' : ''}`,
                 onclick: () => {
                   if (this.isSidebarOpen) {
                     this.monitoringDropdown = !this.monitoringDropdown;
                   }
                 }
               }, [
                 m('i', { class: 'ri-eye-line text-lg' }),
                 this.isSidebarOpen && [
                   m('span', { class: 'font-medium flex-1 text-left' }, 'Monitoring'),
                   m('i', { class: `ri-arrow-down-s-line text-sm transition-transform ${this.monitoringDropdown ? 'rotate-180' : ''}` })
                 ]
               ]),

               this.isSidebarOpen && this.monitoringDropdown && m('div', {
                 class: 'absolute left-0 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50'
               }, [
                 m('a', {
                   href: '/realisasi',
                   class: `flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors ${
                     m.route.get() === '/realisasi' ? 'bg-blue-50 text-blue-700' : ''
                   }`,
                   oncreate: m.route.link
                 }, [
                   m('i', { class: 'ri-money-dollar-circle-line mr-3 text-base' }),
                   'Realisasi'
                 ]),
                 m('a', {
                   href: '/pencapaian',
                   class: `flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors ${
                     m.route.get() === '/pencapaian' ? 'bg-blue-50 text-blue-700' : ''
                   }`,
                   oncreate: m.route.link
                 }, [
                   m('i', { class: 'ri-trophy-line mr-3 text-base' }),
                   'Pencapaian'
                 ])
               ])
             ]),

             // Evaluasi dropdown
             m('li', { class: 'relative evaluasi-dropdown' }, [
               m('button', {
                 class: `w-full flex items-center px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg mx-2 transition-colors ${
                   this.isSidebarOpen ? 'space-x-3 justify-start' : 'justify-center'
                 }`,
                 onclick: () => {
                   if (this.isSidebarOpen) {
                     this.evaluasiDropdown = !this.evaluasiDropdown;
                   }
                 }
               }, [
                 m('i', { class: 'ri-clipboard-line text-lg' }),
                 this.isSidebarOpen && [
                   m('span', { class: 'font-medium flex-1 text-left' }, 'Evaluasi'),
                   m('i', { class: `ri-arrow-down-s-line text-sm transition-transform ${this.evaluasiDropdown ? 'rotate-180' : ''}` })
                 ]
               ]),

               this.isSidebarOpen && this.evaluasiDropdown && m('div', {
                 class: 'absolute left-0 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50'
               }, [
                 m('a', {
                   href: '/evaluasi-realisasi',
                   class: `flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors ${
                     m.route.get() === '/evaluasi-realisasi' ? 'bg-blue-50 text-blue-700' : ''
                   }`,
                   oncreate: m.route.link
                 }, [
                   m('i', { class: 'ri-money-dollar-circle-line mr-3 text-base' }),
                   'Realisasi'
                 ]),
                 m('a', {
                   href: '/evaluasi-kinerja',
                   class: `flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors ${
                     m.route.get() === '/evaluasi-kinerja' ? 'bg-blue-50 text-blue-700' : ''
                   }`,
                   oncreate: m.route.link
                 }, [
                   m('i', { class: 'ri-trophy-line mr-3 text-base' }),
                   'Kinerja'
                 ])
               ])
             ]),

             // Pelaporan dropdown
             m('li', { class: 'relative pelaporan-dropdown' }, [
               m('button', {
                 class: `w-full flex items-center px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg mx-2 transition-colors ${
                   this.isSidebarOpen ? 'space-x-3 justify-start' : 'justify-center'
                 }`,
                 onclick: () => {
                   if (this.isSidebarOpen) {
                     this.pelaporanDropdown = !this.pelaporanDropdown;
                   }
                 }
               }, [
                 m('i', { class: 'ri-file-chart-line text-lg' }),
                 this.isSidebarOpen && [
                   m('span', { class: 'font-medium flex-1 text-left' }, 'Pelaporan'),
                   m('i', { class: `ri-arrow-down-s-line text-sm transition-transform ${this.pelaporanDropdown ? 'rotate-180' : ''}` })
                 ]
               ]),

               this.isSidebarOpen && this.pelaporanDropdown && m('div', {
                 class: 'absolute left-0 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50'
               }, [
                 m('a', {
                   href: '/laporan-anggaran',
                   class: `flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors ${
                     m.route.get() === '/laporan-anggaran' ? 'bg-blue-50 text-blue-700' : ''
                   }`,
                   oncreate: m.route.link
                 }, [
                   m('i', { class: 'ri-wallet-line mr-3 text-base' }),
                   'Anggaran'
                 ]),
                 m('a', {
                   href: '/laporan-realisasi',
                   class: `flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors ${
                     m.route.get() === '/laporan-realisasi' ? 'bg-blue-50 text-blue-700' : ''
                   }`,
                   oncreate: m.route.link
                 }, [
                   m('i', { class: 'ri-money-dollar-circle-line mr-3 text-base' }),
                   'Realisasi'
                 ]),
                 m('a', {
                   href: '/laporan-kinerja',
                   class: `flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors ${
                     m.route.get() === '/laporan-kinerja' ? 'bg-blue-50 text-blue-700' : ''
                   }`,
                   oncreate: m.route.link
                 }, [
                   m('i', { class: 'ri-line-chart-line mr-3 text-base' }),
                   'Kinerja'
                 ]),
                 m('a', {
                   href: '/laporan-konsolidasi',
                   class: `flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors ${
                     m.route.get() === '/laporan-konsolidasi' ? 'bg-blue-50 text-blue-700' : ''
                   }`,
                   oncreate: m.route.link
                 }, [
                   m('i', { class: 'ri-bar-chart-line mr-3 text-base' }),
                   'Konsolidasi'
                 ])
               ])
             ]),

           ] : [],

           // Show operator menu only for operator users
           UserUtils.isOperator() ? [
             // Pengadaan menu
             m('li', [
               m('a', {
                 href: '/operator-pengadaan',
                 class: `flex items-center px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg mx-2 transition-colors ${
                   this.isSidebarOpen ? 'space-x-3' : 'justify-center'
                 } ${m.route.get() === '/operator-pengadaan' ? 'bg-blue-50 border-l-4 border-blue-500 text-blue-700' : ''}`,
                 oncreate: m.route.link
               }, [
                 m('i', { class: 'ri-shopping-bag-line text-lg' }),
                 this.isSidebarOpen && m('span', { class: 'font-medium' }, 'Pengadaan')
               ])
             ]),
             // Monitoring menu
             m('li', [
               m('a', {
                 href: '/operator-monitoring',
                 class: `flex items-center px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg mx-2 transition-colors ${
                   this.isSidebarOpen ? 'space-x-3' : 'justify-center'
                 } ${m.route.get() === '/operator-monitoring' ? 'bg-blue-50 border-l-4 border-blue-500 text-blue-700' : ''}`,
                 oncreate: m.route.link
               }, [
                 m('i', { class: 'ri-eye-line text-lg' }),
                 this.isSidebarOpen && m('span', { class: 'font-medium' }, 'Monitoring')
               ])
             ])
           ] : null
         ])
       ]),

       // Settings section moved above logout
       m('div', {
         class: 'p-4 border-t border-gray-200'
       }, [
         // Settings dropdown
         m('li', { class: 'relative settings-dropdown' }, [
           m('button', {
             class: `w-full flex items-center px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg mx-2 transition-colors ${
               this.isSidebarOpen ? 'space-x-3 justify-start' : 'justify-center'
             } ${m.route.get() === '/bidang-subkegiatan' || m.route.get() === '/penyedia' || m.route.get() === '/jenis-pengadaan' ? 'bg-blue-50 border-l-4 border-blue-500 text-blue-700' : ''}`,
             onclick: () => {
               if (this.isSidebarOpen) {
                 this.settingsDropdown = !this.settingsDropdown;
               }
             }
           }, [
             m('i', { class: 'ri-settings-line text-lg' }),
             this.isSidebarOpen && [
               m('span', { class: 'font-medium flex-1 text-left' }, 'Pengaturan'),
               m('i', { class: `ri-arrow-down-s-line text-sm transition-transform ${this.settingsDropdown ? 'rotate-180' : ''}` })
             ]
           ]),

this.isSidebarOpen && this.settingsDropdown && m('div', {
             class: 'absolute left-0 bottom-full mb-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50'
           }, [
             m('a', {
               href: '/perangkat-daerah',
               class: `flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors ${
                 m.route.get() === '/perangkat-daerah' ? 'bg-blue-50 text-blue-700' : ''
               }`,
               oncreate: m.route.link
             }, [
               m('i', { class: 'ri-building-line mr-3 text-base' }),
               'Perangkat Daerah'
             ]),
             m('a', {
               href: '/bidang-subkegiatan',
               class: `flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors ${
                 m.route.get() === '/bidang-subkegiatan' ? 'bg-blue-50 text-blue-700' : ''
               }`,
               oncreate: m.route.link
             }, [
               m('i', { class: 'ri-node-tree mr-3 text-base' }),
               'Program-Kegiatan'
             ]),
             m('a', {
               href: '/kode-rekening-sumber-dana',
               class: `flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors ${
                 m.route.get() === '/kode-rekening-sumber-dana' ? 'bg-blue-50 text-blue-700' : ''
               }`,
               oncreate: m.route.link
             }, [
               m('i', { class: 'ri-wallet-line mr-3 text-base' }),
               'Kode Rekening dan Sumber Dana'
             ]),
             m('a', {
               href: '/penyedia',
               class: `flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors ${
                 m.route.get() === '/penyedia' ? 'bg-blue-50 text-blue-700' : ''
               }`,
               oncreate: m.route.link
             }, [
               m('i', { class: 'ri-truck-line mr-3 text-base' }),
               'Penyedia Barang/Jasa'
             ]),
             m('a', {
               href: '/jenis-pengadaan',
               class: `flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors ${
                 m.route.get() === '/jenis-pengadaan' ? 'bg-blue-50 text-blue-700' : ''
               }`,
               oncreate: m.route.link
             }, [
               m('i', { class: 'ri-list-settings-line mr-3 text-base' }),
               'Jenis dan Metode Pengadaan'
             ]),
           ])
         ])
       ]),

        // Sidebar footer
        m('div', {
          class: 'p-4 border-t border-gray-200'
        }, [
          m('button', {
            class: `w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-colors ${
              this.isSidebarOpen ? 'space-x-2' : ''
            }`,
            onclick: () => this.handleLogout()
          }, [
            m('i', { class: 'ri-logout-box-line text-lg' }),
            this.isSidebarOpen && m('span', 'Log Out')
          ])
        ])
      ]) : null,

      // Main content area
      m('div', {
        class: 'flex-1 flex flex-col overflow-hidden'
      }, [
        // Navbar
        m('header', {
          class: 'bg-white border-b border-gray-200'
        }, [
          m('div', {
            class: 'flex items-center justify-between p-4'
          }, [
            m('h2', {
              class: 'text-lg font-semibold text-gray-800'
            }, [
              'SIMRAPU',
              ' ',
              (() => {
                const userData = UserUtils.getUserData();
                if (userData && userData.namaPerangkatDaerah) {
                  return m('span', {
                    class: 'text-blue-600 font-medium'
                  }, `- ${userData.namaPerangkatDaerah}`);
                }
                return null;
              })()
            ]),

            // Right side - User menu and logout
            m('div', {
              class: 'flex items-center space-x-4'
            }, [
              // User info
              m('div', {
                class: 'hidden sm:flex items-center space-x-2 text-sm text-gray-700'
              }, [
                m('span', UserUtils.getBudgetYear() || 'No Budget Year'),
                m('button', {
                  class: 'text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100',
                  onclick: () => m.route.set('/profile')
                }, [
                  m('i', {
                    class: 'ri-user-line text-lg'
                  })
                ])
              ]),

              // Logout button
              m('button', {
                onclick: () => this.handleLogout(),
                class: 'text-gray-500 hover:text-red-600 p-2 rounded-full hover:bg-gray-100 flex items-center'
              }, [
                m('i', {
                  class: 'ri-logout-box-line text-lg'
                })
              ])
            ])
          ])
        ]),

        // Main content
        m('main', {
          class: 'flex-1 overflow-y-auto p-6 bg-gray-50'
        }, [
          vnode.children
        ]),

        // Footer
        m('footer', {
          class: 'bg-white border-t border-gray-200 py-4 px-6'
        }, [
          m('div', {
            class: 'text-sm text-center space-y-2'
          }, [
            m('p', {
              class: 'text-gray-600'
            }, '© 2026 SIMRAPU - Sistem Informasi Manajemen Realisasi Anggaran Pekerjaan Umum'),
            m('div', {
              class: 'flex justify-center space-x-4'
            }, [
              m('a', {
                href: '#',
                class: 'text-gray-500 hover:text-gray-700 text-sm'
              }, 'About'),
              m('a', {
                href: '#',
                class: 'text-gray-500 hover:text-gray-700 text-sm'
              }, 'Contact'),
              m('a', {
                href: '#',
                class: 'text-gray-500 hover:text-gray-700 text-sm'
              }, 'Help')
            ])
          ])
        ])
      ]),

      // Database Connection Status Modal - Blocks user interaction when disconnected
      !this.isDbConnected && isAuthenticated && m('div', {
        class: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50',
        style: 'backdrop-filter: blur(2px);'
      }, [
        m('div', {
          class: 'bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all'
        }, [
          // Header with warning icon
          m('div', {
            class: 'bg-gradient-to-r from-red-500 to-red-600 text-white p-6 rounded-t-xl'
          }, [
            m('div', { class: 'flex items-center justify-between' }, [
              m('div', { class: 'flex items-center space-x-4' }, [
                m('div', {
                  class: 'w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center'
                }, [
                  m('i', {
                    class: 'ri-wifi-off-line text-3xl',
                    style: 'animation: pulse 2s infinite;'
                  })
                ]),
                m('div', [
                  m('h3', {
                    class: 'text-xl font-bold',
                    style: 'text-shadow: 0 1px 2px rgba(0,0,0,0.1);'
                  }, 'Koneksi Terputus'),
                  m('p', {
                    class: 'text-white text-opacity-90 text-sm'
                  }, 'Database tidak dapat diakses')
                ])
              ])
            ])
          ]),

          // Body with connection status
          m('div', { class: 'p-6' }, [
            m('div', { class: 'text-center mb-6' }, [
              m('div', {
                class: `inline-flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium ${connectionStatus.bgColor} ${connectionStatus.color}`
              }, [
                m('i', { class: `${connectionStatus.icon} text-lg` }),
                m('span', `Status: ${connectionStatus.text}`)
              ])
            ]),
            
            m('div', { class: 'bg-gray-50 p-4 rounded-lg mb-4' }, [
              m('div', { class: 'flex items-start space-x-3' }, [
                m('i', {
                  class: 'ri-information-line text-blue-500 text-lg mt-0.5'
                }),
                m('div', [
                  m('p', {
                    class: 'text-sm text-gray-700 font-medium mb-1'
                  }, 'Yang terjadi:'),
                  m('ul', {
                    class: 'text-sm text-gray-600 space-y-1'
                  }, [
                    m('li', '• Koneksi ke database MongoDB terputus'),
                    m('li', '• Data tidak dapat disimpan atau dimuat'),
                    m('li', '• Beberapa fitur mungkin tidak berfungsi')
                  ])
                ])
              ])
            ]),

            m('div', {
              class: 'bg-amber-50 border border-amber-200 p-3 rounded-lg'
            }, [
              m('div', { class: 'flex items-center space-x-2' }, [
                m('i', { class: 'ri-time-line text-amber-600' }),
                m('p', {
                  class: 'text-sm text-amber-800 font-medium'
                }, 'Sistem akan mencoba menghubungkan ulang secara otomatis...')
              ])
            ])
          ]),

          // Actions
          m('div', {
            class: 'flex justify-end gap-3 pt-4 border-t border-gray-200 bg-gray-50 px-6 py-4 rounded-b-xl'
          }, [
            m('button', {
              class: 'px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2',
              onclick: () => {
                this.connectionRetries = 0;
                this.startConnectionMonitoring();
                toast.info('Memeriksa koneksi database...');
              }
            }, [
              m('i', { class: 'ri-refresh-line' }),
              m('span', 'Coba Lagi')
            ])
          ])
        ])
      ]),

      // Connection Status Indicator in Header (for when connected)
      isAuthenticated && this.isDbConnected && m('div', {
        class: 'fixed top-4 right-4 z-40'
      }, [
        m('div', {
          class: `inline-flex items-center space-x-2 px-3 py-2 rounded-full text-xs font-medium ${connectionStatus.bgColor} ${connectionStatus.color} shadow-lg`,
          title: 'Koneksi database aktif'
        }, [
          m('div', {
            class: 'w-2 h-2 bg-current rounded-full animate-pulse'
          }),
          m('span', connectionStatus.text)
        ])
      ])
    ]);
  }
};

export default Layout;