// ========== MAIN APP CONTROLLER ==========
import {
    initSupabase, getCategories, addCategory, deleteCategory, seedDefaultCategories,
    getTransactions, addTransaction, updateTransaction, deleteTransaction,
    getMonthlyReport, getLast6MonthsSummary, todayISO,
    getDebts, addDebt, updateDebt, deleteDebt,
    getDebtPayments, addDebtPayment, deleteDebtPayment, getDebtSummary,
    getStockTransactions, addStockTransaction, deleteStockTransaction, getStockSummary,
    hasSupabaseConfig, saveSupabaseConfig, clearSupabaseConfig
} from './supabase-client.js';
import { initAuth, setAuthCallback, signUp, signIn, signOut, getSession } from './auth.js';
import {
    showToast, showLoading, hideLoading, showView, showAuth, showApp,
    renderDashboard, renderRecentTransactions, renderTransactionList,
    renderCategories, renderCategoryOptions, renderReport,
    openModal, closeModal, resetForm, fillForm,
    renderDebtList, renderDebtDetail, renderDebtDashboardSummary,
    openDebtModal, closeDebtModal, resetDebtForm, fillDebtForm,
    openPaymentModal, closePaymentModal,
    renderStockSummary, renderStockTransactions,
    openStockModal, closeStockModal, resetStockForm
} from './ui.js';
import { renderDoughnutChart, renderBarChart } from './chart.js';
import { registerSW } from './sw-register.js';

// ========== STATE ==========
let categories = [];
let currentView = 'view-dashboard';
let reportYear = new Date().getFullYear();
let reportMonth = new Date().getMonth() + 1;
let debtFilterType = 'all';
let debtFilterStatus = 'active';
let currentDebtId = null;
let stockFilterType = 'all';

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', async () => {
    // Register service worker
    registerSW();

    // Check if Supabase config exists
    if (!hasSupabaseConfig()) {
        showSetup();
        hideLoading();
        bindSetupEvents();
        return;
    }

    // Init Supabase
    initSupabase();

    // Auth callback
    setAuthCallback(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
            await onSignedIn();
        } else if (event === 'SIGNED_OUT') {
            showAuth();
            hideLoading();
        }
    });

    // Init auth listener
    initAuth();

    // Check existing session
    const session = await getSession();
    if (session) {
        await onSignedIn();
    } else {
        showAuth();
        hideLoading();
    }

    // Bind events
    bindAuthEvents();
    bindNavEvents();
    bindModalEvents();
    bindFormEvents();
    bindCategoryEvents();
    bindFilterEvents();
    bindReportEvents();
    bindDebtEvents();
    bindStockEvents();
    bindSettingsEvents();
});

// ========== AUTH HANDLERS ==========
function bindAuthEvents() {
    // Tab switching
    document.querySelectorAll('.auth-tab').forEach((tab) => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.auth-tab').forEach((t) => t.classList.remove('active'));
            tab.classList.add('active');
            const form = tab.dataset.tab;
            document.getElementById('login-form').classList.toggle('hidden', form !== 'login');
            document.getElementById('register-form').classList.toggle('hidden', form !== 'register');
        });
    });

    // Login
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const btn = e.target.querySelector('button[type="submit"]');

        try {
            btn.disabled = true;
            btn.innerHTML = '<div class="spinner" style="width:20px;height:20px;margin:0 auto"></div>';
            await signIn(email, password);
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Masuk';
        }
    });

    // Register
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        const confirm = document.getElementById('register-confirm').value;
        const btn = e.target.querySelector('button[type="submit"]');

        if (password !== confirm) {
            showToast('Password tidak cocok', 'error');
            return;
        }
        if (password.length < 6) {
            showToast('Password minimal 6 karakter', 'error');
            return;
        }

        try {
            btn.disabled = true;
            btn.innerHTML = '<div class="spinner" style="width:20px;height:20px;margin:0 auto"></div>';
            await signUp(email, password);
            showToast('Registrasi berhasil! Silakan cek email untuk konfirmasi.', 'info');
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Daftar';
        }
    });

    // Logout
    document.getElementById('btn-logout')?.addEventListener('click', async () => {
        await signOut();
        showAuth();
        showToast('Berhasil logout');
    });
}

// ========== SIGNED IN ==========
async function onSignedIn() {
    showApp();

    try {
        // Seed categories if needed
        categories = await seedDefaultCategories();
        if (!categories.length) categories = await getCategories();

        // Load dashboard
        await loadDashboard();
        showView('view-dashboard');
        hideLoading();
    } catch (err) {
        console.error('[App] Init error:', err);
        showToast('Gagal memuat data: ' + err.message, 'error');
        hideLoading();
    }
}

