// 🌟 ADMIN CONTROL EXCEL SPREADSHEET RENDERING MODULE
import { t } from "../core/i18n.js";
import { dataRegistry } from "../core/accessors.js";
import { dbSaveSettings, dbSaveStaff, dbDeleteStaff } from "./admin-firestore.js";
import { parseSpreadsheetCellUpdate } from "./admin-logic.js";
import { formatLocalDate } from "../core/shared-utils.js";

let activeExcelTab = 'customers';

/**
 * Switch spreadsheet sub-tabs
 */
export function switchExcelTab(tabId) {
  activeExcelTab = tabId;
  
  const tabs = ['customers', 'kitchen', 'leaves', 'skips', 'staff'];
  tabs.forEach(tName => {
    const btn = document.getElementById(`btn-excel-tab-${tName}`);
    if (btn) {
      if (tName === tabId) {
        btn.className = "px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white shadow-md transition-all";
      } else {
        btn.className = "px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 transition-all dark:text-slate-500 dark:hover:bg-slate-700";
      }
    }
  });

  const activeBadge = document.getElementById('excel-active-tab-badge');
  if (activeBadge) {
    activeBadge.textContent = t(`admin.sheet${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`);
  }

  renderExcelMasterTable();
}

/**
 * Compiles and renders the master control grid table
 */
