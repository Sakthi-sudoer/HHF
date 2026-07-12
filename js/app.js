// 🌟 MAIN CONTROLLER & APPLICATION BOOTSTRAPPER

// 1. Navigation / View switching
window.isControlUnlocked = false;

window.switchView = function(viewId) {
    if (viewId === 'control' && !window.isControlUnlocked) {
        // Show password prompt modal
        document.getElementById('password-prompt-modal').style.display = 'flex';
        document.getElementById('admin-password-input').value = '';
        document.getElementById('admin-password-input').focus();
        return; // Don't switch view yet!
    }

    if (viewId === 'settings' && typeof window.renderSettingsView === 'function') {
        window.renderSettingsView();
    }

    window.activeView = viewId;
    
    // Auto-lock when switching away from control panel
    if (viewId !== 'control') {
        window.isControlUnlocked = false;
    }
    
    // Hide all views
    const views = ['customers', 'delivery', 'leave', 'kitchen', 'staff', 'expenses', 'control', 'settings'];
    views.forEach(v => {
        const el = document.getElementById('view-' + v);
        if (el) el.classList.add('hidden');
    });
    
    // Show active view
    const activeEl = document.getElementById('view-' + viewId);
    if (activeEl) activeEl.classList.remove('hidden');
    
    // Update Desktop Tabs class
    views.forEach(t => {
        const dEl = document.getElementById('d-tab-' + t);
        if (dEl) {
            if (t === viewId) {
                dEl.className = "flex-1 py-2.5 text-center text-xs font-bold rounded-lg bg-emerald-600 text-white shadow transition-all";
            } else {
                dEl.className = "flex-1 py-2.5 text-center text-xs font-bold rounded-lg text-slate-500 hover:bg-slate-50 transition-all";
            }
        }
    });

    // Update Bottom Sticky Mobile Navigation
    const mobileNavs = ['customers', 'delivery', 'leave', 'expenses', 'control', 'settings'];
    mobileNavs.forEach(nav => {
        const mEl = document.getElementById('m-nav-' + nav);
        if (mEl) {
            const mappedViewId = (viewId === 'kitchen') ? 'leave' : viewId;
            if (nav === mappedViewId) {
                mEl.classList.add('text-emerald-600', 'font-bold');
                mEl.classList.remove('text-slate-400');
            } else {
                mEl.classList.remove('text-emerald-600', 'font-bold');
                mEl.classList.add('text-slate-400');
            }
        }
    });

    // Rerender UI components of that view
    renderAll();
};

// 2. Dialog Modal Controls
window.openAddModal = function() {
    document.getElementById('modal-title').innerText = "புதிய வாடிக்கையாளர்";
    document.getElementById('customer-form').reset();
    document.getElementById('edit-id').value = '';
    document.getElementById('cust-balance').innerText = '₹0';
    
    // Hide meal quantities input boxes initially
    toggleQtyInput('breakfast');
    toggleQtyInput('lunch');
    toggleQtyInput('dinner');
    
    document.getElementById('customer-modal').style.display = 'flex';
};

window.openEditModal = function(id) {
    const c = window.customers.find(item => item.id === id);
    if (!c) return;
    
    document.getElementById('modal-title').innerText = "வாடிக்கையாளர் விவரம் திருத்து";
    document.getElementById('edit-id').value = c.id;
    document.getElementById('cust-name').value = c.name;
    document.getElementById('cust-company').value = c.companyName || '';
    document.getElementById('cust-phone').value = c.phone;
    document.getElementById('cust-address').value = c.address || '';
    
    document.getElementById('plan-breakfast').checked = c.breakfast || false;
    document.getElementById('qty-breakfast').value = c.breakfastQty || 1;
    toggleQtyInput('breakfast');
    
    document.getElementById('plan-lunch').checked = c.lunch || false;
    document.getElementById('qty-lunch').value = c.lunchQty || 1;
    toggleQtyInput('lunch');
    
    document.getElementById('plan-dinner').checked = c.dinner || false;
    document.getElementById('qty-dinner').value = c.dinnerQty || 1;
    toggleQtyInput('dinner');
    
    document.getElementById('cust-start').value = c.start || '';
    document.getElementById('cust-end').value = c.end || '';
    document.getElementById('cust-istrial').checked = c.isTrial;
    document.getElementById('cust-cost').value = c.cost || 0;
    document.getElementById('cust-paid').value = c.paid || 0;
    document.getElementById('cust-notes').value = c.notes || '';
    document.getElementById('cust-staff-id').value = c.staffId || '';
    
    calculateBalance();
    document.getElementById('customer-modal').style.display = 'flex';
};

