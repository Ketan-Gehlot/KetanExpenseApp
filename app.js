// ExpenseTracker Pro – Pure client-side expense manager
class ExpenseManager {
  constructor() {
    // Runtime state
    this.expenses = []; // array of {id, description, amount, category, date, location?}
    this.filteredExpenses = [];
    this.categories = [
      'Food & Dining',
      'Transportation',
      'Bills & Utilities',
      'Shopping',
      'Entertainment',
      'Health & Fitness',
      'Travel',
      'Other'
    ];

    // Props for pagination & sorting
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.currentSort = 'date-desc';

    // Refs for editing state
    this.editingExpense = null;

    // Chart instances
    this.monthlyChart = null;
    this.categoryChart = null;

    // Pre-defined palette (consistent with guidelines)
    this.chartColors = [
      '#1FB8CD',
      '#FFC185',
      '#B4413C',
      '#ECEBD5',
      '#5D878F',
      '#DB4545',
      '#D2BA4C',
      '#964325',
      '#944454',
      '#13343B'
    ];

    this.init();
  }

  /**
   * Loads expenses from local storage.
   * @returns {void}
   */
  loadExpensesFromStorage() {
    const stored = localStorage.getItem('expenses');
    this.expenses = stored ? JSON.parse(stored) : [];
  }

  /**
   * Saves expenses to local storage.
   * @returns {void}
   */
  saveExpensesToStorage() {
    localStorage.setItem('expenses', JSON.stringify(this.expenses));
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /* Init & theming                                                          */
  /* ──────────────────────────────────────────────────────────────────────── */
  init() {
    this.applyPreferredTheme();
    this.bindEvents();
    this.initializeFilters();
    this.loadExpensesFromStorage(); // Load saved expenses on initialization

    // Simulate fetch delay
    this.showLoading();
    setTimeout(() => {
      this.hideLoading();
      this.refreshAll(); // Refresh all components after loading expenses
    }, 600);
  }

  /**
   * Applies the preferred theme (dark/light) based on local storage or system preference.
   * @returns {void}
   */
  applyPreferredTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    document.body.setAttribute('data-theme', initialTheme);
    document.documentElement.setAttribute('data-color-scheme', initialTheme);
    this.updateThemeIcon(initialTheme);
  }

