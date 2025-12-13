# SIMRAPU - Sistem Informasi Manajemen Realisasi Anggaran Pekerjaan Umum

Aplikasi web untuk mengelola kinerja perangkat daerah dengan autentikasi dan manajemen data yang aman.

## 🛠️ Technology Stack

### Frontend Framework
- **Mithril.js** v2.3.7 - Lightweight, reactive frontend framework
- **TailwindCSS** v4.1.13 - Utility-first CSS framework
- **Remixicon** v4.6.0 - Icon library

### Backend & Database
- **Node.js** - Runtime environment
- **Fastify** v4.28.1 - Fast web framework for Node.js
- **@fastify/cors** v9.0.1 - CORS support for Fastify
- **@fastify/static** v7.0.4 - Static file serving for Fastify
- **@fastify/multipart** v8.3.0 - Multipart support for Fastify
- **MongoDB** - NoSQL database
- **Mongoose** v8.19.1 - MongoDB object modeling
- **bcryptjs** v2.4.3 - Password hashing
- **jsonwebtoken** v9.0.2 - JWT token management

### Build Tools & Development
- **esbuild** v0.23.0 - Fast JavaScript bundler
- **PostCSS** v8.5.6 - CSS post-processing
- **@tailwindcss/cli** v4.1.13 - TailwindCSS command line
- **nodemon** v3.0.1 - Development file watcher

### Custom Utilities
- **ExpiryStorage** - Custom localStorage with expiration
- **Toast Notifications** - Custom TailwindCSS notification system
- **Utils Library** - Centralized utilities for auth, storage, and UI

## 📚 Utils.js Documentation

### ⚠️ MANDATORY REQUIREMENT
**WAJIB**: **SEMUA** API calls dan autentikasi HARUS menggunakan **APIUtils** dan **UserUtils** dari utils.js.

#### 🚫 **LARANGAN KERAS:**
- ❌ Menggunakan fetch() langsung tanpa APIUtils
- ❌ Mengakses localStorage/sessionStorage langsung untuk auth data
- ❌ Membuat authentication logic sendiri
- ❌ Menggunakan toast notifications tanpa ToastUtils
- ❌ **NEW**: Menggunakan mixed Express/Fastify patterns dalam endpoints
- ❌ **NEW**: Tidak ada memory management untuk cache data
- ❌ **NEW**: API endpoints tidak menggunakan Fastify reply patterns

#### ✅ **YANG BENAR:**
- ✅ **APIUtils** untuk SEMUA HTTP requests
- ✅ **UserUtils** untuk autentikasi dan data pengguna
- ✅ **JWTUtils** untuk token management (internal use)
- ✅ **ToastUtils** untuk semua notifikasi
- ✅ **NEW**: Konsisten menggunakan Fastify reply.send() patterns
- ✅ **NEW**: Implementasi cache management dengan size limits
- ✅ **NEW**: Proper error handling dengan meaningful responses

## 🚀 Backend Standards (FASTIFY)

### ⚠️ CRITICAL: API Response Pattern Consistency
**WAJIB**: Semua endpoint HARUS menggunakan konsisten Fastify patterns.

#### ❌ SALAH - Mixed Express/Fastify Patterns:
```javascript
// SALAH - Menggabungkan Express dan Fastify
const pengadaanRouter = async (req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: true, data: result }));
};

// SALAH - Tidak menggunakan Fastify reply
const wrongHandler = (req, reply) => {
  res.json({ data: result }); // res tidak tersedia di Fastify
};
```

#### ✅ BENAR - Consistent Fastify Patterns:
```javascript
// BENAR - Konsisten menggunakan Fastify
const pengadaanRouter = async (request, reply) => {
  try {
    const result = await someAsyncOperation();
    reply.send({ success: true, data: result });
  } catch (error) {
    console.error('Error:', error);
    reply.code(500).send({ success: false, message: 'Internal server error' });
  }
};

// BENAR - Fastify pattern dengan proper error handling
const getItemHandler = async (request, reply) => {
  const { id } = request.params;
  
  try {
    const item = await Model.findById(id);
    if (!item) {
      return reply.code(404).send({ 
        success: false, 
        message: 'Item tidak ditemukan' 
      });
    }
    
    reply.send({ success: true, data: item });
  } catch (error) {
    console.error('Database error:', error);
    reply.code(500).send({ 
      success: false, 
      message: 'Terjadi kesalahan server' 
    });
  }
};
```

### 🔧 Backend Error Handling Standards

#### ✅ Standard Fastify Error Response Pattern:
```javascript
// Recommended error handling structure
const errorHandler = async (request, reply) => {
  try {
    // Your business logic here
    const result = await processData();
    return reply.send({
      success: true,
      data: result,
      message: 'Data berhasil diproses'
    });
  } catch (error) {
    // Log error for debugging
    console.error('Endpoint error:', {
      url: request.url,
      method: request.method,
      error: error.message,
      stack: error.stack
    });

    // Return standardized error response
    const errorResponse = {
      success: false,
      message: 'Terjadi kesalahan saat memproses permintaan',
      timestamp: new Date().toISOString()
    };

    // Determine appropriate HTTP status code
    if (error.name === 'ValidationError') {
      reply.code(400).send({ ...errorResponse, details: error.message });
    } else if (error.name === 'CastError') {
      reply.code(400).send({ ...errorResponse, message: 'ID tidak valid' });
    } else {
      reply.code(500).send(errorResponse);
    }
  }
};
```

### 🧠 Memory Management Standards (CRITICAL)

#### ⚠️ Cache Management Requirements
**WAJIB**: Semua cache implementations HARUS memiliki size limits dan cleanup mechanisms.

#### ✅ Frontend Cache Management Pattern:
```javascript
// BENAR - Cache dengan size management
const ComponentWithCache = {
  // Cache dengan size limit
  kodeRekeningCache: new Map(),
  maxCacheSize: 100, // Maximum entries

  // Cache cleanup method
  manageCacheSize: function() {
    if (this.kodeRekeningCache.size > this.maxCacheSize) {
      const entriesToRemove = this.kodeRekeningCache.size - this.maxCacheSize;
      const keys = Array.from(this.kodeRekeningCache.keys());
      
      // Remove oldest entries (FIFO)
      for (let i = 0; i < entriesToRemove; i++) {
        this.kodeRekeningCache.delete(keys[i]);
      }
      
      console.log(`Cache cleaned: removed ${entriesToRemove} entries`);
    }
  },

  // Using cache with automatic management
  fetchData: async function(ids) {
    const uncachedIds = ids.filter(id => !this.kodeRekeningCache.has(id));
    
    if (uncachedIds.length > 0) {
      const data = await APIUtils.request(`/api/endpoint?ids=${uncachedIds.join(',')}`);
      
      // Cache new data
      data.forEach(item => {
        this.kodeRekeningCache.set(item._id, item);
      });
      
      // Manage cache size
      this.manageCacheSize();
    }
    
    return ids.map(id => this.kodeRekeningCache.get(id)).filter(Boolean);
  }
};
```

