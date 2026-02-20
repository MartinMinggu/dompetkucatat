// ========== UI RENDERING MODULE ==========
import { formatCurrency, formatDate, formatDateShort } from './supabase-client.js';

// ========== TOAST NOTIFICATIONS ==========
export function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || ''}</span> ${message}`;
  container.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}

// ========== LOADING ==========
export function showLoading() {
  const el = document.getElementById('loading-overlay');
  if (el) { el.classList.remove('fade-out'); el.classList.remove('hidden'); }
}

export function hideLoading() {
  const el = document.getElementById('loading-overlay');
  if (el) {
    el.classList.add('fade-out');
    setTimeout(() => el.classList.add('hidden'), 500);
  }
}

// ========== VIEW MANAGEMENT ==========
export function showView(viewId) {
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  const view = document.getElementById(viewId);
  if (view) view.classList.add('active');

  // Update nav
  document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
  const navItem = document.querySelector(`.nav-item[data-view="${viewId}"]`);
  if (navItem) navItem.classList.add('active');
}

export function showAuth() {
  document.getElementById('auth-view').classList.remove('hidden');
  document.getElementById('app-view').classList.add('hidden');
}

export function showApp() {
  document.getElementById('auth-view').classList.add('hidden');
  document.getElementById('app-view').classList.remove('hidden');
}

// ========== DASHBOARD ==========
export function renderDashboard(report) {
  const el = document.getElementById('dashboard-summary');
  if (!el) return;

  el.innerHTML = `
    <div class="summary-card balance">
      <div class="label">
        <span class="icon-circle">💎</span>
        Saldo
      </div>
      <div class="amount">${formatCurrency(report.balance)}</div>
    </div>
    <div class="summary-row">
      <div class="summary-card income">
        <div class="label">
          <span class="icon-circle">📈</span>
          Pemasukan
        </div>
        <div class="amount">${formatCurrency(report.income)}</div>
      </div>
      <div class="summary-card expense">
        <div class="label">
          <span class="icon-circle">📉</span>
          Pengeluaran
        </div>
        <div class="amount">${formatCurrency(report.expense)}</div>
      </div>
    </div>
  `;
}

// ========== RECENT TRANSACTIONS ==========
export function renderRecentTransactions(transactions) {
  const el = document.getElementById('recent-transactions');
  if (!el) return;

  if (!transactions.length) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <h3>Belum ada transaksi</h3>
        <p>Tap tombol + untuk menambah transaksi pertama</p>
      </div>
    `;
    return;
  }

  // Show last 5 transactions
  const recent = transactions.slice(0, 5);
  el.innerHTML = recent.map((tx) => renderTransactionItem(tx)).join('');
}

