import m from 'mithril'
import { JWTUtils, UserUtils } from '../js/utils.js';
import toast from '../js/toaster.js';

const LaporanKonsolidasi = {
  oninit: function() {
    // Check authentication before component initializes
    if (!UserUtils.isAuthenticated()) {
      toast.warning('Silakan masuk terlebih dahulu');
      m.route.set('/login');
      return;
    }

    this.userData = UserUtils.getUserData();
    this.isLoading = false;
    this.consolidatedData = {
      anggaran: [],
      realisasi: [],
      kinerja: []
    };
    this.budgetYear = new Date().getFullYear().toString();
    this.selectedQuarter = '';
    this.reportType = 'summary'; // summary, detailed, comparison
    this.loadData();
  },

  loadData: async function() {
    this.isLoading = true;
    m.redraw();

    try {
      const token = JWTUtils.getToken();
      if (!token) {
        toast.error('Token autentikasi tidak ditemukan');
        return;
      }

      // Load all data in parallel
      const [anggaranRes, realisasiRes, kinerjaRes] = await Promise.all([
        fetch(`/api/anggaran?budgetYear=${this.budgetYear}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`/api/realisasi?year=${this.budgetYear}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`/api/kinerja?budgetYear=${this.budgetYear}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      if (anggaranRes.ok) {
        const result = await anggaranRes.json();
        this.consolidatedData.anggaran = result.data || [];
      }

      if (realisasiRes.ok) {
        const result = await realisasiRes.json();
        this.consolidatedData.realisasi = result.data || [];
      }

      if (kinerjaRes.ok) {
        const result = await kinerjaRes.json();
        this.consolidatedData.kinerja = result.data || [];
      }

    } catch (error) {
      console.error('Error loading consolidated data:', error);
      toast.error('Terjadi kesalahan saat memuat data');
    }

    this.isLoading = false;
    m.redraw();
  },

  formatCurrency: function(amount) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  },

  formatPercentage: function(value) {
    return `${Math.round(value)}%`;
  },

  getBudgetSummary: function() {
    const totalBudget = this.consolidatedData.anggaran.reduce((sum, item) => sum + item.totalAmount, 0);
    const approvedBudget = this.consolidatedData.anggaran
      .filter(item => item.status === 'approved')
      .reduce((sum, item) => sum + item.totalAmount, 0);
    const draftBudget = this.consolidatedData.anggaran
      .filter(item => item.status === 'draft')
      .reduce((sum, item) => sum + item.totalAmount, 0);

    return { totalBudget, approvedBudget, draftBudget };
  },

  getRealizationSummary: function() {
    const totalBudget = this.consolidatedData.realisasi.reduce((sum, item) => sum + item.budgetAmount, 0);
    const totalRealization = this.consolidatedData.realisasi.reduce((sum, item) => sum + item.realizationAmount, 0);
    const avgPercentage = totalBudget > 0 ? (totalRealization / totalBudget) * 100 : 0;

    return { totalBudget, totalRealization, avgPercentage };
  },

  getKinerjaSummary: function() {
    const totalTarget = this.consolidatedData.kinerja.reduce((sum, item) => sum + (item.targetValue || 0), 0);
    const totalActual = this.consolidatedData.kinerja.reduce((sum, item) => sum + (item.actualValue || 0), 0);
    const avgPercentage = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;
    const completedCount = this.consolidatedData.kinerja.filter(item => item.status === 'completed').length;
    const inProgressCount = this.consolidatedData.kinerja.filter(item => item.status === 'in_progress').length;

    return { totalTarget, totalActual, avgPercentage, completedCount, inProgressCount };
  },

  exportToCSV: function() {
    const budgetSummary = this.getBudgetSummary();
    const realizationSummary = this.getRealizationSummary();
    const kinerjaSummary = this.getKinerjaSummary();

    const headers = ['Kategori', 'Total Budget', 'Realisasi/Pencapaian', 'Persentase', 'Status'];
    const csvContent = [
      headers.join(','),
      ['ANGGARAN TOTAL', budgetSummary.totalBudget, budgetSummary.totalBudget, '100%', 'Total'],
      ['ANGGARAN APPROVED', budgetSummary.approvedBudget, budgetSummary.approvedBudget, this.formatPercentage((budgetSummary.approvedBudget / budgetSummary.totalBudget) * 100), 'Approved'],
      ['ANGGARAN DRAFT', budgetSummary.draftBudget, budgetSummary.draftBudget, this.formatPercentage((budgetSummary.draftBudget / budgetSummary.totalBudget) * 100), 'Draft'],
      ['REALISASI', realizationSummary.totalBudget, realizationSummary.totalRealization, this.formatPercentage(realizationSummary.avgPercentage), 'Average'],
      ['KINERJA TARGET', kinerjaSummary.totalTarget, kinerjaSummary.totalActual, this.formatPercentage(kinerjaSummary.avgPercentage), 'Average'],
      ['KINERJA COMPLETED', '', kinerjaSummary.completedCount, this.formatPercentage((kinerjaSummary.completedCount / this.consolidatedData.kinerja.length) * 100), 'Completed'],
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-konsolidasi-${this.budgetYear}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Laporan konsolidasi berhasil diekspor');
  },

  view: function() {
    const budgetSummary = this.getBudgetSummary();
    const realizationSummary = this.getRealizationSummary();
    const kinerjaSummary = this.getKinerjaSummary();

    return m('div', { class: 'space-y-6' }, [
      // Header
      m('div', { class: 'bg-white rounded-lg shadow-sm p-6' }, [
        m('div', { class: 'flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6' }, [
          m('div', [
            m('h1', { class: 'text-2xl font-bold text-gray-900 mb-2' }, 'Laporan Konsolidasi'),
            m('p', { class: 'text-gray-600' }, 'Laporan gabungan anggaran, realisasi, dan kinerja')
          ]),
          m('div', { class: 'flex items-center space-x-3 mt-4 sm:mt-0' }, [
            m('select', {
              class: 'px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
              value: this.reportType,
              onchange: (e) => {
                this.reportType = e.target.value;
                m.redraw();
              }
            }, [
              m('option', { value: 'summary' }, 'Ringkasan'),
              m('option', { value: 'detailed' }, 'Detail'),
              m('option', { value: 'comparison' }, 'Perbandingan')
            ]),
            m('button', {
              class: 'bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2',
              onclick: () => this.exportToCSV()
            }, [
              m('i', { class: 'ri-download-line' }),
              m('span', 'Ekspor CSV')
            ])
          ])
        ]),

        // Filters
        m('div', { class: 'grid grid-cols-1 sm:grid-cols-2 gap-4' }, [
          m('div', [
            m('label', { class: 'block text-sm font-medium text-gray-700 mb-2' }, 'Tahun Anggaran'),
            m('select', {
              class: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
              value: this.budgetYear,
              onchange: (e) => {
                this.budgetYear = e.target.value;
                this.loadData();
              }
            }, [
              m('option', { value: '2026' }, '2026'),
              m('option', { value: '2025' }, '2025'),
              m('option', { value: '2024' }, '2024')
            ])
          ]),
          m('div', [
            m('label', { class: 'block text-sm font-medium text-gray-700 mb-2' }, 'Triwulan'),
            m('select', {
              class: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
              value: this.selectedQuarter,
              onchange: (e) => {
                this.selectedQuarter = e.target.value;
                m.redraw();
              }
            }, [
              m('option', { value: '' }, 'Semua Periode'),
              m('option', { value: 'Q1' }, 'Triwulan 1'),
              m('option', { value: 'Q2' }, 'Triwulan 2'),
              m('option', { value: 'Q3' }, 'Triwulan 3'),
              m('option', { value: 'Q4' }, 'Triwulan 4')
            ])
          ])
        ])
      ]),

      // Overall Summary Cards
      m('div', { class: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6' }, [
        m('div', { class: 'bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500' }, [
          m('div', { class: 'flex items-center' }, [
            m('div', { class: 'p-2 bg-blue-100 rounded-lg' }, [
              m('i', { class: 'ri-wallet-line text-xl text-blue-600' })
            ]),
            m('div', { class: 'ml-4' }, [
              m('p', { class: 'text-sm font-medium text-gray-600' }, 'Total Anggaran'),
              m('p', { class: 'text-2xl font-bold text-gray-900' }, this.formatCurrency(budgetSummary.totalBudget))
            ])
          ])
        ]),
        m('div', { class: `bg-white rounded-lg shadow-sm p-6 border-l-4 ${realizationSummary.avgPercentage >= 90 ? 'border-green-500' : realizationSummary.avgPercentage >= 70 ? 'border-blue-500' : 'border-yellow-500'}` }, [
          m('div', { class: 'flex items-center' }, [
            m('div', { class: 'p-2 bg-green-100 rounded-lg' }, [
              m('i', { class: 'ri-money-dollar-circle-line text-xl text-green-600' })
            ]),
            m('div', { class: 'ml-4' }, [
              m('p', { class: 'text-sm font-medium text-gray-600' }, 'Realisasi Anggaran'),
              m('p', { class: 'text-2xl font-bold text-gray-900' }, this.formatPercentage(realizationSummary.avgPercentage))
            ])
          ])
        ]),
        m('div', { class: `bg-white rounded-lg shadow-sm p-6 border-l-4 ${kinerjaSummary.avgPercentage >= 90 ? 'border-green-500' : kinerjaSummary.avgPercentage >= 70 ? 'border-blue-500' : 'border-yellow-500'}` }, [
          m('div', { class: 'flex items-center' }, [
            m('div', { class: 'p-2 bg-purple-100 rounded-lg' }, [
              m('i', { class: 'ri-line-chart-line text-xl text-purple-600' })
            ]),
            m('div', { class: 'ml-4' }, [
              m('p', { class: 'text-sm font-medium text-gray-600' }, 'Pencapaian Kinerja'),
              m('p', { class: 'text-2xl font-bold text-gray-900' }, this.formatPercentage(kinerjaSummary.avgPercentage))
            ])
          ])
        ]),
        m('div', { class: 'bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500' }, [
          m('div', { class: 'flex items-center' }, [
            m('div', { class: 'p-2 bg-green-100 rounded-lg' }, [
              m('i', { class: 'ri-check-circle-line text-xl text-green-600' })
            ]),
            m('div', { class: 'ml-4' }, [
              m('p', { class: 'text-sm font-medium text-gray-600' }, 'Kinerja Selesai'),
              m('p', { class: 'text-2xl font-bold text-gray-900' }, `${kinerjaSummary.completedCount}/${this.consolidatedData.kinerja.length}`)
            ])
          ])
        ])
      ]),

      // Detailed Breakdown
      this.reportType === 'summary' && m('div', { class: 'grid grid-cols-1 lg:grid-cols-3 gap-6' }, [
        // Budget Breakdown
        m('div', { class: 'bg-white rounded-lg shadow-sm p-6' }, [
          m('h3', { class: 'text-lg font-medium text-gray-900 mb-4 flex items-center' }, [
            m('i', { class: 'ri-wallet-line mr-2 text-blue-500' }),
            'Breakdown Anggaran'
          ]),
          m('div', { class: 'space-y-4' }, [
            m('div', { class: 'flex justify-between items-center' }, [
              m('span', { class: 'text-sm text-gray-600' }, 'Total Anggaran'),
              m('span', { class: 'text-sm font-medium' }, this.formatCurrency(budgetSummary.totalBudget))
            ]),
            m('div', { class: 'flex justify-between items-center' }, [
              m('span', { class: 'text-sm text-gray-600' }, 'Approved'),
              m('span', { class: 'text-sm font-medium text-green-600' }, this.formatCurrency(budgetSummary.approvedBudget))
            ]),
            m('div', { class: 'flex justify-between items-center' }, [
              m('span', { class: 'text-sm text-gray-600' }, 'Draft'),
              m('span', { class: 'text-sm font-medium text-yellow-600' }, this.formatCurrency(budgetSummary.draftBudget))
            ])
          ])
        ]),

        // Realization Breakdown
        m('div', { class: 'bg-white rounded-lg shadow-sm p-6' }, [
          m('h3', { class: 'text-lg font-medium text-gray-900 mb-4 flex items-center' }, [
            m('i', { class: 'ri-money-dollar-circle-line mr-2 text-green-500' }),
            'Breakdown Realisasi'
          ]),
          m('div', { class: 'space-y-4' }, [
            m('div', { class: 'flex justify-between items-center' }, [
              m('span', { class: 'text-sm text-gray-600' }, 'Total Budget'),
              m('span', { class: 'text-sm font-medium' }, this.formatCurrency(realizationSummary.totalBudget))
            ]),
            m('div', { class: 'flex justify-between items-center' }, [
              m('span', { class: 'text-sm text-gray-600' }, 'Total Realisasi'),
              m('span', { class: 'text-sm font-medium' }, this.formatCurrency(realizationSummary.totalRealization))
            ]),
            m('div', { class: 'flex justify-between items-center' }, [
              m('span', { class: 'text-sm text-gray-600' }, 'Rata-rata Pencapaian'),
              m('span', { class: `text-sm font-medium ${realizationSummary.avgPercentage >= 90 ? 'text-green-600' : realizationSummary.avgPercentage >= 70 ? 'text-blue-600' : 'text-yellow-600'}` },
                this.formatPercentage(realizationSummary.avgPercentage)
              )
            ])
          ])
        ]),

        // Performance Breakdown
        m('div', { class: 'bg-white rounded-lg shadow-sm p-6' }, [
          m('h3', { class: 'text-lg font-medium text-gray-900 mb-4 flex items-center' }, [
            m('i', { class: 'ri-line-chart-line mr-2 text-purple-500' }),
            'Breakdown Kinerja'
          ]),
          m('div', { class: 'space-y-4' }, [
            m('div', { class: 'flex justify-between items-center' }, [
              m('span', { class: 'text-sm text-gray-600' }, 'Total Target'),
              m('span', { class: 'text-sm font-medium' }, kinerjaSummary.totalTarget.toLocaleString('id-ID'))
            ]),
            m('div', { class: 'flex justify-between items-center' }, [
              m('span', { class: 'text-sm text-gray-600' }, 'Total Aktual'),
              m('span', { class: 'text-sm font-medium' }, kinerjaSummary.totalActual.toLocaleString('id-ID'))
            ]),
            m('div', { class: 'flex justify-between items-center' }, [
              m('span', { class: 'text-sm text-gray-600' }, 'Rata-rata Pencapaian'),
              m('span', { class: `text-sm font-medium ${kinerjaSummary.avgPercentage >= 90 ? 'text-green-600' : kinerjaSummary.avgPercentage >= 70 ? 'text-blue-600' : 'text-yellow-600'}` },
                this.formatPercentage(kinerjaSummary.avgPercentage)
              )
            ]),
            m('div', { class: 'flex justify-between items-center' }, [
              m('span', { class: 'text-sm text-gray-600' }, 'Selesai'),
              m('span', { class: 'text-sm font-medium text-green-600' }, `${kinerjaSummary.completedCount}/${this.consolidatedData.kinerja.length}`)
            ])
          ])
        ])
      ]),

      // Loading State
      this.isLoading && m('div', { class: 'bg-white rounded-lg shadow-sm p-8 text-center' }, [
        m('i', { class: 'ri-loader-4-line animate-spin text-2xl text-gray-400 mb-2' }),
        m('p', { class: 'text-gray-500' }, 'Memuat data konsolidasi...')
      ])
    ]);
  }
};

export default LaporanKonsolidasi;