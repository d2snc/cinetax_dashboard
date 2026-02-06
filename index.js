// ===== Authentication =====
const AUTH_CREDENTIALS = {
    username: 'admin',
    password: 'admin1234'
};

function checkAuth() {
    const isLoggedIn = localStorage.getItem('cinetax_auth') === 'true';
    if (isLoggedIn) {
        showDashboard();
    } else {
        showLogin();
    }
}

function showLogin() {
    document.getElementById('login-overlay').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
}

function showDashboard() {
    document.getElementById('login-overlay').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';

    // Trigger window resize to ensure charts render correctly after becoming visible
    window.dispatchEvent(new Event('resize'));
}

function handleLogin(e) {
    e.preventDefault();

    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorMsg = document.getElementById('login-error');

    if (usernameInput.value === AUTH_CREDENTIALS.username &&
        passwordInput.value === AUTH_CREDENTIALS.password) {

        localStorage.setItem('cinetax_auth', 'true');
        showDashboard();
        errorMsg.textContent = '';

    } else {
        errorMsg.textContent = 'Usuário ou senha incorretos';
        passwordInput.value = '';
        passwordInput.focus();

        // Shake animation effect
        const card = document.querySelector('.login-card');
        card.style.animation = 'none';
        card.offsetHeight; /* trigger reflow */
        card.style.animation = 'shake 0.5s';
    }
}

// Add shake animation
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);


// ===== Dashboard Data & State =====
let dashboardData = null;
let filteredInvestors = [];
let currentPage = 1;
const itemsPerPage = 25;

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    // Check auth first
    checkAuth();

    // Bind login form
    document.getElementById('login-form').addEventListener('submit', handleLogin);

    // Load data regardless (it's safe, just for display)
    loadData();
});

// REMOVED: document.addEventListener('DOMContentLoaded', loadData); at the end

const colors = {
    primary: '#6366f1',
    secondary: '#8b5cf6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#06b6d4',
    chart: [
        '#6366f1', '#8b5cf6', '#06b6d4', '#10b981',
        '#f59e0b', '#ef4444', '#ec4899', '#14b8a6',
        '#f97316', '#84cc16'
    ],
    chartTransparent: [
        'rgba(99, 102, 241, 0.8)', 'rgba(139, 92, 246, 0.8)',
        'rgba(6, 182, 212, 0.8)', 'rgba(16, 185, 129, 0.8)',
        'rgba(245, 158, 11, 0.8)', 'rgba(239, 68, 68, 0.8)',
        'rgba(236, 72, 153, 0.8)', 'rgba(20, 184, 166, 0.8)',
        'rgba(249, 115, 22, 0.8)', 'rgba(132, 204, 22, 0.8)'
    ]
};

const sectorIcons = {
    'Bancos e Financeiras': '🏦',
    'Energia e Utilities': '⚡',
    'Telecomunicações': '📡',
    'Indústria': '🏭',
    'Comércio e Varejo': '🛒',
    'Transporte e Logística': '🚛',
    'Construção e Imobiliário': '🏗️',
    'Mídia e Comunicação': '📺',
    'Turismo e Entretenimento': '✈️',
    'Outros Setores': '🏢',
    'Pessoa Física': '👤'
};

// ===== Utility Functions =====
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

function formatNumber(value) {
    return new Intl.NumberFormat('pt-BR').format(value);
}

