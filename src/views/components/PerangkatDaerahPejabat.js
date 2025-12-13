import m from 'mithril'

const PerangkatDaerahPejabat = {
  view: function(vnode) {
    const state = vnode.attrs.state

    return m('div', { class: 'space-y-6' }, [
      // Header with add button
      m('div', { class: 'flex justify-between items-center' }, [
        m('div', [
          m('h3', { class: 'text-lg font-semibold text-gray-900' }, 'Daftar Pejabat'),
          m('p', { class: 'text-sm text-gray-600 mt-1' }, 'Kelola data pejabat dan jabatan')
        ]),
        m('button', {
          class: 'inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200',
          onclick: () => state.openPejabatModal('create')
        }, [
          m('i', { class: 'ri-add-line mr-2' }),
          'Tambah Pejabat'
        ])
      ]),

      // List / empty state
      state.pejabatData.length === 0
        ? m('div', { class: 'text-center py-12' }, [
            m('div', {
              class: 'mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-4'
            }, [
              m('i', { class: 'ri-user-line text-blue-500' })
            ]),
            m('p', { class: 'text-sm text-gray-500' }, 'Belum ada data pejabat')
          ])
        : m('div', { class: 'space-y-4' },
            state.pejabatData.map(item =>
              m('div', {
                key: item._id,
                class: 'bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200'
              }, [
                m('div', { class: 'flex justify-between items-center' }, [
                  m('div', [
                    m('h3', { class: 'font-medium text-gray-900 text-sm' }, item.nama),
                    // Display multiple Jabatan Struktural if available
                    (item.jabatanStrukturalList && item.jabatanStrukturalList.length > 0)
                      ? item.jabatanStrukturalList.filter(pos => pos.isActive).map(pos =>
                          m('p', { class: 'text-sm text-gray-600' }, pos.position)
                        )
                      : item.jabatanStruktural && m('p', { class: 'text-sm text-gray-600' }, item.jabatanStruktural),
                    item.jabatanFungsional && m('p', {
                      class: 'text-sm text-gray-600'
                    }, item.jabatanFungsional)
                  ]),
                  m('div', { class: 'flex space-x-2' }, [
                    m('button', {
                      class: 'text-blue-600 hover:text-blue-900 text-sm',
                      onclick: () => state.openPejabatModal('edit', item)
                    }, 'Edit'),
                    m('button', {
                      class: 'text-red-600 hover:text-red-900 text-sm',
                      onclick: () => state.deletePejabat(item)
                    }, 'Hapus')
                  ])
                ])
              ])
            )
          ),

      // Modal (reusing parent state & methods)
      state.showPejabatModal && m('div', {
        class: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
      }, [
        m('div', {
          class: 'bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto'
        }, [
          m('div', { class: 'flex justify-between items-center mb-4' }, [
            m('h2', {
              class: 'text-xl font-bold text-gray-900'
            }, state.pejabatModalMode === 'edit' ? 'Edit Pejabat' : 'Tambah Pejabat'),
            m('button', {
              class: 'text-gray-400 hover:text-gray-600',
              onclick: () => state.closePejabatModal()
            }, [
              m('i', { class: 'ri-close-line text-xl' })
            ])
          ]),

          m('form', { class: 'space-y-4' }, [
            // Nama
            m('div', [
              m('label', {
                class: 'block text-sm font-medium text-gray-700 mb-1'
              }, 'Nama'),
              m('input', {
                type: 'text',
                class: `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  state.pejabatErrors.nama ? 'border-red-500' : 'border-gray-300'
                }`,
                placeholder: 'Masukkan nama',
                value: state.pejabatFormData.nama,
                oninput: e => { state.pejabatFormData.nama = e.target.value }
              }),
              state.pejabatErrors.nama && m('p', {
                class: 'mt-1 text-sm text-red-600'
              }, state.pejabatErrors.nama)
            ]),

            // NIP
            m('div', [
              m('label', {
                class: 'block text-sm font-medium text-gray-700 mb-1'
              }, 'NIP'),
              m('input', {
                type: 'text',
                maxlength: 18,
                pattern: '[0-9]{18}',
                class: `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  state.pejabatErrors.nip ? 'border-red-500' : 'border-gray-300'
                }`,
                placeholder: 'Masukkan NIP (18 digit angka)',
                value: state.pejabatFormData.nip,
                oninput: e => {
                  const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 18)
                  e.target.value = value
                  state.pejabatFormData.nip = value
                }
              }),
              state.pejabatErrors.nip && m('p', {
                class: 'mt-1 text-sm text-red-600'
              }, state.pejabatErrors.nip)
            ]),

            // Jabatan Struktural Section with Add Button
            m('div', [
              m('div', { class: 'flex justify-between items-center mb-3' }, [
                m('label', {
                  class: 'block text-sm font-medium text-gray-700'
                }, 'Jabatan Struktural'),
                m('button', {
                  type: 'button',
                  class: 'inline-flex items-center px-3 py-1 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 transition-all duration-200',
                  onclick: () => state.addJabatanStruktural()
                }, [
                  m('i', { class: 'ri-add-line mr-1' }),
                  'Tambah Jabatan'
                ])
              ]),

              // Current Jabatan Struktural List
              state.pejabatFormData.jabatanStrukturalList && state.pejabatFormData.jabatanStrukturalList.length > 0
                ? m('div', { class: 'space-y-2 mb-4' },
                    state.pejabatFormData.jabatanStrukturalList.map((pos, index) =>
                      m('div', {
                        key: index,
                        class: 'flex items-center space-x-2 bg-gray-50 p-3 rounded-md border border-gray-200'
                      }, [
                        m('div', { class: 'flex-1' }, [
                          m('div', { class: 'text-sm font-medium text-gray-700' }, pos.position),
                          pos.subOrganisasiId && (() => {
                            // Check if it's main organization
                            if (pos.subOrganisasiId === 'main_org') {
                              return m('div', { class: 'text-xs text-gray-500' },
                                'Organisasi: ' + (state.data?.nama || 'Perangkat Daerah') + ' (Main Organisasi)'
                              );
                            } else {
                              // Regular sub-organization
                              return m('div', { class: 'text-xs text-gray-500' },
                                'Sub Organisasi: ' + state.subOrganizations.find(org => org._id === pos.subOrganisasiId)?.nama || ''
                              );
                            }
                          })()
                        ]),
                        m('button', {
                          type: 'button',
                          class: 'text-red-600 hover:text-red-800 text-sm',
                          onclick: () => state.removeJabatanStruktural(index)
                        }, [
                          m('i', { class: 'ri-delete-bin-line' })
                        ])
                      ])
                    )
                  )
                : m('div', { class: 'text-sm text-gray-500 text-center py-4 border border-dashed border-gray-300 rounded-md' },
                    'Belum ada Jabatan Struktural'
                  ),

              // Add Position Form (appears when adding new position) - Enhanced UX
              state.showJabatanStrukturalForm && m('div', {
                class: 'border border-gray-200 rounded-md p-4 bg-white space-y-4'
              }, [
                // Step 1: Select Sub-Organisasi First
                m('div', [
                  m('label', {
                    class: 'block text-sm font-medium text-gray-700 mb-2'
                  }, [
                    m('i', { class: 'ri-building-line mr-1 text-blue-500' }),
                    '1. Pilih Organisasi/Sub Organisasi'
                  ]),
                  m('select', {
                    class: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
                    value: state.newJabatanStruktural.subOrganisasiId || '',
                    oninput: e => {
                      state.newJabatanStruktural.subOrganisasiId = e.target.value
                      // Check position availability when sub-org changes
                      if (state.newJabatanStruktural.subOrganisasiId && state.newJabatanStruktural.role) {
                        state.checkPositionAvailability()
                      }
                    }
                  }, [
                    m('option', { value: '' }, '-- Pilih Organisasi/Sub Organisasi --'),
                    // Main Organisasi option (top level)
                    state.data && state.data.nama && m('option', {
                      value: `main_org`,
                      disabled: false
                    }, `★ ${state.data.nama} (Main Organisasi)`),
                    // Separator
                    m('option', { value: '', disabled: true }, '─────────'),
                    // Sub Organisasi options
                    ...state.subOrganizations.map(subOrg =>
                      m('option', { value: subOrg._id }, `  ${subOrg.nama}`)
                    )
                  ])
                ]),

                // Step 2: Select Role with Radio Buttons
                m('div', [
                  m('label', {
                    class: 'block text-sm font-medium text-gray-700 mb-2'
                  }, [
                    m('i', { class: 'ri-user-line mr-1 text-green-500' }),
                    '2. Pilih Peran'
                  ]),
                  
                  // Radio buttons for role selection
                  m('div', { class: 'space-y-2' }, [
                    m('label', {
                      class: 'flex items-center space-x-2 cursor-pointer'
                    }, [
                      m('input', {
                        type: 'radio',
                        name: 'role',
                        value: 'Kepala',
                        checked: state.newJabatanStruktural.role === 'Kepala',
                        onchange: e => {
                          state.newJabatanStruktural.role = e.target.value
                          // Check position availability when role changes
                          if (state.newJabatanStruktural.subOrganisasiId) {
                            state.checkPositionAvailability()
                          }
                        }
                      }),
                      m('span', { class: 'text-sm text-gray-700' }, 'Kepala'),
                      m('span', { class: 'text-xs text-gray-500 ml-2' }, '(Posisi tetap)')
                    ]),
                    
                    m('label', {
                      class: 'flex items-center space-x-2 cursor-pointer'
                    }, [
                      m('input', {
                        type: 'radio',
                        name: 'role',
                        value: 'Plt. Kepala',
                        checked: state.newJabatanStruktural.role === 'Plt. Kepala',
                        onchange: e => {
                          state.newJabatanStruktural.role = e.target.value
                          // Check position availability when role changes
                          if (state.newJabatanStruktural.subOrganisasiId) {
                            state.checkPositionAvailability()
                          }
                        }
                      }),
                      m('span', { class: 'text-sm text-gray-700' }, 'Plt. Kepala'),
                      m('span', { class: 'text-xs text-gray-500 ml-2' }, '(Posisi sementara)')
                    ])
                  ])
                ]),

                // Show preview of the position
                state.newJabatanStruktural.subOrganisasiId && state.newJabatanStruktural.role && (() => {
                  let positionPreview = ''
                  let isMainOrg = false
                  
                  if (state.newJabatanStruktural.subOrganisasiId === 'main_org') {
                    // Main organization selected
                    isMainOrg = true
                    positionPreview = `${state.newJabatanStruktural.role} ${state.data?.nama || 'Perangkat Daerah'}`
                  } else {
                    // Sub-organization selected
                    const subOrg = state.subOrganizations.find(org => org._id === state.newJabatanStruktural.subOrganisasiId)
                    positionPreview = subOrg ? `${state.newJabatanStruktural.role} ${subOrg.nama}` : ''
                  }
                  
                  return m('div', {
                    class: 'bg-blue-50 border border-blue-200 rounded-md p-3'
                  }, [
                    m('div', { class: 'flex items-center' }, [
                      m('i', { class: 'ri-eye-line text-blue-500 mr-2' }),
                      m('p', { class: 'text-sm font-medium text-blue-800' }, positionPreview),
                      isMainOrg && m('span', {
                        class: 'ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full'
                      }, 'Organisasi Utama')
                    ])
                  ])
                })(),
                
                // Position conflict warning
                state.positionConflictWarning && m('div', {
                  class: 'bg-yellow-50 border border-yellow-200 rounded-md p-3'
                }, [
                  m('div', { class: 'flex items-start' }, [
                    m('i', { class: 'ri-warning-line text-yellow-600 mr-2 mt-0.5' }),
                    m('div', [
                      m('p', { class: 'text-sm text-yellow-800 font-medium' }, 'Peringatan!'),
                      m('p', { class: 'text-sm text-yellow-700 mt-1' }, state.positionConflictWarning),
                      m('button', {
                        type: 'button',
                        class: 'mt-2 px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700',
                        onclick: () => state.forceAddJabatanStruktural = true
                      }, 'Konfirmasi Dulu')
                    ])
                  ])
                ]),

                // Action buttons for adding position
                m('div', { class: 'flex justify-end space-x-2 pt-2 border-t border-gray-200' }, [
                  m('button', {
                    type: 'button',
                    class: 'px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50',
                    onclick: () => state.cancelAddJabatanStruktural()
                  }, 'Batal'),
                  m('button', {
                    type: 'button',
                    class: `px-3 py-1 text-sm rounded-md text-white ${
                      !state.newJabatanStruktural.subOrganisasiId || (state.positionConflictWarning && !state.forceAddJabatanStruktural)
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`,
                    onclick: () => state.saveJabatanStruktural(),
                    disabled: !state.newJabatanStruktural.subOrganisasiId || (state.positionConflictWarning && !state.forceAddJabatanStruktural)
                  }, 'Tambah Jabatan')
                ])
              ]),

              state.pejabatErrors.jabatanStruktural && m('p', {
                class: 'mt-2 text-sm text-red-600'
              }, state.pejabatErrors.jabatanStruktural)
            ]),

            // Jabatan Fungsional
            m('div', [
              m('label', {
                class: 'block text-sm font-medium text-gray-700 mb-1'
              }, 'Jabatan Fungsional'),
              m('select', {
                class: `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  state.pejabatErrors.jabatanFungsional ? 'border-red-500' : 'border-gray-300'
                }`,
                value: state.pejabatFormData.jabatanFungsional,
                oninput: e => {
                  state.pejabatFormData.jabatanFungsional = e.target.value
                }
              }, state.jabatanFungsionalOptions.map(option =>
                m('option', { value: option.value }, option.label)
              ))
            ]),

            // Email
            m('div', [
              m('label', {
                class: 'block text-sm font-medium text-gray-700 mb-1'
              }, 'Email'),
              m('input', {
                type: 'email',
                class: `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  state.pejabatErrors.email ? 'border-red-500' : 'border-gray-300'
                }`,
                placeholder: 'Masukkan email',
                value: state.pejabatFormData.email,
                oninput: e => { state.pejabatFormData.email = e.target.value }
              }),
              state.pejabatErrors.email && m('p', {
                class: 'mt-1 text-sm text-red-600'
              }, state.pejabatErrors.email)
            ]),

            // Telepon
            m('div', [
              m('label', {
                class: 'block text-sm font-medium text-gray-700 mb-1'
              }, 'Telepon'),
              m('input', {
                type: 'text',
                class: `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  state.pejabatErrors.telepon ? 'border-red-500' : 'border-gray-300'
                }`,
                placeholder: 'Masukkan telepon',
                value: state.pejabatFormData.telepon,
                oninput: e => { state.pejabatFormData.telepon = e.target.value }
              }),
              state.pejabatErrors.telepon && m('p', {
                class: 'mt-1 text-sm text-red-600'
              }, state.pejabatErrors.telepon)
            ]),

            // Status
            m('div', [
              m('label', {
                class: 'block text-sm font-medium text-gray-700 mb-1'
              }, 'Status'),
              m('select', {
                class: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
                value: state.pejabatFormData.status,
                oninput: e => { state.pejabatFormData.status = e.target.value }
              }, [
                m('option', { value: 'Aktif' }, 'Aktif'),
                m('option', { value: 'Tidak Aktif' }, 'Tidak Aktif')
              ])
            ])
          ]),

          // Modal actions
          m('div', { class: 'flex justify-end space-x-3 mt-6' }, [
            m('button', {
              type: 'button',
              class: 'px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50',
              onclick: () => state.closePejabatModal(),
              disabled: state.isLoading
            }, 'Batal'),
            m('button', {
              type: 'button',
              class: `px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 ${
                state.isLoading ? 'cursor-not-allowed opacity-50' : ''
              }`,
              onclick: () => state.savePejabat(),
              disabled: state.isLoading
            }, state.isLoading ? 'Menyimpan...' : (state.pejabatModalMode === 'edit' ? 'Perbarui' : 'Simpan'))
          ])
        ])
      ])
    ])
  }
}

export default PerangkatDaerahPejabat