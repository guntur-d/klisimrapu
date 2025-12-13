import m from 'mithril'

const PerangkatDaerahOrganisasi = {
  view: function(vnode) {
    const state = vnode.attrs.state

    // Empty state
    if (!state.isEditing && !state.data) {
      return m('div', { class: 'text-center py-12' }, [
        m('div', { class: 'mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-4' }, [
          m('i', { class: 'ri-building-line text-blue-500' })
        ]),
        m('h3', { class: 'text-lg font-medium text-gray-900' }, 'Belum ada data Perangkat Daerah'),
        m('p', { class: 'text-sm text-gray-500' }, 'Silakan tambahkan data Perangkat Daerah terlebih dahulu')
      ])
    }

    // Edit mode
    if (state.isEditing) {
      return m('div', { class: 'space-y-6' }, [
        m('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-6' }, [
          m('div', [
            m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, 'Nama Pemda'),
            m('input', {
              type: 'text',
              class: `w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-blue-500 ${
                state.errors.namaPemda ? 'border-red-500' : 'border-gray-200'
              }`,
              placeholder: 'Contoh: Pemerintah Kabupaten/Kota',
              value: state.formData.namaPemda,
              oninput: e => {
                state.formData = { ...state.formData, namaPemda: e.target.value }
              }
            }),
            state.errors.namaPemda && m('p', { class: 'mt-1 text-sm text-red-600' }, state.errors.namaPemda)
          ]),
          m('div', [
            m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, 'Nama Perangkat Daerah'),
            m('input', {
              type: 'text',
              class: `w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-green-500 ${
                state.errors.nama ? 'border-red-500' : 'border-gray-200'
              }`,
              placeholder: 'Contoh: Dinas Pekerjaan Umum dan Penataan Ruang',
              value: state.formData.nama,
              oninput: e => {
                state.formData = { ...state.formData, nama: e.target.value }
              }
            }),
            state.errors.nama && m('p', { class: 'mt-1 text-sm text-red-600' }, state.errors.nama)
          ]),
          m('div', [
            m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, 'Kode Organisasi'),
            m('input', {
              type: 'text',
              class: `w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-purple-500 ${
                state.errors.kodeOrganisasi ? 'border-red-500' : 'border-gray-200'
              }`,
              placeholder: 'Contoh: 1.01.01',
              value: state.formData.kodeOrganisasi,
              oninput: e => {
                state.formData = { ...state.formData, kodeOrganisasi: e.target.value }
              }
            }),
            state.errors.kodeOrganisasi && m('p', { class: 'mt-1 text-sm text-red-600' }, state.errors.kodeOrganisasi)
          ]),
          m('div', [
            m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, 'Jenis'),
            m('select', {
              class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-amber-500',
              value: state.formData.jenis,
              oninput: e => {
                state.formData = { ...state.formData, jenis: e.target.value }
              }
            }, [
              m('option', { value: 'Dinas' }, 'Dinas'),
              m('option', { value: 'Badan' }, 'Badan'),
              m('option', { value: 'Satuan Kerja' }, 'Satuan Kerja'),
              m('option', { value: 'Kecamatan' }, 'Kecamatan'),
              m('option', { value: 'Kelurahan' }, 'Kelurahan'),
              m('option', { value: 'Lainnya' }, 'Lainnya')
            ])
          ])
        ]),
        m('div', { class: 'flex justify-end space-x-3' }, [
          m('button', {
            class: 'px-5 py-2.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50',
            onclick: () => state.toggleEdit(),
            disabled: state.isLoading
          }, 'Batal'),
          m('button', {
            class: `px-5 py-2.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 ${
              state.isLoading ? 'cursor-not-allowed opacity-50' : ''
            }`,
            onclick: () => state.saveItem(),
            disabled: state.isLoading
          }, state.isLoading ? 'Menyimpan...' : 'Simpan')
        ])
      ])
    }

    // Display mode with Sub Organisasi section
    const data = state.data

    return m('div', { class: 'space-y-6' }, [
      m('div', { class: 'flex justify-between items-start' }, [
        m('div', [
          m('h2', { class: 'text-xl font-bold text-gray-900' }, data.nama),
          m('div', { class: 'mt-1 flex items-center' }, [
            m('span', {
              class: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800'
            }, data.jenis),
            m('span', { class: 'ml-2 font-mono text-sm text-gray-600' }, data.namaPemda)
          ])
        ])
      ]),
      m('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-4' }, [
        m('div', [
          m('h3', { class: 'text-sm font-medium text-gray-500' }, 'Kode Organisasi'),
          m('p', { class: 'mt-1 text-sm text-gray-900' }, data.kodeOrganisasi || '-')
        ]),
        data.alamat && m('div', [
          m('h3', { class: 'text-sm font-medium text-gray-500' }, 'Alamat'),
          m('p', { class: 'mt-1 text-sm text-gray-900' }, data.alamat)
        ]),
        data.email && m('div', [
          m('h3', { class: 'text-sm font-medium text-gray-500' }, 'Email'),
          m('p', { class: 'mt-1 text-sm text-gray-900' }, data.email)
        ]),
        data.telepon && m('div', [
          m('h3', { class: 'text-sm font-medium text-gray-500' }, 'Telepon'),
          m('p', { class: 'mt-1 text-sm text-gray-900' }, data.telepon)
        ]),
        data.website && m('div', [
          m('h3', { class: 'text-sm font-medium text-gray-500' }, 'Website'),
          m('p', { class: 'mt-1 text-sm text-gray-900' }, data.website)
        ])
      ]),
      // Sub Organisasi section (reuse existing state methods)
      m('div', { class: 'mt-8' }, [
        m('div', { class: 'flex justify-between items-center mb-4' }, [
          m('h3', { class: 'text-lg font-semibold text-gray-900' }, 'Sub Organisasi'),
          m('button', {
            class: 'inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200',
            onclick: () => state.startQuickAddSubOrg(),
            disabled: state.addingSubOrg || state.isLoading
          }, [
            m('i', { class: `mr-2 ${state.addingSubOrg ? 'ri-close-line' : 'ri-add-line'}` }),
            state.addingSubOrg ? 'Batal' : 'Tambah Sub Organisasi'
          ])
        ]),
        state.addingSubOrg && m('div', {
          class: 'bg-white border border-gray-200 rounded-lg p-4 mb-4'
        }, [
          m('div', { class: 'flex gap-2' }, [
            m('input', {
              type: 'text',
              class: 'flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
              placeholder: 'Masukkan nama sub organisasi',
              value: state.newSubOrgName,
              oninput: e => { state.newSubOrgName = e.target.value },
              onkeydown: e => {
                if (e.key === 'Enter') state.saveNewSubOrg()
                else if (e.key === 'Escape') state.cancelAddSubOrg()
              }
            }),
            m('button', {
              class: 'px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50',
              onclick: () => state.saveNewSubOrg(),
              disabled: state.isLoading
            }, state.isLoading
              ? m('div', { class: 'w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' })
              : m('i', { class: 'ri-check-line' })
            )
          ])
        ]),
        state.isLoadingSubOrg
          ? m('div', { class: 'flex justify-center items-center h-32' }, [
              m('div', { class: 'w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin' })
            ])
          : state.subOrganizations.length === 0 && !state.addingSubOrg
            ? m('div', { class: 'text-center py-12' }, [
                m('div', {
                  class: 'mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-4'
                }, [
                  m('i', { class: 'ri-building-line text-blue-500' })
                ]),
                m('p', { class: 'text-sm text-gray-500' }, 'Belum ada sub organisasi')
              ])
            : m('div', {
                class: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              },
              state.subOrganizations.map(subOrg =>
                m('div', {
                  key: subOrg._id,
                  class: 'bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200'
                }, [
                  state.editingSubOrgId === subOrg._id
                    ? m('div', [
                        m('div', { class: 'flex gap-2 mb-2' }, [
                          m('input', {
                            type: 'text',
                            class: 'flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
                            value: state.editingSubOrgName,
                            oninput: e => { state.editingSubOrgName = e.target.value },
                            onkeydown: e => {
                              if (e.key === 'Enter') state.saveEditSubOrg()
                              else if (e.key === 'Escape') state.cancelEditSubOrg()
                            }
                          })
                        ]),
                        m('div', { class: 'flex justify-end space-x-1' }, [
                          m('button', {
                            class: 'px-2 py-1 text-xs text-gray-600 hover:text-gray-800',
                            onclick: () => state.cancelEditSubOrg()
                          }, [
                            m('i', { class: 'ri-close-line mr-1' }),
                            'Batal'
                          ]),
                          m('button', {
                            class: 'px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50',
                            onclick: () => state.saveEditSubOrg(),
                            disabled: state.isLoading
                          }, state.isLoading
                            ? m('div', {
                                class: 'w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-1'
                              })
                            : m('i', { class: 'ri-check-line mr-1' }),
                          )
                        ])
                      ])
                    : m('div', { class: 'flex justify-between items-start' }, [
                        m('h3', {
                          class: 'font-medium text-gray-900 text-sm flex-1'
                        }, subOrg.nama),
                        m('div', { class: 'flex space-x-1' }, [
                          m('button', {
                            class: 'text-blue-600 hover:text-blue-900 text-xs',
                            onclick: () => state.startEditSubOrg(subOrg._id, subOrg.nama)
                          }, [
                            m('i', { class: 'ri-edit-line' })
                          ]),
                          m('button', {
                            class: 'text-red-600 hover:text-red-900 text-xs',
                            onclick: () => state.deleteSubOrganization(subOrg._id)
                          }, [
                            m('i', { class: 'ri-delete-bin-line' })
                          ])
                        ])
                      ])
                ])
              )
            )
      ])
    ])
  }
}

export default PerangkatDaerahOrganisasi