// ========== NAVIGATION ==========
function bindNavEvents() {
    document.querySelectorAll('.nav-item').forEach((item) => {
        item.addEventListener('click', async () => {
            const viewId = item.dataset.view;
            if (!viewId) return;

            if (viewId === 'add-transaction') {
                resetForm();
                await populateFormCategories('expense');
                openModal('Tambah Transaksi');
                return;
            }

            currentView = viewId;
            showView(viewId);

            if (viewId === 'view-dashboard') await loadDashboard();
            if (viewId === 'view-transactions') await loadTransactions();
            if (viewId === 'view-categories') await loadCategories();
            if (viewId === 'view-report') await loadReport();
            if (viewId === 'view-debts') await loadDebts();
            if (viewId === 'view-stocks') await loadStocks();
        });
    });
}

// ========== DASHBOARD ==========
async function loadDashboard() {
    try {
        const now = new Date();
        const report = await getMonthlyReport(now.getFullYear(), now.getMonth() + 1);
        renderDashboard(report);

        // Recent transactions
        const allTx = await getTransactions();
        renderRecentTransactions(allTx);

        // Charts
        renderDoughnutChart(report.categories);
        const monthly = await getLast6MonthsSummary();
        renderBarChart(monthly);

        // Debt summary
        try {
            const debtSummary = await getDebtSummary();
            renderDebtDashboardSummary(debtSummary);
        } catch (e) {
            console.warn('[Dashboard] Debt summary failed:', e);
        }
    } catch (err) {
        console.error('[Dashboard]', err);
        showToast('Gagal memuat dashboard', 'error');
    }
}

// ========== TRANSACTIONS ==========
async function loadTransactions(filters = {}) {
    try {
        const transactions = await getTransactions(filters);
        renderTransactionList(transactions);

        // Update category filter dropdown
        categories = await getCategories();
        const filterSelect = document.getElementById('filter-category');
        if (filterSelect) {
            filterSelect.innerHTML = `<option value="">Semua Kategori</option>` +
                categories.map((c) => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
        }
    } catch (err) {
        console.error('[Transactions]', err);
        showToast('Gagal memuat transaksi', 'error');
    }
}

// ========== CATEGORIES ==========
async function loadCategories() {
    try {
        categories = await getCategories();
        renderCategories(categories);
    } catch (err) {
        console.error('[Categories]', err);
        showToast('Gagal memuat kategori', 'error');
    }
}

// ========== REPORT ==========
async function loadReport() {
    try {
        const report = await getMonthlyReport(reportYear, reportMonth);
        renderReport(reportYear, reportMonth, report);
    } catch (err) {
        console.error('[Report]', err);
        showToast('Gagal memuat laporan', 'error');
    }
}

// ========== MODAL & FORM ==========
function bindModalEvents() {
    document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
        if (e.target.id === 'modal-overlay') closeModal();
    });

    document.getElementById('modal-close')?.addEventListener('click', closeModal);

    // Type toggle
    document.querySelectorAll('.type-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
            document.querySelectorAll('.type-btn').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            const type = btn.dataset.type;
            await populateFormCategories(type);
        });
    });
}

async function populateFormCategories(type) {
    const cats = categories.filter((c) => c.type === type || c.type === 'both');
    const select = document.getElementById('tx-category');
    if (select) {
        select.innerHTML = `<option value="">Pilih Kategori</option>` +
            cats.map((c) => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
    }
}

function bindFormEvents() {
    const form = document.getElementById('tx-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const editId = form.dataset.editId;
        const activeType = document.querySelector('.type-btn.active');
        const type = activeType?.dataset.type || 'expense';
        const amount = parseInt(document.getElementById('tx-amount').value, 10);
        const category_id = document.getElementById('tx-category').value || null;
        const description = document.getElementById('tx-description').value.trim();
        const date = document.getElementById('tx-date').value || todayISO();

        if (!amount || amount <= 0) {
            showToast('Masukkan jumlah yang valid', 'error');
            return;
        }

        try {
            if (editId) {
                await updateTransaction(editId, { type, amount, category_id, description, date });
                showToast('Transaksi diperbarui ✅');
            } else {
                await addTransaction({ type, amount, category_id, description, date });
                showToast('Transaksi ditambahkan ✅');
            }

            closeModal();
            // Refresh current view
            if (currentView === 'view-dashboard') await loadDashboard();
            if (currentView === 'view-transactions') await loadTransactions();
            if (currentView === 'view-report') await loadReport();
        } catch (err) {
            console.error('[Form]', err);
            showToast('Gagal menyimpan: ' + err.message, 'error');
        }
    });
}

