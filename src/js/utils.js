import m from 'mithril';
import ExpiryStorage from './expiryStorage.js';
import toast, { showConfirmation, showPrompt } from './toaster.js';

/**
 * Utility functions for user authentication and data management
 */

// JWT token handling
const JWTUtils = {
  /**
   * Store JWT token with optional "Remember me" functionality
   * @param {string} token - JWT token
   * @param {boolean} rememberMe - Whether to remember for 7 days
   * @param {object} userData - User data to store
   */
  setAuthData(token, rememberMe, userData) {
    const authData = {
      token,
      userData,
      timestamp: Date.now()
    };

    if (rememberMe) {
      // Use ExpiryStorage for 7 days (7 * 24 * 60 * 60 * 1000 ms)
      ExpiryStorage.set('authData', authData, 7 * 24 * 60 * 60 * 1000);
    } else {
      // Use sessionStorage for current session only
      sessionStorage.setItem('authData', JSON.stringify(authData));
    }

    // Also store in regular localStorage for immediate access
    localStorage.setItem('token', token);
    if (userData.budgetYear) {
      localStorage.setItem('budgetYear', userData.budgetYear);
    }
  },

  /**
   * Get authentication data from storage
   * @returns {object|null} Auth data or null if not found
   */
  getAuthData() {
    // First check sessionStorage (temporary)
    const sessionData = sessionStorage.getItem('authData');
    if (sessionData) {
      try {
        return JSON.parse(sessionData);
      } catch (e) {
        sessionStorage.removeItem('authData');
      }
    }

    // Then check ExpiryStorage (long-term)
    const persistentData = ExpiryStorage.get('authData');
    if (persistentData) {
      return persistentData;
    }

    return null;
  },

  /**
   * Clear all authentication data
   */
  clearAuthData() {
    // Clear specific auth items
    localStorage.removeItem('token');
    localStorage.removeItem('budgetYear');
    sessionStorage.removeItem('authData');
    ExpiryStorage.remove('authData');

    // Clear all localStorage items (for complete cleanup)
    const localStorageKeys = Object.keys(localStorage);
    localStorageKeys.forEach(key => {
      if (key.startsWith('__expirable__') || key.includes('auth') || key.includes('token')) {
        localStorage.removeItem(key);
      }
    });

    // Clear all sessionStorage items (for complete cleanup)
    const sessionStorageKeys = Object.keys(sessionStorage);
    sessionStorageKeys.forEach(key => {
      if (key.includes('auth') || key.includes('token')) {
        sessionStorage.removeItem(key);
      }
    });

    // Run ExpiryStorage cleanup
    ExpiryStorage.cleanup();
  },

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  isAuthenticated() {
    const authData = this.getAuthData();
    return !!(authData && authData.token);
  },

  /**
   * Get current token
   * @returns {string|null}
   */
  getToken() {
    const authData = this.getAuthData();
    return authData ? authData.token : null;
  },

  /**
   * Logout user - clear all auth data and redirect to login
   */
  logout() {
    this.clearAuthData();
    toast.info('Anda telah keluar dari sistem.');

    // Redirect to login after a short delay
    setTimeout(() => {
      if (typeof window !== 'undefined' && window.m) {
        window.m.route.set('/login');
      }
    }, 1500);
  }
};