### 🏗️ Backend File Structure Standards

#### ✅ Recommended Endpoint Structure:
```
endpoints/
├── auth.js              # Authentication endpoints
├── anggaran.js          # Budget management
├── kinerja.js           # Performance tracking
├── subkegiatan.js       # Sub-activity management
├── kontrak.js           # Contract management
├── pengadaan.js         # Procurement management
└── utils/
    ├── errorHandler.js  # Shared error handling
    ├── validators.js    # Input validation
    └── responseFormatter.js # Response standardization
```

#### ✅ Standard Endpoint Pattern:
```javascript
// endpoints/example.js
const { Model } = require('../models/Model');
const { validateInput } = require('./utils/validators');
const { sendError, sendSuccess } = require('./utils/responseFormatter');

module.exports = {
  // GET /api/example
  getAll: async (request, reply) => {
    try {
      const { page = 1, limit = 10, search } = request.query;
      
      const query = search ? { nama: { $regex: search, $options: 'i' } } : {};
      const skip = (page - 1) * limit;
      
      const [items, total] = await Promise.all([
        Model.find(query).skip(skip).limit(parseInt(limit)),
        Model.countDocuments(query)
      ]);
      
      sendSuccess(reply, {
        data: items,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Get all error:', error);
      sendError(reply, 'Gagal memuat data', 500);
    }
  },

  // GET /api/example/:id
  getById: async (request, reply) => {
    try {
      const { id } = request.params;
      
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return sendError(reply, 'Format ID tidak valid', 400);
      }
      
      const item = await Model.findById(id);
      if (!item) {
        return sendError(reply, 'Data tidak ditemukan', 404);
      }
      
      sendSuccess(reply, { data: item });
    } catch (error) {
      console.error('Get by ID error:', error);
      sendError(reply, 'Terjadi kesalahan server', 500);
    }
  },

  // POST /api/example
  create: async (request, reply) => {
    try {
      // Validate input
      const validation = validateInput(request.body);
      if (!validation.isValid) {
        return sendError(reply, validation.message, 400);
      }
      
      const newItem = new Model(validation.data);
      await newItem.save();
      
      sendSuccess(reply, { 
        data: newItem, 
        message: 'Data berhasil dibuat' 
      }, 201);
    } catch (error) {
      console.error('Create error:', error);
      if (error.code === 11000) {
        sendError(reply, 'Data sudah ada', 409);
      } else {
        sendError(reply, 'Gagal membuat data', 500);
      }
    }
  }
};
```

## 📚 Utils.js Documentation

### JWTUtils - JSON Web Token Management

```javascript
import { JWTUtils } from './src/js/utils.js';

// Menyimpan data autentikasi
JWTUtils.setAuthData(token, rememberMe, userData);
// rememberMe: true = 7 hari (menggunakan ExpiryStorage)
// rememberMe: false = sesi saat ini (menggunakan sessionStorage)

// Mendapatkan data autentikasi
const authData = JWTUtils.getAuthData();

// Membersihkan semua data autentikasi
JWTUtils.clearAuthData();

// Mengecek status autentikasi
const isLoggedIn = JWTUtils.isAuthenticated();

// Mendapatkan token saat ini
const token = JWTUtils.getToken();

// Logout dengan konfirmasi
showConfirmation('Apakah Anda yakin ingin keluar?', () => {
  JWTUtils.clearAuthData();
  m.route.set('/login');
});
```

### 🔐 Authentication Implementation Patterns (MANDATORY)

**SEMUA komponen HARUS mengikuti pola autentikasi berikut menggunakan UserUtils dan APIUtils:**

#### Login Authentication Flow
```javascript
// Login.js - Complete authentication flow dengan Fastify backend
const Login = {
  username: '',
  password: '',
  budgetYear: '2026-Murni', // Default budget year
  rememberMe: false, // Checkbox untuk "Ingat saya"

  handleSubmit: function(e) {
    e.preventDefault();

    if (!this.username || !this.password) {
      toast.error('Username dan password harus diisi');
      return;
    }

    if (!this.budgetYear) {
      toast.error('Tahun anggaran harus dipilih');
      return;
    }

    this.authenticateUser();
  },

  authenticateUser: async function() {
    this.isLoading = true;

    try {
      // Menggunakan APIUtils (MANDATORY)
      const data = await APIUtils.create('auth/login', {
        username: this.username,
        password: this.password,
        budgetYear: this.budgetYear
      });

      if (data.token) {
        // Store authentication data
        JWTUtils.setAuthData(data.token, this.rememberMe, data.user);

        toast.success(`Selamat datang, ${this.username}!`);
        m.route.set('/dashboard');
      } else {
        toast.error(data.message || 'Login gagal');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Terjadi kesalahan saat menghubungi server');
    } finally {
      this.isLoading = false;
      m.redraw();
    }
  }
};
```

#### Protected Route Implementation
```javascript
// ProtectedView.js - Authentication check pattern
const ProtectedView = {
  oninit: function() {
    // Check authentication before component initializes
    if (!UserUtils.isAuthenticated()) {
      toast.warning('Silakan masuk terlebih dahulu');
      m.route.set('/login');
      return;
    }

    // Load user data and component data
    this.userData = UserUtils.getUserData();
    this.loadComponentData();
  },

  loadComponentData: async function() {
    // Load data with authentication token
    const token = JWTUtils.getToken();
    if (!token) {
      toast.error('Token autentikasi tidak ditemukan');
      return;
    }

    try {
      const response = await fetch('/api/protected-endpoint', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.componentData = data;
      } else if (response.status === 401) {
        // Token expired or invalid
        toast.warning('Sesi login telah berakhir');
        JWTUtils.clearAuthData();
        m.route.set('/login');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Gagal memuat data');
    }
  }
};
```

### UserUtils - User Data Management (MANDATORY)

**SEMUA autentikasi dan manajemen data pengguna HARUS menggunakan UserUtils:**

```javascript
import { UserUtils } from './src/js/utils.js';

// Mendapatkan data pengguna lengkap
const userData = UserUtils.getUserData();
// Returns: { username, email, budgetYear, isAuthenticated, token }

// Mendapatkan informasi spesifik
const username = UserUtils.getUsername();
const email = UserUtils.getEmail();
const budgetYear = UserUtils.getBudgetYear();
const isAuth = UserUtils.isAuthenticated();
```

