// --- Firebase Configuration ---
// TO ENABLE REAL-TIME SYNC ACROSS DEVICES:
// Replace the values below with your Firebase project configuration.
const firebaseConfig = {
  apiKey: "AIzaSyAfMX0CTEXldZZvtxHXclsMsAFaNtELw5M",
  authDomain: "ledger-f9913.firebaseapp.com",
  projectId: "ledger-f9913",
  storageBucket: "ledger-f9913.firebasestorage.app",
  messagingSenderId: "328798030554",
  appId: "1:328798030554:web:a3ce5f2e2cc2718ed5f3e3",
  measurementId: "G-9KQZ7SDB6C"
};

// Initialize Firebase only if the user has replaced the default credentials
let db = null;
const isFirebaseConfigured = typeof firebase !== 'undefined' && firebaseConfig.apiKey !== "YOUR_API_KEY";

if (isFirebaseConfigured) {
    try {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        console.log("Firebase Firestore initialized successfully.");
    } catch (e) {
        console.error("Failed to initialize Firebase:", e);
    }
} else {
    console.log("Firebase is not configured. Running in Local Storage offline mode.");
}

// --- Configuration & Constants ---
const DEFAULT_CATEGORIES = {
    income: [
        { id: 'salary', name: 'Salary', icon: 'fa-money-bill-wave', color: '#10b981' },
        { id: 'side-hustle', name: 'Side Hustle', icon: 'fa-laptop-code', color: '#34d399' },
        { id: 'allowance', name: 'Allowance', icon: 'fa-piggy-bank', color: '#6ee7b7' },
        { id: 'income-etc', name: 'Miscellaneous', icon: 'fa-coins', color: '#a7f3d0' }
    ],
    expense: [
        { id: 'auto', name: 'Auto', icon: 'fa-car', color: '#3b82f6' },
        { id: 'boys', name: 'Boys', icon: 'fa-child', color: '#f43f5e' },
        { id: 'groceries', name: 'Groceries', icon: 'fa-basket-shopping', color: '#10b981' },
        { id: 'medical', name: 'Medical', icon: 'fa-kit-medical', color: '#06b6d4' },
        { id: 'restaurants', name: 'Restaurants', icon: 'fa-utensils', color: '#ef4444' },
        { id: 'travel', name: 'Travel', icon: 'fa-plane', color: '#8b5cf6' },
        { id: 'insurance', name: 'Insurance', icon: 'fa-shield-halved', color: '#14b8a6' },
        { id: 'mortgage', name: 'Mortgage', icon: 'fa-landmark', color: '#eab308' },
        { id: 'utilities', name: 'Utilities', icon: 'fa-bolt', color: '#f97316' },
        { id: 'reserve', name: 'Reserve', icon: 'fa-piggy-bank', color: '#ec4899' },
        { id: 'miscellaneous', name: 'Miscellaneous', icon: 'fa-receipt', color: '#64748b' }
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
let currentView = 'monthly'; // 'monthly' or 'yearly'

// --- DOM Elements ---
const prevMonthBtn = document.getElementById('prev-month-btn');
const nextMonthBtn = document.getElementById('next-month-btn');
const currentPeriodText = document.getElementById('current-period-text');

const monthlyViewBtn = document.getElementById('monthly-view-btn');
const yearlyViewBtn = document.getElementById('yearly-view-btn');
const monthlyLayout = document.getElementById('monthly-layout');
const yearlyLayout = document.getElementById('yearly-layout');
const yearlyGrid = document.getElementById('yearly-grid');

const incomeLabel = document.getElementById('income-label');
const expenseLabel = document.getElementById('expense-label');
const balanceLabel = document.getElementById('balance-label');

const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const netBalanceEl = document.getElementById('net-balance');

// Budget Elements
const categoryBudgetsList = document.getElementById('category-budgets-list');
const yearlyCategoryList = document.getElementById('yearly-category-list');

const transactionForm = document.getElementById('transaction-form');
const typeExpenseRadio = document.getElementById('type-expense');
const typeIncomeRadio = document.getElementById('type-income');
const dateInput = document.getElementById('transaction-date');
const categorySelect = document.getElementById('transaction-category');
const amountInput = document.getElementById('transaction-amount');
const descInput = document.getElementById('transaction-desc');

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

// Load data (Initial fetch & subscription)
function loadData() {
    if (isFirebaseConfigured && db) {
        // 1. Subscribe to Firestore transactions collection (real-time sync)
        db.collection("transactions").onSnapshot((snapshot) => {
            transactions = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                transactions.push({
                    id: doc.id, // Use Firestore doc ID
                    type: data.type,
                    date: new Date(data.date),
                    category: data.category,
                    amount: data.amount,
                    desc: data.desc
                });
            });
            render();
        }, (error) => {
            console.error("Firestore transactions subscription failed:", error);
            alert("Database subscription error. Check if Firestore rules are in Test Mode.");
        });

        // 2. Subscribe to Category budgets setting document
        db.collection("settings").doc("budgets").onSnapshot((doc) => {
            if (doc.exists) {
                categoryBudgets = doc.data();
            } else {
                // Initialize default budgets in Firestore
                categoryBudgets = {
                    auto: 250000,
                    boys: 300000,
                    groceries: 600000,
                    medical: 150000,
                    restaurants: 400000,
                    travel: 300000,
                    insurance: 200000,
                    mortgage: 800000,
                    utilities: 250000,
                    reserve: 200000,
                    miscellaneous: 150000
                };
                db.collection("settings").doc("budgets").set(categoryBudgets);
            }
            render();
        }, (error) => {
            console.error("Firestore budgets subscription failed:", error);
        });

    } else {
        // Fallback: LocalStorage Mode
        loadLocalStorageOnly();
    }
}

