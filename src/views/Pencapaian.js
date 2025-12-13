import m from 'mithril'
import { UserUtils, APIUtils, ToastUtils } from '../js/utils.js'

const Pencapaian = {
  // State management
  isLoading: false,
  pencapaianList: [],
  filteredPencapaian: [],

  // Selection states
   selectedSubPerangkatDaerah: null,
   availableSubPerangkatDaerah: [],
   availableKinerja: [],
   isLoadingSubPerangkatDaerah: false,

  // Modal states
  showModal: false,
  modalMode: 'create',
  isModalLoading: false,

  // Form data
  formData: {
    kinerjaId: '',
    subPerangkatDaerahId: '',
    anggaranId: '',
    budgetYear: '',
    periodMonth: new Date().getMonth() + 1,
    periodYear: new Date().getFullYear(),
    achievementValue: '',
    achievementType: 'numeric',
    description: ''
  },

  // File upload state
    uploadedFiles: [],
    isUploadingFile: false,
    tempUploadedFiles: [],

   // PDF preview state
     pdfPreviewUrl: null,
     pdfPreviewFile: null,
     isPdfLoading: false,
 
     // File input reference
     fileInputRef: null,

  // Filter and search
  searchQuery: '',
  selectedPeriodYear: 'all',
  selectedPeriodMonth: 'all',

  // Pagination
  currentPage: 1,
  itemsPerPage: 10,

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


  getAchievementTypeBadgeClass: function(type) {
    switch (type) {
      case 'numeric': return 'bg-blue-100 text-blue-800'
      case 'descriptive': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  },

  getAchievementTypeText: function(type) {
    switch (type) {
      case 'numeric': return 'Numerik'
      case 'descriptive': return 'Deskriptif'
      default: return type
    }
  },

  // Load sub perangkat daerah
  loadSubPerangkatDaerah: async function() {
    try {
      this.isLoadingSubPerangkatDaerah = true
      m.redraw()

      // Use APIUtils.getAll() for loading sub perangkat daerah
      const result = await APIUtils.getAll('subperangkatdaerah')
      this.availableSubPerangkatDaerah = result.data || []
    } catch (error) {
      console.error('Error loading sub perangkat daerah:', error)
    } finally {
      this.isLoadingSubPerangkatDaerah = false
      m.redraw()
    }
  },

  // Load kinerja for selected unit
  loadKinerjaForSubPerangkatDaerah: async function(subPerangkatDaerahId) {
    if (!subPerangkatDaerahId) {
      this.availableKinerja = []
      m.redraw()
      return
    }

    try {
      // Use APIUtils.request for custom query
      const result = await APIUtils.request(`/api/pencapaian/kinerja?subPerangkatDaerahId=${subPerangkatDaerahId}`)
      this.availableKinerja = result.data || []
      console.log(`Loaded ${this.availableKinerja.length} kinerja for unit ${subPerangkatDaerahId}`)
    } catch (error) {
      console.error('Error loading kinerja:', error)
      this.availableKinerja = []
    } finally {
      // Always redraw to update the UI (especially the Tambah button)
      m.redraw()
    }
  },

  // Load pencapaian data
  loadPencapaian: async function(subPerangkatDaerahId, periodYear, periodMonth) {
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

      const url = `/api/pencapaian${params.toString() ? '?' + params.toString() : ''}`
      console.log('Loading pencapaian with URL:', url)

      // Use APIUtils.request for custom query
      const result = await APIUtils.request(url)

      // Filter data to ensure it belongs to the selected unit kerja
      let rawData = result.data || []
      if (subPerangkatDaerahId && rawData.length > 0) {
        rawData = rawData.filter(pencapaian => {
          const pencapaianUnitId = pencapaian.subPerangkatDaerahId?._id || pencapaian.subPerangkatDaerahId
          return pencapaianUnitId === subPerangkatDaerahId
        })
        console.log(`Filtered pencapaian data: ${rawData.length} items for unit ${subPerangkatDaerahId}`)
      }

      this.pencapaianList = rawData
      this.applyFilters()
      console.log('Loaded pencapaian data:', this.pencapaianList.length, 'items')

      // Check if we have data but missing subkegiatan info
      if (this.pencapaianList.length > 0) {
        const hasMissingSubKegiatan = this.pencapaianList.some(p =>
          !p.kinerjaId?.subKegiatanId?.nama
        )

        if (hasMissingSubKegiatan) {
          console.warn('Some pencapaian items are missing subKegiatan information')
        }

        ToastUtils.success('Data pencapaian berhasil dimuat')
      }

    } catch (error) {
      console.error('Error loading pencapaian:', error)
      toast.error('Gagal memuat data: ' + (error.message || 'Kesalahan tidak diketahui'))
      this.pencapaianList = []
      this.filteredPencapaian = []
    } finally {
      this.isLoading = false
      m.redraw()
    }
  },

  // Apply filters
  applyFilters: function() {
    let filtered = [...this.pencapaianList]

    // Additional safety filter: ensure all items belong to selected unit kerja
    if (this.selectedSubPerangkatDaerah) {
      const selectedUnitId = this.selectedSubPerangkatDaerah._id
      filtered = filtered.filter(item => {
        const itemUnitId = item.subPerangkatDaerahId?._id || item.subPerangkatDaerahId
        return itemUnitId === selectedUnitId
      })
    }

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase()
      filtered = filtered.filter(item =>
        (item.kinerjaId?.subKegiatanId?.nama || '').toLowerCase().includes(query) ||
        (item.kinerjaId?.subKegiatanId?.kode || '').toLowerCase().includes(query) ||
        (item.description || '').toLowerCase().includes(query) ||
        (item.subPerangkatDaerahId?.nama || '').toLowerCase().includes(query)
      )
    }


    if (this.selectedPeriodYear !== 'all') {
      filtered = filtered.filter(item => item.periodYear === parseInt(this.selectedPeriodYear))
    }

    if (this.selectedPeriodMonth !== 'all') {
      filtered = filtered.filter(item => item.periodMonth === parseInt(this.selectedPeriodMonth))
    }

    this.filteredPencapaian = filtered
    this.currentPage = 1
  },

  // Reset form
    resetForm: function() {
      this.formData = {
        kinerjaId: '',
        subPerangkatDaerahId: this.selectedSubPerangkatDaerah?._id || '',
        anggaranId: '',
        budgetYear: this.userData?.budgetYear || '',
        periodMonth: new Date().getMonth() + 1,
        periodYear: new Date().getFullYear(),
        achievementValue: '',
        achievementType: 'numeric',
        description: ''
      }
      this.uploadedFiles = []
      this.tempUploadedFiles = []
      this.clearPdfPreview()
    },

  // Open create modal
  openCreateModal: function() {
    if (!this.selectedSubPerangkatDaerah) {
      toast.warning('Pilih unit kerja terlebih dahulu')
      return
    }

    if (this.availableKinerja.length === 0) {
      toast.warning('Tidak ada target kinerja untuk unit kerja ini')
      return
    }

    this.modalMode = 'create'
    this.resetForm()
    this.showModal = true
  },

  // Open edit modal
  openEditModal: async function(pencapaian) {
    this.modalMode = 'edit'

    // Load the full kinerja data for this pencapaian
    try {
      const token = JWTUtils.getToken()
      if (token && pencapaian.kinerjaId) {
        const response = await fetch(`/api/kinerja/${pencapaian.kinerjaId._id || pencapaian.kinerjaId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const kinerjaResult = await response.json()
          const fullKinerja = kinerjaResult.data

          this.formData = {
            _id: pencapaian._id,
            kinerjaId: fullKinerja,
            subPerangkatDaerahId: pencapaian.subPerangkatDaerahId?._id || pencapaian.subPerangkatDaerahId,
            anggaranId: pencapaian.anggaranId?._id || pencapaian.anggaranId,
            budgetYear: pencapaian.budgetYear,
            periodMonth: pencapaian.periodMonth,
            periodYear: pencapaian.periodYear,
            achievementValue: pencapaian.achievementValue,
            achievementType: pencapaian.achievementType,
            description: pencapaian.description || ''
          }
        } else {
          // Fallback to basic data if full kinerja load fails
          this.formData = {
            _id: pencapaian._id,
            kinerjaId: pencapaian.kinerjaId,
            subPerangkatDaerahId: pencapaian.subPerangkatDaerahId?._id || pencapaian.subPerangkatDaerahId,
            anggaranId: pencapaian.anggaranId?._id || pencapaian.anggaranId,
            budgetYear: pencapaian.budgetYear,
            periodMonth: pencapaian.periodMonth,
            periodYear: pencapaian.periodYear,
            achievementValue: pencapaian.achievementValue,
            achievementType: pencapaian.achievementType,
            description: pencapaian.description || ''
          }
        }
      } else {
        // Fallback if no token or kinerjaId
        this.formData = {
          _id: pencapaian._id,
          kinerjaId: pencapaian.kinerjaId,
          subPerangkatDaerahId: pencapaian.subPerangkatDaerahId?._id || pencapaian.subPerangkatDaerahId,
          anggaranId: pencapaian.anggaranId?._id || pencapaian.anggaranId,
          budgetYear: pencapaian.budgetYear,
          periodMonth: pencapaian.periodMonth,
          periodYear: pencapaian.periodYear,
          achievementValue: pencapaian.achievementValue,
          achievementType: pencapaian.achievementType,
          description: pencapaian.description || ''
        }
      }
    } catch (error) {
      console.error('Error loading kinerja for edit modal:', error)
      // Fallback to basic data
      this.formData = {
        _id: pencapaian._id,
        kinerjaId: pencapaian.kinerjaId,
        subPerangkatDaerahId: pencapaian.subPerangkatDaerahId?._id || pencapaian.subPerangkatDaerahId,
        anggaranId: pencapaian.anggaranId?._id || pencapaian.anggaranId,
        budgetYear: pencapaian.budgetYear,
        periodMonth: pencapaian.periodMonth,
        periodYear: pencapaian.periodYear,
        achievementValue: pencapaian.achievementValue,
        achievementType: pencapaian.achievementType,
        description: pencapaian.description || ''
      }
    }

    // Set selections for UI (preserve existing selection if possible)
    if (!this.selectedSubPerangkatDaerah) {
      this.selectedSubPerangkatDaerah = this.availableSubPerangkatDaerah.find(
        org => org._id === pencapaian.subPerangkatDaerahId?._id || org._id === pencapaian.subPerangkatDaerahId
      )
    }

    // Load uploaded files for this pencapaian
    this.loadUploadedFiles()

    this.showModal = true
  },

  // Close modal
   closeModal: function() {
     this.showModal = false
     this.resetForm()
     this.clearPdfPreview()
   },

  // File handling methods
   handleFileUpload: async function(file) {
     if (!file) return

     // Validate file type (PDF only)
     if (file.type !== 'application/pdf') {
       toast.error('Hanya file PDF yang diperbolehkan')
       return
     }

     // Validate file size (1 MB limit)
     if (file.size > 1024 * 1024) {
       toast.error('Ukuran file tidak boleh melebihi 1 MB')
       return
     }

     // Show PDF preview immediately
     await this.renderPdfPreview(file)

     this.isUploadingFile = true
     m.redraw()

     try {
       const token = JWTUtils.getToken()
       if (!token) {
         throw new Error('No authentication token found')
       }

       // Create FormData for multipart upload
       const formData = new FormData()
       formData.append('file', file)

       console.log('Frontend - File being uploaded:', {
         name: file.name,
         type: file.type,
         size: file.size,
         firstBytes: file.slice(0, 10)
       })

       // For new pencapaian, store files temporarily
       if (!this.formData._id && this.modalMode === 'create') {
         // Store file info for later upload
         const fileInfo = {
           file: file,
           name: file.name,
           size: file.size,
           uploadDate: new Date()
         }
         this.tempUploadedFiles.push(fileInfo)
         toast.success('File akan diunggah otomatis setelah pencapaian disimpan')
         this.clearPdfPreview()
         this.isUploadingFile = false
         m.redraw()
         return
       }

       const uploadUrl = `/api/pencapaian/${this.formData._id}/files`
       console.log('Uploading file to URL:', uploadUrl)
       console.log('Current formData._id:', this.formData._id)

       const response = await fetch(uploadUrl, {
         method: 'POST',
         headers: {
           'Authorization': `Bearer ${token}`
           // Don't set Content-Type - let browser set it with boundary for multipart data
         },
         body: formData
       })

       if (!response.ok) {
         const errorData = await response.json()
         throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
       }

       const result = await response.json()
       console.log('File upload result:', result)

       if (result.success) {
         toast.success('File berhasil diunggah')
         // Reload the uploaded files list to show the new file
         await this.loadUploadedFiles()
         // Clear PDF preview since file is now uploaded
         this.clearPdfPreview()

         // Refresh the pencapaian data from server to ensure consistency
         if (this.formData._id) {
           // Reload the entire pencapaian record to get latest data
           try {
             const token = JWTUtils.getToken()
             if (token) {
               const response = await fetch(`/api/pencapaian/${this.formData._id}`, {
                 headers: {
                   'Authorization': `Bearer ${token}`,
                   'Content-Type': 'application/json'
                 }
               })

               if (response.ok) {
                 const result = await response.json()
                 // Update the uploadedFiles with the latest data from server
                 this.uploadedFiles = result.data.evidenceFiles || []
                 m.redraw()
               }
             }
           } catch (error) {
             console.error('Error refreshing pencapaian data after file upload:', error)
           }
         }
       } else {
         throw new Error(result.message || 'Upload gagal')
       }

     } catch (error) {
       console.error('Error uploading file:', error)
       toast.error('Gagal mengunggah file: ' + error.message)
       // Clear preview on error
       this.clearPdfPreview()
     } finally {
       this.isUploadingFile = false
       m.redraw()
     }
   },

  downloadFile: async function(filename) {
    try {
      const token = JWTUtils.getToken()
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch(`/api/pencapaian/${this.formData._id}/files/${filename}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to download file')
      }

      // Create blob and download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url

      // Get original filename from the file list
      const file = this.uploadedFiles.find(f => f.filename === filename)
      a.download = file ? file.originalName : filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('File berhasil diunduh')
    } catch (error) {
      console.error('Error downloading file:', error)
      toast.error('Gagal mengunduh file')
    }
  },

  deleteFile: async function(filename) {
    showConfirmation(
      'Apakah Anda yakin ingin menghapus file ini?',
      async () => {
        try {
          const token = JWTUtils.getToken()
          if (!token) {
            throw new Error('No authentication token found')
          }

          const response = await fetch(`/api/pencapaian/${this.formData._id}/files/${filename}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.message || 'Failed to delete file')
          }

          // Remove file from local list
          this.uploadedFiles = this.uploadedFiles.filter(f => f.filename !== filename)
          toast.success('File berhasil dihapus')
          m.redraw()
        } catch (error) {
          console.error('Error deleting file:', error)
          toast.error('Gagal menghapus file')
        }
      },
      () => {
        toast.info('Penghapusan dibatalkan')
      }
    )
  },

  loadUploadedFiles: async function() {
    if (!this.formData._id) {
      this.uploadedFiles = []
      return
    }

    try {
      const token = JWTUtils.getToken()
      if (!token) return

      const response = await fetch(`/api/pencapaian/${this.formData._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const result = await response.json()
        this.uploadedFiles = result.data.evidenceFiles || []

        // Create PDF previews for existing PDF files in edit mode
        if (this.modalMode === 'edit' && this.uploadedFiles.length > 0) {
          const pdfFiles = this.uploadedFiles.filter(file =>
            file.originalName.toLowerCase().endsWith('.pdf') ||
            file.filename.toLowerCase().endsWith('.pdf')
          )

          if (pdfFiles.length > 0) {
            // Show preview for the first PDF file found
            const firstPdfFile = pdfFiles[0]
            await this.createPdfPreviewForExistingFile(firstPdfFile)
          }
        }
      } else {
        this.uploadedFiles = []
      }
    } catch (error) {
      console.error('Error loading uploaded files:', error)
      this.uploadedFiles = []
    }
  },

  createPdfPreviewForExistingFile: async function(file) {
    try {
      this.isPdfLoading = true
      this.clearPdfPreview()
      m.redraw()

      // Create a preview URL for the existing file by fetching it
      const token = JWTUtils.getToken()
      if (!token) return

      const response = await fetch(`/api/pencapaian/${this.formData._id}/files/${file.filename}`, {
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

        toast.success('PDF berhasil dimuat untuk pratinjau')
      } else {
        throw new Error('Failed to fetch PDF file')
      }
    } catch (error) {
      console.error('Error creating PDF preview for existing file:', error)
      toast.error('Gagal memuat pratinjau PDF')
      this.clearPdfPreview()
    } finally {
      this.isPdfLoading = false
      m.redraw()
    }
  },

  formatFileSize: function(bytes) {
     if (bytes === 0) return '0 Bytes'
     const k = 1024
     const sizes = ['Bytes', 'KB', 'MB', 'GB']
     const i = Math.floor(Math.log(bytes) / Math.log(k))
     return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
   },

   // PDF Preview methods
   clearPdfPreview: function() {
     // Revoke the object URL to prevent memory leaks
     if (this.pdfPreviewUrl) {
       URL.revokeObjectURL(this.pdfPreviewUrl)
       this.pdfPreviewUrl = null
     }
     this.pdfPreviewFile = null
     this.isPdfLoading = false
   },

   previewExistingPdfFile: async function(file) {
     await this.createPdfPreviewForExistingFile(file)
   },

   renderPdfPreview: async function(file) {
     try {
       this.isPdfLoading = true
       this.clearPdfPreview()
       m.redraw()

       // Create object URL for the file
       this.pdfPreviewUrl = URL.createObjectURL(file)
       this.pdfPreviewFile = file

       // Simple preview without PDF.js for now
       // We'll use the browser's built-in PDF viewing capability
       await new Promise(resolve => setTimeout(resolve, 500)) // Small delay for UX

       toast.success('PDF berhasil dimuat untuk pratinjau')
     } catch (error) {
       console.error('Error rendering PDF preview:', error)
       toast.error('Gagal memuat pratinjau PDF')
       this.clearPdfPreview()
     } finally {
       this.isPdfLoading = false
       m.redraw()
     }
   },

   openPdfInNewTab: function() {
     if (this.pdfPreviewUrl) {
       window.open(this.pdfPreviewUrl, '_blank')
     }
   },

   uploadTempFiles: async function() {
     if (this.tempUploadedFiles.length === 0 || !this.formData._id) {
       return
     }

     try {
       const token = JWTUtils.getToken()
       if (!token) return

       let successCount = 0
       let failCount = 0

       for (const tempFile of this.tempUploadedFiles) {
         try {
           const formData = new FormData()
           formData.append('file', tempFile.file)

           const response = await fetch(`/api/pencapaian/${this.formData._id}/files`, {
             method: 'POST',
             headers: {
               'Authorization': `Bearer ${token}`
             },
             body: formData
           })

           if (response.ok) {
             successCount++
           } else {
             failCount++
           }
         } catch (error) {
           console.error('Error uploading temp file:', error)
           failCount++
         }
       }

       // Clear temp files and reload uploaded files
       this.tempUploadedFiles = []
       await this.loadUploadedFiles()

       if (successCount > 0) {
         toast.success(`${successCount} file berhasil diunggah otomatis`)
       }
       if (failCount > 0) {
         toast.warning(`${failCount} file gagal diunggah`)
       }

     } catch (error) {
       console.error('Error in uploadTempFiles:', error)
       toast.error('Gagal mengunggah beberapa file')
     }
   },

  // Save item
  saveItem: async function() {
    if (!this.formData.kinerjaId || !this.formData.achievementValue) {
      toast.warning('Target kinerja dan nilai pencapaian harus diisi')
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
        ? `/api/pencapaian/${this.formData._id}`
        : '/api/pencapaian'

      // Prepare request body
      let requestBody
      if (this.modalMode === 'edit') {
        requestBody = {
          achievementValue: this.formData.achievementValue,
          periodMonth: this.formData.periodMonth,
          periodYear: this.formData.periodYear,
          description: this.formData.description
        }

        console.log('=== EDIT REQUEST DEBUG ===')
        console.log('Form data values:', {
          achievementValue: this.formData.achievementValue,
          periodMonth: this.formData.periodMonth,
          periodYear: this.formData.periodYear,
          description: this.formData.description
        })
        console.log('Request body being sent:', requestBody)
        console.log('========================')
      } else {
        requestBody = {
          kinerjaId: this.formData.kinerjaId,
          subPerangkatDaerahId: this.formData.subPerangkatDaerahId,
          anggaranId: this.formData.anggaranId,
          budgetYear: this.formData.budgetYear,
          periodMonth: this.formData.periodMonth,
          periodYear: this.formData.periodYear,
          achievementValue: this.formData.achievementValue,
          achievementType: this.formData.achievementType,
          description: this.formData.description
        }
      }

      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      toast.success(`Pencapaian berhasil di${this.modalMode === 'edit' ? 'perbarui' : 'simpan'}`)

      // For new records, update the formData with the saved ID
      if (this.modalMode === 'create' && result.data && result.data._id) {
        this.formData._id = result.data._id

        // Upload temporary files if any
        if (this.tempUploadedFiles.length > 0) {
          toast.info('Mengunggah file pendukung...')
          await this.uploadTempFiles()
        }
      }

      this.closeModal()
      this.loadPencapaian()
    } catch (error) {
      console.error('Error saving pencapaian:', error)
      toast.error(`Gagal ${this.modalMode === 'edit' ? 'memperbarui' : 'menyimpan'} pencapaian`)
    } finally {
      this.isModalLoading = false
      m.redraw()
    }
  },

  // Delete item
  deleteItem: async function(pencapaian) {
    showConfirmation(
      `Apakah Anda yakin ingin menghapus pencapaian untuk periode ${this.formatMonth(pencapaian.periodMonth)} ${pencapaian.periodYear}?`,
      async () => {
        this.isLoading = true
        m.redraw()

        try {
          const token = JWTUtils.getToken()
          if (!token) {
            throw new Error('No authentication token found')
          }

          const response = await fetch(`/api/pencapaian/${pencapaian._id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
          }

          toast.success('Pencapaian berhasil dihapus')
          this.loadPencapaian()
        } catch (error) {
          console.error('Error deleting pencapaian:', error)
          toast.error('Gagal menghapus pencapaian')
        } finally {
          this.isLoading = false
          m.redraw()
        }
      },
      () => {
        toast.info('Penghapusan dibatalkan')
      }
    )
  },


  // Pagination helpers
  getTotalPages: function() {
    return Math.ceil(this.filteredPencapaian.length / this.itemsPerPage)
  },

  getPaginatedPencapaian: function() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage
    const endIndex = startIndex + this.itemsPerPage
    return this.filteredPencapaian.slice(startIndex, endIndex)
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
      this.vnode.attrs.setTitle('Manajemen Pencapaian')
    }

    this.userData = UserUtils.getUserData()

    if (this.userData.budgetYear && typeof this.userData.budgetYear === 'object') {
      this.userData.budgetYear = `${this.userData.budgetYear.year}-${this.userData.budgetYear.status}`
    }

    this.loadSubPerangkatDaerah()
    // Don't load pencapaian initially - wait for unit selection
  },

  // Main view
  view: function() {
    return m('div', { class: 'space-y-6' }, [

      // Header with selections
      m('div', { class: 'bg-white rounded-xl shadow-sm border border-gray-200 p-6' }, [
        m('div', { class: 'flex justify-between items-center mb-6' }, [
          m('div', [
            m('h1', { class: 'text-2xl font-bold text-gray-900' }, 'Manajemen Pencapaian'),
            m('p', { class: 'text-gray-600 mt-1' }, 'Lihat dan kelola semua laporan pencapaian kinerja untuk unit kerja')
          ]),
          m('button', {
            class: `inline-flex items-center px-4 py-2 font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl ${
              !this.selectedSubPerangkatDaerah || this.availableKinerja.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white'
            }`,
            onclick: () => this.openCreateModal(),
            disabled: !this.selectedSubPerangkatDaerah || this.availableKinerja.length === 0
          }, [
            m('i', { class: 'ri-add-line mr-2' }),
            'Tambah Pencapaian'
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
                    this.availableKinerja = []
                    this.pencapaianList = []
                    this.filteredPencapaian = []
                  }
                }, [
                  m('i', { class: 'ri-close-fill' })
                ])
              ])
            ]),

            m('select', {
              class: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed',
              value: this.selectedSubPerangkatDaerah?._id || '',
              disabled: this.isLoadingSubPerangkatDaerah,
              onchange: (e) => {
                const selectedId = e.target.value

                // Clear previous data immediately
                this.pencapaianList = []
                this.filteredPencapaian = []
                this.selectedSubPerangkatDaerah = null
                this.availableKinerja = []

                if (selectedId) {
                   this.selectedSubPerangkatDaerah = this.availableSubPerangkatDaerah.find(
                     org => org._id === selectedId
                   )

                   // Load kinerja data (async)
                   this.loadKinerjaForSubPerangkatDaerah(selectedId)

                   // Reload pencapaian data when unit changes
                   this.loadPencapaian(selectedId, this.selectedPeriodYear !== 'all' ? this.selectedPeriodYear : null, this.selectedPeriodMonth !== 'all' ? this.selectedPeriodMonth : null)
                 }

                m.redraw()
              }
            }, [
              m('option', { value: '' }, this.isLoadingSubPerangkatDaerah ? 'Memuat...' : 'Pilih Unit Kerja'),
              (this.availableSubPerangkatDaerah || []).map(org =>
                m('option', {
                  value: org._id,
                  key: org._id
                }, org.nama)
              )
            ])
          ]),

          // Kinerja Count Display
          m('div', [
            m('label', { class: 'block text-sm font-semibold text-gray-800 mb-3' }, [
              m('i', { class: 'ri-target-line mr-2 text-green-500' }),
              'Target Kinerja'
            ]),
            m('div', {
              class: 'w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700'
            }, [
              m('div', { class: 'flex items-center justify-between' }, [
                m('span', `Jumlah Target Kinerja: ${this.availableKinerja.length}`),
                this.selectedSubPerangkatDaerah && m('div', { class: 'flex items-center space-x-2' }, [
                  m('i', { class: 'ri-information-line text-blue-500' }),
                  m('span', { class: 'text-sm text-blue-600' }, 'Target kinerja tersedia')
                ])
              ])
            ])
          ])
        ])
      ]),

      // Search and filters (only show when selections are made)
      this.selectedSubPerangkatDaerah && m('div', { class: 'bg-white rounded-xl shadow-sm border border-gray-200 p-6' }, [
        m('div', { class: 'grid grid-cols-1 md:grid-cols-4 gap-4' }, [
          // Search input
          m('div', [
            m('label', { class: 'block text-sm font-medium text-gray-700 mb-2' }, 'Pencarian'),
            m('div', { class: 'relative' }, [
              m('input', {
                type: 'text',
                class: 'w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                placeholder: 'Cari subkegiatan atau deskripsi...',
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
              m('div', `Menampilkan ${this.filteredPencapaian.length} dari ${this.pencapaianList.length} pencapaian`),
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
          this.filteredPencapaian.length === 0 ?
            // Empty state
            m('div', { class: 'bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden' }, [
              m('div', { class: 'text-center py-12' }, [
                m('div', { class: 'mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-4' }, [
                  m('i', { class: 'ri-trophy-fill text-blue-500' })
                ]),
                m('h3', { class: 'text-lg font-medium text-gray-900 mb-2' }, 'Belum ada data pencapaian'),
                m('p', { class: 'text-gray-500 mb-6 max-w-sm mx-auto' }, 'Mulai tambahkan laporan pencapaian untuk target kinerja yang telah ditetapkan'),
                this.availableKinerja.length > 0 && m('button', {
                  class: 'inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl',
                  onclick: () => this.openCreateModal()
                }, [
                  m('i', { class: 'ri-add-line mr-2' }),
                  'Tambah Pencapaian Pertama'
                ])
              ])
            ]) :
            // Pencapaian table
            m('div', { class: 'bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden' }, [
              m('div', { class: 'overflow-x-auto' }, [
                m('table', { class: 'min-w-full divide-y divide-gray-200' }, [
                  m('thead', { class: 'bg-gray-50' }, [
                    m('tr', [
                      m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'SubKegiatan'),
                      m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Periode'),
                      m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Nilai Pencapaian'),
                      m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Tipe'),
                      m('th', { class: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Capaian %'),
                      m('th', { class: 'px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider' }, 'Aksi')
                    ])
                  ]),
                  m('tbody', { class: 'bg-white divide-y divide-gray-200' },
                    (this.getPaginatedPencapaian() || []).map(pencapaian => [
                      m('tr', { class: 'hover:bg-gray-50' }, [
                        m('td', { class: 'px-6 py-4' }, [
                          m('div', { class: 'text-sm font-medium text-gray-900' }, [
                            (pencapaian.kinerjaId?.subKegiatanId?.kode || pencapaian.kinerjaId?.kode) && m('span', { class: 'font-mono text-xs text-gray-500 mr-2' }, pencapaian.kinerjaId?.subKegiatanId?.kode || pencapaian.kinerjaId?.kode),
                            pencapaian.kinerjaId?.subKegiatanId?.nama || pencapaian.kinerjaId?.nama || 'SubKegiatan tidak ditemukan'
                          ]),
                          m('div', { class: 'text-sm text-gray-500 mt-1' }, [
                            m('span', { class: 'font-medium' }, 'Target: '),
                            pencapaian.kinerjaId?.targetValue?.toLocaleString('id-ID') || 'N/A'
                          ])
                        ]),
                        m('td', { class: 'px-6 py-4 whitespace-nowrap' }, [
                          m('div', { class: 'text-sm text-gray-900' }, [
                            m('div', { class: 'font-semibold' }, `${this.formatMonth(pencapaian.periodMonth)} ${pencapaian.periodYear}`)
                          ])
                        ]),
                        m('td', { class: 'px-6 py-4 whitespace-nowrap' }, [
                          m('div', { class: 'text-sm font-semibold text-blue-600' }, [
                            pencapaian.achievementType === 'numeric'
                              ? (pencapaian.achievementValue || 0).toLocaleString('id-ID')
                              : pencapaian.achievementValue || '-'
                          ])
                        ]),
                        m('td', { class: 'px-6 py-4 whitespace-nowrap' }, [
                          m('span', {
                            class: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${this.getAchievementTypeBadgeClass(pencapaian.achievementType)}`
                          }, this.getAchievementTypeText(pencapaian.achievementType))
                        ]),
                        m('td', { class: 'px-6 py-4 whitespace-nowrap' }, [
                          pencapaian.achievementType === 'numeric' ?
                            m('div', { class: 'text-sm text-center' }, [
                              m('div', { class: 'font-bold text-lg' }, [
                                m('span', {
                                  class: `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    pencapaian.achievementPercentage >= 100 ? 'bg-green-100 text-green-800' :
                                    pencapaian.achievementPercentage >= 75 ? 'bg-blue-100 text-blue-800' :
                                    pencapaian.achievementPercentage >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`
                                }, this.formatPercentage(pencapaian.achievementPercentage))
                              ]),
                              m('div', { class: 'text-xs text-gray-500 mt-1' }, `${pencapaian.achievementPercentage?.toFixed(1)}%`)
                            ]) :
                            m('div', { class: 'text-sm text-gray-500 text-center' }, '-')
                        ]),
                        m('td', { class: 'px-6 py-4 whitespace-nowrap text-right text-sm font-medium' }, [
                          m('div', { class: 'flex justify-end space-x-2' }, [
                            m('button', {
                              class: 'text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-50',
                              onclick: () => this.openEditModal(pencapaian),
                              title: 'Edit'
                            }, [
                              m('i', { class: 'ri-edit-line text-lg' })
                            ]),
                            m('button', {
                              class: 'text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50',
                              onclick: () => this.deleteItem(pencapaian),
                              title: 'Hapus'
                            }, [
                              m('i', { class: 'ri-delete-bin-line text-lg' })
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
                      m('span', { class: 'font-medium' }, Math.min(this.currentPage * this.itemsPerPage, this.filteredPencapaian.length)),
                      ' dari ',
                      m('span', { class: 'font-medium' }, this.filteredPencapaian.length),
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
              m('p', { class: 'text-gray-500 max-w-md mx-auto' }, 'Pilih unit kerja untuk melihat semua laporan pencapaian kinerja yang telah dibuat. Untuk menambah pencapaian baru, unit kerja harus memiliki target kinerja yang telah ditetapkan.')
            ])
          ]),

      // Modal for creating/editing pencapaian
      this.showModal && m('div', {
        class: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4',
        onclick: (e) => e.target === e.currentTarget && this.closeModal()
      }, [
        m('div', {
          class: 'bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 transform transition-all max-h-[95vh] overflow-y-auto',
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
                    `${this.modalMode === 'create' ? 'Tambah' : 'Edit'} Pencapaian`
                  ]),
                  m('p', {
                    class: 'text-white text-opacity-80 text-sm'
                  }, [
                    this.modalMode === 'create'
                      ? 'Laporkan pencapaian untuk target kinerja'
                      : 'Perbarui laporan pencapaian'
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
            // Unit Selection
            m('div', { class: 'mb-8' }, [
              m('h4', { class: 'text-xl font-semibold text-gray-800 mb-6 flex items-center' }, [
                m('i', { class: 'ri-building-line mr-3 text-blue-500' }),
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
                  class: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed',
                  value: this.formData.subPerangkatDaerahId,
                  onchange: (e) => {
                    this.formData.subPerangkatDaerahId = e.target.value
                    this.selectedSubPerangkatDaerah = this.availableSubPerangkatDaerah.find(
                      org => org._id === e.target.value
                    )
                    this.loadKinerjaForSubPerangkatDaerah(e.target.value)
                    this.formData.kinerjaId = ''
                  },
                  disabled: this.isModalLoading || this.isLoadingSubPerangkatDaerah
                }, [
                  m('option', { value: '' }, this.isLoadingSubPerangkatDaerah ? 'Memuat...' : 'Pilih Unit Kerja'),
                  (this.availableSubPerangkatDaerah || []).map(org =>
                    m('option', {
                      value: org._id,
                      key: org._id
                    }, org.nama)
                  )
                ])
              ]
            ]),

            // Kinerja Selection
            (this.availableKinerja.length > 0 || this.modalMode === 'edit') && m('div', { class: 'mb-8' }, [
              m('h4', { class: 'text-xl font-semibold text-gray-800 mb-6 flex items-center' }, [
                m('i', { class: 'ri-target-line mr-3 text-green-500' }),
                'Target Kinerja'
              ]),

              this.modalMode === 'edit' ? [
                // Read-only display for edit mode with actual data
                m('div', {
                  class: 'bg-green-50 border border-green-200 rounded-lg p-6'
                }, [
                  m('div', { class: 'flex items-center justify-between mb-4' }, [
                    m('div', [
                      m('div', { class: 'font-semibold text-green-900 text-lg' }, 'Target Kinerja'),
                      m('div', { class: 'text-sm text-green-700 mt-1' }, 'Target yang akan dicapai')
                    ])
                  ]),
                  m('div', { class: 'grid grid-cols-1 md:grid-cols-3 gap-4 text-sm' }, [
                    m('div', { class: 'flex justify-between' }, [
                      m('span', { class: 'text-gray-600' }, 'SubKegiatan:'),
                      m('span', { class: 'font-medium text-green-600' }, this.formData.kinerjaId?.subKegiatanId?.nama || 'Nama SubKegiatan')
                    ]),
                    m('div', { class: 'flex justify-between' }, [
                      m('span', { class: 'text-gray-600' }, 'Kinerja:'),
                      m('span', { class: 'font-medium text-green-600' }, this.formData.kinerjaId?.subKegiatanId?.kinerja || 'Kinerja')
                    ]),
                    m('div', { class: 'flex justify-between' }, [
                      m('span', { class: 'text-gray-600' }, 'Indikator:'),
                      m('span', { class: 'font-medium text-green-600' }, this.formData.kinerjaId?.subKegiatanId?.indikator || 'Indikator')
                    ]),
                    m('div', { class: 'flex justify-between' }, [
                      m('span', { class: 'text-gray-600' }, 'Satuan:'),
                      m('span', { class: 'font-medium text-green-600' }, this.formData.kinerjaId?.subKegiatanId?.satuan || 'Satuan')
                    ]),
                    m('div', { class: 'flex justify-between' }, [
                      m('span', { class: 'text-gray-600' }, 'Target Nilai:'),
                      m('span', { class: 'font-medium text-green-600' }, this.formData.kinerjaId?.targetValue?.toLocaleString('id-ID') || 'Target Value')
                    ]),
                    m('div', { class: 'flex justify-between' }, [
                      m('span', { class: 'text-gray-600' }, 'Target Date:'),
                      m('span', { class: 'font-medium text-green-600' }, this.formatDate(this.formData.kinerjaId?.targetDate) || 'Tanggal Target')
                    ])
                  ])
                ])
              ] : [
                // Editable select for create mode
                m('div', { class: 'space-y-4' }, [
                  (this.availableKinerja || []).map(kinerja =>
                    m('div', {
                      class: `border-2 rounded-lg p-4 transition-all ${
                        this.formData.kinerjaId === kinerja._id
                          ? 'border-blue-500 bg-blue-50 cursor-pointer'
                          : 'border-gray-200 hover:border-gray-300 bg-white cursor-pointer'
                      }`,
                      onclick: () => {
                        this.formData.kinerjaId = kinerja._id
                        this.formData.anggaranId = kinerja.anggaranId?._id || kinerja.anggaranId
                        this.formData.budgetYear = kinerja.budgetYear
                        m.redraw() // Ensure immediate UI update
                      },
                      key: kinerja._id
                    }, [
                      m('div', { class: 'flex items-center justify-between mb-2' }, [
                        m('div', { class: 'font-mono text-sm font-bold text-gray-800' }, kinerja.subKegiatanId?.kode || 'Kode')
                      ]),
                      m('div', { class: 'font-medium text-gray-900 mb-2' }, kinerja.subKegiatanId?.nama || 'Nama SubKegiatan'),
                      m('div', { class: 'grid grid-cols-2 gap-4 text-sm' }, [
                        m('div', { class: 'flex justify-between' }, [
                          m('span', { class: 'text-gray-600' }, 'Target:'),
                          m('span', { class: 'font-medium text-blue-600' }, kinerja.targetValue?.toLocaleString('id-ID'))
                        ]),
                        m('div', { class: 'flex justify-between' }, [
                          m('span', { class: 'text-gray-600' }, 'Aktual:'),
                          m('span', { class: 'font-medium text-green-600' }, kinerja.actualValue?.toLocaleString('id-ID') || '0')
                        ]),
                        m('div', { class: 'flex justify-between' }, [
                          m('span', { class: 'text-gray-600' }, 'Capaian:'),
                          m('span', { class: 'font-medium text-purple-600' }, this.formatPercentage(kinerja.achievementPercentage))
                        ]),
                        m('div', { class: 'flex justify-between' }, [
                          m('span', { class: 'text-gray-600' }, 'Target Date:'),
                          m('span', { class: 'font-medium text-orange-600' }, this.formatDate(kinerja.targetDate))
                        ])
                      ])
                    ])
                  )
                ])
              ]
            ]),

            // Achievement Information Section
            this.formData.kinerjaId && m('div', { class: 'mb-8' }, [
              m('h4', { class: 'text-xl font-semibold text-gray-800 mb-6 flex items-center' }, [
                m('i', { class: 'ri-trophy-line mr-3 text-orange-500' }),
                'Informasi Pencapaian'
              ]),

              m('div', { class: 'grid grid-cols-1 md:grid-cols-3 gap-6' }, [
                // Period Month
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-3' }, [
                    m('i', { class: 'ri-calendar-line mr-2 text-blue-500' }),
                    'Bulan Periode'
                  ]),
                  m('select', {
                    class: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white',
                    value: this.formData.periodMonth,
                    onchange: (e) => this.formData.periodMonth = parseInt(e.target.value),
                    disabled: this.isModalLoading
                  }, [
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

                // Period Year
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-3' }, [
                    m('i', { class: 'ri-calendar-2-line mr-2 text-green-500' }),
                    'Tahun Periode'
                  ]),
                  m('select', {
                    class: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white',
                    value: this.formData.periodYear,
                    onchange: (e) => this.formData.periodYear = parseInt(e.target.value),
                    disabled: this.isModalLoading
                  }, [
                    m('option', { value: '2024' }, '2024'),
                    m('option', { value: '2025' }, '2025'),
                    m('option', { value: '2026' }, '2026')
                  ])
                ]),

                // Achievement Type
                m('div', [
                  m('label', { class: 'block text-sm font-semibold text-gray-800 mb-3' }, [
                    m('i', { class: 'ri-hashtag mr-2 text-purple-500' }),
                    'Tipe Pencapaian'
                  ]),
                  m('select', {
                    class: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white',
                    value: this.formData.achievementType,
                    onchange: (e) => this.formData.achievementType = e.target.value,
                    disabled: this.isModalLoading
                  }, [
                    m('option', { value: 'numeric' }, 'Numerik (Angka)'),
                    m('option', { value: 'descriptive' }, 'Deskriptif (Narasi)')
                  ])
                ])
              ]),

              // Achievement Value
              m('div', { class: 'mt-6' }, [
                m('label', { class: 'block text-sm font-semibold text-gray-800 mb-3' }, [
                  m('i', { class: `ri-${this.formData.achievementType === 'numeric' ? 'number' : 'file-text'}-line mr-2 text-orange-500` }),
                  `Nilai Pencapaian ${this.formData.achievementType === 'numeric' ? '(Angka)' : '(Deskripsi)'}`
                ]),
                this.formData.achievementType === 'numeric' ?
                  m('input', {
                    type: 'number',
                    class: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white',
                    placeholder: 'Masukkan nilai pencapaian',
                    value: this.formData.achievementValue,
                    oninput: (e) => this.formData.achievementValue = e.target.value,
                    min: '0',
                    step: '0.01',
                    disabled: this.isModalLoading
                  }) :
                  m('textarea', {
                    class: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white resize-vertical',
                    placeholder: 'Deskripsikan pencapaian yang telah dicapai',
                    value: this.formData.achievementValue,
                    oninput: (e) => this.formData.achievementValue = e.target.value,
                    rows: 3,
                    disabled: this.isModalLoading
                  })
              ]),

              // Description
              m('div', { class: 'mt-6' }, [
                m('label', { class: 'block text-sm font-semibold text-gray-800 mb-3' }, [
                  m('i', { class: 'ri-file-text-line mr-2 text-gray-500' }),
                  'Deskripsi Tambahan'
                ]),
                m('textarea', {
                  class: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 bg-white resize-vertical',
                  placeholder: 'Deskripsi tambahan atau catatan untuk pencapaian ini',
                  value: this.formData.description,
                  oninput: (e) => this.formData.description = e.target.value,
                  rows: 3,
                  disabled: this.isModalLoading
                })
              ]),

              // File Upload Section
              m('div', { class: 'mt-6' }, [
                m('div', { class: 'border-t border-gray-200 pt-6' }, [
                  m('h4', { class: 'text-lg font-semibold text-gray-800 mb-4 flex items-center' }, [
                    m('i', { class: 'ri-file-upload-line mr-2 text-blue-500' }),
                    'Dokumen Bukti (PDF)'
                  ]),
                  m('p', { class: 'text-sm text-gray-600 mb-4' }, [
                    'Upload dokumen bukti pencapaian (format PDF, maksimal 1 MB)',
                    ...(this.modalMode === 'create' && !this.formData._id ? [' - ', m('span', { class: 'text-blue-600 font-medium' }, 'File akan diunggah otomatis setelah disimpan')] : [])
                  ]),

                  // File Upload Input
                  m('div', { class: 'mb-4' }, [
                    m('input', {
                      type: 'file',
                      id: 'pencapaian-file-input',
                      accept: '.pdf,application/pdf',
                      class: 'hidden',
                      onchange: (e) => {
                        const file = e.target.files[0]
                        if (file) {
                          this.handleFileUpload(file)
                        }
                      },
                      disabled: this.isUploadingFile
                    }),
                    m('label', {
                      for: 'pencapaian-file-input',
                      class: `block w-full border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                        this.isUploadingFile
                          ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                          : 'border-blue-200 hover:border-blue-400 bg-blue-50 hover:bg-blue-100 cursor-pointer'
                      }`
                    }, [
                      this.isUploadingFile ?
                        [
                          m('i', { class: 'ri-loader-4-line text-2xl text-blue-500 animate-spin mb-2' }),
                          m('span', { class: 'text-sm text-gray-600' }, 'Mengunggah...')
                        ] :
                        [
                          m('i', { class: 'ri-file-upload-line text-2xl text-blue-400 mb-2' }),
                          m('span', { class: 'text-sm text-blue-600 mb-1' }, 'Pilih file PDF'),
                          m('span', { class: 'text-xs text-blue-500' }, 'File akan diunggah otomatis setelah disimpan')
                        ]
                    ])
                  ]),

                  // Temporary Files Section (only show in create mode)
                  this.modalMode === 'create' && this.tempUploadedFiles.length > 0 && m('div', { class: 'mb-4' }, [
                    m('div', { class: 'bg-blue-50 border border-blue-200 rounded-lg p-4' }, [
                      m('h5', { class: 'text-sm font-medium text-blue-800 mb-2 flex items-center' }, [
                        m('i', { class: 'ri-time-line mr-2' }),
                        'File akan diunggah setelah disimpan:'
                      ]),
                      m('div', { class: 'space-y-2' }, [
                        this.tempUploadedFiles.map((tempFile, index) =>
                          m('div', {
                            class: 'flex items-center justify-between bg-white rounded p-2 border border-blue-100',
                            key: index
                          }, [
                            m('div', { class: 'flex items-center space-x-2' }, [
                              m('i', { class: 'ri-file-pdf-line text-red-500' }),
                              m('div', [
                                m('div', { class: 'text-sm font-medium text-gray-900' }, tempFile.name),
                                m('div', { class: 'text-xs text-gray-500' }, this.formatFileSize(tempFile.size))
                              ])
                            ]),
                            m('button', {
                              class: 'text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50',
                              onclick: () => {
                                this.tempUploadedFiles = this.tempUploadedFiles.filter((_, i) => i !== index)
                                this.clearPdfPreview()
                              },
                              title: 'Hapus file'
                            }, [
                              m('i', { class: 'ri-close-fill text-sm' })
                            ])
                          ])
                        )
                      ])
                    ])
                  ]),

                  // PDF Preview Section
                  this.pdfPreviewFile && m('div', { class: 'mb-4' }, [
                    m('div', { class: 'bg-gray-50 rounded-lg p-4 border border-gray-200' }, [
                      m('div', { class: 'flex items-center justify-between mb-3' }, [
                        m('h5', { class: 'text-sm font-medium text-gray-700 flex items-center' }, [
                          m('i', { class: 'ri-file-pdf-line text-red-500 mr-2' }),
                          'Pratinjau PDF'
                        ]),
                        m('div', { class: 'flex space-x-2' }, [
                          m('button', {
                            class: 'text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-100',
                            onclick: () => this.openPdfInNewTab(),
                            title: 'Buka di tab baru'
                          }, [
                            m('i', { class: 'ri-external-link-line text-sm' })
                          ]),
                          m('button', {
                            class: 'text-gray-600 hover:text-gray-800 p-1 rounded-full hover:bg-gray-100',
                            onclick: () => this.clearPdfPreview(),
                            title: 'Hapus pratinjau'
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
                        this.formatFileSize(this.pdfPreviewFile.size)
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
                          m('p', { class: 'text-xs text-gray-500 mt-2' }, 'Pratinjau PDF - Klik tombol external link untuk melihat dalam ukuran penuh')
                        ])
                    ])
                  ]),

                  // Uploaded Files List
                  this.uploadedFiles.length > 0 && m('div', { class: 'space-y-3' }, [
                    m('h5', { class: 'text-sm font-medium text-gray-700' }, 'File yang telah diunggah:'),
                    this.uploadedFiles.map(file =>
                      m('div', {
                        class: 'flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-200',
                        key: file.filename
                      }, [
                        m('div', { class: 'flex items-center space-x-3' }, [
                          m('i', { class: 'ri-file-pdf-line text-red-500 text-lg' }),
                          m('div', [
                            m('div', { class: 'text-sm font-medium text-gray-900' }, file.originalName),
                            m('div', { class: 'text-xs text-gray-500' }, [
                              this.formatFileSize(file.fileSize),
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
                            onclick: () => this.previewExistingPdfFile(file),
                            title: 'Pratinjau PDF'
                          }, [
                            m('i', { class: 'ri-eye-line text-sm' })
                          ]),
                          m('button', {
                            class: 'text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-100',
                            onclick: () => this.downloadFile(file.filename),
                            title: 'Unduh'
                          }, [
                            m('i', { class: 'ri-download-line text-sm' })
                          ]),
                          m('button', {
                            class: 'text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-100',
                            onclick: () => this.deleteFile(file.filename),
                            title: 'Hapus'
                          }, [
                            m('i', { class: 'ri-delete-bin-line text-sm' })
                          ])
                        ])
                      ])
                    )
                  ])
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
              class: `px-8 py-3 font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl ${
                this.isModalLoading || !this.formData.kinerjaId || !this.formData.achievementValue
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white'
              }`,
              disabled: this.isModalLoading || !this.formData.kinerjaId || !this.formData.achievementValue,
              onclick: () => this.saveItem()
            }, [
              this.isModalLoading ? m('i', { class: 'ri-loader-4-line animate-spin mr-2' }) : m('i', { class: 'ri-save-line mr-2' }),
              this.isModalLoading ? 'Menyimpan...' : 'Simpan Pencapaian'
            ])
          ])
        ])
      ])
    ])
  }
}

export default Pencapaian