window.closeModal = function() {
    document.getElementById('customer-modal').style.display = 'none';
};

window.calculateBalance = function() {
    const cost = parseFloat(document.getElementById('cust-cost').value) || 0;
    const paid = parseFloat(document.getElementById('cust-paid').value) || 0;
    document.getElementById('cust-balance').innerText = '₹' + getCustomerBalance(cost, paid);
};

window.toggleQtyInput = function(meal) {
    const checkbox = document.getElementById('plan-' + meal);
    const container = document.getElementById('qty-container-' + meal);
    if (container && checkbox) {
        container.classList.toggle('hidden', !checkbox.checked);
    }
};

window.onPaymentTermChanged = function() {
    const isTrial = document.getElementById('cust-istrial').checked;
    const biz = window.appSettings || {};
    if (isTrial) {
        document.getElementById('cust-cost').value = biz.priceTrial || 1200;
        document.getElementById('cust-paid').value = biz.priceTrial || 1200;
    } else {
        document.getElementById('cust-cost').value = biz.priceMonthly || 5800;
        document.getElementById('cust-paid').value = biz.priceMonthly || 5800;
    }
    calculateBalance();
};

window.onTrialToggle = function() {
    window.onPaymentTermChanged();
};

window.autoCalculateEndDate = function() {
    const startDateStr = document.getElementById('cust-start').value;
    if (!startDateStr) {
        showToast("துவக்க தேதியை தேர்வு செய்க!", "alert");
        return;
    }
    const isTrial = document.getElementById('cust-istrial').checked;
    document.getElementById('cust-end').value = calculateEndDate(startDateStr, isTrial);
    showToast(`முடிவுத் தேதி ${isTrial ? 6 : 26} நாட்களுக்குக் கணக்கிடப்பட்டது.`);
};

// 3. Save Customer Submission Flow
window.saveCustomer = async function(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('btn-save-customer');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> சேமிக்கப்படுகிறது...';
    }

    const idInput = document.getElementById('edit-id').value;
    const nameInput = document.getElementById('cust-name').value.trim();
    const phoneInput = document.getElementById('cust-phone').value.trim();

    // Prevent duplicate details on new inserts
    if (!idInput) {
        const isDuplicate = window.customers.some(c => c.phone === phoneInput || c.name.toLowerCase() === nameInput.toLowerCase());
        if (isDuplicate) {
            showToast("இந்த வாடிக்கையாளர் (பெயர் அல்லது போன்) ஏற்கனவே பட்டியலில் உள்ளார்!", "alert");
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'சேமி / Save';
            }
            return;
        }
    }

    const id = idInput || "cust_" + Date.now();
    const obj = {
        id,
        name: nameInput,
        companyName: document.getElementById('cust-company').value.trim(),
        phone: phoneInput,
        address: document.getElementById('cust-address').value,
        paymentTerm: "monthly",
        breakfast: document.getElementById('plan-breakfast').checked,
        breakfastQty: parseInt(document.getElementById('qty-breakfast').value) || 1,
        lunch: document.getElementById('plan-lunch').checked,
        lunchQty: parseInt(document.getElementById('qty-lunch').value) || 1,
        dinner: document.getElementById('plan-dinner').checked,
        dinnerQty: parseInt(document.getElementById('qty-dinner').value) || 1,
        start: document.getElementById('cust-start').value,
        end: document.getElementById('cust-end').value,
        isTrial: document.getElementById('cust-istrial').checked,
        cost: parseFloat(document.getElementById('cust-cost').value) || 0,
        paid: parseFloat(document.getElementById('cust-paid').value) || 0,
        notes: document.getElementById('cust-notes').value,
        staffId: document.getElementById('cust-staff-id').value || ""
    };

    try {
        // Sync with Firestore collection
        await dbSaveCustomer(obj);
        
        // Sync to google sheets (optional background process)
        if (typeof syncToGoogleSheet === 'function') {
            syncToGoogleSheet(obj);
        }
        
        closeModal();
        showToast("வாடிக்கையாளர் சேமிக்கப்பட்டது!");
    } catch (err) {
        showToast("தரவு சேமிப்பில் தோல்வி!", "error");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'சேமி / Save';
        }
    }
};

