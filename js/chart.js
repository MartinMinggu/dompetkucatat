// ========== CHART MODULE ==========
import { formatCurrency } from './supabase-client.js';

let doughnutChart = null;
let barChart = null;

const CHART_COLORS = [
    '#10b981', '#f43f5e', '#8b5cf6', '#f59e0b', '#3b82f6',
    '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
];

// ========== DOUGHNUT: Expense by Category ==========
export function renderDoughnutChart(categoryData) {
    const canvas = document.getElementById('chart-doughnut');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (doughnutChart) doughnutChart.destroy();

    if (!categoryData.length) {
        // Show empty state
        canvas.style.display = 'none';
        const wrapper = canvas.parentElement;
        let empty = wrapper.querySelector('.chart-empty');
        if (!empty) {
            empty = document.createElement('div');
            empty.className = 'chart-empty empty-state';
            empty.innerHTML = '<p>Belum ada data pengeluaran</p>';
            wrapper.appendChild(empty);
        }
        return;
    }

    canvas.style.display = 'block';
    const emptyEl = canvas.parentElement?.querySelector('.chart-empty');
    if (emptyEl) emptyEl.remove();

    doughnutChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: categoryData.map((c) => `${c.icon} ${c.name}`),
            datasets: [{
                data: categoryData.map((c) => c.total),
                backgroundColor: CHART_COLORS.slice(0, categoryData.length),
                borderColor: 'transparent',
                borderWidth: 0,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#94a3b8',
                        padding: 12,
                        font: { family: "'Inter', sans-serif", size: 11 },
                        usePointStyle: true,
                        pointStyleWidth: 10
                    }
                },
                tooltip: {
                    backgroundColor: '#1e293b',
                    titleColor: '#f1f5f9',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(148,163,184,0.1)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 12,
                    callbacks: {
                        label: (context) => ` ${formatCurrency(context.parsed)}`
                    }
                }
            }
        }
    });
}

// ========== BAR: Income vs Expense (6 months) ==========
export function renderBarChart(monthlyData) {
    const canvas = document.getElementById('chart-bar');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (barChart) barChart.destroy();

    if (!monthlyData.length) return;

    barChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: monthlyData.map((m) => m.label),
            datasets: [
                {
                    label: 'Pemasukan',
                    data: monthlyData.map((m) => m.income),
                    backgroundColor: 'rgba(16, 185, 129, 0.7)',
                    borderColor: '#10b981',
                    borderWidth: 1,
                    borderRadius: 6,
                    borderSkipped: false
                },
                {
                    label: 'Pengeluaran',
                    data: monthlyData.map((m) => m.expense),
                    backgroundColor: 'rgba(244, 63, 94, 0.7)',
                    borderColor: '#f43f5e',
                    borderWidth: 1,
                    borderRadius: 6,
                    borderSkipped: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: '#64748b',
                        font: { family: "'Inter', sans-serif", size: 11 }
                    }
                },
                y: {
                    grid: { color: 'rgba(148,163,184,0.08)' },
                    ticks: {
                        color: '#64748b',
                        font: { family: "'Inter', sans-serif", size: 11 },
                        callback: (val) => {
                            if (val >= 1000000) return `${val / 1000000}jt`;
                            if (val >= 1000) return `${val / 1000}rb`;
                            return val;
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        color: '#94a3b8',
                        padding: 16,
                        font: { family: "'Inter', sans-serif", size: 11 },
                        usePointStyle: true,
                        pointStyleWidth: 10
                    }
                },
                tooltip: {
                    backgroundColor: '#1e293b',
                    titleColor: '#f1f5f9',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(148,163,184,0.1)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 12,
                    callbacks: {
                        label: (context) => ` ${context.dataset.label}: ${formatCurrency(context.parsed.y)}`
                    }
                }
            }
        }
    });
}
