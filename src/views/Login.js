import m from 'mithril'
import { JWTUtils } from '../js/utils.js';
import toast from '../js/toaster.js';

const Login = {
  username: '',
  password: '',
  selectedBudgetYear: '',
  showPassword: false,
  rememberMe: false,
  isLoading: false,

  budgetYears: [
    { year: 2026, status: 'Murni', value: '2026-Murni' },
    { year: 2026, status: 'PAK', value: '2026-PAK' }
  ],

  view: function() {
    return m('div', {
      class: 'min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8'
    }, [
      m('div', { class: 'sm:mx-auto sm:w-full sm:max-w-md' }, [
        m('div', { class: 'text-center' }, [
          m('h2', {
            class: 'mt-6 text-3xl font-bold text-gray-900'
          }, 'SIMRAPU Login'),
          m('p', {
            class: 'mt-2 text-sm text-gray-600'
          }, 'Sistem Informasi Manajemen Realisasi Anggaran Pekerjaan Umum')
        ])
      ]),

      m('div', { class: 'mt-8 sm:mx-auto sm:w-full sm:max-w-md' }, [
        m('div', {
          class: 'bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10'
        }, [

          m('form', {
            class: 'space-y-6',
            onsubmit: this.handleSubmit.bind(this)
          }, [
            // Username field
            m('div', [
              m('label', {
                for: 'username',
                class: 'block text-sm font-medium text-gray-700'
              }, 'Username'),
              m('div', { class: 'mt-1 relative' }, [
                m('input', {
                  id: 'username',
                  name: 'username',
                  type: 'text',
                  required: true,
                  class: 'appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm',
                  placeholder: 'Masukkan username Anda',
                  value: this.username,
                  oninput: (e) => this.username = e.target.value
                })
              ])
            ]),

            // Password field
            m('div', [
              m('label', {
                for: 'password',
                class: 'block text-sm font-medium text-gray-700'
              }, 'Password'),
              m('div', { class: 'mt-1 relative' }, [
                m('input', {
                  id: 'password',
                  name: 'password',
                  type: this.showPassword ? 'text' : 'password',
                  required: true,
                  class: 'appearance-none block w-full pr-10 pl-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm',
                  placeholder: 'Masukkan password Anda',
                  value: this.password,
                  oninput: (e) => this.password = e.target.value
                }),
                m('button', {
                  type: 'button',
                  class: 'absolute inset-y-0 right-0 pr-3 flex items-center',
                  onclick: () => this.showPassword = !this.showPassword
                }, [
                  m('i', {
                    class: `ri-${this.showPassword ? 'eye-off' : 'eye'}-line text-gray-400 hover:text-gray-600`
                  })
                ])
              ])
            ]),

            // Tahun Anggaran dropdown
            m('div', [
              m('label', {
                for: 'budgetYear',
                class: 'block text-sm font-medium text-gray-700'
              }, 'Tahun Anggaran'),
              m('div', { class: 'mt-1 relative' }, [
                m('select', {
                  id: 'budgetYear',
                  name: 'budgetYear',
                  required: true,
                  class: 'appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm',
                  value: this.selectedBudgetYear,
                  onchange: (e) => this.selectedBudgetYear = e.target.value
                }, [
                  m('option', { value: '' }, 'Pilih Tahun Anggaran'),
                  this.budgetYears.map(year =>
                    m('option', {
                      value: year.value,
                      key: year.value
                    }, `${year.year} (${year.status})`)
                  )
                ])
              ])
            ]),

            // Remember me checkbox
            m('div', { class: 'flex items-center' }, [
              m('input', {
                id: 'rememberMe',
                name: 'rememberMe',
                type: 'checkbox',
                class: 'h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded',
                checked: this.rememberMe,
                onchange: (e) => this.rememberMe = e.target.checked
              }),
              m('label', {
                for: 'rememberMe',
                class: 'ml-2 block text-sm text-gray-900'
              }, 'Ingat saya')
            ]),

            // Submit button
            m('div', [
              m('button', {
                type: 'submit',
                disabled: this.isLoading,
                class: `group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                  this.isLoading
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`
              }, [
                m('span', { class: 'absolute left-0 inset-y-0 flex items-center pl-3' }, [
                  this.isLoading
                    ? m('svg', {
                        class: 'animate-spin h-5 w-5 text-blue-500',
                        fill: 'none',
                        viewBox: '0 0 24 24'
                      }, [
                        m('circle', {
                          class: 'opacity-25',
                          cx: '12',
                          cy: '12',
                          r: '10',
                          stroke: 'currentColor',
                          'stroke-width': '4'
                        }),
                        m('path', {
                          class: 'opacity-75',
                          fill: 'currentColor',
                          d: 'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                        })
                      ])
                    : m('svg', {
                        class: 'h-5 w-5 text-blue-500 group-hover:text-blue-400',
                        fill: 'currentColor',
                        viewBox: '0 0 20 20'
                      }, [
                        m('path', {
                          'fill-rule': 'evenodd',
                          d: 'M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z',
                          'clip-rule': 'evenodd'
                        })
                      ])
                ]),
                this.isLoading ? 'Memproses...' : 'Masuk'
              ])
            ])
          ])
        ])
      ])
    ]);
  },

  handleSubmit: function(e) {
    e.preventDefault();

    if (!this.username || !this.password || !this.selectedBudgetYear) {
      toast.error('Harap isi semua field');
      return;
    }

    // Set loading state
    this.isLoading = true;
    m.redraw(); // Force redraw to update loading state immediately

    // Make API call to authenticate
    this.authenticateWithAPI();
  },

  authenticateWithAPI: async function() {
    try {
      console.log('Attempting login for user:', this.username);

      // First check if API endpoint is available
      try {
        // Quick ping to see if server is running
        const pingResponse = await fetch('/api/auth/login', {
          method: 'OPTIONS'
        }).catch(() => {
          throw new Error('Server not running');
        });
      } catch (pingError) {
        toast.error('Backend server tidak berjalan. Jalankan server terlebih dahulu dengan perintah: npm start');
        this.isLoading = false;
        m.redraw();
        return;
      }

      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: this.username,
          password: this.password,
          budgetYear: this.selectedBudgetYear
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json();
      console.log('API Response:', { status: response.status, data });

      if (response.ok) {
        // Direct login successful (budget year is now provided in the request)
        const token = data.token;
        
        // Prepare user data with proper namaPerangkatDaerah extraction
        const userData = {
          username: data.user.username,
          email: data.user.email || data.user.namaLengkap,
          role: data.user.role,
          budgetYear: data.user.budgetYear,
        };

        // Store device data based on role and extract namaPerangkatDaerah
        if (data.user.role === 'operator') {
          userData.subPerangkatDaerahId = data.user.subPerangkatDaerahId;
          userData.subPerangkatDaerah = data.user.subPerangkatDaerah;
          if (data.user.subPerangkatDaerah?.nama) {
            userData.namaPerangkatDaerah = data.user.subPerangkatDaerah.nama;
          }
        } else if (data.user.role === 'admin') {
          // Admin users get perangkatDaerah data from the main device
          userData.perangkatDaerah = data.user.perangkatDaerah;
          if (data.user.perangkatDaerah?.nama) {
            userData.namaPerangkatDaerah = data.user.perangkatDaerah.nama;
          }
        }

        // Debug: Check what namaPerangkatDaerah will be stored
        console.log('Login.js - Final userData before storage:', userData);
        console.log('Login.js - Device data check:', {
          role: data.user.role,
          subPerangkatDaerah: data.user.subPerangkatDaerah,
          subPerangkatDaerahNama: data.user.subPerangkatDaerah?.nama,
          perangkatDaerah: data.user.perangkatDaerah,
          perangkatDaerahNama: data.user.perangkatDaerah?.nama
        });

        console.log('Login successful - User data:', userData);

        // Store authentication data
        JWTUtils.setAuthData(token, this.rememberMe, userData);

        // Show success message with role-based greeting
        const roleText = data.user.role === 'operator' ? 'Operator' :
                      data.user.role === 'vendor' ? 'Vendor' : 'Admin';
        
        // Clean up any existing overlays before showing success message
        toast.clear();
        
        toast.success(`Selamat datang, ${data.user.username}! (Role: ${roleText})`);

        // Reset form
        this.username = '';
        this.password = '';
        this.selectedBudgetYear = '';
        this.rememberMe = false;
        this.isLoading = false;
        m.redraw();

        // Add a small delay to ensure toast is shown before cleanup and navigation
        setTimeout(() => {
          // Enhanced cleanup of all possible overlays
          this.cleanupAllOverlays();
          
          // Redirect to dashboard based on role
          if (data.user.role === 'operator') {
            m.route.set('/operator-dashboard');
          } else if (data.user.role === 'vendor') {
            m.route.set('/vendor-layout');
          } else {
            m.route.set('/dashboard');
          }
        }, 500);
      } else {
        // Authentication failed
        toast.error(data.message || 'Username atau password salah');
        this.isLoading = false;
        m.redraw(); // Force re-render to update button state
      }
    } catch (error) {
      console.error('Login error:', error);

      if (error.name === 'AbortError') {
         toast.error('Server tidak merespons. Pastikan backend server sedang berjalan.');
       } else {
         toast.error('Terjadi kesalahan saat menghubungi server');
       }

      this.isLoading = false;
      m.redraw(); // Force re-render to update button state
      console.log('Loading state set to false, forcing redraw');
    }
  },

  /**
   * Comprehensive cleanup of all overlays/toasts before navigation
   */
  cleanupAllOverlays: function() {
    // Clear all toasts
    toast.clear();
    
    // Remove any lingering overlay elements that might have high z-index
    const overlaySelectors = [
      '.toast',
      '.toast-confirmation',
      '.toast-prompt',
      '[class*="toast"]',
      '[style*="z-index: 9999"]',
      '[style*="z-index: 9998"]',
      '[style*="z-index: 50"]',
      '[style*="position: fixed"]'
    ];
    
    overlaySelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (el && el.parentNode) {
            el.parentNode.removeChild(el);
            console.log('Removed overlay element:', selector);
          }
        });
      } catch (e) {
        // Ignore selector errors
      }
    });
    
    // Force remove any remaining fixed positioned elements with high z-index
    const allElements = document.querySelectorAll('*');
    allElements.forEach(el => {
      const computedStyle = window.getComputedStyle(el);
      const position = computedStyle.position;
      const zIndex = computedStyle.zIndex;
      
      if (position === 'fixed' && (parseInt(zIndex) >= 50 || zIndex === 'auto')) {
        // Check if it's likely an overlay (has high z-index or specific classes)
        if (zIndex === '9999' || zIndex === '9998' ||
            el.className.includes('toast') ||
            el.className.includes('modal') ||
            el.className.includes('overlay')) {
          if (el.parentNode) {
            el.parentNode.removeChild(el);
            console.log('Force removed persistent overlay element');
          }
        }
      }
    });
    
    console.log('All overlays and persistent elements cleaned up before navigation');
  },

};

export default Login;