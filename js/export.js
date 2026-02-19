// ========== EXPORT MODULE ==========
// Handles CSV and PDF export of financial data
import { formatCurrency, formatDate, todayISO } from './supabase-client.js';

// ========== CSV EXPORT ==========
export function exportTransactionsToCSV(transactions, filename = 'transaksi') {
    if (!transactions.length) return false;

    const headers = ['Tanggal', 'Tipe', 'Kategori', 'Deskripsi', 'Jumlah'];
    const rows = transactions.map(tx => [
        tx.date,
        tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
        tx.categories?.name || 'Lainnya',
        `"${(tx.description || '').replace(/"/g, '""')}"`,
        tx.amount
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(csv, `${filename}_${todayISO()}.csv`, 'text/csv;charset=utf-8;');
    return true;
}

export function exportStockTransactionsToCSV(transactions, filename = 'saham') {
    if (!transactions.length) return false;

    const typeLabels = { deposit: 'Deposit', withdraw: 'Withdraw', profit: 'Profit', loss: 'Loss' };
    const headers = ['Tanggal', 'Tipe', 'Deskripsi', 'Jumlah'];
    const rows = transactions.map(tx => [
        tx.date,
        typeLabels[tx.type] || tx.type,
        `"${(tx.description || '').replace(/"/g, '""')}"`,
        tx.amount
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(csv, `${filename}_${todayISO()}.csv`, 'text/csv;charset=utf-8;');
    return true;
}

export function exportReportToCSV(report, year, month, filename = 'laporan') {
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const monthName = monthNames[month - 1];

    let csv = `Laporan Keuangan - ${monthName} ${year}\n\n`;
    csv += `Ringkasan\n`;
    csv += `Pemasukan,${report.income}\n`;
    csv += `Pengeluaran,${report.expense}\n`;
    csv += `Saldo,${report.balance}\n\n`;

    if (report.categories.length) {
        csv += `Detail Pengeluaran per Kategori\n`;
        csv += `Kategori,Jumlah\n`;
        report.categories.forEach(c => {
            csv += `${c.name},${c.total}\n`;
        });
        csv += '\n';
    }

    if (report.transactions.length) {
        csv += `Detail Transaksi\n`;
        csv += `Tanggal,Tipe,Kategori,Deskripsi,Jumlah\n`;
        report.transactions.forEach(tx => {
            csv += `${tx.date},${tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran'},${tx.categories?.name || 'Lainnya'},"${(tx.description || '').replace(/"/g, '""')}",${tx.amount}\n`;
        });
    }

    downloadFile(csv, `${filename}_${monthName}_${year}.csv`, 'text/csv;charset=utf-8;');
    return true;
}

// ========== PDF EXPORT (via Print) ==========
export function exportReportToPDF(report, year, month) {
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const monthName = monthNames[month - 1];

    const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Laporan Keuangan - ${monthName} ${year}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1a1a2e; background: #fff; font-size: 14px; }
    .header { text-align: center; margin-bottom: 32px; border-bottom: 3px solid #10b981; padding-bottom: 20px; }
    .header h1 { font-size: 24px; color: #10b981; margin-bottom: 4px; }
    .header .subtitle { color: #666; font-size: 16px; }
    .header .date { color: #999; font-size: 12px; margin-top: 8px; }
    .summary { display: flex; gap: 16px; margin-bottom: 32px; }
    .summary-item { flex: 1; padding: 16px; border-radius: 10px; text-align: center; }
    .summary-item.income { background: #ecfdf5; border: 1px solid #a7f3d0; }
    .summary-item.expense { background: #fff1f2; border: 1px solid #fecdd3; }
    .summary-item.balance { background: #f0f9ff; border: 1px solid #bae6fd; }
    .summary-item .label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
    .summary-item .value { font-size: 20px; font-weight: 700; }
    .summary-item.income .value { color: #10b981; }
    .summary-item.expense .value { color: #f43f5e; }
    .summary-item.balance .value { color: #3b82f6; }
    h2 { font-size: 16px; color: #333; margin: 24px 0 12px; padding-bottom: 8px; border-bottom: 1px solid #eee; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #f8fafc; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; padding: 10px 12px; text-align: left; border-bottom: 2px solid #e2e8f0; }
    td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
    tr:hover { background: #fafafa; }
    .amount { text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; }
    .income-text { color: #10b981; }
    .expense-text { color: #f43f5e; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 11px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>💰 DompetKu</h1>
    <div class="subtitle">Laporan Keuangan — ${monthName} ${year}</div>
    <div class="date">Dicetak pada ${new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
  </div>

  <div class="summary">
    <div class="summary-item income">
      <div class="label">Pemasukan</div>
      <div class="value">${formatCurrency(report.income)}</div>
    </div>
    <div class="summary-item expense">
      <div class="label">Pengeluaran</div>
      <div class="value">${formatCurrency(report.expense)}</div>
    </div>
    <div class="summary-item balance">
      <div class="label">Saldo</div>
      <div class="value">${formatCurrency(report.balance)}</div>
    </div>
  </div>

  ${report.categories.length ? `
  <h2>📊 Pengeluaran per Kategori</h2>
  <table>
    <thead><tr><th>Kategori</th><th class="amount">Jumlah</th></tr></thead>
    <tbody>
      ${report.categories.map(c => `<tr><td>${c.icon} ${c.name}</td><td class="amount expense-text">${formatCurrency(c.total)}</td></tr>`).join('')}
    </tbody>
  </table>
  ` : ''}

  ${report.transactions.length ? `
  <h2>📋 Detail Transaksi</h2>
  <table>
    <thead><tr><th>Tanggal</th><th>Tipe</th><th>Kategori</th><th>Deskripsi</th><th class="amount">Jumlah</th></tr></thead>
    <tbody>
      ${report.transactions.map(tx => `
        <tr>
          <td>${tx.date}</td>
          <td>${tx.type === 'income' ? '📈 Pemasukan' : '📉 Pengeluaran'}</td>
          <td>${tx.categories?.name || 'Lainnya'}</td>
          <td>${tx.description || '-'}</td>
          <td class="amount ${tx.type === 'income' ? 'income-text' : 'expense-text'}">${tx.type === 'income' ? '+' : '-'}${formatCurrency(tx.amount)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  ` : ''}

  <div class="footer">DompetKu — Catatan Keuangan Pribadi</div>
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
    }
    return true;
}

// ========== HELPER ==========
function downloadFile(content, filename, mimeType) {
    const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
    const blob = new Blob([BOM + content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