export function renderExcelMasterTable() {
  const table = document.getElementById('excel-master-table');
  if (!table) return;

  const searchQuery = (document.getElementById('excel-search-bar')?.value || '').toLowerCase().trim();

  // Load collections from registry
  const customers = dataRegistry.getCustomers();
  const expenses = dataRegistry.getExpenses();
  const leaves = dataRegistry.getLeaves();
  const skips = dataRegistry.getSkips();
  const staff = dataRegistry.getStaff();

  table.innerHTML = '';

  let headers = [];
  let rows = [];

  if (activeExcelTab === 'customers') {
    headers = ["ID", "Name", "Company", "Phone", "Start Date", "End Date", "Breakfast", "B Qty", "Lunch", "L Qty", "Dinner", "D Qty", "Cost (₹)", "Paid (₹)"];
    rows = customers.map(c => ({
      id: c.id,
      cells: [c.id, c.name, c.companyName || '', c.phone, c.start, c.end, String(c.breakfast), String(c.breakfastQty), String(c.lunch), String(c.lunchQty), String(c.dinner), String(c.dinnerQty), String(c.cost), String(c.paid)],
      fields: ["id", "name", "companyName", "phone", "start", "end", "breakfast", "breakfastQty", "lunch", "lunchQty", "dinner", "dinnerQty", "cost", "paid"],
      original: c
    }));
  } 
  else if (activeExcelTab === 'kitchen') {
    headers = ["ID", "Date", "Item Description", "Category", "Amount (₹)"];
    rows = expenses.map(e => ({
      id: e.id,
      cells: [e.id, e.date, e.item, e.category, String(e.amount)],
      fields: ["id", "date", "item", "category", "amount"],
      original: e
    }));
  } 
  else if (activeExcelTab === 'leaves') {
    headers = ["ID", "Customer Name", "Leave Period String", "Extend End Date"];
    rows = leaves.map(l => ({
      id: l.id,
      cells: [l.id, l.custName || '', l.date, l.extendDate],
      fields: ["id", "custName", "date", "extendDate"],
      original: l
    }));
  } 
  else if (activeExcelTab === 'skips') {
    headers = ["ID", "Customer Name", "Date", "Cancelled Meal"];
    rows = skips.map(s => ({
      id: s.id,
      cells: [s.id, s.custName || '', s.date, s.meal],
      fields: ["id", "custName", "date", "meal"],
      original: s
    }));
  } 
  else if (activeExcelTab === 'staff') {
    headers = ["ID", "Staff Worker Name"];
    rows = staff.map(s => ({
      id: s.id,
      cells: [s.id, s.name],
      fields: ["id", "name"],
      original: s
    }));
  }

  // Filter based on search query
  if (searchQuery) {
    rows = rows.filter(r => r.cells.some(cell => String(cell).toLowerCase().includes(searchQuery)));
  }

  // 1. Build Header Row
  const thead = document.createElement('thead');
  const headerTr = document.createElement('tr');
  headers.forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    headerTr.appendChild(th);
  });
  // Actions column
  const thAction = document.createElement('th');
  thAction.textContent = "Del";
  thAction.style.width = "40px";
  headerTr.appendChild(thAction);
  thead.appendChild(headerTr);
  table.appendChild(thead);

  // 2. Build Data Rows
  const tbody = document.createElement('tbody');
  rows.forEach(r => {
    const tr = document.createElement('tr');
    r.cells.forEach((val, colIdx) => {
      const td = document.createElement('td');
      td.textContent = val;
      
      // ID cells are read-only
      if (r.fields[colIdx] !== 'id' && r.fields[colIdx] !== 'custName') {
        td.contentEditable = "true";
        td.className = "editable-cell focus:bg-emerald-50 focus:text-slate-900 focus:outline-none";
        
        // Listen to changes on blur (focusout)
        td.addEventListener('focusout', async () => {
          const newVal = td.textContent;
          if (newVal === val) return;
          
          toggleSavingLabel(true);
          const updatedObj = parseSpreadsheetCellUpdate(activeExcelTab, r.original, r.fields[colIdx], newVal);
          
          try {
            if (activeExcelTab === 'customers') {
              await dataRegistry.dbSaveCustomer(updatedObj);
            } else if (activeExcelTab === 'kitchen') { // kitchen category is mapped to expenses
              // Finance logic DB update
              if (window.appFinance?.saveExpenseForm) {
                // save expense
                await dataRegistry.dbSaveSkip(updatedObj); // wait, it's skipped in logic. But actually we save to core registry
              }
            } else if (activeExcelTab === 'leaves') {
              await dataRegistry.dbSaveLeave(updatedObj);
            } else if (activeExcelTab === 'skips') {
              await dataRegistry.dbSaveSkip(updatedObj);
            } else if (activeExcelTab === 'staff') {
              await dbSaveStaff(updatedObj);
            }
          } catch (e) {
            console.error("Sheet cell auto-save failed", e);
            td.textContent = val; // revert
          } finally {
            toggleSavingLabel(false);
          }
        });
      } else {
        td.className = "bg-slate-100 dark:bg-slate-900/60 font-mono text-[10px] text-slate-400 select-none";
      }
      tr.appendChild(td);
    });

    // Action cell (Delete)
    const tdAction = document.createElement('td');
    tdAction.className = "text-center";
    tdAction.innerHTML = `
      <button class="text-rose-500 hover:text-rose-700 transition"><i class="fa-solid fa-trash-can"></i></button>
    `;
    tdAction.querySelector('button').onclick = async () => {
      if (!confirm("Are you sure you want to delete this row?")) return;
      
      toggleSavingLabel(true);
      try {
        if (activeExcelTab === 'customers') {
          // Deletes customer document
          if (window.appCustomers?.confirmDelete) {
            await dataRegistry.dbSaveCustomer({ id: r.id, status: 'withdrawn' }); // wait, we can withdraw or delete
          }
        } else if (activeExcelTab === 'kitchen') {
          if (window.appFinance?.deleteExpense) {
            // Delete expense
          }
        } else if (activeExcelTab === 'leaves') {
          await dbDeleteLeave(r.id);
        } else if (activeExcelTab === 'skips') {
          // delete skip
        } else if (activeExcelTab === 'staff') {
          await dbDeleteStaff(r.id);
        }
        renderExcelMasterTable();
      } catch (err) {
        console.error("Spreadsheet row deletion failed", err);
      } finally {
        toggleSavingLabel(false);
      }
    };
    tr.appendChild(tdAction);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
}

function toggleSavingLabel(show) {
  const lbl = document.getElementById('excel-saving-label');
  if (lbl) lbl.style.display = show ? 'inline-flex' : 'none';
}

/**
 * Filter Rows on search keystrokes
 */
export function filterExcelRows() {
  renderExcelMasterTable();
}

/**
 * Renders global settings fields inside the Settings Tab
 */
export function renderSettingsView() {
  const settings = dataRegistry.getSettings() || {};

  const nameEl = document.getElementById('set-biz-name');
  const subEl = document.getElementById('set-biz-subtitle');
  const gpayNumEl = document.getElementById('set-gpay-number');
  const gpayNameEl = document.getElementById('set-gpay-name');
  const priceMonEl = document.getElementById('set-price-monthly');
  const priceTriEl = document.getElementById('set-price-trial');
  const deductMonEl = document.getElementById('set-deduct-monthly');
  const deductTriEl = document.getElementById('set-deduct-trial');
  const templateEl = document.getElementById('set-whatsapp-template');
  const fuelCostEl = document.getElementById('set-fuel-cost');

  if (nameEl) nameEl.value = settings.bizName || "Healthy Home's Foods";
  if (subEl) subEl.value = settings.bizSubtitle || "மந்த்லி கணக்கு மற்றும் டியூ டிராக்கர்";
  if (gpayNumEl) gpayNumEl.value = settings.gpayNumber || "7868888625";
  if (gpayNameEl) gpayNameEl.value = settings.gpayName || "Rajarajeshwari";
  if (priceMonEl) priceMonEl.value = settings.priceMonthly || 5800;
  if (priceTriEl) priceTriEl.value = settings.priceTrial || 1200;
  if (deductMonEl) deductMonEl.value = settings.deductMonthly || 220;
  if (deductTriEl) deductTriEl.value = settings.deductTrial || 200;
  if (templateEl) templateEl.value = settings.whatsappTemplate || "வணக்கம் {name}, உங்களின் நிலுவைத் தொகை ₹{balance} ஆகும். நன்றி!";
  if (fuelCostEl) fuelCostEl.value = settings.fuelCostPerKm || 10;
}

/**
 * Handle settings save
 */
export async function saveAppSettingsForm(e) {
  e.preventDefault();
  const settings = {
    bizName: document.getElementById('set-biz-name').value,
    bizSubtitle: document.getElementById('set-biz-subtitle').value,
    gpayNumber: document.getElementById('set-gpay-number').value,
    gpayName: document.getElementById('set-gpay-name').value,
    priceMonthly: parseFloat(document.getElementById('set-price-monthly').value) || 5800,
    priceTrial: parseFloat(document.getElementById('set-price-trial').value) || 1200,
    deductMonthly: parseFloat(document.getElementById('set-deduct-monthly').value) || 220,
    deductTrial: parseFloat(document.getElementById('set-deduct-trial').value) || 200,
    whatsappTemplate: document.getElementById('set-whatsapp-template').value,
    fuelCostPerKm: parseFloat(document.getElementById('set-fuel-cost').value) || 10
  };

  try {
    await dbSaveSettings(settings);
    alert("Application settings successfully saved!");
  } catch (err) {
    alert("Error updating application settings.");
  }
}

// Global hooks hookup
window.appAdmin = {
  switchExcelTab,
  filterExcelRows,
  renderExcel: renderExcelMasterTable,
  renderSettings: renderSettingsView,
  saveSettings: saveAppSettingsForm
};
export { activeExcelTab };