### StorageUtils - Storage Operations

```javascript
import { StorageUtils } from './src/js/utils.js';

// Menyimpan dengan expiry (opsional)
StorageUtils.set('key', data, 7 * 24 * 60 * 60 * 1000); // 7 hari

// Mengambil data
const data = StorageUtils.get('key');

// Menghapus data
StorageUtils.remove('key');
```

### APIUtils - HTTP Requests (MANDATORY)

**SEMUA HTTP requests HARUS menggunakan APIUtils, TIDAK boleh menggunakan fetch() langsung:**

```javascript
// ✅ BENAR - Menggunakan APIUtils (MANDATORY)
import { APIUtils } from './src/js/utils.js';

const data = await APIUtils.getAll('endpoint');
const item = await APIUtils.getById('endpoint', id);
const result = await APIUtils.create('endpoint', formData);
const updated = await APIUtils.update('endpoint', id, formData);

// ✅ BENAR - Delete dengan konfirmasi otomatis (MANDATORY)
const deleted = await APIUtils.delete('endpoint', id, nama);

// ❌ SALAH - Menggunakan fetch() langsung (DITOLAK)
const response = await fetch('/api/endpoint', {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' }
});
```

**KEUNTUNGAN menggunakan APIUtils:**
- ✅ Automatic JWT token injection
- ✅ Centralized error handling
- ✅ Automatic logout on 401 errors
- ✅ Consistent response format
- ✅ Toast notifications for success/error
- ✅ Built-in confirmation dialogs untuk delete operations
- ✅ Request/response logging

**🎯 APIUtils.delete() - Complete Delete Implementation:**

APIUtils sudah menyediakan method `delete()` yang LENGKAP dengan:
- ✅ **ToastUtils.confirm()** - Konfirmasi dialog otomatis
- ✅ **ToastUtils.success()** - Notifikasi sukses
- ✅ **ToastUtils.error()** - Notifikasi error
- ✅ **Authentication error handling** - Auto logout jika token expired
- ✅ **User-friendly messages** - Pesan dalam Bahasa Indonesia

```javascript
// ✅ BENAR - Menggunakan APIUtils.delete() (1 line solution)
APIUtils.delete('urusan', item._id, item.nama);

// ❌ SALAH - Membuat delete logic sendiri (BERTELE-TELE & ERROR-PRONE)
showConfirmation(
  `Apakah Anda yakin ingin menghapus ${item.nama}?`,
  () => {
    fetch(`/api/urusan/${item._id}`, { method: 'DELETE' })
      .then(response => {
        if (response.ok) {
          toast.success(`${item.nama} berhasil dihapus!`);
          this.loadData();
        } else {
          toast.error('Gagal menghapus data');
        }
      })
      .catch(error => {
        toast.error('Terjadi kesalahan koneksi');
      });
  }
);
```

### Toast Notifications - Custom Toaster System

```javascript
import toast from './src/js/toaster.js';

// Toast notifications menggunakan custom system (pojok kanan bawah)
toast.success('Berhasil menyimpan data');
toast.error('Terjadi kesalahan');
toast.warning('Peringatan: data belum lengkap');
toast.info('Informasi tambahan');
toast.notification('Notifikasi baru');

// Konfirmasi dialog menggunakan custom modal dengan TailwindCSS
import { showConfirmation, showPrompt } from './src/js/toaster.js';

showConfirmation(
  'Apakah Anda yakin ingin menghapus?',
  () => {
    // Konfirmasi - lakukan aksi
    console.log('Dihapus');
  },
  () => {
    // Batal - tidak lakukan aksi
    console.log('Tidak dihapus');
  }
);

// Prompt dialog menggunakan custom modal dengan input
showPrompt(
  'Masukkan nama lengkap',
  (value) => {
    console.log('Input:', value);
  },
  () => {
    console.log('Dibatalkan');
  },
  {
    type: 'text',
    placeholder: 'Nama lengkap...',
    required: true,
    confirmText: 'Simpan',
    cancelText: 'Batal'
  }
);
```

## 🌏 Language Standards

### 🇮🇩 Bahasa Indonesia Requirement
**WAJIB**: **SEMUA** teks UI/UX HARUS menggunakan **Bahasa Indonesia** yang baik dan benar.

#### ✅ **Contoh yang BENAR:**
- "Masuk" (bukan "Login")
- "Keluar" (bukan "Logout")
- "Dasbor" (bukan "Dashboard")
- "Pengguna" (bukan "Users")
- "Anggaran" (bukan "Budget")
- "Hapus" (bukan "Delete")
- "Simpan" (bukan "Save")
- "Batal" (bukan "Cancel")
- "Konfirmasi" (bukan "Confirm")
- "Peringatan" (bukan "Warning")

#### ❌ **Contoh yang SALAH:**
- Menggunakan bahasa Inggris
- Campuran bahasa Indonesia-Inggris
- Singkatan yang tidak umum
- Terminology teknis yang tidak diterjemahkan

#### 🎯 **Implementation:**
```javascript
// ✅ BENAR - Semua teks dalam Bahasa Indonesia
toast.success('Data berhasil disimpan');
toast.error('Gagal menghapus data');
toast.warning('Kode dan nama harus diisi');

// ❌ SALAH - Menggunakan bahasa Inggris
toast.success('Data saved successfully');
toast.error('Failed to delete data');
```

## 🔔 UI/UX Standards

### ⚠️ UX IMPROVEMENT MANDATORY
**WAJIB**: Setiap UI yang dibuat atau diperbaiki HARUS mengimplementasikan UX improvements berikut:

- ✅ **Confirmation Dialogs**: Semua delete operations WAJIB pakai showConfirmation()
- ✅ **Loading Animations**: Semua action buttons WAJIB punya loading state
- ✅ **Error Handling**: Semua async operations WAJIB ada error handling yang user-friendly
- ✅ **User Feedback**: Setiap aksi WAJIB kasih feedback ke user (success/error/warning)
- ✅ **Progressive Loading**: Data loading WAJIB ada loading indicator
- ✅ **Form Validation**: Input validation WAJIB dengan pesan error yang jelas

**KONSEKUENSI TIDAK MENGIKUTI STANDAR:**
- UI ditolak dan harus diperbaiki
- Code review tidak akan diluluskan
- Tidak boleh di-deploy ke production

### Confirmation Dialogs (Delete Operations)
**STANDAR**: Semua operasi penghapusan HARUS menggunakan konfirmasi dialog.