function formatCompactCurrency(value) {
    if (value >= 1e9) return `R$ ${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `R$ ${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `R$ ${(value / 1e3).toFixed(0)}K`;
    return formatCurrency(value);
}

// ===== Data Loading =====
async function loadData() {
    try {
        const response = await fetch('data.json');
        dashboardData = await response.json();
        initializeDashboard();
    } catch (error) {
        console.error('Error loading data:', error);
        document.body.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100vh; color: #ef4444;">
                <div style="text-align: center;">
                    <h2>Erro ao carregar dados</h2>
                    <p>Certifique-se de que o arquivo data.json existe.</p>
                </div>
            </div>
        `;
    }
}

// ===== Dashboard Initialization =====
function initializeDashboard() {
    updateKPIs();
    initializeNavigation();
    initializeFilters();
    initializeSearch();

    // Initialize charts
    renderTimelineChart();
    renderSectorsDonutChart();
    renderStatesChart();
    renderTopInvestorsQuick();

    // Initialize section-specific content
    renderSectorsSection();
    renderGeographicSection();
    renderTimelineSection();

    // Initialize investors table
    filteredInvestors = [...dashboardData.allInvestors];
    renderInvestorsTable();
}

// ===== KPIs Update =====
function updateKPIs() {
    const { summary } = dashboardData;

    document.getElementById('kpi-total').textContent = formatCompactCurrency(summary.totalCaptado);
    document.getElementById('kpi-captacoes').textContent = formatNumber(summary.totalCaptacoes);
    document.getElementById('kpi-investidores').textContent = formatNumber(summary.totalInvestidores);
    document.getElementById('kpi-periodo').textContent = summary.periodo;
}

// ===== Navigation =====
function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();

            const sectionId = item.dataset.section;

            // Update nav active state
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Update section visibility
            sections.forEach(section => section.classList.remove('active'));
            document.getElementById(`section-${sectionId}`).classList.add('active');

            // Update header title
            updateSectionTitle(sectionId);
        });
    });

    // View all links
    document.querySelectorAll('.view-all-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.dataset.section;
            document.querySelector(`[data-section="${sectionId}"]`).click();
        });
    });
}

function updateSectionTitle(sectionId) {
    const titles = {
        overview: { title: 'Visão Geral', subtitle: 'Análise de captações via Lei do Audiovisual (Art. 1)' },
        sectors: { title: 'Análise por Setor', subtitle: 'Distribuição de investimentos por segmento empresarial' },
        investors: { title: 'Top Investidores', subtitle: 'Ranking completo de investidores com filtros' },
        geographic: { title: 'Análise Geográfica', subtitle: 'Distribuição de investimentos por estado' },
        timeline: { title: 'Evolução Temporal', subtitle: 'Histórico de captações ao longo dos anos' }
    };

    const { title, subtitle } = titles[sectionId] || titles.overview;
    document.getElementById('section-title').textContent = title;
    document.getElementById('section-subtitle').textContent = subtitle;
}

// ===== Charts =====
function renderTimelineChart() {
    const ctx = document.getElementById('chart-timeline').getContext('2d');
    const years = dashboardData.byYear;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: years.map(y => y.year),
            datasets: [{
                label: 'Volume Captado',
                data: years.map(y => y.total),
                borderColor: colors.primary,
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => formatCurrency(ctx.raw)
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#94a3b8' }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: {
                        color: '#94a3b8',
                        callback: (value) => formatCompactCurrency(value)
                    }
                }
            }
        }
    });
}

function renderSectorsDonutChart() {
    const ctx = document.getElementById('chart-sectors').getContext('2d');
    const sectors = dashboardData.sectors.slice(0, 8);

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: sectors.map(s => s.name),
            datasets: [{
                data: sectors.map(s => s.total),
                backgroundColor: colors.chartTransparent,
                borderColor: colors.chart,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#94a3b8',
                        padding: 12,
                        usePointStyle: true,
                        font: { size: 11 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.label}: ${formatCurrency(ctx.raw)}`
                    }
                }
            }
        }
    });
}

function renderStatesChart() {
    const ctx = document.getElementById('chart-states').getContext('2d');
    const states = dashboardData.byState.slice(0, 10);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: states.map(s => s.uf),
            datasets: [{
                data: states.map(s => s.total),
                backgroundColor: colors.chartTransparent,
                borderColor: colors.chart,
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => formatCurrency(ctx.raw)
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: {
                        color: '#94a3b8',
                        callback: (value) => formatCompactCurrency(value)
                    }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8' }
                }
            }
        }
    });
}

function renderTopInvestorsQuick() {
    const tbody = document.querySelector('#top-investors-quick tbody');
    const topInvestors = dashboardData.topInvestors.slice(0, 10);

    tbody.innerHTML = topInvestors.map((inv, i) => `
        <tr>
            <td>${i + 1}</td>
            <td title="${inv.name}">${inv.name.substring(0, 45)}${inv.name.length > 45 ? '...' : ''}</td>
            <td><span class="sector-badge">${sectorIcons[inv.sector] || '🏢'} ${inv.sector}</span></td>
            <td>${inv.uf || '-'}</td>
            <td><strong>${formatCurrency(inv.total)}</strong></td>
            <td>${inv.count}</td>
        </tr>
    `).join('');
}

