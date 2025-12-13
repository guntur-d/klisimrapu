import m from 'mithril'
import { UserUtils, JWTUtils, APIUtils, ToastUtils } from '../js/utils.js'

const Profile = {
  oninit: function(vnode) {
    this.userData = UserUtils.getUserData()
    this.isEditing = false
    this.isLoading = false
    this.errors = {}
    
    // Form data for editing
    this.formData = {
      username: this.userData.username || '',
      email: this.userData.email || ''
    }
  },

  // Validation function
  validateForm: function() {
    this.errors = {}
    
    if (!this.formData.username || this.formData.username.trim().length === 0) {
      this.errors.username = 'Username harus diisi'
    } else if (this.formData.username.length < 3) {
      this.errors.username = 'Username minimal 3 karakter'
    }
    
    if (!this.formData.email || this.formData.email.trim().length === 0) {
      this.errors.email = 'Email harus diisi'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.formData.email)) {
      this.errors.email = 'Format email tidak valid'
    }
    
    return Object.keys(this.errors).length === 0
  },

  // Toggle edit mode
  toggleEdit: function() {
    if (this.isEditing) {
      // Reset form data when canceling edit
      this.formData = {
        username: this.userData.username || '',
        email: this.userData.email || ''
      }
      this.errors = {}
    } else {
      // Initialize form data when starting edit
      this.formData = {
        username: this.userData.username || '',
        email: this.userData.email || ''
      }
      this.errors = {}
    }
    this.isEditing = !this.isEditing
  },

  // Update field helper
  updateField: function(field, value) {
    this.formData[field] = value
    // Clear error when user starts typing
    if (this.errors[field]) {
      this.errors[field] = ''
      m.redraw()
    }
  },

  // Handle profile update following DEVELOPMENT_GUIDELINES.md standards
  handleUpdateProfile: async function() {
    // Validation
    if (!this.validateForm()) {
      ToastUtils.warning('Silakan perbaiki kesalahan dalam form')
      m.redraw()
      return
    }

    this.isLoading = true
    m.redraw()

    try {
      // Get user ID from token or user data
      const userId = this.userData.token ?
        JSON.parse(atob(this.userData.token.split('.')[1])).userId :
        null

      if (!userId) {
        ToastUtils.error('ID pengguna tidak ditemukan')
        return
      }

      // Use APIUtils.update() as required by DEVELOPMENT_GUIDELINES.md
      const updatedUser = await APIUtils.update('user', userId, {
        username: this.formData.username.trim(),
        email: this.formData.email.trim()
      })

      // Update local user data
      this.userData.username = this.formData.username.trim()
      this.userData.email = this.formData.email.trim()

      // Update auth data in storage
      const authData = JWTUtils.getAuthData()
      if (authData && authData.userData) {
        authData.userData.username = this.formData.username.trim()
        authData.userData.email = this.formData.email.trim()
        sessionStorage.setItem('authData', JSON.stringify(authData))
      }

      this.isEditing = false
      this.errors = {}
      
      // Success notification using ToastUtils as required
      ToastUtils.success('Profil berhasil diperbarui')
      
    } catch (error) {
      console.error('Error updating profile:', error)
      // APIUtils already handles error notifications
    } finally {
      this.isLoading = false
      m.redraw()
    }
  },

  view: function() {
    const user = this.userData
    
    return m('div', {
      class: 'max-w-4xl mx-auto'
    }, [
      // Page Header
      m('div', {
        class: 'mb-8'
      }, [
        m('div', {
          class: 'md:flex md:items-center md:justify-between'
        }, [
          m('div', {
            class: 'flex-1 min-w-0'
          }, [
            m('h2', {
              class: 'text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate'
            }, 'Profil Pengguna'),
            m('p', {
              class: 'mt-1 text-sm text-gray-500'
            }, 'Kelola informasi akun Anda')
          ]),
          m('div', {
            class: 'mt-4 flex md:mt-0 md:ml-4 space-x-3'
          }, [
            m('button', {
              class: 'inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200',
              onclick: () => m.route.set('/dashboard')
            }, [
              m('i', {
                class: 'text-lg mr-2 ri-arrow-left-line'
              }),
              'Tutup'
            ])
          ])
        ])
      ]),

      m('div', {
        class: 'space-y-6'
      }, [
        // Profile Information Card
        m('div', {
          class: 'bg-white shadow rounded-lg'
        }, [
          m('div', {
            class: 'px-4 py-5 sm:p-6'
          }, [
            m('div', {
              class: 'flex items-center justify-between mb-6'
            }, [
              m('h3', {
                class: 'text-lg leading-6 font-medium text-gray-900'
              }, 'Informasi Profil'),
              m('button', {
                class: `inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium ${
                  this.isEditing 
                    ? 'text-gray-700 bg-white hover:bg-gray-50 border-gray-300' 
                    : 'text-white bg-blue-600 hover:bg-blue-700'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`,
                onclick: () => this.toggleEdit()
              }, [
                m('i', {
                  class: `text-lg mr-2 ${this.isEditing ? 'ri-close-line' : 'ri-edit-line'}`
                }),
                this.isEditing ? 'Batal' : 'Edit Profil'
              ])
            ]),
            
            m('div', {
              class: 'grid grid-cols-1 gap-6 sm:grid-cols-2'
            }, [
              // Profile Avatar
              m('div', {
                class: 'sm:col-span-2'
              }, [
                m('div', {
                  class: 'flex items-center'
                }, [
                  m('div', {
                    class: 'h-20 w-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-medium mr-4'
                  }, user.username ? user.username.charAt(0).toUpperCase() : 'U'),
                  m('div', [
                    m('h4', {
                      class: 'text-xl font-medium text-gray-900'
                    }, user.username || 'Username'),
                    m('p', {
                      class: 'text-sm text-gray-500'
                    }, user.email || 'Email belum diisi')
                  ])
                ])
              ]),

              // Username
              m('div', [
                m('label', {
                  class: 'block text-sm font-medium text-gray-700'
                }, [
                  m('i', { class: 'ri-user-line mr-1 text-blue-500' }),
                  'Username'
                ]),
                this.isEditing ?
                  m('div', [
                    m('input', {
                      type: 'text',
                      class: `mt-1 block w-full border-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 transition-all duration-200 ${
                        this.errors.username
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50'
                          : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200 bg-gray-50 focus:bg-white'
                      }`,
                      value: this.formData.username,
                      oninput: (e) => this.updateField('username', e.target.value),
                      placeholder: 'Masukkan username...',
                      disabled: this.isLoading
                    }),
                    this.errors.username && m('p', {
                      class: 'mt-2 text-sm text-red-600 flex items-center'
                    }, [
                      m('i', { class: 'ri-error-warning-line mr-1' }),
                      this.errors.username
                    ])
                  ]) :
                  m('p', { class: 'mt-1 text-sm text-gray-900' }, user.username || '-')
              ]),

              // Email
              m('div', [
                m('label', {
                  class: 'block text-sm font-medium text-gray-700'
                }, [
                  m('i', { class: 'ri-mail-line mr-1 text-blue-500' }),
                  'Email'
                ]),
                this.isEditing ?
                  m('div', [
                    m('input', {
                      type: 'email',
                      class: `mt-1 block w-full border-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 transition-all duration-200 ${
                        this.errors.email
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50'
                          : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200 bg-gray-50 focus:bg-white'
                      }`,
                      value: this.formData.email,
                      oninput: (e) => this.updateField('email', e.target.value),
                      placeholder: 'Masukkan email...',
                      disabled: this.isLoading
                    }),
                    this.errors.email && m('p', {
                      class: 'mt-2 text-sm text-red-600 flex items-center'
                    }, [
                      m('i', { class: 'ri-error-warning-line mr-1' }),
                      this.errors.email
                    ])
                  ]) :
                  m('p', {
                    class: 'mt-1 text-sm text-gray-900'
                  }, user.email || '-')
              ]),

              // Role
              m('div', [
                m('label', {
                  class: 'block text-sm font-medium text-gray-700'
                }, 'Role'),
                m('p', {
                  class: 'mt-1 text-sm text-gray-900 capitalize'
                }, user.role || '-')
              ]),

              // Budget Year
              m('div', [
                m('label', {
                  class: 'block text-sm font-medium text-gray-700'
                }, 'Tahun Anggaran'),
                m('p', {
                  class: 'mt-1 text-sm text-gray-900'
                }, typeof user.budgetYear === 'object' && user.budgetYear.year ?
                  `${user.budgetYear.year} (${user.budgetYear.status || 'Murni'})` :
                  (user.budgetYear || '-'))
              ]),

              // Organisasi
              user.namaPerangkatDaerah ? m('div', {
                class: 'sm:col-span-2'
              }, [
                m('label', {
                  class: 'block text-sm font-medium text-gray-700'
                }, 'Organisasi'),
                m('p', {
                  class: 'mt-1 text-sm text-gray-900'
                }, user.namaPerangkatDaerah)
              ]) : null
            ]),

            // Save Button with loading states following DEVELOPMENT_GUIDELINES.md
            this.isEditing ? m('div', {
              class: 'mt-6 flex justify-end space-x-3 border-t border-gray-200 pt-6'
            }, [
              m('button', {
                type: 'button',
                class: 'px-6 py-3 bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-gray-400 rounded-lg text-gray-700 font-medium transition-all duration-200 flex items-center space-x-2',
                onclick: () => this.toggleEdit(),
                disabled: this.isLoading
              }, [
                m('i', { class: 'ri-close-line' }),
                m('span', 'Batal')
              ]),
              m('button', {
                type: 'button',
                class: 'px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed',
                onclick: () => this.handleUpdateProfile(),
                disabled: this.isLoading
              }, [
                this.isLoading ?
                  m('i', { class: 'ri-loader-4-line animate-spin' }) :
                  m('i', { class: 'ri-save-line' }),
                m('span', this.isLoading ? 'Menyimpan...' : 'Simpan Perubahan')
              ])
            ]) : null
          ])
        ]),

        // Security Section
        m('div', {
          class: 'bg-white shadow rounded-lg'
        }, [
          m('div', {
            class: 'px-4 py-5 sm:p-6'
          }, [
            m('h3', {
              class: 'text-lg leading-6 font-medium text-gray-900 mb-4'
            }, 'Keamanan'),

            m('p', {
              class: 'text-sm text-gray-500 mb-4'
            }, 'Fitur ubah password akan tersedia soon. Hubungi administrator jika Anda perlu mengubah password.'),

            m('div', {
              class: 'bg-blue-50 border border-blue-200 rounded-md p-4'
            }, [
              m('div', {
                class: 'flex'
              }, [
                m('div', {
                  class: 'flex-shrink-0'
                }, [
                  m('i', {
                    class: 'ri-information-line text-blue-400 text-lg'
                  })
                ]),
                m('div', {
                  class: 'ml-3'
                }, [
                  m('h3', {
                    class: 'text-sm font-medium text-blue-800'
                  }, 'Informasi Keamanan'),
                  m('div', {
                    class: 'mt-2 text-sm text-blue-700'
                  }, [
                    m('p', 'Untuk keamanan akun Anda, pastikan untuk:'),
                    m('ul', {
                      class: 'list-disc list-inside mt-2 space-y-1'
                    }, [
                      m('li', 'Gunakan password yang kuat dan unik'),
                      m('li', 'Jangan bagikan informasi login kepada orang lain'),
                      m('li', 'Logout setelah selesai menggunakan sistem')
                    ])
                  ])
                ])
              ])
            ])
          ])
        ]),

        // System Information
        m('div', {
          class: 'bg-white shadow rounded-lg'
        }, [
          m('div', {
            class: 'px-4 py-5 sm:p-6'
          }, [
            m('h3', {
              class: 'text-lg leading-6 font-medium text-gray-900 mb-4'
            }, 'Informasi Sistem'),

            m('div', {
              class: 'grid grid-cols-1 gap-4 sm:grid-cols-2'
            }, [
              m('div', [
                m('label', {
                  class: 'block text-sm font-medium text-gray-700'
                }, 'Status Autentikasi'),
                m('div', {
                  class: 'mt-1 flex items-center'
                }, [
                  m('div', {
                    class: 'h-2 w-2 bg-green-400 rounded-full mr-2'
                  }),
                  m('p', {
                    class: 'text-sm text-gray-900'
                  }, 'Terhubung')
                ])
              ]),

              m('div', [
                m('label', {
                  class: 'block text-sm font-medium text-gray-700'
                }, 'Sesi'),
                m('p', {
                  class: 'mt-1 text-sm text-gray-900'
                }, 'Aktif')
              ]),

              m('div', [
                m('label', {
                  class: 'block text-sm font-medium text-gray-700'
                }, 'Waktu Login'),
                m('p', {
                  class: 'mt-1 text-sm text-gray-900'
                }, new Date().toLocaleString('id-ID'))
              ]),

              m('div', [
                m('label', {
                  class: 'block text-sm font-medium text-gray-700'
                }, 'Perangkat'),
                m('p', {
                  class: 'mt-1 text-sm text-gray-900'
                }, navigator.platform || 'Unknown')
              ])
            ])
          ])
        ])
      ])
    ])
  }
}

export default Profile