// 🌟 CORE APPLICATION BOOTSTRAPPER (MAIN CONTROLLER)
import { db, auth } from "./core/firebase-init.js";
import { onAuthChange, loginUser, logoutUser, hasTabAccess } from "./core/auth.js";
import { initTranslations, translatePage, toggleLanguage, currentLang, t } from "./core/i18n.js";
import { getCached, setCached, KEYS, saveAllOfflineBackup } from "./core/cache.js";

import { dataRegistry } from "./core/accessors.js";
import { designTokens } from "../design/tokens.js";

// Real-time Firestore adapters import
import { 
  subscribeCustomers, 
  subscribeLeaves, 
  subscribeSkips, 
  subscribeAlternates 
} from "./customers/customers-firestore.js";
import { 
  subscribeDeliveriesForDate, 
  subscribeStaffList 
} from "./delivery/delivery-firestore.js";
import { 
  subscribeVehicles, 
  subscribeTrips 
} from "./vehicles/vehicles-firestore.js";
import { 
  subscribeExpenses 
} from "./finance/finance-firestore.js";

// Domain UI Render Engines registration
import "./customers/customers-render.js";
import "./delivery/delivery-render.js";
import "./kitchen/kitchen-render.js";
import "./vehicles/vehicles-render.js";
import "./finance/finance-render.js";
import "./admin/admin-render.js";
import { initAIChatWidget } from "./ai/ai-render.js";



// Active Tab navigation state
let activeTab = 'dashboard';

/**
 * Renders all views using the isolated safeRun crash guard wrapper
 */
export function renderAll() {
  function safeRun(name, fn) {
    try {
      fn();
    } catch (e) {
      console.error(`Crash Isolation: Render fail in [${name}] module.`, e);
    }
  }

  // Draw shared stats summary counts on header metrics board
  safeRun('renderHeaderStats', () => {
    const customers = dataRegistry.getCustomers() || [];
    const expenses = dataRegistry.getExpenses() || [];
    const settings = dataRegistry.getSettings() || {};
    
    const countCust = document.getElementById('stat-total-cust');
    if (countCust) countCust.textContent = customers.filter(c => c.status === 'active').length;

    const earningsEl = document.getElementById('stat-total-earnings');
    if (earningsEl) {
      const sumEarn = customers.reduce((acc, c) => acc + (parseFloat(c.paid) || 0), 0);
      earningsEl.textContent = '₹' + sumEarn.toLocaleString('en-IN');
    }

    const expEl = document.getElementById('stat-total-expenses');
    if (expEl) {
      const sumExp = expenses.reduce((acc, e) => acc + (parseFloat(e.amount) || 0), 0);
      expEl.textContent = '₹' + sumExp.toLocaleString('en-IN');
    }
  });

  // Call domain-specific renders depending on currently selected views
  if (activeTab === 'customers' && window.appCustomers?.render) {
    safeRun('renderCustomers', () => window.appCustomers.render('customer-cards-list', 'search-bar'));
  }
  if (activeTab === 'delivery' && window.appDelivery?.render) {
    safeRun('renderDelivery', () => window.appDelivery.render('delivery-list'));
  }
  if (activeTab === 'kitchen' && window.appKitchen?.render) {
    safeRun('renderKitchen', () => window.appKitchen.render());
  }
  if (activeTab === 'vehicles' && window.appVehicles?.render) {
    safeRun('renderVehicles', () => window.appVehicles.render());
  }
  if (activeTab === 'finance' && window.appFinance?.render) {
    safeRun('renderFinanceExpenses', () => window.appFinance.render('expense-history-table'));
    safeRun('renderFinanceProfit', () => window.appFinance.renderProfit());
  }
  if (activeTab === 'admin' && window.appAdmin?.renderExcel) {
    safeRun('renderAdminExcel', () => window.appAdmin.renderExcel());
    safeRun('renderAdminSettings', () => window.appAdmin.renderSettings());
  }
}

/**
 * Decoupled switchView router
 */
