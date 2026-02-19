// ========== SUPABASE CLIENT & DATA LAYER ==========
// Config is stored in localStorage — user inputs their own Supabase credentials

let supabase = null;

export function getSupabaseConfig() {
    const url = localStorage.getItem('dompetku_supabase_url');
    const key = localStorage.getItem('dompetku_supabase_key');
    return { url, key };
}

export function saveSupabaseConfig(url, key) {
    localStorage.setItem('dompetku_supabase_url', url.trim());
    localStorage.setItem('dompetku_supabase_key', key.trim());
}

export function hasSupabaseConfig() {
    const { url, key } = getSupabaseConfig();
    return !!(url && key);
}

export function clearSupabaseConfig() {
    localStorage.removeItem('dompetku_supabase_url');
    localStorage.removeItem('dompetku_supabase_key');
}

export function initSupabase() {
    if (typeof window.supabase === 'undefined') {
        console.error('[DB] Supabase SDK not loaded');
        return null;
    }
    const { url, key } = getSupabaseConfig();
    if (!url || !key) {
        console.warn('[DB] Supabase config not set');
        return null;
    }
    supabase = window.supabase.createClient(url, key);
    return supabase;
}

export function getClient() {
    return supabase;
}

// ========== DEFAULT CATEGORIES ==========
const DEFAULT_CATEGORIES = [
    { name: 'Makan', icon: '🍔', type: 'expense' },
    { name: 'Transport', icon: '🚗', type: 'expense' },
    { name: 'Belanja', icon: '🛒', type: 'expense' },
    { name: 'Tagihan', icon: '📄', type: 'expense' },
    { name: 'Hiburan', icon: '🎬', type: 'expense' },
    { name: 'Kesehatan', icon: '💊', type: 'expense' },
    { name: 'Gaji', icon: '💰', type: 'income' },
    { name: 'Freelance', icon: '💻', type: 'income' },
    { name: 'Investasi', icon: '📈', type: 'income' },
    { name: 'Lainnya', icon: '📁', type: 'both' }
];

// ========== CATEGORIES CRUD ==========
export async function getCategories() {
    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

    if (error) throw error;
    return data || [];
}

export async function addCategory(name, icon = '📁', type = 'both') {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
        .from('categories')
        .insert({ name, icon, type, user_id: user.id })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteCategory(id) {
    const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

export async function seedDefaultCategories() {
    const existing = await getCategories();
    if (existing.length > 0) return existing;

    const { data: { user } } = await supabase.auth.getUser();
    const rows = DEFAULT_CATEGORIES.map((c) => ({ ...c, user_id: user.id }));
    const { data, error } = await supabase
        .from('categories')
        .insert(rows)
        .select();

    if (error) throw error;
    return data || [];
}

// ========== TRANSACTIONS CRUD ==========
export async function getTransactions({ startDate, endDate, category, type, search } = {}) {
    let query = supabase
        .from('transactions')
        .select('*, categories(name, icon)')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);
    if (category) query = query.eq('category_id', category);
    if (type) query = query.eq('type', type);

    const { data, error } = await query;
    if (error) throw error;

    let results = data || [];

    // Client-side search by description
    if (search) {
        const q = search.toLowerCase();
        results = results.filter(
            (t) =>
                (t.description && t.description.toLowerCase().includes(q)) ||
                (t.categories && t.categories.name.toLowerCase().includes(q))
        );
    }

    return results;
}

export async function addTransaction({ type, amount, category_id, description, date }) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
        .from('transactions')
        .insert({
            type,
            amount: Math.round(amount),
            category_id: category_id || null,
            description: description || '',
            date,
            user_id: user.id
        })
        .select('*, categories(name, icon)')
        .single();

    if (error) throw error;
    return data;
}

export async function updateTransaction(id, updates) {
    const { data, error } = await supabase
        .from('transactions')
        .update({
            type: updates.type,
            amount: Math.round(updates.amount),
            category_id: updates.category_id || null,
            description: updates.description || '',
            date: updates.date
        })
        .eq('id', id)
        .select('*, categories(name, icon)')
        .single();

    if (error) throw error;
    return data;
}

export async function deleteTransaction(id) {
    const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// ========== REPORT HELPERS ==========
export async function getMonthlyReport(year, month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // last day

    const transactions = await getTransactions({ startDate, endDate });

    const income = transactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const expense = transactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    // Group expenses by category
    const categoryBreakdown = {};
    transactions
        .filter((t) => t.type === 'expense')
        .forEach((t) => {
            const catName = t.categories?.name || 'Lainnya';
            const catIcon = t.categories?.icon || '📁';
            if (!categoryBreakdown[catName]) {
                categoryBreakdown[catName] = { name: catName, icon: catIcon, total: 0 };
            }
            categoryBreakdown[catName].total += t.amount;
        });

    const categories = Object.values(categoryBreakdown).sort((a, b) => b.total - a.total);

    return { income, expense, balance: income - expense, categories, transactions };
}

export async function getLast6MonthsSummary() {
    const now = new Date();
    const results = [];

    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = d.getFullYear();
        const month = d.getMonth() + 1;
        const report = await getMonthlyReport(year, month);
        results.push({
            label: d.toLocaleDateString('id-ID', { month: 'short' }),
            year,
            month,
            income: report.income,
            expense: report.expense
        });
    }

    return results;
}

