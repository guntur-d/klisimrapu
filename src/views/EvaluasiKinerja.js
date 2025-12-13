import m from 'mithril'
import { UserUtils, APIUtils, ToastUtils } from '../js/utils.js'

const EvaluasiKinerja = {
  // State management
  isLoading: false,
  evaluasiList: [],
  filteredEvaluasi: [],

  // Selection states
  selectedSubPerangkatDaerah: null,
  availableSubPerangkatDaerah: [],
  availablePencapaian: [],

  // Modal states
  showModal: false,
  modalMode: 'create',
  isModalLoading: false,

  // Form data
  formData: {
    pencapaianId: '',
    kinerjaId: '',
    subPerangkatDaerahId: '',
    periodMonth: new Date().getMonth() + 1,
    periodYear: new Date().getFullYear(),
    budgetYear: '',
    achievementScore: '',
    documentationScore: '',
    overallScore: '',
    evaluationNotes: '',
    strengths: [''],
    improvements: [''],
    recommendations: [''],
    criteriaChecklist: [
      { criterion: 'Pencapaian target sesuai dengan yang ditetapkan', isMet: false, notes: '' },
      { criterion: 'Dokumentasi lengkap dan valid', isMet: false, notes: '' },
      { criterion: 'Laporan sesuai dengan format yang ditentukan', isMet: false, notes: '' },
      { criterion: 'Data akurat dan dapat dipertanggungjawabkan', isMet: false, notes: '' },
      { criterion: 'Tepat waktu dalam pelaporan', isMet: false, notes: '' }
    ]
  },

  // Filter and search
  searchQuery: '',
  selectedStatus: 'pending',
  selectedPeriodYear: 'all',
  selectedPeriodMonth: 'all',

  // Pagination
   currentPage: 1,
   itemsPerPage: 10,

   // PDF preview state for evaluation
   pdfPreviewUrl: null,
   pdfPreviewFile: null,
   isPdfLoading: false,
   selectedPencapaianFiles: [],

  // Helper functions
  formatDate: function(dateString) {
    if (!dateString) return '-'
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(new Date(dateString))
  },

  formatPercentage: function(value) {
    return new Intl.NumberFormat('id-ID', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format((value || 0) / 100)
  },

  formatMonth: function(month) {
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ]
    return monthNames[month - 1] || month
  },

  getStatusBadgeClass: function(status) {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800'
      case 'in_review': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'revision_required': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  },

  getStatusText: function(status) {
    switch (status) {
      case 'approved': return 'Disetujui'
      case 'in_review': return 'Sedang Ditinjau'
      case 'pending': return 'Menunggu Evaluasi'
      case 'rejected': return 'Ditolak'
      case 'revision_required': return 'Perlu Revisi'
      default: return status
    }
  },

  getGradeBadgeClass: function(grade) {
    switch (grade) {
      case 'A': return 'bg-green-100 text-green-800'
      case 'B': return 'bg-blue-100 text-blue-800'
      case 'C': return 'bg-yellow-100 text-yellow-800'
      case 'D': return 'bg-orange-100 text-orange-800'
      case 'E': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  },

  getGradeText: function(grade) {
    switch (grade) {
      case 'A': return 'Sangat Baik'
      case 'B': return 'Baik'
      case 'C': return 'Cukup'
      case 'D': return 'Kurang'
      case 'E': return 'Sangat Kurang'
      default: return grade
    }
  },

  // Load sub perangkat daerah
  loadSubPerangkatDaerah: async function() {
    try {
      const result = await APIUtils.getAll('subperangkatdaerah')
      this.availableSubPerangkatDaerah = result.data || []
    } catch (error) {
      console.error('Error loading sub perangkat daerah:', error)
      this.availableSubPerangkatDaerah = []
    }
  },

  // Load pencapaian for evaluation
  loadPencapaianForEvaluation: async function(subPerangkatDaerahId) {
    if (!subPerangkatDaerahId) {
      this.availablePencapaian = []
      return
    }

    try {
      // Use APIUtils.request for custom query with filters
      const result = await APIUtils.request(`/api/pencapaian?subPerangkatDaerahId=${subPerangkatDaerahId}&status=submitted`)
      this.availablePencapaian = result.data || []
      // Force redraw to update button state immediately
      m.redraw()
    } catch (error) {
      console.error('Error loading pencapaian for evaluation:', error)
      this.availablePencapaian = []
      m.redraw()
    }
  },

  // Load evaluasi data
  loadEvaluasi: async function(subPerangkatDaerahId, periodYear, periodMonth) {
    if (!UserUtils.isAuthenticated()) {
      ToastUtils.warning('Silakan masuk terlebih dahulu')
      m.route.set('/login')
      return
    }

    this.isLoading = true
    m.redraw()

    try {
      // Build query parameters
      const params = new URLSearchParams()
      if (subPerangkatDaerahId) {
        params.append('subPerangkatDaerahId', subPerangkatDaerahId)
      }
      if (periodYear && periodYear !== 'all') {
        params.append('periodYear', periodYear)
      }
      if (periodMonth && periodMonth !== 'all') {
        params.append('periodMonth', periodMonth)
      }
      if (this.selectedStatus !== 'all') {
        params.append('evaluationStatus', this.selectedStatus)
      }

      const url = `/api/evaluasi-kinerja${params.toString() ? '?' + params.toString() : ''}`
      console.log('Loading evaluasi with URL:', url)

      // Use APIUtils.request for custom query with authentication
      const result = await APIUtils.request(url)

      if (response.ok) {
        const result = await response.json()
        this.evaluasiList = result.data || []
        this.applyFilters()
        console.log('Loaded evaluasi data:', this.evaluasiList.length, 'items')

        if (this.evaluasiList.length > 0) {
          ToastUtils.success('Data evaluasi berhasil dimuat')
        }
      } else {
        this.evaluasiList = []
        this.filteredEvaluasi = []
        if (subPerangkatDaerahId) {
          ToastUtils.warning('Tidak ada data evaluasi untuk unit yang dipilih')
        } else {
          ToastUtils.info('Pilih unit kerja untuk melihat data evaluasi')
        }
      }

    } catch (error) {
      console.error('Error loading evaluasi:', error)
      ToastUtils.error('Gagal memuat data: ' + (error.message || 'Kesalahan tidak diketahui'))
      this.evaluasiList = []
      this.filteredEvaluasi = []
    } finally {
      this.isLoading = false
      m.redraw()
    }
  },

  // Apply filters
  applyFilters: function() {
    let filtered = [...this.evaluasiList]

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase()
      filtered = filtered.filter(item =>
        (item.pencapaianId?.kinerjaId?.subKegiatanId?.nama || '').toLowerCase().includes(query) ||
        (item.pencapaianId?.kinerjaId?.subKegiatanId?.kode || '').toLowerCase().includes(query) ||
        (item.evaluationNotes || '').toLowerCase().includes(query) ||
        (item.subPerangkatDaerahId?.nama || '').toLowerCase().includes(query)
      )
    }

    if (this.selectedStatus !== 'all') {
      filtered = filtered.filter(item => item.evaluationStatus === this.selectedStatus)
    }

    if (this.selectedPeriodYear !== 'all') {
      filtered = filtered.filter(item => item.periodYear === parseInt(this.selectedPeriodYear))
    }

    if (this.selectedPeriodMonth !== 'all') {
      filtered = filtered.filter(item => item.periodMonth === parseInt(this.selectedPeriodMonth))
    }

    this.filteredEvaluasi = filtered
    this.currentPage = 1
  },

  // Reset form
   resetForm: function() {
     this.formData = {
       pencapaianId: '',
       kinerjaId: '',
       subPerangkatDaerahId: this.selectedSubPerangkatDaerah?._id || '',
       periodMonth: new Date().getMonth() + 1,
       periodYear: new Date().getFullYear(),
       budgetYear: this.userData?.budgetYear || '',
       achievementScore: '',
       documentationScore: '',
       overallScore: '',
       evaluationNotes: '',
       strengths: [''],
       improvements: [''],
       recommendations: [''],
       criteriaChecklist: [
         { criterion: 'Pencapaian target sesuai dengan yang ditetapkan', isMet: false, notes: '' },
         { criterion: 'Dokumentasi lengkap dan valid', isMet: false, notes: '' },
         { criterion: 'Laporan sesuai dengan format yang ditentukan', isMet: false, notes: '' },
         { criterion: 'Data akurat dan dapat dipertanggungjawabkan', isMet: false, notes: '' },
         { criterion: 'Tepat waktu dalam pelaporan', isMet: false, notes: '' }
       ]
     }
     this.selectedPencapaianFiles = []
     this.clearPencapaianPdfPreview()
   },

  // Open create modal
   openCreateModal: function() {
     if (!this.selectedSubPerangkatDaerah) {
       ToastUtils.warning('Pilih unit kerja terlebih dahulu')
       return
     }

     // Allow opening modal even if no pencapaian available - user can still create draft evaluations
     this.modalMode = 'create'
     this.resetForm()
     this.showModal = true
   },

  // Open edit modal
  openEditModal: async function(evaluasi) {
    this.modalMode = 'edit'

    this.formData = {
      _id: evaluasi._id,
      pencapaianId: evaluasi.pencapaianId?._id || evaluasi.pencapaianId,
      kinerjaId: evaluasi.kinerjaId?._id || evaluasi.kinerjaId,
      subPerangkatDaerahId: evaluasi.subPerangkatDaerahId?._id || evaluasi.subPerangkatDaerahId,
      periodMonth: evaluasi.periodMonth,
      periodYear: evaluasi.periodYear,
      budgetYear: evaluasi.budgetYear,
      achievementScore: evaluasi.achievementScore,
      documentationScore: evaluasi.documentationScore,
      overallScore: evaluasi.overallScore,
      evaluationNotes: evaluasi.evaluationNotes || '',
      strengths: evaluasi.strengths?.length > 0 ? evaluasi.strengths : [''],
      improvements: evaluasi.improvements?.length > 0 ? evaluasi.improvements : [''],
      recommendations: evaluasi.recommendations?.length > 0 ? evaluasi.recommendations : [''],
      criteriaChecklist: evaluasi.criteriaChecklist?.length > 0 ? evaluasi.criteriaChecklist : [
        { criterion: 'Pencapaian target sesuai dengan yang ditetapkan', isMet: false, notes: '' },
        { criterion: 'Dokumentasi lengkap dan valid', isMet: false, notes: '' },
        { criterion: 'Laporan sesuai dengan format yang ditentukan', isMet: false, notes: '' },
        { criterion: 'Data akurat dan dapat dipertanggungjawabkan', isMet: false, notes: '' },
        { criterion: 'Tepat waktu dalam pelaporan', isMet: false, notes: '' }
      ]
    }

    // Set selections for UI
    this.selectedSubPerangkatDaerah = this.availableSubPerangkatDaerah.find(
      org => org._id === evaluasi.subPerangkatDaerahId?._id || org._id === evaluasi.subPerangkatDaerahId
    )

    // Load pencapaian files for PDF preview if editing
    if (evaluasi.pencapaianId) {
      this.loadPencapaianFiles(evaluasi.pencapaianId._id || evaluasi.pencapaianId)
    }

    this.showModal = true
  },

  // Close modal
   closeModal: function() {
     this.showModal = false
     this.resetForm()
     this.clearPencapaianPdfPreview()
   },

   // Load pencapaian files for PDF preview
   loadPencapaianFiles: async function(pencapaianId) {
     if (!pencapaianId) {
       this.selectedPencapaianFiles = []
       return
     }

     try {
       const token = JWTUtils.getToken()
       if (!token) return

       const response = await fetch(`/api/pencapaian/${pencapaianId}`, {
         headers: {
           'Authorization': `Bearer ${token}`,
           'Content-Type': 'application/json'
         }
       })

       if (response.ok) {
         const result = await response.json()
         this.selectedPencapaianFiles = result.data.evidenceFiles || []
         // Force redraw to show PDF files immediately
         m.redraw()
       } else {
         this.selectedPencapaianFiles = []
         // Force redraw even on error
         m.redraw()
       }
     } catch (error) {
       console.error('Error loading pencapaian files:', error)
       this.selectedPencapaianFiles = []
     }
   },

   // PDF Preview methods for evaluation
   clearPencapaianPdfPreview: function() {
     // Revoke the object URL to prevent memory leaks
     if (this.pdfPreviewUrl) {
       URL.revokeObjectURL(this.pdfPreviewUrl)
       this.pdfPreviewUrl = null
     }
     this.pdfPreviewFile = null
     this.isPdfLoading = false
   },

   previewPencapaianPdfFile: async function(file) {
     try {
       this.isPdfLoading = true
       this.clearPencapaianPdfPreview()
       m.redraw()

       // Get the selected pencapaian ID
       const selectedPencapaian = this.availablePencapaian.find(p => p._id === this.formData.pencapaianId)
       if (!selectedPencapaian) return

       const token = JWTUtils.getToken()
       if (!token) return

       const response = await fetch(`/api/pencapaian/${selectedPencapaian._id}/files/${file.filename}`, {
         headers: {
           'Authorization': `Bearer ${token}`,
           'Content-Type': 'application/json'
         }
       })

       if (response.ok) {
         const blob = await response.blob()
         this.pdfPreviewUrl = URL.createObjectURL(blob)
         this.pdfPreviewFile = {
           name: file.originalName,
           size: file.fileSize
         }

         ToastUtils.success('PDF berhasil dimuat untuk pratinjau')
       } else {
         throw new Error('Failed to fetch PDF file')
       }
     } catch (error) {
       console.error('Error creating PDF preview for pencapaian file:', error)
       ToastUtils.error('Gagal memuat pratinjau PDF')
       this.clearPencapaianPdfPreview()
     } finally {
       this.isPdfLoading = false
       m.redraw()
     }
   },

   openPencapaianPdfInNewTab: function() {
     if (this.pdfPreviewUrl) {
       window.open(this.pdfPreviewUrl, '_blank')
     }
   },

   formatPencapaianFileSize: function(bytes) {
     if (bytes === 0) return '0 Bytes'
     const k = 1024
     const sizes = ['Bytes', 'KB', 'MB', 'GB']
     const i = Math.floor(Math.log(bytes) / Math.log(k))
     return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
   },

  // Save item
  saveItem: async function() {
    if (!this.formData.pencapaianId) {
      ToastUtils.warning('Pilih laporan pencapaian yang akan dievaluasi')
      return
    }

    if (!this.formData.achievementScore || !this.formData.documentationScore) {
      ToastUtils.warning('Nilai pencapaian dan dokumentasi harus diisi')
      return
    }

    this.isModalLoading = true
    m.redraw()

    try {
      const token = JWTUtils.getToken()
      if (!token) {
        throw new Error('No authentication token found')
      }

      const method = this.modalMode === 'edit' ? 'PUT' : 'POST'
      const url = this.modalMode === 'edit'
        ? `/api/evaluasi-kinerja/${this.formData._id}`
        : '/api/evaluasi-kinerja'

      // Prepare request body
      let requestBody
      if (this.modalMode === 'edit') {
        requestBody = {
          evaluationNotes: this.formData.evaluationNotes,
          achievementScore: parseFloat(this.formData.achievementScore),
          documentationScore: parseFloat(this.formData.documentationScore),
          strengths: this.formData.strengths.filter(s => s.trim() !== ''),
          improvements: this.formData.improvements.filter(i => i.trim() !== ''),
          recommendations: this.formData.recommendations.filter(r => r.trim() !== ''),
          criteriaChecklist: this.formData.criteriaChecklist
        }
      } else {
        requestBody = {
          pencapaianId: this.formData.pencapaianId,
          evaluationNotes: this.formData.evaluationNotes,
          achievementScore: parseFloat(this.formData.achievementScore),
          documentationScore: parseFloat(this.formData.documentationScore),
          strengths: this.formData.strengths.filter(s => s.trim() !== ''),
          improvements: this.formData.improvements.filter(i => i.trim() !== ''),
          recommendations: this.formData.recommendations.filter(r => r.trim() !== '')
        }
      }

      // Use APIUtils.request for create/update operations
      const result = await APIUtils.request(url, {
        method: method,
        body: requestBody
      })

      ToastUtils.success(`Evaluasi berhasil di${this.modalMode === 'edit' ? 'perbarui' : 'simpan'}`)
      this.closeModal()
      this.loadEvaluasi()
    } catch (error) {
      console.error('Error saving evaluasi:', error)
      ToastUtils.error(`Gagal ${this.modalMode === 'edit' ? 'memperbarui' : 'menyimpan'} evaluasi`)
    } finally {
      this.isModalLoading = false
      m.redraw()
    }
  },

  // Approve evaluation
  approveEvaluation: async function(evaluasi) {
    ToastUtils.confirm(
      'Apakah Anda yakin ingin menyetujui evaluasi ini?',
      async () => {
        this.isLoading = true
        m.redraw()

        try {
          // Use APIUtils.request for approval operation
          await APIUtils.request(`/api/evaluasi-kinerja/${evaluasi._id}/approve`, {
            method: 'PUT',
            body: {
              notes: 'Evaluasi disetujui oleh supervisor'
            }
          })

          ToastUtils.success('Evaluasi berhasil disetujui')
          this.loadEvaluasi()
        } catch (error) {
          console.error('Error approving evaluation:', error)
          ToastUtils.error('Gagal menyetujui evaluasi')
        } finally {
          this.isLoading = false
          m.redraw()
        }
      },
      () => {
        ToastUtils.info('Persetujuan dibatalkan')
      }
    )
  },

  // Reject evaluation
  rejectEvaluation: async function(evaluasi) {
    const reason = prompt('Masukkan alasan penolakan:')
    if (!reason || !reason.trim()) {
      ToastUtils.warning('Alasan penolakan harus diisi')
      return
    }

    this.isLoading = true
    m.redraw()

    try {
      // Use APIUtils.request for rejection operation
      await APIUtils.request(`/api/evaluasi-kinerja/${evaluasi._id}/reject`, {
        method: 'PUT',
        body: { reason }
      })

      ToastUtils.success('Evaluasi berhasil ditolak')
      this.loadEvaluasi()
    } catch (error) {
      console.error('Error rejecting evaluation:', error)
      ToastUtils.error('Gagal menolak evaluasi')
    } finally {
      this.isLoading = false
      m.redraw()
    }
  },

  // Request revision
  requestRevision: async function(evaluasi) {
    const requirements = prompt('Masukkan persyaratan revisi (pisahkan dengan koma):')
    if (!requirements || !requirements.trim()) {
      ToastUtils.warning('Persyaratan revisi harus diisi')
      return
    }

    const notes = prompt('Catatan tambahan (opsional):')

    this.isLoading = true
    m.redraw()

    try {

      const response = await fetch(`/api/evaluasi-kinerja/${evaluasi._id}/revision`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requirements: requirements.split(',').map(r => r.trim()),
          notes
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      ToastUtils.success('Permintaan revisi berhasil dikirim')
      this.loadEvaluasi()
    } catch (error) {
      console.error('Error requesting revision:', error)
      ToastUtils.error('Gagal meminta revisi')
    } finally {
      this.isLoading = false
      m.redraw()
    }
  },

  // Add item to array
  addArrayItem: function(arrayName) {
    this.formData[arrayName].push('')
    m.redraw()
  },

  // Remove item from array
  removeArrayItem: function(arrayName, index) {
    if (this.formData[arrayName].length > 1) {
      this.formData[arrayName].splice(index, 1)
      m.redraw()
    }
  },

  // Update array item
  updateArrayItem: function(arrayName, index, value) {
    this.formData[arrayName][index] = value
  },

  // Pagination helpers
  getTotalPages: function() {
    return Math.ceil(this.filteredEvaluasi.length / this.itemsPerPage)
  },

  getPaginatedEvaluasi: function() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage
    const endIndex = startIndex + this.itemsPerPage
    return this.filteredEvaluasi.slice(startIndex, endIndex)
  },

  changePage: function(page) {
    if (page >= 1 && page <= this.getTotalPages()) {
      this.currentPage = page
      m.redraw()
    }
  },

  // Initialize component
  oninit: function() {
    if (!UserUtils.isAuthenticated()) {
      ToastUtils.warning('Silakan masuk terlebih dahulu')
      m.route.set('/login')
      return
    }

    if (this.vnode && this.vnode.attrs && this.vnode.attrs.setTitle) {
      this.vnode.attrs.setTitle('Evaluasi Kinerja')
    }

    this.userData = UserUtils.getUserData()

    if (this.userData.budgetYear && typeof this.userData.budgetYear === 'object') {
      this.userData.budgetYear = `${this.userData.budgetYear.year}-${this.userData.budgetYear.status}`
    }

    this.loadSubPerangkatDaerah()
    // Don't load evaluasi initially - wait for unit selection
  },

  // Main view
  view: function() {
    return m('div', { class: 'space-y-6' }, [

      // Header with selections
      m('div', { class: 'bg-white rounded-xl shadow-sm border border-gray-200 p-6' }, [
        m('div', { class: 'flex justify-between items-center mb-6' }, [
          m('div', [
            m('h1', { class: 'text-2xl font-bold text-gray-900' }, 'Evaluasi Kinerja'),
            m('p', { class: 'text-gray-600 mt-1' }, 'Evaluasi dan berikan penilaian terhadap laporan pencapaian kinerja')
          ]),
          m('button', {
            class: 'inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl',
            onclick: () => this.openCreateModal(),
            disabled: !this.selectedSubPerangkatDaerah
          }, [
            m('i', { class: 'ri-add-line mr-2' }),
            'Buat Evaluasi'
          ])
        ]),

        // Unit Selection
        m('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-6' }, [
          // Sub Perangkat Daerah Selection
          m('div', [
            m('label', { class: 'block text-sm font-semibold text-gray-800 mb-3' }, [
              m('i', { class: 'ri-building-line mr-2 text-blue-500' }),
              'Unit Kerja'
            ]),

            // Selected Unit Display
            this.selectedSubPerangkatDaerah && m('div', {
              class: 'bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4'
            }, [
              m('div', { class: 'flex items-center justify-between' }, [
                m('div', [
                  m('div', { class: 'font-semibold text-blue-900 text-lg' }, this.selectedSubPerangkatDaerah.nama),
                  m('div', { class: 'text-sm text-blue-700 mt-1' }, `Pimpinan: ${this.selectedSubPerangkatDaerah.pimpinan}`)
                ]),
                m('button', {
                  type: 'button',
                  class: 'text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-100',
                  onclick: () => {
                    this.selectedSubPerangkatDaerah = null
                    this.availablePencapaian = []
                    this.evaluasiList = []
                    this.filteredEvaluasi = []
                  }
                }, [
                  m('i', { class: 'ri-close-fill' })
                ])
              ])
            ]),

            m('select', {
              class: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white',
              value: this.selectedSubPerangkatDaerah?._id || '',
              onchange: (e) => {
                const selectedId = e.target.value
                this.selectedSubPerangkatDaerah = this.availableSubPerangkatDaerah.find(
                  org => org._id === selectedId
                )
                this.loadPencapaianForEvaluation(selectedId)
                this.availablePencapaian = []

                // Reload evaluasi data when unit changes
                if (selectedId) {
                  this.loadEvaluasi(selectedId, this.selectedPeriodYear !== 'all' ? this.selectedPeriodYear : null, this.selectedPeriodMonth !== 'all' ? this.selectedPeriodMonth : null)
                } else {
                  this.evaluasiList = []
                  this.filteredEvaluasi = []
                }

                // Force immediate redraw to update button state
                m.redraw()
              }
            }, [
              m('option', { value: '' }, 'Pilih Unit Kerja'),
              (this.availableSubPerangkatDaerah || []).map(org =>
                m('option', {
                  value: org._id,
                  key: org._id
                }, org.nama)
              )
            ])
          ]),

          // Pencapaian Count Display
          m('div', [
            m('label', { class: 'block text-sm font-semibold text-gray-800 mb-3' }, [
              m('i', { class: 'ri-trophy-line mr-2 text-green-500' }),
              'Laporan Pencapaian'
            ]),
            m('div', {
              class: 'w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700'
            }, [
              m('div', { class: 'flex items-center justify-between' }, [
                m('span', `Jumlah Laporan: ${this.availablePencapaian.length}`),
                this.selectedSubPerangkatDaerah && m('div', { class: 'flex items-center space-x-2' }, [
                  m('i', { class: 'ri-information-line text-blue-500' }),
                  m('span', { class: 'text-sm text-blue-600' }, 'Laporan siap dievaluasi')
                ])
              ])
            ])
          ])
        ])
      ]),

      // Search and filters (only show when selections are made)
      this.selectedSubPerangkatDaerah && m('div', { class: 'bg-white rounded-xl shadow-sm border border-gray-200 p-6' }, [
        m('div', { class: 'grid grid-cols-1 md:grid-cols-5 gap-4' }, [
          // Search input
          m('div', [
            m('label', { class: 'block text-sm font-medium text-gray-700 mb-2' }, 'Pencarian'),
            m('div', { class: 'relative' }, [
              m('input', {
                type: 'text',
                class: 'w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                placeholder: 'Cari subkegiatan atau catatan...',
                value: this.searchQuery,
                oninput: (e) => {
                  this.searchQuery = e.target.value
                  this.applyFilters()
                }
              }),
              m('div', { class: 'absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none' }, [
                m('i', { class: 'ri-search-line text-gray-400' })
              ])
            ])
          ]),

          // Status filter
          m('div', [
            m('label', { class: 'block text-sm font-medium text-gray-700 mb-2' }, 'Status'),
            m('select', {
              class: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              value: this.selectedStatus,
              onchange: (e) => {
                this.selectedStatus = e.target.value
                this.applyFilters()
              }
            }, [
              m('option', { value: 'all' }, 'Semua Status'),
              m('option', { value: 'pending' }, 'Menunggu Evaluasi'),
              m('option', { value: 'in_review' }, 'Sedang Ditinjau'),
              m('option', { value: 'approved' }, 'Disetujui'),
              m('option', { value: 'rejected' }, 'Ditolak'),
              m('option', { value: 'revision_required' }, 'Perlu Revisi')
            ])
          ]),

          // Year filter
          m('div', [
            m('label', { class: 'block text-sm font-medium text-gray-700 mb-2' }, 'Tahun'),
            m('select', {
              class: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              value: this.selectedPeriodYear,
              onchange: (e) => {
                this.selectedPeriodYear = e.target.value
                this.applyFilters()
              }
            }, [
              m('option', { value: 'all' }, 'Semua Tahun'),
              m('option', { value: '2024' }, '2024'),
              m('option', { value: '2025' }, '2025'),
              m('option', { value: '2026' }, '2026')
            ])
          ]),

          // Month filter
          m('div', [
            m('label', { class: 'block text-sm font-medium text-gray-700 mb-2' }, 'Bulan'),
            m('select', {
              class: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              value: this.selectedPeriodMonth,
              onchange: (e) => {
                this.selectedPeriodMonth = e.target.value
                this.applyFilters()
              }
            }, [
              m('option', { value: 'all' }, 'Semua Bulan'),
              m('option', { value: '1' }, 'Januari'),
              m('option', { value: '2' }, 'Februari'),
              m('option', { value: '3' }, 'Maret'),
              m('option', { value: '4' }, 'April'),
              m('option', { value: '5' }, 'Mei'),
              m('option', { value: '6' }, 'Juni'),
              m('option', { value: '7' }, 'Juli'),
              m('option', { value: '8' }, 'Agustus'),
              m('option', { value: '9' }, 'September'),
              m('option', { value: '10' }, 'Oktober'),
              m('option', { value: '11' }, 'November'),
              m('option', { value: '12' }, 'Desember')
            ])
          ]),

          // Results info
          m('div', { class: 'flex items-end' }, [
            m('div', { class: 'text-sm text-gray-600' }, [
              m('div', `Menampilkan ${this.filteredEvaluasi.length} dari ${this.evaluasiList.length} evaluasi`),
              this.searchQuery && m('div', { class: 'text-blue-600' }, `Pencarian: "${this.searchQuery}"`)
            ])
          ])
        ])
      ]),

      // Loading indicator
      this.isLoading ?
        m('div', { class: 'flex justify-center items-center h-64' }, [
          m('div', { class: 'w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin' })
        ]) :

        // Show table or empty state
        this.selectedSubPerangkatDaerah ?
          this.filteredEvaluasi.length === 0 ?
            // Empty state
            m('div', { class: 'bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden' }, [
              m('div', { class: 'text-center py-12' }, [
                m('div', { class: 'mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-4' }, [
                  m('i', { class: 'ri-clipboard-fill text-blue-500' })
                ]),
                m('h3', { class: 'text-lg font-medium text-gray-900 mb-2' }, 'Belum ada data evaluasi'),
                m('p', { class: 'text-gray-500 mb-6 max-w-sm mx-auto' }, 'Evaluasi kinerja tersedia setelah ada laporan pencapaian yang diajukan'),
                // Show button when unit is selected, regardless of available pencapaian
                this.selectedSubPerangkatDaerah && m('div', { class: 'space-y-3' }, [
                  m('button', {
                    class: 'inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl',
                    onclick: () => this.openCreateModal()
                  }, [
                    m('i', { class: 'ri-add-line mr-2' }),
                    'Buat Evaluasi'
                  ]),
                  m('p', { class: 'text-xs text-gray-500' }, 'Buat evaluasi baru untuk laporan pencapaian yang tersedia')
                ])
              ])
            ]) :
            // Evaluasi table
            m('div', { class: 'bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden' }, [
              m('div', { class: 'overflow-x-auto' }, [
                m('table', { class: 'min-w-full divide-y divide-gray-200' }, [
                  m('thead', { class: 'bg-gray-50' }, [
                    m('tr', [
                      m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'SubKegiatan'),
                      m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Periode'),
                      m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Nilai'),
                      m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Grade'),
                      m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Status'),
                      m('th', { class: 'px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Aksi')
                    ])
                  ]),
                  m('tbody', { class: 'bg-white divide-y divide-gray-200' },
                    (this.getPaginatedEvaluasi() || []).map(evaluasi => [
                      m('tr', { class: 'hover:bg-gray-50' }, [
                        m('td', { class: 'px-6 py-4' }, [
                          m('div', { class: 'text-sm font-medium text-gray-900' }, [
                            (evaluasi.pencapaianId?.kinerjaId?.subKegiatanId?.kode || evaluasi.kinerjaId?.subKegiatanId?.kode) && m('span', { class: 'font-mono text-xs text-gray-500 mr-2' }, evaluasi.pencapaianId?.kinerjaId?.subKegiatanId?.kode || evaluasi.kinerjaId?.subKegiatanId?.kode),
                            evaluasi.pencapaianId?.kinerjaId?.subKegiatanId?.nama || evaluasi.kinerjaId?.subKegiatanId?.nama || 'SubKegiatan tidak ditemukan'
                          ]),
                          m('div', { class: 'text-sm text-gray-500 mt-1' }, [
                            m('span', { class: 'font-medium' }, 'Pencapaian: '),
                            evaluasi.pencapaianId?.achievementValue?.toLocaleString('id-ID') || 'N/A'
                          ])
                        ]),
                        m('td', { class: 'px-6 py-4 whitespace-nowrap' }, [
                          m('div', { class: 'text-sm text-gray-900' }, [
                            m('div', { class: 'font-semibold' }, `${this.formatMonth(evaluasi.periodMonth)} ${evaluasi.periodYear}`)
                          ])
                        ]),
                        m('td', { class: 'px-6 py-4 whitespace-nowrap' }, [
                          m('div', { class: 'text-sm text-center' }, [
                            m('div', { class: 'grid grid-cols-3 gap-2 text-xs' }, [
                              m('div', [
                                m('div', { class: 'font-medium text-blue-600' }, evaluasi.achievementScore || '-'),
                                m('div', { class: 'text-gray-500' }, 'Capaian')
                              ]),
                              m('div', [
                                m('div', { class: 'font-medium text-green-600' }, evaluasi.documentationScore || '-'),
                                m('div', { class: 'text-gray-500' }, 'Dokumen')
                              ]),
                              m('div', [
                                m('div', { class: 'font-bold text-lg text-purple-600' }, evaluasi.overallScore || '-'),
                                m('div', { class: 'text-gray-500' }, 'Total')
                              ])
                            ])
                          ])
                        ]),
                        m('td', { class: 'px-6 py-4 whitespace-nowrap' }, [
                          m('span', {
                            class: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${this.getGradeBadgeClass(evaluasi.performanceGrade)}`
                          }, this.getGradeText(evaluasi.performanceGrade))
                        ]),
                        m('td', { class: 'px-6 py-4 whitespace-nowrap' }, [
                          m('span', {
                            class: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${this.getStatusBadgeClass(evaluasi.evaluationStatus)}`
                          }, this.getStatusText(evaluasi.evaluationStatus))
                        ]),
                        m('td', { class: 'px-6 py-4 whitespace-nowrap text-right text-sm font-medium' }, [
                          m('div', { class: 'flex justify-end space-x-2' }, [
                            m('button', {
                              class: 'text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-50',
                              onclick: () => this.openEditModal(evaluasi),
                              title: 'Edit'
                            }, [
                              m('i', { class: 'ri-edit-line text-lg' })
                            ]),
                            evaluasi.evaluationStatus === 'in_review' && m('button', {
                              class: 'text-green-600 hover:text-green-900 p-1 rounded-full hover:bg-green-50',
                              onclick: () => this.approveEvaluation(evaluasi),
                              title: 'Setujui'
                            }, [
                              m('i', { class: 'ri-check-line text-lg' })
                            ]),
                            (evaluasi.evaluationStatus === 'in_review' || evaluasi.evaluationStatus === 'pending') && m('button', {
                              class: 'text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50',
                              onclick: () => this.rejectEvaluation(evaluasi),
                              title: 'Tolak'
                            }, [
                              m('i', { class: 'ri-close-fill' })
                            ]),
                            evaluasi.evaluationStatus === 'in_review' && m('button', {
                              class: 'text-orange-600 hover:text-orange-900 p-1 rounded-full hover:bg-orange-50',
                              onclick: () => this.requestRevision(evaluasi),
                              title: 'Minta Revisi'
                            }, [
                              m('i', { class: 'ri-refresh-line text-lg' })
                            ])
                          ])
                        ])
                      ])
                    ])
                  )
                ])
              ]),

              // Pagination
              this.getTotalPages() > 1 && m('div', { class: 'bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6' }, [
                m('div', { class: 'flex-1 flex justify-between sm:hidden' }, [
                  m('button', {
                    class: `relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                      this.currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`,
                    onclick: () => this.changePage(this.currentPage - 1),
                    disabled: this.currentPage === 1
                  }, 'Sebelumnya'),
                  m('button', {
                    class: `ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                      this.currentPage === this.getTotalPages() ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`,
                    onclick: () => this.changePage(this.currentPage + 1),
                    disabled: this.currentPage === this.getTotalPages()
                  }, 'Selanjutnya')
                ]),
                m('div', { class: 'hidden sm:flex-1 sm:flex sm:items-center sm:justify-between' }, [
                  m('div', [
                    m('p', { class: 'text-sm text-gray-700' }, [
                      'Menampilkan ',
                      m('span', { class: 'font-medium' }, ((this.currentPage - 1) * this.itemsPerPage) + 1),
                      ' sampai ',
                      m('span', { class: 'font-medium' }, Math.min(this.currentPage * this.itemsPerPage, this.filteredEvaluasi.length)),
                      ' dari ',
                      m('span', { class: 'font-medium' }, this.filteredEvaluasi.length),
                      ' hasil'
                    ])
                  ]),
                  m('div', [
                    m('nav', { class: 'relative z-0 inline-flex rounded-md shadow-sm -space-x-px' }, [
                      // Previous button
                      m('button', {
                        class: `relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                          this.currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                        }`,
                        onclick: () => this.changePage(this.currentPage - 1),
                        disabled: this.currentPage === 1
                      }, [
                        m('i', { class: 'ri-arrow-left-s-line' })
                      ]),

                      // Page numbers (show max 5 pages)
                      Array.from({ length: Math.min(5, this.getTotalPages() || 0) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(this.getTotalPages() - 4, this.currentPage - 2)) + i
                        return m('button', {
                          class: `relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${
                            pageNum === this.currentPage ? 'z-10 bg-blue-50 border-blue-500 text-blue-600' : 'text-gray-500 hover:bg-gray-50'
                          }`,
                          onclick: () => this.changePage(pageNum)
                        }, pageNum)
                      }),

                      // Next button
                      m('button', {
                        class: `relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                          this.currentPage === this.getTotalPages() ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                        }`,
                        onclick: () => this.changePage(this.currentPage + 1),
                        disabled: this.currentPage === this.getTotalPages()
                      }, [
                        m('i', { class: 'ri-arrow-right-s-line' })
                      ])
                    ])
                  ])
                ])
              ])
            ]) :
          // Instructions when no selections made
          m('div', { class: 'bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden' }, [
            m('div', { class: 'text-center py-12' }, [
              m('div', { class: 'mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4' }, [
                m('i', { class: 'ri-information-line text-blue-400 text-2xl' })
              ]),
              m('h3', { class: 'text-lg font-medium text-gray-900 mb-2' }, 'Pilih Unit Kerja'),
              m('p', { class: 'text-gray-500 max-w-md mx-auto' }, 'Pilih unit kerja untuk melihat semua evaluasi kinerja yang telah dibuat. Untuk membuat evaluasi baru, unit kerja harus memiliki laporan pencapaian yang telah diajukan.')
            ])
          ]),

      // Modal for creating/editing evaluasi
      this.showModal && m('div', {
        class: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4',
        onclick: (e) => e.target === e.currentTarget && this.closeModal()
      }, [
        m('div', {
          class: 'bg-white rounded-xl shadow-2xl max-w-6xl w-full mx-4 transform transition-all max-h-[95vh] overflow-y-auto',
          onclick: (e) => e.stopPropagation()
        }, [
          // Modal Header
          m('div', {
            class: `bg-gradient-to-r ${this.modalMode === 'create' ? 'from-blue-500 to-purple-600' : 'from-green-500 to-blue-600'} text-white p-6 rounded-t-xl`
          }, [
            m('div', { class: 'flex items-center justify-between' }, [
              m('div', { class: 'flex items-center space-x-3' }, [
                m('div', {
                  class: 'w-8 h-8 bg-blue-600 bg-opacity-25 rounded-full flex items-center justify-center'
                }, [
                  m('i', {
                    class: `ri-${this.modalMode === 'create' ? 'add' : 'edit'}-line text-xl text-white`
                  })
                ]),
                m('div', [
                  m('h3', { class: 'text-xl font-bold' }, [
                    `${this.modalMode === 'create' ? 'Buat' : 'Edit'} Evaluasi Kinerja`
                  ]),
                  m('p', {
                    class: 'text-white text-opacity-80 text-sm'
                  }, [
                    this.modalMode === 'create'
                      ? 'Evaluasi laporan pencapaian kinerja'
                      : 'Perbarui evaluasi kinerja'
                  ])
                ])
              ]),
              m('button', {
                class: 'w-8 h-8 bg-blue-600 bg-opacity-25 rounded-full flex items-center justify-center',
                onclick: () => this.closeModal()
              }, [
                m('i', { class: 'ri-close-fill' })
              ])
            ])
          ]),

          // Modal Body
          m('div', { class: 'p-8' }, [
            // Unit and Pencapaian Selection
            m('div', { class: 'mb-8' }, [
              m('h4', { class: 'text-xl font-semibold text-gray-800 mb-6 flex items-center' }, [
                m('i', { class: 'ri-building-line mr-3 text-blue-500' }),
                'Pemilihan Unit dan Laporan'
              ]),

              m('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-6' }, [
                // Sub Perangkat Daerah Selection
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-3' }, [
                    m('i', { class: 'ri-building-line mr-2 text-blue-500' }),
                    'Unit Kerja'
                  ]),
                  this.modalMode === 'edit' ? [
                    // Read-only display for edit mode
                    m('div', {
                      class: 'w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700'
                    }, this.selectedSubPerangkatDaerah ? this.selectedSubPerangkatDaerah.nama : 'Unit kerja tidak ditemukan')
                  ] : [
                    // Editable select for create mode
                    m('select', {
                      class: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white',
                      value: this.formData.subPerangkatDaerahId,
                      onchange: (e) => {
                        this.formData.subPerangkatDaerahId = e.target.value
                        this.selectedSubPerangkatDaerah = this.availableSubPerangkatDaerah.find(
                          org => org._id === e.target.value
                        )
                        this.loadPencapaianForEvaluation(e.target.value)
                        this.formData.pencapaianId = ''
                      },
                      disabled: this.isModalLoading
                    }, [
                      m('option', { value: '' }, 'Pilih Unit Kerja'),
                      (this.availableSubPerangkatDaerah || []).map(org =>
                        m('option', {
                          value: org._id,
                          key: org._id
                        }, org.nama)
                      )
                    ])
                  ]
                ]),

                // Pencapaian Selection
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-3' }, [
                    m('i', { class: 'ri-trophy-line mr-2 text-green-500' }),
                    'Laporan Pencapaian'
                  ]),
                  this.modalMode === 'edit' ? [
                    // Read-only display for edit mode
                    m('div', {
                      class: 'w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700'
                    }, 'Laporan pencapaian yang dievaluasi')
                  ] : [
                    // Editable select for create mode
                    m('select', {
                      class: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white',
                      value: this.formData.pencapaianId,
                      onchange: (e) => {
                        this.formData.pencapaianId = e.target.value
                        // Load files for the selected pencapaian for PDF preview
                        if (e.target.value) {
                          this.loadPencapaianFiles(e.target.value)
                        } else {
                          this.selectedPencapaianFiles = []
                          this.clearPencapaianPdfPreview()
                        }
                      },
                      disabled: this.isModalLoading || !this.formData.subPerangkatDaerahId
                    }, [
                      m('option', { value: '' }, 'Pilih Laporan Pencapaian'),
                      (this.availablePencapaian || []).map(pencapaian =>
                        m('option', {
                          value: pencapaian._id,
                          key: pencapaian._id
                        }, `${pencapaian.kinerjaId?.subKegiatanId?.nama} - ${this.formatMonth(pencapaian.periodMonth)} ${pencapaian.periodYear}`)
                      )
                    ])
                  ]
                ])
              ])
            ]),

            // Pencapaian Details Display (for context)
            this.formData.pencapaianId && m('div', { class: 'mb-8' }, [
              m('h4', { class: 'text-xl font-semibold text-gray-800 mb-6 flex items-center' }, [
                m('i', { class: 'ri-information-line mr-3 text-purple-500' }),
                'Detail Pencapaian'
              ]),

              m('div', { class: 'bg-purple-50 border border-purple-200 rounded-lg p-6' }, [
                m('div', { class: 'grid grid-cols-1 md:grid-cols-4 gap-4 text-sm' }, [
                  m('div', { class: 'text-center' }, [
                    m('div', { class: 'text-lg font-bold text-purple-600' }, 'Target'),
                    m('div', { class: 'text-gray-600' }, 'Nilai yang harus dicapai')
                  ]),
                  m('div', { class: 'text-center' }, [
                    m('div', { class: 'text-lg font-bold text-blue-600' }, 'Aktual'),
                    m('div', { class: 'text-gray-600' }, 'Nilai yang dicapai')
                  ]),
                  m('div', { class: 'text-center' }, [
                    m('div', { class: 'text-lg font-bold text-green-600' }, 'Capaian %'),
                    m('div', { class: 'text-gray-600' }, 'Persentase pencapaian')
                  ]),
                  m('div', { class: 'text-center' }, [
                    m('div', { class: 'text-lg font-bold text-orange-600' }, 'Status'),
                    m('div', { class: 'text-gray-600' }, 'Status laporan')
                  ])
                ])
              ]),

              // PDF Files Preview Section
              this.selectedPencapaianFiles.length > 0 && m('div', { class: 'mt-6' }, [
                m('div', { class: 'border-t border-purple-200 pt-6' }, [
                  m('h5', { class: 'text-lg font-semibold text-gray-800 mb-4 flex items-center' }, [
                    m('i', { class: 'ri-file-pdf-line mr-2 text-red-500' }),
                    'Dokumen Bukti Pencapaian'
                  ]),

                  // PDF Preview
                  this.pdfPreviewFile && m('div', { class: 'mb-4' }, [
                    m('div', { class: 'bg-gray-50 rounded-lg p-4 border border-gray-200' }, [
                      m('div', { class: 'flex items-center justify-between mb-3' }, [
                        m('h6', { class: 'text-sm font-medium text-gray-700 flex items-center' }, [
                          m('i', { class: 'ri-file-pdf-line text-red-500 mr-2' }),
                          'Pratinjau PDF'
                        ]),
                        m('div', { class: 'flex space-x-2' }, [
                          m('button', {
                            class: 'text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-100',
                            onclick: () => this.openPencapaianPdfInNewTab(),
                            title: 'Buka di tab baru'
                          }, [
                            m('i', { class: 'ri-external-link-line text-sm' })
                          ]),
                          m('button', {
                            class: 'text-gray-600 hover:text-gray-800 p-1 rounded-full hover:bg-gray-100',
                            onclick: () => this.clearPencapaianPdfPreview(),
                            title: 'Tutup pratinjau'
                          }, [
                            m('i', { class: 'ri-close-fill text-sm' })
                          ])
                        ])
                      ]),
                      m('div', { class: 'text-xs text-gray-600 mb-2' }, [
                        m('span', { class: 'font-medium' }, 'File: '),
                        this.pdfPreviewFile.name,
                        m('br'),
                        m('span', { class: 'font-medium' }, 'Ukuran: '),
                        this.formatPencapaianFileSize(this.pdfPreviewFile.size)
                      ]),
                      this.isPdfLoading ?
                        m('div', { class: 'flex items-center justify-center py-8' }, [
                          m('i', { class: 'ri-loader-4-line text-2xl text-blue-500 animate-spin mr-2' }),
                          m('span', { class: 'text-sm text-gray-600' }, 'Memuat pratinjau...')
                        ]) :
                        m('div', { class: 'bg-white border rounded-lg p-4 text-center' }, [
                          m('iframe', {
                            src: this.pdfPreviewUrl,
                            class: 'w-full h-64 border-0 rounded',
                            title: 'PDF Preview'
                          }, ''),
                          m('p', { class: 'text-xs text-gray-500 mt-2' }, 'Pratinjau dokumen bukti pencapaian')
                        ])
                    ])
                  ]),

                  // PDF Files List
                  m('div', { class: 'space-y-3' }, [
                    m('h6', { class: 'text-sm font-medium text-gray-700' }, 'File yang tersedia:'),
                    this.selectedPencapaianFiles.map(file =>
                      m('div', {
                        class: 'flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-200',
                        key: file.filename
                      }, [
                        m('div', { class: 'flex items-center space-x-3' }, [
                          m('i', { class: 'ri-file-pdf-line text-red-500 text-lg' }),
                          m('div', [
                            m('div', { class: 'text-sm font-medium text-gray-900' }, file.originalName),
                            m('div', { class: 'text-xs text-gray-500' }, [
                              this.formatPencapaianFileSize(file.fileSize),
                              ' • ',
                              'Diunggah: ',
                              new Intl.DateTimeFormat('id-ID', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }).format(new Date(file.uploadedAt))
                            ])
                          ])
                        ]),
                        m('div', { class: 'flex space-x-2' }, [
                          // Show preview button for PDF files
                          (file.originalName.toLowerCase().endsWith('.pdf') || file.filename.toLowerCase().endsWith('.pdf')) &&
                          m('button', {
                            class: 'text-green-600 hover:text-green-800 p-1 rounded-full hover:bg-green-100',
                            onclick: () => this.previewPencapaianPdfFile(file),
                            title: 'Pratinjau PDF'
                          }, [
                            m('i', { class: 'ri-eye-line text-sm' })
                          ]),
                          m('button', {
                            class: 'text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-100',
                            onclick: () => {
                              // Download file using pencapaian ID
                              const selectedPencapaian = this.availablePencapaian.find(p => p._id === this.formData.pencapaianId)
                              if (selectedPencapaian) {
                                window.open(`/api/pencapaian/${selectedPencapaian._id}/files/${file.filename}`, '_blank')
                              }
                            },
                            title: 'Unduh'
                          }, [
                            m('i', { class: 'ri-download-line text-sm' })
                          ])
                        ])
                      ])
                    )
                  ])
                ])
              ])
            ]),

            // Evaluation Scores Section
            m('div', { class: 'mb-8' }, [
              m('h4', { class: 'text-xl font-semibold text-gray-800 mb-6 flex items-center' }, [
                m('i', { class: 'ri-star-line mr-3 text-orange-500' }),
                'Penilaian Evaluasi'
              ]),

              m('div', { class: 'grid grid-cols-1 md:grid-cols-3 gap-6' }, [
                // Achievement Score
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-3' }, [
                    m('i', { class: 'ri-trophy-line mr-2 text-blue-500' }),
                    'Nilai Pencapaian (0-100)'
                  ]),
                  m('input', {
                    type: 'number',
                    class: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white',
                    placeholder: 'Masukkan nilai pencapaian',
                    value: this.formData.achievementScore,
                    oninput: (e) => {
                      this.formData.achievementScore = e.target.value
                      // Auto-calculate overall score
                      if (this.formData.achievementScore && this.formData.documentationScore) {
                        this.formData.overallScore = Math.round((parseFloat(this.formData.achievementScore) + parseFloat(this.formData.documentationScore)) / 2)
                      }
                    },
                    min: '0',
                    max: '100',
                    step: '0.1',
                    disabled: this.isModalLoading
                  })
                ]),

                // Documentation Score
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-3' }, [
                    m('i', { class: 'ri-file-text-line mr-2 text-green-500' }),
                    'Nilai Dokumentasi (0-100)'
                  ]),
                  m('input', {
                    type: 'number',
                    class: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white',
                    placeholder: 'Masukkan nilai dokumentasi',
                    value: this.formData.documentationScore,
                    oninput: (e) => {
                      this.formData.documentationScore = e.target.value
                      // Auto-calculate overall score
                      if (this.formData.achievementScore && this.formData.documentationScore) {
                        this.formData.overallScore = Math.round((parseFloat(this.formData.achievementScore) + parseFloat(this.formData.documentationScore)) / 2)
                      }
                    },
                    min: '0',
                    max: '100',
                    step: '0.1',
                    disabled: this.isModalLoading
                  })
                ]),

                // Overall Score (read-only)
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-3' }, [
                    m('i', { class: 'ri-calculator-line mr-2 text-purple-500' }),
                    'Nilai Keseluruhan'
                  ]),
                  m('input', {
                    type: 'number',
                    class: 'w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700',
                    value: this.formData.overallScore,
                    disabled: true
                  })
                ])
              ])
            ]),

            // Evaluation Notes
            m('div', { class: 'mb-8' }, [
              m('h4', { class: 'text-xl font-semibold text-gray-800 mb-6 flex items-center' }, [
                m('i', { class: 'ri-file-text-line mr-3 text-gray-500' }),
                'Catatan Evaluasi'
              ]),

              m('div', { class: 'mb-6' }, [
                m('label', { class: 'block text-sm font-semibold text-gray-800 mb-3' }, 'Catatan Evaluator'),
                m('textarea', {
                  class: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 bg-white resize-vertical',
                  placeholder: 'Catatan dan feedback dari evaluator',
                  value: this.formData.evaluationNotes,
                  oninput: (e) => this.formData.evaluationNotes = e.target.value,
                  rows: 4,
                  disabled: this.isModalLoading
                })
              ])
            ]),

            // Strengths, Improvements, Recommendations
            m('div', { class: 'mb-8' }, [
              m('h4', { class: 'text-xl font-semibold text-gray-800 mb-6 flex items-center' }, [
                m('i', { class: 'ri-feedback-line mr-3 text-blue-500' }),
                'Analisis dan Rekomendasi'
              ]),

              m('div', { class: 'grid grid-cols-1 md:grid-cols-3 gap-6' }, [
                // Strengths
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-3' }, [
                    m('i', { class: 'ri-thumb-up-line mr-2 text-green-500' }),
                    'Kekuatan'
                  ]),
                  m('div', { class: 'space-y-2' }, [
                    this.formData.strengths.map((strength, index) =>
                      m('div', { class: 'flex items-center space-x-2', key: index }, [
                        m('input', {
                          type: 'text',
                          class: 'flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white',
                          placeholder: 'Kekuatan yang ditemukan',
                          value: strength,
                          oninput: (e) => this.updateArrayItem('strengths', index, e.target.value),
                          disabled: this.isModalLoading
                        }),
                        this.formData.strengths.length > 1 && m('button', {
                          class: 'text-red-500 hover:text-red-700 p-1',
                          onclick: () => this.removeArrayItem('strengths', index),
                          disabled: this.isModalLoading
                        }, [
                          m('i', { class: 'ri-subtract-line' })
                        ])
                      ])
                    ),
                    m('button', {
                      class: 'w-full px-3 py-2 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors',
                      onclick: () => this.addArrayItem('strengths'),
                      disabled: this.isModalLoading
                    }, [
                      m('i', { class: 'ri-add-line mr-2' }),
                      'Tambah Kekuatan'
                    ])
                  ])
                ]),

                // Improvements
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-3' }, [
                    m('i', { class: 'ri-arrow-up-line mr-2 text-blue-500' }),
                    'Area Perbaikan'
                  ]),
                  m('div', { class: 'space-y-2' }, [
                    this.formData.improvements.map((improvement, index) =>
                      m('div', { class: 'flex items-center space-x-2', key: index }, [
                        m('input', {
                          type: 'text',
                          class: 'flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white',
                          placeholder: 'Area yang perlu diperbaiki',
                          value: improvement,
                          oninput: (e) => this.updateArrayItem('improvements', index, e.target.value),
                          disabled: this.isModalLoading
                        }),
                        this.formData.improvements.length > 1 && m('button', {
                          class: 'text-red-500 hover:text-red-700 p-1',
                          onclick: () => this.removeArrayItem('improvements', index),
                          disabled: this.isModalLoading
                        }, [
                          m('i', { class: 'ri-subtract-line' })
                        ])
                      ])
                    ),
                    m('button', {
                      class: 'w-full px-3 py-2 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors',
                      onclick: () => this.addArrayItem('improvements'),
                      disabled: this.isModalLoading
                    }, [
                      m('i', { class: 'ri-add-line mr-2' }),
                      'Tambah Area Perbaikan'
                    ])
                  ])
                ]),

                // Recommendations
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-3' }, [
                    m('i', { class: 'ri-lightbulb-line mr-2 text-yellow-500' }),
                    'Rekomendasi'
                  ]),
                  m('div', { class: 'space-y-2' }, [
                    this.formData.recommendations.map((recommendation, index) =>
                      m('div', { class: 'flex items-center space-x-2', key: index }, [
                        m('input', {
                          type: 'text',
                          class: 'flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white',
                          placeholder: 'Rekomendasi untuk perbaikan',
                          value: recommendation,
                          oninput: (e) => this.updateArrayItem('recommendations', index, e.target.value),
                          disabled: this.isModalLoading
                        }),
                        this.formData.recommendations.length > 1 && m('button', {
                          class: 'text-red-500 hover:text-red-700 p-1',
                          onclick: () => this.removeArrayItem('recommendations', index),
                          disabled: this.isModalLoading
                        }, [
                          m('i', { class: 'ri-subtract-line' })
                        ])
                      ])
                    ),
                    m('button', {
                      class: 'w-full px-3 py-2 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors',
                      onclick: () => this.addArrayItem('recommendations'),
                      disabled: this.isModalLoading
                    }, [
                      m('i', { class: 'ri-add-line mr-2' }),
                      'Tambah Rekomendasi'
                    ])
                  ])
                ])
              ])
            ]),

            // Criteria Checklist
            m('div', { class: 'mb-8' }, [
              m('h4', { class: 'text-xl font-semibold text-gray-800 mb-6 flex items-center' }, [
                m('i', { class: 'ri-checkbox-line mr-3 text-green-500' }),
                'Checklist Kriteria'
              ]),

              m('div', { class: 'bg-gray-50 rounded-lg p-6 border border-gray-200' }, [
                m('div', { class: 'space-y-4' }, [
                  this.formData.criteriaChecklist.map((criteria, index) =>
                    m('div', {
                      class: 'flex items-start space-x-3 p-3 bg-white rounded-lg border border-gray-200',
                      key: index
                    }, [
                      m('input', {
                        type: 'checkbox',
                        class: 'mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded',
                        checked: criteria.isMet,
                        onchange: (e) => {
                          this.formData.criteriaChecklist[index].isMet = e.target.checked
                        },
                        disabled: this.isModalLoading
                      }),
                      m('div', { class: 'flex-1' }, [
                        m('div', { class: 'font-medium text-gray-900' }, criteria.criterion),
                        m('textarea', {
                          class: 'w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none',
                          placeholder: 'Catatan untuk kriteria ini',
                          value: criteria.notes,
                          oninput: (e) => {
                            this.formData.criteriaChecklist[index].notes = e.target.value
                          },
                          rows: 2,
                          disabled: this.isModalLoading
                        })
                      ])
                    ])
                  )
                ])
              ])
            ])
          ]),

          // Modal Actions
          m('div', {
            class: 'flex justify-end gap-4 pt-6 border-t border-gray-200 bg-gray-50 px-8 py-6 rounded-b-xl'
          }, [
            m('button', {
              class: 'px-8 py-3 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg text-gray-700 font-medium transition-colors',
              onclick: () => this.closeModal(),
              disabled: this.isModalLoading
            }, [
              m('i', { class: 'ri-close-fill mr-2' }),
              'Batal'
            ]),

            m('button', {
              class: `px-8 py-3 ${this.isModalLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'} text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl`,
              disabled: this.isModalLoading,
              onclick: () => this.saveItem()
            }, [
              this.isModalLoading ? m('i', { class: 'ri-loader-4-line animate-spin mr-2' }) : m('i', { class: 'ri-save-line mr-2' }),
              this.isModalLoading ? 'Menyimpan...' : 'Simpan Evaluasi'
            ])
          ])
        ])
      ])
    ])
  }
}

export default EvaluasiKinerja