import m from 'mithril'
import { ToastUtils, UserUtils, APIUtils, JWTUtils } from '../js/utils.js'
import PerangkatDaerahOrganisasi from './components/PerangkatDaerahOrganisasi'
import PerangkatDaerahPejabat from './components/PerangkatDaerahPejabat'
import PerangkatDaerahPengguna from './components/PerangkatDaerahPengguna'
import PerangkatDaerahPengawasLapangan from './components/PerangkatDaerahPengawasLapangan'

const PerangkatDaerah = {
  oncreate: function(vnode) {
    // Initial debug logs (can be trimmed in production)
    console.log('PerangkatDaerah component created/mounted');
    console.log('Is authenticated:', UserUtils.isAuthenticated());
    console.log('Is admin:', UserUtils.isAdmin());
    console.log('User role:', UserUtils.getRole());

    // Mount initial active tab into container if available
    const container = document.getElementById('perangkat-daerah-tab-container');
    if (container) {
      this.mountActiveTab(container);
    }
  },
  
  // State management
  isLoading: false,
  data: null,
  
  // Tab management
  activeTab: 'organisasi', // organisasi, pejabat, pengguna, pengawasLapangan

  // Pengawas Lapangan assignment state
  pengawasList: [],
  isLoadingPengawasList: false,

  kontrakList: [],
  isLoadingKontrakList: false,
  kontrakSearchQuery: '',
  selectedPengawasId: '',
  selectedPengawas: null,

  pengawasAssignments: [],
  isLoadingAssignments: false,

  // SK (Surat Keputusan) upload form state
  skForm: {
    skNumber: '',
    skDate: '',
    file: null,
    fileName: '',
    fileSize: 0
  },
  skErrors: {},

  // User management states
  userData: [],
  showUserModal: false,
  userModalMode: 'create',
  userEditingItem: null,
  userFormData: {
    username: '',
    email: '',
    namaLengkap: '',
    password: '',
    role: 'operator',
    subPerangkatDaerahId: '',
    penyediaId: ''
  },
  userErrors: {},
  
  // Data for dropdowns
  subPerangkatDaerahList: [],
  penyediaList: [],
  isLoadingUsers: false,
  isLoadingSubOrgForUsers: false,
  isLoadingPenyedia: false,

  // Pejabat data for dropdown
  pejabatList: [],
  isLoadingPejabat: false,

  // Pejabat management states
  pejabatData: [],
  showPejabatModal: false,
  pejabatModalMode: 'create',
  pejabatEditingItem: null,
  
  // Jabatan Fungsional Options (hardcoded)
  jabatanFungsionalOptions: [
    { value: '', label: '-- Pilih Jabatan Fungsional --' },
    { value: 'Pengguna Anggaran', label: 'Pengguna Anggaran' },
    { value: 'Kuasa Pengguna Anggaran', label: 'Kuasa Pengguna Anggaran' },
    { value: 'Pejabat Pelaksana Teknis Kegiatan', label: 'Pejabat Pelaksana Teknis Kegiatan' },
    { value: 'Ketua Panitia', label: 'Ketua Panitia' },
    { value: 'Pejabat Pengadaan', label: 'Pejabat Pengadaan' }
  ],
  
  // Track which sub organizations have available Jabatan Struktural positions
  getAvailableJabatanStrukturalOptions: function() {
    const options = [{ value: '', label: '-- Pilih Jabatan Struktural --' }];
    
    // Add sub organization options
    this.subOrganizations.forEach(subOrg => {
      options.push(
        { value: `Kepala ${subOrg.nama}`, label: `Kepala ${subOrg.nama}` },
        { value: `Plt. Kepala ${subOrg.nama}`, label: `Plt. Kepala ${subOrg.nama}` }
      );
    });
    
    return options;
  },

  // New Jabatan Struktural management state - Enhanced UX
  showJabatanStrukturalForm: false,
  newJabatanStruktural: {
    subOrganisasiId: '', // First select sub-organisasi
    role: 'Kepala' // Then choose role: 'Kepala' or 'Plt. Kepala'
  },
  positionConflictWarning: '',
  forceAddJabatanStruktural: false,

  pejabatFormData: {
    nama: '',
    // Support both new and legacy format
    jabatanStrukturalList: [], // New format for multiple positions
    jabatanStruktural: '', // Legacy format for backward compatibility
    jabatanFungsional: '',
    email: '',
    telepon: '',
    status: '',
    nip: ''
  },
  pejabatErrors: {},

  // Sub-organization states
  subOrganizations: [],
  isLoadingSubOrg: false,
  
  // Inline add states
  addingSubOrg: false,
  newSubOrgName: '',
  
  // Inline edit states
  editingSubOrgId: null,
  editingSubOrgName: '',

  errors: {},

  oninit: function() {
    console.log('PerangkatDaerah oninit() called');
    
    this.isEditing = false;
    this.isLoading = false;
    this.formData = {
      _id: null,
      namaPemda: '',
      nama: '',
      alamat: '',
      kodeOrganisasi: '',
      email: '',
      telepon: '',
      website: '',
      jenis: 'Dinas',
      logoFile: null,
      logoPreview: null
    };
    this.errors = {};

    console.log('oninit completed, starting data loading');
    this.loadData();
    this.loadPejabatData();
    this.loadPejabatManagementData();
    this.loadUserManagementData();
    this.loadSubPerangkatDaerahForUsers();
    this.loadPenyediaForUsers();
    this.loadSubOrganizations();
  },

  // Load pejabat management data
  loadPejabatManagementData: async function() {
    try {
      const response = await APIUtils.getAll('pejabat');
      this.pejabatData = response.data || [];
    } catch (error) {
      console.error('Error loading pejabat data:', error);
      this.pejabatData = [];
    }
    m.redraw();
  },

  // Load pejabat data for dropdown selection
  loadPejabatData: async function() {
    this.isLoadingPejabat = true;
    m.redraw();
    
    try {
      const response = await APIUtils.getAll('pejabat');
      if (response && response.data) {
        // Filter active pejabat only
        this.pejabatList = response.data.filter(pejabat => pejabat.status === 'Aktif');
      } else {
        this.pejabatList = [];
      }
    } catch (error) {
      console.error('Error loading pejabat data:', error);
      this.pejabatList = [];
    }
    
    this.isLoadingPejabat = false;
    m.redraw();
  },

  // User management methods
  loadUserManagementData: async function() {
    this.isLoadingUsers = true;
    m.redraw();
    
    try {
      const response = await APIUtils.getAll('user');
      if (response && response.data) {
        this.userData = response.data;
      } else {
        this.userData = [];
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      this.userData = [];
      ToastUtils.error('Gagal memuat data pengguna');
    }
    
    this.isLoadingUsers = false;
    m.redraw();
  },

  loadSubPerangkatDaerahForUsers: async function() {
    this.isLoadingSubOrgForUsers = true;
    m.redraw();
    
    try {
      // Load all sub organizations for user assignment dropdown
      const response = await APIUtils.getAll('subperangkatdaerah');
      if (response && response.data) {
        this.subPerangkatDaerahList = response.data;
      } else {
        this.subPerangkatDaerahList = [];
      }
    } catch (error) {
      console.error('Error loading sub organizations for users:', error);
      this.subPerangkatDaerahList = [];
    }
    
    this.isLoadingSubOrgForUsers = false;
    m.redraw();
  },

  loadPenyediaForUsers: async function() {
    this.isLoadingPenyedia = true;
    m.redraw();
    
    try {
      // Load all penyedia for vendor assignment dropdown
      const response = await APIUtils.getAll('penyedia');
      if (response && response.data) {
        this.penyediaList = response.data;
      } else {
        this.penyediaList = [];
      }
    } catch (error) {
      console.error('Error loading penyedia for users:', error);
      this.penyediaList = [];
    }
    
    this.isLoadingPenyedia = false;
    m.redraw();
  },

  // Sub-organization methods
  loadSubOrganizations: async function() {
    console.log('Loading sub organizations...');
    console.log('Current data:', this.data);
    
    if (!this.data || !this.data._id) {
      console.log('No data or _id available for sub organizations');
      return;
    }

    this.isLoadingSubOrg = true;
    m.redraw();

    try {
      // Use APIUtils for all HTTP requests (MANDATORY)
      const result = await APIUtils.request('/api/subperangkatdaerah', {
        params: { perangkatDaerahId: this.data._id }
      });

      console.log('Sub organizations API result:', result);

      if (result && result.data) {
        this.subOrganizations = result.data;
      } else {
        this.subOrganizations = [];
      }
    } catch (error) {
      console.error('Error loading sub organizations:', error);
      // Don't show error toast when sub-organizations are empty
      this.subOrganizations = [];
    }

    console.log('Final sub organizations data:', this.subOrganizations);
    this.isLoadingSubOrg = false;
    m.redraw();
  },

  // Sub-organization methods
  startQuickAddSubOrg: function() {
    this.addingSubOrg = true;
    this.newSubOrgName = '';
    m.redraw();
  },

  cancelAddSubOrg: function() {
    this.addingSubOrg = false;
    this.newSubOrgName = '';
    m.redraw();
  },

  saveNewSubOrg: async function() {
    if (!this.newSubOrgName.trim()) {
      ToastUtils.error('Nama sub organisasi harus diisi');
      return;
    }

    this.isLoading = true;
    m.redraw();

    try {
      // Only send required fields - omit operators completely for simple creation
      const subOrgData = {
        nama: this.newSubOrgName.trim(),
        perangkatDaerahId: this.data._id
      };

      console.log('Creating sub organization with data:', subOrgData);
      await APIUtils.create('subperangkatdaerah', subOrgData);
      ToastUtils.success('Sub organisasi berhasil ditambahkan');
      
      // Cancel the add form first
      this.cancelAddSubOrg();
      
      // Force multiple redraws to ensure UI updates
      m.redraw();
      
      // Load sub organizations again
      await this.loadSubOrganizations();
      
      // Additional redraw to ensure the new data is displayed
      m.redraw();
      
      console.log('Sub organization saved and UI updated');
      
      // Refresh pejabat data to update available Jabatan Struktural options
      await this.loadPejabatManagementData();
    } catch (error) {
      console.error('Error creating sub organization:', error);
      ToastUtils.error('Gagal menyimpan sub organisasi');
    } finally {
      this.isLoading = false;
      m.redraw();
    }
  },

  deleteSubOrganization: async function(subOrgId) {
    try {
      await APIUtils.delete('subperangkatdaerah', subOrgId, 'Sub organisasi');
      await this.loadSubOrganizations();
    } catch (error) {
      console.error('Error deleting sub organization:', error);
    }
  },

  // Inline edit methods
  startEditSubOrg: function(subOrgId, currentName) {
    this.editingSubOrgId = subOrgId;
    this.editingSubOrgName = currentName;
    m.redraw();
  },

  cancelEditSubOrg: function() {
    this.editingSubOrgId = null;
    this.editingSubOrgName = '';
    m.redraw();
  },

  saveEditSubOrg: async function() {
    if (!this.editingSubOrgName.trim()) {
      ToastUtils.error('Nama sub organisasi tidak boleh kosong');
      return;
    }

    this.isLoading = true;
    m.redraw();

    try {
      const updateData = {
        nama: this.editingSubOrgName.trim(),
        perangkatDaerahId: this.data._id
      };

      console.log('Updating sub organization:', this.editingSubOrgId, 'with data:', updateData);
      await APIUtils.update('subperangkatdaerah', this.editingSubOrgId, updateData);
      ToastUtils.success('Sub organisasi berhasil diperbarui');
      
      this.cancelEditSubOrg();
      await this.loadSubOrganizations();
    } catch (error) {
      console.error('Error updating sub organization:', error);
      ToastUtils.error('Gagal memperbarui sub organisasi');
    } finally {
      this.isLoading = false;
      m.redraw();
    }
  },

  // Pejabat management methods
  resetPejabatForm: function() {
    this.pejabatFormData = {
      nama: '',
      jabatanStrukturalList: [],
      jabatanStruktural: '', // legacy support
      jabatanFungsional: '',
      email: '',
      telepon: '',
      status: '',
      nip: ''
    };
    this.pejabatErrors = {};
    this.resetJabatanStrukturalState();
  },

  // Reset Jabatan Struktural related state
  resetJabatanStrukturalState: function() {
    this.showJabatanStrukturalForm = false;
    this.newJabatanStruktural = {
      subOrganisasiId: '',
      role: 'Kepala' // Default role
    };
    this.positionConflictWarning = '';
    this.forceAddJabatanStruktural = false;
  },

  // Jabatan Struktural management methods - Enhanced UX
  addJabatanStruktural: function() {
    this.showJabatanStrukturalForm = true;
    this.newJabatanStruktural = {
      subOrganisasiId: '',
      role: 'Kepala' // Default to Kepala
    };
    this.positionConflictWarning = '';
    this.forceAddJabatanStruktural = false;
    m.redraw();
  },

  cancelAddJabatanStruktural: function() {
    this.showJabatanStrukturalForm = false;
    this.newJabatanStruktural = {
      subOrganisasiId: '',
      role: 'Kepala'
    };
    this.positionConflictWarning = '';
    this.forceAddJabatanStruktural = false;
    m.redraw();
  },

  saveJabatanStruktural: function() {
    if (!this.newJabatanStruktural.subOrganisasiId.trim()) {
      ToastUtils.error('Organisasi/Sub organisasi harus dipilih');
      return;
    }

    let positionName = '';
    let isMainOrg = false;

    // Check if main organization is selected
    if (this.newJabatanStruktural.subOrganisasiId === 'main_org') {
      // Main organization selected - store subOrganisasiId as null for main organization
      isMainOrg = true;
      positionName = `${this.newJabatanStruktural.role} ${this.data?.nama || 'Perangkat Daerah'}`;
      
      // For main organization, we set subOrganisasiId to null
      this.pejabatFormData.jabatanStrukturalList.push({
        position: positionName,
        subOrganisasiId: null, // Main organization doesn't have subOrganisasiId
        assignedAt: new Date(),
        isActive: true
      });
    } else {
      // Sub-organization selected
      const subOrg = this.subOrganizations.find(org => org._id === this.newJabatanStruktural.subOrganisasiId);
      if (!subOrg) {
        ToastUtils.error('Sub organisasi tidak ditemukan');
        return;
      }
      
      positionName = `${this.newJabatanStruktural.role} ${subOrg.nama}`;
      
      // Add to the list with valid ObjectId
      this.pejabatFormData.jabatanStrukturalList.push({
        position: positionName,
        subOrganisasiId: this.newJabatanStruktural.subOrganisasiId,
        assignedAt: new Date(),
        isActive: true
      });
    }

    this.cancelAddJabatanStruktural();
    ToastUtils.success(`Jabatan Struktural berhasil ditambahkan${isMainOrg ? ' (Organisasi Utama)' : ''}`);
  },

  removeJabatanStruktural: function(index) {
    ToastUtils.confirm(
      'Hapus Jabatan Struktural ini?',
      () => {
        this.pejabatFormData.jabatanStrukturalList.splice(index, 1);
        m.redraw();
      }
    );
  },

  // Check position availability for conflict detection - Enhanced UX
  checkPositionAvailability: async function() {
    this.positionConflictWarning = '';
    this.forceAddJabatanStruktural = false;

    const { subOrganisasiId, role } = this.newJabatanStruktural;
    
    if (!subOrganisasiId || !role) return;

    // Create position name to check
    const subOrg = this.subOrganizations.find(org => org._id === subOrganisasiId);
    if (!subOrg) return;
    
    const positionName = `${role} ${subOrg.nama}`;
    
    // CRITICAL BUSINESS RULE: Cannot have both Kepala and plt. Kepala in same sub-organisasi
    const conflictingRole = role === 'Kepala' ? 'Plt. Kepala' : 'Kepala';
    const conflictingPositionName = `${conflictingRole} ${subOrg.nama}`;
    
    // Check if the conflicting position already exists
    const existingPositions = this.pejabatFormData.jabatanStrukturalList || [];
    const hasConflictingPosition = existingPositions.some(pos =>
      pos.position === conflictingPositionName && pos.isActive
    );
    
    if (hasConflictingPosition) {
      this.positionConflictWarning = `Sub organisasi "${subOrg.nama}" sudah memiliki posisi "${conflictingRole}". Tidak dapat menambahkan "${role}" karena aturan bisnis mencegah seseorang memiliki kedua posisi tersebut.`;
      this.forceAddJabatanStruktural = false;
      m.redraw();
      return;
    }

    try {
      const params = {
        position: positionName,
        subOrganisasiId: subOrganisasiId
      };

      if (this.pejabatModalMode === 'edit' && this.pejabatEditingItem) {
        params.excludeId = this.pejabatEditingItem._id;
      }

      const response = await APIUtils.request('/api/pejabat/check-position', {
        method: 'GET',
        params: params
      });

      if (response && response.data && !response.data.isAvailable) {
        const conflict = response.data.conflictWith;
        this.positionConflictWarning = `Posisi "${positionName}" sudah terisi oleh "${conflict.nama}". Klik tombol "Konfirmasi Dulu" untuk tetap menambahkan.`;
      }
    } catch (error) {
      console.error('Error checking position availability:', error);
      // Don't show error to user for this check
    }
    
    m.redraw();
  },

  validatePejabatForm: function() {
    this.pejabatErrors = {};

    if (!this.pejabatFormData.nama.trim()) {
      this.pejabatErrors.nama = 'Nama harus diisi';
    }

    // User must select at least one jabatan (either Struktural or Fungsional, or both)
    const hasStruktural = this.pejabatFormData.jabatanStrukturalList.length > 0 || this.pejabatFormData.jabatanStruktural.trim();
    const hasFungsional = this.pejabatFormData.jabatanFungsional.trim();
    
    if (!hasStruktural && !hasFungsional) {
      this.pejabatErrors.jabatan = 'Setidaknya satu jabatan (Struktural atau Fungsional) harus dipilih';
    }

    return Object.keys(this.pejabatErrors).length === 0;
  },

  openPejabatModal: function(mode = 'create', item = null) {
    this.pejabatModalMode = mode;
    this.showPejabatModal = true;

    if (mode === 'edit' && item) {
      this.pejabatEditingItem = item;
      
      // Set form data with new structure and backward compatibility
      this.pejabatFormData = {
        nama: item.nama || '',
        // Handle both new format (jabatanStrukturalList) and legacy format
        jabatanStrukturalList: (item.jabatanStrukturalList && item.jabatanStrukturalList.length > 0)
          ? item.jabatanStrukturalList.filter(pos => pos.isActive).map(pos => ({
              position: pos.position,
              subOrganisasiId: pos.subOrganisasiId,
              assignedAt: pos.assignedAt,
              isActive: pos.isActive
            }))
          : [], // Empty if no list format data
        jabatanStruktural: item.jabatanStruktural || '', // Legacy format
        jabatanFungsional: item.jabatanFungsional || '',
        email: item.email || '',
        telepon: item.telepon || '',
        status: item.status || 'Aktif',
        nip: item.nip || ''
      };
      
      console.log('Edit mode loaded jabatanStrukturalList:', this.pejabatFormData.jabatanStrukturalList);
    } else {
      this.pejabatEditingItem = null;
      this.resetPejabatForm();
    }
    
    this.resetJabatanStrukturalState();
    // Force redraw to update dropdown
    m.redraw();
  },

  closePejabatModal: function() {
    this.showPejabatModal = false;
    this.pejabatEditingItem = null;
    this.resetPejabatForm();
    m.redraw();
  },

  savePejabat: async function() {
    if (!this.validatePejabatForm()) {
      ToastUtils.error('Harap perbaiki kesalahan pada formulir');
      m.redraw();
      return;
    }

    this.isLoading = true;
    m.redraw();

    try {
      if (this.pejabatModalMode === 'edit') {
        if (!this.pejabatEditingItem || !this.pejabatEditingItem._id) {
          ToastUtils.error('Data pejabat tidak ditemukan untuk diupdate');
          return;
        }
        await APIUtils.update('pejabat', this.pejabatEditingItem._id, this.pejabatFormData);
      } else {
        await APIUtils.create('pejabat', this.pejabatFormData);
      }

      this.closePejabatModal();
      await this.loadPejabatManagementData();
      ToastUtils.success('Data pejabat berhasil disimpan');
    } catch (error) {
      console.error('Error saving pejabat:', error);
      
      // Extract and display user-friendly error message
      let errorMessage = 'Gagal menyimpan data pejabat';
      if (error && error.message) {
        errorMessage = error.message;
      } else if (error.response && error.response.message) {
        errorMessage = error.response.message;
      }
      
      ToastUtils.error(errorMessage);
    }

    this.isLoading = false;
    m.redraw();
  },

  deletePejabat: async function(item) {
    ToastUtils.confirm(
      `Apakah Anda yakin ingin menghapus pejabat "${item.nama}"?`,
      async () => {
        try {
          await APIUtils.delete('pejabat', item._id, item.nama);
          await this.loadPejabatManagementData();
        } catch (error) {
          console.error('Error deleting pejabat:', error);
        }
      }
    );
  },

  // User management methods
  resetUserForm: function() {
    this.userFormData = {
      username: '',
      email: '',
      namaLengkap: '',
      password: '',
      role: 'operator',
      subPerangkatDaerahId: '',
      penyediaId: ''
    };
    this.userErrors = {};
  },

  validateUserForm: function() {
    this.userErrors = {};

    if (!this.userFormData.username.trim()) {
      this.userErrors.username = 'Username harus diisi';
    }

    if (!this.userFormData.email.trim()) {
      this.userErrors.email = 'Email harus diisi';
    }

    if (this.userModalMode === 'create' && !this.userFormData.password.trim()) {
      this.userErrors.password = 'Password harus diisi';
    }

    if (!this.userFormData.role.trim()) {
      this.userErrors.role = 'Role harus dipilih';
    }

    return Object.keys(this.userErrors).length === 0;
  },

  openUserModal: function(mode = 'create', item = null) {
    this.userModalMode = mode;
    this.showUserModal = true;

    if (mode === 'edit' && item) {
      this.userEditingItem = item;

      // Normalize subPerangkatDaerahId and penyediaId so dropdowns are populated correctly
      let normalizedSubPerangkatId = '';
      if (item.subPerangkatDaerahId) {
        if (typeof item.subPerangkatDaerahId === 'string') {
          normalizedSubPerangkatId = item.subPerangkatDaerahId;
        } else if (typeof item.subPerangkatDaerahId === 'object' && item.subPerangkatDaerahId._id) {
          normalizedSubPerangkatId = item.subPerangkatDaerahId._id;
        }
      }

      let normalizedPenyediaId = '';
      if (item.penyediaId) {
        if (typeof item.penyediaId === 'string') {
          normalizedPenyediaId = item.penyediaId;
        } else if (typeof item.penyediaId === 'object' && item.penyediaId._id) {
          normalizedPenyediaId = item.penyediaId._id;
        }
      }

      this.userFormData = {
        username: item.username || '',
        email: item.email || '',
        namaLengkap: item.namaLengkap || '',
        password: '',
        role: item.role || 'operator',
        subPerangkatDaerahId: normalizedSubPerangkatId,
        penyediaId: normalizedPenyediaId
      };
    } else {
      this.userEditingItem = null;
      this.resetUserForm();
    }

    m.redraw();
  },

  closeUserModal: function() {
    this.showUserModal = false;
    this.userEditingItem = null;
    this.resetUserForm();
    m.redraw();
  },

  saveUser: async function() {
    if (!this.validateUserForm()) {
      ToastUtils.error('Harap perbaiki kesalahan pada formulir');
      m.redraw();
      return;
    }

    this.isLoadingUsers = true;
    m.redraw();

    try {
      if (this.userModalMode === 'edit') {
        if (!this.userEditingItem || !this.userEditingItem._id) {
          ToastUtils.error('Data pengguna tidak ditemukan untuk diupdate');
          return;
        }

        const updateData = {
          username: this.userFormData.username,
          email: this.userFormData.email,
          namaLengkap: this.userFormData.namaLengkap,
          role: this.userFormData.role,
          subPerangkatDaerahId: this.userFormData.subPerangkatDaerahId || null,
          penyediaId: this.userFormData.penyediaId || null
        };

        if (this.userFormData.password.trim()) {
          updateData.password = this.userFormData.password;
        }

        await APIUtils.update('user', this.userEditingItem._id, updateData);
      } else {
        const createData = {
          username: this.userFormData.username,
          email: this.userFormData.email,
          namaLengkap: this.userFormData.namaLengkap,
          password: this.userFormData.password,
          role: this.userFormData.role,
          subPerangkatDaerahId: this.userFormData.subPerangkatDaerahId || null,
          penyediaId: this.userFormData.penyediaId || null
        };
        await APIUtils.create('user', createData);
      }

      this.closeUserModal();
      await this.loadUserManagementData();
      ToastUtils.success('Data pengguna berhasil disimpan');
    } catch (error) {
      console.error('Error saving user:', error);
    }

    this.isLoadingUsers = false;
    m.redraw();
  },

  deleteUser: async function(item) {
    ToastUtils.confirm(
      `Apakah Anda yakin ingin menghapus pengguna "${item.username}"?`,
      async () => {
        try {
          await APIUtils.delete('user', item._id, item.username);
          await this.loadUserManagementData();
        } catch (error) {
          console.error('Error deleting user:', error);
        }
      }
    );
  },

  // Load data
  loadData: async function() {
    this.isLoading = true;
    m.redraw();
    
    try {
      const response = await APIUtils.getAll('perangkatdaerah');
      console.log('Raw response from API:', response);
      
      if (response && response.data && response.data.length > 0) {
        this.existingData = response.data[0];
        this.data = response.data[0];
        console.log('Existing data loaded:', this.existingData);
        console.log('Existing data _id:', this.existingData._id);

        this.formData = {
          _id: this.existingData._id,
          namaPemda: this.existingData.namaPemda || '',
          nama: this.existingData.nama || '',
          alamat: this.existingData.alamat || '',
          kodeOrganisasi: this.existingData.kodeOrganisasi || '',
          email: this.existingData.email || '',
          telepon: this.existingData.telepon || '',
          website: this.existingData.website || '',
          jenis: this.existingData.jenis || 'Dinas',
          logoFile: null,
          logoPreview: null
        };
        console.log('Form data populated with _id:', this.formData._id);
      } else {
        this.existingData = null;
        this.formData = {
          _id: null,
          namaPemda: '',
          nama: '',
          alamat: '',
          kodeOrganisasi: '',
          email: '',
          telepon: '',
          website: '',
          jenis: 'Dinas',
          logoFile: null,
          logoPreview: null
        };
        console.log('No existing data found, form reset to empty state');
      }
      
      this.isLoading = false;
      m.redraw();

      // Load sub organizations after main data is loaded
      if (this.data && this.data._id) {
        await this.loadSubOrganizations();
      }
    } catch (error) {
      console.error('Error loading data:', error);
      ToastUtils.error('Gagal memuat data Perangkat Daerah');
      this.isLoading = false;
      m.redraw();
    }
  },

  toggleEdit: function() {
    if (this.isEditing) {
      this.isEditing = false;
    } else {
      this.isEditing = true;
    }
  },

  resetForm: function() {
    if (this.existingData) {
      this.formData = {
        _id: this.existingData._id,
        namaPemda: this.existingData.namaPemda || '',
        nama: this.existingData.nama || '',
        alamat: this.existingData.alamat || '',
        kodeOrganisasi: this.existingData.kodeOrganisasi || '',
        email: this.existingData.email || '',
        telepon: this.existingData.telepon || '',
        website: this.existingData.website || '',
        jenis: this.existingData.jenis || 'Dinas',
        logoFile: null,
        logoPreview: null
      };
    } else {
      this.formData = {
        _id: null,
        namaPemda: '',
        nama: '',
        alamat: '',
        kodeOrganisasi: '',
        email: '',
        telepon: '',
        website: '',
        jenis: 'Dinas',
        logoFile: null,
        logoPreview: null
      };
    }
    this.errors = {};
  },

  // Save item
  saveItem: async function() {
    // Validate required fields
    this.errors = {};
    
    if (!this.formData.namaPemda.trim()) {
      this.errors.namaPemda = 'Nama Pemda wajib diisi';
    }
    
    if (!this.formData.nama.trim()) {
      this.errors.nama = 'Nama Perangkat Daerah wajib diisi';
    }
    
    if (!this.formData.kodeOrganisasi.trim()) {
      this.errors.kodeOrganisasi = 'Kode Organisasi wajib diisi';
    }
    
    // If there are validation errors, don't proceed
    if (Object.keys(this.errors).length > 0) {
      ToastUtils.error('Harap perbaiki kesalahan pada formulir');
      m.redraw();
      return;
    }
    
    this.isLoading = true;
    m.redraw();
    
    try {
      // Prepare form data, preserving all fields including _id
      const formData = {
        ...this.formData
      };

      // Remove temporary fields that shouldn't be sent to backend
      delete formData.logoFile;
      delete formData.logoPreview;

      console.log('Final formData being sent to API:', formData);
      console.log('FormData _id value:', formData._id);

      await this.sendToAPI(formData);

      this.isEditing = false;
      ToastUtils.success('Perangkat Daerah berhasil disimpan');

      // Reload data to get the latest changes and show in preview mode
      await this.loadData();
      
      // Force a redraw to ensure the UI updates with new data
      m.redraw();
    } catch (error) {
      console.error('Error saving data:', error);
      let errorMessage = 'Gagal menyimpan data Perangkat Daerah';

      // Try to extract specific error message from the API response
      if (error.response && error.response.message) {
        errorMessage = error.response.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      ToastUtils.error(errorMessage);
    } finally {
      this.isLoading = false;
      m.redraw();
    }
  },

  // Send data to API
  sendToAPI: async function(formData) {
    let response;
    if (formData._id) {
      // Update existing - this happens when editing existing data
      console.log('Updating existing perangkat daerah with ID:', formData._id);
      response = await APIUtils.update('perangkatdaerah', formData._id, formData);
      this.data = response;
    } else {
      // Create new - this should only happen when no data exists
      console.log('Creating new perangkat daerah');
      response = await APIUtils.create('perangkatdaerah', formData);
      this.data = response;
    }
  },

  // Switch tab
  switchTab: function(tabName) {
    this.activeTab = tabName;

    // Lazy-load Pengawas & Kontrak data when switching to Pengawas Lapangan
    if (tabName === 'pengawasLapangan') {
      this.loadPengawasList();
      this.loadKontrakList();
    }
  },

  // Load only pengawas users (role = pengawas)
  loadPengawasList: async function() {
    this.isLoadingPengawasList = true;
    m.redraw();
// TODO (refactor): Split PerangkatDaerah view into dedicated components under src/views/components
// Suggested components (each using APIUtils/UserUtils/ToastUtils):
// - components/PerangkatDaerahOrganisasi.js       -> Organisasi tab layout
// - components/PerangkatDaerahPejabat.js          -> Pejabat tab & modal
// - components/PerangkatDaerahPengguna.js         -> Pengguna tab & modal (Operator, Admin, Penyedia, Pengawas)
// - components/PerangkatDaerahPengawasLapangan.js -> Pengawas Lapangan tab with kontrak assignment & SK upload
//
// Integration pattern:
// import PerangkatDaerahOrganisasi from './components/PerangkatDaerahOrganisasi'
// import PerangkatDaerahPejabat from './components/PerangkatDaerahPejabat'
// import PerangkatDaerahPengguna from './components/PerangkatDaerahPengguna'
// import PerangkatDaerahPengawasLapangan from './components/PerangkatDaerahPengawasLapangan'
//
// Then in view():
// this.activeTab === 'organisasi' && m(PerangkatDaerahOrganisasi, { state: this })
// this.activeTab === 'pejabat' && m(PerangkatDaerahPejabat, { state: this })
// this.activeTab === 'pengguna' && m(PerangkatDaerahPengguna, { state: this })
// this.activeTab === 'pengawasLapangan' && m(PerangkatDaerahPengawasLapangan, { state: this })

    try {
      const response = await APIUtils.getAll('user');
      const allUsers = (response && response.data) || [];
      this.pengawasList = allUsers.filter(u => u.role === 'pengawas');
    } catch (error) {
      console.error('Error loading pengawas list:', error);
      this.pengawasList = [];
      ToastUtils.error('Gagal memuat data pengawas');
    }

    this.isLoadingPengawasList = false;
    m.redraw();
  },

  // Load global kontrak list for assignment (no subPerangkatDaerah filter)
  loadKontrakList: async function() {
    this.isLoadingKontrakList = true;
    m.redraw();

    try {
      const response = await APIUtils.request('/api/kontrak', {
        method: 'GET'
      });
      this.kontrakList = (response && response.data) || [];
    } catch (error) {
      console.error('Error loading kontrak list for pengawas:', error);
      this.kontrakList = [];
      ToastUtils.error('Gagal memuat data kontrak untuk pengawas');
    }

    this.isLoadingKontrakList = false;
    m.redraw();
  },

  // Load assignments for selected pengawas and hydrate SK form for viewing
  loadPengawasAssignments: async function(pengawasId) {
    if (!pengawasId) {
      this.pengawasAssignments = [];
      this.selectedPengawas = null;
      // Clear SK form when no pengawas selected
      this.skForm = {
        skNumber: '',
        skDate: '',
        file: null,
        fileName: '',
        fileSize: 0
      };
      this.skErrors = {};
      return;
    }

    this.isLoadingAssignments = true;
    m.redraw();

    try {
      const response = await APIUtils.request('/api/pengawas-kontrak', {
        method: 'GET',
        params: {
          pengawasId,
          active: true
        }
      });

      const assignments = (response && response.data) || [];
      this.pengawasAssignments = assignments;

      // Resolve selectedPengawas from current list
      this.selectedPengawas =
        this.pengawasList.find(p => p._id === pengawasId) || null;

      // Auto-populate SK metadata for viewing when selecting an already-assigned pengawas.
      // Strategy:
      // - If there are assignments:
      //   - Use the first assignment's skNumber/skDate/skFile metadata
      //   - Do NOT reattach file binary; just show filename if available.
      if (assignments.length > 0) {
        const first = assignments[0] || {};
        const skNumber = first.skNumber || '';
        const skDate = first.skDate
          ? new Date(first.skDate).toISOString().slice(0, 10)
          : '';

        const hasSkFileMeta =
          first.skFile &&
          (first.skFile.filename || first.skFile.size || first.skFile.contentType);

        this.skForm = {
          skNumber,
          skDate,
          file: null, // we don't have the binary; leave null
          fileName: hasSkFileMeta ? (first.skFile.filename || 'SK.pdf') : '',
          fileSize: hasSkFileMeta ? (first.skFile.size || 0) : 0
        };
      } else {
        // No assignments: reset SK form but keep it ready for new input
        this.skForm = {
          skNumber: '',
          skDate: '',
          file: null,
          fileName: '',
          fileSize: 0
        };
      }

      this.skErrors = {};
    } catch (error) {
      console.error('Error loading pengawas-kontrak assignments:', error);
      this.pengawasAssignments = [];
      this.skForm = {
        skNumber: '',
        skDate: '',
        file: null,
        fileName: '',
        fileSize: 0
      };
      this.skErrors = {};
      ToastUtils.error('Gagal memuat penugasan pengawas');
    }

    this.isLoadingAssignments = false;
    m.redraw();
  },

  // Handle SK file selection (PDF only, max 1MB)
  handleSkFileChange: function(e) {
    const file = e.target.files && e.target.files[0];
    this.skErrors = {};

    if (!file) {
      this.skForm.file = null;
      this.skForm.fileName = '';
      this.skForm.fileSize = 0;
      return;
    }

    if (file.type !== 'application/pdf') {
      this.skErrors.file = 'File SK harus dalam format PDF';
      this.skForm.file = null;
      this.skForm.fileName = '';
      this.skForm.fileSize = 0;
      ToastUtils.error('File SK harus PDF');
      return;
    }

    if (file.size > 1024 * 1024) {
      this.skErrors.file = 'Ukuran file SK maksimal 1MB';
      this.skForm.file = null;
      this.skForm.fileName = '';
      this.skForm.fileSize = 0;
      ToastUtils.error('Ukuran file SK maksimal 1MB');
      return;
    }

    this.skForm.file = file;
    this.skForm.fileName = file.name;
    this.skForm.fileSize = file.size;
  },

  // Validate SK form (for assignment set)
  validateSkForm: function() {
    this.skErrors = {};

    if (!this.selectedPengawasId) {
      this.skErrors.pengawas = 'Pilih pengawas terlebih dahulu';
    }

    if (!this.skForm.skNumber && !this.skForm.file) {
      this.skErrors.sk = 'Nomor SK atau file SK harus diisi';
    }

    return Object.keys(this.skErrors).length === 0;
  },

  // Submit new assignments (Pengawas → multiple Kontrak) with SK (multipart, m.request pattern)
  submitPengawasAssignments: async function(selectedKontrakIds) {
    if (!this.validateSkForm()) {
      ToastUtils.error('Harap lengkapi data SK dan pilih pengawas');
      m.redraw();
      return;
    }

    if (!selectedKontrakIds || selectedKontrakIds.length === 0) {
      ToastUtils.warning('Belum ada kontrak yang dipilih untuk penugasan');
      return;
    }

    try {
      // Build multipart form-data manually using m.request,
      // following the same pattern as vendor realisasi upload.
      const formData = new FormData();

      formData.append('pengawasId', this.selectedPengawasId);

      // Append each kontrakId as kontrakIds[]
      (selectedKontrakIds || []).forEach(id => {
        if (id) {
          formData.append('kontrakIds[]', id);
        }
      });

      if (this.skForm.skNumber) {
        formData.append('skNumber', this.skForm.skNumber);
      }
      if (this.skForm.skDate) {
        formData.append('skDate', this.skForm.skDate);
      }

      // Attach SK PDF if available and already validated
      if (this.skForm.file) {
        formData.append('skFile', this.skForm.file, this.skForm.file.name || 'sk.pdf');
      }

      // Get token the same way APIUtils does (via JWTUtils / authData)
      const token = (JWTUtils.getToken && JWTUtils.getToken())
        || (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null);

      // Use m.request directly for multipart (APIUtils is JSON-focused).
      await m.request({
        method: 'POST',
        url: '/api/pengawas-kontrak',
        body: formData,
        serialize: value => value, // let browser handle FormData boundary
        headers: token
          ? { Authorization: `Bearer ${token}` }
          : {}
      });

      ToastUtils.success('Penugasan pengawas berhasil disimpan');

      // Reset SK form but keep selected pengawas and kontrak data
      this.skForm = {
        skNumber: '',
        skDate: '',
        file: null,
        fileName: '',
        fileSize: 0
      };

      this.selectedKontrakIds = [];

      // Reload assignments for selected pengawas
      await this.loadPengawasAssignments(this.selectedPengawasId);
    } catch (error) {
      console.error('Error submitting pengawas-kontrak assignments:', error);

      // Normalize Mithril error shape (often { message, code, response })
      let message = 'Gagal menyimpan penugasan pengawas';
      if (error) {
        if (typeof error.message === 'string') {
          message = error.message;
        } else if (error.response && typeof error.response.message === 'string') {
          message = error.response.message;
        } else if (typeof error === 'string') {
          message = error;
        }
      }

      ToastUtils.error(message);
    } finally {
      m.redraw();
    }
  },

  view: function() {
    console.log('PerangkatDaerah view() called - using mounted tab components');

    return m('div', { class: 'space-y-6' }, [
      // Header
      m('div', { class: 'flex justify-between items-center' }, [
        m('div', [
          m('h1', { class: 'text-2xl font-bold text-gray-900' }, 'Perangkat Daerah'),
          m('p', { class: 'text-gray-600 mt-1' }, 'Kelola data organisasi perangkat daerah')
        ]),
        m('button', {
          class: `px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
            this.isEditing
              ? 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50'
              : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
          }`,
          onclick: () => this.toggleEdit(),
          disabled: this.isLoading
        }, [
          m('i', {
            class: `mr-2 ${this.isEditing ? 'ri-close-fill' : 'ri-edit-line'}`
          }),
          this.isEditing ? 'Batal' : 'Edit Perangkat Daerah'
        ])
      ]),

      // Tabs container
      m('div', { class: 'bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden' }, [
        // Tab Navigation
        m('div', { class: 'border-b border-gray-200' }, [
          m('nav', { class: 'flex space-x-8 px-6' }, [
            m('button', {
              class: `py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                this.activeTab === 'organisasi'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`,
              onclick: () => this.switchTab('organisasi')
            }, [
              m('i', { class: 'ri-building-line mr-2' }),
              'Organisasi'
            ]),
            m('button', {
              class: `py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                this.activeTab === 'pejabat'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`,
              onclick: () => this.switchTab('pejabat')
            }, [
              m('i', { class: 'ri-user-line mr-2' }),
              'Pejabat'
            ]),
            m('button', {
              class: `py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                this.activeTab === 'pengguna'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`,
              onclick: () => this.switchTab('pengguna')
            }, [
              m('i', { class: 'ri-user-settings-line mr-2' }),
              'Pengguna'
            ]),
            m('button', {
              class: `py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                this.activeTab === 'pengawasLapangan'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`,
              onclick: () => this.switchTab('pengawasLapangan')
            }, [
              m('i', { class: 'ri-shield-user-line mr-2' }),
              'Pengawas Lapangan'
            ])
          ])
        ]),

        // Tab Content Host (for m.mount usage)
        m('div', { class: 'p-6' }, [
          m('div', {
            id: 'perangkat-daerah-tab-container',
            class: 'w-full'
          })
        ])
      ])
    ]);
  },

  onupdate: function(vnode) {
    // Only (re)mount when activeTab actually changed to avoid blowing away input focus
    const container = document.getElementById('perangkat-daerah-tab-container');
    if (!container) return;

    if (this._lastMountedTab !== this.activeTab) {
      this.mountActiveTab(container);
    }
  },

  // Helper to mount the correct tab component using m.mount
  mountActiveTab: function(container) {
    const attrs = { state: this };

    // Record which tab is currently mounted to prevent unnecessary remounts
    this._lastMountedTab = this.activeTab;

    if (this.activeTab === 'organisasi') {
      m.mount(container, { view: () => m(PerangkatDaerahOrganisasi, attrs) });
    } else if (this.activeTab === 'pejabat') {
      m.mount(container, { view: () => m(PerangkatDaerahPejabat, attrs) });
    } else if (this.activeTab === 'pengguna') {
      m.mount(container, { view: () => m(PerangkatDaerahPengguna, attrs) });
    } else if (this.activeTab === 'pengawasLapangan') {
      m.mount(container, { view: () => m(PerangkatDaerahPengawasLapangan, attrs) });
    }
  }
}

export default PerangkatDaerah