import m from 'mithril'

const roleLabel = (role) => {
  if (role === 'admin') return 'Administrator'
  if (role === 'operator') return 'Operator'
  if (role === 'vendor') return 'Penyedia B/J'
  if (role === 'pengawas') return 'Pengawas'
  return role || '-'
}

const roleBadgeClass = (role) => {
  if (role === 'admin') return 'bg-red-100 text-red-800'
  if (role === 'operator') return 'bg-blue-100 text-blue-800'
  if (role === 'vendor') return 'bg-green-100 text-green-800'
  if (role === 'pengawas') return 'bg-purple-100 text-purple-800'
  return 'bg-gray-100 text-gray-700'
}

const PerangkatDaerahPengguna = {
  view: function(vnode) {
    const state = vnode.attrs.state

    return m('div', { class: 'space-y-6' }, [
      // Header with add button
      m('div', { class: 'flex justify-between items-center' }, [
        m('div', [
          m('h3', { class: 'text-lg font-semibold text-gray-900' }, 'Daftar Pengguna'),
          m('p', { class: 'text-sm text-gray-600 mt-1' }, 'Kelola akun pengguna sistem')
        ]),
        m('button', {
          class: 'inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200',
          onclick: () => state.openUserModal('create')
        }, [
          m('i', { class: 'ri-add-line mr-2' }),
          'Tambah Pengguna'
        ])
      ]),

      // Loading / empty / list
      state.isLoadingUsers
        ? m('div', { class: 'flex justify-center items-center h-32' }, [
            m('div', { class: 'w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin' })
          ])
        : state.userData.length === 0
          ? m('div', { class: 'text-center py-12' }, [
              m('div', {
                class: 'mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-4'
              }, [
                m('i', { class: 'ri-user-settings-line text-blue-500' })
              ]),
              m('p', { class: 'text-sm text-gray-500' }, 'Belum ada data pengguna')
            ])
          : m('div', { class: 'space-y-4' },
              state.userData.map(item => {
                // Resolve sub organisasi for badge
                const subOrg = item.subPerangkatDaerahId
                  ? state.subPerangkatDaerahList.find(s =>
                      s._id === item.subPerangkatDaerahId ||
                      (typeof item.subPerangkatDaerahId === 'object' && s._id === item.subPerangkatDaerahId._id)
                    )
                  : null

                // Resolve penyedia label (if any)
                let penyediaLabel = null
                if (item.penyediaId && state.penyediaList && state.penyediaList.length) {
                  const match = state.penyediaList.find(p =>
                    p._id === item.penyediaId ||
                    (typeof item.penyediaId === 'object' && p._id === item.penyediaId._id)
                  )
                  if (match) penyediaLabel = match.NamaVendor || match.nama
                }

                return m('div', {
                  key: item._id,
                  class: 'bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200'
                }, [
                  m('div', { class: 'flex justify-between items-start gap-4' }, [
                    m('div', { class: 'space-y-1' }, [
                        m('h3', { class: 'font-medium text-gray-900 text-sm' }, item.namaLengkap || item.username),
                        m('p', { class: 'text-sm text-gray-600' }, item.email),
                        m('div', { class: 'flex flex-wrap items-center gap-2 mt-1' }, [
                        // Role badge
                        m('span', {
                          class: `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${roleBadgeClass(item.role)}`
                        }, roleLabel(item.role)),
                        // Sub Perangkat Daerah badge
                        subOrg && m('span', {
                          class: 'inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-purple-50 text-purple-700 border border-purple-100'
                        }, [
                          m('i', { class: 'ri-building-2-line mr-1 text-[11px]' }),
                          subOrg.nama
                        ]),
                        // Penyedia badge (for vendor role)
                        penyediaLabel && m('span', {
                          class: 'inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-50 text-green-700 border border-green-100'
                        }, [
                          m('i', { class: 'ri-truck-line mr-1 text-[11px]' }),
                          penyediaLabel
                        ])
                      ])
                    ]),
                    m('div', { class: 'flex flex-col items-end space-y-1' }, [
                      m('button', {
                        class: 'text-blue-600 hover:text-blue-900 text-sm',
                        onclick: () => state.openUserModal('edit', item)
                      }, 'Edit'),
                      m('button', {
                        class: 'text-red-600 hover:text-red-900 text-sm',
                        onclick: () => state.deleteUser(item)
                      }, 'Hapus')
                    ])
                  ])
                ])
              })
            ),

      // User Modal
      state.showUserModal && m('div', {
        class: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
      }, [
        m('div', {
          class: 'bg-white rounded-lg p-6 w-full max-w-md mx-4'
        }, [
          m('div', { class: 'flex justify-between items-center mb-4' }, [
            m('h2', {
              class: 'text-xl font-bold text-gray-900'
            }, state.userModalMode === 'edit' ? 'Edit Pengguna' : 'Tambah Pengguna'),
            m('button', {
              class: 'text-gray-400 hover:text-gray-600',
              onclick: () => state.closeUserModal()
            }, [
              m('i', { class: 'ri-close-line text-xl' })
            ])
          ]),

          m('form', { class: 'space-y-4' }, [
            // Nama Lengkap
            m('div', [
              m('label', { class: 'block text-sm font-medium text-gray-700 mb-1' }, 'Nama Lengkap'),
              m('input', {
                type: 'text',
                class: `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  state.userErrors.namaLengkap ? 'border-red-500' : 'border-gray-300'
                }`,
                placeholder: 'Masukkan nama lengkap',
                value: state.userFormData.namaLengkap,
                oninput: e => { state.userFormData.namaLengkap = e.target.value }
              }),
              state.userErrors.namaLengkap && m('p', {
                class: 'mt-1 text-sm text-red-600'
              }, state.userErrors.namaLengkap)
            ]),

            // Username
            m('div', [
              m('label', { class: 'block text-sm font-medium text-gray-700 mb-1' }, 'Username'),
              m('input', {
                type: 'text',
                class: `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  state.userErrors.username ? 'border-red-500' : 'border-gray-300'
                }`,
                placeholder: 'Masukkan username',
                value: state.userFormData.username,
                oninput: e => { state.userFormData.username = e.target.value }
              }),
              state.userErrors.username && m('p', {
                class: 'mt-1 text-sm text-red-600'
              }, state.userErrors.username)
            ]),

            // Email
            m('div', [
              m('label', { class: 'block text-sm font-medium text-gray-700 mb-1' }, 'Email'),
              m('input', {
                type: 'email',
                class: `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  state.userErrors.email ? 'border-red-500' : 'border-gray-300'
                }`,
                placeholder: 'Masukkan email',
                value: state.userFormData.email,
                oninput: e => { state.userFormData.email = e.target.value }
              }),
              state.userErrors.email && m('p', {
                class: 'mt-1 text-sm text-red-600'
              }, state.userErrors.email)
            ]),

            // Password
            m('div', [
              m('label', {
                class: 'block text-sm font-medium text-gray-700 mb-1'
              }, state.userModalMode === 'edit'
                ? 'Password (kosongkan jika tidak ingin mengubah)'
                : 'Password'
              ),
              m('input', {
                type: 'password',
                class: `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  state.userErrors.password ? 'border-red-500' : 'border-gray-300'
                }`,
                placeholder: state.userModalMode === 'edit'
                  ? 'Password baru (opsional)'
                  : 'Masukkan password',
                value: state.userFormData.password,
                oninput: e => { state.userFormData.password = e.target.value }
              }),
              state.userErrors.password && m('p', {
                class: 'mt-1 text-sm text-red-600'
              }, state.userErrors.password)
            ]),

            // Role
            m('div', [
              m('label', {
                class: 'block text-sm font-medium text-gray-700 mb-1'
              }, 'Role'),
              m('select', {
                class: `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  state.userErrors.role ? 'border-red-500' : 'border-gray-300'
                }`,
                value: state.userFormData.role,
                oninput: e => { state.userFormData.role = e.target.value }
              }, [
                m('option', { value: 'operator' }, 'Operator'),
                m('option', { value: 'admin' }, 'Administrator'),
                m('option', { value: 'vendor' }, 'Penyedia B/J'),
                m('option', { value: 'pengawas' }, 'Pengawas')
              ]),
              state.userErrors.role && m('p', {
                class: 'mt-1 text-sm text-red-600'
              }, state.userErrors.role)
            ]),

            // Sub Organisasi (Operator optional, Pengawas mandatory)
            (state.userFormData.role === 'operator' || state.userFormData.role === 'pengawas') && m('div', [
              m('label', {
                class: 'block text-sm font-medium text-gray-700 mb-1'
              }, state.userFormData.role === 'pengawas'
                ? 'Sub Organisasi (Wajib untuk Pengawas)'
                : 'Sub Organisasi (Opsional)'
              ),
              state.isLoadingSubOrgForUsers
                ? m('div', { class: 'text-sm text-gray-500 py-2' }, 'Memuat...')
                : m('select', {
                    class: `w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      state.userFormData.role === 'pengawas' &&
                      !state.userFormData.subPerangkatDaerahId
                        ? 'border-red-400'
                        : ''
                    }`,
                    value: state.userFormData.subPerangkatDaerahId || '',
                    oninput: e => {
                      state.userFormData.subPerangkatDaerahId = e.target.value || null
                    }
                  }, [
                    m('option', {
                      value: '',
                      disabled: state.userFormData.role === 'pengawas'
                    }, state.userFormData.role === 'pengawas'
                      ? '-- Pilih Sub Organisasi (Wajib) --'
                      : '-- Tidak ada --'
                    ),
                    state.subPerangkatDaerahList.map(subOrg =>
                      m('option', { value: subOrg._id }, subOrg.nama)
                    )
                  ]),
              (state.userFormData.role === 'pengawas' &&
               !state.userFormData.subPerangkatDaerahId) && m('p', {
                class: 'mt-1 text-xs text-red-600'
              }, 'Pengawas wajib terikat pada satu Sub Organisasi untuk penugasan kontrak.')
            ]),

            // Penyedia (Vendor only)
            state.userFormData.role === 'vendor' && m('div', [
              m('label', {
                class: 'block text-sm font-medium text-gray-700 mb-1'
              }, 'Penyedia (Opsional)'),
              state.isLoadingPenyedia
                ? m('div', { class: 'text-sm text-gray-500 py-2' }, 'Memuat...')
                : m('select', {
                    class: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
                    value: state.userFormData.penyediaId || '',
                    oninput: e => {
                      state.userFormData.penyediaId = e.target.value || null
                    }
                  }, [
                    m('option', { value: '' }, '-- Tidak ada --'),
                    state.penyediaList.map(penyedia =>
                      m('option', {
                        value: penyedia._id
                      }, penyedia.NamaVendor || penyedia.nama || '(Tanpa Nama)')
                    )
                  ])
            ])
          ]),

          // Modal actions
          m('div', { class: 'flex justify-end space-x-3 mt-6' }, [
            m('button', {
              type: 'button',
              class: 'px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50',
              onclick: () => state.closeUserModal(),
              disabled: state.isLoadingUsers
            }, 'Batal'),
            m('button', {
              type: 'button',
              class: `px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 ${
                state.isLoadingUsers ? 'cursor-not-allowed opacity-50' : ''
              }`,
              onclick: () => state.saveUser(),
              disabled: state.isLoadingUsers
            }, state.isLoadingUsers
              ? 'Menyimpan...'
              : (state.userModalMode === 'edit' ? 'Perbarui' : 'Simpan'))
          ])
        ])
      ])
    ])
  }
}

export default PerangkatDaerahPengguna