#### 🎯 **APIUtils.delete() - RECOMMENDED (1 line solution)**
```javascript
// ✅ PALING BENAR - APIUtils.delete() sudah include ToastUtils.confirm()
onclick: () => APIUtils.delete('endpoint', item._id, item.nama)
```

#### 🔧 **Manual Implementation - HANYA jika perlu customization**
```javascript
// ❌ SALAH - Direct delete tanpa konfirmasi
onclick: () => this.deleteItem()

// ✅ BENAR - Gunakan ToastUtils.confirm() (hanya jika APIUtils.delete() tidak cukup)
onclick: () => {
  ToastUtils.confirm(
    `Apakah Anda yakin ingin menghapus ${item.nama}?`,
    () => this.deleteItem(item),
    () => console.log('Penghapusan dibatalkan')
  );
}
```

**📋 APIUtils.delete() vs Manual Implementation:**

| Feature | APIUtils.delete() | Manual showConfirmation() |
|---------|------------------|---------------------------|
| **Konfirmasi Dialog** | ✅ Auto included | ✅ Manual |
| **Success Toast** | ✅ Auto included | ❌ Manual needed |
| **Error Toast** | ✅ Auto included | ❌ Manual needed |
| **Auth Error Handling** | ✅ Auto included | ❌ Manual needed |
| **Code Lines** | 1 line | 10+ lines |
| **Consistency** | ✅ Guaranteed | ❌ Depends on developer |

**💡 RECOMMENDATION**: Selalu gunakan `APIUtils.delete()` kecuali ada kebutuhan khusus untuk customization.

### Button Loading Animation
**STANDAR**: Semua tombol aksi HARUS menunjukkan loading state saat proses.

```javascript
// ❌ SALAH - Tidak ada loading state
m('button', {
  class: 'btn btn-primary',
  onclick: () => this.saveItem()
}, 'Simpan')

// ✅ BENAR - Loading state dengan animasi
m('button', {
  class: `btn btn-primary ${this.isLoading ? 'loading' : ''}`,
  disabled: this.isLoading,
  onclick: () => this.saveItem()
}, this.isLoading ? 'Menyimpan...' : 'Simpan')
```

### Error Handling Standards
**STANDAR**: Error handling HARUS user-friendly dengan pesan yang jelas.

```javascript
// ❌ SALAH - Error handling tidak lengkap
} catch (error) {
  console.error('Error:', error);
}

// ✅ BENAR - Comprehensive error handling
} catch (error) {
  console.error('Error saving:', error);
  toast.error('Terjadi kesalahan saat menyimpan data');
}
```

### Complete CRUD Implementation Pattern
```javascript
const ViewComponent = {
  // State management
  isLoading: false,
  showModal: false,
  modalMode: 'create',
  // NEW: Cache management
  dataCache: new Map(),
  maxCacheSize: 100,

  // Form data
  formData: {
    kode: '',
    nama: ''
  },

  // Cache management (NEW)
  manageCache: function() {
    if (this.dataCache.size > this.maxCacheSize) {
      const entriesToRemove = this.dataCache.size - this.maxCacheSize;
      const keys = Array.from(this.dataCache.keys());
      for (let i = 0; i < entriesToRemove; i++) {
        this.dataCache.delete(keys[i]);
      }
    }
  },

  // Create operation
  saveItem: async function() {
    if (!this.formData.kode || !this.formData.nama) {
      toast.warning('Kode dan nama harus diisi');
      return;
    }

    this.isLoading = true;
    m.redraw();

    try {
      const response = await APIUtils.create('endpoint', this.formData);
      toast.success('Data berhasil disimpan');
      this.closeModal();
      this.loadData();
    } catch (error) {
      console.error('Error:', error);
      // APIUtils sudah menangani error, jadi tidak perlu toast di sini
    }

    this.isLoading = false;
    m.redraw();
  },

  // Delete operation dengan APIUtils (SIMPLE & COMPLETE)
  deleteItem: async function(item) {
    try {
      await APIUtils.delete('endpoint', item._id, item.nama);
      this.loadData(); // Refresh data setelah berhasil hapus
    } catch (error) {
      // Error handling sudah dilakukan oleh APIUtils
      console.error('Delete error:', error);
    }
  },

  // UI dengan loading animation
  view: function() {
    return m('div', [
      // Button dengan loading state
      m('button', {
        class: `btn btn-primary ${this.isLoading ? 'loading' : ''}`,
        disabled: this.isLoading,
        onclick: () => this.saveItem()
      }, this.isLoading ? 'Menyimpan...' : 'Simpan'),

      // Delete button dengan APIUtils (includes confirmation)
      m('button', {
        class: 'btn btn-error',
        onclick: () => this.deleteItem(item)
      }, 'Hapus')
    ]);
  }
};
```

## 🎨 UI/UX Guidelines

### Bahasa Indonesia Requirement
**SEMUA teks UI/UX HARUS menggunakan Bahasa Indonesia.**

✅ **Benar:**
- "Masuk" (bukan "Login")
- "Keluar" (bukan "Logout")
- "Dashboard" → "Dasbor"
- "Pengguna" (bukan "Users")
- "Anggaran" (bukan "Budget")

❌ **Salah:**
- Menggunakan bahasa Inggris
- Campuran bahasa Indonesia-Inggris
- Singkatan yang tidak umum

### CSS Framework Usage Rules

#### Pure TailwindCSS (Semua Views)
```html
<!-- ✅ GUNAKAN Pure TailwindCSS untuk semua komponen -->
<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8">
      <h1 class="text-4xl font-bold text-gray-800 mb-4">Hello</h1>
      <p class="text-gray-600 mb-6">Selamat datang di aplikasi SIMRAPU</p>
      <button class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200">
        Mulai
      </button>
    </div>
  </div>
</div>
```

#### Layout.js (Pure TailwindCSS)
```html
<!-- ✅ GUNAKAN Pure TailwindCSS untuk Layout.js -->
<nav class="bg-white shadow-sm border-b border-gray-200">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex justify-between h-16">
      <!-- Navbar content dengan pure TailwindCSS -->
    </div>
  </div>
</nav>
```

### Component Structure Rules

#### Layout.js (Pure TailwindCSS)
- Navbar dengan styling manual menggunakan utility classes
- Sidebar dengan state management dan custom styling
- Footer dengan pure TailwindCSS utility classes
- Background gradients dan shadow effects untuk visual appeal

#### Other Views (Pure TailwindCSS)
- Gunakan utility classes untuk semua komponen
- Hero sections dengan gradient backgrounds
- Cards dengan custom shadows dan borders
- Buttons dengan hover effects dan transitions
- Forms dengan focus states dan validation styling

## 🏗️ Architecture Patterns

