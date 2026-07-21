// 🌟 DELIVERY CHECKLIST RENDERING ENGINE
import { t } from "../core/i18n.js";
import { dataRegistry } from "../core/accessors.js";
import { formatLocalDate, formatTimeString } from "../core/shared-utils.js";
import { filterDeliveries, getDeliveryStats } from "./delivery-logic.js";

let currentPlannerDate = formatLocalDate(new Date());
let currentPlannerSession = 'all';
let currentPlannerRoute = 'morning';
let currentPlannerDriver = 'all';
let currentPlannerSort = 'name';

/**
 * Initializes and draws the daily delivery checklist planner view
 */
export function renderDeliveryChecklist(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const customers = dataRegistry.getCustomers();
  const staff = dataRegistry.getStaff();
  const deliveries = dataRegistry.getDeliveries() || {};

  // 1. Calculate and update dashboard indicators
  const stats = getDeliveryStats(customers, currentPlannerDate, currentPlannerRoute, currentPlannerDriver);
  
  const plannedEl = document.getElementById('planner-stat-planned');
  const leavesEl = document.getElementById('planner-stat-leave');
  const unplannedEl = document.getElementById('planner-stat-unplanned');

  if (plannedEl) {
    plannedEl.textContent = `B:${stats.planned.B} | L:${stats.planned.L} | D:${stats.planned.D}`;
  }
  if (leavesEl) {
    leavesEl.textContent = `${stats.leaveCount} ${t('common.actions')}`;
  }
  if (unplannedEl) {
    unplannedEl.textContent = `${stats.unassignedCount} ${t('common.actions')}`;
  }

  // Populate driver filter dropdowns if needed
  const filterSelect = document.getElementById('route-staff-filter');
  if (filterSelect && filterSelect.options.length <= 1) {
    filterSelect.innerHTML = `<option value="all">${t('delivery.filterStaff')}</option>` + 
      staff.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  }

  // Populate bulk assign dropdown
  const bulkStaff = document.getElementById('bulk-staff-assign');
  if (bulkStaff && bulkStaff.options.length <= 1) {
    bulkStaff.innerHTML = `<option value="">${t('delivery.bulkAssignDriver')}</option>` +
      staff.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  }

  // 2. Filter and Sort Checklist Rows
  const list = filterDeliveries(
    customers, 
    currentPlannerDate, 
    currentPlannerSession, 
    currentPlannerRoute, 
    currentPlannerDriver, 
    currentPlannerSort
  );

  container.innerHTML = '';
  if (list.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-10 text-slate-400 italic">
        ${t('common.noData')}
      </div>
    `;
    return;
  }

  // 3. Render Cards
  list.forEach(item => {
    const c = item.customer;
    const cDelivery = deliveries[c.id] || {};
    const driver = staff.find(s => s.id === item.driverId);
    
    // Checked status indicator
    const isBChecked = cDelivery.breakfast || false;
    const isLChecked = cDelivery.lunch || false;
    const isDChecked = cDelivery.dinner || false;

    const card = document.createElement('div');
    card.className = "bg-white dark:bg-slate-800 border dark:border-slate-700 p-4 rounded-2xl shadow-sm hover:shadow transition space-y-3 relative flex flex-col justify-between";
    
    // Render session checkboxes based on active configurations
    let mealCheckboxes = '';
    if (currentPlannerRoute === 'morning') {
      if (c.breakfast) {
        mealCheckboxes += `
          <label class="flex items-center space-x-2 p-1.5 bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-xl cursor-pointer">
            <input type="checkbox" class="planner-chk w-4 h-4 text-emerald-600 rounded" 
              ${isBChecked ? 'checked' : ''} 
              onchange="window.appDelivery.toggleCheck('${c.id}', 'breakfast', this.checked)">
            <span class="text-xs font-bold text-slate-700 dark:text-slate-300">Breakfast (${c.breakfastQty})</span>
          </label>
        `;
      }
      if (c.lunch) {
        mealCheckboxes += `
          <label class="flex items-center space-x-2 p-1.5 bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-xl cursor-pointer">
            <input type="checkbox" class="planner-chk w-4 h-4 text-emerald-600 rounded" 
              ${isLChecked ? 'checked' : ''} 
              onchange="window.appDelivery.toggleCheck('${c.id}', 'lunch', this.checked)">
            <span class="text-xs font-bold text-slate-700 dark:text-slate-300">Lunch (${c.lunchQty})</span>
          </label>
        `;
      }
    } else {
      if (c.dinner) {
        mealCheckboxes += `
          <label class="flex items-center space-x-2 p-1.5 bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-xl cursor-pointer">
            <input type="checkbox" class="planner-chk w-4 h-4 text-emerald-600 rounded" 
              ${isDChecked ? 'checked' : ''} 
              onchange="window.appDelivery.toggleCheck('${c.id}', 'dinner', this.checked)">
            <span class="text-xs font-bold text-slate-700 dark:text-slate-300">Dinner (${c.dinnerQty})</span>
          </label>
        `;
      }
    }

    card.innerHTML = `
      <div class="space-y-2">
        <div class="flex justify-between items-start">
          <div class="flex items-start space-x-2">
            <input type="checkbox" class="planner-card-checkbox w-4 h-4 text-emerald-600 rounded border-slate-300 mt-1" data-cust-id="${c.id}" onchange="window.appDelivery.updateSelectedCount()">
            <div>
              <h3 class="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight">${c.name}</h3>
              ${c.companyName ? `<span class="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block">${c.companyName}</span>` : ''}
            </div>
          </div>
          <button onclick="window.appDelivery.openLeaveModal('${c.id}')" class="text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 px-2 py-0.5 rounded text-slate-500 dark:text-slate-300 font-semibold">
            Action
          </button>
        </div>

        <div class="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
          <div class="truncate"><i class="fa-solid fa-map-marker-alt mr-1 text-slate-400"></i>${c.address || '-'}</div>
          <div><i class="fa-solid fa-user-tag mr-1 text-slate-400"></i>Driver: <span class="font-bold text-slate-700 dark:text-slate-300">${driver ? driver.name : 'Unassigned'}</span></div>
          ${c.notes ? `<div class="italic text-[10px] text-rose-500 dark:text-rose-400 font-semibold">Note: ${c.notes}</div>` : ''}
        </div>

        <div class="grid grid-cols-1 gap-1.5 pt-2">
          ${mealCheckboxes}
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

/**
 * Handle delivery checkbox checked event
 */
export async function toggleCheck(custId, meal, checked) {
  const deliveries = dataRegistry.getDeliveries() || {};
  if (!deliveries[custId]) deliveries[custId] = {};
  
  deliveries[custId][meal] = checked;
  
  // Assign driver to check
  const c = dataRegistry.getCustomers().find(x => x.id === custId);
  if (c) {
    if (currentPlannerRoute === 'evening') {
      deliveries[custId].eveningStaffId = c.eveningStaffId || c.staffId || '';
    } else {
      deliveries[custId].staffId = c.staffId || '';
    }
  }

  try {
    await dataRegistry.dbSaveDeliveryStatus(currentPlannerDate, deliveries);
  } catch (err) {
    alert("Error updating checklist state.");
  }
}

/**
 * Bulk Driver Assignment execution
 */
export async function applyBulkStaffAssign() {
  const staffId = document.getElementById('bulk-staff-assign').value;
  if (!staffId) {
    alert("Please select a driver to assign.");
    return;
  }

  const selectedCustIds = [];
  document.querySelectorAll('.planner-card-checkbox:checked').forEach(cb => {
    selectedCustIds.push(cb.getAttribute('data-cust-id'));
  });

  if (selectedCustIds.length === 0) {
    alert("No customers selected.");
    return;
  }

  if (!confirm(`Assign this driver to ${selectedCustIds.length} customers?`)) return;

  const customers = dataRegistry.getCustomers();
  for (let id of selectedCustIds) {
    const c = customers.find(x => x.id === id);
    if (c) {
      if (currentPlannerRoute === 'evening') {
        c.eveningStaffId = staffId;
      } else {
        c.staffId = staffId;
      }
      try {
        await dataRegistry.dbSaveCustomer(c);
      } catch (e) {
        console.error("Bulk assign failed for customer", id, e);
      }
    }
  }

  // Clear selects
  document.querySelectorAll('.planner-card-checkbox').forEach(cb => cb.checked = false);
  const selectAll = document.getElementById('planner-select-all');
  if (selectAll) selectAll.checked = false;
  
  updateSelectedCount();
  if (window.appDelivery.onRefresh) window.appDelivery.onRefresh();
}

/**
 * Bulk Notes Assignment execution
 */
export async function applyBulkMenuNotes() {
  const notesText = document.getElementById('bulk-menu-notes').value.trim();
  const selectedCustIds = [];
  document.querySelectorAll('.planner-card-checkbox:checked').forEach(cb => {
    selectedCustIds.push(cb.getAttribute('data-cust-id'));
  });

  if (selectedCustIds.length === 0) {
    alert("No customers selected.");
    return;
  }

  const customers = dataRegistry.getCustomers();
  for (let id of selectedCustIds) {
    const c = customers.find(x => x.id === id);
    if (c) {
      c.notes = notesText;
      try {
        await dataRegistry.dbSaveCustomer(c);
      } catch (e) {
        console.error("Bulk notes write failed for customer", id, e);
      }
    }
  }

  document.getElementById('bulk-menu-notes').value = '';
  document.querySelectorAll('.planner-card-checkbox').forEach(cb => cb.checked = false);
  const selectAll = document.getElementById('planner-select-all');
  if (selectAll) selectAll.checked = false;

  updateSelectedCount();
  if (window.appDelivery.onRefresh) window.appDelivery.onRefresh();
}

/**
 * Update the multi-select count indicators
 */
export function updateSelectedCount() {
  const checked = document.querySelectorAll('.planner-card-checkbox:checked').length;
  const counter = document.getElementById('planner-selected-count');
  if (counter) {
    counter.textContent = `${checked} ${t('delivery.bulkSelectedCount')}`;
  }
}

/**
 * Reroute parameters
 */
export function setPlannerDate(dateStr) {
  currentPlannerDate = dateStr;
  if (window.appDelivery.onRefresh) window.appDelivery.onRefresh();
}
export function setPlannerSession(session) {
  currentPlannerSession = session;
  if (window.appDelivery.onRefresh) window.appDelivery.onRefresh();
}
export function setPlannerRoute(route) {
  currentPlannerRoute = route;
  if (window.appDelivery.onRefresh) window.appDelivery.onRefresh();
}
export function setPlannerDriver(driver) {
  currentPlannerDriver = driver;
  if (window.appDelivery.onRefresh) window.appDelivery.onRefresh();
}
export function setPlannerSort(sort) {
  currentPlannerSort = sort;
  if (window.appDelivery.onRefresh) window.appDelivery.onRefresh();
}

/**
 * Show leave configurations planner modal
 */
export function openLeaveModal(custId) {
  const c = dataRegistry.getCustomers().find(x => x.id === custId);
  if (!c) return;
  
  document.getElementById('planner-leave-cust-id').value = c.id;
  document.getElementById('planner-leave-cust-name').textContent = c.name;
  document.getElementById('planner-leave-date').value = currentPlannerDate;
  
  // Set defaults checkbox
  document.getElementById('planner-leave-b').checked = c.breakfast;
  document.getElementById('planner-leave-l').checked = c.lunch;
  document.getElementById('planner-leave-d').checked = c.dinner;
  
  document.getElementById('planner-action-type-leave').checked = true;
  document.getElementById('planner-alternate-section').classList.add('hidden');
  
  document.getElementById('planner-leave-modal').classList.remove('hidden');
  document.getElementById('planner-leave-modal').style.display = 'flex';
}

/**
 * Close leave planner modal
 */
export function closePlannerLeaveModal() {
  document.getElementById('planner-leave-modal').style.display = 'none';
  document.getElementById('planner-leave-modal').classList.add('hidden');
}

/**
 * Toggles dynamic input field displays in leave modals
 */
export function togglePlannerAlternateSection() {
  const altSection = document.getElementById('planner-alternate-section');
  const isAlt = document.getElementById('planner-action-type-alternate').checked;
  if (isAlt) {
    altSection.classList.remove('hidden');
    
    // Set tomorrow's date by default
    const nextDay = new Date(currentPlannerDate);
    nextDay.setDate(nextDay.getDate() + 1);
    document.getElementById('planner-alternate-date').value = formatLocalDate(nextDay);
  } else {
    altSection.classList.add('hidden');
  }
}

// Global hookup
window.appDelivery = {
  render: renderDeliveryChecklist,
  toggleCheck,
  applyBulkStaffAssign,
  applyBulkMenuNotes,
  updateSelectedCount,
  setPlannerDate,
  setPlannerSession,
  setPlannerRoute,
  setPlannerDriver,
  setPlannerSort,
  openLeaveModal,
  closePlannerLeaveModal,
  togglePlannerAlternateSection,
  onRefresh: null
};
