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
let categoryBudgets = {}; // Category-wise budgets
let currentPeriod = new Date(); // Represents current year & month

// --- DOM Elements ---
const prevMonthBtn = document.getElementById('prev-month-btn');
const nextMonthBtn = document.getElementById('next-month-btn');
const currentPeriodText = document.getElementById('current-period-text');

const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const netBalanceEl = document.getElementById('net-balance');

// Budget Elements
const categoryBudgetsList = document.getElementById('category-budgets-list');

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
    // Load transactions
    const data = localStorage.getItem('visual_ledger_transactions_v4');
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
        const today = new Date();
        transactions = [
            { id: 'seed-1', type: 'income', date: new Date(today.getFullYear(), today.getMonth(), 5), category: 'salary', amount: 3500000, desc: 'Monthly Salary' },
            { id: 'seed-2', type: 'income', date: new Date(today.getFullYear(), today.getMonth(), 15), category: 'side-hustle', amount: 450000, desc: 'Freelance Design Work' },
            { id: 'seed-3', type: 'expense', date: new Date(today.getFullYear(), today.getMonth(), 2), category: 'housing', amount: 450000, desc: 'Monthly Studio Rent' },
            { id: 'seed-4', type: 'expense', date: new Date(today.getFullYear(), today.getMonth(), 3), category: 'food', amount: 120000, desc: 'Weekly Grocery Shopping' },
            { id: 'seed-5', type: 'expense', date: new Date(today.getFullYear(), today.getMonth(), 5), category: 'transport', amount: 45000, desc: 'Subway Pass Refill' },
            { id: 'seed-6', type: 'expense', date: new Date(today.getFullYear(), today.getMonth(), 6), category: 'shopping', amount: 95000, desc: 'Running Shoes' },
            { id: 'seed-7', type: 'expense', date: new Date(today.getFullYear(), today.getMonth(), 8), category: 'food', amount: 85000, desc: 'Dinner with Team' },
            { id: 'seed-8', type: 'expense', date: new Date(today.getFullYear(), today.getMonth(), 10), category: 'culture', amount: 28000, desc: 'Cinema Tickets' },
            { id: 'seed-9', type: 'expense', date: new Date(today.getFullYear(), today.getMonth(), 12), category: 'medical', amount: 12000, desc: 'Cold Medicine' },
            { id: 'seed-10', type: 'expense', date: new Date(today.getFullYear(), today.getMonth(), 14), category: 'expense-etc', amount: 55000, desc: 'Coffee Shop Study Sessions' }
        ];
        saveLocalStorage();
    }

    // Load category budgets
    const savedCatBudgets = localStorage.getItem('visual_ledger_category_budgets');
    if (savedCatBudgets) {
        try {
            categoryBudgets = JSON.parse(savedCatBudgets);
        } catch (e) {
            console.error('Failed to parse category budgets.', e);
            categoryBudgets = {};
        }
    } else {
        // Defaults
        categoryBudgets = {
            food: 500000,
            transport: 100000,
            shopping: 300000,
            housing: 300000,
            medical: 150000,
            education: 200000,
            culture: 150000,
            'expense-etc': 100000
        };
        saveCategoryBudgetsToLocalStorage();
    }
}

// Save data to LocalStorage
function saveLocalStorage() {
    localStorage.setItem('visual_ledger_transactions_v4', JSON.stringify(transactions));
}

function saveCategoryBudgetsToLocalStorage() {
    localStorage.setItem('visual_ledger_category_budgets', JSON.stringify(categoryBudgets));
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

// Render category-wise budget progress bars
function renderCategoryBudgets(periodTransactions) {
    categoryBudgetsList.innerHTML = '';
    
    // Group expenses by category
    const categoryTotals = {};
    const expenses = periodTransactions.filter(t => t.type === 'expense');
    expenses.forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    DEFAULT_CATEGORIES.expense.forEach(cat => {
        const spent = categoryTotals[cat.id] || 0;
        const budget = categoryBudgets[cat.id] || 0;
        
        const percent = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
        const displayPercent = budget > 0 ? Math.round((spent / budget) * 100) : 0;
        
        let barColor = 'var(--color-income)';
        if (percent >= 90) {
            barColor = 'var(--color-expense)';
        } else if (percent >= 70) {
            barColor = '#f97316';
        }

        const budgetDisplay = budget > 0 ? formatCurrency(budget) : 'Not Set';
        
        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.flexDirection = 'column';
        item.style.gap = '0.35rem';
        item.style.borderBottom = '1px solid rgba(255, 255, 255, 0.02)';
        item.style.paddingBottom = '0.65rem';

        item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem;">
                <span style="font-weight: 500;"><i class="fa-solid ${cat.icon}" style="color: ${cat.color}; margin-right: 0.5rem; width: 16px;"></i>${cat.name}</span>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="color: var(--text-secondary); font-size: 0.8rem; font-variant-numeric: tabular-nums;">
                        ${formatCurrency(spent)} / <span style="font-weight: 600; color: var(--text-primary);">${budgetDisplay}</span>
                    </span>
                    <button class="edit-cat-budget-btn" data-id="${cat.id}" data-name="${cat.name}" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 0.25rem 0.5rem; font-size: 0.75rem; color: var(--text-primary); cursor: pointer; display: inline-flex; align-items: center; gap: 0.25rem; transition: background 0.2s;" title="Edit Category Budget">
                        <i class="fa-solid fa-pen" style="font-size: 0.7rem;"></i> Set Budget
                    </button>
                </div>
            </div>
            <div style="background: rgba(255,255,255,0.06); height: 5px; border-radius: 2.5px; overflow: hidden; width: 100%;">
                <div style="width: ${percent}%; height: 100%; background: ${barColor}; transition: width 0.3s ease;"></div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--text-muted);">
                <span>Usage status</span>
                <span style="font-weight: 600; color: ${percent >= 90 ? 'var(--color-expense)' : percent >= 70 ? '#f97316' : 'var(--text-secondary)'};">
                    ${budget > 0 ? `${displayPercent}% used` : 'No budget set'}
                </span>
            </div>
        `;
        categoryBudgetsList.appendChild(item);
    });
}

// Render SVG Donut Chart
function renderCharts(periodTransactions) {
    donutSegmentsGroup.innerHTML = '';

    const expenses = periodTransactions.filter(t => t.type === 'expense');
    const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);

    chartCenterAmount.textContent = formatCurrency(totalExpense);

    if (totalExpense === 0) {
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
    renderCategoryBudgets(periodTransactions);
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

    // Category Budgets Editing Delegation
    categoryBudgetsList.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-cat-budget-btn');
        if (!editBtn) return;

        const catId = editBtn.getAttribute('data-id');
        const catName = editBtn.getAttribute('data-name');
        const currentBudget = categoryBudgets[catId] || 0;

        const newBudgetStr = prompt(`Enter monthly budget for "${catName}" (KRW):`, currentBudget);
        if (newBudgetStr !== null) {
            const newBudget = parseInt(newBudgetStr, 10);
            if (!isNaN(newBudget) && newBudget >= 0) {
                categoryBudgets[catId] = newBudget;
                saveCategoryBudgetsToLocalStorage();
                render();
            } else if (newBudgetStr.trim() === '') {
                // Clear budget if empty
                categoryBudgets[catId] = 0;
                saveCategoryBudgetsToLocalStorage();
                render();
            }
        }
    });

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