// 4. Save Leaves request submission flow
window.saveLeave = async function(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) {
        btn.disabled = true;
        btn.innerText = "Loading...";
    }
    
    const custId = document.getElementById('leave-cust-id').value;
    const targetCustomer = window.customers.find(item => item.id === custId);
    const date = document.getElementById('leave-date').value;
    const extendDate = calculateContinuousLeaveExtension();
    
    if (!targetCustomer || !extendDate) {
        showToast("தவறான லீவ் கணக்கீடு!", "alert");
        if (btn) {
            btn.disabled = false;
            btn.innerText = "லீவ் சேமி";
        }
        return;
    }
    
    const leaveObj = {
        id: "leave_" + Date.now(),
        custId,
        custName: targetCustomer.name,
        date: date + ` (${document.getElementById('leave-days-count').value} days)`,
        extendDate
    };

    // Update customer plan end date dynamically in database
    targetCustomer.end = extendDate;

    try {
        await dbSaveLeave(leaveObj);
        await dbSaveCustomer(targetCustomer);
        
        document.getElementById('leave-form').reset();
        document.getElementById('leave-days-count').value = 1;
        showToast("தொடர் விடுப்பு பதிவு செய்யப்பட்டது!");
    } catch (err) {
        showToast("விடுப்பு பதிவு தோல்வி!", "error");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerText = "லீவ் சேமி";
        }
    }
};

// 5. Save Expense submission flow
window.saveExpense = async function(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) {
        btn.disabled = true;
        btn.innerText = "Loading...";
    }
    
    const expObj = {
        id: "exp_" + Date.now(),
        date: document.getElementById('exp-date').value,
        item: document.getElementById('exp-item').value,
        amount: parseFloat(document.getElementById('exp-amount').value) || 0,
        category: document.getElementById('exp-category').value
    };

    try {
        await dbSaveExpense(expObj);
        document.getElementById('expense-form').reset();
        showToast("செலவு கணக்கு சேர்க்கப்பட்டது!");
    } catch (err) {
        showToast("செலவு கணக்கு பதிவு தோல்வி!", "error");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerText = "செலவைச் சேமி";
        }
    }
};

// 6. Save Staff submission flow
window.saveStaff = async function(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) {
        btn.disabled = true;
        btn.innerText = "Loading...";
    }
    
    const staffObj = {
        id: "st_" + Date.now(),
        name: document.getElementById('staff-name').value.trim()
    };

    try {
        await dbSaveStaff(staffObj);
        document.getElementById('staff-form').reset();
        showToast("புதிய டெலிவரி ஆள் சேர்க்கப்பட்டார்!");
    } catch (err) {
        showToast("ஊழியர் பதிவு தோல்வி!", "error");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerText = "டெலிவரி ஆள் சேமி";
        }
    }
};

// 7. Delete Record Confirmation Dialog workflow
let activeDeleteId = null;
let activeDeleteType = '';

window.triggerDeleteConfirm = function(id, type) {
    activeDeleteId = id;
    activeDeleteType = type;
    document.getElementById('confirm-modal').style.display = 'flex';
};

window.closeConfirmModal = function() {
    document.getElementById('confirm-modal').style.display = 'none';
};

