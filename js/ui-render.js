// 🌟 UI RENDERING ENGINE MODULE

// Helper function to format month strings e.g. "2026-07" to "July 2026"
function formatMonthName(monthStr) {
    if (monthStr === 'cumulative') return 'Cumulative / அசல் கணக்கு';
    const [year, month] = monthStr.split('-');
    const date = new Date(year, parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

// 1. Renders Global Stats Board
function renderSummary() {
    const custCount = window.customers ? window.customers.length : 0;
    const statTotalCust = document.getElementById('stat-total-cust');
    const badgeCustCount = document.getElementById('badge-cust-count');
    
    if (statTotalCust) statTotalCust.innerText = custCount;
    if (badgeCustCount) badgeCustCount.innerText = `${custCount} Customers`;

    const todayStr = window.todayDateStr;
    const today = new Date(todayStr);
    today.setHours(0,0,0,0);
    const isSunday = today.getDay() === 0;

    let b = 0, l = 0, d = 0, earned = 0;
    
    if (window.customers) {
        window.customers.forEach(c => {
            // Count total accumulated earnings (sum of payments paid)
            earned += (parseFloat(c.paid) || 0);

            // Count today's active scheduled deliveries (skipping Sundays and leaves)
            if (!isSunday && c.start && c.end) {
                const start = new Date(c.start);
                const end = new Date(c.end);
                if (today >= start && today <= end) {
                    if (!isCustomerOnLeave(c.id, todayStr)) {
                        if (c.breakfast && !isMealSkipped(c.id, todayStr, 'breakfast')) b += (parseInt(c.breakfastQty) || 1);
                        if (c.lunch && !isMealSkipped(c.id, todayStr, 'lunch')) l += (parseInt(c.lunchQty) || 1);
                        if (c.dinner && !isMealSkipped(c.id, todayStr, 'dinner')) d += (parseInt(c.dinnerQty) || 1);
                    }
                }
            }
        });
    }

    const statDeliveries = document.getElementById('stat-today-deliveries');
    const statEarnings = document.getElementById('stat-total-earnings');
    const statExpenses = document.getElementById('stat-total-expenses');

    if (statDeliveries) {
        statDeliveries.innerText = isSunday ? "சண்டே லீவ்" : `B:${b} | L:${l} | D:${d}`;
    }
    if (statEarnings) {
        statEarnings.innerText = `₹${earned.toLocaleString('en-IN')}`;
    }

    let spent = 0;
    if (window.expenses) {
        window.expenses.forEach(e => spent += (parseFloat(e.amount) || 0));
    }
    if (statExpenses) {
        statExpenses.innerText = `₹${spent.toLocaleString('en-IN')}`;
    }
}

// 2. Renders Customer Cards List (Customers Tab)
function renderCustomerCards() {
    const container = document.getElementById('customer-cards-list');
    if (!container) return;
    container.innerHTML = '';
    
    const searchBar = document.getElementById('search-bar');
    const q = searchBar ? searchBar.value.toLowerCase() : '';
    
    const today = new Date();
    today.setHours(0,0,0,0);

    let list = window.customers.filter(c => {
        const matchSearch = c.name.toLowerCase().includes(q) || 
                            c.phone.includes(q) || 
                            (c.companyName && c.companyName.toLowerCase().includes(q)) || 
                            (c.address && c.address.toLowerCase().includes(q));
        if (!matchSearch) return false;
        
        if (window.activeFilter === 'trial') return c.isTrial;
        if (window.activeFilter === 'unpaid') return (c.cost - c.paid) > 0;
        return true;
    });

    if (list.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-10 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                <i class="fa-solid fa-users-slash text-3xl mb-2 text-slate-300"></i>
                <p class="text-xs">வாடிக்கையாளர்கள் யாரும் இல்லை!</p>
            </div>
        `;
        return;
    }

    list.forEach(c => {
        const balance = getCustomerBalance(c.cost, c.paid);
        const endDate = c.end ? new Date(c.end) : null;
        let daysRemaining = endDate ? Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 0;
        const isOverdue = endDate && (today > endDate) && (balance > 0);
        
        const card = document.createElement('div');
        card.className = `bg-white rounded-2xl border ${isOverdue ? 'border-rose-400 bg-rose-50/10' : 'border-slate-200'} p-4 space-y-3 shadow-sm flex flex-col justify-between hover:shadow transition-shadow`;
        
        const statusBadge = isOverdue ? 
            `<span class="text-[9px] bg-rose-600 text-white px-2.5 py-0.5 rounded-full font-bold uppercase animate-pulse">OVERDUE</span>` : 
            `<span class="text-[9px] ${c.isTrial ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'} px-2.5 py-0.5 rounded-full font-bold uppercase">${c.isTrial ? '6 Days Trial' : 'Monthly Plan'}</span>`;
        
        card.innerHTML = `
            <div class="space-y-2">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-bold text-sm text-slate-800 leading-tight">${c.name}</h4>
                        ${c.companyName ? `<span class="text-[10px] text-emerald-600 block font-semibold"><i class="fa-solid fa-building"></i> ${c.companyName}</span>` : ''}
                        <span class="text-[10px] text-slate-400 block"><i class="fa-solid fa-phone"></i> ${c.phone}</span>
                    </div>
                    ${statusBadge}
                </div>
                <div class="flex flex-wrap gap-1">
                    ${c.breakfast ? `<span class="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-100">B (${c.breakfastQty || 1})</span>` : ''}
                    ${c.lunch ? `<span class="text-[9px] bg-sky-50 text-sky-700 font-bold px-2 py-0.5 rounded-full border border-sky-100">L (${c.lunchQty || 1})</span>` : ''}
                    ${c.dinner ? `<span class="text-[9px] bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded-full border border-purple-100">D (${c.dinnerQty || 1})</span>` : ''}
                </div>
                <div class="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-xl border leading-snug break-words">${c.address || 'முகவரி இல்லை'}</div>
                <div class="bg-slate-50 border p-2.5 rounded-xl grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                        <span class="text-slate-400 text-[9px] font-bold block">மீதமுள்ள நாட்கள்:</span>
                        <span class="font-bold">${daysRemaining > 0 ? daysRemaining + ' நாட்கள்' : 'முடிவடைந்தது'}</span>
                    </div>
                    <div>
                        <span class="text-slate-400 text-[9px] font-bold block">நிலுவைத் தொகை:</span>
                        <span class="font-bold text-rose-600">₹${balance}</span>
                    </div>
                    <div class="col-span-2 border-t pt-1 text-[10px] text-slate-500 flex justify-between items-center">
                        <span>முடிவுத் தேதி: <b>${c.end || '-'}</b></span>
                        ${balance > 0 ? `<button onclick="window.open('https://api.whatsapp.com/send?phone=91${c.phone}&text=வணக்கம் ${c.name}, உங்களின் நிலுவைத் தொகை ₹${balance} ஆகும். நன்றி!', '_blank')" class="bg-emerald-600 text-white px-2 py-0.5 rounded text-[9px] font-bold hover:bg-emerald-700 transition"><i class="fa-brands fa-whatsapp animate-pulse"></i> <span>வாட்ஸ்அப் டியூ</span></button>` : ''}
                    </div>
                </div>
            </div>
            <div class="flex justify-between items-center pt-2 border-t mt-1">
                <button onclick="openEditModal('${c.id}')" class="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 rounded-xl text-xs font-bold text-emerald-700 flex items-center justify-center space-x-1 border border-emerald-100 transition mr-2">
                    <i class="fa-solid fa-pen"></i> <span>விவரம் திருத்து</span>
                </button>
                <div class="relative">
                    <button onclick="window.toggleCardDropdown('${c.id}', event)" class="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-700 border border-slate-200/60 focus:outline-none transition flex items-center justify-center">
                        <i class="fa-solid fa-ellipsis-vertical text-sm"></i>
                    </button>
                    <div id="dropdown-${c.id}" class="hidden origin-top-right absolute right-0 bottom-full mb-1 w-32 rounded-xl shadow-lg bg-white border border-slate-100 ring-1 ring-black ring-opacity-5 z-30 divide-y divide-slate-100">
                        <div class="py-1">
                            <button onclick="printMemoBill('${c.id}')" class="group flex items-center px-3 py-2 text-[11px] text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 w-full text-left font-semibold transition"><i class="fa-solid fa-print mr-2 text-slate-400 group-hover:text-emerald-600"></i> Memo Bill</button>
                            <button onclick="downloadCustomerLedger('${c.id}')" class="group flex items-center px-3 py-2 text-[11px] text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 w-full text-left font-semibold transition"><i class="fa-solid fa-file-invoice mr-2 text-slate-400 group-hover:text-emerald-600"></i> லெட்ஜர்</button>
                        </div>
                        <div class="py-1">
                            <button onclick="triggerDeleteConfirm('${c.id}', 'customer')" class="group flex items-center px-3 py-2 text-[11px] text-rose-600 hover:bg-rose-50 w-full text-left font-semibold transition"><i class="fa-solid fa-trash mr-2 text-rose-400 group-hover:text-rose-600"></i> நீக்கு</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// 3. Renders Leaves History Table (Leaves Tab)
function renderLeaveView() {
    const tbody = document.getElementById('leave-history-table');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    // Sort leaves reverse chronologically by timestamp/id
    const sortedLeaves = [...window.leaves].sort((a,b) => b.id.localeCompare(a.id));

    if (sortedLeaves.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-3 text-center text-slate-400 italic">லீவ் பதிவுகள் எதுவும் இல்லை.</td></tr>`;
        return;
    }

    sortedLeaves.forEach(l => {
        const tr = document.createElement('tr');
        tr.className = "border-b hover:bg-slate-50/50";
        tr.innerHTML = `
            <td class="p-2.5 font-semibold text-slate-700">${l.custName}</td>
            <td class="p-2.5 text-slate-500">${l.date}</td>
            <td class="p-2.5 font-bold text-emerald-600">${l.extendDate}</td>
            <td class="p-2.5 text-center">
                <button onclick="triggerDeleteConfirm('${l.id}', 'leave')" class="text-rose-500 hover:text-rose-700 transition"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 4. Renders Staff List Table (Staff Tab)
function renderStaffView() {
    const tbody = document.getElementById('staff-history-table');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (window.staffList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" class="p-3 text-center text-slate-400 italic">ஊழியர்கள் யாரும் இல்லை.</td></tr>`;
        return;
    }

    window.staffList.forEach(st => {
        const tr = document.createElement('tr');
        tr.className = "border-b hover:bg-slate-50/50";
        tr.innerHTML = `
            <td class="p-2.5 font-semibold text-slate-700">${st.name}</td>
            <td class="p-2.5 text-center">
                <button onclick="triggerDeleteConfirm('${st.id}', 'staff')" class="text-rose-500 hover:text-rose-700 transition"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 5. Renders Daily Delivery Checklist Sheet (Delivery Plan Tab)
function renderDeliveryChecklist() {
    const container = document.getElementById('delivery-list');
    if (!container) return;
    container.innerHTML = '';

    const session = window.activeMealSession || 'all';
    const staffFilterId = document.getElementById('route-staff-filter').value;
    
    const todayStr = window.todayDateStr;
    const today = new Date(todayStr);
    today.setHours(0,0,0,0);
    const isSunday = today.getDay() === 0;

    if (isSunday) {
        container.innerHTML = `
            <div class="col-span-full text-center py-10 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl">
                <i class="fa-solid fa-calendar-xmark text-3xl mb-2"></i>
                <h4 class="font-bold text-sm">ஞாயிற்றுக்கிழமை - விநியோக விடுமுறை</h4>
                <p class="text-xs mt-1">Sundays are standard catering holidays.</p>
            </div>
        `;
        return;
    }

    // Filter active customers for today
    let activeList = window.customers.filter(c => {
        // Must have valid dates
        if (!c.start || !c.end) return false;
        
        const start = new Date(c.start);
        const end = new Date(c.end);
        
        // Active range check
        if (today < start || today > end) return false;
        
        // Check if on leave today
        if (isCustomerOnLeave(c.id, todayStr)) return false;

        // Session active check
        if (session === 'breakfast' && !c.breakfast) return false;
        if (session === 'lunch' && !c.lunch) return false;
        if (session === 'dinner' && !c.dinner) return false;
        if (session === 'all' && !c.breakfast && !c.lunch && !c.dinner) return false;

        // Route Staff Filter
        if (staffFilterId !== 'all' && c.staffId !== staffFilterId) return false;

        return true;
    });

    if (activeList.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-10 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                <i class="fa-solid fa-truck-ramp-box text-3xl mb-2 text-slate-300"></i>
                <p class="text-xs">இன்றைய விநியோக பட்டியலில் யாரும் இல்லை!</p>
            </div>
        `;
        return;
    }

    activeList.forEach(c => {
        const staff = window.staffList.find(s => s.id === c.staffId);
        const staffName = staff ? staff.name : 'Unassigned (ஒதுக்கப்படவில்லை)';
        
        const card = document.createElement('div');
        card.className = "bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-sm flex flex-col justify-between hover:shadow transition-shadow";
        
        // Build meal checkbox UI
        let checkboxHtml = '';
        
        const meals = [
            { id: 'breakfast', label: 'Breakfast', active: c.breakfast, qty: c.breakfastQty || 1 },
            { id: 'lunch', label: 'Lunch', active: c.lunch, qty: c.lunchQty || 1 },
            { id: 'dinner', label: 'Dinner', active: c.dinner, qty: c.dinnerQty || 1 }
        ];

        meals.forEach(m => {
            if (m.active && (session === 'all' || session === m.id)) {
                const isSkipped = isMealSkipped(c.id, todayStr, m.id);
                if (isSkipped) {
                    checkboxHtml += `
                        <div class="flex items-center justify-between p-2 bg-slate-100 rounded-xl border border-slate-200/40 text-slate-400 select-none">
                            <span class="text-xs font-bold flex items-center space-x-1.5 line-through">
                                <i class="fa-solid ${m.id === 'breakfast' ? 'fa-egg' : m.id === 'lunch' ? 'fa-sun' : 'fa-moon'} opacity-50"></i>
                                <span>${m.label} (x${m.qty})</span>
                            </span>
                            <span class="text-[9px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold uppercase border">Cancelled</span>
                        </div>
                    `;
                } else {
                    const isDelivered = window.deliveryStatus[c.id] && window.deliveryStatus[c.id][m.id];
                    checkboxHtml += `
                        <label class="flex items-center justify-between p-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200/60 cursor-pointer transition select-none">
                            <span class="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                                <i class="fa-solid ${m.id === 'breakfast' ? 'fa-egg text-amber-500' : m.id === 'lunch' ? 'fa-sun text-orange-500' : 'fa-moon text-indigo-500'}"></i>
                                <span>${m.label} (x${m.qty})</span>
                            </span>
                            <input type="checkbox" 
                                   onchange="window.toggleDeliveryStatus('${c.id}', '${m.id}', this.checked)" 
                                   ${isDelivered ? 'checked' : ''} 
                                   class="w-5 h-5 text-emerald-600 bg-white border-slate-300 rounded-lg focus:ring-emerald-500">
                        </label>
                    `;
                }
            }
        });

        card.innerHTML = `
            <div class="space-y-2">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-bold text-sm text-slate-800 leading-tight">${c.name}</h4>
                        ${c.companyName ? `<span class="text-[10px] text-slate-400 font-semibold block">${c.companyName}</span>` : ''}
                        <span class="text-[10px] text-emerald-600 block font-bold"><i class="fa-solid fa-truck text-xs mr-0.5"></i> ${staffName}</span>
                    </div>
                    <a href="tel:${c.phone}" class="p-2 bg-slate-100 rounded-full text-slate-600 text-xs hover:bg-slate-200 transition"><i class="fa-solid fa-phone"></i></a>
                </div>
                <div class="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-xl border leading-snug break-words">${c.address || 'முகவரி இல்லை'}</div>
                <div class="space-y-1.5 pt-1">
                    ${checkboxHtml}
                </div>
                ${c.notes ? `<p class="text-[10px] text-rose-600 font-medium bg-rose-50/50 p-1.5 rounded-lg border border-rose-100"><i class="fa-solid fa-circle-exclamation mr-1"></i>${c.notes}</p>` : ''}
            </div>
        `;
        container.appendChild(card);
    });
}

// Checkbox action for mark delivered status to Firebase
window.toggleDeliveryStatus = function(custId, meal, checked) {
    if (!window.deliveryStatus[custId]) {
        window.deliveryStatus[custId] = {};
    }
    window.deliveryStatus[custId][meal] = checked;
    dbSaveDeliveryStatus(window.todayDateStr, window.deliveryStatus)
        .then(() => console.log(`Delivery status updated: ${custId} -> ${meal} = ${checked}`))
        .catch(err => showToast("விநியோக நிலையை புதுப்பிக்க முடியவில்லை!", "error"));
};

// 6. Renders Accounting Period Tabs & Cycle Summary
function renderAccountsMonthTabs() {
    const tabsContainer = document.getElementById('accounting-month-tabs');
    if (!tabsContainer) return;
    tabsContainer.innerHTML = '';

    // Extract all unique months from customer starts and expense dates
    const monthsSet = new Set();
    window.customers.forEach(c => { if(c.start) monthsSet.add(c.start.substring(0, 7)); });
    window.expenses.forEach(e => { if(e.date) monthsSet.add(e.date.substring(0, 7)); });

    // Convert to sorted array reverse chronologically
    const sortedMonths = Array.from(monthsSet).sort((a,b) => b.localeCompare(a));
    
    // Add cumulative option
    const periods = ['cumulative', ...sortedMonths];
    
    periods.forEach(p => {
        const btn = document.createElement('button');
        btn.onclick = () => toggleAccountingCycle(p);
        btn.id = `tab-period-${p}`;
        btn.className = `flex-none px-3.5 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
            window.selectedAccountingPeriod === p ? 
            'bg-emerald-600 text-white border-emerald-600 shadow' : 
            'bg-white text-slate-500 hover:bg-slate-50 border-slate-200'
        }`;
        btn.innerText = p === 'cumulative' ? 'Cumulative / அனைத்தும்' : formatMonthName(p);
        tabsContainer.appendChild(btn);
    });
}

function toggleAccountingCycle(period) {
    window.selectedAccountingPeriod = period;
    
    // Update active styling of month tabs
    const tabsContainer = document.getElementById('accounting-month-tabs');
    if (tabsContainer) {
        const buttons = tabsContainer.getElementsByTagName('button');
        for (let btn of buttons) {
            const pId = btn.id.replace('tab-period-', '');
            if (pId === period) {
                btn.className = "flex-none px-3.5 py-1.5 text-[10px] font-bold rounded-lg border bg-emerald-600 text-white border-emerald-600 shadow";
            } else {
                btn.className = "flex-none px-3.5 py-1.5 text-[10px] font-bold rounded-lg border bg-white text-slate-500 hover:bg-slate-50 border-slate-200";
            }
        }
    }

    // Filter and compute numbers
    let earnings = 0;
    let expenditures = 0;

    // Filter customers whose start matches the period
    window.customers.forEach(c => {
        if (period === 'cumulative') {
            earnings += (parseFloat(c.paid) || 0);
        } else if (c.start && c.start.startsWith(period)) {
            earnings += (parseFloat(c.paid) || 0);
        }
    });

    // Filter expenses matching the period
    const filteredExpenses = window.expenses.filter(e => {
        if (period === 'cumulative') {
            expenditures += (parseFloat(e.amount) || 0);
            return true;
        } else if (e.date && e.date.startsWith(period)) {
            expenditures += (parseFloat(e.amount) || 0);
            return true;
        }
        return false;
    });

    const netProfit = earnings - expenditures;

    // Update Console Labels
    document.getElementById('acc-lbl-earned').innerText = `₹${earnings.toLocaleString('en-IN')}`;
    document.getElementById('acc-lbl-expenses').innerText = `₹${expenditures.toLocaleString('en-IN')}`;
    
    const profitEl = document.getElementById('acc-lbl-profit');
    profitEl.innerText = `₹${netProfit.toLocaleString('en-IN')}`;
    
    // Custom color for profit or loss
    if (netProfit >= 0) {
        profitEl.className = "text-xl font-bold text-sky-800";
    } else {
        profitEl.className = "text-xl font-bold text-rose-800";
    }

    // Render filtered expenses list table
    const tbody = document.getElementById('expense-history-table');
    if (tbody) {
        tbody.innerHTML = '';
        if (filteredExpenses.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400 italic">செலவு விவரங்கள் ஏதும் இல்லை.</td></tr>`;
            return;
        }
        
        // Sort expenses reverse chronologically
        const sortedExpenses = [...filteredExpenses].sort((a,b) => b.date.localeCompare(a.date));

        sortedExpenses.forEach(ex => {
            const tr = document.createElement('tr');
            tr.className = "border-b hover:bg-slate-50/50";
            tr.innerHTML = `
                <td class="p-2.5 text-slate-500">${ex.date}</td>
                <td class="p-2.5 font-medium text-slate-800">${ex.item}</td>
                <td class="p-2.5"><span class="bg-rose-50 text-rose-800 px-2 py-0.5 rounded text-[9px] font-bold border border-rose-100">${ex.category}</span></td>
                <td class="p-2.5 font-bold text-rose-600">₹${ex.amount}</td>
                <td class="p-2.5 text-center">
                    <button onclick="triggerDeleteConfirm('${ex.id}', 'expense')" class="text-rose-500 hover:text-rose-700 transition"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
}

// 7. Modals: Earnings Summary detail modal
function openEarningsModal() {
    const modalId = 'earnings-modal';
    let modal = document.getElementById(modalId);
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = "fixed inset-0 bg-black/60 hidden items-center justify-center z-50 p-4";
        document.body.appendChild(modal);
    }

    let totalSubCost = 0;
    let totalReceived = 0;
    let totalOutstanding = 0;

    let customerRowsHtml = '';
    window.customers.forEach((c, idx) => {
        const balance = getCustomerBalance(c.cost, c.paid);
        totalSubCost += (c.cost || 0);
        totalReceived += (c.paid || 0);
        totalOutstanding += balance;

        customerRowsHtml += `
            <tr class="border-b text-xs hover:bg-slate-50">
                <td class="p-2.5 text-slate-400 text-center">${idx + 1}</td>
                <td class="p-2.5 font-semibold text-slate-800">${c.name} ${c.companyName ? `<span class="block text-[9px] text-slate-400">${c.companyName}</span>` : ''}</td>
                <td class="p-2.5 text-slate-600 text-right">₹${c.cost || 0}</td>
                <td class="p-2.5 text-emerald-600 font-semibold text-right">₹${c.paid || 0}</td>
                <td class="p-2.5 text-rose-600 font-semibold text-right">₹${balance}</td>
            </tr>
        `;
    });

    if (window.customers.length === 0) {
        customerRowsHtml = `<tr><td colspan="5" class="p-6 text-center text-slate-400 italic">வாடிக்கையாளர்கள் கணக்கு ஏதும் இல்லை.</td></tr>`;
    }

    modal.innerHTML = `
        <div class="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div class="bg-emerald-600 px-5 py-4 text-white flex justify-between items-center">
                <h3 class="font-bold text-base flex items-center space-x-2">
                    <i class="fa-solid fa-file-invoice-dollar"></i>
                    <span>அசல் வருவாய் விவரங்கள் (Earnings Audit)</span>
                </h3>
                <button type="button" onclick="document.getElementById('earnings-modal').style.display='none'"><i class="fa-solid fa-xmark text-lg"></i></button>
            </div>
            <div class="p-5 flex-1 overflow-y-auto space-y-4">
                <div class="grid grid-cols-3 gap-3 text-center">
                    <div class="bg-slate-50 border p-3 rounded-xl">
                        <span class="text-[9px] font-bold text-slate-400 block uppercase">மொத்த மதிப்பு</span>
                        <h4 class="text-base font-bold text-slate-700">₹${totalSubCost.toLocaleString('en-IN')}</h4>
                    </div>
                    <div class="bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
                        <span class="text-[9px] font-bold text-emerald-800 block uppercase">வசூலான தொகை</span>
                        <h4 class="text-base font-bold text-emerald-600">₹${totalReceived.toLocaleString('en-IN')}</h4>
                    </div>
                    <div class="bg-rose-50 border border-rose-100 p-3 rounded-xl">
                        <span class="text-[9px] font-bold text-rose-800 block uppercase">மொத்த நிலுவை</span>
                        <h4 class="text-base font-bold text-rose-600">₹${totalOutstanding.toLocaleString('en-IN')}</h4>
                    </div>
                </div>
                <div class="border rounded-xl overflow-hidden">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-50 border-b font-bold text-slate-500 text-[10px]">
                                <th class="p-2.5 text-center" style="width: 40px;">#</th>
                                <th class="p-2.5">கஸ்டமர் (Customer)</th>
                                <th class="p-2.5 text-right">கட்டணம்</th>
                                <th class="p-2.5 text-right">செலுத்தியது</th>
                                <th class="p-2.5 text-right">நிலுவை</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${customerRowsHtml}
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="bg-slate-50 px-5 py-3.5 flex justify-end">
                <button onclick="document.getElementById('earnings-modal').style.display='none'" class="px-5 py-2 bg-slate-200 hover:bg-slate-300 font-bold rounded-xl text-xs text-slate-700 transition">மூடு / Close</button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
}

// 8. Modals: Expenses Category Breakdown modal
function openExpensesSummaryModal() {
    const modalId = 'expenses-summary-modal';
    let modal = document.getElementById(modalId);
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = "fixed inset-0 bg-black/60 hidden items-center justify-center z-50 p-4";
        document.body.appendChild(modal);
    }

    const categories = {
        'Groceries': { tamil: 'மளிகை', amount: 0, color: 'bg-emerald-500' },
        'Vegetables': { tamil: 'காய்கறிகள்', amount: 0, color: 'bg-amber-500' },
        'Petrol': { tamil: 'டெலிவரி பெட்ரோல்', amount: 0, color: 'bg-sky-500' },
        'Wages': { tamil: 'ஆட்கள் சம்பளம்', amount: 0, color: 'bg-purple-500' },
        'Rent': { tamil: 'இதர செலவுகள்', amount: 0, color: 'bg-rose-500' }
    };

    let grandTotal = 0;
    window.expenses.forEach(e => {
        const val = parseFloat(e.amount) || 0;
        grandTotal += val;
        if (categories[e.category]) {
            categories[e.category].amount += val;
        } else {
            // Rent fallback or other categories
            categories['Rent'].amount += val;
        }
    });

    let catRowsHtml = '';
    Object.keys(categories).forEach(key => {
        const cat = categories[key];
        const percent = grandTotal > 0 ? (cat.amount / grandTotal * 100).toFixed(1) : 0;
        
        catRowsHtml += `
            <div class="space-y-1.5">
                <div class="flex justify-between text-xs font-semibold text-slate-700">
                    <span>${key} / ${cat.tamil}</span>
                    <span>₹${cat.amount.toLocaleString('en-IN')} (${percent}%)</span>
                </div>
                <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div class="${cat.color} h-full rounded-full" style="width: ${percent}%"></div>
                </div>
            </div>
        `;
    });

    modal.innerHTML = `
        <div class="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div class="bg-rose-600 px-5 py-4 text-white flex justify-between items-center">
                <h3 class="font-bold text-base flex items-center space-x-2">
                    <i class="fa-solid fa-chart-pie"></i>
                    <span>மொத்த செலவு பகுப்பாய்வு (Expenses Audit)</span>
                </h3>
                <button type="button" onclick="document.getElementById('expenses-summary-modal').style.display='none'"><i class="fa-solid fa-xmark text-lg"></i></button>
            </div>
            <div class="p-5 flex-1 overflow-y-auto space-y-6">
                <div class="bg-rose-50/50 border border-rose-100 p-4 rounded-2xl text-center">
                    <span class="text-[10px] font-bold text-rose-800 block uppercase">மொத்த அசல் செலவுகள்</span>
                    <h2 class="text-2xl font-black text-rose-600 mt-1">₹${grandTotal.toLocaleString('en-IN')}</h2>
                </div>
                <div class="space-y-4">
                    <h4 class="font-bold text-xs text-slate-400 uppercase tracking-wider">வகைகள் வாரியாக (By Category)</h4>
                    ${catRowsHtml}
                </div>
            </div>
            <div class="bg-slate-50 px-5 py-3.5 flex justify-end">
                <button onclick="document.getElementById('expenses-summary-modal').style.display='none'" class="px-5 py-2 bg-slate-200 hover:bg-slate-300 font-bold rounded-xl text-xs text-slate-700 transition">மூடு / Close</button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
}

// 9. Coordinate all rendering methods
function renderAll() {
    renderSummary();
    renderCustomerCards();
    renderLeaveView();
    renderStaffView();
    renderDeliveryChecklist();
    renderAccountsMonthTabs();
    
    // Ensure active month tab stats calculate
    toggleAccountingCycle(window.selectedAccountingPeriod);
    
    // Also recalculate grocery portions
    recalculateKitchenGroceryPortions();

    // Renders Main Control skips lists if unlocked
    if (typeof renderSkipsView === 'function') {
        renderSkipsView();
    }

    // Update local variables inside dropdowns to reflect any asynchronous updates
    if (typeof window.updateStaffDropdowns === 'function') {
        window.updateStaffDropdowns();
    }
    if (typeof window.updateLeaveDropdown === 'function') {
        window.updateLeaveDropdown();
    }
}

// 10. Toggle Card actions settings dropdown menu
window.toggleCardDropdown = function(id, event) {
    if (event) {
        event.stopPropagation();
    }
    const el = document.getElementById('dropdown-' + id);
    if (el) {
        const isHidden = el.classList.contains('hidden');
        // Hide all active dropdown selectors first
        document.querySelectorAll('[id^="dropdown-"]').forEach(d => d.classList.add('hidden'));
        if (isHidden) {
            el.classList.remove('hidden');
        }
    }
};

// 11. Excel Master Spreadsheet Tab Switching & Rendering Engine
window.activeExcelTab = 'customers';

window.switchExcelTab = function(tabId) {
    window.activeExcelTab = tabId;
    
    // Update badge label
    const badge = document.getElementById('excel-active-tab-badge');
    if (badge) {
        badge.innerText = tabId.toUpperCase() + " SHEET";
    }

    // Toggle active style headers
    const tabs = ['customers', 'kitchen', 'leaves', 'skips', 'staff'];
    tabs.forEach(t => {
        const btn = document.getElementById('btn-excel-tab-' + t);
        if (btn) {
            if (t === tabId) {
                btn.className = "px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white shadow-md transition-all";
            } else {
                btn.className = "px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 transition-all";
            }
        }
    });

    // Reset search bar when switching tabs
    const searchBar = document.getElementById('excel-search-bar');
    if (searchBar) searchBar.value = '';

    window.renderExcelMasterTable();
};

window.filterExcelRows = function() {
    window.renderExcelMasterTable();
};

window.renderExcelMasterTable = function() {
    const table = document.getElementById('excel-master-table');
    if (!table) return;
    table.innerHTML = '';

    const searchInput = document.getElementById('excel-search-bar');
    const q = searchInput ? searchInput.value.toLowerCase() : '';

    if (window.activeExcelTab === 'customers') {
        // --- CUSTOMERS SHEET ---
        // Header
        table.innerHTML = `
            <thead>
                <tr>
                    <th class="excel-index-col"></th>
                    <th>Customer Name (பெயர்)</th>
                    <th>Company Name</th>
                    <th>Phone (போன்)</th>
                    <th>Address (முகவரி)</th>
                    <th style="width: 110px;">Start Date</th>
                    <th style="width: 90px; text-align: center;">Trial?</th>
                    <th style="width: 100px; text-align: right;">Cost (₹)</th>
                    <th style="width: 100px; text-align: right;">Paid (₹)</th>
                    <th>Delivery Driver</th>
                    <th>Notes</th>
                    <th style="width: 60px; text-align: center;">Actions</th>
                </tr>
            </thead>
            <tbody id="excel-tbody-customers"></tbody>
        `;
        
        const tbody = document.getElementById('excel-tbody-customers');
        let filtered = window.customers.filter(c => {
            return c.name.toLowerCase().includes(q) || 
                   c.phone.includes(q) || 
                   (c.companyName && c.companyName.toLowerCase().includes(q)) ||
                   (c.address && c.address.toLowerCase().includes(q));
        });

        // Sort alphabetically by name
        filtered.sort((a, b) => a.name.localeCompare(b.name));

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="12" class="p-6 text-center text-slate-400 italic">No customers found matching search term.</td></tr>`;
            return;
        }

        filtered.forEach((c, idx) => {
            const tr = document.createElement('tr');
            tr.className = "excel-row";
            
            // Generate staff dropdown options
            let staffOptions = '<option value="">Unassigned</option>';
            window.staffList.forEach(s => {
                staffOptions += `<option value="${s.id}" ${c.staffId === s.id ? 'selected' : ''}>${s.name}</option>`;
            });

            tr.innerHTML = `
                <td class="excel-index-col">${idx + 1}</td>
                <td><input type="text" class="excel-cell-input font-bold" value="${c.name}" onchange="window.saveExcelCustomerCell('${c.id}', 'name', this.value)"></td>
                <td><input type="text" class="excel-cell-input" value="${c.companyName || ''}" placeholder="None" onchange="window.saveExcelCustomerCell('${c.id}', 'companyName', this.value)"></td>
                <td><input type="tel" class="excel-cell-input" value="${c.phone}" onchange="window.saveExcelCustomerCell('${c.id}', 'phone', this.value)"></td>
                <td><input type="text" class="excel-cell-input" value="${c.address || ''}" onchange="window.saveExcelCustomerCell('${c.id}', 'address', this.value)"></td>
                <td><input type="date" class="excel-cell-input text-xs" value="${c.start || ''}" onchange="window.saveExcelCustomerCell('${c.id}', 'start', this.value)"></td>
                <td style="text-align: center;">
                    <input type="checkbox" class="w-4 h-4 text-emerald-600 rounded bg-slate-900 border-slate-700" ${c.isTrial ? 'checked' : ''} onchange="window.saveExcelCustomerCell('${c.id}', 'isTrial', this.checked)">
                </td>
                <td><input type="number" class="excel-cell-input text-right" value="${c.cost}" onchange="window.saveExcelCustomerCell('${c.id}', 'cost', parseFloat(this.value)||0)"></td>
                <td><input type="number" class="excel-cell-input text-right" value="${c.paid}" onchange="window.saveExcelCustomerCell('${c.id}', 'paid', parseFloat(this.value)||0)"></td>
                <td>
                    <select class="excel-cell-select font-semibold text-slate-300" onchange="window.saveExcelCustomerCell('${c.id}', 'staffId', this.value)">
                        ${staffOptions}
                    </select>
                </td>
                <td><input type="text" class="excel-cell-input" value="${c.notes || ''}" placeholder="Add notes..." onchange="window.saveExcelCustomerCell('${c.id}', 'notes', this.value)"></td>
                <td style="text-align: center;">
                    <button onclick="triggerDeleteConfirm('${c.id}', 'customer')" class="text-rose-500 hover:text-rose-700 p-1 transition"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } else if (window.activeExcelTab === 'kitchen') {
        // --- KITCHEN UTILITIES & CONSUMABLES SHEET (MAPPED TO EXPENSES) ---
        // Header
        table.innerHTML = `
            <thead>
                <tr>
                    <th class="excel-index-col"></th>
                    <th style="width: 140px;">Expense Date</th>
                    <th>Item Details (பயன்பாட்டு பொருள் / செலவு)</th>
                    <th style="width: 200px;">Expense Category (வகை)</th>
                    <th style="width: 140px; text-align: right;">Amount (₹)</th>
                    <th style="width: 60px; text-align: center;">Actions</th>
                </tr>
            </thead>
            <tbody id="excel-tbody-kitchen"></tbody>
        `;

        const tbody = document.getElementById('excel-tbody-kitchen');
        let filtered = window.expenses.filter(ex => {
            return ex.item.toLowerCase().includes(q) || ex.category.toLowerCase().includes(q);
        });

        filtered.sort((a, b) => b.date.localeCompare(a.date));

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-400 italic">No kitchen items logged. Click 'Add Row' to record utilities.</td></tr>`;
            return;
        }

        filtered.forEach((ex, idx) => {
            const tr = document.createElement('tr');
            tr.className = "excel-row";
            
            const categories = [
                { val: 'Groceries', text: 'Groceries / மளிகை' },
                { val: 'Vegetables', text: 'Vegetables / காய்கறிகள்' },
                { val: 'Petrol', text: 'Petrol / பெட்ரோல்' },
                { val: 'Wages', text: 'Wages / சம்பளம்' },
                { val: 'Rent', text: 'Rent & Utilities / கேஸ், கரண்ட்' }
            ];

            let catOptions = '';
            categories.forEach(cat => {
                catOptions += `<option value="${cat.val}" ${ex.category === cat.val ? 'selected' : ''}>${cat.text}</option>`;
            });

            tr.innerHTML = `
                <td class="excel-index-col">${idx + 1}</td>
                <td><input type="date" class="excel-cell-input text-xs" value="${ex.date}" onchange="window.saveExcelExpenseCell('${ex.id}', 'date', this.value)"></td>
                <td><input type="text" class="excel-cell-input font-bold" value="${ex.item}" onchange="window.saveExcelExpenseCell('${ex.id}', 'item', this.value)"></td>
                <td>
                    <select class="excel-cell-select text-slate-300 font-semibold" onchange="window.saveExcelExpenseCell('${ex.id}', 'category', this.value)">
                        ${catOptions}
                    </select>
                </td>
                <td><input type="number" class="excel-cell-input text-right font-bold text-rose-500" value="${ex.amount}" onchange="window.saveExcelExpenseCell('${ex.id}', 'amount', parseFloat(this.value)||0)"></td>
                <td style="text-align: center;">
                    <button onclick="triggerDeleteConfirm('${ex.id}', 'expense')" class="text-rose-500 hover:text-rose-700 p-1 transition"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } else if (window.activeExcelTab === 'leaves') {
        // --- LEAVES SHEET ---
        // Header
        table.innerHTML = `
            <thead>
                <tr>
                    <th class="excel-index-col"></th>
                    <th>Customer Name</th>
                    <th>Leave Start Date & Days (விடுப்பு நாட்கள்)</th>
                    <th>Extended Expiry Date</th>
                    <th style="width: 60px; text-align: center;">Delete</th>
                </tr>
            </thead>
            <tbody id="excel-tbody-leaves"></tbody>
        `;

        const tbody = document.getElementById('excel-tbody-leaves');
        let filtered = window.leaves.filter(l => l.custName.toLowerCase().includes(q) || l.date.includes(q));

        filtered.sort((a, b) => b.id.localeCompare(a.id));

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-400 italic">No leaves recorded. Log leaves using the form in Leave Planner tab.</td></tr>`;
            return;
        }

        filtered.forEach((l, idx) => {
            const tr = document.createElement('tr');
            tr.className = "excel-row";
            tr.innerHTML = `
                <td class="excel-index-col">${idx + 1}</td>
                <td class="p-3 font-semibold text-slate-300">${l.custName}</td>
                <td class="p-3 font-medium text-slate-400">${l.date}</td>
                <td class="p-3 font-bold text-emerald-500">${l.extendDate}</td>
                <td style="text-align: center;">
                    <button onclick="triggerDeleteConfirm('${l.id}', 'leave')" class="text-rose-500 hover:text-rose-700 p-1 transition"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } else if (window.activeExcelTab === 'skips') {
        // --- SKIPS SHEET ---
        // Header
        table.innerHTML = `
            <thead>
                <tr>
                    <th class="excel-index-col"></th>
                    <th>Customer Name</th>
                    <th style="width: 180px;">Skip Date</th>
                    <th style="width: 200px;">Cancelled Meal Session</th>
                    <th style="width: 60px; text-align: center;">Delete</th>
                </tr>
            </thead>
            <tbody id="excel-tbody-skips"></tbody>
        `;

        const tbody = document.getElementById('excel-tbody-skips');
        let filtered = window.skips.filter(s => s.custName.toLowerCase().includes(q) || s.date.includes(q) || s.meal.includes(q));

        filtered.sort((a, b) => b.date.localeCompare(a.date));

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-400 italic">No meal skips registered. Add a row to cancel specific customer meals.</td></tr>`;
            return;
        }

        filtered.forEach((s, idx) => {
            const tr = document.createElement('tr');
            tr.className = "excel-row";
            
            const meals = [
                { val: 'breakfast', text: 'Breakfast / காலை' },
                { val: 'lunch', text: 'Lunch / மதியம்' },
                { val: 'dinner', text: 'Dinner / இரவு' }
            ];

            let mealOptions = '';
            meals.forEach(m => {
                mealOptions += `<option value="${m.val}" ${s.meal === m.val ? 'selected' : ''}>${m.text}</option>`;
            });

            tr.innerHTML = `
                <td class="excel-index-col">${idx + 1}</td>
                <td class="p-3 font-semibold text-slate-300">${s.custName}</td>
                <td><input type="date" class="excel-cell-input text-xs" value="${s.date}" onchange="window.saveExcelSkipCell('${s.id}', 'date', this.value)"></td>
                <td>
                    <select class="excel-cell-select text-slate-300 font-semibold" onchange="window.saveExcelSkipCell('${s.id}', 'meal', this.value)">
                        ${mealOptions}
                    </select>
                </td>
                <td style="text-align: center;">
                    <button onclick="triggerDeleteConfirm('${s.id}', 'skip')" class="text-rose-500 hover:text-rose-700 p-1 transition"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } else if (window.activeExcelTab === 'staff') {
        // --- STAFF SHEET ---
        // Header
        table.innerHTML = `
            <thead>
                <tr>
                    <th class="excel-index-col"></th>
                    <th>Driver Name (ஊழியர் பெயர்)</th>
                    <th style="width: 60px; text-align: center;">Delete</th>
                </tr>
            </thead>
            <tbody id="excel-tbody-staff"></tbody>
        `;

        const tbody = document.getElementById('excel-tbody-staff');
        let filtered = window.staffList.filter(s => s.name.toLowerCase().includes(q));

        filtered.sort((a, b) => a.name.localeCompare(b.name));

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" class="p-6 text-center text-slate-400 italic">No delivery staff members logged.</td></tr>`;
            return;
        }

        filtered.forEach((st, idx) => {
            const tr = document.createElement('tr');
            tr.className = "excel-row";
            tr.innerHTML = `
                <td class="excel-index-col">${idx + 1}</td>
                <td><input type="text" class="excel-cell-input font-bold" value="${st.name}" onchange="window.saveExcelStaffCell('${st.id}', 'name', this.value)"></td>
                <td style="text-align: center;">
                    <button onclick="triggerDeleteConfirm('${st.id}', 'staff')" class="text-rose-500 hover:text-rose-700 p-1 transition"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
};

// 12. Spreadsheet cell auto-save helpers (shows saving loader and syncs)
function toggleSavingLabel(show) {
    const lbl = document.getElementById('excel-saving-label');
    if (lbl) {
        lbl.style.display = show ? 'inline-flex' : 'none';
    }
}

window.saveExcelCustomerCell = async function(id, field, value) {
    const c = window.customers.find(item => item.id === id);
    if (!c) return;
    
    c[field] = value;
    
    // Auto-calculate end date dynamically if start or trial mode is changed
    if (field === 'start' || field === 'isTrial') {
        c.end = recalculateCustomerEndDate(c);
    }

    toggleSavingLabel(true);
    try {
        await dbSaveCustomer(c);
        console.log(`Excel auto-saved customer cell: ${id} -> ${field} = ${value}`);
    } catch (e) {
        showToast("தரவு சேமிப்பில் தோல்வி!", "error");
    } finally {
        toggleSavingLabel(false);
    }
};

window.saveExcelExpenseCell = async function(id, field, value) {
    const ex = window.expenses.find(item => item.id === id);
    if (!ex) return;

    ex[field] = value;

    toggleSavingLabel(true);
    try {
        await dbSaveExpense(ex);
        console.log(`Excel auto-saved expense cell: ${id} -> ${field} = ${value}`);
    } catch (e) {
        showToast("செலவு சேமிப்பில் தோல்வி!", "error");
    } finally {
        toggleSavingLabel(false);
    }
};

window.saveExcelStaffCell = async function(id, field, value) {
    const st = window.staffList.find(item => item.id === id);
    if (!st) return;

    st[field] = value;

    toggleSavingLabel(true);
    try {
        await dbSaveStaff(st);
        console.log(`Excel auto-saved staff cell: ${id} -> ${field} = ${value}`);
    } catch (e) {
        showToast("ஊழியர் பெயர் சேமிப்பில் தோல்வி!", "error");
    } finally {
        toggleSavingLabel(false);
    }
};

window.saveExcelSkipCell = async function(id, field, value) {
    const s = window.skips.find(item => item.id === id);
    if (!s) return;

    s[field] = value;

    toggleSavingLabel(true);
    try {
        await dbSaveSkip(s);
        console.log(`Excel auto-saved skip cell: ${id} -> ${field} = ${value}`);
    } catch (e) {
        showToast("விடுப்பு சேமிப்பில் தோல்வி!", "error");
    } finally {
        toggleSavingLabel(false);
    }
};