// LocalStorage Fallback loaders
function loadLocalStorageOnly() {
    const data = localStorage.getItem('visual_ledger_transactions_v4');
    if (data) {
        try {
            transactions = JSON.parse(data).map(item => ({
                ...item,
                date: new Date(item.date)
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
            { id: 'seed-3', type: 'expense', date: new Date(today.getFullYear(), today.getMonth(), 2), category: 'mortgage', amount: 450000, desc: 'Monthly Studio Rent' },
            { id: 'seed-4', type: 'expense', date: new Date(today.getFullYear(), today.getMonth(), 3), category: 'groceries', amount: 120000, desc: 'Weekly Grocery Shopping' },
            { id: 'seed-5', type: 'expense', date: new Date(today.getFullYear(), today.getMonth(), 5), category: 'auto', amount: 45000, desc: 'Gasoline Refuel' },
            { id: 'seed-6', type: 'expense', date: new Date(today.getFullYear(), today.getMonth(), 6), category: 'miscellaneous', amount: 95000, desc: 'Running Shoes' },
            { id: 'seed-7', type: 'expense', date: new Date(today.getFullYear(), today.getMonth(), 8), category: 'restaurants', amount: 85000, desc: 'Dinner with Team' },
            { id: 'seed-8', type: 'expense', date: new Date(today.getFullYear(), today.getMonth(), 10), category: 'travel', amount: 280000, desc: 'Weekend Hotel Booking' },
            { id: 'seed-9', type: 'expense', date: new Date(today.getFullYear(), today.getMonth(), 12), category: 'medical', amount: 12000, desc: 'Cold Medicine' },
            { id: 'seed-10', type: 'expense', date: new Date(today.getFullYear(), today.getMonth(), 14), category: 'utilities', amount: 55000, desc: 'Internet & Electricity' }
        ];
        saveLocalStorageOnly();
    }

    const savedCatBudgets = localStorage.getItem('visual_ledger_category_budgets');
    if (savedCatBudgets) {
        try {
            categoryBudgets = JSON.parse(savedCatBudgets);
        } catch (e) {
            console.error('Failed to parse category budgets.', e);
            categoryBudgets = {};
        }
    } else {
        categoryBudgets = {
            auto: 250000,
            boys: 300000,
            groceries: 600000,
            medical: 150000,
            restaurants: 400000,
            travel: 300000,
            insurance: 200000,
            mortgage: 800000,
            utilities: 250000,
            reserve: 200000,
            miscellaneous: 150000
        };
        saveCategoryBudgetsToLocalStorageOnly();
    }
}

// LocalStorage Writers
function saveLocalStorageOnly() {
    localStorage.setItem('visual_ledger_transactions_v4', JSON.stringify(transactions));
}

function saveCategoryBudgetsToLocalStorageOnly() {
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

// Render Yearly View (12 Months aggregate & cards)
function renderYearlyView() {
    yearlyGrid.innerHTML = '';
    
    const year = currentPeriod.getFullYear();
    
    // Filter transactions for the entire year
    const yearTransactions = transactions.filter(t => t.date.getFullYear() === year);
    
    // 1. Update Annual Dashboard Stats
    let annualIncome = 0;
    let annualExpense = 0;
    yearTransactions.forEach(t => {
        if (t.type === 'income') {
            annualIncome += t.amount;
        } else {
            annualExpense += t.amount;
        }
    });
    
    totalIncomeEl.textContent = formatCurrency(annualIncome);
    totalExpenseEl.textContent = formatCurrency(annualExpense);
    const annualBalance = annualIncome - annualExpense;
    netBalanceEl.textContent = formatCurrency(annualBalance);
    
    if (annualBalance < 0) {
        netBalanceEl.style.color = 'var(--color-expense)';
    } else if (annualBalance > 0) {
        netBalanceEl.style.color = 'var(--color-income)';
    } else {
        netBalanceEl.style.color = 'var(--text-primary)';
    }
    
    // 2. Total Monthly Budget (Sum of category budgets)
    const monthlyTotalBudget = Object.values(categoryBudgets).reduce((sum, val) => sum + val, 0);
    
    // 3. Render 12 months
    for (let m = 0; m < 12; m++) {
        const monthTransactions = yearTransactions.filter(t => t.date.getMonth() === m);
        let mIncome = 0;
        let mExpense = 0;
        monthTransactions.forEach(t => {
            if (t.type === 'income') {
                mIncome += t.amount;
            } else {
                mExpense += t.amount;
            }
        });
        
        const budgetPercent = monthlyTotalBudget > 0 ? Math.min((mExpense / monthlyTotalBudget) * 100, 100) : 0;
        const displayPercent = monthlyTotalBudget > 0 ? Math.round((mExpense / monthlyTotalBudget) * 100) : 0;
        
        // Status Badge class/text
        let statusText = 'Normal';
        let badgeClass = 'month-status-normal';
        if (monthlyTotalBudget > 0) {
            if (displayPercent >= 100) {
                statusText = 'Over Budget';
                badgeClass = 'month-status-danger';
            } else if (displayPercent >= 80) {
                statusText = 'Warning';
                badgeClass = 'month-status-warning';
            }
        } else {
            statusText = 'No Budget';
            badgeClass = 'month-status-normal';
        }
        
        let barColor = 'var(--color-income)';
        if (budgetPercent >= 100) {
            barColor = 'var(--color-expense)';
        } else if (budgetPercent >= 80) {
            barColor = '#f97316';
        }
        
        const mBalance = mIncome - mExpense;
        const mBalanceClass = mBalance > 0 ? 'income-val' : mBalance < 0 ? 'expense-val' : '';
        
        const card = document.createElement('div');
        card.className = 'month-card';
        card.innerHTML = `
            <div class="month-card-header">
                <span class="month-card-title">${MONTH_NAMES[m]}</span>
                <span class="month-status-badge ${badgeClass}">${statusText}</span>
            </div>
            <div class="month-stats-grid">
                <div class="month-stat-item">
                    <span class="month-stat-label">Income</span>
                    <span class="month-stat-value income-val">${formatCurrency(mIncome)}</span>
                </div>
                <div class="month-stat-item">
                    <span class="month-stat-label">Expense</span>
                    <span class="month-stat-value expense-val">${formatCurrency(mExpense)}</span>
                </div>
                <div class="month-stat-item" style="grid-column: span 2; border-top: 1px solid rgba(255,255,255,0.03); padding-top: 0.5rem; display: flex; flex-direction: row; justify-content: space-between;">
                    <span class="month-stat-label">Net Balance</span>
                    <span class="month-stat-value balance-val ${mBalanceClass}">${mBalance >= 0 ? '+' : ''}${formatCurrency(mBalance)}</span>
                </div>
            </div>
            <div class="month-budget-progress-section">
                <div class="month-budget-text-row">
                    <span>Budget Usage</span>
                    <span>${monthlyTotalBudget > 0 ? `${displayPercent}%` : 'Not Set'}</span>
                </div>
                <div class="month-budget-bar-bg">
                    <div class="month-budget-bar-fill" style="width: ${budgetPercent}%; background-color: ${barColor};"></div>
                </div>
                <div class="month-budget-text-row" style="font-size: 0.65rem; margin-top: 0.1rem;">
                    <span>${formatCurrency(mExpense)} spent</span>
                    <span>Budget: ${monthlyTotalBudget > 0 ? formatCurrency(monthlyTotalBudget) : '₩0'}</span>
                </div>
            </div>
        `;
        
        card.addEventListener('click', () => {
            currentPeriod.setMonth(m);
            currentView = 'monthly';
            // Update button states
            monthlyViewBtn.classList.add('active');
            yearlyViewBtn.classList.remove('active');
            render();
        });
        
        yearlyGrid.appendChild(card);
    }

    // 4. Render Yearly Category Budgets Summary
    yearlyCategoryList.innerHTML = '';
    
    // Group expenses by category for the whole year
    const yearlyCategoryTotals = {};
    const yearExpenses = yearTransactions.filter(t => t.type === 'expense');
    yearExpenses.forEach(t => {
        yearlyCategoryTotals[t.category] = (yearlyCategoryTotals[t.category] || 0) + t.amount;
    });

    DEFAULT_CATEGORIES.expense.forEach(cat => {
        const spent = yearlyCategoryTotals[cat.id] || 0;
        // Annual budget = monthly budget * 12
        const monthlyBudget = categoryBudgets[cat.id] || 0;
        const annualBudget = monthlyBudget * 12;
        
        const percent = annualBudget > 0 ? Math.min((spent / annualBudget) * 100, 100) : 0;
        const displayPercent = annualBudget > 0 ? Math.round((spent / annualBudget) * 100) : 0;
        
        let barColor = 'var(--color-income)';
        if (percent >= 90) {
            barColor = 'var(--color-expense)';
        } else if (percent >= 70) {
            barColor = '#f97316';
        }

        const budgetDisplay = annualBudget > 0 ? formatCurrency(annualBudget) : 'Not Set';
        
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
                    <button class="edit-cat-budget-btn" data-id="${cat.id}" data-name="${cat.name}" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 0.25rem 0.5rem; font-size: 0.75rem; color: var(--text-primary); cursor: pointer; display: inline-flex; align-items: center; gap: 0.25rem; transition: background 0.2s;" title="Edit Category Budget (Monthly)">
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
                    ${annualBudget > 0 ? `${displayPercent}% used` : 'No budget set'}
                </span>
            </div>
        `;
        yearlyCategoryList.appendChild(item);
    });
}

// Master Render function
function render() {
    const year = currentPeriod.getFullYear();
    
    if (currentView === 'monthly') {
        // Toggle layout visibility
        monthlyLayout.style.display = 'grid';
        yearlyLayout.style.display = 'none';
        
        // Update Period Header
        const monthName = MONTH_NAMES[currentPeriod.getMonth()];
        currentPeriodText.textContent = `${monthName} ${year}`;
        
        // Update Labels
        incomeLabel.textContent = 'Monthly Income';
        expenseLabel.textContent = 'Monthly Expense';
        balanceLabel.textContent = 'Net Balance';
        
        // Filter transactions for the current month
        const periodTransactions = getFilteredTransactions();
        
        // Update dashboard & list
        updateDashboard(periodTransactions);
        renderCategoryBudgets(periodTransactions);
        renderHistoryTable(periodTransactions);
    } else {
        // Toggle layout visibility
        monthlyLayout.style.display = 'none';
        yearlyLayout.style.display = 'block';
        
        // Update Period Header (Year only)
        currentPeriodText.textContent = `${year}`;
        
        // Update Labels
        incomeLabel.textContent = 'Annual Income';
        expenseLabel.textContent = 'Annual Expense';
        balanceLabel.textContent = 'Annual Balance';
        
        // Render Yearly View (which handles dashboard updates and the 12 month cards)
        renderYearlyView();
    }
}

// --- Event Handlers & Setup ---

// Setup event listeners
function setupEventListeners() {
    // Month navigation
    prevMonthBtn.addEventListener('click', () => {
        if (currentView === 'yearly') {
            currentPeriod.setFullYear(currentPeriod.getFullYear() - 1);
        } else {
            currentPeriod.setMonth(currentPeriod.getMonth() - 1);
        }
        render();
    });

    nextMonthBtn.addEventListener('click', () => {
        if (currentView === 'yearly') {
            currentPeriod.setFullYear(currentPeriod.getFullYear() + 1);
        } else {
            currentPeriod.setMonth(currentPeriod.getMonth() + 1);
        }
        render();
    });

    // View switcher toggles
    monthlyViewBtn.addEventListener('click', () => {
        currentView = 'monthly';
        monthlyViewBtn.classList.add('active');
        yearlyViewBtn.classList.remove('active');
        render();
    });

    yearlyViewBtn.addEventListener('click', () => {
        currentView = 'yearly';
        yearlyViewBtn.classList.add('active');
        monthlyViewBtn.classList.remove('active');
        render();
    });

    // Toggle categories based on transaction type selector
    typeExpenseRadio.addEventListener('change', populateCategories);
    typeIncomeRadio.addEventListener('change', populateCategories);

    // Search and Filter updates
    searchInput.addEventListener('input', render);
    filterTypeSelect.addEventListener('change', render);

    function handleBudgetEdit(catId, catName) {
        const currentBudget = categoryBudgets[catId] || 0;
        const newBudgetStr = prompt(`Enter monthly budget for "${catName}" (KRW):`, currentBudget);
        if (newBudgetStr !== null) {
            const newBudget = parseInt(newBudgetStr, 10);
            if (!isNaN(newBudget) && newBudget >= 0) {
                categoryBudgets[catId] = newBudget;
                
                if (isFirebaseConfigured && db) {
                    db.collection("settings").doc("budgets").set(categoryBudgets)
                        .catch(err => console.error("Failed to save budget in Firestore:", err));
                } else {
                    saveCategoryBudgetsToLocalStorageOnly();
                    render();
                }
            } else if (newBudgetStr.trim() === '') {
                // Clear budget if empty
                categoryBudgets[catId] = 0;
                
                if (isFirebaseConfigured && db) {
                    db.collection("settings").doc("budgets").set(categoryBudgets)
                        .catch(err => console.error("Failed to save budget in Firestore:", err));
                } else {
                    saveCategoryBudgetsToLocalStorageOnly();
                    render();
                }
            }
        }
    }

    // Category Budgets Editing Delegation (Monthly View)
    categoryBudgetsList.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-cat-budget-btn');
        if (!editBtn) return;
        handleBudgetEdit(editBtn.getAttribute('data-id'), editBtn.getAttribute('data-name'));
    });

    // Category Budgets Editing Delegation (Yearly View)
    yearlyCategoryList.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-cat-budget-btn');
        if (!editBtn) return;
        handleBudgetEdit(editBtn.getAttribute('data-id'), editBtn.getAttribute('data-name'));
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

        const dateObj = new Date(dateStr);

        if (isFirebaseConfigured && db) {
            // Write to Firestore (will automatically trigger onSnapshot and render)
            db.collection("transactions").add({
                type,
                date: dateStr, // Save as ISO string for simple cross-device date handling
                category,
                amount,
                desc
            }).then(() => {
                amountInput.value = '';
                descInput.value = '';
            }).catch((err) => {
                console.error("Failed to add transaction in Firestore:", err);
                alert("Failed to save to cloud: " + err.message);
            });
        } else {
            // Offline fallback
            const newTransaction = {
                id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                type,
                date: dateObj,
                category,
                amount,
                desc
            };
            transactions.push(newTransaction);
            saveLocalStorageOnly();
            amountInput.value = '';
            descInput.value = '';
            render();
        }
    });

    // Delete transaction handler
    transactionListBody.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-btn');
        if (!deleteBtn) return;

        const id = deleteBtn.getAttribute('data-id');
        if (confirm('Are you sure you want to delete this transaction record?')) {
            if (isFirebaseConfigured && db) {
                db.collection("transactions").doc(id).delete()
                    .catch((err) => {
                        console.error("Failed to delete transaction in Firestore:", err);
                        alert("Failed to delete from cloud: " + err.message);
                    });
            } else {
                transactions = transactions.filter(t => t.id !== id);
                saveLocalStorageOnly();
                render();
            }
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

    loadLocalStorageOnly();
    populateCategories();
    setupEventListeners();
    loadData(); // Load real-time Firestore sync or Offline Fallback
}

// Start the application
document.addEventListener('DOMContentLoaded', init);
