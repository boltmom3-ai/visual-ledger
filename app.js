// --- Configuration & Constants ---
const DEFAULT_CATEGORIES = {
    income: [
        { id: 'salary', name: 'Salary', icon: 'fa-money-bill-wave', color: '#10b981' },
        { id: 'side-hustle', name: 'Side Hustle', icon: 'fa-laptop-code', color: '#34d399' },
        { id: 'allowance', name: 'Allowance', icon: 'fa-piggy-bank', color: '#6ee7b7' },
        { id: 'income-etc', name: 'Miscellaneous', icon: 'fa-coins', color: '#a7f3d0' }
    ],
    expense: [
        { id: 'food', name: 'Food', icon: 'fa-utensils', color: '#ef4444' },
        { id: 'transport', name: 'Transportation', icon: 'fa-bus', color: '#f97316' },
        { id: 'shopping', name: 'Shopping', icon: 'fa-bag-shopping', color: '#ec4899' },
        { id: 'housing', name: 'Housing & Utilities', icon: 'fa-house', color: '#3b82f6' },
        { id: 'medical', name: 'Medical & Health', icon: 'fa-heart-pulse', color: '#06b6d4' },
        { id: 'education', name: 'Education', icon: 'fa-graduation-cap', color: '#8b5cf6' },
        { id: 'culture', name: 'Entertainment', icon: 'fa-film', color: '#a855f7' },
        { id: 'expense-etc', name: 'Miscellaneous', icon: 'fa-receipt', color: '#64748b' }
    ]
};

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

// --- App State ---
let transactions = [];
let currentPeriod = new Date(); // Represents current year & month

// --- DOM Elements ---
const prevMonthBtn = document.getElementById('prev-month-btn');
const nextMonthBtn = document.getElementById('next-month-btn');
const currentPeriodText = document.getElementById('current-period-text');

const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const netBalanceEl = document.getElementById('net-balance');

const transactionForm = document.getElementById('transaction-form');
const typeExpenseRadio = document.getElementById('type-expense');
const typeIncomeRadio = document.getElementById('type-income');
const dateInput = document.getElementById('transaction-date');
const categorySelect = document.getElementById('transaction-category');
const amountInput = document.getElementById('transaction-amount');
const descInput = document.getElementById('transaction-desc');

const svgDonut = document.getElementById('svg-donut');
const donutSegmentsGroup = document.getElementById('donut-segments');
const chartCenterAmount = document.getElementById('chart-center-amount');
const chartLegendList = document.getElementById('chart-legend-list');

const searchInput = document.getElementById('search-input');
const filterTypeSelect = document.getElementById('filter-type');
const transactionListBody = document.getElementById('transaction-list-body');
const noHistoryMessage = document.getElementById('no-history-message');

// --- Helper Functions ---
function formatCurrency(amount) {
    return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW'
    }).format(amount);
}

function getCategoryInfo(type, id) {
    const list = DEFAULT_CATEGORIES[type];
    return list.find(cat => cat.id === id) || { name: 'Other', icon: 'fa-question', color: '#64748b' };
}

// --- App Functions ---

// Load data from LocalStorage
function loadLocalStorage() {
    const data = localStorage.getItem('visual_ledger_transactions_v3');
    if (data) {
        try {
            transactions = JSON.parse(data).map(item => ({
                ...item,
                date: new Date(item.date) // convert date string back to Date object
            }));
        } catch (e) {
            console.error('Failed to parse local storage data.', e);
            transactions = [];
        }
    } else {
        // Sample seed data to present on first load (KRW values)
        transactions = [
            { id: 'seed-1', type: 'income', date: new Date(), category: 'salary', amount: 3500000, desc: 'Monthly Salary' },
            { id: 'seed-2', type: 'expense', date: new Date(), category: 'food', amount: 15500, desc: 'Lunch at Cafe' },
            { id: 'seed-3', type: 'expense', date: new Date(), category: 'transport', amount: 2700, desc: 'Subway Ride' },
            { id: 'seed-4', type: 'expense', date: new Date(), category: 'shopping', amount: 79000, desc: 'Summer Shirt' },
            { id: 'seed-5', type: 'expense', date: new Date(), category: 'housing', amount: 120000, desc: 'Internet & Phone Utilities' }
        ];
        saveLocalStorage();
    }
}

