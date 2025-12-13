import m from 'mithril'
import { UserUtils } from '../js/utils.js'
import KodeRekening from './KodeRekening.js'
import SumberDana from './SumberDana.js'

const KodeRekeningSumberDana = {
  // State management
  activeTab: 'kode-rekening',

  oninit: function(vnode) {
    // Authentication check
    if (!UserUtils.isAuthenticated()) {
      import('../js/toaster.js').then(({ default: toast }) => {
        toast.warning('Silakan masuk terlebih dahulu');
      });
      setTimeout(() => {
        m.route.set('/login');
      }, 100);
      return;
    }

    // Set page title in layout
    if (vnode.attrs && vnode.attrs.setTitle) {
      vnode.attrs.setTitle('Kode Rekening dan Sumber Dana');
    }
  },

  setActiveTab: function(tab) {
    this.activeTab = tab;
    m.redraw();
  },

  view: function(vnode) {
    return m('div', { class: 'space-y-6' }, [

      // Header
      m('div', { class: 'flex justify-between items-center' }, [
        m('div', [
          m('h1', { class: 'text-2xl font-bold text-gray-900' }, 'Kode Rekening dan Sumber Dana'),
          m('p', { class: 'text-gray-600 mt-1' }, 'Kelola kode rekening dan sumber dana untuk anggaran')
        ])
      ]),

      // Tab Navigation
      m('div', { class: 'bg-white rounded-xl shadow-sm border border-gray-200' }, [
        m('div', { class: 'border-b border-gray-200' }, [
          m('nav', { class: '-mb-px flex space-x-8 px-6' }, [
            m('button', {
              class: `py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                this.activeTab === 'kode-rekening'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`,
              onclick: () => this.setActiveTab('kode-rekening')
            }, [
              m('i', { class: 'ri-wallet-line mr-2' }),
              'Kode Rekening'
            ]),
            m('button', {
              class: `py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                this.activeTab === 'sumber-dana'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`,
              onclick: () => this.setActiveTab('sumber-dana')
            }, [
              m('i', { class: 'ri-money-dollar-circle-line mr-2' }),
              'Sumber Dana'
            ])
          ])
        ]),

        // Tab Content
        m('div', { class: 'p-6' }, [
          this.activeTab === 'kode-rekening' 
            ? m(KodeRekening, { setTitle: vnode.attrs?.setTitle })
            : m(SumberDana, { setTitle: vnode.attrs?.setTitle })
        ])
      ])
    ])
  }
}

export default KodeRekeningSumberDana;