### Component Structure
```
simrapu/
├── server.js             # Fastify server entry point
├── src/
│   ├── js/
│   │   ├── utils.js          # Utilities terpusat
│   │   ├── expiryStorage.js  # Storage dengan expiry
│   │   └── toaster.js        # Legacy (deprecated)
│   ├── views/
│   │   ├── Layout.js         # Pure TailwindCSS
│   │   ├── Login.js          # Pure TailwindCSS
│   │   ├── Dashboard.js      # Pure TailwindCSS
│   │   └── components/       # Reusable components
│   └── index.js              # Routing & auth
├── endpoints/            # Fastify route handlers
│   ├── auth.js           # Authentication endpoints
│   ├── urusan.js         # Urusan management endpoints
│   ├── utils/            # NEW: Backend utilities
│   │   ├── errorHandler.js  # Shared error handling
│   │   ├── validators.js    # Input validation
│   │   └── responseFormatter.js # Response standardization
│   └── ...               # Other endpoint modules
├── models/               # MongoDB models
└── public/               # Static files (served by Fastify)
```

### Authentication Flow
```javascript
// 1. Login dengan remember me option
const rememberMe = true; // true = 7 hari, false = sesi saat ini
JWTUtils.setAuthData(token, rememberMe, userData);

// 2. Auto-redirect jika tidak authenticated
if (!UserUtils.isAuthenticated()) {
  m.route.set('/login');
}

// 3. Authentication check di setiap protected component
const ProtectedComponent = {
  oninit: function() {
    if (!UserUtils.isAuthenticated()) {
      toast.warning('Silakan masuk terlebih dahulu');
      m.route.set('/login');
      return;
    }
    this.userData = UserUtils.getUserData();
  }
};

// 4. API request dengan authentication
const token = JWTUtils.getToken();
const response = await fetch('/api/protected-endpoint', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// 5. Logout dengan konfirmasi
showConfirmation('Apakah Anda yakin ingin keluar?', () => {
  JWTUtils.clearAuthData();
  m.route.set('/login');
});
```

### State Management
```javascript
// Layout.js menggunakan state internal dengan TailwindCSS styling
const Layout = {
  oninit: function() {
    this.isSidebarOpen = true;
  },

  toggleSidebar: function() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }
};

// Views menggunakan utils untuk data global dengan custom styling
const Dashboard = {
  oninit: function() {
    this.userData = UserUtils.getUserData();
  }
};
```

## 🎨 Standard Form Layout & Styling

### 📋 Form Design Standards
**STANDAR**: Semua form HARUS mengikuti layout dan styling yang telah ditetapkan untuk konsistensi UI/UX.

#### ✅ **Beautiful Form Structure (STANDAR):**
```javascript
// Modal dengan gradient header
m('div', {
  class: 'bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all'
}, [
  // Enhanced Modal Header
  m('div', {
    class: 'bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-xl'
  }, [
    m('div', { class: 'flex items-center justify-between' }, [
      m('div', { class: 'flex items-center space-x-3' }, [
        m('div', {
          class: 'w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center'
        }, [
          m('i', { class: 'ri-add-line text-xl' })
        ]),
        m('div', [
          m('h3', { class: 'text-xl font-bold' }, 'Tambah Data'),
          m('p', { class: 'text-white text-opacity-80 text-sm' }, 'Formulir input data')
        ])
      ]),
      m('button', {
        class: 'w-8 h-8 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center transition-all',
        onclick: () => this.closeModal()
      }, [
        m('i', { class: 'ri-close-line text-lg' })
      ])
    ])
  ]),

  // Modal Body dengan enhanced form fields
  m('div', { class: 'p-6' }, [
    m('div', { class: 'space-y-6' }, [
      // Field dengan icon dan enhanced styling
      m('div', [
        m('label', { class: 'block text-sm font-semibold text-gray-800 mb-2' }, [
          m('i', { class: 'ri-hashtag mr-1 text-blue-500' }),
          'Kode'
        ]),
        m('div', { class: 'relative' }, [
          m('input', {
            type: 'text',
            class: 'w-full pl-4 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-gray-50 focus:bg-white',
            placeholder: 'Contoh: 01, 02, 03...'
          }),
          m('div', { class: 'absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm' },
            '0/10'
          )
        ])
      ])
    ])
  ]),

  // Enhanced Modal Actions
  m('div', {
    class: 'flex justify-end gap-3 pt-6 border-t border-gray-200 bg-gray-50 px-6 py-4 rounded-b-xl'
  }, [
    m('button', {
      class: 'px-6 py-3 bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-gray-400 rounded-lg text-gray-700 font-medium transition-all duration-200 flex items-center space-x-2',
      onclick: () => this.closeModal()
    }, [
      m('i', { class: 'ri-close-line' }),
      m('span', 'Batal')
    ]),
    m('button', {
      class: 'px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2',
      onclick: () => this.saveItem()
    }, [
      this.isLoading ? m('i', { class: 'ri-loader-4-line animate-spin' }) : m('i', { class: 'ri-save-line' }),
      m('span', this.isLoading ? 'Menyimpan...' : 'Simpan')
    ])
  ])
])
```

#### 🎨 **Field Design Standards:**

1. **Header dengan Gradient:**
   - Create: `from-blue-500 to-purple-600`
   - Delete: `from-red-500 to-red-600`
   - Icon dalam circle dengan background opacity

2. **Form Fields dengan Icons:**
   - ✅ **Kode Field**: Blue hashtag icon (`ri-hashtag`)
   - ✅ **Nama Field**: Green text icon (`ri-text`)
   - ✅ **Kinerja Field**: Amber target icon (`ri-target-line`)
   - ✅ **Indikator Field**: Emerald chart icon (`ri-bar-chart-line`)
   - ✅ **Satuan Field**: Violet scales icon (`ri-scales-line`)

3. **Enhanced Input Styling:**
   - `border-2 border-gray-200` (thicker border)
   - `focus:border-[color]-500` (colored focus)
   - `bg-gray-50 focus:bg-white` (background transition)
   - `transition-all duration-200` (smooth animations)

4. **Character Counter:**
   - Untuk field kode: `this.formData.kode.length + '/10'`
   - Posisi: `absolute right-3 top-1/2`

5. **Button Styling:**
   - Cancel: `bg-white border-2 border-gray-300`
   - Action: `bg-gradient-to-r from-blue-500 to-purple-600`
   - Delete: `bg-gradient-to-r from-red-500 to-red-600`
   - Loading: `ri-loader-4-line animate-spin`

