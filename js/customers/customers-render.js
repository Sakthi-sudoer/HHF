// 🌟 CUSTOMERS UI RENDERING ENGINE & DIALOG CONTROLLERS
import { t } from "../core/i18n.js";
import { dataRegistry } from "../core/accessors.js";
import { parseLocalDate, formatLocalDate, formatCurrency, calculateEndDate } from "../core/shared-utils.js";
import { 
  dbSaveCustomer, 
  dbDeleteCustomer, 
  dbSaveLeave, 
  dbDeleteLeave 
} from "./customers-firestore.js";
import { 
  recalculateCustomerEndDate, 
  getCustomerBalance, 
  getCustomerDeductionDetails, 
  calculateContinuousLeaveExtension, 
  getWhatsAppMessageText 
} from "./customers-logic.js";

let customerFilter = 'all';
let activeProfileId = null;
let activeProfileTab = 'overview';

/**
 * Initializes and draws the main customer directory grid
 */
export function renderCustomersView(containerId, searchBarId) {
  const container = document.getElementById(containerId);
  const searchInput = document.getElementById(searchBarId);
  if (!container) return;
  
  const queryText = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const customers = dataRegistry.getCustomers();
  
  // Apply filter and search
  const filtered = customers.filter(c => {
    if (customerFilter === 'trial' && !c.isTrial) return false;
    if (customerFilter === 'unpaid') {
      const balance = getCustomerBalance(c.cost, c.paid);
      if (balance <= 0) return false;
    }
    
    if (queryText) {
      const name = (c.name || '').toLowerCase();
      const phone = (c.phone || '');
      const company = (c.companyName || '').toLowerCase();
      const address = (c.address || '').toLowerCase();
      return name.includes(queryText) || phone.includes(queryText) || company.includes(queryText) || address.includes(queryText);
    }
    return true;
  });

  filtered.sort((a, b) => {
    if (a.status === 'active' && b.status !== 'active') return -1;
    if (a.status !== 'active' && b.status === 'active') return 1;
    return a.name.localeCompare(b.name);
  });

  const counterBadge = document.getElementById('badge-cust-count');
  if (counterBadge) {
    counterBadge.textContent = `${filtered.length} ${t('nav.customers')}`;
  }

  container.innerHTML = '';
  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-10 text-slate-400 italic">
        ${t('common.noData')}
      </div>
    `;
    return;
  }

  filtered.forEach(c => {
    const balance = getCustomerBalance(c.cost, c.paid);
    const card = document.createElement('div');
    
    let statusClass = "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
    if (c.status === 'inactive') statusClass = "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
    if (c.status === 'withdrawn') statusClass = "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300";

    const meals = [];
    if (c.breakfast) meals.push(`B(${c.breakfastQty})`);
    if (c.lunch) meals.push(`L(${c.lunchQty})`);
    if (c.dinner) meals.push(`D(${c.dinnerQty})`);

    card.className = "bg-white dark:bg-slate-800 border dark:border-slate-700 p-4 rounded-2xl shadow-sm hover:shadow transition relative flex flex-col justify-between";
    card.innerHTML = `
      <div class="space-y-2">
        <div class="flex justify-between items-start">
          <div>
            <h3 class="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight">${c.name}</h3>
            ${c.companyName ? `<span class="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block">${c.companyName}</span>` : ''}
          </div>
          <span class="px-2 py-0.5 text-[9px] font-bold rounded uppercase ${statusClass}">${t('common.' + (c.status || 'active'))}</span>
        </div>
        
        <div class="text-xs text-slate-500 dark:text-slate-400 space-y-1">
          <div><i class="fa-solid fa-phone mr-1.5 text-slate-400"></i>${c.phone}</div>
          <div class="truncate"><i class="fa-solid fa-map-marker-alt mr-1.5 text-slate-400"></i>${c.address || '-'}</div>
          <div><i class="fa-solid fa-utensils mr-1.5 text-slate-400"></i><span class="font-bold text-emerald-600 dark:text-emerald-400">${meals.join(', ') || 'No Meals'}</span></div>
          <div class="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
            Cycle: ${c.start || '-'} to ${c.end || '-'}
          </div>
        </div>
      </div>
      
      <div class="mt-4 pt-3 border-t dark:border-slate-700 flex justify-between items-center text-xs">
        <div>
          <span class="text-[10px] text-slate-400 block font-bold">Outstanding</span>
          <span class="font-bold ${balance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}">${formatCurrency(balance)}</span>
        </div>
        
        <div class="flex items-center space-x-1.5">
          <button onclick="window.appCustomers.viewProfile('${c.id}')" class="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 border dark:border-slate-600 rounded-lg text-slate-500 dark:text-slate-300" title="View Profile" data-i18n-aria="customers.profileOverview">
            <i class="fa-solid fa-eye"></i>
          </button>
          <button onclick="window.appCustomers.openEditForm('${c.id}')" class="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 border dark:border-slate-600 rounded-lg text-slate-500 dark:text-slate-300" title="Edit" data-i18n-aria="common.edit">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button onclick="window.appCustomers.confirmDelete('${c.id}')" class="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 border border-rose-100 dark:border-rose-950/60 rounded-lg text-rose-600 dark:text-rose-400" title="Delete" data-i18n-aria="common.delete">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

/**
 * Switch filter buttons
 */
export function setCustomerFilter(filter) {
  customerFilter = filter;
  const buttons = ['all', 'trial', 'unpaid'];
  buttons.forEach(btn => {
    const el = document.getElementById(`btn-${btn}`);
    if (el) {
      if (btn === filter) {
        el.className = "flex-1 py-1.5 text-center text-[10px] font-bold rounded-lg transition-all active-filter-green text-white bg-emerald-600 shadow";
      } else {
        el.className = "flex-1 py-1.5 text-center text-[10px] font-bold rounded-lg text-slate-500 hover:bg-slate-50 transition-all dark:text-slate-400 dark:hover:bg-slate-800";
      }
    }
  });
  renderCustomersView('customer-cards-list', 'search-bar');
}

/**
 * Opens Customer Add/Edit Dialog Modal
 */
export function openEditForm(id = '') {
  const form = document.getElementById('customer-form');
  if (!form) return;
  form.reset();

  const titleEl = document.getElementById('modal-title');
  const editIdEl = document.getElementById('edit-id');
  const balanceEl = document.getElementById('cust-balance');
  const planTypeEl = document.getElementById('cust-plan-type');
  const statusEl = document.getElementById('cust-status');

  document.getElementById('qty-container-breakfast').classList.add('hidden');
  document.getElementById('qty-container-lunch').classList.add('hidden');
  document.getElementById('qty-container-dinner').classList.add('hidden');

  if (id) {
    titleEl.textContent = t('customers.edit');
    const c = dataRegistry.getCustomers().find(x => x.id === id);
    if (!c) return;

    editIdEl.value = c.id;
    document.getElementById('cust-name').value = c.name;
    document.getElementById('cust-company').value = c.companyName || '';
    document.getElementById('cust-phone').value = c.phone;
    document.getElementById('cust-address').value = c.address || '';
    
    document.getElementById('plan-breakfast').checked = c.breakfast;
    document.getElementById('qty-breakfast').value = c.breakfastQty || 1;
    if (c.breakfast) document.getElementById('qty-container-breakfast').classList.remove('hidden');

    document.getElementById('plan-lunch').checked = c.lunch;
    document.getElementById('qty-lunch').value = c.lunchQty || 1;
    if (c.lunch) document.getElementById('qty-container-lunch').classList.remove('hidden');

    document.getElementById('plan-dinner').checked = c.dinner;
    document.getElementById('qty-dinner').value = c.dinnerQty || 1;
    if (c.dinner) document.getElementById('qty-container-dinner').classList.remove('hidden');

    document.getElementById('cust-start').value = c.start || '';
    document.getElementById('cust-end').value = c.end || '';
    
    let activePlan = 'monthly';
    if (c.isTrial) activePlan = 'trial';
    else if (c.paymentTerm === 'weekly') activePlan = 'weekly';
    planTypeEl.value = activePlan;

    statusEl.value = c.status || 'active';
    document.getElementById('cust-cost').value = c.cost || 0;
    document.getElementById('cust-paid').value = c.paid || 0;
    document.getElementById('cust-notes').value = c.notes || '';
    document.getElementById('cust-staff-id').value = c.staffId || '';
    document.getElementById('cust-evening-staff-id').value = c.eveningStaffId || '';

    const balance = getCustomerBalance(c.cost, c.paid);
    balanceEl.textContent = formatCurrency(balance);
  } else {
    titleEl.textContent = t('customers.addCustomer');
    editIdEl.value = '';
    balanceEl.textContent = '₹0';
    planTypeEl.value = 'monthly';
    statusEl.value = 'active';
  }

  // Collapse advanced options by default
  const advSection = document.getElementById('adv-form-section');
  if (advSection) advSection.classList.add('hidden');
  const chevron = document.getElementById('adv-chevron');
  if (chevron) chevron.classList.remove('rotate-180');

  document.getElementById('customer-modal').style.display = 'flex';
}

/**
 * Handles Form modal submission
 */
export async function saveCustomerForm(event) {
  event.preventDefault();
  const editId = document.getElementById('edit-id').value;
  const name = document.getElementById('cust-name').value.trim();
  const phone = document.getElementById('cust-phone').value.trim();
  const company = document.getElementById('cust-company').value.trim();
  const address = document.getElementById('cust-address').value.trim();
  const planType = document.getElementById('cust-plan-type').value;
  const start = document.getElementById('cust-start').value;
  const end = document.getElementById('cust-end').value;
  const cost = parseFloat(document.getElementById('cust-cost').value) || 0;
  const paid = parseFloat(document.getElementById('cust-paid').value) || 0;
  const notes = document.getElementById('cust-notes').value.trim();
  const staffId = document.getElementById('cust-staff-id').value;
  const eveningStaffId = document.getElementById('cust-evening-staff-id').value;
  const status = document.getElementById('cust-status').value;

  if (!name || !start || !end) {
    alert("Please fill all mandatory fields.");
    return;
  }

  // Duplicate check for new insertions
  if (!editId) {
    const isDuplicate = dataRegistry.getCustomers().some(c => 
      (phone && c.phone === phone) || (name && c.name.toLowerCase() === name.toLowerCase())
    );
    if (isDuplicate) {
      alert("A customer with this name or phone already exists.");
      return;
    }
  }

  const id = editId || "cust_" + Date.now();
  const customer = {
    id,
    name,
    companyName: company,
    phone,
    address,
    breakfast: document.getElementById('plan-breakfast').checked,
    breakfastQty: parseInt(document.getElementById('qty-breakfast').value) || 1,
    lunch: document.getElementById('plan-lunch').checked,
    lunchQty: parseInt(document.getElementById('qty-lunch').value) || 1,
    dinner: document.getElementById('plan-dinner').checked,
    dinnerQty: parseInt(document.getElementById('qty-dinner').value) || 1,
    start,
    end,
    isTrial: planType === 'trial',
    paymentTerm: planType === 'weekly' ? 'weekly' : 'monthly',
    status,
    cost,
    paid,
    notes,
    staffId,
    eveningStaffId,
    ledger: editId ? (dataRegistry.getCustomers().find(c => c.id === editId)?.ledger || []) : [],
    timeline: editId ? (dataRegistry.getCustomers().find(c => c.id === editId)?.timeline || []) : []
  };

  // Log creation/edits inside timelines
  if (!editId) {
    customer.timeline.push({
      date: formatLocalDate(new Date()),
      text: `Registered for plan starting ${start}.`
    });
    customer.ledger.push({
      date: start,
      detail: `Subscription Charge (${planType})`,
      debit: cost,
      credit: 0
    });
    if (paid > 0) {
      customer.ledger.push({
        date: start,
        detail: `Payment Received`,
        debit: 0,
        credit: paid
      });
    }
  }

  try {
    await dbSaveCustomer(customer);
    document.getElementById('customer-modal').style.display = 'none';
    if (window.appCustomers.onRefresh) window.appCustomers.onRefresh();
  } catch (err) {
    alert("Error saving customer data.");
  }
}

/**
 * Triggers deletion verification dialog
 */
export function confirmDelete(id) {
  if (confirm(t('common.confirmDelete'))) {
    dbDeleteCustomer(id).then(() => {
      if (window.appCustomers.onRefresh) window.appCustomers.onRefresh();
    });
  }
}

/**
 * Auto calculations trigger
 */
export function triggerAutoCalculateEndDate() {
  const start = document.getElementById('cust-start').value;
  const planType = document.getElementById('cust-plan-type').value;
  const is6Days = (planType === 'trial' || planType === 'weekly');
  if (start) {
    document.getElementById('cust-end').value = calculateEndDate(start, is6Days);
  }
}

/**
 * Renders Profile Modal Dashboard View
 */
export function viewProfile(id) {
  activeProfileId = id;
  activeProfileTab = 'overview';
  
  const c = dataRegistry.getCustomers().find(x => x.id === id);
  if (!c) return;

  document.getElementById('profile-modal-name').textContent = c.name;
  document.getElementById('profile-modal-company').textContent = c.companyName || 'No Company';
  
  const btnCall = document.getElementById('prof-btn-call');
  if (btnCall) btnCall.href = `tel:${c.phone}`;
  
  const btnWa = document.getElementById('prof-btn-wa');
  if (btnWa) {
    const text = getWhatsAppMessageText(c, getCustomerBalance(c.cost, c.paid), dataRegistry.getSettings().whatsappTemplate);
    btnWa.href = `https://api.whatsapp.com/send?phone=91${c.phone}&text=${encodeURIComponent(text)}`;
  }

  switchProfileTab('overview');
  document.getElementById('customer-profile-modal').style.display = 'flex';
}

/**
 * Swaps profile modal inner tabs
 */
export function switchProfileTab(tabName) {
  activeProfileTab = tabName;
  const tabs = ['overview', 'timeline', 'ledger', 'leaves'];
  
  tabs.forEach(tName => {
    const btn = document.getElementById(`profile-tab-${tName}`);
    const content = document.getElementById(`profile-content-${tName}`);
    if (btn && content) {
      if (tName === tabName) {
        btn.className = "px-4 py-2 font-bold text-emerald-500 border-b-2 border-emerald-500 transition";
        content.classList.remove('hidden');
      } else {
        btn.className = "px-4 py-2 font-bold text-slate-400 hover:text-slate-200 transition";
        content.classList.add('hidden');
      }
    }
  });

  const c = dataRegistry.getCustomers().find(x => x.id === activeProfileId);
  if (!c) return;

  if (tabName === 'overview') {
    document.getElementById('prof-name').textContent = c.name;
    document.getElementById('prof-phone').textContent = c.phone;
    document.getElementById('prof-company').textContent = c.companyName || 'None';
    document.getElementById('prof-address').textContent = c.address || 'No Address';
    document.getElementById('prof-sub-type').textContent = c.isTrial ? '6 Days Trial' : (c.paymentTerm === 'weekly' ? 'Weekly Plan' : 'Monthly Plan');
    document.getElementById('prof-start').textContent = c.start || '-';
    document.getElementById('prof-end').textContent = c.end || '-';
    document.getElementById('prof-notes').textContent = c.notes || 'No notes.';
    
    document.getElementById('prof-qty-b').textContent = c.breakfast ? c.breakfastQty : '0';
    document.getElementById('prof-qty-l').textContent = c.lunch ? c.lunchQty : '0';
    document.getElementById('prof-qty-d').textContent = c.dinner ? c.dinnerQty : '0';

    const drivers = dataRegistry.getStaff();
    const morningD = drivers.find(d => d.id === c.staffId);
    const eveningD = drivers.find(d => d.id === c.eveningStaffId);
    document.getElementById('prof-morning-driver').textContent = morningD ? morningD.name : 'Unassigned';
    document.getElementById('prof-evening-driver').textContent = eveningD ? eveningD.name : 'Unassigned';
    
    const badge = document.getElementById('prof-status-badge');
    badge.className = `px-2 py-0.5 text-white rounded font-bold uppercase tracking-wider text-[10px] ${
      c.status === 'active' ? 'bg-emerald-600' : (c.status === 'inactive' ? 'bg-amber-600' : 'bg-rose-600')
    }`;
    badge.textContent = c.status || 'ACTIVE';
  } 
  else if (tabName === 'timeline') {
    const list = document.getElementById('prof-timeline-list');
    list.innerHTML = '';
    const timeline = c.timeline || [];
    if (timeline.length === 0) {
      list.innerHTML = `<div class="text-slate-400 italic py-2">No timeline activities logs.</div>`;
      return;
    }
    timeline.forEach(t => {
      const el = document.createElement('div');
      el.className = "relative pl-6 pb-4 border-l border-slate-700 last:border-0";
      el.innerHTML = `
        <span class="absolute left-[-4px] top-1.5 w-2 h-2 rounded-full bg-emerald-500"></span>
        <span class="block text-[10px] text-slate-400 font-bold">${t.date}</span>
        <p class="text-slate-200 mt-0.5 leading-snug font-medium">${t.text}</p>
      `;
      list.appendChild(el);
    });
  } 
  else if (tabName === 'ledger') {
    document.getElementById('prof-financial-cost').textContent = formatCurrency(c.cost);
    document.getElementById('prof-financial-paid').textContent = formatCurrency(c.paid);
    document.getElementById('prof-financial-due').textContent = formatCurrency(getCustomerBalance(c.cost, c.paid));

    const tbody = document.getElementById('prof-ledger-tbody');
    tbody.innerHTML = '';
    const ledger = c.ledger || [];
    if (ledger.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-slate-400 italic">No ledger audits logs.</td></tr>`;
      return;
    }
    ledger.forEach(l => {
      const tr = document.createElement('tr');
      tr.className = "border-b border-slate-700/50 hover:bg-slate-700/20";
      tr.innerHTML = `
        <td class="p-2 text-slate-400 font-medium">${l.date}</td>
        <td class="p-2 text-slate-200 font-semibold">${l.detail}</td>
        <td class="p-2 text-right font-bold ${l.credit > 0 ? 'text-emerald-400' : 'text-rose-400'}">
          ${l.credit > 0 ? `+${formatCurrency(l.credit)}` : `-${formatCurrency(l.debit)}`}
        </td>
      `;
      tbody.appendChild(tr);
    });
  } 
  else if (tabName === 'leaves') {
    const tbody = document.getElementById('prof-leaves-tbody');
    tbody.innerHTML = '';
    const leaves = dataRegistry.getLeaves().filter(l => l.custId === activeProfileId);
    
    if (leaves.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-slate-400 italic">No leaves logs found.</td></tr>`;
      return;
    }
    leaves.forEach(l => {
      const tr = document.createElement('tr');
      tr.className = "border-b border-slate-700/50 hover:bg-slate-700/20";
      tr.innerHTML = `
        <td class="p-2 text-slate-200 font-semibold">${l.date}</td>
        <td class="p-2 text-emerald-400 font-bold">${l.extendDate}</td>
        <td class="p-2 text-center">
          <button onclick="window.appCustomers.deleteLeave('${l.id}')" class="text-rose-500 hover:text-rose-700 transition">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }
}

/**
 * Payments record handler
 */
export async function triggerProfilePayment() {
  const c = dataRegistry.getCustomers().find(x => x.id === activeProfileId);
  if (!c) return;

  const outstanding = getCustomerBalance(c.cost, c.paid);
  const amountStr = prompt(`Enter received payment amount (Outstanding: ₹${outstanding}):`, outstanding);
  if (amountStr === null) return;

  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) {
    alert("Please enter a valid positive payment amount.");
    return;
  }

  c.paid = (c.paid || 0) + amount;
  c.ledger.push({
    date: formatLocalDate(new Date()),
    detail: "Payment Received via Profile Panel",
    credit: amount,
    debit: 0
  });
  c.timeline.push({
    date: formatLocalDate(new Date()),
    text: `Recorded payment of ${formatCurrency(amount)}. New balance: ${formatCurrency(getCustomerBalance(c.cost, c.paid))}.`
  });

  try {
    await dbSaveCustomer(c);
    switchProfileTab('ledger');
    if (window.appCustomers.onRefresh) window.appCustomers.onRefresh();
  } catch (err) {
    alert("Error updating payment ledger.");
  }
}

/**
 * Leave deletion handler inside profile leaves tab
 */
export async function deleteLeave(id) {
  if (!confirm("Are you sure you want to delete this leave record?")) return;
  const leaveObj = dataRegistry.getLeaves().find(l => l.id === id);
  if (!leaveObj) return;

  const customer = dataRegistry.getCustomers().find(c => c.id === leaveObj.custId);
  if (!customer) return;

  try {
    await dbDeleteLeave(id);
    
    // Simulate updating registry locally to compute self-healing end date
    const updatedLeaves = dataRegistry.getLeaves().filter(l => l.id !== id);
    dataRegistry.setLeaves(updatedLeaves);

    // Self-healing: recalculate end date and sync customer
    customer.end = recalculateCustomerEndDate(customer);
    customer.timeline.push({
      date: formatLocalDate(new Date()),
      text: `Deleted leave record starting ${leaveObj.date.split(' ')[0]}. Expiry shifted to ${customer.end}.`
    });
    
    await dbSaveCustomer(customer);
    switchProfileTab('leaves');
    if (window.appCustomers.onRefresh) window.appCustomers.onRefresh();
  } catch (e) {
    alert("Error deleting leave record.");
  }
}

export function closeFormModal() {
  const modal = document.getElementById('customer-modal');
  if (modal) modal.style.display = 'none';
}

export function toggleQty(meal) {
  const chk = document.getElementById(`plan-${meal}`).checked;
  const container = document.getElementById(`qty-container-${meal}`);
  if (container) {
    if (chk) container.classList.remove('hidden');
    else container.classList.add('hidden');
  }
}

export function toggleAdvancedForm() {
  const section = document.getElementById('adv-form-section');
  const chevron = document.getElementById('adv-chevron');
  if (section) {
    if (section.classList.contains('hidden')) {
      section.classList.remove('hidden');
      if (chevron) chevron.classList.add('rotate-180');
    } else {
      section.classList.add('hidden');
      if (chevron) chevron.classList.remove('rotate-180');
    }
  }
}

// Global hookup
window.appCustomers = {
  render: renderCustomersView,
  setFilter: setCustomerFilter,
  openEditForm,
  closeFormModal,
  toggleQty,
  saveCustomerForm,
  confirmDelete,
  triggerAutoCalculateEndDate,
  viewProfile,
  switchProfileTab,
  triggerProfilePayment,
  deleteLeave,
  toggleAdvancedForm,
  onRefresh: null
};