// User data utilities
const UserUtils = {
  /**
   * Get current user data
   * @returns {object} User data object
   */
  getUserData() {
    const authData = JWTUtils.getAuthData();
    if (!authData || !authData.userData) {
      return {
        username: null,
        email: null,
        budgetYear: null,
        isAuthenticated: false
      };
    }

    return {
      username: authData.userData.username,
      email: authData.userData.email,
      role: authData.userData.role,
      budgetYear: authData.userData.budgetYear,
      isAuthenticated: true,
      token: authData.token,
      ...(authData.userData.namaPerangkatDaerah && {
        namaPerangkatDaerah: authData.userData.namaPerangkatDaerah
      }),
      ...(authData.userData.perangkatDaerah && {
        perangkatDaerah: authData.userData.perangkatDaerah
      }),
      ...(authData.userData.subPerangkatDaerahId && {
        subPerangkatDaerahId: authData.userData.subPerangkatDaerahId
      }),
      ...(authData.userData.subPerangkatDaerah && {
        subPerangkatDaerah: authData.userData.subPerangkatDaerah
      })
    };
  },

  /**
   * Get username
   * @returns {string|null}
   */
  getUsername() {
    const userData = this.getUserData();
    return userData.username;
  },

  /**
   * Get user email
   * @returns {string|null}
   */
  getEmail() {
    const userData = this.getUserData();
    return userData.email;
  },

  /**
   * Get budget year
   * @returns {string|null}
   */
  getBudgetYear() {
    const userData = this.getUserData();
    return userData.budgetYear;
  },

  /**
   * Get user role
   * @returns {string|null}
   */
  getRole() {
    const userData = this.getUserData();
    return userData.role;
  },

  /**
   * Check if user has admin role
   * @returns {boolean}
   */
  isAdmin() {
    return this.getRole() === 'admin';
  },

  /**
   * Check if user has operator role
   * @returns {boolean}
   */
  isOperator() {
    return this.getRole() === 'operator';
  },

  /**
   * Get authentication status
   * @returns {boolean}
   */
  isAuthenticated() {
    return JWTUtils.isAuthenticated();
  }
};