// Transaction click => edit or delete
document.addEventListener('click', async (e) => {
    const txItem = e.target.closest('.tx-item');
    if (!txItem) return;

    const id = txItem.dataset.id;
    if (!id) return;

    // Quick action menu
    const action = await showTransactionActions();
    if (action === 'edit') {
        try {
            const transactions = await getTransactions();
            const tx = transactions.find((t) => t.id === id);
            if (tx) {
                await populateFormCategories(tx.type);
                fillForm(tx);
                openModal('Edit Transaksi');
            }
        } catch (err) {
            showToast('Gagal memuat transaksi', 'error');
        }
    } else if (action === 'delete') {
        if (confirm('Hapus transaksi ini?')) {
            try {
                await deleteTransaction(id);
                showToast('Transaksi dihapus 🗑️');
                if (currentView === 'view-dashboard') await loadDashboard();
                if (currentView === 'view-transactions') await loadTransactions();
                if (currentView === 'view-report') await loadReport();
            } catch (err) {
                showToast('Gagal menghapus: ' + err.message, 'error');
            }
        }
    }
});

function showTransactionActions() {
    return new Promise((resolve) => {
        // Simple prompt with buttons
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.style.alignItems = 'center';
        overlay.innerHTML = `
      <div class="modal" style="border-radius:var(--radius);max-width:300px;text-align:center;transform:none">
        <div class="modal-handle"></div>
        <h3 style="margin-bottom:20px;font-size:1rem">Pilih Aksi</h3>
        <div style="display:flex;gap:12px">
          <button class="btn btn-primary" style="flex:1" data-action="edit">✏️ Edit</button>
          <button class="btn btn-danger" style="flex:1" data-action="delete">🗑️ Hapus</button>
        </div>
        <button class="btn btn-ghost" style="width:100%;margin-top:12px" data-action="cancel">Batal</button>
      </div>
    `;
        document.body.appendChild(overlay);

        overlay.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action || e.target === overlay) {
                overlay.remove();
                resolve(action || 'cancel');
            }
        });
    });
}

// ========== CATEGORY MANAGEMENT ==========
function bindCategoryEvents() {
    // Add category
    document.getElementById('btn-add-category')?.addEventListener('click', async () => {
        const nameInput = document.getElementById('new-cat-name');
        const iconInput = document.getElementById('new-cat-icon');
        const typeInput = document.getElementById('new-cat-type');

        const name = nameInput?.value.trim();
        const icon = iconInput?.value.trim() || '📁';
        const type = typeInput?.value || 'both';

        if (!name) {
            showToast('Masukkan nama kategori', 'error');
            return;
        }

        try {
            await addCategory(name, icon, type);
            showToast('Kategori ditambahkan ✅');
            if (nameInput) nameInput.value = '';
            if (iconInput) iconInput.value = '';
            categories = await getCategories();
            renderCategories(categories);
        } catch (err) {
            showToast('Gagal menambah kategori: ' + err.message, 'error');
        }
    });

    // Delete category (event delegation)
    document.addEventListener('click', async (e) => {
        const delBtn = e.target.closest('.cat-delete');
        if (!delBtn) return;

        const catId = delBtn.dataset.catId;
        if (!catId) return;

        if (confirm('Hapus kategori ini? Transaksi terkait tidak akan terhapus.')) {
            try {
                await deleteCategory(catId);
                showToast('Kategori dihapus');
                categories = await getCategories();
                renderCategories(categories);
            } catch (err) {
                showToast('Gagal menghapus: ' + err.message, 'error');
            }
        }
    });
}