#### 🗑️ **Delete Confirmation Standard:**
```javascript
m('div', { class: 'text-center py-6' }, [
  m('div', { class: 'mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center' }, [
    m('i', { class: 'ri-delete-bin-line text-2xl text-red-500' })
  ]),
  m('p', { class: 'text-gray-700 font-medium mb-2' }, 'Hapus Data:'),
  m('p', { class: 'text-gray-600 mb-2' }, `"${item.nama}"`),
  m('p', { class: 'text-red-500 text-sm' }, '⚠️ Tindakan ini tidak dapat dibatalkan.')
])
```

#### ✨ **Special Fields Section:**
```javascript
// Untuk field khusus (seperti SubKegiatan)
m('div', { class: 'space-y-6 border-t border-gray-200 pt-6' }, [
  m('div', { class: 'text-center mb-4' }, [
    m('div', { class: 'inline-flex items-center space-x-2 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-sm font-medium' }, [
      m('i', { class: 'ri-star-line' }),
      m('span', 'Field Khusus Sub Kegiatan')
    ])
  ]),
  // Field khusus dengan color-coded icons
])
```

## 📖 Code Examples

#### Beautiful Form dengan Custom Styling dan Preview
```javascript
// Form yang indah dengan custom styling, preview, dan TailwindCSS
m('div', { class: 'space-y-6' }, [
  m('div', { class: 'bg-gray-50 p-6 rounded-xl border border-gray-200' }, [
    m('h4', { class: 'text-lg font-semibold text-gray-800 mb-4 flex items-center' }, [
      m('i', { class: 'ri-information-line mr-2 text-blue-500' }),
      'Informasi Urusan'
    ]),

    m('div', { class: 'mb-4' }, [
      m('label', { class: 'block text-sm font-medium text-gray-700 mb-2' }, [
        m('i', { class: 'ri-hashtag mr-1 text-blue-500' }),
        'Kode Urusan'
      ]),
      m('input', {
        type: 'text',
        class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-gray-50 focus:bg-white',
        placeholder: 'Contoh: 01, 02, 03...'
      }),
      m('p', { class: 'mt-2 text-sm text-gray-600' }, [
        m('i', { class: 'ri-information-line mr-1 text-blue-400' }),
        'Kode unik untuk mengidentifikasi urusan'
      ])
    ])
  ]),

  // Preview card
  (formData.kode || formData.nama) && m('div', {
    class: 'bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200'
  }, [
    m('div', { class: 'flex items-center mb-2' }, [
      m('i', { class: 'ri-eye-line mr-2 text-blue-500' }),
      m('span', { class: 'text-sm font-medium text-gray-700' }, 'Pratinjau')
    ]),
    m('div', { class: 'bg-white p-3 rounded-md border border-gray-200' }, [
      m('span', { class: 'font-mono text-sm text-gray-800' }, formData.kode || 'XX'),
      m('span', { class: 'mx-2 text-gray-400' }, '-'),
      m('span', { class: 'text-sm text-gray-700' }, formData.nama || 'Nama')
    ])
  ])
])
```

#### Login Form dengan Pure TailwindCSS
```javascript
m('div', { class: 'min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center' }, [
  m('div', { class: 'bg-white rounded-xl shadow-2xl p-8 w-full max-w-sm' }, [
    m('form', { class: 'space-y-6' }, [
      m('div', [
        m('label', { class: 'block text-sm font-semibold text-gray-700 mb-2' }, 'Username'),
        m('input', {
          type: 'text',
          class: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-gray-50 focus:bg-white',
          required: true
        })
      ]),
      m('div', { class: 'pt-4' }, [
        m('button', {
          type: 'submit',
          class: 'w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl'
        }, 'Masuk')
      ])
    ])
  ])
]);
```

#### Form Validation dengan Pure TailwindCSS
```javascript
// Form dengan validation states
m('div', [
  m('label', { class: 'block text-sm font-semibold text-gray-700 mb-2' }, [
    m('span', 'Email'),
    m('span', { class: 'text-red-500 ml-1' }, '*')
  ]),
  m('input', {
    type: 'email',
    class: `w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${
      this.errors.email
        ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50'
        : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200 bg-gray-50 focus:bg-white'
    }`,
    value: this.formData.email,
    oninput: (e) => this.updateField('email', e.target.value)
  }),
  this.errors.email && m('p', { class: 'mt-2 text-sm text-red-600' }, this.errors.email)
])
```

### Toast Notifications
```javascript
// Toast notifications muncul di pojok kanan bawah dengan custom TailwindCSS
toast.success('Data berhasil disimpan');
toast.error('Gagal menghapus data');
toast.warning('Peringatan: data belum lengkap');
toast.info('Informasi tambahan');
toast.notification('Notifikasi baru');

// Konfirmasi modal muncul di tengah layar dengan custom styling
showConfirmation(
  'Hapus data ini?',
  () => deleteData(),
  () => console.log('Dibatalkan')
);
```

### Authentication Check
```javascript
// Di komponen yang memerlukan autentikasi
const ProtectedView = {
  oninit: function() {
    if (!UserUtils.isAuthenticated()) {
      toast.warning('Silakan masuk terlebih dahulu');
      m.route.set('/login');
      return;
    }
    this.userData = UserUtils.getUserData();
  },

  view: function() {
    return m('div', { class: 'p-6' }, [
      m('h1', { class: 'text-2xl font-bold' }, `Selamat datang, ${this.userData.username}`)
    ]);
  }
};
```

## 🔒 Security Guidelines

### Password Handling
- **Frontend**: Jangan pernah menyimpan password plain text
- **Backend**: Selalu hash password dengan bcrypt
- **JWT**: Gunakan token untuk autentikasi, bukan password

### Storage Security
- **localStorage**: Untuk data yang perlu persist (remember me)
- **sessionStorage**: Untuk data sesi saja
- **ExpiryStorage**: Untuk data dengan batas waktu tertentu

### 🔧 JWT Token Expiration Fix
**MASALAH UMUM**: JWT token expired meskipun "Remember Me" dicentang.

**PENYEBAB**:
- Frontend menyimpan auth data untuk 7 hari (`ExpiryStorage`)
- Backend membuat token yang expire dalam 24 jam
- Setelah 24 jam, semua API request gagal dengan error 401

**SOLUSI**:
```javascript
// ✅ endpoints/auth.js - Ubah expiration dari '24h' ke '7d'
const token = jwt.sign(
  { userId: user._id, username: user.username },
  JWT_SECRET,
  { expiresIn: '7d' } // HARUS sama dengan frontend expectation
);
```

**PENTING**: Setelah mengubah JWT expiration, **HARUS restart server**:
```bash
# ✅ Cara yang BENAR
cd c:/Codes/node/2025/simrapu
npm start

# Atau jika menggunakan nodemon untuk development
npm run dev
```