document.getElementById('confirm-yes-btn').onclick = async function() {
    const btn = this;
    btn.disabled = true;
    btn.innerText = "Deleting...";

    try {
        if (activeDeleteType === 'customer') {
            await dbDeleteCustomer(activeDeleteId);
        } else if (activeDeleteType === 'leave') {
            await dbDeleteLeave(activeDeleteId);
        } else if (activeDeleteType === 'expense') {
            await dbDeleteExpense(activeDeleteId);
        } else if (activeDeleteType === 'skip') {
            await dbDeleteSkip(activeDeleteId);
        } else if (activeDeleteType === 'staff') {
            // Check if staff is assigned to any customer
            const isAssigned = window.customers.some(c => c.staffId === activeDeleteId);
            if (isAssigned) {
                showToast("இந்த ஊழியர் வாடிக்கையாளருக்கு ஒதுக்கப்பட்டுள்ளார்! முதலில் மாற்றவும்.", "alert");
                closeConfirmModal();
                return;
            }
            await dbDeleteStaff(activeDeleteId);
        }
        
        closeConfirmModal();
        showToast("பதிவு நீக்கப்பட்டது!");
    } catch (err) {
        showToast("பதிவு நீக்குவதில் தோல்வி!", "error");
    } finally {
        btn.disabled = false;
        btn.innerText = "நீக்கு";
    }
};

// 8. Google Sheet Export Actions
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbykxBQj5Jy67TcfeWZJLI9avtMZx9HbS2vsgLVfB6l-mfZfpPvUBLBTE2ZzPJd_c6sylQ/exec";

function syncToGoogleSheet(customerData) {
    if (!GOOGLE_SHEET_URL) return;
    fetch(GOOGLE_SHEET_URL, { 
        method: "POST", 
        mode: "no-cors", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(customerData) 
    }).catch(e => console.error("Sheet Sync Error: ", e));
}

window.exportAllToSheet = async function() {
    if (window.customers.length === 0) {
        showToast("தரவுகள் எதுவும் இல்லை!", "alert");
        return;
    }
    if (!confirm("அனைத்து " + window.customers.length + " கஸ்டமர் தரவுகளையும் கூகுள் ஷீட்டிற்கு அனுப்பவா?")) {
        return;
    }
    
    const btn = document.querySelector('button[onclick="exportAllToSheet()"]');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Syncing...';
    }

    showToast("தரவுகள் ஷீட்டிற்கு அனுப்பப்படுகிறது...", "alert");
    
    for (let i = 0; i < window.customers.length; i++) {
        try {
            await fetch(GOOGLE_SHEET_URL, { 
                method: "POST", 
                mode: "no-cors", 
                headers: { "Content-Type": "application/json" }, 
                body: JSON.stringify(window.customers[i]) 
            });
            // Delay to prevent sheet macro rate limits
            await new Promise(r => setTimeout(r, 600));
        } catch (e) {
            console.error("Error at index " + i, e);
        }
    }
    
    showToast("முழுமையாக ஷீட்டிற்கு அனுப்பப்பட்டது!");
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-brands fa-google-drive mr-1"></i> Sync All to Sheet';
    }
};

// 9. Delivery plan UI Helpers
window.activeMealSession = 'all';
window.setMealSession = function(session) {
    window.activeMealSession = session;
    
    // Toggle active state CSS styles
    const sessions = ['all', 'breakfast', 'lunch', 'dinner'];
    sessions.forEach(s => {
        const id = s === 'all' ? 'meal-all' : s === 'breakfast' ? 'meal-b' : s === 'lunch' ? 'meal-l' : 'meal-d';
        const el = document.getElementById(id);
        if (el) {
            if (s === session) {
                el.className = "flex-1 py-2 text-center text-xs font-bold rounded-lg bg-emerald-600 text-white shadow transition-all";
            } else {
                el.className = "flex-1 py-2 text-center text-xs font-bold rounded-lg text-slate-500 hover:bg-slate-50 transition-all";
            }
        }
    });
    
    renderDeliveryChecklist();
};

// Dropdowns updates
window.updateLeaveDropdown = function() {
    const s = document.getElementById('leave-cust-id');
    const sSkip = document.getElementById('skip-cust-id');
    
    const optionsHtml = '<option value="">தேர்வு செய்க...</option>' + 
        [...window.customers]
            .sort((a,b) => a.name.localeCompare(b.name))
            .map(c => `<option value="${c.id}">${c.name}</option>`)
            .join('');
            
    if (s) s.innerHTML = optionsHtml;
    if (sSkip) sSkip.innerHTML = optionsHtml;
};

