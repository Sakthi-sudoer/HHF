// 🌟 FINANCE & REVENUE UI RENDERING ENGINE
import { t } from "../core/i18n.js";
import { dataRegistry } from "../core/accessors.js";
import { formatLocalDate, formatCurrency, parseLocalDate } from "../core/shared-utils.js";
import { dbSaveExpense, dbDeleteExpense } from "./finance-firestore.js";
import { getMonthAccrualRevenue, getExpensesSummary } from "./finance-logic.js";

let selectedMonth = formatLocalDate(new Date()).substring(0, 7); // YYYY-MM
let selectedReportType = 'customer';
let selectedReportStart = '';
let selectedReportEnd = '';

/**
 * Renders the main expenses list view
 */
export function renderExpensesView(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const expenses = dataRegistry.getExpenses() || [];
  
  // Clear list
  container.innerHTML = '';

  const summary = getExpensesSummary(expenses);
  const totalExpensesBadge = document.getElementById('stat-total-expenses');
  if (totalExpensesBadge) {
    totalExpensesBadge.textContent = formatCurrency(summary.totalAmount);
  }

  const list = summary.expensesList;
  list.sort((a,b) => b.date.localeCompare(a.date));

  if (list.length === 0) {
    container.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400 italic">${t('common.noData')}</td></tr>`;
    return;
  }

  list.forEach(e => {
    const tr = document.createElement('tr');
    tr.className = "border-b border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40";
    tr.innerHTML = `
      <td class="p-2.5">${e.date}</td>
      <td class="p-2.5 font-bold">${e.item}</td>
      <td class="p-2.5">${t(`finance.category${e.category || 'Other'}`)}</td>
      <td class="p-2.5 font-bold text-rose-600 dark:text-rose-400 text-right">${formatCurrency(e.amount)}</td>
      <td class="p-2.5 text-center">
        <button onclick="window.appFinance.deleteExpense('${e.id}')" class="text-rose-500 hover:text-rose-700 transition" title="Delete">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    `;
    container.appendChild(tr);
  });
}

/**
 * Renders the Profit Management (Revenue Recognition) tab
 */