export function switchView(viewId) {
  // Check auth permission gates before switching view
  if (!hasTabAccess(viewId) && viewId !== 'dashboard' && viewId !== 'settings') {
    alert(t('auth.unauthorized'));
    return;
  }

  activeTab = viewId;

  // Toggle view containers
  const views = ['dashboard', 'customers', 'delivery', 'leave', 'kitchen', 'staff', 'expenses', 'profit', 'reports', 'admin', 'settings', 'vehicles', 'finance'];
  views.forEach(v => {
    const el = document.getElementById('view-' + v);
    if (el) el.classList.add('hidden');
  });

  const activeEl = document.getElementById('view-' + viewId);
  if (activeEl) activeEl.classList.remove('hidden');

  // Toggle CSS highlight class on tabs
  views.forEach(tName => {
    const tabEl = document.getElementById(`d-tab-${tName}`);
    if (tabEl) {
      if (tName === viewId) {
        tabEl.className = "flex-1 py-2.5 text-center text-xs font-bold rounded-lg bg-emerald-600 text-white shadow";
      } else {
        tabEl.className = "flex-1 py-2.5 text-center text-xs font-bold rounded-lg text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800 transition-all";
      }
    }
  });

  // Re-run screen renders
  renderAll();
}

/**
 * Boots the design variables into CSS variables in document root
 */
function initDesignTokens() {
  const root = document.documentElement;
  const colors = designTokens.colors;
  
  root.style.setProperty('--brand-primary', colors.brand.primary);
  root.style.setProperty('--brand-primary-hover', colors.brand.primaryHover);
  root.style.setProperty('--brand-primary-bg', colors.brand.primaryBg);
  
  // Apply font family
  root.style.fontFamily = designTokens.typography.fontFamily;
}

/**
 * Sign In Submission Handler
 */
async function handleSignIn(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-password').value;
  
  const submitBtn = document.getElementById('btn-login-submit');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = t('common.loading');
  }

  try {
    await loginUser(email, pass);
    localStorage.setItem('hh_login_email', email);
    document.getElementById('login-modal').classList.add('hidden');
  } catch (err) {
    alert(`Authentication Error: [${err.code || err.message}]`);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = t('auth.signIn');
    }
  }
}


/**
 * Main application bootstrap listener
 */
window.addEventListener('DOMContentLoaded', async () => {
  // Initialize style variables
  initDesignTokens();
  
  // Load Translations files
  await initTranslations();
  translatePage();

  // Pre-fill last logged-in email or admin default
  const savedEmail = localStorage.getItem('hh_login_email') || 'admin@hhfoods.com';
  const emailInput = document.getElementById('login-email');
  if (emailInput) {
    emailInput.value = savedEmail;
  }

  // Pre-fill default placeholder password
  const passwordInput = document.getElementById('login-password');
  if (passwordInput) {
    passwordInput.value = '123456';
  }

  // Load Offline Cache data initially
  loadCachedOfflineData();

  // Initialize AI Chat assistant drawer widget
  initAIChatWidget();



  // Setup Firebase Auth session gates listener
  onAuthChange((user, role) => {
    const loginModal = document.getElementById('login-modal');
    if (!user) {

      if (loginModal) loginModal.classList.remove('hidden');
    } else {
      if (loginModal) loginModal.classList.add('hidden');
      
      // Setup connection listener and starts snaps
      initDatabaseSubscriptions();
      
      // Update interface based on role gating
      updateRoleBasedInterface(role);
      
      switchView('dashboard');
    }
  });

  // Attach refresh updates hooks to domain renders
  if (window.appCustomers) window.appCustomers.onRefresh = renderAll;
  if (window.appDelivery) window.appDelivery.onRefresh = renderAll;
  if (window.appFinance) window.appFinance.onRefresh = renderAll;
  
  // Form hooks
  document.getElementById('login-form')?.addEventListener('submit', handleSignIn);
  document.getElementById('customer-form')?.addEventListener('submit', window.appCustomers.saveCustomerForm);
  document.getElementById('expense-form')?.addEventListener('submit', window.appFinance.saveExpenseForm);
  document.getElementById('settings-form')?.addEventListener('submit', window.appAdmin.saveSettings);
  document.getElementById('trip-form')?.addEventListener('submit', window.appVehicles.saveTripForm);
  document.getElementById('vehicle-form')?.addEventListener('submit', window.appVehicles.saveVehicleForm);

  // Hook translation Switcher
  const langToggleBtn = document.getElementById('lang-toggle-btn');
  if (langToggleBtn) {
    langToggleBtn.onclick = toggleLanguage;
  }
  
  window.addEventListener('languageChanged', () => {
    translatePage();
    renderAll();
  });
});

function loadCachedOfflineData() {
  dataRegistry.setCustomers(getCached(KEYS.CUSTOMERS, []));
  dataRegistry.setLeaves(getCached(KEYS.LEAVES, []));
  dataRegistry.setExpenses(getCached(KEYS.EXPENSES, []));
  dataRegistry.setStaff(getCached(KEYS.STAFF, []));
  dataRegistry.setVehicles(getCached(KEYS.VEHICLES, []));
  dataRegistry.setTrips(getCached(KEYS.TRIPS, []));
  dataRegistry.setSkips(getCached(KEYS.SKIPS, []));
  dataRegistry.setAlternates(getCached(KEYS.ALTERNATES, []));
  dataRegistry.setSettings(getCached(KEYS.SETTINGS, {}));
}

