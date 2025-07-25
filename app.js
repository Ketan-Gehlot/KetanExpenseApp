// ExpenseTracker Pro – Pure client-side expense manager with localStorage persistence
class ExpenseManager {
  constructor() {
    this.expenses = [];
    this.filteredExpenses = [];
    this.categories = [
      'Food & Dining', 'Transportation', 'Bills & Utilities', 'Shopping',
      'Entertainment', 'Health & Fitness', 'Travel', 'Other'
    ];
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.currentSort = 'date-desc';
    this.editingExpense = null;
    this.monthlyChart = null;
    this.categoryChart = null;
    this.chartColors = ['#1FB8CD','#FFC185','#B4413C','#ECEBD5','#5D878F','#DB4545','#D2BA4C','#964325','#944454','#13343B'];
    this.init();
  }

  init() {
    this.applyPreferredTheme();
    this.bindEvents();
    this.initializeFilters();
    this.loadExpensesFromStorage();
    this.showLoading();
    setTimeout(() => {
      this.hideLoading();
      this.refreshAll();
    }, 600);
  }

  loadExpensesFromStorage() {
    const stored = localStorage.getItem('expenses');
    this.expenses = stored ? JSON.parse(stored) : [];
  }

  saveExpensesToStorage() {
    localStorage.setItem('expenses', JSON.stringify(this.expenses));
  }

  handleExpenseSubmit(e) {
    e.preventDefault();
    const descInput = document.querySelector('#expenseDescription');
    const amountInput = document.querySelector('#expenseAmount');
    const categoryInput = document.querySelector('#expenseCategory');
    const dateInput = document.querySelector('#expenseDate');
    const locationInput = document.querySelector('#expenseLocation');

    const data = {
      description: descInput.value.trim(),
      amount: parseFloat(amountInput.value),
      category: categoryInput.value,
      date: dateInput.value,
      location: locationInput.value.trim()
    };

    if (this.editingExpense) {
      Object.assign(this.editingExpense, data);
      this.editingExpense = null;
    } else {
      const newId = this.expenses.length ? Math.max(...this.expenses.map(e => e.id)) + 1 : 1;
      this.expenses.unshift({ id: newId, ...data });
    }

    this.saveExpensesToStorage();
    this.hideExpenseModal();
    this.refreshAll();
  }

  showExpenseModal() {
    document.querySelector('#expenseModal').classList.add('active');
  }

  hideExpenseModal() {
    document.querySelector('#expenseModal').classList.remove('active');
    document.querySelector('#expenseForm').reset();
  }

  bindEvents() {
    document.querySelector('#addExpenseBtn')?.addEventListener('click', () => this.showExpenseModal());
    document.querySelector('#fabAddExpense')?.addEventListener('click', () => this.showExpenseModal());
    document.querySelector('#closeModal')?.addEventListener('click', () => this.hideExpenseModal());
    document.querySelector('#cancelBtn')?.addEventListener('click', () => this.hideExpenseModal());
    document.querySelector('#expenseForm')?.addEventListener('submit', e => this.handleExpenseSubmit(e));
  }

  refreshAll() {
    this.renderTable();
    this.renderCharts();
  }

  renderTable() {
    const tbody = document.querySelector('#expensesTableBody');
    tbody.innerHTML = '';
    this.expenses.forEach(exp => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${exp.date}</td>
        <td>${exp.description}</td>
        <td>${exp.category}</td>
        <td>${exp.location}</td>
        <td class="text-right">₹${exp.amount.toFixed(2)}</td>
        <td><button class="btn btn--outline btn--sm" onclick="expenseApp.deleteExpense(${exp.id})">Delete</button></td>
      `;
      tbody.appendChild(tr);
    });
  }

  renderCharts() {
    // Placeholder for charts (implement if needed)
  }

  deleteExpense(id) {
    this.expenses = this.expenses.filter(exp => exp.id !== id);
    this.saveExpensesToStorage();
    this.refreshAll();
  }

  showLoading() {
    document.querySelector('#loadingState')?.classList.remove('hidden');
  }

  hideLoading() {
    document.querySelector('#loadingState')?.classList.add('hidden');
  }

  applyPreferredTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    document.body.setAttribute('data-theme', theme);
  }

  initializeFilters() {
    // Add filter logic here if needed later
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.expenseApp = new ExpenseManager();
});