// ========== UTILITIES ==========
export function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

export function formatDate(dateStr) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

export function formatDateShort(dateStr) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short'
    });
}

export function todayISO() {
    return new Date().toISOString().split('T')[0];
}

// ========== DEBTS (UTANG/PIUTANG) CRUD ==========
export async function getDebts({ type, status } = {}) {
    let query = supabase
        .from('debts')
        .select('*')
        .order('created_at', { ascending: false });

    if (type) query = query.eq('type', type);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

export async function addDebt({ type, person_name, description, total_amount, due_date }) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
        .from('debts')
        .insert({
            type,
            person_name,
            description: description || '',
            total_amount: Math.round(total_amount),
            due_date: due_date || null,
            user_id: user.id
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateDebt(id, updates) {
    const updateData = { updated_at: new Date().toISOString() };
    if (updates.person_name !== undefined) updateData.person_name = updates.person_name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.total_amount !== undefined) updateData.total_amount = Math.round(updates.total_amount);
    if (updates.due_date !== undefined) updateData.due_date = updates.due_date || null;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.paid_amount !== undefined) updateData.paid_amount = Math.round(updates.paid_amount);

    const { data, error } = await supabase
        .from('debts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteDebt(id) {
    // Payments are cascade-deleted by the DB
    const { error } = await supabase
        .from('debts')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// ========== DEBT PAYMENTS CRUD ==========
export async function getDebtPayments(debtId) {
    const { data, error } = await supabase
        .from('debt_payments')
        .select('*')
        .eq('debt_id', debtId)
        .order('payment_date', { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function addDebtPayment({ debt_id, amount, note, payment_date }) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
        .from('debt_payments')
        .insert({
            debt_id,
            amount: Math.round(amount),
            note: note || '',
            payment_date: payment_date || todayISO(),
            user_id: user.id
        })
        .select()
        .single();

    if (error) throw error;

    // Update paid_amount on the parent debt
    const payments = await getDebtPayments(debt_id);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    // Get the debt to check if fully paid
    const debts = await getDebts();
    const debt = debts.find(d => d.id === debt_id);
    const newStatus = (debt && totalPaid >= debt.total_amount) ? 'settled' : 'active';

    await updateDebt(debt_id, { paid_amount: totalPaid, status: newStatus });

    return data;
}

export async function deleteDebtPayment(paymentId, debtId) {
    const { error } = await supabase
        .from('debt_payments')
        .delete()
        .eq('id', paymentId);

    if (error) throw error;

    // Recalculate paid_amount
    const payments = await getDebtPayments(debtId);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    const debts = await getDebts();
    const debt = debts.find(d => d.id === debtId);
    const newStatus = (debt && totalPaid >= debt.total_amount) ? 'settled' : 'active';

    await updateDebt(debtId, { paid_amount: totalPaid, status: newStatus });
}

// ========== DEBT SUMMARY ==========
export async function getDebtSummary() {
    const debts = await getDebts({ status: 'active' });

    const totalUtang = debts
        .filter(d => d.type === 'utang')
        .reduce((sum, d) => sum + (d.total_amount - d.paid_amount), 0);

    const totalPiutang = debts
        .filter(d => d.type === 'piutang')
        .reduce((sum, d) => sum + (d.total_amount - d.paid_amount), 0);

    const countUtang = debts.filter(d => d.type === 'utang').length;
    const countPiutang = debts.filter(d => d.type === 'piutang').length;

    return { totalUtang, totalPiutang, countUtang, countPiutang };
}

// ========== STOCK/TRADING PORTFOLIO CRUD ==========
export async function getStockTransactions({ type, startDate, endDate, search } = {}) {
    let query = supabase
        .from('stock_transactions')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

    if (type) query = query.eq('type', type);
    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);

    const { data, error } = await query;
    if (error) throw error;

    let results = data || [];

    if (search) {
        const q = search.toLowerCase();
        results = results.filter(
            (t) => (t.description && t.description.toLowerCase().includes(q))
        );
    }

    return results;
}

export async function addStockTransaction({ type, amount, description, date }) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
        .from('stock_transactions')
        .insert({
            type,
            amount: Math.round(amount),
            description: description || '',
            date: date || todayISO(),
            user_id: user.id
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteStockTransaction(id) {
    const { error } = await supabase
        .from('stock_transactions')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

export async function getStockSummary() {
    const { data, error } = await supabase
        .from('stock_transactions')
        .select('*');

    if (error) throw error;
    const txs = data || [];

    const totalDeposit = txs.filter(t => t.type === 'deposit').reduce((s, t) => s + t.amount, 0);
    const totalWithdraw = txs.filter(t => t.type === 'withdraw').reduce((s, t) => s + t.amount, 0);
    const totalProfit = txs.filter(t => t.type === 'profit').reduce((s, t) => s + t.amount, 0);
    const totalLoss = txs.filter(t => t.type === 'loss').reduce((s, t) => s + t.amount, 0);
    const netValue = totalDeposit - totalWithdraw + totalProfit - totalLoss;
    const netPL = totalProfit - totalLoss;

    return { totalDeposit, totalWithdraw, totalProfit, totalLoss, netValue, netPL };
}