// ========== SEARCH & FILTER ==========
function bindFilterEvents() {
    let debounceTimer;

    const searchInput = document.getElementById('search-input');
    const filterCategory = document.getElementById('filter-category');
    const filterType = document.getElementById('filter-type');
    const dateFrom = document.getElementById('filter-date-from');
    const dateTo = document.getElementById('filter-date-to');

    function applyFilters() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            const filters = {};
            if (searchInput?.value.trim()) filters.search = searchInput.value.trim();
            if (filterCategory?.value) filters.category = filterCategory.value;
            if (filterType?.value) filters.type = filterType.value;
            if (dateFrom?.value) filters.startDate = dateFrom.value;
            if (dateTo?.value) filters.endDate = dateTo.value;
            await loadTransactions(filters);
        }, 300);
    }

    searchInput?.addEventListener('input', applyFilters);
    filterCategory?.addEventListener('change', applyFilters);
    filterType?.addEventListener('change', applyFilters);
    dateFrom?.addEventListener('change', applyFilters);
    dateTo?.addEventListener('change', applyFilters);
}

// ========== REPORT NAVIGATION ==========
function bindReportEvents() {
    document.getElementById('report-prev')?.addEventListener('click', async () => {
        reportMonth--;
        if (reportMonth < 1) { reportMonth = 12; reportYear--; }
        await loadReport();
    });

    document.getElementById('report-next')?.addEventListener('click', async () => {
        reportMonth++;
        if (reportMonth > 12) { reportMonth = 1; reportYear++; }
        await loadReport();
    });
}

// ========== DEBTS (UTANG/PIUTANG) ==========
async function loadDebts() {
    try {
        const filters = {};
        if (debtFilterType !== 'all') filters.type = debtFilterType;
        if (debtFilterStatus !== 'all') filters.status = debtFilterStatus;
        const debts = await getDebts(filters);
        renderDebtList(debts);
    } catch (err) {
        console.error('[Debts]', err);
        showToast('Gagal memuat data utang/piutang', 'error');
    }
}

async function loadDebtDetail(debtId) {
    try {
        const debts = await getDebts();
        const debt = debts.find(d => d.id === debtId);
        if (!debt) {
            showToast('Data tidak ditemukan', 'error');
            return;
        }
        const payments = await getDebtPayments(debtId);
        currentDebtId = debtId;
        renderDebtDetail(debt, payments);
        showView('view-debt-detail');
    } catch (err) {
        console.error('[DebtDetail]', err);
        showToast('Gagal memuat detail', 'error');
    }
}