window.updateStaffDropdowns = function() {
    const s1 = document.getElementById('cust-staff-id');
    const s2 = document.getElementById('route-staff-filter');
    const sBulk = document.getElementById('bulk-staff-assign');
    
    const staffOptionsHtml = window.staffList.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    
    if (s1) {
        s1.innerHTML = '<option value="">தேர்வு செய்க...</option>' + staffOptionsHtml;
    }
    if (s2) {
        s2.innerHTML = '<option value="all">அனைத்து ஊழியர்கள்</option>' + staffOptionsHtml;
    }
    if (sBulk) {
        sBulk.innerHTML = '<option value="">Assign Delivery Staff...</option>' + staffOptionsHtml;
    }
};

// Password Modal actions
window.verifyAdminPassword = function() {
    const pwdInput = document.getElementById('admin-password-input');
    const pwd = pwdInput.value;
    const ADMIN_PASSWORD = window.appSettings.adminPassword || "1234";
    
    if (pwd === ADMIN_PASSWORD) {
        window.isControlUnlocked = true;
        document.getElementById('password-prompt-modal').style.display = 'none';
        window.switchView('control');
        showToast("நிர்வாக பக்க அனுமதி வழங்கப்பட்டது!", "success");
    } else {
        showToast("தவறான கடவுச்சொல்! (Wrong Password)", "error");
        pwdInput.value = '';
        pwdInput.focus();
    }
};

window.closePasswordModal = function() {
    document.getElementById('password-prompt-modal').style.display = 'none';
};

// Main Control - Meal cancellation form submit
window.saveSkipCancellation = async function(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) {
        btn.disabled = true;
        btn.innerText = "Saving...";
    }
    
    const custId = document.getElementById('skip-cust-id').value;
    const targetCustomer = window.customers.find(item => item.id === custId);
    const date = document.getElementById('skip-date').value;
    const meal = document.getElementById('skip-meal-type').value;

    if (!targetCustomer || !date || !meal) {
        showToast("தவறான தரவு!", "alert");
        if (btn) {
            btn.disabled = false;
            btn.innerText = "கேன்சல் செய் / Skip Meal";
        }
        return;
    }

    const skipObj = {
        id: "skip_" + Date.now(),
        custId,
        custName: targetCustomer.name,
        date,
        meal
    };

    try {
        await dbSaveSkip(skipObj);
        document.getElementById('skip-form').reset();
        const skipDateInput = document.getElementById('skip-date');
        if (skipDateInput) skipDateInput.value = window.todayDateStr;
        showToast("உணவு விடுப்பு பதிவு செய்யப்பட்டது!");
    } catch (err) {
        showToast("விடுப்பு பதிவு தோல்வி!", "error");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerText = "கேன்சல் செய் / Skip Meal";
        }
    }
};

// Excel Master Spreadsheet - Add Row handler
window.addExcelRow = async function() {
    const todayStr = window.todayDateStr;
    
    if (window.activeExcelTab === 'customers') {
        const newCust = {
            id: "cust_" + Date.now(),
            name: "புதிய வாடிக்கையாளர்",
            companyName: "",
            phone: "0000000000",
            address: "",
            start: todayStr,
            end: todayStr,
            breakfast: false, breakfastQty: 1,
            lunch: false, lunchQty: 1,
            dinner: false, dinnerQty: 1,
            cost: 0, paid: 0, notes: "", staffId: ""
        };
        newCust.end = calculateEndDate(newCust.start, false);
        try {
            await dbSaveCustomer(newCust);
            showToast("புதிய கஸ்டமர் வரிசை சேர்க்கப்பட்டது!");
        } catch (e) {
            showToast("வரிசை சேர்க்க முடியவில்லை!", "error");
        }
    } else if (window.activeExcelTab === 'kitchen') {
        const newExp = {
            id: "exp_" + Date.now(),
            date: todayStr,
            item: "மளிகை / Gas / கரண்ட் கட்டணம்",
            category: "Rent",
            amount: 0
        };
        try {
            await dbSaveExpense(newExp);
            showToast("சமையலறை பயன்பாட்டு வரிசை சேர்க்கப்பட்டது!");
        } catch (e) {
            showToast("வரிசை சேர்க்க முடியவில்லை!", "error");
        }
    } else if (window.activeExcelTab === 'staff') {
        const newStaff = {
            id: "st_" + Date.now(),
            name: "புதிய டெலிவரி நபர்"
        };
        try {
            await dbSaveStaff(newStaff);
            showToast("புதிய ஊழியர் வரிசை சேர்க்கப்பட்டது!");
        } catch (e) {
            showToast("வரிசை சேர்க்க முடியவில்லை!", "error");
        }
    } else if (window.activeExcelTab === 'leaves') {
        showToast("லீவ் பிளானர் படிவத்தை பயன்படுத்தி லீவ் பதிவு செய்யவும்!", "alert");
    } else if (window.activeExcelTab === 'skips') {
        if (window.customers.length === 0) {
            showToast("வாடிக்கையாளர்கள் யாரும் இல்லை!", "alert");
            return;
        }
        const firstCust = window.customers[0];
        const newSkip = {
            id: "skip_" + Date.now(),
            custId: firstCust.id,
            custName: firstCust.name,
            date: todayStr,
            meal: "lunch"
        };
        try {
            await dbSaveSkip(newSkip);
            showToast("புதிய உணவு விடுப்பு சேர்க்கப்பட்டது!");
        } catch (e) {
            showToast("விடுப்பு சேர்க்க முடியவில்லை!", "error");
        }
    }
};