// Save data to LocalStorage
function saveLocalStorage() {
    localStorage.setItem('visual_ledger_transactions_v3', JSON.stringify(transactions));
}

// Populate Category dropdown based on selected type (income/expense)
function populateCategories() {
    const type = typeExpenseRadio.checked ? 'expense' : 'income';
    categorySelect.innerHTML = '';
    DEFAULT_CATEGORIES[type].forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name;
        categorySelect.appendChild(option);
    });
}

// Filter transactions by selected month/year
function getFilteredTransactions() {
    const year = currentPeriod.getFullYear();
    const month = currentPeriod.getMonth();
    return transactions.filter(t => t.date.getFullYear() === year && t.date.getMonth() === month);
}

// Update the Stats Dashboard Cards
function updateDashboard(periodTransactions) {
    let income = 0;
    let expense = 0;

    periodTransactions.forEach(t => {
        if (t.type === 'income') {
            income += t.amount;
        } else {
            expense += t.amount;
        }
    });

    totalIncomeEl.textContent = formatCurrency(income);
    totalExpenseEl.textContent = formatCurrency(expense);
    
    const balance = income - expense;
    netBalanceEl.textContent = formatCurrency(balance);
    
    if (balance < 0) {
        netBalanceEl.style.color = 'var(--color-expense)';
    } else if (balance > 0) {
        netBalanceEl.style.color = 'var(--color-income)';
    } else {
        netBalanceEl.style.color = 'var(--text-primary)';
    }
}

// Render SVG Donut Chart and Legend
function renderCharts(periodTransactions) {
    donutSegmentsGroup.innerHTML = '';
    chartLegendList.innerHTML = '';

    const expenses = periodTransactions.filter(t => t.type === 'expense');
    const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);

    chartCenterAmount.textContent = formatCurrency(totalExpense);

    if (totalExpense === 0) {
        chartLegendList.innerHTML = `<div class="no-data-text">No expenses recorded this month.</div>`;
        // Draw standard empty circle
        donutSegmentsGroup.innerHTML = `<circle cx="50" cy="50" r="40" fill="transparent" stroke="#1f293d" stroke-width="12" />`;
        return;
    }

    // Group expenses by category
    const categoryTotals = {};
    expenses.forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    // Sort categories by amount descending
    const sortedCategories = Object.keys(categoryTotals).map(catId => {
        const catInfo = getCategoryInfo('expense', catId);
        return {
            id: catId,
            name: catInfo.name,
            color: catInfo.color,
            amount: categoryTotals[catId],
            percentage: (categoryTotals[catId] / totalExpense) * 100
        };
    }).sort((a, b) => b.amount - a.amount);

    // Calculate segments positions in SVG Circle
    const r = 40;
    const circ = 2 * Math.PI * r;
    let accumulatedOffset = 0;

    sortedCategories.forEach(cat => {
        const segmentLength = (cat.percentage / 100) * circ;
        
        // Create circle segment
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('class', 'chart-segment');
        circle.setAttribute('cx', '50');
        circle.setAttribute('cy', '50');
        circle.setAttribute('r', r.toString());
        circle.setAttribute('fill', 'transparent');
        circle.setAttribute('stroke', cat.color);
        circle.setAttribute('stroke-width', '12');
        circle.setAttribute('stroke-dasharray', `${segmentLength} ${circ}`);
        circle.setAttribute('stroke-dashoffset', (-accumulatedOffset).toString());
        
        donutSegmentsGroup.appendChild(circle);
        accumulatedOffset += segmentLength;

        // Create Legend item
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.innerHTML = `
            <span class="legend-color" style="background-color: ${cat.color}"></span>
            <div class="legend-label-group">
                <span class="legend-name">${cat.name}</span>
                <span class="legend-percent">${Math.round(cat.percentage)}% (${formatCurrency(cat.amount)})</span>
            </div>
        `;
        chartLegendList.appendChild(legendItem);
    });
}

