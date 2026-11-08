let donutChart = null;
let barChart = null;
let networthChart = null;

const daftarMotivasi = [
    "“Jangan menabung apa yang tersisa setelah berbelanja, tetapi berbelanjalah apa yang tersisa setelah menabung.” – Warren Buffett",
    "“Kendalikan uang Anda, atau uang akan mengendalikan Anda.” – Dave Ramsey",
    "“Kebebasan finansial adalah tentang memiliki pilihan.” – Bob Proctor",
    "“Sedikit demi sedikit, lama-lama menjadi bukit. Konsistensi adalah kunci.”"
];

function financeApp() {
    const today = new Date();
    
    return {
        tabAktif: 'home',
        showFormTransaksi: false,
        showModalBudgetKategori: false,
        bulanAktif: String(today.getMonth() + 1).padStart(2, '0'),
        tahunAktif: today.getFullYear(),
        motivasiAktif: daftarMotivasi[Math.floor(Math.random() * daftarMotivasi.length)],
        
        searchKeyword: '',
        filterJenis: 'semua',
        filterWallet: 'semua',

        formTx: {
            jenis: 'pengeluaran',
            nama: '',
            jumlah: '',
            kategori: 'Umum',
            wallet: 'BCA Utama',
            opsiTanggal: 'hari_ini',
            tanggalCustom: '',
            frekuensiRecurring: 'bulanan',
            goalTautan: ''
        },

        // Form Kategori & Budget (Budget kini opsional / tidak wajib diisi)
        formKat: { jenis: 'pengeluaran', nama: '', budget: '' },

        db: JSON.parse(localStorage.getItem('financeDB_v12')) || {
            records: {},
            goalsTahun: {},
            wallets: ['BCA Utama', 'GoPay', 'Dana', 'Cash'],
            detailWallets: [
                { tipe: 'bank', nama: 'BCA Utama', saldo: 1500000 },
                { tipe: 'e-wallet', nama: 'GoPay', saldo: 250000 }
            ],
            netWorth: {
                listCash: [],
                listInvestasi: [],
                listPiutang: [],
                listUtang: []
            }
        },

        initApp() {
            this.$watch('bulanAktif', () => { this.updateAllCharts(); });
            this.$watch('tahunAktif', () => { this.updateAllCharts(); });
            this.$watch('tabAktif', (val) => {
                if (val === 'networth') {
                    setTimeout(() => this.initNetWorthChart(), 150);
                }
            });
            setTimeout(() => {
                this.initDonutChart();
                this.initBarChart();
            }, 100);
        },

        get periode() {
            return `${this.tahunAktif}-${this.bulanAktif}`;
        },
        
        get currentData() {
            if (!this.db.records[this.periode]) {
                this.db.records[this.periode] = {
                    pendapatan: [],
                    pengeluaranTidakTetap: [],
                    goalsBulan: [],
                    subscriptions: [],
                    kategoriBudget: []
                };
            }
            if (!this.db.records[this.periode].kategoriBudget) {
                this.db.records[this.periode].kategoriBudget = [];
            }
            return this.db.records[this.periode];
        },

        // --- FORMAT RUPIAH REAL-TIME ---
        formatInputRupiah(event, formObj, key) {
            let input = event.target.value;
            let angkaBersih = input.replace(/\D/g, '');
            if (angkaBersih === '') {
                formObj[key] = '';
                return;
            }
            formObj[key] = new Intl.NumberFormat('id-ID').format(Number(angkaBersih));
        },

        getCleanNumber(formattedString) {
            if (!formattedString) return 0;
            return Number(String(formattedString).replace(/\./g, '')) || 0;
        },

        simpanData() {
            localStorage.setItem('financeDB_v12', JSON.stringify(this.db));
            this.updateAllCharts();
        },

        formatRupiah(angka) {
            return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka || 0);
        },

        // --- TAMBAH KATEGORI & BUDGET (OPSIONAL) ---
        tambahKategoriBudget() {
            if (!this.formKat.nama.trim()) {
                alert('Nama kategori wajib diisi!');
                return;
            }
            // Budget opsional (jika kosong/tidak diisi, otomatis bernilai 0)
            let nominalBudget = this.formKat.budget ? this.getCleanNumber(this.formKat.budget) : 0;

            this.currentData.kategoriBudget.push({
                jenis: this.formKat.jenis,
                nama: this.formKat.nama,
                budget: nominalBudget
            });

            this.formKat = { jenis: 'pengeluaran', nama: '', budget: '' };
            this.simpanData();
            alert('Kategori berhasil ditambahkan!');
        },

        hapusKategoriBudget(idx) {
            this.currentData.kategoriBudget.splice(idx, 1);
            this.simpanData();
        },

        // --- TOTAL NET WORTH (BERDASARKAN TOTAL SALDO WALLET) ---
        get totalNetWorthKomprehensif() {
            let totalWallet = this.db.detailWallets.reduce((acc, w) => acc + w.saldo, 0);
            return totalWallet;
        },

        // --- CHARTS ---
        initDonutChart() {
            const ctx = document.getElementById('transaksiDonutChart');
            if (!ctx) return;
            donutChart = new Chart(ctx, {
                type: 'doughnut',
                data: { labels: ['Pemasukan', 'Pengeluaran'], datasets: [{ data: [this.currentData.pendapatan.length, this.currentData.pengeluaranTidakTetap.length], backgroundColor: ['#10b981', '#f43f5e'] }] },
                options: { cutout: '75%', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
            });
        },

        initBarChart() {
            const ctx = document.getElementById('analitikBarChart');
            if (!ctx) return;
            barChart = new Chart(ctx, {
                type: 'bar',
                data: { labels: ['Pemasukan', 'Pengeluaran'], datasets: [{ data: [this.totalPendapatan(), this.totalPengeluaran()], backgroundColor: ['rgba(16, 185, 129, 0.2)', 'rgba(244, 63, 94, 0.2)'], borderColor: ['rgb(16, 185, 129)', 'rgb(244, 63, 94)'], borderWidth: 1 }] },
                options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
            });
        },

        initNetWorthChart() {
            const ctx = document.getElementById('netWorthChart');
            if (!ctx) return;
            if (networthChart) networthChart.destroy();
            
            let totalBank = this.db.detailWallets.filter(w => w.tipe === 'bank').reduce((a, w) => a + w.saldo, 0);
            let totalEwallet = this.db.detailWallets.filter(w => w.tipe === 'e-wallet').reduce((a, w) => a + w.saldo, 0);

            networthChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Rekening Bank', 'E-Wallet / Dompet Digital'],
                    datasets: [{
                        label: 'Saldo (Rp)',
                        data: [totalBank, totalEwallet],
                        backgroundColor: ['#6366f1', '#10b981']
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
            });
        },

        updateAllCharts() {
            if (donutChart) {
                donutChart.data.datasets[0].data = [this.currentData.pendapatan.length, this.currentData.pengeluaranTidakTetap.length];
                donutChart.update();
            }
            if (barChart) {
                barChart.data.datasets[0].data = [this.totalPendapatan(), this.totalPengeluaran()];
                barChart.update();
            }
            if (networthChart) {
                let totalBank = this.db.detailWallets.filter(w => w.tipe === 'bank').reduce((a, w) => a + w.saldo, 0);
                let totalEwallet = this.db.detailWallets.filter(w => w.tipe === 'e-wallet').reduce((a, w) => a + w.saldo, 0);

                networthChart.data.datasets[0].data = [totalBank, totalEwallet];
                networthChart.update();
            }
        },

        totalPendapatan() {
            return this.currentData.pendapatan.reduce((acc, item) => acc + this.getCleanNumber(item.jumlah), 0);
        },

        totalPengeluaran() {
            return this.currentData.pengeluaranTidakTetap.reduce((acc, item) => acc + this.getCleanNumber(item.jumlah), 0);
        },

        sisaUang() {
            return this.totalPendapatan() - this.totalPengeluaran();
        }
    };
}