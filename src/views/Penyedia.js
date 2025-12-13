import m from 'mithril'
import { JWTUtils, UserUtils, APIUtils } from '../js/utils.js'
import toast, { showConfirmation } from '../js/toaster.js'

const Penyedia = {
  // State management
  isLoading: false,
  penyediaList: [],
  filteredPenyedia: [],

  // Modal states
  showModal: false,
  modalMode: 'create', // 'create' or 'edit'
  isModalLoading: false,

  // Vendor user management states
  showVendorUserModal: false,
  isEditingVendorUser: false,
  vendorUserFormData: {
    namaLengkap: '',
    username: '',
    password: '',
    passwordDisplay: ''
  },
  editingVendorUserIndex: null,
  currentPenyediaId: null,
  showPassword: false,

  // Form data
  formData: {
    _id: null,
    NamaVendor: '',
    NamaPimpinan: '',
    Alamat: '',
    Email: '',
    Telepon: '',
    Website: '',
    operators: []
  },

  // Search and filter
  searchQuery: '',

  errors: {},

  oninit: function() {
    this.loadPenyedia()
    
    // Initialize vendor user management states
    this.showVendorUserModal = false
    this.isEditingVendorUser = false
    this.vendorUserFormData = {
      namaLengkap: '',
      username: '',
      password: '',
      passwordDisplay: ''
    }
    this.editingVendorUserIndex = null
    this.currentPenyediaId = null
    this.showPassword = false
  },

  // Load all penyedia
  loadPenyedia: async function() {
    this.isLoading = true
    try {
      const response = await APIUtils.getAll('penyedia')
      this.penyediaList = response.data
      this.filteredPenyedia = response.data
      this.searchQuery = ''
    } catch (error) {
      console.error('Error loading penyedia:', error)
      toast.error('Gagal memuat data penyedia')
    } finally {
      this.isLoading = false
      m.redraw()
    }
  },

  // Handle search
  handleSearch: function() {
    if (!this.searchQuery) {
      this.filteredPenyedia = this.penyediaList
      return
    }

    const query = this.searchQuery.toLowerCase()
    this.filteredPenyedia = this.penyediaList.filter(penyedia =>
      penyedia.NamaVendor.toLowerCase().includes(query) ||
      penyedia.NamaPimpinan.toLowerCase().includes(query) ||
      penyedia.Alamat.toLowerCase().includes(query) ||
      penyedia.Email.toLowerCase().includes(query) ||
      penyedia.Telepon.toLowerCase().includes(query)
    )
  },

  // Open modal for create
  openCreateModal: function() {
    this.modalMode = 'create'
    this.formData = {
      _id: null,
      NamaVendor: '',
      NamaPimpinan: '',
      Alamat: '',
      Email: '',
      Telepon: '',
      Website: '',
      operators: []
    }
    this.errors = {}
    this.showModal = true
  },

  // Open modal for edit
  openEditModal: function(penyedia) {
    this.modalMode = 'edit'
    this.formData = {
      ...penyedia,
      operators: penyedia.operators || []
    }
    this.errors = {}
    this.showModal = true
  },

  // Close modal
  closeModal: function() {
    this.showModal = false
    this.errors = {}
    // Close vendor user modal if open
    this.closeVendorUserModal()
  },

  // Vendor user management methods
  openVendorUserModal: function(penyediaId, editingIndex = null) {
    this.currentPenyediaId = penyediaId

    if (editingIndex !== null) {
      // Edit mode - get fresh data
      this.isEditingVendorUser = true
      const penyedia = this.penyediaList.find(p => p._id === penyediaId)
      if (penyedia && penyedia.operators && penyedia.operators[editingIndex]) {
        const vendorUser = penyedia.operators[editingIndex]
        // Check if passwordDisplay is hashed (bcrypt hash starts with $2a$)
        const isPasswordDisplayHashed = vendorUser.passwordDisplay && vendorUser.passwordDisplay.startsWith('$2a$')
        this.vendorUserFormData = {
          _id: vendorUser._id,
          namaLengkap: vendorUser.namaLengkap,
          username: vendorUser.username,
          password: isPasswordDisplayHashed ? '' : (vendorUser.passwordDisplay || vendorUser.password),
          passwordDisplay: vendorUser.passwordDisplay || vendorUser.password
        }
        this.editingVendorUserIndex = editingIndex
      }
    } else {
      // Create mode
      this.isEditingVendorUser = false
      this.vendorUserFormData = {
        namaLengkap: '',
        username: '',
        password: '',
        passwordDisplay: ''
      }
      this.editingVendorUserIndex = null
    }
    this.showVendorUserModal = true
    // Force redraw to ensure modal shows updated data
    m.redraw()
  },

  closeVendorUserModal: function() {
    this.showVendorUserModal = false
    this.vendorUserFormData = {
      namaLengkap: '',
      username: '',
      password: '',
      passwordDisplay: ''
    }
    this.editingVendorUserIndex = null
    this.isEditingVendorUser = false
    this.currentPenyediaId = null
  },

  validateVendorUserForm: function() {
    const errors = {}

    if (!this.vendorUserFormData.namaLengkap || !this.vendorUserFormData.namaLengkap.trim()) {
      errors.namaLengkap = 'Nama lengkap harus diisi'
    }

    if (!this.vendorUserFormData.username || !this.vendorUserFormData.username.trim()) {
      errors.username = 'Username harus diisi'
    }

    if (!this.isEditingVendorUser && (!this.vendorUserFormData.password || !this.vendorUserFormData.password.trim())) {
      errors.password = 'Password harus diisi'
    } else if (this.isEditingVendorUser && (!this.vendorUserFormData.password || !this.vendorUserFormData.password.trim()) && this.vendorUserFormData.passwordDisplay && this.vendorUserFormData.passwordDisplay.startsWith('$2a$')) {
      errors.password = 'Password harus diisi karena data password saat ini tidak valid'
    } else if (this.vendorUserFormData.password && this.vendorUserFormData.password.length < 6) {
      errors.password = 'Password minimal 6 karakter'
    }

    return errors
  },

  saveVendorUser: async function() {
    console.log('Saving vendor user with data:', this.vendorUserFormData)

    const errors = this.validateVendorUserForm()
    console.log('Validation errors:', errors)

    if (Object.keys(errors).length > 0) {
      // Show the first validation error message
      const firstError = Object.values(errors)[0]
      toast.error(firstError)
      m.redraw()
      return
    }

    try {
      // Find the current penyedia
      const penyedia = this.penyediaList.find(p => p._id === this.currentPenyediaId)
      if (!penyedia) {
        toast.error('Penyedia tidak ditemukan')
        return
      }

      console.log('Found penyedia:', penyedia)

      // Update vendor users array
      let updatedVendorUsers = [...(penyedia.operators || [])]

      if (this.isEditingVendorUser && this.editingVendorUserIndex !== null) {
        // Update existing vendor user
        console.log('Updating existing vendor user at index:', this.editingVendorUserIndex)
        const updateData = {
          _id: this.vendorUserFormData._id,
          namaLengkap: this.vendorUserFormData.namaLengkap,
          username: this.vendorUserFormData.username,
          passwordDisplay: this.vendorUserFormData.passwordDisplay || this.vendorUserFormData.password
        }
        if (this.vendorUserFormData.password && this.vendorUserFormData.password.trim()) {
          updateData.password = this.vendorUserFormData.password
        }
        updatedVendorUsers[this.editingVendorUserIndex] = updateData
      } else {
        // Add new vendor user
        console.log('Adding new vendor user')
        updatedVendorUsers.push({
          namaLengkap: this.vendorUserFormData.namaLengkap,
          username: this.vendorUserFormData.username,
          password: this.vendorUserFormData.password,
          passwordDisplay: this.vendorUserFormData.passwordDisplay || this.vendorUserFormData.password
        })
      }

      console.log('Updated vendor users array:', updatedVendorUsers)

      // Update penyedia with new vendor users array
      const penyediaData = {
        NamaVendor: penyedia.NamaVendor,
        NamaPimpinan: penyedia.NamaPimpinan,
        Alamat: penyedia.Alamat,
        Email: penyedia.Email,
        Telepon: penyedia.Telepon,
        Website: penyedia.Website || '',
        operators: updatedVendorUsers
      }

      console.log('Sending penyedia data:', penyediaData)

      // Update existing penyedia
      console.log('Updating penyedia with new vendor user:', this.currentPenyediaId)
      await APIUtils.update('penyedia', this.currentPenyediaId, penyediaData)
      toast.success(this.isEditingVendorUser ? 'Vendor user berhasil diperbarui' : 'Vendor user berhasil ditambahkan')

      this.closeVendorUserModal()
      await this.loadPenyedia()

      // If we just added/edited a vendor user, refresh the modal data
      if (this.showModal && this.modalMode === 'edit') {
        const updatedPenyedia = this.penyediaList.find(p => p._id === this.currentPenyediaId)
        if (updatedPenyedia) {
          this.formData = {
            ...updatedPenyedia,
            operators: [...updatedPenyedia.operators] || []
          }
        }
        // Force a redraw to update the modal
        m.redraw()
      }
    } catch (error) {
      console.error('Error saving vendor user:', error)
      toast.error(`Gagal menyimpan vendor user: ${error.message}`)
    }
  },

  deleteVendorUser: async function(penyediaId, vendorUserIndex) {
    toast.confirm(
      'Apakah Anda yakin ingin menghapus vendor user ini?',
      async () => {
        try {
          // Find the current penyedia
          const penyedia = this.penyediaList.find(p => p._id === penyediaId)
          if (!penyedia) {
            toast.error('Penyedia tidak ditemukan')
            return
          }

          // Remove vendor user from array
          const updatedVendorUsers = (penyedia.operators || []).filter((_, index) => index !== vendorUserIndex)

          // Update penyedia
          const penyediaData = {
            NamaVendor: penyedia.NamaVendor,
            NamaPimpinan: penyedia.NamaPimpinan,
            Alamat: penyedia.Alamat,
            Email: penyedia.Email,
            Telepon: penyedia.Telepon,
            Website: penyedia.Website || '',
            operators: updatedVendorUsers
          }

          await APIUtils.update('penyedia', penyediaId, penyediaData)
          toast.success('Vendor user berhasil dihapus')
          await this.loadPenyedia()

          // Refresh modal data if it's currently open
          if (this.showModal && this.modalMode === 'edit') {
            const updatedPenyedia = this.penyediaList.find(p => p._id === penyediaId)
            if (updatedPenyedia) {
              this.formData = {
                ...updatedPenyedia,
                operators: [...updatedPenyedia.operators] || []
              }
            }
            m.redraw()
          }
        } catch (error) {
          console.error('Error deleting vendor user:', error)
          toast.error('Gagal menghapus vendor user')
        }
      }
    )
  },

  // Validate form
  validateForm: function() {
    this.errors = {}
    
    if (!this.formData.NamaVendor) {
      this.errors.NamaVendor = 'Nama vendor harus diisi'
    }
    
    if (!this.formData.NamaPimpinan) {
      this.errors.NamaPimpinan = 'Nama pimpinan harus diisi'
    }
    
    if (!this.formData.Alamat) {
      this.errors.Alamat = 'Alamat harus diisi'
    }
    
    if (!this.formData.Email) {
      this.errors.Email = 'Email harus diisi'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.formData.Email)) {
      this.errors.Email = 'Format email tidak valid'
    }
    
    if (!this.formData.Telepon) {
      this.errors.Telepon = 'Telepon harus diisi'
    }

    return Object.keys(this.errors).length === 0
  },

  // Save penyedia (create or update)
  savePenyedia: async function() {
    if (!this.validateForm()) {
      toast.error('Periksa kembali data yang diisi')
      return
    }

    this.isModalLoading = true
    try {
      if (this.modalMode === 'create') {
        // Create new penyedia using APIUtils
        await APIUtils.create('penyedia', this.formData)
        this.closeModal()
        this.loadPenyedia()
      } else {
        // Update existing penyedia using APIUtils
        await APIUtils.update('penyedia', this.formData._id, this.formData)
        this.closeModal()
        this.loadPenyedia()
      }
    } catch (error) {
      console.error('Error saving penyedia:', error)
      // APIUtils already handles toast notifications for errors
      // But we can add additional error handling if needed
    } finally {
      this.isModalLoading = false
      m.redraw()
    }
  },

  // Delete penyedia
  deletePenyedia: async function(penyedia) {
    try {
      await APIUtils.delete('penyedia', penyedia._id, penyedia.NamaVendor)
      this.loadPenyedia()
    } catch (error) {
      console.error('Error deleting penyedia:', error)
      // APIUtils already handles error toasts, but we need to manage loading state
      this.isLoading = false
      m.redraw()
    }
  },

  view: function() {
    return m('div', {
      class: 'max-w-7xl mx-auto'
    }, [
      // Header with title and add button
      m('div', {
        class: 'flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4'
      }, [
        m('div', [
          m('h1', {
            class: 'text-2xl font-bold text-gray-900'
          }, 'Penyedia Barang/Jasa'),
          m('p', {
            class: 'text-gray-600 mt-1'
          }, 'Kelola data penyedia barang/jasa')
        ]),
        m('button', {
          class: 'bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2 transition-colors',
          onclick: () => this.openCreateModal()
        }, [
          m('i', {
            class: 'ri-add-line'
          }),
          'Tambah Penyedia'
        ])
      ]),

      // Search bar
      m('div', {
        class: 'mb-6'
      }, [
        m('div', {
          class: 'relative'
        }, [
          m('input', {
            type: 'text',
            placeholder: 'Cari penyedia...',
            class: 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            value: this.searchQuery,
            oninput: (e) => {
              this.searchQuery = e.target.value
              this.handleSearch()
            }
          }),
          m('i', {
            class: 'ri-search-line absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400'
          })
        ])
      ]),

      // Loading indicator
      this.isLoading && !this.showModal ? 
        m('div', {
          class: 'flex justify-center items-center py-12'
        }, [
          m('div', {
            class: 'animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500'
          })
        ]) : 

      // Penyedia table
      m('div', {
        class: 'bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden'
      }, [
        m('div', {
          class: 'overflow-x-auto'
        }, [
          m('table', {
            class: 'min-w-full divide-y divide-gray-200'
          }, [
            m('thead', {
              class: 'bg-gray-50'
            }, [
              m('tr', [
                m('th', {
                  class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                }, 'Nama Vendor'),
                m('th', {
                  class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                }, 'Nama Pimpinan'),
                m('th', {
                  class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                }, 'Alamat'),
                m('th', {
                  class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                }, 'Email'),
                m('th', {
                  class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                }, 'Telepon'),
                m('th', {
                  class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                }, 'Vendor Users'),
                m('th', {
                  class: 'px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'
                }, 'Aksi')
              ])
            ]),
            m('tbody', {
              class: 'bg-white divide-y divide-gray-200'
            }, [
              this.filteredPenyedia.length === 0 ?
                m('tr', [
                  m('td', {
                    class: 'px-6 py-4 text-center text-gray-500',
                    colspan: 7
                  }, 'Tidak ada data penyedia')
                ]) :
                this.filteredPenyedia.map((penyedia) =>
                  m('tr', {
                    class: 'hover:bg-gray-50'
                  }, [
                    m('td', {
                      class: 'px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'
                    }, penyedia.NamaVendor),
                    m('td', {
                      class: 'px-6 py-4 whitespace-nowrap text-sm text-gray-500'
                    }, penyedia.NamaPimpinan),
                    m('td', {
                      class: 'px-6 py-4 text-sm text-gray-500 max-w-xs truncate'
                    }, penyedia.Alamat),
                    m('td', {
                      class: 'px-6 py-4 whitespace-nowrap text-sm text-gray-500'
                    }, penyedia.Email),
                    m('td', {
                      class: 'px-6 py-4 whitespace-nowrap text-sm text-gray-500'
                    }, penyedia.Telepon),
                    // Vendor Users column
                    m('td', {
                      class: 'px-6 py-4 whitespace-nowrap text-sm text-gray-500'
                    }, [
                      penyedia.operators && penyedia.operators.length > 0 && m('span', {
                        class: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-2'
                      }, `${penyedia.operators.length} users`),
                      m('button', {
                        class: 'text-purple-600 hover:text-purple-900 text-sm',
                        onclick: () => this.openVendorUserModal(penyedia._id),
                        title: 'Kelola Vendor User'
                      }, [
                        m('i', {
                          class: 'ri-user-settings-line mr-1'
                        }),
                        'Kelola'
                      ])
                    ]),
                    m('td', {
                      class: 'px-6 py-4 whitespace-nowrap text-right text-sm font-medium'
                    }, [
                      m('button', {
                        class: 'text-blue-600 hover:text-blue-900 mr-3',
                        onclick: () => this.openEditModal(penyedia)
                      }, [
                        m('i', {
                          class: 'ri-edit-line'
                        })
                      ]),
                      m('button', {
                        class: 'text-red-600 hover:text-red-900',
                        onclick: () => this.deletePenyedia(penyedia)
                      }, [
                        m('i', {
                          class: 'ri-delete-bin-line'
                        })
                      ])
                    ])
                  ])
                )
            ])
          ])
        ])
      ]),

      // Modal for create/edit
      this.showModal && m('div', {
        class: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'
      }, [
        m('div', {
          class: 'bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto'
        }, [
          // Modal header
          m('div', {
            class: 'bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-xl'
          }, [
            m('div', {
              class: 'flex items-center justify-between'
            }, [
              m('div', {
                class: 'flex items-center space-x-3'
              }, [
                m('div', {
                  class: 'w-10 h-10 bg-white bg-opacity-75 rounded-full flex items-center justify-center'
                }, [
                  m('i', {
                    class: this.modalMode === 'create' ? 'ri-add-line text-xl text-blue-600' : 'ri-edit-line text-xl text-blue-600'
                  })
                ]),
                m('div', [
                  m('h3', {
                    class: 'text-xl font-bold'
                  }, this.modalMode === 'create' ? 'Tambah Penyedia' : 'Edit Penyedia'),
                  m('p', {
                    class: 'text-white text-opacity-80 text-sm'
                  }, this.modalMode === 'create' ? 'Tambah data penyedia baru' : 'Edit data penyedia')
                ])
              ]),
              m('button', {
                class: 'w-8 h-8 bg-blue-600 bg-opacity-25 rounded-full flex items-center justify-center',
                onclick: () => this.closeModal()
              }, [
                m('i', {
                  class: 'ri-close-fill'
                })
              ])
            ])
          ]),

          // Modal body
          m('div', {
            class: 'p-6'
          }, [
            m('div', {
              class: 'space-y-4'
            }, [
              // Nama Vendor
              m('div', [
                m('label', {
                  class: 'block text-sm font-semibold text-gray-800 mb-2'
                }, [
                  m('i', {
                    class: 'ri-building-line mr-1 text-blue-500'
                  }),
                  'Nama Vendor'
                ]),
                m('input', {
                  type: 'text',
                  class: `w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${
                    this.errors.NamaVendor 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50' 
                      : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200 bg-gray-50 focus:bg-white'
                  }`,
                  placeholder: 'Masukkan nama vendor',
                  value: this.formData.NamaVendor,
                  oninput: (e) => {
                    this.formData.NamaVendor = e.target.value
                    if (this.errors.NamaVendor) delete this.errors.NamaVendor
                  }
                }),
                this.errors.NamaVendor && m('p', {
                  class: 'mt-2 text-sm text-red-600'
                }, this.errors.NamaVendor)
              ]),

              // Nama Pimpinan
              m('div', [
                m('label', {
                  class: 'block text-sm font-semibold text-gray-800 mb-2'
                }, [
                  m('i', {
                    class: 'ri-user-line mr-1 text-green-500'
                  }),
                  'Nama Pimpinan'
                ]),
                m('input', {
                  type: 'text',
                  class: `w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${
                    this.errors.NamaPimpinan 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50' 
                      : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200 bg-gray-50 focus:bg-white'
                  }`,
                  placeholder: 'Masukkan nama pimpinan',
                  value: this.formData.NamaPimpinan,
                  oninput: (e) => {
                    this.formData.NamaPimpinan = e.target.value
                    if (this.errors.NamaPimpinan) delete this.errors.NamaPimpinan
                  }
                }),
                this.errors.NamaPimpinan && m('p', {
                  class: 'mt-2 text-sm text-red-600'
                }, this.errors.NamaPimpinan)
              ]),

              // Alamat
              m('div', [
                m('label', {
                  class: 'block text-sm font-semibold text-gray-800 mb-2'
                }, [
                  m('i', {
                    class: 'ri-map-pin-line mr-1 text-amber-500'
                  }),
                  'Alamat'
                ]),
                m('textarea', {
                  class: `w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${
                    this.errors.Alamat 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50' 
                      : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200 bg-gray-50 focus:bg-white'
                  }`,
                  placeholder: 'Masukkan alamat',
                  rows: 3,
                  value: this.formData.Alamat,
                  oninput: (e) => {
                    this.formData.Alamat = e.target.value
                    if (this.errors.Alamat) delete this.errors.Alamat
                  }
                }),
                this.errors.Alamat && m('p', {
                  class: 'mt-2 text-sm text-red-600'
                }, this.errors.Alamat)
              ]),

              // Email
              m('div', [
                m('label', {
                  class: 'block text-sm font-semibold text-gray-800 mb-2'
                }, [
                  m('i', {
                    class: 'ri-mail-line mr-1 text-blue-500'
                  }),
                  'Email'
                ]),
                m('input', {
                  type: 'email',
                  class: `w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${
                    this.errors.Email 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50' 
                      : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200 bg-gray-50 focus:bg-white'
                  }`,
                  placeholder: 'Masukkan email',
                  value: this.formData.Email,
                  oninput: (e) => {
                    this.formData.Email = e.target.value
                    if (this.errors.Email) delete this.errors.Email
                  }
                }),
                this.errors.Email && m('p', {
                  class: 'mt-2 text-sm text-red-600'
                }, this.errors.Email)
              ]),

              // Telepon
              m('div', [
                m('label', {
                  class: 'block text-sm font-semibold text-gray-800 mb-2'
                }, [
                  m('i', {
                    class: 'ri-phone-line mr-1 text-green-500'
                  }),
                  'Telepon'
                ]),
                m('input', {
                  type: 'text',
                  class: `w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${
                    this.errors.Telepon
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50'
                      : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200 bg-gray-50 focus:bg-white'
                  }`,
                  placeholder: 'Masukkan nomor telepon',
                  value: this.formData.Telepon,
                  oninput: (e) => {
                    this.formData.Telepon = e.target.value
                    if (this.errors.Telepon) delete this.errors.Telepon
                  }
                }),
                this.errors.Telepon && m('p', {
                  class: 'mt-2 text-sm text-red-600'
                }, this.errors.Telepon)
              ]),

              // Website
              m('div', [
                m('label', {
                  class: 'block text-sm font-semibold text-gray-800 mb-2'
                }, [
                  m('i', {
                    class: 'ri-global-line mr-1 text-teal-500'
                  }),
                  'Website'
                ]),
                m('input', {
                  type: 'text',
                  class: `w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${
                    this.errors.Website
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50'
                      : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200 bg-gray-50 focus:bg-white'
                  }`,
                  placeholder: 'https://www.contoh.com',
                  value: this.formData.Website || '',
                  oninput: (e) => {
                    this.formData.Website = e.target.value
                    if (this.errors.Website) delete this.errors.Website
                  }
                }),
                this.errors.Website && m('p', {
                  class: 'mt-2 text-sm text-red-600'
                }, this.errors.Website)
              ]),

              // Vendor Users section (only show in edit mode)
              this.modalMode === 'edit' && m('div', {
                class: 'border-t border-gray-200 pt-6'
              }, [
                m('div', {
                  class: 'flex justify-between items-center mb-4'
                }, [
                  m('div', [
                    m('h4', {
                      class: 'text-lg font-semibold text-gray-800 flex items-center'
                    }, [
                      m('i', {
                        class: 'ri-user-settings-line mr-2 text-purple-500'
                      }),
                      'Vendor Users'
                    ]),
                    m('p', {
                      class: 'text-sm text-gray-600 mt-1'
                    }, 'Kelola akun vendor users untuk penyedia')
                  ]),
                  m('button', {
                    class: 'inline-flex items-center px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white text-sm font-medium rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl',
                    onclick: () => {
                      this.openVendorUserModal(this.formData._id)
                    }
                  }, [
                    m('i', {
                      class: 'ri-add-line mr-2'
                    }),
                    'Tambah Vendor User'
                  ])
                ]),

                // Current vendor users list
                this.formData.operators && this.formData.operators.length > 0 ?
                  m('div', {
                    class: 'space-y-2 mb-4'
                  }, [
                    m('p', {
                      class: 'text-sm font-medium text-gray-700 mb-2'
                    }, 'Vendor Users saat ini:'),
                    this.formData.operators.map((vendorUser, index) =>
                      m('div', {
                        class: 'bg-purple-50 rounded-lg p-3 border border-purple-200 flex justify-between items-center'
                      }, [
                        m('div', {
                          class: 'flex-1'
                        }, [
                          m('p', {
                            class: 'font-medium text-gray-900'
                          }, vendorUser.namaLengkap),
                          m('p', {
                            class: 'text-sm text-gray-600'
                          }, `Username: ${vendorUser.username}`)
                        ]),
                        m('div', {
                          class: 'flex space-x-2'
                        }, [
                          m('button', {
                            class: 'p-1.5 text-purple-600 hover:bg-purple-100 rounded transition-colors duration-200',
                            onclick: () => this.openVendorUserModal(this.formData._id, index),
                            title: 'Edit Vendor User'
                          }, [
                            m('i', {
                              class: 'ri-edit-line text-sm'
                            })
                          ]),
                          m('button', {
                            class: 'p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors duration-200',
                            onclick: () => this.deleteVendorUser(this.formData._id, index),
                            title: 'Hapus Vendor User'
                          }, [
                            m('i', {
                              class: 'ri-delete-bin-line text-sm'
                            })
                          ])
                        ])
                      ])
                    )
                  ]) :
                  m('div', {
                    class: 'text-center py-4 text-gray-500 text-sm'
                  }, [
                    m('i', {
                      class: 'ri-user-line text-lg mb-1 block'
                    }),
                    'Belum ada vendor user'
                  ])
              ])
            ])
          ]),

          // Modal footer
          m('div', {
            class: 'flex justify-end gap-3 pt-6 border-t border-gray-200 bg-gray-50 px-6 py-4 rounded-b-xl'
          }, [
            m('button', {
              class: 'px-6 py-3 bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-gray-400 rounded-lg text-gray-700 font-medium transition-all duration-200 flex items-center space-x-2',
              onclick: () => this.closeModal()
            }, [
              m('i', {
                class: 'ri-close-fill'
              }),
              m('span', 'Batal')
            ]),
            m('button', {
              class: `px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 ${
                this.isModalLoading ? 'opacity-75 cursor-not-allowed' : 'hover:from-blue-600 hover:to-purple-700'
              }`,
              onclick: () => this.savePenyedia(),
              disabled: this.isModalLoading
            }, [
              this.isModalLoading ? 
                m('i', {
                  class: 'ri-loader-4-line animate-spin'
                }) : 
                m('i', {
                  class: this.modalMode === 'create' ? 'ri-save-line' : 'ri-edit-line'
                }),
              m('span', this.isModalLoading ? 'Menyimpan...' : (this.modalMode === 'create' ? 'Simpan' : 'Update'))
            ])
          ])
        ])
      ]),

      // Vendor user modal
      this.showVendorUserModal && m('div', {
        class: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4',
        onclick: (e) => {
          if (e.target === e.currentTarget) this.closeVendorUserModal()
        }
      }, [
        m('div', {
          class: 'bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all'
        }, [
          // Modal Header
          m('div', {
            class: 'bg-gradient-to-r from-purple-500 to-pink-600 text-white p-6 rounded-t-xl'
          }, [
            m('div', {
              class: 'flex items-center justify-between'
            }, [
              m('div', {
                class: 'flex items-center space-x-3'
              }, [
                m('div', {
                  class: 'w-8 h-8 bg-blue-600 bg-opacity-25 rounded-full flex items-center justify-center'
                }, [
                  m('i', {
                    class: `ri-${this.isEditingVendorUser ? 'edit' : 'add'}-line text-xl text-white`
                  })
                ]),
                m('div', [
                  m('h3', {
                    class: 'text-xl font-bold'
                  }, this.isEditingVendorUser ? 'Edit Vendor User' : 'Tambah Vendor User'),
                  m('p', {
                    class: 'text-white text-opacity-80 text-sm'
                  }, 'Kelola akun vendor user')
                ])
              ]),
              m('button', {
                class: 'w-8 h-8 bg-blue-600 bg-opacity-25 rounded-full flex items-center justify-center',
                onclick: () => this.closeVendorUserModal()
              }, [
                m('i', {
                  class: 'ri-close-fill'
                })
              ])
            ])
          ]),

          // Modal Body
          m('div', {
            class: 'p-6'
          }, [
            m('div', {
              class: 'space-y-6'
            }, [
              // Nama Lengkap field
              m('div', [
                m('label', {
                  class: 'block text-sm font-semibold text-gray-800 mb-2'
                }, [
                  m('i', {
                    class: 'ri-user-line mr-1 text-blue-500'
                  }),
                  'Nama Lengkap'
                ]),
                m('input', {
                  type: 'text',
                  class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                  placeholder: 'Nama lengkap vendor user',
                  value: this.vendorUserFormData.namaLengkap,
                  oninput: (e) => {
                    this.vendorUserFormData.namaLengkap = e.target.value
                  }
                })
              ]),

              // Username field
              m('div', [
                m('label', {
                  class: 'block text-sm font-semibold text-gray-800 mb-2'
                }, [
                  m('i', {
                    class: 'ri-user-settings-line mr-1 text-green-500'
                  }),
                  'Username'
                ]),
                m('input', {
                  type: 'text',
                  class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                  placeholder: 'Username untuk login',
                  value: this.vendorUserFormData.username,
                  oninput: (e) => {
                    this.vendorUserFormData.username = e.target.value
                  }
                })
              ]),

              // Password field
              m('div', [
                m('label', {
                  class: 'block text-sm font-semibold text-gray-800 mb-2'
                }, [
                  m('i', {
                    class: 'ri-lock-line mr-1 text-red-500'
                  }),
                  'Password'
                ]),
                m('div', {
                  class: 'relative'
                }, [
                  m('input', {
                    type: this.showPassword ? 'text' : 'password',
                    class: 'w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all duration-200 bg-gray-50 focus:bg-white',
                    placeholder: 'Password minimal 6 karakter',
                    value: this.vendorUserFormData.password,
                    oninput: (e) => {
                      this.vendorUserFormData.password = e.target.value
                      this.vendorUserFormData.passwordDisplay = e.target.value
                    }
                  }),
                  m('button', {
                    type: 'button',
                    class: 'absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors',
                    onclick: () => this.showPassword = !this.showPassword
                  }, [
                    m('i', {
                      class: `ri-${this.showPassword ? 'eye-off' : 'eye'}-line`
                    })
                  ])
                ])
              ])
            ])
          ]),

          // Modal Actions
          m('div', {
            class: 'flex justify-end gap-3 pt-6 border-t border-gray-200 bg-gray-50 px-6 py-4 rounded-b-xl'
          }, [
            m('button', {
              class: 'px-6 py-3 bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-gray-400 rounded-lg text-gray-700 font-medium transition-all duration-200 flex items-center space-x-2',
              onclick: () => this.closeVendorUserModal()
            }, [
              m('i', {
                class: 'ri-close-fill'
              }),
              m('span', 'Batal')
            ]),
            m('button', {
              class: 'px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2',
              onclick: () => this.saveVendorUser()
            }, [
              m('i', {
                class: 'ri-save-line'
              }),
              m('span', 'Simpan')
            ])
          ])
        ])
      ])
    ])
  }
}

export default Penyedia