// ========== TRANSACTION LIST ==========
export function renderTransactionList(transactions) {
  const el = document.getElementById('transaction-list');
  if (!el) return;

  if (!transactions.length) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>Tidak ada transaksi</h3>
        <p>Coba ubah filter pencarian Anda</p>
      </div>
    `;
    return;
  }

  // Group transactions by date
  const groups = {};
  transactions.forEach((tx) => {
    const date = tx.date;
    if (!groups[date]) groups[date] = [];
    groups[date].push(tx);
  });

  let html = '';
  Object.keys(groups)
    .sort((a, b) => b.localeCompare(a))
    .forEach((date) => {
      html += `
        <div class="tx-date-group">
          <div class="tx-date-label">${formatDate(date)}</div>
          <div class="tx-list">
            ${groups[date].map((tx) => renderTransactionItem(tx)).join('')}
          </div>
        </div>
      `;
    });

  el.innerHTML = html;
}

function renderTransactionItem(tx) {
  const icon = tx.categories?.icon || '📁';
  const catName = tx.categories?.name || 'Lainnya';
  const sign = tx.type === 'income' ? '+' : '-';

  return `
    <div class="tx-item ${tx.type}" data-id="${tx.id}">
      <div class="tx-icon">${icon}</div>
      <div class="tx-info">
        <div class="tx-desc">${escapeHtml(tx.description || catName)}</div>
        <div class="tx-cat">${catName}</div>
      </div>
      <div class="tx-amount">${sign}${formatCurrency(tx.amount)}</div>
    </div>
  `;
}

// ========== CATEGORIES ==========
export function renderCategories(categories) {
  const el = document.getElementById('categories-list');
  if (!el) return;

  if (!categories.length) {
    el.innerHTML = '<div class="empty-state"><p>Belum ada kategori</p></div>';
    return;
  }

  el.innerHTML = categories
    .map(
      (c) => `
      <div class="category-pill" data-id="${c.id}">
        <span class="cat-emoji">${c.icon}</span>
        <span>${escapeHtml(c.name)}</span>
        <span class="cat-type" style="font-size:0.65rem;color:var(--text-muted)">${c.type === 'income' ? '📈' : c.type === 'expense' ? '📉' : '↔️'}</span>
        <button class="cat-delete" data-cat-id="${c.id}" title="Hapus">×</button>
      </div>
    `
    )
    .join('');
}

export function renderCategoryOptions(categories, selectedId = null) {
  const selects = document.querySelectorAll('.category-select');
  selects.forEach((sel) => {
    const currentType = sel.dataset.filterType || '';
    const filtered = currentType
      ? categories.filter((c) => c.type === currentType || c.type === 'both')
      : categories;

    sel.innerHTML = `<option value="">Semua Kategori</option>` +
      filtered.map((c) => `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('');
  });
}

// ========== REPORT ==========
export function renderReport(year, month, report) {
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  const labelEl = document.getElementById('report-month-label');
  if (labelEl) labelEl.textContent = `${monthNames[month - 1]} ${year}`;

  const summaryEl = document.getElementById('report-summary');
  if (summaryEl) {
    summaryEl.innerHTML = `
      <div class="report-row income">
        <span class="label">📈 Total Pemasukan</span>
        <span class="value">${formatCurrency(report.income)}</span>
      </div>
      <div class="report-row expense">
        <span class="label">📉 Total Pengeluaran</span>
        <span class="value">${formatCurrency(report.expense)}</span>
      </div>
      <div class="report-row balance">
        <span class="label">💎 Selisih / Saldo</span>
        <span class="value">${formatCurrency(report.balance)}</span>
      </div>
    `;
  }

  const catListEl = document.getElementById('report-categories');
  if (catListEl) {
    if (!report.categories.length) {
      catListEl.innerHTML = '<div class="empty-state"><p>Tidak ada pengeluaran bulan ini</p></div>';
      return;
    }

    const maxAmount = Math.max(...report.categories.map((c) => c.total));
    catListEl.innerHTML = report.categories
      .map(
        (c) => `
        <div class="report-cat-item">
          <span class="cat-emoji">${c.icon}</span>
          <div class="cat-info">
            <div class="cat-name">${escapeHtml(c.name)}</div>
            <div class="cat-bar">
              <div class="cat-bar-fill" style="width: ${(c.total / maxAmount) * 100}%"></div>
            </div>
          </div>
          <div class="cat-amount">${formatCurrency(c.total)}</div>
        </div>
      `
      )
      .join('');
  }
}

// ========== MODAL ==========
export function openModal(title = 'Tambah Transaksi') {
  const overlay = document.getElementById('modal-overlay');
  const headerTitle = document.getElementById('modal-title');
  if (headerTitle) headerTitle.textContent = title;
  if (overlay) overlay.classList.add('active');
}

export function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.classList.remove('active');
  resetForm();
}

export function resetForm() {
  const form = document.getElementById('tx-form');
  if (form) form.reset();

  // Reset type toggle
  document.querySelectorAll('.type-btn').forEach((b) => b.classList.remove('active'));
  const expBtn = document.querySelector('.type-btn.expense-btn');
  if (expBtn) expBtn.classList.add('active');

  // Set today's date
  const dateInput = document.getElementById('tx-date');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

  // Clear edit id
  const form2 = document.getElementById('tx-form');
  if (form2) form2.dataset.editId = '';
}