### Best Practices
- Validasi input di frontend dan backend
- Gunakan HTTPS di production
- Clear sensitive data saat logout
- Implement proper error handling
- Konsistensi expiration time frontend-backend

## 🚀 Development Guidelines

### ⚠️ Terminal Management (CRITICAL)
**STRICTLY PROHIBITED**: Menggunakan `taskkill /f /im node.exe` karena akan **MEMBUNUH MCP SERVERS** yang sedang berjalan.

### 🔧 Server Restart Requirements
**PENTING**: Setelah mengubah konfigurasi authentication (seperti JWT expiration), **HARUS restart server**:

```bash
# ✅ Cara yang BENAR
cd c:/Codes/node/2025/simrapu
npm start

# Atau jika menggunakan nodemon untuk development
npm run dev
```

### 🔐 JWT Token Expiration Configuration
**KRITIS**: Pastikan konsistensi antara frontend dan backend:

- **Frontend "Remember Me"**: 7 hari (`ExpiryStorage`)
- **JWT Token Expiration**: 7 hari (`expiresIn: '7d'`)
- **SessionStorage**: Hanya untuk sesi saat ini

**File yang perlu disesuaikan:**
- `endpoints/auth.js` - Backend JWT expiration
- `src/js/utils.js` - Frontend storage logic
- `server.js` - Fastify server configuration

#### ❌ **LARANGAN KERAS:**
```bash
# ❌ JANGAN PERNAH gunakan command ini
taskkill /f /im node.exe

# ❌ JANGAN PERNAH gunakan command ini
taskkill /f /im *
```

#### ✅ **Cara yang BENAR untuk menghentikan proses:**
```bash
# ✅ Gunakan Ctrl+C di terminal yang menjalankan proses
# ✅ Atau tutup terminal dengan tombol X
# ✅ Atau gunakan Task Manager untuk menghentikan terminal spesifik
```

### 🚀 Fastify Server Setup

#### Development Server
```bash
# Start development server dengan nodemon (auto-restart on changes)
npm run dev

# Atau start biasa
npm start

# Build assets (CSS & JS)
npm run build
```

#### Production Deployment
```bash
# Build untuk production
npm run build

# Start production server
NODE_ENV=production npm start
```

#### ✅ Migration from Vercel to Fastify - COMPLETED

**MIGRATION SUMMARY:**
- ✅ **Removed Vercel**: All `vercel.json`, serverless functions, and Vercel-specific configurations
- ✅ **Fastify Framework**: Successfully replaced Vercel's serverless architecture with Fastify v4.28.1
- ✅ **API Endpoints**: All major endpoints migrated from Node.js HTTP to Fastify routes
- ✅ **Static Files**: Frontend served directly from `public/` directory by Fastify
- ✅ **Authentication**: JWT middleware working with automatic token verification
- ✅ **Database**: MongoDB connection maintained and optimized
- ✅ **Performance**: Traditional Node.js server providing better performance than serverless cold starts
- ✅ **Development**: Hot reload with nodemon for efficient development workflow

**MIGRATION BENEFITS:**
- 🚀 **Better Performance**: No cold start delays, faster API responses
- 💰 **Cost Effective**: No serverless function costs for API calls
- 🔧 **Full Control**: Complete control over server configuration and middleware
- 📈 **Scalability**: Better horizontal scaling options for production
- 🛠️ **Development Experience**: Hot reload, better debugging, simpler deployment
- 📊 **Monitoring**: Easier monitoring and logging with traditional server setup

**API ENDPOINTS MIGRATED:**
- ✅ `/api/auth` - Authentication endpoints (login, register, select-year)
- ✅ `/api/anggaran` - Budget management endpoints
- ✅ `/api/kinerja` - Performance tracking endpoints
- ✅ `/api/subkegiatan` - Sub-activity management endpoints
- ✅ `/api/perangkatdaerah` - Government agency management
- ✅ `/api/subperangkatdaerah` - Sub-agency management
- ✅ `/api/pengadaan` - Procurement management
- ✅ All other endpoints following the same pattern

**FASTIFY FEATURES IMPLEMENTED:**
- 🚀 **High Performance**: Fastify's fastest web framework for Node.js
- 🔒 **JWT Authentication**: Automatic token verification middleware
- 🌐 **CORS Support**: Cross-origin requests enabled for frontend
- 📁 **Static File Serving**: Efficient file serving from `public/` directory
- 📦 **Multipart Support**: File upload handling via `@fastify/multipart`
- 🛡️ **Error Handling**: Comprehensive error handling with proper HTTP status codes
- 📝 **Request Logging**: Built-in request/response logging
- 🔄 **Hot Reload**: Nodemon integration for development

#### 🚨 **Konsekuensi Pelanggaran:**
- **MCP Servers mati** dan perlu di-restart manual
- **Kehilangan koneksi** ke semua MCP tools (MongoDB, Playwright, etc.)
- **Gangguan development** untuk semua developer
- **Waktu hilang** untuk setup ulang environment

### File Organization
```
src/
├── js/           # Utilities dan helpers
├── views/        # Komponen UI
│   ├── Layout.js # Pure TailwindCSS
│   └── *.js      # Pure TailwindCSS components
├── icons.js      # Icon definitions
└── index.js      # Main app file
```

### Naming Conventions
- **Files**: PascalCase untuk komponen (Login.js)
- **Variables**: camelCase untuk state
- **Constants**: UPPER_CASE untuk konfigurasi
- **Functions**: camelCase untuk utilities

### Code Style
- Gunakan 2 spaces untuk indentation
- Semicolon di akhir statement
- ES6+ syntax (arrow functions, destructuring, etc.)
- JSDoc untuk function documentation

## 🧪 Quality Assurance (QA) Standards

### ⚠️ NEW: QA Integration Requirements
**SEBELUM deploy ke production, WAJIBQA testing dengan standar berikut:**

#### Backend QA Requirements:
- ✅ **API Response Consistency**: Semua endpoint menggunakan Fastify reply patterns
- ✅ **Error Handling**: Comprehensive error responses dengan meaningful messages
- ✅ **Memory Management**: Cache implementations dengan size limits
- ✅ **Input Validation**: Backend validation untuk semua inputs
- ✅ **Database Connections**: Proper connection handling dan error recovery

#### Frontend QA Requirements:
- ✅ **APIUtils Compliance**: 100% menggunakan APIUtils untuk HTTP requests
- ✅ **Memory Leak Prevention**: Cache management dengan automatic cleanup
- ✅ **Loading States**: Semua async operations memiliki loading indicators
- ✅ **Error Boundaries**: Graceful handling untuk UI errors
- ✅ **User Experience**: Confirmation dialogs untuk destructive actions

