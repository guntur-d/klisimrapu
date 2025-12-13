import m from 'mithril'
import { UserUtils, JWTUtils } from './js/utils.js';

import Layout from './views/Layout.js'
import Login from './views/Login.js'
import Dashboard from './views/Dashboard.js'
import OperatorDashboard from './views/OperatorDashboard.js'
import VendorLayout from './views/VendorLayout.js'
import Urusan_SubKeg from './views/Urusan_SubKeg.js'
import PerangkatDaerah from './views/PerangkatDaerah.js'
import KodeRekening from './views/KodeRekening.js'
import KodeRekeningSumberDana from './views/KodeRekeningSumberDana.js'
import Anggaran from './views/Anggaran.js'
import Kinerja from './views/Kinerja.js'
import Realisasi from './views/Realisasi.js'
import Pencapaian from './views/Pencapaian.js'
import EvaluasiKinerja from './views/EvaluasiKinerja.js'
import EvaluasiRealisasi from './views/EvaluasiRealisasi.js'
import LaporanAnggaran from './views/LaporanAnggaran.js'
import LaporanRealisasi from './views/LaporanRealisasi.js'
import LaporanKinerja from './views/LaporanKinerja.js'
import LaporanKonsolidasi from './views/LaporanKonsolidasi.js'
import Penyedia from './views/Penyedia.js'
import JenisPengadaan from './views/JenisPengadaan.js'
import Pengadaan from './views/Pengadaan.js'
import Monitoring from './views/Monitoring.js'
import Profile from './views/Profile.js'