function bindDebtEvents() {
    // Type filter tabs
    document.querySelectorAll('.debt-tab').forEach(tab => {
        tab.addEventListener('click', async () => {
            document.querySelectorAll('.debt-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            debtFilterType = tab.dataset.dtype;
            await loadDebts();
        });
    });

    // Status filter
    document.querySelectorAll('.debt-status-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            document.querySelectorAll('.debt-status-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            debtFilterStatus = btn.dataset.dstatus;
            await loadDebts();
        });
    });

    // Add debt button
    document.getElementById('btn-add-debt')?.addEventListener('click', () => {
        resetDebtForm();
        openDebtModal('Tambah Utang/Piutang');
    });

    // Debt modal close
    document.getElementById('debt-modal-close')?.addEventListener('click', closeDebtModal);
    document.getElementById('debt-modal-overlay')?.addEventListener('click', (e) => {
        if (e.target.id === 'debt-modal-overlay') closeDebtModal();
    });

    // Payment modal close
    document.getElementById('payment-modal-close')?.addEventListener('click', closePaymentModal);
    document.getElementById('payment-modal-overlay')?.addEventListener('click', (e) => {
        if (e.target.id === 'payment-modal-overlay') closePaymentModal();
    });

    // Debt type toggle in form
    document.querySelectorAll('#debt-form .type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#debt-form .type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Debt form submit
    const debtForm = document.getElementById('debt-form');
    if (debtForm) {
        debtForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const editId = debtForm.dataset.editId;
            const activeType = document.querySelector('#debt-form .type-btn.active');
            const type = activeType?.dataset.type || 'utang';
            const person_name = document.getElementById('debt-person').value.trim();
            const total_amount = parseInt(document.getElementById('debt-amount').value, 10);
            const description = document.getElementById('debt-description').value.trim();
            const due_date = document.getElementById('debt-due-date').value || null;

            if (!person_name) {
                showToast('Masukkan nama orang', 'error');
                return;
            }
            if (!total_amount || total_amount <= 0) {
                showToast('Masukkan jumlah yang valid', 'error');
                return;
            }

            try {
                if (editId) {
                    await updateDebt(editId, { person_name, total_amount, description, due_date });
                    showToast('Data diperbarui ✅');
                } else {
                    await addDebt({ type, person_name, description, total_amount, due_date });
                    showToast('Berhasil ditambahkan ✅');
                }
                closeDebtModal();
                if (currentView === 'view-debts') await loadDebts();
                if (currentView === 'view-debt-detail' && editId) await loadDebtDetail(editId);
                if (currentView === 'view-dashboard') await loadDashboard();
            } catch (err) {
                console.error('[DebtForm]', err);
                showToast('Gagal menyimpan: ' + err.message, 'error');
            }
        });
    }

    // Payment form submit
    const paymentForm = document.getElementById('payment-form');
    if (paymentForm) {
        paymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const debtId = paymentForm.dataset.debtId;
            const amount = parseInt(document.getElementById('payment-amount').value, 10);
            const note = document.getElementById('payment-note').value.trim();
            const payment_date = document.getElementById('payment-date').value || todayISO();

            if (!amount || amount <= 0) {
                showToast('Masukkan jumlah yang valid', 'error');
                return;
            }

            try {
                await addDebtPayment({ debt_id: debtId, amount, note, payment_date });
                showToast('Pembayaran dicatat ✅');
                closePaymentModal();
                if (currentDebtId === debtId) await loadDebtDetail(debtId);
                if (currentView === 'view-debts') await loadDebts();
            } catch (err) {
                console.error('[PaymentForm]', err);
                showToast('Gagal menyimpan: ' + err.message, 'error');
            }
        });
    }

    // Back button from detail
    document.getElementById('btn-back-debts')?.addEventListener('click', async () => {
        currentDebtId = null;
        showView('view-debts');
        currentView = 'view-debts';
        await loadDebts();
    });

    // Click debt card => open detail
    document.addEventListener('click', async (e) => {
        const debtCard = e.target.closest('.debt-card');
        if (!debtCard) return;
        // Ignore if in detail view already
        if (e.target.closest('#debt-detail-content')) return;

        const debtId = debtCard.dataset.debtId;
        if (debtId) {
            currentView = 'view-debt-detail';
            await loadDebtDetail(debtId);
        }
    });

    // Add payment button (in detail view)
    document.addEventListener('click', async (e) => {
        const addPayBtn = e.target.closest('#btn-add-payment');
        if (!addPayBtn) return;

        const debtId = addPayBtn.dataset.debtId;
        try {
            const debts = await getDebts();
            const debt = debts.find(d => d.id === debtId);
            if (debt) {
                const remaining = debt.total_amount - debt.paid_amount;
                openPaymentModal(debtId, remaining);
            }
        } catch (err) {
            showToast('Gagal memuat data', 'error');
        }
    });

    // Edit debt button (in detail view)
    document.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.btn-edit-debt');
        if (!editBtn) return;

        const debtId = editBtn.dataset.debtId;
        try {
            const debts = await getDebts();
            const debt = debts.find(d => d.id === debtId);
            if (debt) {
                fillDebtForm(debt);
                openDebtModal('Edit Utang/Piutang');
            }
        } catch (err) {
            showToast('Gagal memuat data', 'error');
        }
    });

    // Delete debt button (in detail view)
    document.addEventListener('click', async (e) => {
        const delBtn = e.target.closest('.btn-delete-debt');
        if (!delBtn) return;

        const debtId = delBtn.dataset.debtId;
        if (confirm('Hapus catatan ini beserta semua riwayat pembayarannya?')) {
            try {
                await deleteDebt(debtId);
                showToast('Data dihapus 🗑️');
                currentDebtId = null;
                showView('view-debts');
                currentView = 'view-debts';
                await loadDebts();
            } catch (err) {
                showToast('Gagal menghapus: ' + err.message, 'error');
            }
        }
    });

    // Delete payment button
    document.addEventListener('click', async (e) => {
        const delPayBtn = e.target.closest('.btn-delete-payment');
        if (!delPayBtn) return;

        const paymentId = delPayBtn.dataset.paymentId;
        const debtId = delPayBtn.dataset.debtId;

        if (confirm('Hapus pembayaran ini?')) {
            try {
                await deleteDebtPayment(paymentId, debtId);
                showToast('Pembayaran dihapus');
                await loadDebtDetail(debtId);
            } catch (err) {
                showToast('Gagal menghapus: ' + err.message, 'error');
            }
        }
    });
}

// ========== STOCK / TRADING PORTFOLIO ==========
let stockFilterTypeValue = 'all';

async function loadStocks(filters = {}) {
    try {
        const summary = await getStockSummary();
        renderStockSummary(summary);

        const txFilters = {};
        if (stockFilterTypeValue !== 'all') txFilters.type = stockFilterTypeValue;
        const transactions = await getStockTransactions(txFilters);
        renderStockTransactions(transactions);
    } catch (err) {
        console.error('[Stocks]', err);
        showToast('Gagal memuat data saham', 'error');
    }
}