#### Performance QA Requirements:
- ✅ **API Response Times**: Monitoring untuk response time degradation
- ✅ **Memory Usage**: Check untuk memory leaks setelah extended use
- ✅ **Database Performance**: Query optimization dan indexing verification
- ✅ **Frontend Performance**: Cache hit rates dan rendering performance

#### Security QA Requirements:
- ✅ **Authentication**: JWT token handling dan expiration consistency
- ✅ **Input Sanitization**: XSS dan injection prevention
- ✅ **Authorization**: Role-based access control verification
- ✅ **Data Privacy**: Sensitive data handling dan storage

### 📋 NEW: Pre-Deployment QA Checklist
**MANDATORY**: Complete checklist sebelum production deployment

- [ ] **Backend API Testing**: Semua endpoints tested dengan various scenarios
- [ ] **Frontend UI Testing**: Complete user flow testing dengan real data
- [ ] **Error Scenario Testing**: Network failures, timeouts, invalid inputs
- [ ] **Memory Management Testing**: Extended usage without memory leaks
- [ ] **Performance Testing**: Load testing dengan realistic data volumes
- [ ] **Security Testing**: Authentication, authorization, data validation
- [ ] **Browser Compatibility**: Testing di multiple browsers
- [ ] **Mobile Responsiveness**: Testing di mobile devices

### 🐛 NEW: Bug Tracking Standards

#### Critical Issues (MUST FIX):
- API response inconsistencies
- Memory leaks
- Authentication failures
- Data corruption risks
- Security vulnerabilities

#### High Priority Issues:
- UI rendering failures
- Performance degradation
- Error boundary gaps
- User experience issues

#### Medium Priority Issues:
- UI inconsistencies
- Minor performance issues
- Documentation gaps

### 📊 NEW: Performance Monitoring

#### Metrics to Monitor:
- **API Response Times**: Average, 95th percentile, maximum
- **Memory Usage**: Heap usage trends, garbage collection frequency
- **Database Performance**: Query execution times, connection pool usage
- **Frontend Performance**: Render times, cache hit rates, bundle sizes

#### Alert Thresholds:
- API response time > 500ms (warning)
- API response time > 2000ms (critical)
- Memory usage > 80% of available heap (warning)
- Error rate > 5% (critical)

## 📝 Notes

- **Semua komponen**: Gunakan pure TailwindCSS untuk konsistensi
- **Bahasa Indonesia**: Wajib untuk semua teks UI
- **Utils.js**: Sumber kebenaran untuk autentikasi dan data pengguna
- **Toast notifications**: Custom TailwindCSS alerts positioned bottom-right
- **Modal dialogs**: Custom modal implementation dengan TailwindCSS
- **Utility-first approach**: Kombinasi utility classes untuk hasil terbaik

### 🚨 KONSEKUENSI TIDAK MENGGUNAKAN UTILS (MANDATORY)

**PENTING**: Kode yang tidak menggunakan APIUtils dan UserUtils **TIDAK AKAN DITERIMA** dan **HARUS DIPERBAIKI**.

#### ❌ **Kode yang DITOLAK:**
- Menggunakan `fetch()` langsung tanpa APIUtils
- Mengakses `localStorage.getItem('token')` langsung
- Membuat authentication logic sendiri
- Tidak menggunakan UserUtils untuk cek autentikasi
- **NEW**: Mixed Express/Fastify patterns dalam endpoints
- **NEW**: Cache tanpa size management

#### ✅ **Kode yang DITERIMA:**
- **APIUtils** untuk semua HTTP requests
- **UserUtils** untuk autentikasi dan data pengguna
- **ToastUtils** untuk semua notifikasi
- **JWTUtils** hanya untuk internal token management
- **NEW**: Consistent Fastify patterns dengan proper error handling
- **NEW**: Cache management dengan size limits dan cleanup

#### 🔧 **Proses Perbaikan:**
1. Code review akan menolak kode yang tidak menggunakan utils
2. Developer harus memperbaiki kode sesuai standar
3. Kode diperiksa ulang setelah perbaikan
4. Hanya kode yang memenuhi standar yang di-deploy
5. **NEW**: QA testing required sebelum deployment approval

### 🚨 NEW: Development Workflow Standards

#### 1. Feature Development Process:
1. **Planning**: Define requirements dan acceptance criteria
2. **Implementation**: Follow coding standards dan patterns
3. **Testing**: Unit tests, integration tests, QA testing
4. **Code Review**: Peer review dengan checklist compliance
5. **QA Approval**: QA sign-off required sebelum merge
6. **Deployment**: Staging testing, production deployment

#### 2. Bug Fix Process:
1. **Bug Report**: Detailed reproduction steps
2. **Impact Assessment**: Severity classification
3. **Root Cause Analysis**: Debugging dan identification
4. **Fix Implementation**: Standard-compliant solution
5. **Verification**: QA testing untuk fix validation
6. **Deployment**: Controlled rollout dengan monitoring

#### 3. Performance Optimization Process:
1. **Monitoring**: Continuous performance metrics collection
2. **Analysis**: Pattern recognition dalam performance data
3. **Optimization**: Target improvements dengan measurable goals
4. **Validation**: Performance testing sebelum deployment
5. **Documentation**: Changes documented dengan before/after metrics

---

**🎯 ENHANCED DEVELOPMENT STATUS**

**UPDATED ON**: October 31, 2025
**VERSION**: 2.0 (Enhanced dengan QA Standards)
**STATUS**: ✅ **COMPLETE ENHANCEMENT WITH QA INTEGRATION**

**NEW ENHANCEMENTS ADDED:**
- ✅ **Backend API Consistency Standards**: Fastify patterns enforcement
- ✅ **Memory Management Requirements**: Cache size limits dan cleanup
- ✅ **QA Integration**: Comprehensive testing standards
- ✅ **Performance Monitoring**: Metrics dan alerting requirements
- ✅ **Security Standards**: Enhanced security testing requirements
- ✅ **Development Workflow**: Process standards untuk feature development

**IMPROVED QUALITY AREAS:**
- 🚀 **API Consistency**: Eliminated mixed framework patterns
- 💾 **Memory Management**: Prevention of memory leaks
- 🔍 **Quality Assurance**: Integrated QA testing standards
- 📊 **Performance**: Monitoring dan optimization guidelines
- 🔒 **Security**: Enhanced security validation requirements
- 🛠️ **Development Process**: Standardized workflow requirements

**Dibuat dengan ❤️ untuk SIMRAPU - Enhanced Edition v2.0**