  /**
   * Toggles between dark and light themes.
   * @returns {void}
   */
  toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    const next = currentTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', next);
    document.documentElement.setAttribute('data-color-scheme', next);
    localStorage.setItem('theme', next);
    this.updateThemeIcon(next);
    this.showNotification('Theme switched!', 'info');
    setTimeout(() => this.refreshCharts(), 250);
  }

  /**
   * Updates the theme toggle icon based on the current theme.
   * @param {string} theme - The current theme ('dark' or 'light').
   * @returns {void}
   */
  updateThemeIcon(theme) {
    const icon = document.querySelector('#themeToggle i');
    if (!icon) return;
    icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /* Event binding                                                           */
  /* ──────────────────────────────────────────────────────────────────────── */
  /**
   * Binds all necessary event listeners to DOM elements.
   * @returns {void}
   */
  bindEvents() {
    // Wait for DOM to be fully ready
    this.waitForElements([
      '#themeToggle', '#addExpenseBtn', '#exportBtn', '#fabAddExpense',
      '#sidebarToggle', '#sidebarOverlay', '#resetDataBtn',
      '#expenseForm', '#closeModal', '#cancelBtn', '#previewBtn',
      '#searchInput', '#dateFrom', '#dateTo', '#minAmount', '#maxAmount', '#resetFilters',
      '#sortBy', '#prevPage', '#nextPage', '#closePreview', '#exportJSON', '#exportCSV',
      '#confirmCancel', '#confirmAction'
    ]).then(() => {
      // Header buttons
      this.addSafeEventListener('#themeToggle', 'click', () => this.toggleTheme());
      this.addSafeEventListener('#addExpenseBtn', 'click', () => this.showExpenseModal());
      this.addSafeEventListener('#exportBtn', 'click', () => this.showPreviewModal());
      this.addSafeEventListener('#previewBtn', 'click', () => this.showPreviewModal());

      // FAB button (mobile)
      this.addSafeEventListener('#fabAddExpense', 'click', () => this.showExpenseModal());

      // Sidebar toggling (mobile)
      this.addSafeEventListener('#sidebarToggle', 'click', () => this.toggleSidebar());
      this.addSafeEventListener('#sidebarOverlay', 'click', () => this.closeSidebar());

      // Filter controls
      this.addSafeEventListener('#searchInput', 'input', () => this.applyFilters());
      this.addSafeEventListener('#dateFrom', 'change', () => this.applyFilters());
      this.addSafeEventListener('#dateTo', 'change', () => this.applyFilters());
      this.addSafeEventListener('#minAmount', 'input', () => this.updateAmountRange());
      this.addSafeEventListener('#maxAmount', 'input', () => this.updateAmountRange());
      this.addSafeEventListener('#resetFilters', 'click', () => this.resetFilters());

      // Sorting & pagination
      this.addSafeEventListener('#sortBy', 'change', e => {
        this.currentSort = e.target.value;
        this.currentPage = 1;
        this.refreshTable();
      });
      this.addSafeEventListener('#prevPage', 'click', () => this.changePage(-1));
      this.addSafeEventListener('#nextPage', 'click', () => this.changePage(1));

      // Expense form modal
      this.addSafeEventListener('#closeModal', 'click', () => this.hideExpenseModal());
      this.addSafeEventListener('#cancelBtn', 'click', () => this.hideExpenseModal());
      this.addSafeEventListener('#expenseForm', 'submit', e => this.handleExpenseSubmit(e));

      // Reset data
      this.addSafeEventListener('#resetDataBtn', 'click', () => this.confirmReset());

      // Preview modal tabs & actions
      this.addSafeEventListener('#closePreview', 'click', () => this.hidePreviewModal());

      // Tab buttons
      document.querySelectorAll('.tab-btn').forEach(btn =>
        btn.addEventListener('click', e => this.switchTab(e.target.dataset.tab))
      );

      this.addSafeEventListener('#exportJSON', 'click', () => this.exportData('json'));
      this.addSafeEventListener('#exportCSV', 'click', () => this.exportData('csv'));

      // Confirmation modal controls
      this.addSafeEventListener('#confirmCancel', 'click', () => this.hideConfirmModal());
      // The confirmAction button's event listener is set dynamically in showConfirmation

      // Live preview updates
      ['expenseDescription', 'expenseAmount', 'expenseCategory', 'expenseDate', 'expenseLocation'].forEach(id =>
        this.addSafeEventListener(`#${id}`, 'input', () => this.updateFormPreview())
      );

      // Close overlay when clicking outside modal content
      document.addEventListener('click', e => {
        if (e.target.classList.contains('modal-overlay')) {
          e.target.classList.remove('active');
          document.body.style.overflow = '';
        }
      });

      // Collapse sidebar on resize (if returning to desktop)
      window.addEventListener('resize', () => {
        if (window.innerWidth > 768) this.closeSidebar();
      });
    });
  }

  /**
   * Helper to wait for elements to exist in the DOM.
   * @param {string[]} selectors - An array of CSS selectors.
   * @returns {Promise<Element[]>} A promise that resolves with an array of found elements.
   */
  waitForElements(selectors) {
    return new Promise((resolve) => {
      const checkElements = () => {
        const elements = selectors.map(sel => document.querySelector(sel));
        if (elements.every(el => el !== null)) {
          resolve(elements);
        } else {
          setTimeout(checkElements, 50);
        }
      };
      checkElements();
    });
  }

  /**
   * Helper to safely add event listeners to elements.
   * @param {string} selector - The CSS selector for the element.
   * @param {string} event - The event type (e.g., 'click', 'input').
   * @param {function} handler - The event handler function.
   * @returns {void}
   */
  addSafeEventListener(selector, event, handler) {
    const element = document.querySelector(selector);
    if (element) {
      element.addEventListener(event, handler);
    } else {
      console.warn(`Element not found: ${selector}`);
    }
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /* Helper (DOM)                                                            */
  /* ──────────────────────────────────────────────────────────────────────── */
  /**
   * Shorthand for document.querySelector.
   * @param {string} selector - The CSS selector.
   * @returns {Element | null} The first element matching the selector, or null.
   */
  $(selector) {
    return document.querySelector(selector);
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /* Loading State                                                           */
  /* ──────────────────────────────────────────────────────────────────────── */
  /**
   * Shows the loading state and hides the dashboard content.
   * @returns {void}
   */
  showLoading() {
    const loading = this.$('#loadingState');
    const content = this.$('#dashboardContent');
    if (loading) loading.classList.remove('hidden');
    if (content) content.classList.add('hidden');
  }

  /**
   * Hides the loading state and shows the dashboard content.
   * @returns {void}
   */
  hideLoading() {
    const loading = this.$('#loadingState');
    const content = this.$('#dashboardContent');
    if (loading) loading.classList.add('hidden');
    if (content) content.classList.remove('hidden');
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /* Sidebar (mobile)                                                        */
  /* ──────────────────────────────────────────────────────────────────────── */
  /**
   * Toggles the visibility of the sidebar and its overlay.
   * @returns {void}
   */
  toggleSidebar() {
    const sidebar = this.$('#sidebar');
    const overlay = this.$('#sidebarOverlay');
    if (!sidebar || !overlay) return;

    const open = sidebar.classList.toggle('open');
    overlay.classList.toggle('active', open);
    document.body.style.overflow = open ? 'hidden' : '';
  }

  /**
   * Closes the sidebar and its overlay.
   * @returns {void}
   */
  closeSidebar() {
    const sidebar = this.$('#sidebar');
    const overlay = this.$('#sidebarOverlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /* Filters                                                                 */
  /* ──────────────────────────────────────────────────────────────────────── */
  /**
   * Initializes the filter controls, including date range and category checkboxes.
   * @returns {void}
   */
  initializeFilters() {
    // Init date range to current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const dateFrom = this.$('#dateFrom');
    const dateTo = this.$('#dateTo');
    if (dateFrom) dateFrom.value = firstDay;
    if (dateTo) dateTo.value = lastDay;

    // Categories checkboxes
    const catContainer = this.$('#categoryFilters');
    if (!catContainer) return;

    catContainer.innerHTML = '';
    this.categories.forEach(cat => {
      const id = `cat-${cat.replace(/\s+/g, '-').toLowerCase()}`;
      const div = document.createElement('div');
      div.className = 'category-checkbox';
      div.innerHTML = `<input type="checkbox" id="${id}" value="${cat}" checked><label for="${id}">${cat}</label>`;
      div.querySelector('input').addEventListener('change', () => this.applyFilters());
      catContainer.appendChild(div);
    });

    // Amount sliders defaults
    const minAmount = this.$('#minAmount');
    const maxAmount = this.$('#maxAmount');
    if (minAmount) minAmount.value = 0;
    if (maxAmount) maxAmount.value = 1000000;
    this.updateAmountDisplay();
  }

  /**
   * Resets all filter controls to their default values and re-applies filters.
   * @returns {void}
   */
  resetFilters() {
    const searchInput = this.$('#searchInput');
    if (searchInput) searchInput.value = '';
    this.initializeFilters();
    this.applyFilters(); // Apply filters after resetting, no need to load from storage again here
    this.showNotification('Filters reset.', 'info');
  }

  /**
   * Updates the amount range sliders and ensures min is not greater than max.
   * @returns {void}
   */
  updateAmountRange() {
    const minSlider = this.$('#minAmount');
    const maxSlider = this.$('#maxAmount');
    if (!minSlider || !maxSlider) return;

    const min = parseFloat(minSlider.value);
    const max = parseFloat(maxSlider.value);

    // Ensure consistency
    if (min > max) {
      minSlider.value = max;
    }
    this.updateAmountDisplay();
    this.applyFilters();
  }

  /**
   * Updates the displayed values for the amount range sliders.
   * @returns {void}
   */
  updateAmountDisplay() {
    const minAmount = this.$('#minAmount');
    const maxAmount = this.$('#maxAmount');
    const minDisplay = this.$('#minAmountDisplay');
    const maxDisplay = this.$('#maxAmountDisplay');

    if (minAmount && minDisplay) minDisplay.textContent = minAmount.value;
    if (maxAmount && maxDisplay) maxDisplay.textContent = maxAmount.value;
  }

  /**
   * Applies all active filters to the expenses and updates the displayed list.
   * @returns {void}
   */
  applyFilters() {
    const searchInput = this.$('#searchInput');
    const dateFrom = this.$('#dateFrom');
    const dateTo = this.$('#dateTo');
    const minAmount = this.$('#minAmount');
    const maxAmount = this.$('#maxAmount');
    const catContainer = this.$('#categoryFilters');

    const term = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const from = dateFrom ? new Date(dateFrom.value) : new Date(0);
    const to = dateTo ? new Date(dateTo.value) : new Date();
    // Set 'to' date to end of day to include expenses on the 'to' date
    if (dateTo && dateTo.value) {
      to.setHours(23, 59, 59, 999);
    }

    const minAmt = minAmount ? parseFloat(minAmount.value) : 0;
    const maxAmt = maxAmount ? parseFloat(maxAmount.value) : Infinity;
    const activeCats = catContainer ?
      Array.from(catContainer.querySelectorAll('input:checked')).map(cb => cb.value) :
      this.categories;

    this.filteredExpenses = this.expenses.filter(exp => {
      const d = new Date(exp.date);
      const matchesTerm = exp.description.toLowerCase().includes(term) ||
        (exp.location && exp.location.toLowerCase().includes(term));
      const matchesDate = d >= from && d <= to;
      const matchesAmt = exp.amount >= minAmt && exp.amount <= maxAmt;
      const matchesCat = activeCats.includes(exp.category);
      return matchesTerm && matchesDate && matchesAmt && matchesCat;
    });

    this.currentPage = 1;
    this.refreshAll();
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /* Expense CRUD                                                            */
  /* ──────────────────────────────────────────────────────────────────────── */
  /**
   * Shows the expense modal for adding a new expense or editing an existing one.
   * @param {object | null} expense - The expense object to edit, or null for a new expense.
   * @returns {void}
   */
  showExpenseModal(expense = null) {
    this.editingExpense = expense;
    const modal = this.$('#expenseModal');
    if (!modal) return;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    const title = this.$('#modalTitle');
    if (title) title.textContent = expense ? 'Edit Expense' : 'Add New Expense';

    const form = this.$('#expenseForm');
    if (!expense && form) {
      form.reset();
      const dateInput = this.$('#expenseDate');
      if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    } else if (expense) {
      const descInput = this.$('#expenseDescription');
      const amountInput = this.$('#expenseAmount');
      const categoryInput = this.$('#expenseCategory');
      const dateInput = this.$('#expenseDate');
      const locationInput = this.$('#expenseLocation');

      if (descInput) descInput.value = expense.description;
      if (amountInput) amountInput.value = expense.amount;
      if (categoryInput) categoryInput.value = expense.category;
      if (dateInput) dateInput.value = expense.date;
      if (locationInput) locationInput.value = expense.location || '';
    }
    this.updateFormPreview();
  }

  /**
   * Hides the expense modal.
   * @returns {void}
   */
  hideExpenseModal() {
    const modal = this.$('#expenseModal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
      this.editingExpense = null;
    }
  }

  /**
   * Handles the submission of the expense form (add or edit).
   * @param {Event} e - The submit event.
   * @returns {void}
   */
  handleExpenseSubmit(e) {
    e.preventDefault();

    const descInput = this.$('#expenseDescription');
    const amountInput = this.$('#expenseAmount');
    const categoryInput = this.$('#expenseCategory');
    const dateInput = this.$('#expenseDate');
    const locationInput = this.$('#expenseLocation');

    const data = {
      description: descInput ? descInput.value.trim() : '',
      amount: amountInput ? parseFloat(amountInput.value) : 0,
      category: categoryInput ? categoryInput.value : '',
      date: dateInput ? dateInput.value : '',
      location: locationInput ? locationInput.value.trim() : ''
    };

    if (this.editingExpense) {
      Object.assign(this.editingExpense, data);
      this.showNotification('Expense updated.', 'success');
    } else {
      const nextId = this.expenses.length > 0 ? (Math.max(...this.expenses.map(x => x.id))) + 1 : 1;
      this.expenses.unshift({ id: nextId, ...data });
      this.showNotification('Expense added.', 'success');
    }
    this.hideExpenseModal();
    this.saveExpensesToStorage(); // Save expenses after adding/updating
    this.applyFilters(); // Re-apply filters to update the displayed list
  }

  /**
   * Initiates the edit process for a specific expense.
   * @param {number} id - The ID of the expense to edit.
   * @returns {void}
   */
  editExpense(id) {
    const exp = this.expenses.find(e => e.id === id);
    if (exp) this.showExpenseModal(exp);
  }

  /**
   * Deletes a specific expense after confirmation.
   * @param {number} id - The ID of the expense to delete.
   * @returns {void}
   */
  deleteExpense(id) {
    this.showConfirmation('Delete Expense', 'This action cannot be undone – proceed?', () => {
      this.expenses = this.expenses.filter(e => e.id !== id);
      this.saveExpensesToStorage(); // Save expenses after deletion
      this.applyFilters();
      this.showNotification('Expense deleted.', 'success');
    });
  }

  /**
   * Confirms and resets all expense data.
   * @returns {void}
   */
  confirmReset() {
    this.showConfirmation('Reset All Data', 'Permanently delete all expenses?', () => {
      this.expenses = [];
      this.saveExpensesToStorage(); // Save empty array after clearing all
      this.applyFilters();
      this.showNotification('All data cleared.', 'info');
    });
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /* Metrics / Charts                                                        */
  /* ──────────────────────────────────────────────────────────────────────── */
  /**
   * Refreshes all dashboard components: metrics, charts, and table.
   * @returns {void}
   */
  refreshAll() {
    this.refreshMetrics();
    this.refreshCharts();
    this.refreshTable();
  }

  /**
   * Recalculates and updates the displayed metrics.
   * @returns {void}
   */
  refreshMetrics() {
    const total = this.filteredExpenses.reduce((s, e) => s + e.amount, 0);
    const totalEl = this.$('#totalSpend');
    if (totalEl) totalEl.textContent = this.fmt(total);

    // This month
    const now = new Date();
    const monthFilter = e => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    };
    const thisMonthTotal = this.filteredExpenses.filter(monthFilter).reduce((s, e) => s + e.amount, 0);
    const monthlyEl = this.$('#monthlySpend');
    if (monthlyEl) monthlyEl.textContent = this.fmt(thisMonthTotal);

    // Last month for comparison
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthTotal = this.expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear();
    }).reduce((s, e) => s + e.amount, 0);
    this.setMonthlyChange(thisMonthTotal, lastMonthTotal);

    // Top category
    const catTotals = {};
    this.filteredExpenses.forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + e.amount; });
    const [topCat, topVal] = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0] || ['–', 0];
    const topCatEl = this.$('#topCategory');
    const topCatAmtEl = this.$('#topCategoryAmount');
    if (topCatEl) topCatEl.textContent = topCat;
    if (topCatAmtEl) topCatAmtEl.innerHTML = `<span>${this.fmt(topVal)}</span>`;

    // Recent 7 days
    const sevenAgo = new Date();
    sevenAgo.setDate(sevenAgo.getDate() - 7);
    const recent = this.filteredExpenses.filter(e => new Date(e.date) >= sevenAgo);
    const recentEl = this.$('#recentCount');
    const countEl = this.$('#expenseCount');
    if (recentEl) recentEl.textContent = recent.length;
    if (countEl) countEl.innerHTML = `<span>${this.filteredExpenses.length} total</span>`;
  }

  /**
   * Updates the display for monthly spending change compared to the previous month.
   * @param {number} curr - Current month's total spending.
   * @param {number} prev - Previous month's total spending.
   * @returns {void}
   */
  setMonthlyChange(curr, prev) {
    const el = this.$('#monthlySpendChange');
    if (!el) return;

    if (prev === 0) {
      el.className = 'metric-change neutral';
      el.innerHTML = '<i class="fas fa-minus"></i><span>No previous data</span>';
      return;
    }
    const diff = ((curr - prev) / prev) * 100;
    if (diff > 0) {
      el.className = 'metric-change positive';
      el.innerHTML = `<i class="fas fa-arrow-up"></i><span>+${diff.toFixed(1)}%</span>`;
    } else if (diff < 0) {
      el.className = 'metric-change negative';
      el.innerHTML = `<i class="fas fa-arrow-down"></i><span>${diff.toFixed(1)}%</span>`;
    } else {
      el.className = 'metric-change neutral';
      el.innerHTML = '<i class="fas fa-minus"></i><span>0%</span>';
    }
  }

  /**
   * Refreshes both monthly and category charts.
   * @returns {void}
   */
  refreshCharts() {
    this.renderMonthlyChart();
    this.renderCategoryChart();
  }

  /**
   * Renders or updates the monthly spending bar chart.
   * @returns {void}
   */
  renderMonthlyChart() {
    const canvas = this.$('#monthlyChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (this.monthlyChart) this.monthlyChart.destroy();

    const now = new Date();
    const labels = [];
    const values = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
      const monthTotal = this.filteredExpenses.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
      }).reduce((s, e) => s + e.amount, 0);
      values.push(monthTotal);
    }

    this.monthlyChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: '#3b82f6',
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: c => `Spending: ${this.fmt(c.parsed.y)}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: v => this.fmt(v) },
            grid: { color: 'rgba(0,0,0,0.1)' }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  }

  /**
   * Renders or updates the category distribution doughnut chart.
   * @returns {void}
   */
  renderCategoryChart() {
    const canvas = this.$('#categoryChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (this.categoryChart) this.categoryChart.destroy();

    const totals = {};
    this.filteredExpenses.forEach(e => { totals[e.category] = (totals[e.category] || 0) + e.amount; });
    const labels = Object.keys(totals);
    const values = Object.values(totals);

    if (labels.length === 0) {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#6b7280';
      ctx.textAlign = 'center';
      ctx.fillText('No data to display', ctx.canvas.width / 2, ctx.canvas.height / 2);
      return;
    }

    this.categoryChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: this.chartColors.slice(0, labels.length),
          borderColor: '#fff',
          borderWidth: 2,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 16,
              font: { size: 12 }
            }
          },
          tooltip: {
            callbacks: {
              label: c => {
                const total = values.reduce((a, b) => a + b, 0);
                const pct = ((c.parsed / total) * 100).toFixed(1);
                return `${c.label}: ${this.fmt(c.parsed)} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /* Table                                                                    */
  /* ──────────────────────────────────────────────────────────────────────── */
  /**
   * Refreshes the expense table with filtered and sorted data.
   * @returns {void}
   */
  refreshTable() {
    this.sortExpenses();
    const tbody = this.$('#expensesTableBody');
    if (!tbody) return;

    const start = (this.currentPage - 1) * this.itemsPerPage;
    const rows = this.filteredExpenses.slice(start, start + this.itemsPerPage);

    if (rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--color-text-secondary)">No expenses found. Try adding some expenses or adjusting your filters.</td></tr>`;
    } else {
      tbody.innerHTML = rows.map(this.renderRow.bind(this)).join('');
    }
    this.updatePagination();
  }

  /**
   * Renders a single expense row for the table.
   * @param {object} exp - The expense object.
   * @returns {string} The HTML string for the table row.
   */
  renderRow(exp) {
    return `<tr>
      <td class="date-cell">${this.fmtDate(exp.date)}</td>
      <td>${exp.description}</td>
      <td><span class="category-badge ${this.getCatClass(exp.category)}">${exp.category}</span></td>
      <td>${exp.location || '–'}</td>
      <td class="amount-cell">${this.fmt(exp.amount)}</td>
      <td><div class="action-buttons">
        <button class="action-btn edit" title="Edit" onclick="expenseManager.editExpense(${exp.id})"><i class="fas fa-edit"></i></button>
        <button class="action-btn delete" title="Delete" onclick="expenseManager.deleteExpense(${exp.id})"><i class="fas fa-trash"></i></button>
      </div></td>
    </tr>`;
  }

  /**
   * Sorts the filtered expenses based on the current sort criteria.
   * @returns {void}
   */
  sortExpenses() {
    const map = {
      'date-asc': (a, b) => new Date(a.date) - new Date(b.date),
      'date-desc': (a, b) => new Date(b.date) - new Date(a.date),
      'amount-asc': (a, b) => a.amount - b.amount,
      'amount-desc': (a, b) => b.amount - a.amount,
      'category': (a, b) => a.category.localeCompare(b.category),
      'description': (a, b) => a.description.localeCompare(b.description)
    };
    this.filteredExpenses.sort(map[this.currentSort] || map['date-desc']);
  }

  /**
   * Changes the current page of the expense table.
   * @param {number} dir - The direction to change the page (-1 for previous, 1 for next).
   * @returns {void}
   */
  changePage(dir) {
    const totalPages = Math.max(1, Math.ceil(this.filteredExpenses.length / this.itemsPerPage));
    const next = this.currentPage + dir;
    if (next >= 1 && next <= totalPages) {
      this.currentPage = next;
      this.refreshTable();
    }
  }

  /**
   * Updates the pagination controls (buttons and page info).
   * @returns {void}
   */
  updatePagination() {
    const totalPages = Math.max(1, Math.ceil(this.filteredExpenses.length / this.itemsPerPage));
    const prevBtn = this.$('#prevPage');
    const nextBtn = this.$('#nextPage');
    const pageInfo = this.$('#pageInfo');

    if (prevBtn) prevBtn.disabled = this.currentPage === 1;
    if (nextBtn) nextBtn.disabled = this.currentPage === totalPages;
    if (pageInfo) pageInfo.textContent = `Page ${this.currentPage} of ${totalPages} (${this.filteredExpenses.length} expenses)`;
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /* Preview & export                                                        */
  /* ──────────────────────────────────────────────────────────────────────── */
  /**
   * Shows the data preview and export modal.
   * @returns {void}
   */
  showPreviewModal() {
    this.updatePreviewData();
    const modal = this.$('#previewModal');
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  /**
   * Hides the data preview and export modal.
   * @returns {void}
   */
  hidePreviewModal() {
    const modal = this.$('#previewModal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  /**
   * Switches between the "Summary" and "Export Options" tabs in the preview modal.
   * @param {string} tab - The ID of the tab to switch to ('summary' or 'export').
   * @returns {void}
   */
  switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
    const summaryTab = this.$('#summaryTab');
    const exportTab = this.$('#exportTab');
    if (summaryTab) summaryTab.classList.toggle('hidden', tab !== 'summary');
    if (exportTab) exportTab.classList.toggle('hidden', tab !== 'export');
  }

  /**
   * Updates the summary data displayed in the preview modal.
   * @returns {void}
   */
  updatePreviewData() {
    const total = this.filteredExpenses.reduce((s, e) => s + e.amount, 0);
    const totalEl = this.$('#previewTotal');
    if (totalEl) totalEl.textContent = this.fmt(total);

    const countEl = this.$('#previewCount');
    if (countEl) countEl.textContent = this.filteredExpenses.length;

    const rangeEl = this.$('#previewRange');
    if (this.filteredExpenses.length && rangeEl) {
      const dates = this.filteredExpenses.map(e => new Date(e.date));
      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));
      rangeEl.textContent = `${this.fmtDate(minDate.toISOString().split('T')[0])} - ${this.fmtDate(maxDate.toISOString().split('T')[0])}`;
    } else if (rangeEl) {
      rangeEl.textContent = '–';
    }

    const topCatEl = this.$('#previewTopCat');
    if (topCatEl) {
      const catTotals = this.filteredExpenses.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
        return acc;
      }, {});
      const top = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
      topCatEl.textContent = top ? top[0] : '–';
    }
  }

  /**
   * Exports the filtered expense data in either JSON or CSV format.
   * @param {string} fmt - The desired export format ('json' or 'csv').
   * @returns {void}
   */
  exportData(fmt) {
    const data = {
      exportDate: new Date().toISOString(),
      total: this.filteredExpenses.length,
      totalAmount: this.filteredExpenses.reduce((s, e) => s + e.amount, 0),
      expenses: this.filteredExpenses
    };
    let blob, filename;
    if (fmt === 'json') {
      blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      filename = `expenses_${new Date().toISOString().split('T')[0]}.json`;
    } else {
      const headers = 'ID,Date,Description,Category,Location,Amount';
      const rows = this.filteredExpenses.map(e => `${e.id},${e.date},"${e.description.replace(/"/g, '""')}","${e.category.replace(/"/g, '""')}","${(e.location || '').replace(/"/g, '""')}",${e.amount}`);
      blob = new Blob([[headers, ...rows].join('\n')], { type: 'text/csv' });
      filename = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    this.showNotification(`Exported as ${fmt.toUpperCase()}.`, 'success');
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /* Confirmation modal                                                      */
  /* ──────────────────────────────────────────────────────────────────────── */
  /**
   * Shows a confirmation modal with a custom title, message, and a callback for confirmation.
   * @param {string} title - The title of the confirmation modal.
   * @param {string} msg - The message to display in the confirmation modal.
   * @param {function} onConfirm - The callback function to execute if the user confirms.
   * @returns {void}
   */
  showConfirmation(title, msg, onConfirm) {
    const titleEl = this.$('#confirmTitle');
    const msgEl = this.$('#confirmMessage');
    const modal = this.$('#confirmModal');

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = msg;

    const actBtn = this.$('#confirmAction');
    if (actBtn) {
      // Remove existing event listener to prevent multiple calls
      const old_element = actBtn;
      const new_element = old_element.cloneNode(true);
      old_element.parentNode.replaceChild(new_element, old_element);

      // Add new event listener
      this.$('#confirmAction').addEventListener('click', () => {
        onConfirm();
        this.hideConfirmModal();
      });
    }

    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  /**
   * Hides the confirmation modal.
   * @returns {void}
   */
  hideConfirmModal() {
    const modal = this.$('#confirmModal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /* Notifications                                                           */
  /* ──────────────────────────────────────────────────────────────────────── */
  /**
   * Displays a temporary notification message.
   * @param {string} msg - The message to display.
   * @param {string} type - The type of notification ('info', 'success', 'error').
   * @returns {void}
   */
  showNotification(msg, type = 'info') {
    const notif = this.$('#notification');
    if (!notif) return;

    notif.className = `notification ${type}`;
    const textEl = notif.querySelector('.notification-text');
    if (textEl) textEl.textContent = msg;

    const iconMap = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
    const iconEl = notif.querySelector('.notification-icon');
    if (iconEl) iconEl.className = `notification-icon fas ${iconMap[type]}`;

    notif.classList.add('show');
    setTimeout(() => notif.classList.remove('show'), 3000);
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /* Form preview                                                            */
  /* ──────────────────────────────────────────────────────────────────────── */
  /**
   * Updates the live preview of the expense form based on current input values.
   * @returns {void}
   */
  updateFormPreview() {
    const descInput = this.$('#expenseDescription');
    const amountInput = this.$('#expenseAmount');
    const categoryInput = this.$('#expenseCategory');
    const locationInput = this.$('#expenseLocation');
    const dateInput = this.$('#expenseDate');

    const desc = descInput ? (descInput.value || 'Enter details above…') : 'Enter details above…';
    const amt = amountInput ? (parseFloat(amountInput.value) || 0) : 0;
    const cat = categoryInput ? (categoryInput.value || 'Category') : 'Category';
    const loc = locationInput ? (locationInput.value || 'Location') : 'Location';
    const date = dateInput ? (dateInput.value || 'Date') : 'Date';

    const descEl = this.$('.preview-description');
    const metaEl = this.$('.preview-meta');
    const amtEl = this.$('.preview-amount');

    if (descEl) descEl.textContent = desc;
    if (metaEl) metaEl.textContent = `${cat} • ${loc} • ${this.fmtDate(date)}`;
    if (amtEl) amtEl.textContent = this.fmt(amt);
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /* Utilities                                                               */
  /* ──────────────────────────────────────────────────────────────────────── */
  /**
   * Formats a number as Indian Rupee currency.
   * @param {number} num - The number to format.
   * @returns {string} The formatted currency string.
   */
  fmt(num) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(num);
  }

  /**
   * Formats a date string into a short, numeric, and year format.
   * @param {string} d - The date string.
   * @returns {string} The formatted date string.
   */
  fmtDate(d) {
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  /**
   * Returns the CSS class for a given category for styling.
   * @param {string} cat - The category name.
   * @returns {string} The corresponding CSS class.
   */
  getCatClass(cat) {
    const map = {
      'Food & Dining': 'category-food',
      'Transportation': 'category-transportation',
      'Bills & Utilities': 'category-bills',
      'Shopping': 'category-shopping',
      'Entertainment': 'category-entertainment',
      'Health & Fitness': 'category-health',
      'Travel': 'category-travel',
      'Other': 'category-other'
    };
    return map[cat] || 'category-other';
  }
}

// Instantiate on DOM ready
let expenseManager;
document.addEventListener('DOMContentLoaded', () => {
  expenseManager = new ExpenseManager();
});