// Storage utilities
const StorageUtils = {
  /**
   * Set item with optional expiration
   * @param {string} key
   * @param {any} value
   * @param {number|null} ttl - Time to live in milliseconds (null for no expiration)
   */
  set(key, value, ttl = null) {
    if (ttl) {
      ExpiryStorage.set(key, value, ttl);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  },

  /**
   * Get item from storage
   * @param {string} key
   * @returns {any|null}
   */
  get(key) {
    // First try ExpiryStorage
    const expirableData = ExpiryStorage.get(key);
    if (expirableData !== null) {
      return expirableData;
    }

    // Then try regular localStorage
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Remove item from storage
   * @param {string} key
   */
  remove(key) {
    ExpiryStorage.remove(key);
    localStorage.removeItem(key);
  }
};

// Toast utilities using toaster.js functions
const ToastUtils = {
  /**
   * Show success toast
   * @param {string} message
   * @param {number} duration
   */
  success(message, duration = 3000) {
    toast.success(message, duration);
  },

  /**
   * Show error toast
   * @param {string} message
   * @param {number} duration
   */
  error(message, duration = 5000) {
    toast.error(message, duration);
  },

  /**
   * Show warning toast
   * @param {string} message
   * @param {number} duration
   */
  warning(message, duration = 4000) {
    toast.warning(message, duration);
  },

  /**
   * Show info toast
   * @param {string} message
   * @param {number} duration
   */
  info(message, duration = 3000) {
    toast.info(message, duration);
  },

  /**
   * Show confirmation dialog
   * @param {string} message
   * @param {function} onConfirm
   * @param {function} onCancel
   */
  confirm(message, onConfirm, onCancel) {
    showConfirmation(message, onConfirm, onCancel);
  },

  /**
   * Show prompt dialog
   * @param {string} message
   * @param {function} onConfirm
   * @param {function} onCancel
   * @param {object} options
   */
  prompt(message, onConfirm, onCancel, options = {}) {
    showPrompt(message, onConfirm, onCancel, options);
  }
};

/**
 * API Request utilities using Mithril.js request
 */
const APIUtils = {
  /**
   * Generic API request function with authentication
   * @param {string} url - API endpoint URL
   * @param {object} options - Request options
   * @returns {Promise} Mithril request promise
   */
  request: function(url, options = {}) {
    const token = JWTUtils.getToken();

    const defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      background: true // Don't trigger loading states by default
    };

    // Handle URL construction for nested resources
    let finalUrl = url;
    if (options.parentId && options.level) {
      const parentEndpoints = {
        bidang: `/api/bidang/urusan/${options.parentId}`,
        program: `/api/program/bidang/${options.parentId}`,
        kegiatan: `/api/kegiatan/program/${options.parentId}`,
        subkegiatan: `/api/subkegiatan/kegiatan/${options.parentId}`
      };
      finalUrl = parentEndpoints[options.level] || url;
    }

    return m.request({
      ...defaultOptions,
      ...options,
      url: finalUrl,
      // Better error handling for Mithril requests
      deserialize: function(value) {
        return value;
      },
      extract: function(xhr) {
        // Handle HTTP errors properly
        if (xhr.status >= 400) {
          const error = new Error('Request failed');
          error.code = xhr.status;
          error.response = {
            status: xhr.status,
            message: xhr.statusText
          };
          throw error;
        }
        return xhr.responseText ? JSON.parse(xhr.responseText) : null;
      }
    });
  },

  /**
   * Get all items from an endpoint
   * @param {string} endpoint - API endpoint
   * @returns {Promise<object>} Response data
   */
  getAll: function(endpoint) {
    return this.request(`/api/${endpoint}`)
      .then(response => {

        // Handle different response formats with proper fallbacks
        if (response && response.data !== undefined) {
          // Check if response.data has nested structure (data array + pagination)
          if (response.data.data !== undefined && Array.isArray(response.data.data)) {
            // Return the complete response structure for nested data
            return {
              success: response.success !== undefined ? response.success : true,
              data: response.data.data,  // Extract the actual array
              pagination: response.data.pagination
            };
          }
          // If response.data is already an array, use it directly
          if (Array.isArray(response.data)) {
            return {
              success: response.success !== undefined ? response.success : true,
              data: response.data
            };
          }
          // If response.data is neither nested nor array, return empty array
          console.warn(`Response data is neither array nor nested for ${endpoint}:`, response.data);
          return {
            success: response.success !== undefined ? response.success : true,
            data: []
          };
        }
        if (Array.isArray(response)) {
          return {
            success: true,
            data: response
          };
        }
        // Handle case where response is undefined or null
        if (response === undefined || response === null) {
          console.warn(`API response for ${endpoint} is undefined/null, returning empty array`);
          return {
            success: true,
            data: []
          };
        }
        // Handle unexpected response format
        console.warn(`Unexpected response format for ${endpoint}:`, typeof response, response);
        return {
          success: false,
          data: []
        };
      })
      .catch(error => {
        console.error(`Error fetching ${endpoint}:`, error);

        // Check if it's an authentication error
        if (error.code === 401 || (error.response && error.response.status === 401)) {
          // Proper logout - clear all auth data and redirect
          JWTUtils.clearAuthData();
          ToastUtils.warning('Sesi login telah berakhir. Silakan masuk kembali.');

          // Small delay to allow toast to show before redirect
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        }

        throw error;
      });
  },

  /**
   * Get records by parent ID
   * @param {string} level - Child level (bidang, program, kegiatan, subkegiatan)
   * @param {string} parentId - Parent record ID
   * @returns {Promise} Array of child records
   */
  getByParent: function(level, parentId) {
    const parentMap = {
      bidang: 'urusan',
      program: 'bidang',
      kegiatan: 'program',
      subkegiatan: 'kegiatan'
    };

    const endpoint = parentMap[level];
    if (!endpoint) {
      console.error('Invalid level for getByParent:', level);
      return Promise.resolve([]);
    }

    return this.request(`/api/${level}/${endpoint}/${parentId}`)
      .then(response => response.data || [])
      .catch(error => {
        console.error(`Error fetching ${level} by ${endpoint}:`, error);
        ToastUtils.error(`Gagal memuat data ${level}`);
        return [];
      });
  },

  /**
   * Get single record by ID
   * @param {string} endpoint - API endpoint
   * @param {string} id - Record ID
   * @returns {Promise} Single record
   */
  getById: function(endpoint, id) {
    return this.request(`/api/${endpoint}/${id}`)
      .then(response => response.data)
      .catch(error => {
        console.error(`Error fetching ${endpoint} by ID:`, error);
        ToastUtils.error(`Gagal memuat data ${endpoint}`);
        return null;
      });
  },

  /**
   * Create new record
   * @param {string} endpoint - API endpoint
   * @param {object} data - Record data
   * @returns {Promise} Created record
   */
  create: function(endpoint, data) {
    return this.request(`/api/${endpoint}`, {
      method: 'POST',
      body: data
    })
    .then(response => {
      if (response && response.message) {
        ToastUtils.success(response.message);
      } else {
        // Indonesian success message for creation
        ToastUtils.success(`${endpoint.charAt(0).toUpperCase() + endpoint.slice(1)} berhasil ditambahkan!`);
      }
      return response && response.data ? response.data : response;
    })
    .catch(error => {
      console.error(`Error creating ${endpoint}:`, error);

      // Handle authentication errors
      if (error.code === 401 || (error.response && error.response.status === 401)) {
        // Proper logout - clear all auth data and redirect
        JWTUtils.clearAuthData();
        ToastUtils.warning('Sesi login telah berakhir. Silakan masuk kembali.');
        setTimeout(() => {
          if (typeof window !== 'undefined' && window.m) {
            window.m.route.set('/login');
          }
        }, 1500);
      } else if (error.response && error.response.message) {
        // Use the message from API response
        ToastUtils.error(error.response.message);
      } else if (error.message) {
        ToastUtils.error(error.message);
      } else if (error.data && error.data.message) {
        // Handle error.data.message structure
        ToastUtils.error(error.data.message);
      } else {
        ToastUtils.error(`Gagal membuat ${endpoint}. Silakan coba lagi.`);
      }

      throw error;
    });
  },

  /**
   * Create new record with file upload
   * @param {string} endpoint - API endpoint
   * @param {FormData} formData - Form data with file
   * @returns {Promise} Created record
   */
  createWithFile: function(endpoint, formData) {
    const token = JWTUtils.getToken();
    
    // Use fetch API for better FormData support
    return fetch(`/api/${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
        // Don't set Content-Type for FormData - let browser set it with correct boundary
      },
      body: formData
    })
    .then(response => {
      // Check if response is ok
      if (!response.ok) {
        return response.json().then(errorData => {
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        });
      }
      return response.json();
    })
    .then(responseData => {
      if (responseData && responseData.message) {
        ToastUtils.success(responseData.message);
      } else {
        // Indonesian success message for creation
        ToastUtils.success(`${endpoint.charAt(0).toUpperCase() + endpoint.slice(1)} berhasil ditambahkan!`);
      }
      return responseData && responseData.data ? responseData.data : responseData;
    })
    .catch(error => {
      console.error(`Error creating ${endpoint} with file:`, error);
      
      // Handle authentication errors
      if (error.message && error.message.includes('401')) {
        // Proper logout - clear all auth data and redirect
        JWTUtils.clearAuthData();
        ToastUtils.warning('Sesi login telah berakhir. Silakan masuk kembali.');
        setTimeout(() => {
          if (typeof window !== 'undefined' && window.m) {
            window.m.route.set('/login');
          }
        }, 1500);
      } else if (error.message) {
        ToastUtils.error(error.message);
      } else {
        ToastUtils.error(`Gagal membuat ${endpoint}. Silakan coba lagi.`);
      }
      
      throw error;
    });
  },

  /**
   * Update existing record with file upload
   * @param {string} endpoint - API endpoint
   * @param {string} id - Record ID
   * @param {FormData} formData - Form data with file
   * @returns {Promise} Updated record
   */
  updateWithFile: function(endpoint, id, formData) {
    const token = JWTUtils.getToken();
    
    // Use fetch API for better FormData support
    return fetch(`/api/${endpoint}/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
        // Don't set Content-Type for FormData - let browser set it with correct boundary
      },
      body: formData
    })
    .then(response => {
      // Check if response is ok
      if (!response.ok) {
        return response.json().then(errorData => {
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        });
      }
      return response.json();
    })
    .then(responseData => {
      if (responseData && responseData.message) {
        ToastUtils.success(responseData.message);
      } else {
        // Indonesian success message for update
        ToastUtils.success(`${endpoint.charAt(0).toUpperCase() + endpoint.slice(1)} berhasil diperbarui!`);
      }
      return responseData && responseData.data ? responseData.data : responseData;
    })
    .catch(error => {
      console.error(`Error updating ${endpoint} with file:`, error);
      
      // Handle authentication errors
      if (error.message && error.message.includes('401')) {
        // Proper logout - clear all auth data and redirect
        JWTUtils.clearAuthData();
        ToastUtils.warning('Sesi login telah berakhir. Silakan masuk kembali.');
        setTimeout(() => {
          if (typeof window !== 'undefined' && window.m) {
            window.m.route.set('/login');
          }
        }, 1500);
      } else if (error.message) {
        ToastUtils.error(error.message);
      } else {
        ToastUtils.error(`Gagal memperbarui ${endpoint}. Silakan coba lagi.`);
      }
      
      throw error;
    });
  },

  /**
   * Update existing record
   * @param {string} endpoint - API endpoint
   * @param {string} id - Record ID
   * @param {object} data - Updated data
   * @returns {Promise} Updated record
   */
  update: function(endpoint, id, data) {
    return this.request(`/api/${endpoint}/${id}`, {
      method: 'PUT',
      body: data
    })
    .then(response => {
      if (response && response.message) {
        ToastUtils.success(response.message);
      } else {
        // Indonesian success message for update
        ToastUtils.success(`${endpoint.charAt(0).toUpperCase() + endpoint.slice(1)} berhasil diperbarui!`);
      }
      return response && response.data ? response.data : response;
    })
    .catch(error => {
      console.error(`Error updating ${endpoint}:`, error);

      // Handle authentication errors
      if (error.code === 401 || (error.response && error.response.status === 401)) {
        // Proper logout - clear all auth data and redirect
        JWTUtils.clearAuthData();
        ToastUtils.warning('Sesi login telah berakhir. Silakan masuk kembali.');
        setTimeout(() => {
          if (typeof window !== 'undefined' && window.m) {
            window.m.route.set('/login');
          }
        }, 1500);
      } else if (error.response && error.response.message) {
        // Use the message from API response
        ToastUtils.error(error.response.message);
      } else if (error.message) {
        ToastUtils.error(error.message);
      } else if (error.data && error.data.message) {
        // Handle error.data.message structure
        ToastUtils.error(error.data.message);
      } else {
        ToastUtils.error(`Gagal memperbarui ${endpoint}. Silakan coba lagi.`);
      }

      throw error;
    });
  },

  /**
   * Delete record with confirmation
   * @param {string} endpoint - API endpoint
   * @param {string} id - Record ID
   * @param {string} nama - Record name for confirmation message
   * @returns {Promise} Deletion result
   */
  delete: function(endpoint, id, nama) {
    return new Promise((resolve, reject) => {
      ToastUtils.confirm(
        `Apakah Anda yakin ingin menghapus ${nama}?`,
        () => {
          // User confirmed, proceed with deletion
          this.request(`/api/${endpoint}/${id}`, {
            method: 'DELETE'
          })
          .then(response => {
            if (response && response.message) {
              ToastUtils.success(response.message);
            } else {
              // Indonesian success message for deletion
              ToastUtils.success(`${nama} berhasil dihapus!`);
            }
            resolve(response);
          })
          .catch(error => {
            console.error(`Error deleting ${endpoint}:`, error);

            // Handle authentication errors
            if (error.code === 401 || (error.response && error.response.status === 401)) {
              // Proper logout - clear all auth data and redirect
              JWTUtils.clearAuthData();
              ToastUtils.warning('Sesi login telah berakhir. Silakan masuk kembali.');
              setTimeout(() => {
                if (typeof window !== 'undefined' && window.m) {
                  window.m.route.set('/login');
                }
              }, 1500);
            } else if (error.response && error.response.message) {
              // Use the message from API response
              ToastUtils.error(error.response.message);
            } else if (error.message) {
              ToastUtils.error(error.message);
            } else if (error.data && error.data.message) {
              // Handle error.data.message structure
              ToastUtils.error(error.data.message);
            } else {
              ToastUtils.error(`Gagal menghapus ${nama}. Silakan coba lagi.`);
            }

            reject(error);
          });
        },
        () => {
          // User cancelled
          resolve(null);
        }
      );
    });
  }
};

export {
  JWTUtils,
  UserUtils,
  StorageUtils,
  ToastUtils,
  APIUtils
};

// Export getUserData function for backward compatibility
export const getUserData = () => UserUtils.getUserData();