export function fillForm(tx) {
  document.getElementById('tx-amount').value = tx.amount;
  document.getElementById('tx-description').value = tx.description || '';
  document.getElementById('tx-date').value = tx.date;
  document.getElementById('tx-form').dataset.editId = tx.id;

  // Set type
  document.querySelectorAll('.type-btn').forEach((b) => b.classList.remove('active'));
  const activeBtn = document.querySelector(`.type-btn.${tx.type}-btn`);
  if (activeBtn) activeBtn.classList.add('active');

  // Set category after a tick (to wait for options to populate)
  setTimeout(() => {
    const catSelect = document.getElementById('tx-category');
    if (catSelect) catSelect.value = tx.category_id || '';
  }, 100);
}

// ========== HELPERS ==========
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ========== DEBT RENDERING ==========
export function renderDebtList(debts) {
  const container = document.getElementById('debt-list');
  if (!container) return;

  if (!debts.length) {
    container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <h3>Belum ada catatan</h3>
                <p>Tap tombol di atas untuk mencatat utang atau piutang</p>
            </div>`;
    return;
  }

  container.innerHTML = debts.map(debt => {
    const percent = debt.total_amount > 0
      ? Math.min(100, Math.round((debt.paid_amount / debt.total_amount) * 100))
      : 0;
    const remaining = debt.total_amount - debt.paid_amount;
    const isSettled = debt.status === 'settled';
    const typeClass = debt.type === 'utang' ? 'utang' : 'piutang';
    const typeIcon = debt.type === 'utang' ? '🔴' : '🔵';
    const typeLabel = debt.type === 'utang' ? 'Utang' : 'Piutang';

    let dueDateHtml = '';
    if (debt.due_date) {
      const dueDate = new Date(debt.due_date + 'T00:00:00');
      const now = new Date();
      const isOverdue = !isSettled && dueDate < now;
      dueDateHtml = `<span class="debt-due ${isOverdue ? 'overdue' : ''}">
                ${isOverdue ? '⚠️' : '📅'} ${dueDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>`;
    }

    return `
            <div class="debt-card ${typeClass} ${isSettled ? 'settled' : ''}" data-debt-id="${debt.id}">
                <div class="debt-card-header">
                    <div class="debt-person-info">
                        <span class="debt-type-badge ${typeClass}">${typeIcon} ${typeLabel}</span>
                        ${isSettled ? '<span class="debt-settled-badge">✅ Lunas</span>' : ''}
                    </div>
                    <div class="debt-person-name">${escapeHtml(debt.person_name)}</div>
                    ${debt.description ? `<div class="debt-desc">${escapeHtml(debt.description)}</div>` : ''}
                </div>
                <div class="debt-card-body">
                    <div class="debt-amounts">
                        <div class="debt-total">
                            <span class="debt-amount-label">Total</span>
                            <span class="debt-amount-value">${formatCurrency(debt.total_amount)}</span>
                        </div>
                        <div class="debt-remaining">
                            <span class="debt-amount-label">${isSettled ? 'Terbayar' : 'Sisa'}</span>
                            <span class="debt-amount-value ${isSettled ? 'settled' : ''}">${formatCurrency(isSettled ? debt.paid_amount : remaining)}</span>
                        </div>
                    </div>
                    <div class="debt-progress-wrapper">
                        <div class="debt-progress-bar">
                            <div class="debt-progress-fill ${typeClass}" style="width:${percent}%"></div>
                        </div>
                        <span class="debt-progress-text">${percent}%</span>
                    </div>
                    <div class="debt-card-footer">
                        ${dueDateHtml}
                    </div>
                </div>
            </div>`;
  }).join('');
}

export function renderDebtDetail(debt, payments) {
  const container = document.getElementById('debt-detail-content');
  if (!container) return;

  const percent = debt.total_amount > 0
    ? Math.min(100, Math.round((debt.paid_amount / debt.total_amount) * 100))
    : 0;
  const remaining = debt.total_amount - debt.paid_amount;
  const isSettled = debt.status === 'settled';
  const typeClass = debt.type === 'utang' ? 'utang' : 'piutang';
  const typeIcon = debt.type === 'utang' ? '🔴' : '🔵';
  const typeLabel = debt.type === 'utang' ? 'Utang' : 'Piutang';

  let dueDateHtml = '';
  if (debt.due_date) {
    const dueDate = new Date(debt.due_date + 'T00:00:00');
    const now = new Date();
    const isOverdue = !isSettled && dueDate < now;
    dueDateHtml = `<div class="detail-due ${isOverdue ? 'overdue' : ''}">
            ${isOverdue ? '⚠️ Jatuh tempo lewat: ' : '📅 Jatuh tempo: '}
            ${dueDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>`;
  }

  const paymentListHtml = payments.length > 0
    ? payments.map(p => `
            <div class="payment-item" data-payment-id="${p.id}" data-debt-id="${debt.id}">
                <div class="payment-info">
                    <div class="payment-amount">+${formatCurrency(p.amount)}</div>
                    <div class="payment-meta">
                        ${p.note ? `<span>${escapeHtml(p.note)}</span> · ` : ''}
                        <span>${new Date(p.payment_date + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                </div>
                <button class="btn-icon btn-delete-payment" data-payment-id="${p.id}" data-debt-id="${debt.id}" title="Hapus">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            </div>
        `).join('')
    : `<div class="empty-state" style="padding:20px 0"><p style="color:var(--text-muted)">Belum ada pembayaran</p></div>`;

  container.innerHTML = `
        <div class="debt-detail-card ${typeClass}">
            <div class="debt-detail-header">
                <span class="debt-type-badge ${typeClass}">${typeIcon} ${typeLabel}</span>
                ${isSettled ? '<span class="debt-settled-badge">✅ Lunas</span>' : ''}
            </div>
            <h2 class="debt-detail-name">${escapeHtml(debt.person_name)}</h2>
            ${debt.description ? `<p class="debt-detail-desc">${escapeHtml(debt.description)}</p>` : ''}
            ${dueDateHtml}

            <div class="debt-detail-amounts">
                <div class="detail-amount-item">
                    <span class="detail-amount-label">Total</span>
                    <span class="detail-amount-value">${formatCurrency(debt.total_amount)}</span>
                </div>
                <div class="detail-amount-item">
                    <span class="detail-amount-label">Terbayar</span>
                    <span class="detail-amount-value paid">${formatCurrency(debt.paid_amount)}</span>
                </div>
                <div class="detail-amount-item">
                    <span class="detail-amount-label">Sisa</span>
                    <span class="detail-amount-value remaining">${formatCurrency(remaining)}</span>
                </div>
            </div>

            <div class="debt-progress-wrapper" style="margin:16px 0">
                <div class="debt-progress-bar" style="height:10px">
                    <div class="debt-progress-fill ${typeClass}" style="width:${percent}%"></div>
                </div>
                <span class="debt-progress-text">${percent}%</span>
            </div>

            <div class="debt-detail-actions">
                ${!isSettled ? `<button id="btn-add-payment" class="btn btn-primary" data-debt-id="${debt.id}" style="flex:1">💰 Tambah Pembayaran</button>` : ''}
                <button class="btn btn-ghost btn-edit-debt" data-debt-id="${debt.id}" style="white-space:nowrap">✏️ Edit</button>
                <button class="btn btn-danger btn-delete-debt" data-debt-id="${debt.id}" style="white-space:nowrap">🗑️ Hapus</button>
            </div>
        </div>

        <div class="section-header" style="margin-top:24px">
            <h3>Riwayat Pembayaran</h3>
            <span class="payment-total-label">${payments.length} pembayaran</span>
        </div>
        <div class="payment-history">
            ${paymentListHtml}
        </div>
    `;
}

export function renderDebtDashboardSummary(summary) {
  const utangEl = document.getElementById('dashboard-utang');
  const piutangEl = document.getElementById('dashboard-piutang');
  const utangCountEl = document.getElementById('dashboard-utang-count');
  const piutangCountEl = document.getElementById('dashboard-piutang-count');

  if (utangEl) utangEl.textContent = formatCurrency(summary.totalUtang);
  if (piutangEl) piutangEl.textContent = formatCurrency(summary.totalPiutang);
  if (utangCountEl) utangCountEl.textContent = `${summary.countUtang} aktif`;
  if (piutangCountEl) piutangCountEl.textContent = `${summary.countPiutang} aktif`;
}

// Debt Modal helpers
export function openDebtModal(title = 'Tambah Utang/Piutang') {
  const overlay = document.getElementById('debt-modal-overlay');
  const titleEl = document.getElementById('debt-modal-title');
  if (overlay) overlay.classList.add('active');
  if (titleEl) titleEl.textContent = title;
}

export function closeDebtModal() {
  const overlay = document.getElementById('debt-modal-overlay');
  if (overlay) overlay.classList.remove('active');
}

export function resetDebtForm() {
  const form = document.getElementById('debt-form');
  if (form) {
    form.reset();
    form.dataset.editId = '';
  }
  // Reset type toggle
  document.querySelectorAll('#debt-form .type-btn').forEach(b => b.classList.remove('active'));
  const utangBtn = document.querySelector('#debt-form .utang-btn');
  if (utangBtn) utangBtn.classList.add('active');
}

export function fillDebtForm(debt) {
  const form = document.getElementById('debt-form');
  if (!form) return;
  form.dataset.editId = debt.id;
  document.getElementById('debt-person').value = debt.person_name || '';
  document.getElementById('debt-amount').value = debt.total_amount || '';
  document.getElementById('debt-description').value = debt.description || '';
  document.getElementById('debt-due-date').value = debt.due_date || '';

  // Set type toggle
  document.querySelectorAll('#debt-form .type-btn').forEach(b => b.classList.remove('active'));
  const targetBtn = document.querySelector(`#debt-form .${debt.type}-btn`);
  if (targetBtn) targetBtn.classList.add('active');
}

// Payment Modal helpers
export function openPaymentModal(debtId, remaining) {
  const overlay = document.getElementById('payment-modal-overlay');
  const form = document.getElementById('payment-form');
  const remainingEl = document.getElementById('payment-remaining');
  const dateInput = document.getElementById('payment-date');

  if (overlay) overlay.classList.add('active');
  if (form) {
    form.reset();
    form.dataset.debtId = debtId;
  }
  if (remainingEl) {
    remainingEl.innerHTML = `Sisa yang harus dibayar: <strong>${formatCurrency(remaining)}</strong>`;
  }
  if (dateInput) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }
}

export function closePaymentModal() {
  const overlay = document.getElementById('payment-modal-overlay');
  if (overlay) overlay.classList.remove('active');
}

// ========== STOCK/TRADING PORTFOLIO RENDERING ==========
export function renderStockSummary(summary) {
  const el = document.getElementById('stock-summary');
  if (!el) return;

  const plClass = summary.netPL >= 0 ? 'profit' : 'loss';
  const plSign = summary.netPL >= 0 ? '+' : '';

  el.innerHTML = `
    <div class="summary-card stock-net-value">
      <div class="label"><span class="icon-circle">💼</span> Nilai Portofolio</div>
      <div class="amount">${formatCurrency(summary.netValue)}</div>
    </div>
    <div class="summary-row">
      <div class="summary-card stock-deposit">
        <div class="label"><span class="icon-circle">📥</span> Total Deposit</div>
        <div class="amount">${formatCurrency(summary.totalDeposit)}</div>
      </div>
      <div class="summary-card stock-withdraw">
        <div class="label"><span class="icon-circle">📤</span> Total Tarik</div>
        <div class="amount">${formatCurrency(summary.totalWithdraw)}</div>
      </div>
    </div>
    <div class="summary-row">
      <div class="summary-card stock-profit">
        <div class="label"><span class="icon-circle">📈</span> Total Profit</div>
        <div class="amount">${formatCurrency(summary.totalProfit)}</div>
      </div>
      <div class="summary-card stock-loss">
        <div class="label"><span class="icon-circle">📉</span> Total Loss</div>
        <div class="amount">${formatCurrency(summary.totalLoss)}</div>
      </div>
    </div>
    <div class="summary-card stock-pl ${plClass}">
      <div class="label"><span class="icon-circle">⚡</span> Net P&L (Profit/Loss)</div>
      <div class="amount">${plSign}${formatCurrency(summary.netPL)}</div>
    </div>
  `;
}

export function renderStockTransactions(transactions) {
  const el = document.getElementById('stock-tx-list');
  if (!el) return;

  if (!transactions.length) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📊</div>
        <h3>Belum ada catatan</h3>
        <p>Tap tombol di atas untuk mencatat deposit, withdraw, profit atau loss</p>
      </div>
    `;
    return;
  }

  // Group by date
  const groups = {};
  transactions.forEach(tx => {
    const date = tx.date;
    if (!groups[date]) groups[date] = [];
    groups[date].push(tx);
  });

  const typeMap = {
    deposit: { icon: '📥', label: 'Deposit', sign: '+', cls: 'deposit' },
    withdraw: { icon: '📤', label: 'Withdraw', sign: '-', cls: 'withdraw' },
    profit: { icon: '📈', label: 'Profit', sign: '+', cls: 'profit' },
    loss: { icon: '📉', label: 'Loss', sign: '-', cls: 'loss' }
  };

  let html = '';
  Object.keys(groups)
    .sort((a, b) => b.localeCompare(a))
    .forEach(date => {
      html += `
        <div class="tx-date-group">
          <div class="tx-date-label">${formatDate(date)}</div>
          <div class="tx-list">
            ${groups[date].map(tx => {
        const t = typeMap[tx.type] || typeMap.deposit;
        return `
                <div class="tx-item stock-tx ${t.cls}" data-stock-id="${tx.id}">
                  <div class="tx-icon">${t.icon}</div>
                  <div class="tx-info">
                    <div class="tx-desc">${escapeHtml(tx.description || t.label)}</div>
                    <div class="tx-cat">${t.label}</div>
                  </div>
                  <div class="tx-amount">${t.sign}${formatCurrency(tx.amount)}</div>
                </div>
              `;
      }).join('')}
          </div>
        </div>
      `;
    });

  el.innerHTML = html;
}

export function openStockModal(title = 'Tambah Transaksi Saham') {
  const overlay = document.getElementById('stock-modal-overlay');
  const titleEl = document.getElementById('stock-modal-title');
  if (overlay) overlay.classList.add('active');
  if (titleEl) titleEl.textContent = title;
}

export function closeStockModal() {
  const overlay = document.getElementById('stock-modal-overlay');
  if (overlay) overlay.classList.remove('active');
  resetStockForm();
}

export function resetStockForm() {
  const form = document.getElementById('stock-form');
  if (form) form.reset();
  // Reset type toggle
  document.querySelectorAll('#stock-form .stock-type-btn').forEach(b => b.classList.remove('active'));
  const depositBtn = document.querySelector('#stock-form .deposit-btn');
  if (depositBtn) depositBtn.classList.add('active');
  // Set today's date
  const dateInput = document.getElementById('stock-date');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
}

// ========== PURCHASE PLAN (RENCANA PEMBELIAN) RENDERING ==========
const URGENSI_MAP = {
  DARURAT: { icon: '🔴', label: 'Darurat', cls: 'urgency-darurat' },
  PENTING: { icon: '🟠', label: 'Penting', cls: 'urgency-penting' },
  NORMAL: { icon: '🔵', label: 'Normal', cls: 'urgency-normal' },
  KEINGINAN: { icon: '⚪', label: 'Keinginan', cls: 'urgency-keinginan' }
};

const STATUS_MAP = {
  DIRANCANG: { icon: '📝', label: 'Dirancang', cls: 'status-dirancang' },
  DIPERTIMBANGKAN: { icon: '🤔', label: 'Dipertimbangkan', cls: 'status-dipertimbangkan' },
  DIBELI: { icon: '✅', label: 'Dibeli', cls: 'status-dibeli' },
  DIBATALKAN: { icon: '❌', label: 'Dibatalkan', cls: 'status-dibatalkan' },
  TIDAK_JADI_DIBUTUHKAN: { icon: '🚫', label: 'Tidak Dibutuhkan', cls: 'status-tidak-dibutuhkan' }
};

export function renderPurchasePlanList(plans) {
  const container = document.getElementById('purchase-plan-list');
  if (!container) return;

  if (!plans.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🛒</div>
        <h3>Belum ada rencana</h3>
        <p>Tap tombol di atas untuk menambah rencana pembelian</p>
      </div>`;
    return;
  }

  container.innerHTML = plans.map(plan => {
    const urg = URGENSI_MAP[plan.urgensi] || URGENSI_MAP.NORMAL;
    const sts = STATUS_MAP[plan.status] || STATUS_MAP.DIRANCANG;
    const isFinished = ['DIBELI', 'DIBATALKAN', 'TIDAK_JADI_DIBUTUHKAN'].includes(plan.status);
    const dateStr = new Date(plan.tanggal_dicatat + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

    return `
      <div class="pp-card ${isFinished ? 'pp-finished' : ''}" data-pp-id="${plan.id}">
        <div class="pp-card-header">
          <div class="pp-badges">
            <span class="pp-urgency-badge ${urg.cls}">${urg.icon} ${urg.label}</span>
            <span class="pp-status-badge ${sts.cls}">${sts.icon} ${sts.label}</span>
          </div>
        </div>
        <div class="pp-card-body">
          <div class="pp-name">${escapeHtml(plan.nama_barang)}</div>
          <div class="pp-price">${formatCurrency(plan.perkiraan_harga)}</div>
          ${plan.catatan ? `<div class="pp-note">${escapeHtml(plan.catatan)}</div>` : ''}
          <div class="pp-date">📅 ${dateStr}</div>
        </div>
      </div>`;
  }).join('');
}

export function openPurchasePlanModal(title = 'Tambah Rencana Pembelian') {
  const overlay = document.getElementById('pp-modal-overlay');
  const titleEl = document.getElementById('pp-modal-title');
  if (overlay) overlay.classList.add('active');
  if (titleEl) titleEl.textContent = title;
}

export function closePurchasePlanModal() {
  const overlay = document.getElementById('pp-modal-overlay');
  if (overlay) overlay.classList.remove('active');
}

export function resetPurchasePlanForm() {
  const form = document.getElementById('pp-form');
  if (form) {
    form.reset();
    form.dataset.editId = '';
  }
  // Reset urgensi to NORMAL
  const urgensiSelect = document.getElementById('pp-urgensi');
  if (urgensiSelect) urgensiSelect.value = 'NORMAL';
  // Reset status to DIRANCANG
  const statusSelect = document.getElementById('pp-status');
  if (statusSelect) statusSelect.value = 'DIRANCANG';
  // Set today's date
  const dateInput = document.getElementById('pp-date');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
}

export function fillPurchasePlanForm(plan) {
  const form = document.getElementById('pp-form');
  if (!form) return;
  form.dataset.editId = plan.id;
  document.getElementById('pp-nama').value = plan.nama_barang || '';
  document.getElementById('pp-harga').value = plan.perkiraan_harga || '';
  document.getElementById('pp-date').value = plan.tanggal_dicatat || '';
  document.getElementById('pp-urgensi').value = plan.urgensi || 'NORMAL';
  document.getElementById('pp-status').value = plan.status || 'DIRANCANG';
  document.getElementById('pp-catatan').value = plan.catatan || '';
}

