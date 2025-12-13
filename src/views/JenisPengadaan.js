import m from 'mithril'
import { JWTUtils, UserUtils, APIUtils } from '../js/utils.js'
import toast from '../js/toaster.js'

const JenisPengadaan = {
  // State management
  isLoading: false,
  jenisPengadaanList: [],
  filteredJenisPengadaan: [],
  metodePengadaanList: [],
  filteredMetodePengadaan: [],

  // Modal states
  showJenisModal: false,
  showMetodeModal: false,

  // Form data
  formData: {
    _id: null,
    kode: '',
    nama: '',
    deskripsi: ''
  },

  // Metode form data
  metodeFormData: {
    _id: null,
    jenisPengadaanId: '',
    kode: '',
    nama: '',
    deskripsi: ''
  },

  // Search and filter
  searchQuery: '',
  metodeSearchQuery: '',

  errors: {},
  metodeErrors: {},
  isLoadingJenis: false,
  isLoadingMetode: false,

  oninit: function() {
    this.loadData()
  },

  // Load all data
  loadData: async function() {
    this.isLoading = true
    try {
      const [jenisResponse, metodeResponse] = await Promise.all([
        APIUtils.getAll('jenis-pengadaan'),
        APIUtils.getAll('metode-pengadaan')
      ])

      this.jenisPengadaanList = Array.isArray(jenisResponse.data) ? jenisResponse.data : []
      this.filteredJenisPengadaan = this.jenisPengadaanList

      this.metodePengadaanList = Array.isArray(metodeResponse.data) ? metodeResponse.data : []
      this.filteredMetodePengadaan = this.metodePengadaanList

      this.searchQuery = ''
      this.metodeSearchQuery = ''

      // UX rule:
      // - If collections exist but are empty, show success toast "Data masih kosong"
      // - No error toast in that case
      if (this.jenisPengadaanList.length === 0 && this.metodePengadaanList.length === 0) {
        toast.success('Data masih kosong')
      }
    } catch (error) {
      console.error('Error loading data:', error)

      // Show error toast only for real backend failures (non-404, non-empty response)
      const status = error?.response?.status
      if (status && status !== 404) {
        const msg = error.response?.data?.message || 'Gagal memuat data'
        toast.error(msg)
      }
      // For 404 or missing/empty responses, just fall through:
      // the UI will render empty state without showing a failure toast.
      this.jenisPengadaanList = []
      this.filteredJenisPengadaan = []
      this.metodePengadaanList = []
      this.filteredMetodePengadaan = []
    } finally {
      this.isLoading = false
      m.redraw()
    }
  },

  // Handle search
  handleSearch: function() {
    this.applyJenisFilters()
  },

  // Handle metode search
  handleMetodeSearch: function() {
    this.applyMetodeFilters()
  },

  // Apply jenis filters
  applyJenisFilters: function() {
    let filtered = this.jenisPengadaanList

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase()
      filtered = filtered.filter(jenis =>
        jenis.kode.toLowerCase().includes(query) ||
        jenis.nama.toLowerCase().includes(query) ||
        (jenis.deskripsi && jenis.deskripsi.toLowerCase().includes(query))
      )
    }

    this.filteredJenisPengadaan = filtered
  },

  // Apply metode filters
  applyMetodeFilters: function() {
    let filtered = this.metodePengadaanList

    if (this.metodeSearchQuery) {
      const query = this.metodeSearchQuery.toLowerCase()
      filtered = filtered.filter(metode =>
        metode.kode.toLowerCase().includes(query) ||
        metode.nama.toLowerCase().includes(query) ||
        (metode.deskripsi && metode.deskripsi.toLowerCase().includes(query)) ||
        metode.jenisPengadaanId.nama.toLowerCase().includes(query)
      )
    }

    this.filteredMetodePengadaan = filtered
  },

  // Get jenis pengadaan name by ID
  getJenisPengadaanName: function(jenisPengadaanId) {
    const jenis = this.jenisPengadaanList.find(j => j._id === jenisPengadaanId)
    return jenis ? jenis.nama : 'Tidak ditemukan'
  },

  // Modal functions
  openCreateModal: function() {
    this.showJenisModal = true
    this.formData = { _id: null, kode: '', nama: '', deskripsi: '' }
    this.errors = {}
  },

  openEditModal: function(jenisPengadaan) {
    this.showJenisModal = true
    this.formData = { ...jenisPengadaan }
    this.errors = {}
  },

  openCreateMetodeModal: function(jenisPengadaan) {
    this.showMetodeModal = true
    this.metodeFormData = {
      _id: null,
      jenisPengadaanId: jenisPengadaan._id,
      kode: '',
      nama: '',
      deskripsi: ''
    }
    this.metodeErrors = {}
  },

  openEditMetodeModal: function(metodePengadaan) {
    this.showMetodeModal = true
    this.metodeFormData = { ...metodePengadaan, jenisPengadaanId: metodePengadaan.jenisPengadaanId._id }
    this.metodeErrors = {}
  },

  manageMetode: function(jenisPengadaan) {
    // Scroll to the Metode Pengadaan section or open modal
    // For simplicity, open the create metode modal for this jenis
    this.openCreateMetodeModal(jenisPengadaan)
  },

  saveJenisPengadaan: async function() {
    if (!this.formData.kode || !this.formData.nama) {
      toast.error('Kode dan nama harus diisi')
      return
    }

    this.isLoadingJenis = true
    try {
      if (this.formData._id) {
        await APIUtils.update('jenis-pengadaan', this.formData._id, this.formData)
      } else {
        await APIUtils.create('jenis-pengadaan', this.formData)
      }
      this.loadData()
      this.showJenisModal = false
    } catch (error) {
      console.error('Error saving jenis pengadaan:', error)
    } finally {
      this.isLoadingJenis = false
      m.redraw()
    }
  },

  saveMetodePengadaan: async function() {
    if (!this.metodeFormData.jenisPengadaanId || !this.metodeFormData.kode || !this.metodeFormData.nama) {
      toast.error('Jenis pengadaan, kode dan nama harus diisi')
      return
    }

    this.isLoadingMetode = true
    try {
      if (this.metodeFormData._id) {
        await APIUtils.update('metode-pengadaan', this.metodeFormData._id, this.metodeFormData)
      } else {
        await APIUtils.create('metode-pengadaan', this.metodeFormData)
      }
      this.loadData()
      this.showMetodeModal = false
    } catch (error) {
      console.error('Error saving metode pengadaan:', error)
    } finally {
      this.isLoadingMetode = false
      m.redraw()
    }
  },

  deleteJenisPengadaan: async function(jenisPengadaan) {
    try {
      await APIUtils.delete('jenis-pengadaan', jenisPengadaan._id, jenisPengadaan.nama)
      this.loadData()
    } catch (error) {
      console.error('Error deleting jenis pengadaan:', error)
    }
  },

  deleteMetodePengadaan: async function(metodePengadaan) {
    try {
      await APIUtils.delete('metode-pengadaan', metodePengadaan._id, metodePengadaan.nama)
      this.loadData()
    } catch (error) {
      console.error('Error deleting metode pengadaan:', error)
    }
  },

  view: function() {
    return m('div', {
      class: 'max-w-7xl mx-auto'
    }, [
      // Header
      m('div', {
        class: 'mb-6'
      }, [
        m('h1', {
          class: 'text-2xl font-bold text-gray-900'
        }, 'Jenis dan Metode Pengadaan'),
        m('p', {
          class: 'text-gray-600 mt-1'
        }, 'Kelola data jenis dan metode pengadaan')
      ]),

      // Jenis Pengadaan Section
      m('div', {
        class: 'mb-8'
      }, [
        // Jenis Pengadaan Header
        m('div', {
          class: 'flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4'
        }, [
          m('div', [
            m('h2', {
              class: 'text-xl font-semibold text-gray-900'
            }, 'Jenis Pengadaan'),
            m('p', {
              class: 'text-gray-600 text-sm'
            }, 'Kelola data jenis pengadaan')
          ]),
          m('button', {
            class: 'bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2 transition-colors',
            onclick: () => this.openCreateModal()
          }, [
            m('i', {
              class: 'ri-add-line'
            }),
            'Tambah Jenis Pengadaan'
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
              placeholder: 'Cari jenis pengadaan...',
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

        // Jenis pengadaan table
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
                  }, 'Kode'),
                  m('th', {
                    class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                  }, 'Nama'),
                  m('th', {
                    class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                  }, 'Deskripsi'),
                  m('th', {
                    class: 'px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'
                  }, 'Aksi')
                ])
              ]),
              m('tbody', {
                class: 'bg-white divide-y divide-gray-200'
              }, [
                this.filteredJenisPengadaan.length === 0 ?
                  m('tr', [
                    m('td', {
                      class: 'px-6 py-4 text-center text-gray-500',
                      colspan: 4
                    }, 'Tidak ada data jenis pengadaan')
                  ]) :
                  this.filteredJenisPengadaan.map((jenisPengadaan) =>
                    m('tr', {
                      class: 'hover:bg-gray-50'
                    }, [
                      m('td', {
                        class: 'px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'
                      }, jenisPengadaan.kode),
                      m('td', {
                        class: 'px-6 py-4 text-sm text-gray-900'
                      }, jenisPengadaan.nama),
                      m('td', {
                        class: 'px-6 py-4 text-sm text-gray-500 max-w-xs truncate'
                      }, jenisPengadaan.deskripsi || '-'),
                      m('td', {
                        class: 'px-6 py-4 whitespace-nowrap text-right text-sm font-medium'
                      }, [
                        m('button', {
                          class: 'text-green-600 hover:text-green-900 mr-3',
                          onclick: () => this.manageMetode(jenisPengadaan),
                          title: 'Kelola Metode Pengadaan'
                        }, [
                          m('i', {
                            class: 'ri-settings-line'
                          })
                        ]),
                        m('button', {
                          class: 'text-blue-600 hover:text-blue-900 mr-3',
                          onclick: () => this.openEditModal(jenisPengadaan)
                        }, [
                          m('i', {
                            class: 'ri-edit-line'
                          })
                        ]),
                        m('button', {
                          class: 'text-red-600 hover:text-red-900',
                          onclick: () => this.deleteJenisPengadaan(jenisPengadaan)
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
        ])
      ]),

      // Metode Pengadaan Section
      m('div', {
        class: 'mb-8'
      }, [
        // Metode Pengadaan Header
        m('div', {
          class: 'flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4'
        }, [
          m('div', [
            m('h2', {
              class: 'text-xl font-semibold text-gray-900'
            }, 'Metode Pengadaan'),
            m('p', {
              class: 'text-gray-600 text-sm'
            }, 'Kelola data metode pengadaan')
          ]),
          m('button', {
            class: `bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2 transition-colors ${
              this.jenisPengadaanList.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
            }`,
            onclick: () => {
              if (this.jenisPengadaanList.length > 0) {
                this.openCreateMetodeModal(this.jenisPengadaanList[0])
              }
            },
            disabled: this.jenisPengadaanList.length === 0
          }, [
            m('i', {
              class: 'ri-add-line'
            }),
            'Tambah Metode Pengadaan'
          ])
        ]),

        // Metode pengadaan table - Hierarchical view
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
                  }, 'Jenis Pengadaan'),
                  m('th', {
                    class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                  }, 'Kode'),
                  m('th', {
                    class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                  }, 'Nama'),
                  m('th', {
                    class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                  }, 'Deskripsi'),
                  m('th', {
                    class: 'px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'
                  }, 'Aksi')
                ])
              ]),
              m('tbody', {
                class: 'bg-white divide-y divide-gray-200'
              }, [
                this.filteredMetodePengadaan.length === 0 ?
                  m('tr', [
                    m('td', {
                      class: 'px-6 py-4 text-center text-gray-500',
                      colspan: 5
                    }, this.jenisPengadaanList.length === 0 ? 'Tidak ada data jenis pengadaan' : 'Tidak ada data metode pengadaan')
                  ]) :
                  this.filteredMetodePengadaan.map((metodePengadaan) =>
                    m('tr', {
                      class: 'hover:bg-gray-50'
                    }, [
                      m('td', {
                        class: 'px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'
                      }, [
                        m('div', [
                          m('div', { class: 'text-sm font-medium text-gray-900' }, metodePengadaan.jenisPengadaanId.kode),
                          m('div', { class: 'text-sm text-gray-500' }, metodePengadaan.jenisPengadaanId.nama)
                        ])
                      ]),
                      m('td', {
                        class: 'px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'
                      }, metodePengadaan.kode),
                      m('td', {
                        class: 'px-6 py-4 text-sm text-gray-900'
                      }, metodePengadaan.nama),
                      m('td', {
                        class: 'px-6 py-4 text-sm text-gray-500 max-w-xs truncate'
                      }, metodePengadaan.deskripsi || '-'),
                      m('td', {
                        class: 'px-6 py-4 whitespace-nowrap text-right text-sm font-medium'
                      }, [
                        m('button', {
                          class: 'text-blue-600 hover:text-blue-900 mr-3',
                          onclick: () => this.openEditMetodeModal(metodePengadaan)
                        }, [
                          m('i', {
                            class: 'ri-edit-line'
                          })
                        ]),
                        m('button', {
                          class: 'text-red-600 hover:text-red-900',
                          onclick: () => this.deleteMetodePengadaan(metodePengadaan)
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
        ])
      ]),

      // Modal for create/edit Jenis Pengadaan
      this.showJenisModal && m('div', {
        class: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'
      }, [
        m('div', {
          class: 'bg-white rounded-xl shadow-2xl max-w-md w-full'
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
                    class: this.formData._id ? 'ri-edit-line text-xl text-blue-600' : 'ri-add-line text-xl text-blue-600'
                  })
                ]),
                m('div', [
                  m('h3', {
                    class: 'text-xl font-bold'
                  }, this.formData._id ? 'Edit Jenis Pengadaan' : 'Tambah Jenis Pengadaan'),
                  m('p', {
                    class: 'text-white text-opacity-80 text-sm'
                  }, this.formData._id ? 'Edit data jenis pengadaan' : 'Tambah data jenis pengadaan baru')
                ])
              ]),
              m('button', {
                class: 'w-8 h-8 bg-blue-600 bg-opacity-25 rounded-full flex items-center justify-center',
                onclick: () => { this.showJenisModal = false; this.formData = { _id: null } }
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
              // Kode
              m('div', [
                m('label', {
                  class: 'block text-sm font-semibold text-gray-800 mb-2'
                }, 'Kode'),
                m('input', {
                  type: 'text',
                  class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500',
                  placeholder: 'Contoh: JP001, JP002...',
                  value: this.formData.kode,
                  oninput: (e) => {
                    this.formData.kode = e.target.value
                  }
                })
              ]),

              // Nama
              m('div', [
                m('label', {
                  class: 'block text-sm font-semibold text-gray-800 mb-2'
                }, 'Nama'),
                m('input', {
                  type: 'text',
                  class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500',
                  placeholder: 'Masukkan nama jenis pengadaan',
                  value: this.formData.nama,
                  oninput: (e) => {
                    this.formData.nama = e.target.value
                  }
                })
              ]),

              // Deskripsi
              m('div', [
                m('label', {
                  class: 'block text-sm font-semibold text-gray-800 mb-2'
                }, 'Deskripsi'),
                m('textarea', {
                  class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500',
                  placeholder: 'Masukkan deskripsi (opsional)',
                  rows: 3,
                  value: this.formData.deskripsi,
                  oninput: (e) => {
                    this.formData.deskripsi = e.target.value
                  }
                })
              ])
            ])
          ]),

          // Modal footer
          m('div', {
            class: 'flex justify-end gap-3 pt-6 border-t border-gray-200 bg-gray-50 px-6 py-4 rounded-b-xl'
          }, [
            m('button', {
              class: 'px-6 py-3 bg-white hover:bg-gray-50 border-2 border-gray-300 rounded-lg text-gray-700 font-medium',
              onclick: () => { this.showJenisModal = false; this.formData = { _id: null } }
            }, [
              m('span', 'Batal')
            ]),
            m('button', {
              class: `px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium ${this.isLoadingJenis ? 'opacity-50 cursor-not-allowed' : ''}`,
              disabled: this.isLoadingJenis,
              onclick: () => this.saveJenisPengadaan()
            }, [
              m('span', this.isLoadingJenis ? 'Menyimpan...' : (this.formData._id ? 'Update' : 'Simpan'))
            ])
          ])
        ])
      ]),

      // Modal for create/edit Metode Pengadaan
      this.showMetodeModal && m('div', {
        class: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'
      }, [
        m('div', {
          class: 'bg-white rounded-xl shadow-2xl max-w-md w-full'
        }, [
          // Modal header
          m('div', {
            class: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-t-xl'
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
                    class: this.metodeFormData._id ? 'ri-edit-line text-xl text-blue-600' : 'ri-add-line text-xl text-blue-600'
                  })
                ]),
                m('div', [
                  m('h3', {
                    class: 'text-xl font-bold'
                  }, this.metodeFormData._id ? 'Edit Metode Pengadaan' : 'Tambah Metode Pengadaan'),
                  m('p', {
                    class: 'text-white text-opacity-80 text-sm'
                  }, this.metodeFormData._id ? 'Edit data metode pengadaan' : 'Tambah data metode pengadaan baru')
                ])
              ]),
              m('button', {
                class: 'w-8 h-8 bg-blue-600 bg-opacity-25 rounded-full flex items-center justify-center',
                onclick: () => { this.showMetodeModal = false; this.metodeFormData = { _id: null } }
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
              // Jenis Pengadaan
              m('div', [
                m('label', {
                  class: 'block text-sm font-semibold text-gray-800 mb-2'
                }, 'Jenis Pengadaan'),
                m('select', {
                  class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500',
                  value: this.metodeFormData.jenisPengadaanId,
                  oninput: (e) => {
                    this.metodeFormData.jenisPengadaanId = e.target.value
                  }
                }, [
                  m('option', { value: '' }, 'Pilih Jenis Pengadaan...'),
                  this.jenisPengadaanList.map(jenis =>
                    m('option', { value: jenis._id }, `${jenis.kode} - ${jenis.nama}`)
                  )
                ])
              ]),

              // Kode
              m('div', [
                m('label', {
                  class: 'block text-sm font-semibold text-gray-800 mb-2'
                }, 'Kode'),
                m('input', {
                  type: 'text',
                  class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500',
                  placeholder: 'Contoh: MP001, MP002...',
                  value: this.metodeFormData.kode,
                  oninput: (e) => {
                    this.metodeFormData.kode = e.target.value
                  }
                })
              ]),

              // Nama
              m('div', [
                m('label', {
                  class: 'block text-sm font-semibold text-gray-800 mb-2'
                }, 'Nama'),
                m('input', {
                  type: 'text',
                  class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500',
                  placeholder: 'Masukkan nama metode pengadaan',
                  value: this.metodeFormData.nama,
                  oninput: (e) => {
                    this.metodeFormData.nama = e.target.value
                  }
                })
              ]),

              // Deskripsi
              m('div', [
                m('label', {
                  class: 'block text-sm font-semibold text-gray-800 mb-2'
                }, 'Deskripsi'),
                m('textarea', {
                  class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500',
                  placeholder: 'Masukkan deskripsi (opsional)',
                  rows: 3,
                  value: this.metodeFormData.deskripsi,
                  oninput: (e) => {
                    this.metodeFormData.deskripsi = e.target.value
                  }
                })
              ])
            ])
          ]),

          // Modal footer
          m('div', {
            class: 'flex justify-end gap-3 pt-6 border-t border-gray-200 bg-gray-50 px-6 py-4 rounded-b-xl'
          }, [
            m('button', {
              class: 'px-6 py-3 bg-white hover:bg-gray-50 border-2 border-gray-300 rounded-lg text-gray-700 font-medium',
              onclick: () => { this.showMetodeModal = false; this.metodeFormData = { _id: null } }
            }, [
              m('span', 'Batal')
            ]),
            m('button', {
              class: `px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium ${this.isLoadingMetode ? 'opacity-50 cursor-not-allowed' : ''}`,
              disabled: this.isLoadingMetode,
              onclick: () => this.saveMetodePengadaan()
            }, [
              m('span', this.isLoadingMetode ? 'Menyimpan...' : (this.metodeFormData._id ? 'Update' : 'Simpan'))
            ])
          ])
        ])
      ])
    ])
  }
}

export default JenisPengadaan