// Simple Landing component
const Landing = {
  view: function() {
    return m('div', {
      class: 'min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8'
    }, [
      m('div', { class: 'sm:mx-auto sm:w-full sm:max-w-md' }, [
        m('div', { class: 'text-center' }, [
          m('h2', {
            class: 'mt-6 text-3xl font-bold text-gray-900'
          }, 'Welcome to SIMRAPU'),
          m('p', {
            class: 'mt-2 text-sm text-gray-600 mb-8'
          }, 'Sistem Informasi Manajemen Realisasi Anggaran Pekerjaan Umum')
        ])
      ]),

      m('div', { class: 'sm:mx-auto sm:w-full sm:max-w-md' }, [
        m('div', {
          class: 'bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10'
        }, [
          m('div', { class: 'space-y-4' }, [
            m('a', {
              href: '/login',
              class: 'w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }, 'Login to Dashboard'),

            m('a', {
              href: '/dashboard',
              class: 'w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }, 'Continue as Guest')
          ])
        ])
      ])
    ]);
  }
};

/** @param {*} component */
const AuthenticatedView = (component) => ({
  onmatch: () => {
    if (!UserUtils.isAuthenticated()) {
      m.route.set('/login');
      return Login;
    }
    return {
      view: () => m(Layout, {}, m(component))
    };
  }
});

/** @param {*} component - Admin only component */
const AdminOnlyView = (component) => ({
  onmatch: () => {
    if (!UserUtils.isAuthenticated()) {
      m.route.set('/login');
      return Login;
    }

    // Check if user has admin role
    const userData = UserUtils.getUserData();
    const currentRole = UserUtils.getRole();
    const isAdmin = UserUtils.isAdmin();

    // Role check for AdminOnlyView

    if (!isAdmin) {
      // Redirect operators to a restricted page or show access denied
      return {
        view: () => m('div', {
          class: 'min-h-screen bg-gray-50 flex items-center justify-center'
        }, [
          m('div', {
            class: 'max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center'
          }, [
            m('div', {
              class: 'w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4'
            }, [
              m('i', { class: 'ri-shield-cross-line text-2xl text-red-600' })
            ]),
            m('h2', { class: 'text-xl font-semibold text-gray-900 mb-2' }, 'Akses Ditolak'),
            m('p', { class: 'text-gray-600 mb-4' }, 'Halaman ini hanya dapat diakses oleh Administrator.'),
            m('p', { class: 'text-sm text-gray-500 mb-6' }, `Role Anda: ${currentRole || 'undefined'} | isAdmin: ${isAdmin}`),
            m('button', {
              class: 'w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200',
              onclick: () => m.route.set('/dashboard')
            }, 'Kembali ke Dashboard')
          ])
        ])
      };
    }

    return {
      view: () => m(Layout, {}, m(component))
    };
  }
});

/** @param {*} component - Operator only component */
const OperatorOnlyView = (component) => ({
  onmatch: () => {
    if (!UserUtils.isAuthenticated()) {
      m.route.set('/login');
      return Login;
    }

    // Check if user has operator role
    const userData = UserUtils.getUserData();
    const currentRole = UserUtils.getRole();
    const isOperator = UserUtils.isOperator();

    // Role check for OperatorOnlyView

    if (!isOperator) {
      // Redirect admins to a restricted page or show access denied
      return {
        view: () => m('div', {
          class: 'min-h-screen bg-gray-50 flex items-center justify-center'
        }, [
          m('div', {
            class: 'max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center'
          }, [
            m('div', {
              class: 'w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4'
            }, [
              m('i', { class: 'ri-shield-cross-line text-2xl text-red-600' })
            ]),
            m('h2', { class: 'text-xl font-semibold text-gray-900 mb-2' }, 'Akses Ditolak'),
            m('p', { class: 'text-gray-600 mb-4' }, 'Halaman ini hanya dapat diakses oleh Operator.'),
            m('p', { class: 'text-sm text-gray-500 mb-6' }, `Role Anda: ${currentRole || 'undefined'} | isOperator: ${isOperator}`),
            m('button', {
              class: 'w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200',
              onclick: () => m.route.set('/dashboard')
            }, 'Kembali ke Dashboard')
          ])
        ])
      };
    }

    return {
      view: () => m(Layout, {}, m(component))
    };
  }
});

/** @param {*} component - Vendor only component */
const VendorOnlyView = (component) => ({
  onmatch: () => {
    if (!UserUtils.isAuthenticated()) {
      m.route.set('/login');
      return Login;
    }

    // Check if user has vendor role
    const userData = UserUtils.getUserData();
    const currentRole = UserUtils.getRole();
    const isVendor = currentRole === 'vendor';

    // Role check for VendorOnlyView

    if (!isVendor) {
      // Redirect non-vendors to a restricted page or show access denied
      return {
        view: () => m('div', {
          class: 'min-h-screen bg-gray-50 flex items-center justify-center'
        }, [
          m('div', {
            class: 'max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center'
          }, [
            m('div', {
              class: 'w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4'
            }, [
              m('i', { class: 'ri-shield-cross-line text-2xl text-red-600' })
            ]),
            m('h2', { class: 'text-xl font-semibold text-gray-900 mb-2' }, 'Akses Ditolak'),
            m('p', { class: 'text-gray-600 mb-4' }, 'Halaman ini hanya dapat diakses oleh Vendor.'),
            m('p', { class: 'text-sm text-gray-500 mb-6' }, `Role Anda: ${currentRole || 'undefined'}`),
            m('button', {
              class: 'w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200',
              onclick: () => m.route.set('/dashboard')
            }, 'Kembali ke Dashboard')
          ])
        ])
      };
    }

    // Vendor layout doesn't use the main Layout component - it has its own layout
    return {
      view: () => m(component)
    };
  }
});

m.route.prefix = '';

m.route(document.body, '/', {
  '/': {
    render: () => m(Login, {
      setTitle: (title) => {
        document.title = title + ' - SIMRAPU'
      }
    })
  },
  '/login': {
    render: () => m(Login, {
      setTitle: (title) => {
        document.title = title + ' - SIMRAPU'
      }
    })
  },
  '/dashboard': AuthenticatedView(Dashboard),
  '/operator-dashboard': OperatorOnlyView(OperatorDashboard),
  '/vendor-layout': VendorOnlyView(VendorLayout),
  '/operator-pengadaan': OperatorOnlyView(Pengadaan),
  '/operator-monitoring': OperatorOnlyView(Monitoring),
  '/bidang-subkegiatan': AdminOnlyView(Urusan_SubKeg),
  '/perangkat-daerah': AdminOnlyView(PerangkatDaerah),
  '/kode-rekening': AdminOnlyView(KodeRekening),
  '/kode-rekening-sumber-dana': AdminOnlyView(KodeRekeningSumberDana),
  '/anggaran': AdminOnlyView(Anggaran),
  '/kinerja': AdminOnlyView(Kinerja),
  '/realisasi': AdminOnlyView(Realisasi),
  '/pencapaian': AdminOnlyView(Pencapaian),
  '/evaluasi-realisasi': AdminOnlyView(EvaluasiRealisasi),
  '/evaluasi-kinerja': AdminOnlyView(EvaluasiKinerja),
  '/laporan-anggaran': AdminOnlyView(LaporanAnggaran),
  '/laporan-realisasi': AdminOnlyView(LaporanRealisasi),
  '/laporan-kinerja': AdminOnlyView(LaporanKinerja),
  '/laporan-konsolidasi': AdminOnlyView(LaporanKonsolidasi),
  '/penyedia': AdminOnlyView(Penyedia),
  '/jenis-pengadaan': AdminOnlyView(JenisPengadaan),
  '/pengadaan': OperatorOnlyView(Pengadaan),
  '/monitoring': OperatorOnlyView(Monitoring),
  '/profile': AuthenticatedView(Profile)
})