// ===== Sectors Section =====
function renderSectorsSection() {
    // Bar chart for sectors
    const ctxBar = document.getElementById('chart-sectors-bar').getContext('2d');
    const sectors = dashboardData.sectors;

    new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: sectors.map(s => s.name),
            datasets: [{
                label: 'Volume Total',
                data: sectors.map(s => s.total),
                backgroundColor: colors.chartTransparent,
                borderColor: colors.chart,
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => formatCurrency(ctx.raw)
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: '#94a3b8',
                        maxRotation: 45,
                        minRotation: 45,
                        font: { size: 10 }
                    }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: {
                        color: '#94a3b8',
                        callback: (value) => formatCompactCurrency(value)
                    }
                }
            }
        }
    });

    // Companies chart
    const ctxCompanies = document.getElementById('chart-sectors-companies').getContext('2d');

    new Chart(ctxCompanies, {
        type: 'bar',
        data: {
            labels: sectors.map(s => s.name),
            datasets: [{
                label: 'Empresas',
                data: sectors.map(s => s.companies),
                backgroundColor: 'rgba(16, 185, 129, 0.7)',
                borderColor: '#10b981',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: '#94a3b8',
                        maxRotation: 45,
                        minRotation: 45,
                        font: { size: 10 }
                    }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#94a3b8' }
                }
            }
        }
    });

    // Sector cards
    const maxTotal = Math.max(...sectors.map(s => s.total));
    const container = document.getElementById('sectors-cards');

    container.innerHTML = sectors.map(sector => {
        const avgInvestment = sector.total / sector.count;
        const barWidth = (sector.total / maxTotal) * 100;

        return `
            <div class="sector-card">
                <div class="sector-card-header">
                    <div class="sector-card-icon">${sectorIcons[sector.name] || '🏢'}</div>
                    <div class="sector-card-title">${sector.name}</div>
                </div>
                <div class="sector-card-stats">
                    <div class="sector-stat">
                        <span class="sector-stat-value">${formatCompactCurrency(sector.total)}</span>
                        <span class="sector-stat-label">Total</span>
                    </div>
                    <div class="sector-stat">
                        <span class="sector-stat-value">${sector.count}</span>
                        <span class="sector-stat-label">Captações</span>
                    </div>
                    <div class="sector-stat">
                        <span class="sector-stat-value">${sector.companies}</span>
                        <span class="sector-stat-label">Empresas</span>
                    </div>
                </div>
                <div class="sector-card-bar" style="width: ${barWidth}%"></div>
            </div>
        `;
    }).join('');
}