function initDatabaseSubscriptions() {
  const handleUpdate = () => {
    saveAllOfflineBackup({
      customers: dataRegistry.getCustomers(),
      leaves: dataRegistry.getLeaves(),
      expenses: dataRegistry.getExpenses(),
      staffList: dataRegistry.getStaff(),
      vehicles: dataRegistry.getVehicles(),
      trips: dataRegistry.getTrips(),
      skips: dataRegistry.getSkips(),
      alternateDays: dataRegistry.getAlternates(),
      settings: dataRegistry.getSettings(),
      todayDateStr: formatLocalDate(new Date()),
      deliveryStatus: dataRegistry.getDeliveries()
    });
    renderAll();
  };

  const handleErr = (err) => {
    console.error("Firestore sync error", err);
    alert(`Firestore Sync Error: [${err.code || err.message}]`);
  };

  subscribeCustomers(list => { dataRegistry.setCustomers(list); handleUpdate(); }, handleErr);
  subscribeLeaves(list => { dataRegistry.setLeaves(list); handleUpdate(); }, handleErr);
  subscribeSkips(list => { dataRegistry.setSkips(list); handleUpdate(); }, handleErr);
  subscribeAlternates(list => { dataRegistry.setAlternates(list); handleUpdate(); }, handleErr);
  subscribeExpenses(list => { dataRegistry.setExpenses(list); handleUpdate(); }, handleErr);
  subscribeVehicles(list => { dataRegistry.setVehicles(list); handleUpdate(); }, handleErr);
  subscribeTrips(list => { dataRegistry.setTrips(list); handleUpdate(); }, handleErr);
  subscribeStaffList(list => { dataRegistry.setStaff(list); handleUpdate(); }, handleErr);

  const todayStr = formatLocalDate(new Date());
  subscribeDeliveriesForDate(todayStr, map => { dataRegistry.setDeliveries(map); handleUpdate(); }, handleErr);
}


function updateRoleBasedInterface(role) {
  const tabs = ['dashboard', 'customers', 'delivery', 'kitchen', 'vehicles', 'finance', 'admin', 'settings'];
  tabs.forEach(tName => {
    const el = document.getElementById(`d-tab-${tName}`);
    if (el) {
      const allowed = hasTabAccess(tName) || tName === 'dashboard' || tName === 'settings';
      if (allowed) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    }
  });

  const roleTextEl = document.getElementById('user-role-display');
  if (roleTextEl) {
    roleTextEl.textContent = role ? role.toUpperCase() : 'NO ROLE';
  }
}

// Global exposure
window.appCore = {
  switchView,
  logout: logoutUser
};

// 🌟 FLOATING ACTION BUTTON (FAB) SHORTCUTS IMPLEMENTATION
export function toggleFabMenu() {
  const menu = document.getElementById('fab-menu');
  const icon = document.getElementById('fab-plus-icon');
  if (menu) {
    if (menu.classList.contains('hidden')) {
      menu.classList.remove('hidden');
      setTimeout(() => {
        menu.classList.remove('opacity-0', 'scale-90');
        menu.classList.add('opacity-100', 'scale-100');
      }, 10);
      if (icon) icon.classList.add('rotate-45');
    } else {
      menu.classList.remove('opacity-100', 'scale-100');
      menu.classList.add('opacity-0', 'scale-90');
      setTimeout(() => {
        menu.classList.add('hidden');
      }, 300);
      if (icon) icon.classList.remove('rotate-45');
    }
  }
}

export function openAddModal() {
  if (window.appCustomers?.openEditForm) {
    window.appCustomers.openEditForm();
  } else {
    alert("Customers registry module is not loaded yet.");
  }
}

export function quickAddExpense() {
  switchView('finance');
  setTimeout(() => {
    document.getElementById('exp-item')?.focus();
  }, 200);
}

export function quickAddLeave() {
  switchView('delivery');
  alert("Please select the 'Action' button on any customer checklist card in the Deliveries list to log a leave or alternate makeup date.");
}

// Bind to window object for inline HTML onclick attributes compatibility
window.toggleFabMenu = toggleFabMenu;
window.openAddModal = openAddModal;
window.quickAddExpense = quickAddExpense;
window.quickAddLeave = quickAddLeave;