// 10. Bootstrap initialization sequence
window.addEventListener('DOMContentLoaded', () => {
    // Dynamic calculate relative date in local time for daily calculations
    const today = new Date();
    window.todayDateStr = today.toLocaleDateString('sv').substring(0, 10); // YYYY-MM-DD format
    window.plannerDateStr = window.todayDateStr;

    // Set planner date default
    const plannerDateSelect = document.getElementById('planner-date-select');
    if (plannerDateSelect) {
        plannerDateSelect.value = window.todayDateStr;
        plannerDateSelect.addEventListener('change', (e) => {
            window.loadPlannerDateDeliveries(e.target.value);
        });
    }

    // Sort select listener
    const plannerSortSelect = document.getElementById('planner-sort-select');
    if (plannerSortSelect) {
        plannerSortSelect.addEventListener('change', () => {
            if (typeof renderDeliveryChecklistOnly === 'function') {
                renderDeliveryChecklistOnly();
            }
        });
    }

    // Select All checkbox listener
    const selectAllCheckbox = document.getElementById('planner-select-all');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            const checked = e.target.checked;
            document.querySelectorAll('.planner-card-checkbox').forEach(cb => {
                cb.checked = checked;
            });
            if (typeof window.updateSelectedCount === 'function') {
                window.updateSelectedCount();
            }
        });
    }
    
    // Hide customer card dropdowns when clicking outside
    window.addEventListener('click', (e) => {
        if (!e.target.closest('.relative') || !e.target.closest('button')) {
            document.querySelectorAll('[id^="dropdown-"]').forEach(d => d.classList.add('hidden'));
        }
    });

    // Load inputs for grocery portion calculations with event listeners
    const kitInputs = ['portion-rice', 'portion-dal', 'portion-veg', 'portion-oil'];
    kitInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', recalculateKitchenGroceryPortions);
        }
    });

    // Accounting period initialization defaults
    window.selectedAccountingPeriod = 'cumulative';
    
    // Sync dropdown changes for staff filter
    const staffFilter = document.getElementById('route-staff-filter');
    if (staffFilter) {
        staffFilter.addEventListener('change', renderDeliveryChecklist);
    }

    // Load elements to search customers list on keystroke
    const searchBar = document.getElementById('search-bar');
    if (searchBar) {
        searchBar.addEventListener('keyup', renderCustomerCards);
    }

    // Set form dates defaults
    const expDate = document.getElementById('exp-date');
    if (expDate) expDate.value = window.todayDateStr;
    
    const leaveDate = document.getElementById('leave-date');
    if (leaveDate) leaveDate.value = window.todayDateStr;

    const skipDate = document.getElementById('skip-date');
    if (skipDate) skipDate.value = window.todayDateStr;

    // Load deliveries for default date and run first UI drawing loop
    window.loadPlannerDateDeliveries(window.todayDateStr);
    
    // Connect to Firebase real-time listeners for instant updates
    initRealtimeSync();
    
    // Update local variables inside dropdowns
    window.updateStaffDropdowns();
    window.updateLeaveDropdown();
});