export function renderProfitManagement() {
  const container = document.getElementById('profit-allocation-tbody');
  if (!container) return;

  const monthTabs = document.getElementById('profit-month-tabs');
  const customers = dataRegistry.getCustomers() || [];
  const expenses = dataRegistry.getExpenses() || [];
  const settings = dataRegistry.getSettings() || {};

  // 1. Render dynamic month switcher tabs
  if (monthTabs) {
    monthTabs.innerHTML = '';
    const uniqueMonths = new Set();
    
    // Add last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      uniqueMonths.add(formatLocalDate(d).substring(0, 7));
    }
    
    [...uniqueMonths].sort().forEach(m => {
      const active = m === selectedMonth;
      const btn = document.createElement('button');
      btn.className = `px-3 py-1.5 rounded-xl font-bold text-[10px] whitespace-nowrap transition-all ${
        active 
          ? 'bg-emerald-600 text-white shadow-sm' 
          : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
      }`;
      // Display month name
      const dateVal = new Date(m + '-02');
      const monthLabel = dateVal.toLocaleString('default', { month: 'long', year: 'numeric' });
      btn.textContent = monthLabel;
      btn.onclick = () => {
        selectedMonth = m;
        renderProfitManagement();
      };
      monthTabs.appendChild(btn);
    });
  }

  // 2. Parse year and month numbers
  const [year, month] = selectedMonth.split('-').map(Number);

  let totalGrossRevenue = 0;
  let totalCashRevenue = 0;
  let totalExpenses = 0;

  container.innerHTML = '';

  // 3. Loop customers and recognized allocations
  customers.forEach(c => {
    if (!c.start || !c.end || c.status === 'withdrawn') return;
    
    const rev = getMonthAccrualRevenue(c, year, month);
    if (rev.daysInMonth > 0) {
      totalGrossRevenue += rev.recognized;
      totalCashRevenue += rev.cashRecognized;

      const tr = document.createElement('tr');
      tr.className = "border-b border-slate-200 dark:border-slate-750 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300";
      tr.innerHTML = `
        <td class="p-2.5 font-semibold">${c.name}</td>
        <td class="p-2.5">${c.isTrial ? 'Trial' : (c.paymentTerm === 'weekly' ? 'Weekly' : 'Monthly')}</td>
        <td class="p-2.5 text-right font-bold">${formatCurrency(c.cost)}</td>
        <td class="p-2.5 text-right">${formatCurrency(c.paid)}</td>
        <td class="p-2.5 text-center font-semibold">${rev.daysInMonth} / ${rev.totalDays} Days</td>
        <td class="p-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">${formatCurrency(rev.recognized)}</td>
        <td class="p-2.5 text-right text-slate-400 dark:text-slate-500">${formatCurrency(rev.deferred)}</td>
      `;
      container.appendChild(tr);
    }
  });

  // Calculate matching monthly expenses
  const monthlyExp = expenses.filter(e => e.date && e.date.startsWith(selectedMonth));
  totalExpenses = monthlyExp.reduce((acc, e) => acc + (parseFloat(e.amount) || 0), 0);

  // Update total stats elements
  const grossEl = document.getElementById('prof-lbl-gross');
  const expensesEl = document.getElementById('prof-lbl-expenses');
  const netEl = document.getElementById('prof-lbl-net');
  const projectedEl = document.getElementById('prof-lbl-projected');
  const expectedEl = document.getElementById('prof-lbl-expected');

  if (grossEl) grossEl.textContent = formatCurrency(totalGrossRevenue);
  if (expensesEl) expensesEl.textContent = formatCurrency(totalExpenses);
  if (netEl) netEl.textContent = formatCurrency(totalGrossRevenue - totalExpenses);
  
  // Projected Profit based on unpaid customer ledger totals
  const totalCost = customers.reduce((acc, c) => acc + (c.status !== 'withdrawn' ? parseFloat(c.cost) || 0 : 0), 0);
  const totalPaid = customers.reduce((acc, c) => acc + (c.status !== 'withdrawn' ? parseFloat(c.paid) || 0 : 0), 0);
  if (projectedEl) projectedEl.textContent = formatCurrency(totalCost - totalExpenses);
  if (expectedEl) expectedEl.textContent = formatCurrency(totalCost - totalPaid);
}

/**
 * Handle new expense submission
 */
export async function saveExpenseForm(e) {
  e.preventDefault();
  const date = document.getElementById('exp-date').value;
  const item = document.getElementById('exp-item').value.trim();
  const amount = parseFloat(document.getElementById('exp-amount').value) || 0;
  const category = document.getElementById('exp-category').value;

  if (!date || !item || amount <= 0) {
    alert("Please fill all mandatory fields.");
    return;
  }

  const expense = {
    id: "exp_" + Date.now(),
    date,
    item,
    amount,
    category
  };

  try {
    await dbSaveExpense(expense);
    document.getElementById('expense-form').reset();
    document.getElementById('exp-date').value = formatLocalDate(new Date());
    renderExpensesView('expense-history-table');
  } catch (err) {
    alert("Error saving expense details.");
  }
}

export function deleteExpense(id) {
  if (confirm(t('common.confirmDelete'))) {
    dbDeleteExpense(id).then(() => renderExpensesView('expense-history-table'));
  }
}

/**
 * Excel master CSV exports generator
 */
export function exportReportToCSV() {
  const customers = dataRegistry.getCustomers();
  const expenses = dataRegistry.getExpenses();

  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Customer Name,Plan Type,Cost,Paid,Outstanding Balance,Start Date,End Date\n";

  customers.forEach(c => {
    const balance = getCustomerBalance(c.cost, c.paid);
    const plan = c.isTrial ? 'Trial' : (c.paymentTerm === 'weekly' ? 'Weekly' : 'Monthly');
    const row = `"${c.name}","${plan}",${c.cost},${c.paid},${balance},"${c.start}","${c.end}"`;
    csvContent += row + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `hh_foods_report_${selectedMonth}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Global hooks
window.appFinance = {
  render: renderExpensesView,
  renderProfit: renderProfitManagement,
  saveExpenseForm,
  deleteExpense,
  exportCSV: exportReportToCSV
};