// ===== Geographic Section =====
function renderGeographicSection() {
    const ctx = document.getElementById('chart-states-full').getContext('2d');
    const states = dashboardData.byState;

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: states.map(s => s.uf),
            datasets: [{
                label: 'Volume Captado',
                data: states.map(s => s.total),
                backgroundColor: colors.chartTransparent.slice(0, states.length),
                borderColor: colors.chart.slice(0, states.length),
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${formatCurrency(ctx.raw)} (${dashboardData.byState[ctx.dataIndex].count} captações)`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8' }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: {
                        color: '#94a3b8',
                        callback: (value) => formatCompactCurrency(value)
                    }
                }
            }
        }
    });

    // State cards
    const container = document.getElementById('states-cards');
    container.innerHTML = states.map(state => `
        <div class="state-card">
            <div class="state-uf">${state.uf}</div>
            <div class="state-total">${formatCompactCurrency(state.total)}</div>
            <div class="state-count">${state.count} captações</div>
        </div>
    `).join('');
}

// ===== Timeline Section =====
function renderTimelineSection() {
    const ctx = document.getElementById('chart-timeline-full').getContext('2d');
    const years = dashboardData.byYear;

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: years.map(y => y.year),
            datasets: [
                {
                    label: 'Volume Captado',
                    data: years.map(y => y.total),
                    backgroundColor: 'rgba(99, 102, 241, 0.7)',
                    borderColor: '#6366f1',
                    borderWidth: 1,
                    borderRadius: 3,
                    yAxisID: 'y'
                },
                {
                    label: 'Quantidade',
                    data: years.map(y => y.count),
                    type: 'line',
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 3,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#94a3b8' }
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            if (ctx.dataset.label === 'Volume Captado') {
                                return `Volume: ${formatCurrency(ctx.raw)}`;
                            }
                            return `Quantidade: ${ctx.raw} captações`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8' }
                },
                y: {
                    type: 'linear',
                    position: 'left',
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: {
                        color: '#94a3b8',
                        callback: (value) => formatCompactCurrency(value)
                    }
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    grid: { display: false },
                    ticks: { color: '#10b981' }
                }
            }
        }
    });

    // Year cards
    const container = document.getElementById('years-cards');
    container.innerHTML = years.map(year => `
        <div class="year-card">
            <div class="year-value">${year.year}</div>
            <div class="year-total">${formatCompactCurrency(year.total)}</div>
            <div class="year-count">${year.count} captações</div>
        </div>
    `).join('');
}

// ===== Filters =====
function initializeFilters() {
    // Populate sector filter
    const sectorSelect = document.getElementById('filter-sector');
    dashboardData.sectors.forEach(sector => {
        const option = document.createElement('option');
        option.value = sector.name;
        option.textContent = sector.name;
        sectorSelect.appendChild(option);
    });

    // Populate state filter
    const stateSelect = document.getElementById('filter-state');
    dashboardData.byState.forEach(state => {
        const option = document.createElement('option');
        option.value = state.uf;
        option.textContent = state.uf;
        stateSelect.appendChild(option);
    });

    // Add event listeners
    sectorSelect.addEventListener('change', applyFilters);
    stateSelect.addEventListener('change', applyFilters);
    document.getElementById('filter-sort').addEventListener('change', applyFilters);

    // Export button
    document.getElementById('btn-export').addEventListener('click', exportToCSV);
}

function applyFilters() {
    const sectorFilter = document.getElementById('filter-sector').value;
    const stateFilter = document.getElementById('filter-state').value;
    const sortBy = document.getElementById('filter-sort').value;

    // Filter
    filteredInvestors = dashboardData.allInvestors.filter(inv => {
        if (sectorFilter && inv.sector !== sectorFilter) return false;
        if (stateFilter && inv.uf !== stateFilter) return false;
        return true;
    });

    // Sort
    filteredInvestors.sort((a, b) => {
        if (sortBy === 'total') return b.total - a.total;
        if (sortBy === 'count') return b.count - a.count;
        if (sortBy === 'avg') return (b.total / b.count) - (a.total / a.count);
        return 0;
    });

    currentPage = 1;
    renderInvestorsTable();
}

// ===== Search =====
function initializeSearch() {
    const searchInput = document.getElementById('search-input');
    let debounceTimer;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const query = e.target.value.toLowerCase().trim();

            if (query) {
                filteredInvestors = dashboardData.allInvestors.filter(inv =>
                    inv.name.toLowerCase().includes(query) ||
                    (inv.cnpj && inv.cnpj.includes(query))
                );
            } else {
                filteredInvestors = [...dashboardData.allInvestors];
            }

            // Switch to investors section
            document.querySelector('[data-section="investors"]').click();

            currentPage = 1;
            renderInvestorsTable();
        }, 300);
    });
}

// ===== Investors Table =====
function renderInvestorsTable() {
    const tbody = document.querySelector('#investors-table tbody');
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = filteredInvestors.slice(start, end);

    tbody.innerHTML = pageData.map((inv, i) => `
        <tr>
            <td>${start + i + 1}</td>
            <td title="${inv.name}">${inv.name.substring(0, 40)}${inv.name.length > 40 ? '...' : ''}</td>
            <td>${inv.cnpj || '-'}</td>
            <td><span class="sector-badge">${sectorIcons[inv.sector] || '🏢'} ${inv.sector}</span></td>
            <td>${inv.uf || '-'}</td>
            <td><strong>${formatCurrency(inv.total)}</strong></td>
            <td>${inv.count}</td>
            <td>${formatCurrency(inv.total / inv.count)}</td>
        </tr>
    `).join('');

    renderPagination();
}

function renderPagination() {
    const container = document.getElementById('pagination');
    const totalPages = Math.ceil(filteredInvestors.length / itemsPerPage);

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = `
        <button ${currentPage === 1 ? 'disabled' : ''} onclick="goToPage(1)">«</button>
        <button ${currentPage === 1 ? 'disabled' : ''} onclick="goToPage(${currentPage - 1})">‹</button>
    `;

    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }

    html += `
        <span class="pagination-info">${filteredInvestors.length} investidores</span>
        <button ${currentPage === totalPages ? 'disabled' : ''} onclick="goToPage(${currentPage + 1})">›</button>
        <button ${currentPage === totalPages ? 'disabled' : ''} onclick="goToPage(${totalPages})">»</button>
    `;

    container.innerHTML = html;
}

function goToPage(page) {
    currentPage = page;
    renderInvestorsTable();
    document.querySelector('#investors-table').scrollIntoView({ behavior: 'smooth' });
}

// ===== Export =====
function exportToCSV() {
    const headers = ['#', 'Investidor', 'CNPJ', 'Setor', 'UF', 'Total Investido', 'Captações', 'Média/Captação'];
    const rows = filteredInvestors.map((inv, i) => [
        i + 1,
        `"${inv.name}"`,
        inv.cnpj || '',
        inv.sector,
        inv.uf || '',
        inv.total,
        inv.count,
        (inv.total / inv.count).toFixed(2)
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `investidores_audiovisuais_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

// ===== Initialize =====