function bindStockEvents() {
    // Quick action buttons
    document.querySelectorAll('.stock-quick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const stype = btn.dataset.stype;
            resetStockForm();
            // Set the type in the modal
            document.querySelectorAll('#stock-form .stock-type-btn').forEach(b => b.classList.remove('active'));
            const targetBtn = document.querySelector(`#stock-form .${stype}-btn`);
            if (targetBtn) targetBtn.classList.add('active');
            const typeLabels = { deposit: 'Deposit Dana', withdraw: 'Tarik Dana', profit: 'Catat Profit', loss: 'Catat Loss' };
            openStockModal(typeLabels[stype] || 'Tambah Transaksi Saham');
        });
    });

    // Filter tabs
    document.querySelectorAll('.stock-filter-tab').forEach(tab => {
        tab.addEventListener('click', async () => {
            document.querySelectorAll('.stock-filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            stockFilterTypeValue = tab.dataset.sfilter;
            await loadStocks();
        });
    });

    // Stock modal close
    document.getElementById('stock-modal-close')?.addEventListener('click', closeStockModal);
    document.getElementById('stock-modal-overlay')?.addEventListener('click', (e) => {
        if (e.target.id === 'stock-modal-overlay') closeStockModal();
    });

    // Stock type toggle in form
    document.querySelectorAll('#stock-form .stock-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#stock-form .stock-type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Stock form submit
    const stockForm = document.getElementById('stock-form');
    if (stockForm) {
        stockForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const activeTypeBtn = document.querySelector('#stock-form .stock-type-btn.active');
            const type = activeTypeBtn?.dataset.stype || 'deposit';
            const amount = parseInt(document.getElementById('stock-amount').value, 10);
            const description = document.getElementById('stock-description').value.trim();
            const date = document.getElementById('stock-date').value || todayISO();

            if (!amount || amount <= 0) {
                showToast('Masukkan jumlah yang valid', 'error');
                return;
            }

            try {
                await addStockTransaction({ type, amount, description, date });
                const typeLabels = { deposit: 'Deposit', withdraw: 'Withdraw', profit: 'Profit', loss: 'Loss' };
                showToast(`${typeLabels[type]} berhasil dicatat ✅`);
                closeStockModal();
                if (currentView === 'view-stocks') await loadStocks();
                if (currentView === 'view-dashboard') await loadDashboard();
            } catch (err) {
                console.error('[StockForm]', err);
                showToast('Gagal menyimpan: ' + err.message, 'error');
            }
        });
    }

    // Delete stock transaction (click on item)
    document.addEventListener('click', async (e) => {
        const stockItem = e.target.closest('.stock-tx');
        if (!stockItem) return;

        const id = stockItem.dataset.stockId;
        if (!id) return;

        if (confirm('Hapus transaksi saham ini?')) {
            try {
                await deleteStockTransaction(id);
                showToast('Transaksi dihapus 🗑️');
                if (currentView === 'view-stocks') await loadStocks();
            } catch (err) {
                showToast('Gagal menghapus: ' + err.message, 'error');
            }
        }
    });
}

// ========== SETUP / CONFIG ==========
function showSetup() {
    document.getElementById('setup-view')?.classList.remove('hidden');
    document.getElementById('auth-view')?.classList.add('hidden');
    document.getElementById('app-view')?.classList.add('hidden');
}

function bindSetupEvents() {
    const form = document.getElementById('setup-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const url = document.getElementById('setup-url').value.trim();
        const key = document.getElementById('setup-key').value.trim();

        if (!url || !key) {
            showToast('Isi kedua field', 'error');
            return;
        }

        if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
            showToast('URL Supabase tidak valid', 'error');
            return;
        }

        saveSupabaseConfig(url, key);
        showToast('Config tersimpan! Memuat ulang...', 'success');
        setTimeout(() => location.reload(), 800);
    });
}

function bindSettingsEvents() {
    document.getElementById('btn-settings')?.addEventListener('click', () => {
        if (confirm('Reset konfigurasi Supabase?\n\nAnda akan diminta memasukkan URL dan Key Supabase lagi.\n(Data login tidak akan terhapus)')) {
            clearSupabaseConfig();
            showToast('Config direset', 'info');
            setTimeout(() => location.reload(), 500);
        }
    });
}
