import m from 'mithril'

const PerangkatDaerahPengawasLapangan = {
  view: function(vnode) {
    const state = vnode.attrs.state

    // Helper: resolve selected pengawas
    const selectedPengawas = state.selectedPengawasId
      ? (state.pengawasList || []).find(p => p._id === state.selectedPengawasId) || null
      : null

    // Build assigned kontrak set for quick lookup
    const assignedSet = new Set(
      (state.pengawasAssignments || [])
        .filter(a => a.kontrakId)
        .map(a => (typeof a.kontrakId === 'object' ? a.kontrakId._id : a.kontrakId))
    )

    // Filter kontrak by search query
    const q = (state.kontrakSearchQuery || '').toLowerCase()
    const filteredKontrak = (state.kontrakList || []).filter(k => {
      if (!q) return true
      const noKontrak = (k.noKontrak || '').toLowerCase()
      const sirup = (k.kodeSirupLkpp || '').toLowerCase()
      const lokasi = (k.lokasi || '').toLowerCase()
      return noKontrak.includes(q) || sirup.includes(q) || lokasi.includes(q)
    })

    // Persist selected kontrak IDs in parent state so checked state survives redraws
    if (!Array.isArray(state.selectedKontrakIds)) {
      state.selectedKontrakIds = []
    }

    const toggleKontrakSelection = (id, checked) => {
      const current = new Set(state.selectedKontrakIds || [])
      if (checked) {
        current.add(id)
      } else {
        current.delete(id)
      }
      state.selectedKontrakIds = Array.from(current)
    }

    return m('div', { class: 'space-y-6' }, [
      // Header
      m('div', { class: 'flex flex-col md:flex-row md:items-center md:justify-between gap-4' }, [
        m('div', [
          m('h3', { class: 'text-lg font-semibold text-gray-900' }, 'Pengawas Lapangan'),
          m('p', { class: 'text-sm text-gray-600 mt-1' },
            'Kelola penugasan kontrak kepada Pengawas berdasarkan Surat Keputusan (SK).')
        ])
      ]),

      // Layout grid
      m('div', { class: 'grid grid-cols-1 lg:grid-cols-3 gap-6' }, [
        // Left: daftar pengawas
        m('div', { class: 'bg-white rounded-xl border border-gray-200 p-4 space-y-3' }, [
          m('div', { class: 'flex items-center justify-between mb-1' }, [
            m('h4', {
              class: 'text-sm font-semibold text-gray-800 flex items-center gap-2'
            }, [
              m('i', { class: 'ri-shield-user-line text-blue-500' }),
              'Daftar Pengawas'
            ]),
            state.isLoadingPengawasList && m('div', {
              class: 'w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin'
            })
          ]),

          (!state.pengawasList || state.pengawasList.length === 0) && !state.isLoadingPengawasList
            ? m('p', {
                class: 'text-sm text-gray-500'
              }, 'Belum ada pengguna dengan peran Pengawas. Tambahkan pada tab Pengguna.')
            : m('div', {
                class: 'space-y-1 max-h-72 overflow-y-auto'
              },
              (state.pengawasList || []).map(p =>
                m('button', {
                  key: p._id,
                  class: `w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ${
                    state.selectedPengawasId === p._id
                      ? 'bg-blue-50 border-blue-400 text-blue-700'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`,
                  onclick: () => {
                    state.selectedPengawasId = p._id
                    state.loadPengawasAssignments && state.loadPengawasAssignments(p._id)
                  }
                }, [
                  m('div', { class: 'font-semibold truncate' }, p.username || p.email),
                  p.subPerangkatDaerahId && m('div', {
                    class: 'flex items-center gap-1 text-xs text-purple-700 mt-0.5'
                  }, [
                    m('i', { class: 'ri-building-2-line' }),
                    typeof p.subPerangkatDaerahId === 'object'
                      ? (p.subPerangkatDaerahId.nama || 'Sub Organisasi')
                      : 'Sub Organisasi Pengawas'
                  ])
                ])
              )
            ),

          selectedPengawas && m('div', {
            class: 'mt-3 p-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800'
          }, [
            m('div', { class: 'font-semibold mb-1' }, 'Pengawas terpilih'),
            m('div', selectedPengawas.username || selectedPengawas.email)
          ])
        ]),

        // Right: SK + kontrak (2 cols)
        m('div', {
          class: 'lg:col-span-2 bg-white rounded-xl border border-gray-200 p-4 space-y-4'
        }, [
          // SK form
          m('div', { class: 'space-y-3 border-b border-gray-100 pb-3' }, [
            m('h4', {
              class: 'text-sm font-semibold text-gray-800 flex items-center gap-2'
            }, [
              m('i', { class: 'ri-file-shield-2-line text-green-500' }),
              'Surat Keputusan (SK) Penugasan'
            ]),
            m('div', {
              class: 'grid grid-cols-1 md:grid-cols-3 gap-3 text-sm'
            }, [
              m('div', [
                m('label', {
                  class: 'block text-[11px] font-medium text-gray-700 mb-1'
                }, 'Nomor SK'),
                m('input', {
                  type: 'text',
                  class: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
                  value: state.skForm.skNumber,
                  oninput: e => { state.skForm.skNumber = e.target.value }
                })
              ]),
              m('div', [
                m('label', {
                  class: 'block text-[11px] font-medium text-gray-700 mb-1'
                }, 'Tanggal SK'),
                m('input', {
                  type: 'date',
                  class: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
                  value: state.skForm.skDate,
                  oninput: e => { state.skForm.skDate = e.target.value }
                })
              ]),
              m('div', [
                m('label', {
                  class: 'block text-[11px] font-medium text-gray-700 mb-1'
                }, 'File SK (PDF, maks 1MB)'),
                m('input', {
                  type: 'file',
                  accept: 'application/pdf',
                  class: 'w-full text-[10px] px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
                  onchange: e => state.handleSkFileChange && state.handleSkFileChange(e)
                }),
                state.skForm.fileName && m('div', { class: 'mt-1 space-y-1' }, [
                  m('p', {
                    class: 'text-[10px] text-gray-600'
                  }, `${state.skForm.fileName} (${(state.skForm.fileSize / 1024).toFixed(1)} KB)`),
                  m('button', {
                    type: 'button',
                    class: 'border border-gray-200 rounded-md bg-gray-50 px-2 py-1 flex items-center gap-1 hover:bg-gray-100 text-[10px] text-blue-700',
                    onclick: () => {
                      console.log('Preview SK clicked', {
                        hasLocalFile: !!(state.skForm && state.skForm.file),
                        fileName: state.skForm && state.skForm.fileName,
                        assignmentsCount: (state.pengawasAssignments || []).length,
                        selectedPengawasId: state.selectedPengawasId
                      });

                      // Mode 1: Local preview for newly selected file
                      if (state.skForm && state.skForm.file) {
                        try {
                          const url = URL.createObjectURL(state.skForm.file);
                          console.log('Preview SK - opening local blob URL', url);
                          window.open(url, '_blank', 'noopener');
                        } catch (e) {
                          console.error('Preview SK - failed to open local file', e);
                        }
                        return;
                      }

                      // Mode 2: Existing SK from persisted assignments
                      const assignments = state.pengawasAssignments || [];
                      if (!state.selectedPengawasId || !assignments.length) {
                        console.warn('Preview SK: no pengawasAssignments available or no pengawas selected');
                        return;
                      }

                      const assignmentWithSk =
                        assignments.find(a => a.skFile && a.skFile.filename) || assignments[0];

                      console.log('Preview SK - chosen assignment for preview', assignmentWithSk);

                      if (!assignmentWithSk || !assignmentWithSk._id) {
                        console.warn('Preview SK: no assignment with valid _id found');
                        return;
                      }

                      const token = (typeof window !== 'undefined' &&
                        window.localStorage &&
                        window.localStorage.getItem('token')) || null;

                      if (!token) {
                        console.warn('Preview SK: no auth token found in localStorage');
                        return;
                      }

                      const url = `/api/pengawas-kontrak/${assignmentWithSk._id}/sk-file`;
                      console.log('Preview SK - requesting from backend', url);

                      const xhr = new XMLHttpRequest();
                      xhr.open('GET', url, true);
                      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                      xhr.responseType = 'blob';

                      xhr.onload = function() {
                        console.log('Preview SK - XHR load status', xhr.status);
                        if (xhr.status === 200) {
                          const blob = xhr.response;
                          if (!blob) {
                            console.error('Preview SK: empty blob response');
                            return;
                          }
                          const blobUrl = URL.createObjectURL(blob);
                          console.log('Preview SK - opening blob URL', blobUrl);
                          window.open(blobUrl, '_blank', 'noopener');
                        } else {
                          console.error('Preview SK: gagal memuat file SK:', xhr.status);
                          try {
                            const reader = new FileReader();
                            reader.onload = () => {
                              console.error('Preview SK error body:', reader.result);
                            };
                            if (xhr.response) {
                              reader.readAsText(xhr.response);
                            }
                          } catch (e) {
                            // ignore
                          }
                        }
                      };

                      xhr.onerror = function() {
                        console.error('Preview SK: kesalahan jaringan saat memuat file SK');
                      };

                      xhr.send();
                    }
                  }, [
                    m('i', { class: 'ri-file-pdf-line text-red-500 text-xs' }),
                    m('span', 'Buka pratinjau SK (PDF)')
                  ])
                ]),
                state.skErrors.file && m('p', {
                  class: 'mt-1 text-[10px] text-red-600'
                }, state.skErrors.file)
              ])
            ])
          ]),

          // Kontrak list + actions
          m('div', { class: 'space-y-3' }, [
            m('div', {
              class: 'flex flex-col md:flex-row md:items-center md:justify-between gap-3'
            }, [
              m('div', [
                m('h4', {
                  class: 'text-sm font-semibold text-gray-800'
                }, 'Daftar Kontrak'),
                m('p', {
                  class: 'text-sm text-gray-500'
                }, 'Pilih kontrak yang akan ditugaskan kepada Pengawas terpilih berdasarkan SK di atas.')
              ]),
              m('div', { class: 'flex items-center gap-2' }, [
                m('div', { class: 'relative' }, [
                  m('input', {
                    type: 'text',
                    placeholder: 'Cari kontrak (nomor / SIRUP / lokasi)...',
                    class: 'w-56 pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
                    value: state.kontrakSearchQuery,
                    oninput: e => { state.kontrakSearchQuery = e.target.value }
                  }),
                  m('i', {
                    class: 'ri-search-line text-gray-400 text-xs absolute left-2.5 top-1/2 -translate-y-1/2'
                  })
                ])
              ])
            ]),

            state.isLoadingKontrakList
              ? m('div', {
                  class: 'flex justify-center items-center py-10'
                }, [
                  m('div', {
                    class: 'w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin'
                  })
                ])
              : filteredKontrak.length === 0
                ? m('p', {
                    class: 'text-sm text-gray-500 py-6'
                  }, 'Belum ada data kontrak untuk ditampilkan.')
                : (() => {
                    return m('div', { class: 'space-y-3' }, [
                      m('div', {
                        class: 'border border-gray-200 rounded-lg max-h-72 overflow-y-auto'
                      },
                        filteredKontrak.map(kontrak => {
                          const id = kontrak._id
                          const isAssigned = assignedSet.has(id)
                          const isSelected = (state.selectedKontrakIds || []).includes(id)

                          return m('label', {
                            key: id,
                            class: `flex items-start gap-2 px-3 py-2 border-b last:border-b-0 text-xs cursor-pointer hover:bg-blue-50 ${
                              isAssigned ? 'bg-green-50/60' : 'bg-white'
                            }`
                          }, [
                            m('input', {
                              type: 'checkbox',
                              class: 'mt-1 w-3 h-3 text-blue-600 border-gray-300 rounded',
                              // Allow toggling even if already assigned so user can release/assign in batch
                              disabled: !state.selectedPengawasId,
                              checked: isSelected,
                              onclick: e => {
                                if (!state.selectedPengawasId) {
                                  e.preventDefault()
                                  return
                                }
                                toggleKontrakSelection(id, e.target.checked)
                                e.stopPropagation()
                              }
                            }),
                            m('div', { class: 'flex-1 space-y-0.5' }, [
                              m('div', { class: 'flex items-center gap-2' }, [
                                m('span', {
                                  class: 'font-semibold text-gray-800'
                                }, kontrak.noKontrak),
                                isAssigned && m('span', {
                                  class: 'inline-flex items-center px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200'
                                }, [
                                  m('i', { class: 'ri-check-double-line mr-1' }),
                                  'Sudah ditugaskan'
                                ])
                              ]),
                              m('div', {
                                class: 'text-gray-600'
                              }, kontrak.kodeSirupLkpp || '-'),
                              m('div', {
                                class: 'text-gray-500'
                              }, kontrak.lokasi || '-')
                            ])
                          ])
                        })
                      ),
                      m('div', {
                        class: 'flex justify-end gap-2 pt-2'
                      }, [
                        m('button', {
                          type: 'button',
                          class: 'px-3 py-1.5 text-xs border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50',
                          onclick: () => {
                            // Reset SK form and current selection, but keep assignments for reference
                            state.skForm = {
                              skNumber: '',
                              skDate: '',
                              file: null,
                              fileName: '',
                              fileSize: 0
                            }
                            state.skErrors = {}
                            state.selectedKontrakIds = []
                          }
                        }, 'Reset SK'),
                        m('button', {
                          type: 'button',
                          class: `px-4 py-1.5 text-xs rounded-md text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 flex items-center gap-1 ${
                            !state.selectedPengawasId
                              ? 'opacity-60 cursor-not-allowed'
                              : ''
                          }`,
                          // Enabled when a pengawas is selected:
                          // - allows adding/removing kontrak and updating SK data in one save
                          disabled: !state.selectedPengawasId,
                          onclick: () => {
                            if (!state.submitPengawasAssignments || !state.selectedPengawasId) return

                            // Target set = all checked kontrak in UI.
                            // This set can:
                            // - include previously assigned kontrak (kept)
                            // - add new kontrak (new assignments)
                            // - exclude previously assigned kontrak (release them)
                            const targetKontrakIds = Array.from(new Set(state.selectedKontrakIds || []))

                            console.log('Simpan / Update Penugasan clicked', {
                              selectedPengawasId: state.selectedPengawasId,
                              targetKontrakIds
                            })

                            state.submitPengawasAssignments(targetKontrakIds)
                          }
                        }, [
                          m('i', { class: 'ri-save-line text-[11px]' }),
                          'Simpan / Update Penugasan'
                        ])
                      ])
                    ])
                  })()
          ])
        ])
      ])
    ])
  }
}

export default PerangkatDaerahPengawasLapangan