// Render detailed transaction history table
function renderHistoryTable(periodTransactions) {
    transactionListBody.innerHTML = '';
    
    const searchQuery = searchInput.value.trim().toLowerCase();
    const typeFilter = filterTypeSelect.value;

    const filteredList = periodTransactions.filter(t => {
        const catInfo = getCategoryInfo(t.type, t.category);
        const matchesSearch = t.desc.toLowerCase().includes(searchQuery) || catInfo.name.toLowerCase().includes(searchQuery);
        const matchesType = typeFilter === 'all' || t.type === typeFilter;
        return matchesSearch && matchesType;
    });

    // Sort by date descending
    filteredList.sort((a, b) => b.date - a.date);

    if (filteredList.length === 0) {
        noHistoryMessage.style.display = 'flex';
        return;
    } else {
        noHistoryMessage.style.display = 'none';
    }

    filteredList.forEach(t => {
        const catInfo = getCategoryInfo(t.type, t.category);
        const tr = document.createElement('tr');
        
        // format date
        const formattedDate = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}-${String(t.date.getDate()).padStart(2, '0')}`;
        
        const typeBadge = t.type === 'income' 
            ? `<span class="badge-type badge-income">Income</span>` 
            : `<span class="badge-type badge-expense">Expense</span>`;
            
        const amountClass = t.type === 'income' ? 'val-income' : 'val-expense';
        const prefix = t.type === 'income' ? '+' : '-';

        tr.innerHTML = `
            <td>${formattedDate}</td>
            <td>${typeBadge}</td>
            <td><i class="fa-solid ${catInfo.icon}" style="color: ${catInfo.color}; margin-right: 0.5rem;"></i>${catInfo.name}</td>
            <td>${t.desc}</td>
            <td class="text-right val-amount ${amountClass}">${prefix}${formatCurrency(t.amount)}</td>
            <td class="text-center">
                <button class="delete-btn" data-id="${t.id}" aria-label="Delete record">
                    <i class="fa-regular fa-trash-can"></i>
                </button>
            </td>
        `;
        transactionListBody.appendChild(tr);
    });
}

// Master Render function
function render() {
    // 1. Update Month Header
    const year = currentPeriod.getFullYear();
    const monthName = MONTH_NAMES[currentPeriod.getMonth()];
    currentPeriodText.textContent = `${monthName} ${year}`;

    // 2. Filter transactions for the current month
    const periodTransactions = getFilteredTransactions();

    // 3. Update dashboard & visualization charts & list
    updateDashboard(periodTransactions);
    renderCharts(periodTransactions);
    renderHistoryTable(periodTransactions);
}

// --- Event Handlers & Setup ---

// Setup event listeners
function setupEventListeners() {
    // Month navigation
    prevMonthBtn.addEventListener('click', () => {
        currentPeriod.setMonth(currentPeriod.getMonth() - 1);
        render();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentPeriod.setMonth(currentPeriod.getMonth() + 1);
        render();
    });

    // Toggle categories based on transaction type selector
    typeExpenseRadio.addEventListener('change', populateCategories);
    typeIncomeRadio.addEventListener('change', populateCategories);

    // Search and Filter updates
    searchInput.addEventListener('input', render);
    filterTypeSelect.addEventListener('change', render);

    // Handle form submit
    transactionForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const amount = parseInt(amountInput.value, 10);
        const desc = descInput.value.trim();
        const dateStr = dateInput.value;
        const category = categorySelect.value;
        const type = typeExpenseRadio.checked ? 'expense' : 'income';

        // Basic validation
        if (!dateStr || !category || isNaN(amount) || amount <= 0 || !desc) {
            alert('Please fill out all fields with valid information.');
            return;
        }

        const newTransaction = {
            id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            type,
            date: new Date(dateStr),
            category,
            amount,
            desc
        };

        transactions.push(newTransaction);
        saveLocalStorage();
        
        // Reset inputs
        amountInput.value = '';
        descInput.value = '';
        
        // Render updates
        render();
    });

    // Delete transaction handler
    transactionListBody.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-btn');
        if (!deleteBtn) return;

        const id = deleteBtn.getAttribute('data-id');
        if (confirm('Are you sure you want to delete this transaction record?')) {
            transactions = transactions.filter(t => t.id !== id);
            saveLocalStorage();
            render();
        }
    });
}

// App Initialization
function init() {
    // Set date input to today by default
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    dateInput.value = `${yyyy}-${mm}-${dd}`;

    loadLocalStorage();
    populateCategories();
    setupEventListeners();
    render();
}

// Start the application
document.addEventListener('DOMContentLoaded', init);
