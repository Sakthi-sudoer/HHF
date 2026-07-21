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
    const today = parseLocalDate(todayStr);
    const isSunday = today.getDay() === 0;

    let b = 0, l = 0, d = 0, earned = 0;
    
    if (window.customers) {
        window.customers.forEach(c => {
            // Count total accumulated earnings (sum of payments paid)
            earned += (parseFloat(c.paid) || 0);

            // Count today's active scheduled deliveries (skipping Sundays and leaves)
            if (!isSunday && c.start && c.end) {
                const start = parseLocalDate(c.start);
                const end = parseLocalDate(c.end);
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
    
    const today = parseLocalDate(window.todayDateStr);

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
        const endDate = c.end ? parseLocalDate(c.end) : null;
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

window.applyFilter = function(filter) {
    window.activeFilter = filter;
    ['all', 'trial', 'unpaid'].forEach(b => {
        const el = document.getElementById('btn-' + b);
        if (el) {
            if (b === filter) {
                el.className = "flex-1 py-1.5 text-center text-[10px] font-bold rounded-lg transition-all active-filter-green text-white bg-emerald-600 shadow-sm";
            } else {
                el.className = "flex-1 py-1.5 text-center text-[10px] font-bold rounded-lg text-slate-500 hover:bg-slate-50 transition-all";
            }
        }
    });
    renderCustomerCards();
};

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
window.plannerDeliveryStatus = {};

// Helper to determine if a date is within "this week" (Sunday to Saturday)
function isThisWeek(dateStr) {
    if (!dateStr) return false;
    const d = parseLocalDate(dateStr);
    const today = parseLocalDate(window.todayDateStr);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0,0,0,0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23,59,59,999);
    
    return d >= startOfWeek && d <= endOfWeek;
}

// Decoupled loader for planner dates
window.loadPlannerDateDeliveries = async function(dateStr) {
    window.plannerDateStr = dateStr;
    const dateInput = document.getElementById('planner-date-select');
    if (dateInput) dateInput.value = dateStr;
    
    try {
        const doc = await db.collection("deliveries").doc(dateStr).get();
        window.plannerDeliveryStatus = doc.exists ? (doc.data() || {}) : {};
        localStorage.setItem('hh_deliveries_v8_' + dateStr, JSON.stringify(window.plannerDeliveryStatus));
    } catch (e) {
        console.error("Error loading deliveries for date:", dateStr, e);
        window.plannerDeliveryStatus = JSON.parse(localStorage.getItem('hh_deliveries_v8_' + dateStr) || '{}');
    }
    
    // Trigger render
    renderDeliveryChecklistOnly();
};

function renderDeliveryChecklist() {
    const dateInput = document.getElementById('planner-date-select');
    const dateStr = dateInput ? dateInput.value : (window.plannerDateStr || window.todayDateStr);
    
    if (dateStr !== window.plannerDateStr) {
        window.loadPlannerDateDeliveries(dateStr);
    } else {
        renderDeliveryChecklistOnly();
    }
}

function renderDeliveryChecklistOnly() {
    const container = document.getElementById('delivery-list');
    if (!container) return;
    container.innerHTML = '';

    const staffFilterId = document.getElementById('route-staff-filter').value;
    const dateStr = window.plannerDateStr || window.todayDateStr;
    const today = parseLocalDate(dateStr);

    // 1. Calculate Planned / Leave / Unassigned Stats
    let totalB = 0, totalL = 0, totalD = 0;
    let onLeaveCount = 0;
    let unassignedCount = 0;

    window.customers.forEach(c => {
        if (!c.start || !c.end) return;
        const start = parseLocalDate(c.start);
        const end = parseLocalDate(c.end);
        
        const inRange = today >= start && today <= end;
        const onLeave = isCustomerOnLeave(c.id, dateStr);
        const altB = isAlternateMealScheduled(c.id, dateStr, 'breakfast');
        const altL = isAlternateMealScheduled(c.id, dateStr, 'lunch');
        const altD = isAlternateMealScheduled(c.id, dateStr, 'dinner');

        if (inRange || altB || altL || altD) {
            if (onLeave && !altB && !altL && !altD) {
                onLeaveCount++;
            } else {
                const hasB = (c.breakfast && inRange && !isCustomerOnLeaveForMeal(c.id, dateStr, 'breakfast')) || altB;
                const hasL = (c.lunch && inRange && !isCustomerOnLeaveForMeal(c.id, dateStr, 'lunch')) || altL;
                const hasD = (c.dinner && inRange && !isCustomerOnLeaveForMeal(c.id, dateStr, 'dinner')) || altD;

                if (hasB || hasL || hasD) {
                    if (hasB) totalB += (parseInt(c.breakfastQty) || 1);
                    if (hasL) totalL += (parseInt(c.lunchQty) || 1);
                    if (hasD) totalD += (parseInt(c.dinnerQty) || 1);

                    const driverId = (window.activeDeliveryRouteType === 'morning') ? (c.staffId || "") : (c.eveningStaffId || "");
                    const staff = window.staffList.find(s => s.id === driverId);
                    if (!staff) {
                        unassignedCount++;
                    }
                }
            }
        }
    });

    // Update stats UI
    const statPlanned = document.getElementById('planner-stat-planned');
    const statLeave = document.getElementById('planner-stat-leave');
    const statUnplanned = document.getElementById('planner-stat-unplanned');
    if (statPlanned) statPlanned.innerText = `B:${totalB} | L:${totalL} | D:${totalD}`;
    if (statLeave) statLeave.innerText = `${onLeaveCount} Customers`;
    if (statUnplanned) statUnplanned.innerText = `${unassignedCount} Customers`;

    // 2. Filter active customers to show on board
    let activeList = window.customers.filter(c => {
        if (!c.start || !c.end) return false;
        const start = parseLocalDate(c.start);
        const end = parseLocalDate(c.end);
        
        const inRange = today >= start && today <= end;
        const altB = isAlternateMealScheduled(c.id, dateStr, 'breakfast');
        const altL = isAlternateMealScheduled(c.id, dateStr, 'lunch');
        const altD = isAlternateMealScheduled(c.id, dateStr, 'dinner');

        if (!inRange && !altB && !altL && !altD) return false;
        
        const onLeave = isCustomerOnLeave(c.id, dateStr);
        if (onLeave && !altB && !altL && !altD) return false;

        const hasB = (c.breakfast && inRange && !isCustomerOnLeaveForMeal(c.id, dateStr, 'breakfast')) || altB;
        const hasL = (c.lunch && inRange && !isCustomerOnLeaveForMeal(c.id, dateStr, 'lunch')) || altL;
        const hasD = (c.dinner && inRange && !isCustomerOnLeaveForMeal(c.id, dateStr, 'dinner')) || altD;

        // Morning Route vs Evening Route filters
        if (window.activeDeliveryRouteType === 'morning') {
            if (!hasB && !hasL) return false;
        } else {
            if (!hasD) return false;
        }

        const driverId = (window.activeDeliveryRouteType === 'morning') ? (c.staffId || "") : (c.eveningStaffId || "");
        if (staffFilterId !== 'all' && driverId !== staffFilterId) return false;

        return true;
    });

    if (activeList.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-10 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                <i class="fa-solid fa-truck-ramp-box text-3xl mb-2 text-slate-300"></i>
                <p class="text-xs">விநியோகப் பட்டியலில் தகவல்கள் எதுவும் இல்லை!</p>
            </div>
        `;
        return;
    }

    // 3. Sort active list
    const sortBy = document.getElementById('planner-sort-select')?.value || 'name';
    if (sortBy === 'name') {
        activeList.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'staff') {
        activeList.sort((a, b) => {
            const driverIdA = (window.activeDeliveryRouteType === 'morning') ? (a.staffId || "") : (a.eveningStaffId || "");
            const driverIdB = (window.activeDeliveryRouteType === 'morning') ? (b.staffId || "") : (b.eveningStaffId || "");
            const sA = window.staffList.find(s => s.id === driverIdA)?.name || 'zzzUnassigned';
            const sB = window.staffList.find(s => s.id === driverIdB)?.name || 'zzzUnassigned';
            return sA.localeCompare(sB);
        });
    } else if (sortBy === 'area') {
        activeList.sort((a, b) => (a.address || '').localeCompare(b.address || ''));
    } else if (sortBy === 'unassigned') {
        activeList.sort((a, b) => {
            const driverIdA = (window.activeDeliveryRouteType === 'morning') ? (a.staffId || "") : (a.eveningStaffId || "");
            const driverIdB = (window.activeDeliveryRouteType === 'morning') ? (b.staffId || "") : (b.eveningStaffId || "");
            const hasStaffA = driverIdA && window.staffList.some(s => s.id === driverIdA) ? 1 : 0;
            const hasStaffB = driverIdB && window.staffList.some(s => s.id === driverIdB) ? 1 : 0;
            return hasStaffA - hasStaffB;
        });
    }

    // 4. Render checklist cards
    activeList.forEach(c => {
        const driverId = (window.activeDeliveryRouteType === 'morning') ? (c.staffId || "") : (c.eveningStaffId || "");
        const staff = window.staffList.find(s => s.id === driverId);
        const staffName = staff ? staff.name : 'Unassigned (ஒதுக்கப்படவில்லை)';
        const isUnassigned = !staff;

        const card = document.createElement('div');
        card.className = `bg-white rounded-2xl border p-4 space-y-3 shadow-sm flex flex-col justify-between hover:shadow transition-shadow relative ${
            isUnassigned ? 'border-rose-500 bg-rose-50/5' : 'border-slate-200'
        }`;

        let checkboxHtml = '';
        const meals = [
            { id: 'breakfast', label: 'Breakfast', active: c.breakfast, qty: c.breakfastQty || 1 },
            { id: 'lunch', label: 'Lunch', active: c.lunch, qty: c.lunchQty || 1 },
            { id: 'dinner', label: 'Dinner', active: c.dinner, qty: c.dinnerQty || 1 }
        ];

        meals.forEach(m => {
            const inRange = today >= parseLocalDate(c.start) && today <= parseLocalDate(c.end);
            const isAlt = isAlternateMealScheduled(c.id, dateStr, m.id);
            const normalActive = m.active && inRange;
            
            // Check matching route type session
            const matchesRoute = (window.activeDeliveryRouteType === 'morning') ? (m.id !== 'dinner') : (m.id === 'dinner');
            
            if ((normalActive || isAlt) && matchesRoute) {
                const isLeave = isCustomerOnLeaveForMeal(c.id, dateStr, m.id);
                if (isLeave && !isAlt) {
                    checkboxHtml += `
                        <div class="flex items-center justify-between p-2 bg-slate-100 rounded-xl border border-slate-200/40 text-slate-400 select-none">
                            <span class="text-xs font-bold flex items-center space-x-1.5 line-through">
                                <i class="fa-solid ${m.id === 'breakfast' ? 'fa-egg' : m.id === 'lunch' ? 'fa-sun' : 'fa-moon'} opacity-50"></i>
                                <span>${m.label} (x${m.qty})</span>
                            </span>
                            <span class="text-[9px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold uppercase border">Leave</span>
                        </div>
                    `;
                } else {
                    const rawVal = window.plannerDeliveryStatus[c.id] && window.plannerDeliveryStatus[c.id][m.id];
                    let statusVal = '';
                    if (rawVal === true) {
                        statusVal = 'Delivered';
                    } else if (rawVal && typeof rawVal === 'string') {
                        statusVal = rawVal;
                    }
                    
                    let borderClass = 'border-slate-250';
                    let selectBg = 'bg-slate-50';
                    let badgeColor = 'text-slate-500';
                    
                    if (statusVal === 'Packed') {
                        borderClass = 'border-slate-350 bg-slate-100/30';
                        badgeColor = 'text-slate-400';
                    } else if (statusVal === 'Out for Delivery') {
                        borderClass = 'border-blue-400/40 bg-blue-950/10';
                        badgeColor = 'text-blue-400 font-bold';
                    } else if (statusVal === 'Delivered') {
                        borderClass = 'border-emerald-400/40 bg-emerald-950/10';
                        badgeColor = 'text-emerald-400 font-bold';
                    } else if (statusVal === 'Payment Pending') {
                        borderClass = 'border-rose-400/40 bg-rose-950/10';
                        badgeColor = 'text-rose-400 font-bold';
                    }
                    
                    checkboxHtml += `
                        <div class="flex items-center justify-between p-2 rounded-xl border ${borderClass} ${selectBg} transition select-none">
                            <span class="text-xs font-bold text-slate-700 flex items-center space-x-1.5 font-semibold">
                                <i class="fa-solid ${m.id === 'breakfast' ? 'fa-egg text-amber-500' : m.id === 'lunch' ? 'fa-sun text-orange-500' : 'fa-moon text-indigo-500'}"></i>
                                <span>${m.label} (x${m.qty})</span>
                                ${isAlt ? `<span class="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold uppercase border border-amber-200">Alt Day</span>` : ''}
                            </span>
                            <select class="text-[10px] font-bold rounded-lg px-2 py-1 ${selectBg} ${badgeColor} focus:outline-none border border-slate-200" 
                                    onchange="window.toggleDeliveryStatus('${c.id}', '${m.id}', this.value, '${dateStr}')">
                                <option value="" ${statusVal === '' ? 'selected' : ''}>Pending ⏳</option>
                                <option value="Packed" ${statusVal === 'Packed' ? 'selected' : ''}>Packed 📦</option>
                                <option value="Out for Delivery" ${statusVal === 'Out for Delivery' ? 'selected' : ''}>Out 🛵</option>
                                <option value="Delivered" ${statusVal === 'Delivered' ? 'selected' : ''}>Delivered ✅</option>
                                <option value="Payment Pending" ${statusVal === 'Payment Pending' ? 'selected' : ''}>Pay Due ⚠️</option>
                            </select>
                        </div>
                    `;
                }
            }
        });

        card.innerHTML = `
            <div class="space-y-2">
                <div class="flex justify-between items-start">
                    <div class="flex items-start space-x-2">
                        <input type="checkbox" data-cust-id="${c.id}" onchange="window.updateSelectedCount()" class="planner-card-checkbox mt-1 w-4 h-4 text-emerald-600 bg-white border-slate-300 rounded focus:ring-emerald-500">
                        <div class="cursor-pointer" onclick="window.openProfileModal('${c.id}')">
                            <h4 class="font-bold text-sm text-slate-800 leading-tight hover:text-emerald-500 transition">${c.name}</h4>
                            ${c.companyName ? `<span class="text-[10px] text-slate-400 font-semibold block">${c.companyName}</span>` : ''}
                            ${
                                isUnassigned ? 
                                `<span class="text-[9px] bg-rose-600 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider block w-fit mt-0.5"><i class="fa-solid fa-circle-exclamation mr-0.5"></i> No Driver</span>` :
                                `<span class="text-[10px] text-emerald-600 block font-bold mt-0.5"><i class="fa-solid fa-truck text-xs mr-0.5"></i> ${staffName}</span>`
                            }
                        </div>
                    </div>
                    <div class="flex items-center space-x-1.5">
                        <button onclick="window.openPlannerLeaveModal('${c.id}')" class="p-1.5 bg-amber-50 hover:bg-amber-100 rounded-full text-amber-700 text-xs transition border border-amber-200/50" title="Plan Leave / Alternate Day"><i class="fa-solid fa-calendar-plus"></i></button>
                        <a href="tel:${c.phone}" class="p-1.5 bg-slate-100 rounded-full text-slate-600 text-xs hover:bg-slate-200 transition"><i class="fa-solid fa-phone"></i></a>
                    </div>
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

    // Reset Select All state
    const selectAllCheckbox = document.getElementById('planner-select-all');
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
    window.updateSelectedCount();
}

window.toggleDeliveryStatus = function(custId, meal, statusValue, dateStr) {
    if (!window.plannerDeliveryStatus) window.plannerDeliveryStatus = {};
    if (!window.plannerDeliveryStatus[custId]) window.plannerDeliveryStatus[custId] = {};
    
    window.plannerDeliveryStatus[custId][meal] = statusValue;
    
    const c = window.customers.find(item => item.id === custId);
    if (c && statusValue) {
        if (!c.timeline) c.timeline = [];
        const recentLog = c.timeline[c.timeline.length - 1];
        const logText = `${meal.toUpperCase()} delivery status updated to: ${statusValue}.`;
        if (!recentLog || recentLog.text !== logText) {
            c.timeline.push({
                date: dateStr,
                type: 'delivery',
                text: logText
            });
            dbSaveCustomer(c).catch(console.error);
        }
    }

    dbSaveDeliveryStatus(dateStr, window.plannerDeliveryStatus)
        .then(() => {
            localStorage.setItem('hh_deliveries_v8_' + dateStr, JSON.stringify(window.plannerDeliveryStatus));
            if (dateStr === window.todayDateStr) {
                window.deliveryStatus = window.plannerDeliveryStatus;
            }
            renderSummary();
            renderDeliveryChecklistOnly();
        })
        .catch(err => {
            console.error("Save delivery status error:", err);
            showToast("விநியோக நிலையை சேமிக்க முடியவில்லை!", "error");
        });
};

// --- Leave & Alternate Day Modal Actions ---
window.openPlannerLeaveModal = async function(custId) {
    const c = window.customers.find(item => item.id === custId);
    if (!c) return;

    document.getElementById('planner-leave-cust-id').value = custId;
    document.getElementById('planner-leave-date').value = window.plannerDateStr || window.todayDateStr;
    document.getElementById('planner-alternate-date').value = '';
    
    // Configure default action
    const actionRadios = document.getElementsByName('planner-action-type');
    actionRadios[0].checked = true;
    window.togglePlannerAlternateSection();

    // Check customer meal options
    document.getElementById('planner-leave-b').checked = c.breakfast || false;
    document.getElementById('planner-leave-l').checked = c.lunch || false;
    document.getElementById('planner-leave-d').checked = c.dinner || false;

    // Check if missed food yesterday
    const warningPanel = document.getElementById('planner-leave-warning');
    const wasMissed = await wasCustomerMissedYesterday(custId);
    if (wasMissed) {
        warningPanel.classList.remove('hidden');
    } else {
        warningPanel.classList.add('hidden');
    }

    document.getElementById('planner-leave-modal').style.display = 'flex';
};

window.closePlannerLeaveModal = function() {
    document.getElementById('planner-leave-modal').style.display = 'none';
};

window.togglePlannerAlternateSection = function() {
    const actionType = document.querySelector('input[name="planner-action-type"]:checked').value;
    const altSection = document.getElementById('planner-alternate-date-section');
    if (actionType === 'alternate') {
        altSection.classList.remove('hidden');
        // Pre-fill next day
        const targetDateStr = document.getElementById('planner-leave-date').value;
        if (targetDateStr) {
            const nextDay = parseLocalDate(targetDateStr);
            nextDay.setDate(nextDay.getDate() + 1);
            document.getElementById('planner-alternate-date').value = formatLocalDate(nextDay);
        }
    } else {
        altSection.classList.add('hidden');
    }
};

window.savePlannerLeave = async function(e) {
    e.preventDefault();
    const custId = document.getElementById('planner-leave-cust-id').value;
    const customer = window.customers.find(item => item.id === custId);
    if (!customer) return;

    const dateStr = document.getElementById('planner-leave-date').value;
    const actionType = document.querySelector('input[name="planner-action-type"]:checked').value;

    const meals = [];
    if (document.getElementById('planner-leave-b').checked) meals.push('breakfast');
    if (document.getElementById('planner-leave-l').checked) meals.push('lunch');
    if (document.getElementById('planner-leave-d').checked) meals.push('dinner');

    if (meals.length === 0) {
        showToast("குறைந்தது ஒரு உணவை தேர்வு செய்க!", "alert");
        return;
    }

    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) {
        btn.disabled = true;
        btn.innerText = "Saving...";
    }

    try {
        if (actionType === 'alternate') {
            const alternateDate = document.getElementById('planner-alternate-date').value;
            if (!alternateDate) {
                showToast("மாற்றுத் தேதியை தேர்வு செய்க!", "alert");
                if (btn) {
                    btn.disabled = false;
                    btn.innerText = "சேமி / Save";
                }
                return;
            }

            const altObj = {
                id: "alt_" + Date.now(),
                custId,
                custName: customer.name,
                originalDate: dateStr,
                alternateDate,
                meals
            };

            // Add skips (meal leaves) for original date
            for (let meal of meals) {
                const skipObj = {
                    id: "skip_" + Date.now() + "_" + meal,
                    custId,
                    custName: customer.name,
                    date: dateStr,
                    meal
                };
                window.skips.push(skipObj);
                await dbSaveSkip(skipObj);
            }

            window.alternateDays.push(altObj);
            await dbSaveAlternate(altObj);
            
            // Recalculate customer end date
            customer.end = recalculateCustomerEndDate(customer);
            await dbSaveCustomer(customer);
            
            showToast("மாற்று நாள் பதிவு செய்யப்பட்டது!");
        } else {
            // Full leave / Extend End Date
            for (let meal of meals) {
                const skipObj = {
                    id: "skip_" + Date.now() + "_" + meal,
                    custId,
                    custName: customer.name,
                    date: dateStr,
                    meal
                };
                window.skips.push(skipObj);
                await dbSaveSkip(skipObj);
            }

            // Save standard day leave if all customer active meals are checked
            const hasAllSelectedMeals = (customer.breakfast === document.getElementById('planner-leave-b').checked) &&
                                       (customer.lunch === document.getElementById('planner-leave-l').checked) &&
                                       (customer.dinner === document.getElementById('planner-leave-d').checked);

            if (hasAllSelectedMeals) {
                const leaveObj = {
                    id: "leave_" + Date.now(),
                    custId,
                    custName: customer.name,
                    date: dateStr + " (1 days)",
                    extendDate: ""
                };
                window.leaves.push(leaveObj);
                await dbSaveLeave(leaveObj);
            }

            customer.end = recalculateCustomerEndDate(customer);
            await dbSaveCustomer(customer);
            showToast("லீவ் பதிவு செய்யப்பட்டது!");
        }

        window.saveAllToLocalStorageBackup();
        window.closePlannerLeaveModal();
        window.renderAll();
    } catch (err) {
        console.error("Save planner leave error:", err);
        showToast("லீவ் பதிவு செய்ய முடியவில்லை!", "error");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerText = "சேமி / Save";
        }
    }
};

// --- Planner Bulk Actions ---
window.updateSelectedCount = function() {
    const checkboxes = document.querySelectorAll('.planner-card-checkbox:checked');
    const selectedCountSpan = document.getElementById('planner-selected-count');
    if (selectedCountSpan) {
        selectedCountSpan.innerText = `${checkboxes.length} Selected`;
    }
};

window.applyBulkStaffAssign = async function() {
    const staffId = document.getElementById('bulk-staff-assign').value;
    if (!staffId) {
        showToast("ஊழியரை தேர்வு செய்க!", "alert");
        return;
    }

    const checkboxes = document.querySelectorAll('.planner-card-checkbox:checked');
    if (checkboxes.length === 0) {
        showToast("வாடிக்கையாளர்கள் யாரையும் தேர்வு செய்யவில்லை!", "alert");
        return;
    }

    let updatedCount = 0;
    for (let cb of checkboxes) {
        const custId = cb.getAttribute('data-cust-id');
        const c = window.customers.find(item => item.id === custId);
        if (c) {
            c.staffId = staffId;
            try {
                await dbSaveCustomer(c);
                updatedCount++;
            } catch (e) {
                console.error("Bulk assign error for:", c.name, e);
            }
        }
    }

    showToast(`${updatedCount} வாடிக்கையாளர்களுக்கு ஊழியர் ஒதுக்கப்பட்டார்!`);
    window.saveAllToLocalStorageBackup();
    window.renderAll();
};

window.applyBulkMenuNotes = async function() {
    const notes = document.getElementById('bulk-menu-notes').value;
    const checkboxes = document.querySelectorAll('.planner-card-checkbox:checked');
    if (checkboxes.length === 0) {
        showToast("வாடிக்கையாளர்கள் யாரையும் தேர்வு செய்யவில்லை!", "alert");
        return;
    }

    let updatedCount = 0;
    for (let cb of checkboxes) {
        const custId = cb.getAttribute('data-cust-id');
        const c = window.customers.find(item => item.id === custId);
        if (c) {
            c.notes = notes;
            try {
                await dbSaveCustomer(c);
                updatedCount++;
            } catch (e) {
                console.error("Bulk notes error for:", c.name, e);
            }
        }
    }

    showToast(`${updatedCount} வாடிக்கையாளர்களுக்கு நோட்ஸ் சேமிக்கப்பட்டது!`);
    window.saveAllToLocalStorageBackup();
    window.renderAll();
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

    const sortedMonths = Array.from(monthsSet).sort((a,b) => b.localeCompare(a));
    
    sortedMonths.forEach(p => {
        const btn = document.createElement('button');
        btn.onclick = () => toggleAccountingCycle(p);
        btn.id = `tab-period-${p}`;
        btn.className = `flex-none px-3.5 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
            window.selectedAccountingPeriod === p ? 
            'bg-emerald-600 text-white border-emerald-600 shadow' : 
            'bg-white text-slate-500 hover:bg-slate-50 border-slate-200'
        }`;
        btn.innerText = formatMonthName(p);
        tabsContainer.appendChild(btn);
    });
}

function toggleAccountingCycle(period) {
    window.selectedAccountingPeriod = period;
    
    // Update quick buttons classes
    const quickPeriods = ['cumulative', 'week', 'month', 'year'];
    quickPeriods.forEach(p => {
        const btn = document.getElementById(`tab-period-${p}`);
        if (btn) {
            if (p === period) {
                btn.className = "px-3.5 py-1.5 text-[10px] font-bold rounded-lg border transition-all bg-emerald-600 text-white border-emerald-600 shadow";
            } else {
                btn.className = "px-3.5 py-1.5 text-[10px] font-bold rounded-lg border transition-all bg-white text-slate-500 hover:bg-slate-50 border-slate-200";
            }
        }
    });

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
        if (!c.start) return;
        let match = false;
        if (period === 'cumulative') {
            match = true;
        } else if (period === 'week') {
            match = isThisWeek(c.start);
        } else if (period === 'month') {
            match = c.start.startsWith(window.todayDateStr.substring(0, 7));
        } else if (period === 'year') {
            match = c.start.startsWith(new Date().getFullYear().toString());
        } else {
            match = c.start.startsWith(period);
        }
        
        if (match) {
            earnings += (parseFloat(c.paid) || 0);
        }
    });

    // Filter expenses matching the period
    const filteredExpenses = window.expenses.filter(e => {
        if (!e.date) return false;
        if (period === 'cumulative') return true;
        if (period === 'week') return isThisWeek(e.date);
        if (period === 'month') return e.date.startsWith(window.todayDateStr.substring(0, 7));
        if (period === 'year') return e.date.startsWith(new Date().getFullYear().toString());
        return e.date.startsWith(period);
    });

    // Filter trips matching the period for fuel costs integration
    const filteredTrips = (window.trips || []).filter(t => {
        if (!t.date) return false;
        if (period === 'cumulative') return true;
        if (period === 'week') return isThisWeek(t.date);
        if (period === 'month') return t.date.startsWith(window.todayDateStr.substring(0, 7));
        if (period === 'year') return t.date.startsWith(new Date().getFullYear().toString());
        return t.date.startsWith(period);
    });

    let fuelCosts = 0;
    filteredTrips.forEach(t => {
        const metrics = window.calculateTripMetrics(t);
        fuelCosts += metrics.fuelCost;
    });

    const opsExpenses = filteredExpenses.reduce((acc, ex) => acc + (parseFloat(ex.amount) || 0), 0);
    expenditures = opsExpenses + fuelCosts;
    const netProfit = earnings - expenditures;

    // Update Console Labels
    document.getElementById('acc-lbl-earned').innerText = `₹${earnings.toLocaleString('en-IN')}`;
    document.getElementById('acc-lbl-expenses').innerText = `₹${expenditures.toLocaleString('en-IN')}`;

    const accExpCard = document.getElementById('acc-lbl-expenses')?.parentElement;
    if (accExpCard) {
        let fuelSub = document.getElementById('acc-lbl-expenses-fuel-sub');
        if (!fuelSub) {
            fuelSub = document.createElement('span');
            fuelSub.id = 'acc-lbl-expenses-fuel-sub';
            fuelSub.className = "text-[9px] text-rose-600 font-semibold block mt-0.5";
            accExpCard.appendChild(fuelSub);
        }
        fuelSub.innerText = `Ops: ₹${opsExpenses.toLocaleString('en-IN')} | Fuel: ₹${fuelCosts.toLocaleString('en-IN')}`;
    }
    
    const profitEl = document.getElementById('acc-lbl-profit');
    profitEl.innerText = `₹${netProfit.toLocaleString('en-IN')}`;
    
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


// 9. Coordinate all rendering methods — resilient per-module isolation
function renderAll() {
    const fails = [];

    // Helper: safely run a function, catch + record any error
    function safeRun(name, fn) {
        try {
            fn();
        } catch (e) {
            console.error(`renderAll: "${name}" failed —`, e);
            fails.push({ fn: name, error: e.message, stack: e.stack });
        }
    }

    safeRun('applyGlobalSettings',          () => { if (typeof window.applyGlobalSettings === 'function') window.applyGlobalSettings(); });
    safeRun('renderSummary',                () => renderSummary());
    safeRun('renderCustomerCards',          () => renderCustomerCards());
    safeRun('renderLeaveView',              () => renderLeaveView());
    safeRun('renderStaffView',              () => renderStaffView());
    safeRun('renderDeliveryChecklist',      () => renderDeliveryChecklist());
    safeRun('renderAccountsMonthTabs',      () => renderAccountsMonthTabs());
    safeRun('toggleAccountingCycle',        () => toggleAccountingCycle(window.selectedAccountingPeriod));
    safeRun('recalculateKitchenGrocery',    () => recalculateKitchenGroceryPortions());
    safeRun('renderSkipsView',              () => { if (typeof renderSkipsView === 'function') renderSkipsView(); });
    safeRun('updateStaffDropdowns',         () => { if (typeof window.updateStaffDropdowns === 'function') window.updateStaffDropdowns(); });
    safeRun('updateLeaveDropdown',          () => { if (typeof window.updateLeaveDropdown === 'function') window.updateLeaveDropdown(); });
    safeRun('renderDashboard',              () => { if (typeof window.renderDashboard === 'function') window.renderDashboard(); });
    safeRun('renderExpenseAnalytics',       () => { if (typeof window.renderExpenseAnalytics === 'function') window.renderExpenseAnalytics(); });
    safeRun('renderProfitManagement',       () => { if (typeof window.renderProfitManagement === 'function') window.renderProfitManagement(); });
    safeRun('renderVehiclesView',           () => { if (typeof window.renderVehiclesView === 'function') window.renderVehiclesView(); });

    // Report results to debug panel (no-op in production if panel not loaded)
    if (typeof window.hhDebugRenderComplete === 'function') {
        window.hhDebugRenderComplete(fails);
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
                    <th style="width: 100px;">Plan Type</th>
                    <th style="width: 100px;">Status</th>
                    <th style="width: 80px; text-align: right;">Cost (₹)</th>
                    <th style="width: 80px; text-align: right;">Paid (₹)</th>
                    <th>Morning Driver</th>
                    <th>Evening Driver</th>
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
            tbody.innerHTML = `<tr><td colspan="14" class="p-6 text-center text-slate-400 italic">No customers found matching search term.</td></tr>`;
            return;
        }

        filtered.forEach((c, idx) => {
            const tr = document.createElement('tr');
            tr.className = "excel-row";
            
            // Generate staff dropdown options
            let staffOptionsMorning = '<option value="">Morning Driver</option>';
            let staffOptionsEvening = '<option value="">Evening Driver</option>';
            window.staffList.forEach(s => {
                staffOptionsMorning += `<option value="${s.id}" ${c.staffId === s.id ? 'selected' : ''}>${s.name}</option>`;
                staffOptionsEvening += `<option value="${s.id}" ${c.eveningStaffId === s.id ? 'selected' : ''}>${s.name}</option>`;
            });

            // Plan Type Selector
            let planTypeVal = 'monthly';
            if (c.isTrial) {
                planTypeVal = 'trial';
            } else if (c.paymentTerm === 'weekly') {
                planTypeVal = 'weekly';
            }
            
            const planTypeSelect = `
                <select class="excel-cell-select font-semibold text-slate-300" onchange="window.saveExcelCustomerPlanType('${c.id}', this.value)">
                    <option value="monthly" ${planTypeVal === 'monthly' ? 'selected' : ''}>Monthly</option>
                    <option value="weekly" ${planTypeVal === 'weekly' ? 'selected' : ''}>Weekly</option>
                    <option value="trial" ${planTypeVal === 'trial' ? 'selected' : ''}>Trial</option>
                </select>
            `;

            // Status Selector
            const statusVal = c.status || 'active';
            const statusSelect = `
                <select class="excel-cell-select font-semibold text-slate-300" onchange="window.saveExcelCustomerCell('${c.id}', 'status', this.value)">
                    <option value="active" ${statusVal === 'active' ? 'selected' : ''}>Active</option>
                    <option value="withdrawn" ${statusVal === 'withdrawn' ? 'selected' : ''}>Withdrawn</option>
                </select>
            `;

            tr.innerHTML = `
                <td class="excel-index-col">${idx + 1}</td>
                <td><input type="text" class="excel-cell-input font-bold" value="${c.name}" onchange="window.saveExcelCustomerCell('${c.id}', 'name', this.value)"></td>
                <td><input type="text" class="excel-cell-input" value="${c.companyName || ''}" placeholder="None" onchange="window.saveExcelCustomerCell('${c.id}', 'companyName', this.value)"></td>
                <td><input type="tel" class="excel-cell-input" value="${c.phone}" onchange="window.saveExcelCustomerCell('${c.id}', 'phone', this.value)"></td>
                <td><input type="text" class="excel-cell-input" value="${c.address || ''}" onchange="window.saveExcelCustomerCell('${c.id}', 'address', this.value)"></td>
                <td><input type="date" class="excel-cell-input text-xs" value="${c.start || ''}" onchange="window.saveExcelCustomerCell('${c.id}', 'start', this.value)"></td>
                <td>${planTypeSelect}</td>
                <td>${statusSelect}</td>
                <td><input type="number" class="excel-cell-input text-right" value="${c.cost}" onchange="window.saveExcelCustomerCell('${c.id}', 'cost', parseFloat(this.value)||0)"></td>
                <td><input type="number" class="excel-cell-input text-right" value="${c.paid}" onchange="window.saveExcelCustomerCell('${c.id}', 'paid', parseFloat(this.value)||0)"></td>
                <td>
                    <select class="excel-cell-select font-semibold text-slate-300" onchange="window.saveExcelCustomerCell('${c.id}', 'staffId', this.value)">
                        ${staffOptionsMorning}
                    </select>
                </td>
                <td>
                    <select class="excel-cell-select font-semibold text-slate-300" onchange="window.saveExcelCustomerCell('${c.id}', 'eveningStaffId', this.value)">
                        ${staffOptionsEvening}
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

window.saveExcelCustomerPlanType = async function(id, planType) {
    const c = window.customers.find(item => item.id === id);
    if (!c) return;
    
    c.isTrial = (planType === 'trial');
    c.paymentTerm = (planType === 'weekly') ? 'weekly' : 'monthly';
    
    c.end = recalculateCustomerEndDate(c);
    
    toggleSavingLabel(true);
    try {
        await dbSaveCustomer(c);
        console.log(`Excel auto-saved customer plan: ${id} -> ${planType}`);
    } catch (e) {
        showToast("திட்டம் சேமிப்பில் தோல்வி!", "error");
    } finally {
        toggleSavingLabel(false);
    }
};

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


// --- Settings View Actions & UI Engine ---
window.applyGlobalSettings = function() {
    const biz = window.appSettings || {};
    
    // Update Header Business Name & Subtitle/Slogan
    const h1 = document.getElementById('header-biz-name');
    if (h1) h1.innerText = (biz.bizName || "Healthy Home's Foods").toUpperCase();
    
    const sub = document.getElementById('lbl-subtitle');
    if (sub) sub.innerText = biz.bizSubtitle || "மந்த்லி கணக்கு மற்றும் டியூ டிராக்கர்";

    // Set prices/costs in Add Customer form inputs placeholders or values
    const costInput = document.getElementById('cust-cost');
    const paidInput = document.getElementById('cust-paid');
    
    if (costInput && !costInput.value) {
        costInput.placeholder = `E.g. Monthly: ₹${biz.priceMonthly || 5800} / Trial: ₹${biz.priceTrial || 1200}`;
    }
};

window.renderSettingsView = function() {
    const biz = window.appSettings || {};
    
    // Fill the inputs in Settings Form
    const setBizName = document.getElementById('set-biz-name');
    if (setBizName) setBizName.value = biz.bizName || '';

    const setBizSubtitle = document.getElementById('set-biz-subtitle');
    if (setBizSubtitle) setBizSubtitle.value = biz.bizSubtitle || '';

    const setGpayNumber = document.getElementById('set-gpay-number');
    if (setGpayNumber) setGpayNumber.value = biz.gpayNumber || '';

    const setGpayName = document.getElementById('set-gpay-name');
    if (setGpayName) setGpayName.value = biz.gpayName || '';

    const setPriceMonthly = document.getElementById('set-price-monthly');
    if (setPriceMonthly) setPriceMonthly.value = biz.priceMonthly || 0;

    const setPriceTrial = document.getElementById('set-price-trial');
    if (setPriceTrial) setPriceTrial.value = biz.priceTrial || 0;

    const setDeductMonthly = document.getElementById('set-deduct-monthly');
    if (setDeductMonthly) setDeductMonthly.value = biz.deductMonthly || 0;

    const setDeductTrial = document.getElementById('set-deduct-trial');
    if (setDeductTrial) setDeductTrial.value = biz.deductTrial || 0;

    const setFuelCostPerKm = document.getElementById('set-fuel-cost-per-km');
    if (setFuelCostPerKm) setFuelCostPerKm.value = biz.fuelCostPerKm || 10;

    const setWhatsappTemplate = document.getElementById('set-whatsapp-template');
    if (setWhatsappTemplate) setWhatsappTemplate.value = biz.whatsappTemplate || '';

    const setAdminPassword = document.getElementById('set-admin-password');
    if (setAdminPassword) setAdminPassword.value = biz.adminPassword || '';
};

window.saveAppSettingsForm = async function(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Saving...`;
    }

    const updated = {
        bizName: document.getElementById('set-biz-name').value,
        bizSubtitle: document.getElementById('set-biz-subtitle').value,
        gpayNumber: document.getElementById('set-gpay-number').value,
        gpayName: document.getElementById('set-gpay-name').value,
        priceMonthly: parseFloat(document.getElementById('set-price-monthly').value) || 5800,
        priceTrial: parseFloat(document.getElementById('set-price-trial').value) || 1200,
        deductMonthly: parseFloat(document.getElementById('set-deduct-monthly').value) || 220,
        deductTrial: parseFloat(document.getElementById('set-deduct-trial').value) || 200,
        fuelCostPerKm: parseFloat(document.getElementById('set-fuel-cost-per-km').value) || 10,
        whatsappTemplate: document.getElementById('set-whatsapp-template').value,
        adminPassword: document.getElementById('set-admin-password').value
    };

    try {
        await dbSaveSettings(updated);
        window.appSettings = updated;
        localStorage.setItem('hh_settings_enterprise_v8', JSON.stringify(updated));
        
        showToast("அமைப்புகள் வெற்றிகரமாக சேமிக்கப்பட்டன!");
        applyGlobalSettings();
        
        // Go back to customers view
        switchView('customers');
    } catch (err) {
        console.error("Save settings form error:", err);
        showToast("அமைப்புகள் சேமிக்க முடியவில்லை!", "error");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fa-solid fa-check text-xs mr-1.5"></i> Save Settings / சேமிக்கவும்`;
        }
    }
};

window.resetAppSettingsDefaults = function() {
    if (confirm("அனைத்து அமைப்புகளையும் அவற்றின் அசல் மதிப்புகளுக்கு மீட்டமைக்க விரும்புகிறீர்களா?")) {
        const defaults = {
            bizName: "Healthy Home's Foods",
            bizSubtitle: "மந்த்லி கணக்கு மற்றும் டியூ டிராக்கர்",
            gpayNumber: "7868888625",
            gpayName: "Rajarajeshwari",
            priceMonthly: 5800,
            priceTrial: 1200,
            deductMonthly: 220,
            deductTrial: 200,
            whatsappTemplate: "வணக்கம் {name}, உங்களின் நிலுவைத் தொகை ₹{balance} ஆகும். நன்றி!",
            adminPassword: "1234"
        };
        
        document.getElementById('set-biz-name').value = defaults.bizName;
        document.getElementById('set-biz-subtitle').value = defaults.bizSubtitle;
        document.getElementById('set-gpay-number').value = defaults.gpayNumber;
        document.getElementById('set-gpay-name').value = defaults.gpayName;
        document.getElementById('set-price-monthly').value = defaults.priceMonthly;
        document.getElementById('set-price-trial').value = defaults.priceTrial;
        document.getElementById('set-deduct-monthly').value = defaults.deductMonthly;
        document.getElementById('set-deduct-trial').value = defaults.deductTrial;
        document.getElementById('set-whatsapp-template').value = defaults.whatsappTemplate;
        document.getElementById('set-admin-password').value = defaults.adminPassword;
        
        showToast("இயல்பு அமைப்புகள் நிரப்பப்பட்டன. சேமிக்கவும்!");
    }
};


// ==========================================
// 🌟 enterprise DASHBOARD MODULE & CALCULATIONS
// ==========================================
window.dashboardPeriod = 'month';
window.dashboardStartDate = '';
window.dashboardEndDate = '';

function getSwedishDateString(date) {
    return date.toLocaleDateString('sv').substring(0, 10);
}

window.setDashboardPeriod = function(period) {
    window.dashboardPeriod = period;
    
    // Update active classes for dashboard filter buttons
    const periods = ['today', 'tomorrow', 'week', 'month', 'lastmonth', 'custom'];
    periods.forEach(p => {
        const btn = document.getElementById(`dash-period-${p}`);
        if (btn) {
            if (p === period) {
                btn.className = "px-2.5 py-1.5 text-center text-[10px] font-bold rounded-lg transition-all active-filter-green text-white bg-emerald-600 shadow-sm";
            } else {
                btn.className = "px-2.5 py-1.5 text-center text-[10px] font-bold rounded-lg transition-all text-slate-500 hover:bg-slate-200";
            }
        }
    });

    const customInputsEl = document.getElementById('dash-custom-range-inputs');
    if (period === 'custom') {
        if (customInputsEl) customInputsEl.classList.remove('hidden');
        const startInput = document.getElementById('dash-start-date');
        const endInput = document.getElementById('dash-end-date');
        if (startInput && !startInput.value) startInput.value = window.todayDateStr;
        if (endInput && !endInput.value) endInput.value = window.todayDateStr;
        window.onDashboardCustomDateChange();
        return;
    } else {
        if (customInputsEl) customInputsEl.classList.add('hidden');
    }

    const today = new Date();
    
    if (period === 'today') {
        window.dashboardStartDate = window.todayDateStr;
        window.dashboardEndDate = window.todayDateStr;
    } else if (period === 'tomorrow') {
        const tom = new Date();
        tom.setDate(today.getDate() + 1);
        window.dashboardStartDate = getSwedishDateString(tom);
        window.dashboardEndDate = getSwedishDateString(tom);
    } else if (period === 'week') {
        const start = new Date(today);
        start.setDate(today.getDate() - today.getDay()); // Sunday
        const end = new Date(start);
        end.setDate(start.getDate() + 6); // Saturday
        window.dashboardStartDate = getSwedishDateString(start);
        window.dashboardEndDate = getSwedishDateString(end);
    } else if (period === 'month') {
        const startStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-01';
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        const endStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(lastDay).padStart(2, '0');
        window.dashboardStartDate = startStr;
        window.dashboardEndDate = endStr;
    } else if (period === 'lastmonth') {
        let year = today.getFullYear();
        let month = today.getMonth() - 1;
        if (month < 0) {
            month = 11;
            year--;
        }
        const startStr = year + '-' + String(month + 1).padStart(2, '0') + '-01';
        const lastDay = new Date(year, month + 1, 0).getDate();
        const endStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(lastDay).padStart(2, '0');
        window.dashboardStartDate = startStr;
        window.dashboardEndDate = endStr;
    }
    
    window.renderDashboard();
};

window.onDashboardCustomDateChange = function() {
    const startInput = document.getElementById('dash-start-date');
    const endInput = document.getElementById('dash-end-date');
    if (startInput && endInput) {
        window.dashboardStartDate = startInput.value || window.todayDateStr;
        window.dashboardEndDate = endInput.value || window.todayDateStr;
        window.renderDashboard();
    }
};

window.renderDashboard = function() {
    if (window.activeView !== 'dashboard') return;

    if (!window.dashboardStartDate || !window.dashboardEndDate) {
        const today = new Date();
        const startStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-01';
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        const endStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(lastDay).padStart(2, '0');
        window.dashboardStartDate = startStr;
        window.dashboardEndDate = endStr;
    }

    const rangeStart = parseLocalDate(window.dashboardStartDate);
    const rangeEnd = parseLocalDate(window.dashboardEndDate);

    const labelDateRange = document.getElementById('lbl-dash-date-range');
    if (labelDateRange) {
        labelDateRange.innerText = `காலம்: ${window.dashboardStartDate} முதல் ${window.dashboardEndDate} வரை (${window.dashboardPeriod.toUpperCase()})`;
    }

    const totalCustomers = window.customers.length;
    let activeCustomers = 0;
    let inactiveCustomers = 0;
    let withdrawnCustomers = 0;

    let trialCustomers = 0;
    let weeklyCustomers = 0;
    let monthlyCustomers = 0;

    let totalPending = 0;
    let todayRevenue = 0;
    let rangeRevenue = 0;
    
    const renewalsDue = [];
    const outstandingBalances = [];

    window.customers.forEach(c => {
        const balance = getCustomerBalance(c.cost, c.paid);
        if (balance > 0) {
            totalPending += balance;
            outstandingBalances.push(c);
        }

        if (c.start === window.todayDateStr) {
            todayRevenue += (parseFloat(c.paid) || 0);
        }

        if (c.start) {
            const cStart = parseLocalDate(c.start);
            if (cStart >= rangeStart && cStart <= rangeEnd) {
                rangeRevenue += (parseFloat(c.paid) || 0);
            }
        }

        const isWithdrawn = (c.status === 'withdrawn');
        if (isWithdrawn) {
            withdrawnCustomers++;
        } else {
            if (c.start && c.end) {
                const cStart = parseLocalDate(c.start);
                const cEnd = parseLocalDate(c.end);
                const isOverlapping = (cStart <= rangeEnd && cEnd >= rangeStart);
                
                if (isOverlapping) {
                    activeCustomers++;
                    if (c.isTrial) {
                        trialCustomers++;
                    } else if (c.paymentTerm === 'weekly') {
                        weeklyCustomers++;
                    } else {
                        monthlyCustomers++;
                    }
                } else {
                    inactiveCustomers++;
                }

                if (cEnd >= rangeStart && cEnd <= rangeEnd) {
                    renewalsDue.push(c);
                }
            } else {
                inactiveCustomers++;
            }
        }
    });

    const todayStr = window.todayDateStr;
    const todayVal = parseLocalDate(todayStr);
    const isTodaySunday = todayVal.getDay() === 0;
    let todayB = 0, todayL = 0, todayD = 0;
    if (!isTodaySunday) {
        window.customers.forEach(c => {
            if (c.status !== 'withdrawn' && c.start && c.end) {
                const start = parseLocalDate(c.start);
                const end = parseLocalDate(c.end);
                if (todayVal >= start && todayVal <= end) {
                    if (!isCustomerOnLeave(c.id, todayStr)) {
                        if (c.breakfast && !isMealSkipped(c.id, todayStr, 'breakfast')) todayB += (parseInt(c.breakfastQty) || 1);
                        if (c.lunch && !isMealSkipped(c.id, todayStr, 'lunch')) todayL += (parseInt(c.lunchQty) || 1);
                        if (c.dinner && !isMealSkipped(c.id, todayStr, 'dinner')) todayD += (parseInt(c.dinnerQty) || 1);
                    }
                }
            }
        });
    }

    const tomVal = parseLocalDate(window.todayDateStr);
    tomVal.setDate(tomVal.getDate() + 1);
    const tomorrowStr = formatLocalDate(tomVal);
    const tomDate = parseLocalDate(tomorrowStr);
    const isTomorrowSunday = tomDate.getDay() === 0;
    let tomB = 0, tomL = 0, tomD = 0;
    if (!isTomorrowSunday) {
        window.customers.forEach(c => {
            if (c.status !== 'withdrawn' && c.start && c.end) {
                const start = parseLocalDate(c.start);
                const end = parseLocalDate(c.end);
                if (tomDate >= start && tomDate <= end) {
                    if (!isCustomerOnLeave(c.id, tomorrowStr)) {
                        if (c.breakfast && !isMealSkipped(c.id, tomorrowStr, 'breakfast')) tomB += (parseInt(c.breakfastQty) || 1);
                        if (c.lunch && !isMealSkipped(c.id, tomorrowStr, 'lunch')) tomL += (parseInt(c.lunchQty) || 1);
                        if (c.dinner && !isMealSkipped(c.id, tomorrowStr, 'dinner')) tomD += (parseInt(c.dinnerQty) || 1);
                    }
                }
            }
        });
    }

    let rangeExpenses = 0;
    if (window.expenses) {
        window.expenses.forEach(e => {
            if (e.date) {
                const eDate = parseLocalDate(e.date);
                if (eDate >= rangeStart && eDate <= rangeEnd) {
                    rangeExpenses += (parseFloat(e.amount) || 0);
                }
            }
        });
    }

    const rangeProfit = rangeRevenue - rangeExpenses;

    const setInner = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    };

    setInner('dash-stat-total-cust', totalCustomers);
    setInner('dash-stat-active-cust', activeCustomers);
    setInner('dash-stat-inactive-cust', inactiveCustomers);
    setInner('dash-stat-withdrawn-cust', withdrawnCustomers);

    setInner('dash-stat-trial-cust', trialCustomers);
    setInner('dash-stat-weekly-cust', weeklyCustomers);
    setInner('dash-stat-monthly-cust', monthlyCustomers);
    setInner('dash-stat-renewal-due', renewalsDue.length);

    setInner('dash-stat-today-deliveries', isTodaySunday ? "சண்டே லீவ்" : `B:${todayB} | L:${todayL} | D:${todayD}`);
    setInner('dash-stat-tomorrow-deliveries', isTomorrowSunday ? "சண்டே லீவ்" : `B:${tomB} | L:${tomL} | D:${tomD}`);

    setInner('dash-stat-today-revenue', `₹${todayRevenue.toLocaleString('en-IN')}`);
    setInner('dash-stat-range-revenue', `₹${rangeRevenue.toLocaleString('en-IN')}`);
    setInner('dash-stat-range-expense', `₹${rangeExpenses.toLocaleString('en-IN')}`);
    
    const profitEl = document.getElementById('dash-stat-range-profit');
    if (profitEl) {
        profitEl.innerText = `₹${rangeProfit.toLocaleString('en-IN')}`;
        if (rangeProfit >= 0) {
            profitEl.className = "text-base font-bold text-emerald-700 mt-0.5";
        } else {
            profitEl.className = "text-base font-bold text-rose-700 mt-0.5";
        }
    }
    
    setInner('dash-stat-pending-payments', `₹${totalPending.toLocaleString('en-IN')}`);

    // Today's Vehicle stats for dashboard
    const todayStr = window.todayDateStr;
    const todayTrips = (window.trips || []).filter(t => t.date === todayStr);
    let todayDistance = 0;
    let todayFuel = 0;
    let todayVehicles = new Set();
    
    todayTrips.forEach(t => {
        const metrics = window.calculateTripMetrics(t);
        todayDistance += metrics.distance;
        todayFuel += metrics.fuelCost;
        if (t.vehicleId) {
            todayVehicles.add(t.vehicleId);
        }
    });
    
    setInner('dash-stat-active-vehicles', todayVehicles.size);
    setInner('dash-stat-today-distance', `${todayDistance} km`);
    setInner('dash-stat-today-fuel', `₹${todayFuel.toLocaleString('en-IN')}`);

    const setLbl = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
    };
    
    const cycleSuffixStr = window.dashboardPeriod === 'month' ? "Monthly" : (window.dashboardPeriod === 'week' ? "Weekly" : "Period");
    setLbl('dash-lbl-range-revenue', `${cycleSuffixStr} Revenue`);
    setLbl('dash-lbl-range-expense', `${cycleSuffixStr} Expense`);
    setLbl('dash-lbl-range-profit', `${cycleSuffixStr} Profit`);

    const renewalTbody = document.getElementById('dash-renewal-table-body');
    const renewalBadge = document.getElementById('dash-renewal-count-badge');
    if (renewalBadge) renewalBadge.innerText = `${renewalsDue.length} Due`;
    
    if (renewalTbody) {
        renewalTbody.innerHTML = '';
        if (renewalsDue.length === 0) {
            renewalTbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400 italic">No renewals due in this period.</td></tr>`;
        } else {
            renewalsDue.forEach(c => {
                let planLabel = c.isTrial ? 'Trial' : (c.paymentTerm === 'weekly' ? 'Weekly' : 'Monthly');
                const tr = document.createElement('tr');
                tr.className = "border-b text-xs hover:bg-slate-50";
                
                const reminderText = `வணக்கம் ${c.name}, உங்களின் உணவுச் சந்தா ${c.end} தேதியுடன் முடிவடைகிறது. தயவுசெய்து புதுப்பிக்குமாறு கேட்டுக்கொள்கிறோம். நன்றி!`;
                
                tr.innerHTML = `
                    <td class="p-2 font-semibold text-slate-700">${c.name}</td>
                    <td class="p-2 text-slate-500">${planLabel}</td>
                    <td class="p-2 font-bold text-emerald-600">${c.end}</td>
                    <td class="p-2 text-right">
                        <button onclick="window.open('https://api.whatsapp.com/send?phone=91${c.phone}&text=${encodeURIComponent(reminderText)}', '_blank')" class="bg-emerald-600 text-white px-2 py-1 rounded text-[10px] font-bold hover:bg-emerald-700 transition">
                            <i class="fa-brands fa-whatsapp"></i> Remind
                        </button>
                    </td>
                `;
                renewalTbody.appendChild(tr);
            });
        }
    }

    const outstandingTbody = document.getElementById('dash-outstanding-table-body');
    const outstandingBadge = document.getElementById('dash-outstanding-count-badge');
    if (outstandingBadge) outstandingBadge.innerText = `${outstandingBalances.length} Cust`;

    if (outstandingTbody) {
        outstandingTbody.innerHTML = '';
        if (outstandingBalances.length === 0) {
            outstandingTbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400 italic">No outstanding balances.</td></tr>`;
        } else {
            outstandingBalances.forEach(c => {
                const balance = getCustomerBalance(c.cost, c.paid);
                const tr = document.createElement('tr');
                tr.className = "border-b text-xs hover:bg-slate-50";
                
                tr.innerHTML = `
                    <td class="p-2 font-semibold text-slate-700">${c.name}</td>
                    <td class="p-2 text-slate-500 text-right">₹${c.cost}</td>
                    <td class="p-2 text-emerald-600 text-right">₹${c.paid}</td>
                    <td class="p-2 text-rose-600 font-bold text-right">₹${balance}</td>
                    <td class="p-2 text-right flex justify-end space-x-1.5">
                        <button onclick="printMemoBill('${c.id}')" class="bg-slate-100 hover:bg-slate-200 text-slate-600 p-1 rounded text-[10px] font-bold transition">
                            <i class="fa-solid fa-print"></i>
                        </button>
                        <button onclick="window.open('https://api.whatsapp.com/send?phone=91${c.phone}&text=வணக்கம் ${c.name}, உங்களின் நிலுவைத் தொகை ₹${balance} ஆகும். நன்றி!', '_blank')" class="bg-emerald-600 text-white px-2 py-1 rounded text-[10px] font-bold hover:bg-emerald-700 transition">
                            <i class="fa-brands fa-whatsapp"></i> Alert
                        </button>
                    </td>
                `;
                outstandingTbody.appendChild(tr);
            });
        }
    }
};


// ==========================================
// 🌟 KITCHEN TIMER CONTROLLER
// ==========================================
window.kitchenTimer = null;
window.kitchenTimerSeconds = 0;
window.kitchenTimerTotal = 0;

function playTimerAlertBeep() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        
        for (let i = 0; i < 3; i++) {
            const time = ctx.currentTime + (i * 0.4);
            
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);
            
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(880, time);
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(440, time);
            
            gain.gain.setValueAtTime(0.3, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.25);
            
            osc1.start(time);
            osc2.start(time);
            osc1.stop(time + 0.25);
            osc2.stop(time + 0.25);
        }
    } catch (e) {
        console.error("Kitchen beep failed:", e);
    }
}

function updateTimerDisplay() {
    const mins = Math.floor(window.kitchenTimerSeconds / 60);
    const secs = window.kitchenTimerSeconds % 60;
    const timeText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    
    const displayEl = document.getElementById('timer-display-time');
    if (displayEl) displayEl.innerText = timeText;
    
    const ringEl = document.getElementById('timer-display-ring');
    if (ringEl && window.kitchenTimerTotal > 0) {
        const pct = (window.kitchenTimerSeconds / window.kitchenTimerTotal) * 100;
        if (pct > 50) {
            ringEl.style.borderColor = "#10b981";
        } else if (pct > 15) {
            ringEl.style.borderColor = "#f59e0b";
        } else {
            ringEl.style.borderColor = "#ef4444";
        }
    }
}

window.setKitchenTimerPreset = function(minutes) {
    window.resetKitchenTimer();
    window.kitchenTimerSeconds = minutes * 60;
    window.kitchenTimerTotal = minutes * 60;
    updateTimerDisplay();
};

window.setKitchenTimerCustom = function() {
    const input = document.getElementById('kitchen-timer-custom');
    if (input && input.value) {
        const mins = parseInt(input.value);
        if (mins > 0) {
            window.setKitchenTimerPreset(mins);
            input.value = '';
        }
    }
};

window.startKitchenTimer = function() {
    if (window.kitchenTimerSeconds <= 0) return;
    if (window.kitchenTimer) return;
    
    const btnStart = document.getElementById('btn-timer-start');
    const btnPause = document.getElementById('btn-timer-pause');
    if (btnStart) btnStart.classList.add('hidden');
    if (btnPause) btnPause.classList.remove('hidden');
    
    window.kitchenTimer = setInterval(() => {
        if (window.kitchenTimerSeconds > 0) {
            window.kitchenTimerSeconds--;
            updateTimerDisplay();
        } else {
            window.resetKitchenTimer();
            playTimerAlertBeep();
            showToast("சமையலறை தயாரிப்பு நேரம் முடிந்தது! Timer Finished 🔔", "info");
        }
    }, 1000);
};

window.pauseKitchenTimer = function() {
    if (window.kitchenTimer) {
        clearInterval(window.kitchenTimer);
        window.kitchenTimer = null;
    }
    const btnStart = document.getElementById('btn-timer-start');
    const btnPause = document.getElementById('btn-timer-pause');
    if (btnStart) btnStart.classList.remove('hidden');
    if (btnPause) btnPause.classList.add('hidden');
};

window.resetKitchenTimer = function() {
    window.pauseKitchenTimer();
    window.kitchenTimerSeconds = 0;
    window.kitchenTimerTotal = 0;
    updateTimerDisplay();
    const ringEl = document.getElementById('timer-display-ring');
    if (ringEl) ringEl.style.borderColor = "#334155";
};


// ==========================================
// 🌟 EXPENSE ANALYTICS CONTROLLER
// ==========================================
window.expenseAnalyticsPeriod = 'month';
window.expenseAnalyticsStart = '';
window.expenseAnalyticsEnd = '';

window.setExpenseAnalyticsPeriod = function(period) {
    window.expenseAnalyticsPeriod = period;
    
    const periods = ['today', 'week', 'month', 'custom'];
    periods.forEach(p => {
        const btn = document.getElementById(`exp-anal-${p}`);
        if (btn) {
            if (p === period) {
                btn.className = "px-2.5 py-1 text-[9px] font-bold rounded-lg transition-all text-white bg-rose-600 shadow-sm";
            } else {
                btn.className = "px-2.5 py-1 text-[9px] font-bold rounded-lg transition-all text-slate-500 hover:bg-slate-200";
            }
        }
    });

    const rangeInputs = document.getElementById('exp-anal-custom-range');
    if (period === 'custom') {
        if (rangeInputs) rangeInputs.classList.remove('hidden');
        const start = document.getElementById('exp-anal-start');
        const end = document.getElementById('exp-anal-end');
        if (start && !start.value) start.value = window.todayDateStr;
        if (end && !end.value) end.value = window.todayDateStr;
        window.onExpenseAnalyticsCustomDateChange();
        return;
    } else {
        if (rangeInputs) rangeInputs.classList.add('hidden');
    }

    const today = new Date();
    if (period === 'today') {
        window.expenseAnalyticsStart = window.todayDateStr;
        window.expenseAnalyticsEnd = window.todayDateStr;
    } else if (period === 'week') {
        const start = new Date(today);
        start.setDate(today.getDate() - today.getDay());
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        window.expenseAnalyticsStart = getSwedishDateString(start);
        window.expenseAnalyticsEnd = getSwedishDateString(end);
    } else if (period === 'month') {
        const startStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-01';
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        const endStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(lastDay).padStart(2, '0');
        window.expenseAnalyticsStart = startStr;
        window.expenseAnalyticsEnd = endStr;
    }
    
    window.renderExpenseAnalytics();
};

window.onExpenseAnalyticsCustomDateChange = function() {
    const start = document.getElementById('exp-anal-start');
    const end = document.getElementById('exp-anal-end');
    if (start && end) {
        window.expenseAnalyticsStart = start.value || window.todayDateStr;
        window.expenseAnalyticsEnd = end.value || window.todayDateStr;
        window.renderExpenseAnalytics();
    }
};

window.renderExpenseAnalytics = function() {
    const container = document.getElementById('expense-analytics-cards');
    if (!container) return;
    container.innerHTML = '';
    
    if (!window.expenseAnalyticsStart || !window.expenseAnalyticsEnd) return;
    
    const rangeStart = new Date(window.expenseAnalyticsStart + 'T00:00:00');
    const rangeEnd = new Date(window.expenseAnalyticsEnd + 'T23:59:59');

    const categories = ['Groceries', 'Vegetables', 'Gas', 'Salary', 'Petrol', 'Rent', 'Others'];
    const totals = {};
    categories.forEach(c => totals[c] = 0);
    
    let grandTotal = 0;
    if (window.expenses) {
        window.expenses.forEach(e => {
            if (e.date) {
                const eDate = new Date(e.date + 'T00:00:00');
                if (eDate >= rangeStart && eDate <= rangeEnd) {
                    const cat = e.category || 'Others';
                    const amount = parseFloat(e.amount) || 0;
                    totals[cat] = (totals[cat] || 0) + amount;
                    grandTotal += amount;
                }
            }
        });
    }

    categories.forEach((cat, index) => {
        const amt = totals[cat];
        const pct = grandTotal > 0 ? ((amt / grandTotal) * 100).toFixed(0) : 0;
        
        let colorTheme = 'border-slate-200 bg-slate-50 text-slate-500';
        let barColor = 'bg-slate-700';
        
        if (cat === 'Groceries') { colorTheme = 'border-emerald-200 bg-emerald-50 text-emerald-600'; barColor = 'bg-emerald-600'; }
        else if (cat === 'Vegetables') { colorTheme = 'border-lime-200 bg-lime-50 text-lime-600'; barColor = 'bg-lime-500'; }
        else if (cat === 'Gas') { colorTheme = 'border-rose-200 bg-rose-50 text-rose-600'; barColor = 'bg-rose-600'; }
        else if (cat === 'Salary') { colorTheme = 'border-purple-200 bg-purple-50 text-purple-600'; barColor = 'bg-purple-600'; }
        else if (cat === 'Petrol') { colorTheme = 'border-blue-200 bg-blue-50 text-blue-600'; barColor = 'bg-blue-600'; }
        else if (cat === 'Rent') { colorTheme = 'border-amber-200 bg-amber-50 text-amber-600'; barColor = 'bg-amber-600'; }
        
        const card = document.createElement('div');
        card.className = `p-3 rounded-2xl border ${colorTheme} flex flex-col justify-between space-y-1.5 shadow-sm text-left`;
        card.innerHTML = `
            <div>
                <span class="block text-[9px] font-bold uppercase tracking-wider">${cat}</span>
                <span class="text-sm font-bold text-slate-800">₹${amt.toLocaleString('en-IN')}</span>
            </div>
            <div class="space-y-1">
                <div class="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div class="${barColor} h-full" style="width: ${pct}%"></div>
                </div>
                <span class="text-[9px] font-semibold text-slate-500">${pct}% of Total</span>
            </div>
        `;
        container.appendChild(card);
    });
};


// ==========================================
// 🌟 PROFIT MANAGEMENT CONTROLLER
// ==========================================
window.profitSelectedMonth = "";

function generateProfitMonthTabs() {
    const container = document.getElementById('profit-month-tabs');
    if (!container) return;
    container.innerHTML = '';
    
    const months = [];
    const today = new Date();
    for (let i = 0; i < 6; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        months.push(monthStr);
    }
    
    months.forEach(m => {
        const btn = document.createElement('button');
        btn.className = (m === window.profitSelectedMonth)
            ? "px-3 py-1.5 text-[10px] font-bold rounded-lg border bg-emerald-600 text-white border-emerald-600 shadow"
            : "px-3 py-1.5 text-[10px] font-bold rounded-lg border bg-white text-slate-500 hover:bg-slate-50 border-slate-200";
        
        const [year, month] = m.split('-');
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        btn.innerText = `${monthNames[parseInt(month)-1]} ${year}`;
        
        btn.onclick = function() {
            window.profitSelectedMonth = m;
            generateProfitMonthTabs();
            window.renderProfitManagement();
        };
        container.appendChild(btn);
    });
}

window.renderProfitManagement = function() {
    if (window.activeView !== 'profit') return;

    if (!window.profitSelectedMonth) {
        const today = new Date();
        window.profitSelectedMonth = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0');
    }
    
    generateProfitMonthTabs();

    const [year, month] = window.profitSelectedMonth.split('-').map(Number);
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59);
    
    let totalGrossRevenue = 0;
    let totalCashRevenue = 0;
    let totalExpenses = 0;

    const tbody = document.getElementById('profit-allocation-tbody');
    if (tbody) tbody.innerHTML = '';

    window.customers.forEach(c => {
        if (!c.start || !c.end) return;
        if (c.status === 'withdrawn') return;

        const cStart = new Date(c.start + 'T00:00:00');
        const cEnd = new Date(c.end + 'T23:59:59');

        const overlapStart = new Date(Math.max(cStart.getTime(), monthStart.getTime()));
        const overlapEnd = new Date(Math.min(cEnd.getTime(), monthEnd.getTime()));

        if (overlapStart <= overlapEnd) {
            const diffTime = Math.abs(overlapEnd.getTime() - overlapStart.getTime());
            const daysInMonth = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
            
            const totalDiffTime = Math.abs(cEnd.getTime() - cStart.getTime());
            const totalDays = Math.ceil(totalDiffTime / (1000 * 60 * 60 * 24)) || 1;

            const cost = parseFloat(c.cost) || 0;
            const paid = parseFloat(c.paid) || 0;

            const dailyRate = cost / totalDays;
            const cashDailyRate = paid / totalDays;

            const recognized = dailyRate * daysInMonth;
            const cashRecognized = cashDailyRate * daysInMonth;

            let deferred = 0;
            if (cEnd > monthEnd) {
                const deferredDiff = Math.abs(cEnd.getTime() - monthEnd.getTime());
                const deferredDays = Math.floor(deferredDiff / (1000 * 60 * 60 * 24));
                deferred = dailyRate * deferredDays;
            }

            totalGrossRevenue += recognized;
            totalCashRevenue += cashRecognized;

            if (tbody) {
                const tr = document.createElement('tr');
                tr.className = "border-b text-xs hover:bg-slate-50";
                
                let planLabel = c.isTrial ? 'Trial' : (c.paymentTerm === 'weekly' ? 'Weekly' : 'Monthly');
                
                tr.innerHTML = `
                    <td class="p-2.5 font-semibold text-slate-700">${c.name}</td>
                    <td class="p-2.5 text-slate-500">${planLabel}</td>
                    <td class="p-2.5 text-right font-medium">₹${cost.toFixed(2)}</td>
                    <td class="p-2.5 text-right text-emerald-600 font-medium">₹${paid.toFixed(2)}</td>
                    <td class="p-2.5 text-center font-bold text-slate-600">${daysInMonth} days</td>
                    <td class="p-2.5 text-right text-emerald-700 font-bold">₹${recognized.toFixed(2)}</td>
                    <td class="p-2.5 text-right text-amber-700 font-bold">₹${deferred.toFixed(2)}</td>
                `;
                tbody.appendChild(tr);
            }
        }
    });

    let operationalExpenses = 0;
    if (window.expenses) {
        window.expenses.forEach(e => {
            if (e.date && e.date.startsWith(window.profitSelectedMonth)) {
                operationalExpenses += (parseFloat(e.amount) || 0);
            }
        });
    }

    // Monthly Vehicle Fuel cost calculation
    let monthlyFuelCost = 0;
    if (window.trips) {
        window.trips.forEach(t => {
            if (t.date && t.date.startsWith(window.profitSelectedMonth)) {
                const metrics = window.calculateTripMetrics(t);
                monthlyFuelCost += metrics.fuelCost;
            }
        });
    }

    totalExpenses = operationalExpenses + monthlyFuelCost;

    const netProfit = totalGrossRevenue - totalExpenses;
    const projectedProfit = totalGrossRevenue - totalExpenses;
    const expectedProfit = totalCashRevenue - totalExpenses;

    const setEl = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    };

    setEl('prof-lbl-gross', `₹${totalGrossRevenue.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
    setEl('prof-lbl-expenses', `₹${totalExpenses.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
    setEl('prof-lbl-net', `₹${netProfit.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
    setEl('prof-lbl-projected', `₹${projectedProfit.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
    setEl('prof-lbl-expected', `₹${expectedProfit.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);

    const expensesCard = document.getElementById('prof-lbl-expenses')?.parentElement;
    if (expensesCard) {
        let fuelSub = document.getElementById('prof-lbl-expenses-fuel-sub');
        if (!fuelSub) {
            fuelSub = document.createElement('span');
            fuelSub.id = 'prof-lbl-expenses-fuel-sub';
            fuelSub.className = "text-[9px] text-rose-600 font-semibold block mt-0.5";
            expensesCard.appendChild(fuelSub);
        }
        fuelSub.innerText = `Ops: ₹${operationalExpenses.toLocaleString('en-IN')} | Fuel: ₹${monthlyFuelCost.toLocaleString('en-IN')}`;
    }

    const netEl = document.getElementById('prof-lbl-net');
    if (netEl) {
        netEl.className = netProfit >= 0 ? "text-base font-bold text-emerald-750" : "text-base font-bold text-rose-750";
    }
};


// ==========================================
// 🌟 ROUTE WISE ACTIONS: PRINT, PDF & WHATSAPP
// ==========================================
window.printDeliveryChecklist = function() {
    window.print();
};

window.downloadDeliveryPDF = function() {
    const dateStr = window.plannerDateStr || window.todayDateStr;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Daily Route Checklist - ${dateStr}</title>
            <style>
                body { font-family: sans-serif; padding: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                h1 { font-size: 18px; margin-bottom: 5px; }
            </style>
        </head>
        <body onload="window.print(); window.close();">
            <h1>Healthy Home's Foods - Route Delivery Checklist</h1>
            <p><strong>Date:</strong> ${dateStr} | <strong>Route:</strong> ${window.activeDeliveryRouteType.toUpperCase()}</p>
            <table>
                <thead>
                    <tr>
                        <th>Customer</th>
                        <th>Address</th>
                        <th>Driver</th>
                        <th>Meal & Status</th>
                    </tr>
                </thead>
                <tbody>
    `);
    
    const today = new Date(dateStr);
    today.setHours(0,0,0,0);
    const staffFilterId = document.getElementById('route-staff-filter').value;
    
    const activeList = window.customers.filter(c => {
        if (!c.start || !c.end) return false;
        const start = new Date(c.start);
        const end = new Date(c.end);
        const inRange = today >= start && today <= end;
        const altB = isAlternateMealScheduled(c.id, dateStr, 'breakfast');
        const altL = isAlternateMealScheduled(c.id, dateStr, 'lunch');
        const altD = isAlternateMealScheduled(c.id, dateStr, 'dinner');
        
        if (!inRange && !altB && !altL && !altD) return false;
        const onLeave = isCustomerOnLeave(c.id, dateStr);
        if (onLeave && !altB && !altL && !altD) return false;
        
        const hasB = (c.breakfast && inRange && !isCustomerOnLeaveForMeal(c.id, dateStr, 'breakfast')) || altB;
        const hasL = (c.lunch && inRange && !isCustomerOnLeaveForMeal(c.id, dateStr, 'lunch')) || altL;
        const hasD = (c.dinner && inRange && !isCustomerOnLeaveForMeal(c.id, dateStr, 'dinner')) || altD;
        
        if (window.activeDeliveryRouteType === 'morning') {
            if (!hasB && !hasL) return false;
        } else {
            if (!hasD) return false;
        }
        
        const driverId = (window.activeDeliveryRouteType === 'morning') ? (c.staffId || "") : (c.eveningStaffId || "");
        if (staffFilterId !== 'all' && driverId !== staffFilterId) return false;
        return true;
    });

    activeList.forEach(c => {
        const driverId = (window.activeDeliveryRouteType === 'morning') ? (c.staffId || "") : (c.eveningStaffId || "");
        const staff = window.staffList.find(s => s.id === driverId);
        const staffName = staff ? staff.name : 'Unassigned';
        
        let mealDetails = [];
        const meals = [
            { id: 'breakfast', label: 'Breakfast', active: c.breakfast, qty: c.breakfastQty || 1 },
            { id: 'lunch', label: 'Lunch', active: c.lunch, qty: c.lunchQty || 1 },
            { id: 'dinner', label: 'Dinner', active: c.dinner, qty: c.dinnerQty || 1 }
        ];
        
        meals.forEach(m => {
            const inRange = today >= new Date(c.start) && today <= new Date(c.end);
            const isAlt = isAlternateMealScheduled(c.id, dateStr, m.id);
            const matchesRoute = (window.activeDeliveryRouteType === 'morning') ? (m.id !== 'dinner') : (m.id === 'dinner');
            
            if ((m.active || isAlt) && matchesRoute) {
                const isLeave = isCustomerOnLeaveForMeal(c.id, dateStr, m.id);
                if (isLeave && !isAlt) {
                    mealDetails.push(`${m.label} (LEAVE)`);
                } else {
                    const rawVal = window.plannerDeliveryStatus[c.id] && window.plannerDeliveryStatus[c.id][m.id];
                    const status = (typeof rawVal === 'string') ? rawVal : (rawVal ? 'Delivered' : 'Pending');
                    mealDetails.push(`${m.label} (x${m.qty}): ${status || 'Pending'}`);
                }
            }
        });
        
        printWindow.document.write(`
            <tr>
                <td><strong>${c.name}</strong></td>
                <td>${c.address || ''}</td>
                <td>${staffName}</td>
                <td>${mealDetails.join(', ')}</td>
            </tr>
        `);
    });
    
    printWindow.document.write(`
                </tbody>
            </table>
        </body>
        </html>
    `);
    printWindow.document.close();
};

window.shareDeliveryWhatsApp = function() {
    const staffFilterId = document.getElementById('route-staff-filter').value;
    const staff = window.staffList.find(s => s.id === staffFilterId);
    if (!staff) {
        showToast("வாட்ஸ்அப்பில் பகிர முதலில் ஒரு ஊழியரைத் தேர்வு செய்யவும்!", "error");
        return;
    }
    
    const dateStr = window.plannerDateStr || window.todayDateStr;
    const today = new Date(dateStr);
    today.setHours(0,0,0,0);
    
    let text = `*Healthy Home's Foods Checklist*\n*Driver:* ${staff.name}\n*Date:* ${dateStr}\n*Route:* ${window.activeDeliveryRouteType.toUpperCase()}\n\n`;
    
    const activeList = window.customers.filter(c => {
        if (!c.start || !c.end) return false;
        const start = new Date(c.start);
        const end = new Date(c.end);
        const inRange = today >= start && today <= end;
        const altB = isAlternateMealScheduled(c.id, dateStr, 'breakfast');
        const altL = isAlternateMealScheduled(c.id, dateStr, 'lunch');
        const altD = isAlternateMealScheduled(c.id, dateStr, 'dinner');
        
        if (!inRange && !altB && !altL && !altD) return false;
        const onLeave = isCustomerOnLeave(c.id, dateStr);
        if (onLeave && !altB && !altL && !altD) return false;
        
        const hasB = (c.breakfast && inRange && !isCustomerOnLeaveForMeal(c.id, dateStr, 'breakfast')) || altB;
        const hasL = (c.lunch && inRange && !isCustomerOnLeaveForMeal(c.id, dateStr, 'lunch')) || altL;
        const hasD = (c.dinner && inRange && !isCustomerOnLeaveForMeal(c.id, dateStr, 'dinner')) || altD;
        
        if (window.activeDeliveryRouteType === 'morning') {
            if (!hasB && !hasL) return false;
        } else {
            if (!hasD) return false;
        }
        
        const driverId = (window.activeDeliveryRouteType === 'morning') ? (c.staffId || "") : (c.eveningStaffId || "");
        return driverId === staffFilterId;
    });
    
    if (activeList.length === 0) {
        showToast("இந்த ஊழியருக்கு இன்று விநியோகங்கள் இல்லை!", "error");
        return;
    }
    
    activeList.forEach((c, index) => {
        let mealDetails = [];
        const meals = [
            { id: 'breakfast', label: 'Breakfast', active: c.breakfast, qty: c.breakfastQty || 1 },
            { id: 'lunch', label: 'Lunch', active: c.lunch, qty: c.lunchQty || 1 },
            { id: 'dinner', label: 'Dinner', active: c.dinner, qty: c.dinnerQty || 1 }
        ];
        
        meals.forEach(m => {
            const inRange = today >= new Date(c.start) && today <= new Date(c.end);
            const isAlt = isAlternateMealScheduled(c.id, dateStr, m.id);
            const matchesRoute = (window.activeDeliveryRouteType === 'morning') ? (m.id !== 'dinner') : (m.id === 'dinner');
            
            if ((m.active || isAlt) && matchesRoute) {
                const isLeave = isCustomerOnLeaveForMeal(c.id, dateStr, m.id);
                if (isLeave && !isAlt) {
                    mealDetails.push(`${m.label} (LEAVE)`);
                } else {
                    const rawVal = window.plannerDeliveryStatus[c.id] && window.plannerDeliveryStatus[c.id][m.id];
                    const status = (typeof rawVal === 'string') ? rawVal : (rawVal ? 'Delivered' : 'Pending');
                    mealDetails.push(`${m.label} (x${m.qty}): ${status || 'Pending'}`);
                }
            }
        });
        
        text += `${index + 1}. *${c.name}*\n📍 ${c.address || ''}\n🍽️ ${mealDetails.join(', ')}\n\n`;
    });
    
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
};


// ==========================================
// 📊 REPORTS CONSOLE ENGINE
// ==========================================
window.onChangeReportType = function() {
    const typeSelect = document.getElementById('reports-type-select');
    const tableTitle = document.getElementById('reports-table-title');
    if (typeSelect && tableTitle) {
        const text = typeSelect.options[typeSelect.selectedIndex].text;
        tableTitle.innerText = `${text} - விபரங்கள் / Details`;
    }
    window.renderReportsConsole();
};

window.onReportMonthSelect = function() {
    const monthSelect = document.getElementById('reports-month-select');
    const startInput = document.getElementById('reports-start-date');
    const endInput = document.getElementById('reports-end-date');
    if (monthSelect && monthSelect.value && startInput && endInput) {
        const [year, month] = monthSelect.value.split('-');
        const lastDay = new Date(year, month, 0).getDate();
        startInput.value = `${year}-${month}-01`;
        endInput.value = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
        window.renderReportsConsole();
    }
};

window.renderReportsConsole = function() {
    const typeSelect = document.getElementById('reports-type-select');
    const startInput = document.getElementById('reports-start-date');
    const endInput = document.getElementById('reports-end-date');
    const monthSelect = document.getElementById('reports-month-select');
    
    if (!typeSelect || !startInput || !endInput) return;
    
    // Initialize month dropdown options if empty
    if (monthSelect && monthSelect.options.length <= 1) {
        monthSelect.innerHTML = '<option value="">Choose month...</option>';
        const today = new Date();
        for (let i = 0; i < 12; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
            monthSelect.innerHTML += `<option value="${val}">${label}</option>`;
        }
    }
    
    const reportType = typeSelect.value;
    const startStr = startInput.value;
    const endStr = endInput.value;
    
    if (!startStr || !endStr) return;
    
    const startDate = new Date(startStr + 'T00:00:00');
    const endDate = new Date(endStr + 'T23:59:59');
    
    const cardsContainer = document.getElementById('reports-summary-cards');
    const thead = document.getElementById('reports-table-thead');
    const tbody = document.getElementById('reports-table-tbody');
    
    if (!cardsContainer || !thead || !tbody) return;
    
    cardsContainer.innerHTML = '';
    thead.innerHTML = '';
    tbody.innerHTML = '';
    
    let reportRows = [];
    
    // Build reports based on selection
    if (reportType === 'customer') {
        const list = window.customers.filter(c => {
            if (!c.start || !c.end) return false;
            const start = new Date(c.start + 'T00:00:00');
            const end = new Date(c.end + 'T23:59:59');
            return start <= endDate && end >= startDate;
        });
        
        let total = list.length;
        let active = list.filter(c => c.status === 'active').length;
        let withdrawn = list.filter(c => c.status === 'withdrawn').length;
        let trial = list.filter(c => c.isTrial).length;
        
        cardsContainer.innerHTML = `
            <div class="bg-white p-3 rounded-xl border shadow-sm">
                <span class="text-slate-400 block font-semibold text-[10px]">Total Filtered</span>
                <h4 class="text-base font-bold text-slate-700 mt-0.5">${total}</h4>
            </div>
            <div class="bg-emerald-50 text-emerald-800 p-3 rounded-xl border shadow-sm">
                <span class="text-slate-500 block font-semibold text-[10px]">Active</span>
                <h4 class="text-base font-bold text-emerald-600 mt-0.5">${active}</h4>
            </div>
            <div class="bg-amber-50 text-amber-800 p-3 rounded-xl border shadow-sm">
                <span class="text-slate-500 block font-semibold text-[10px]">Trial Plan</span>
                <h4 class="text-base font-bold text-amber-600 mt-0.5">${trial}</h4>
            </div>
            <div class="bg-rose-50 text-rose-800 p-3 rounded-xl border shadow-sm">
                <span class="text-slate-500 block font-semibold text-[10px]">Withdrawn</span>
                <h4 class="text-base font-bold text-rose-600 mt-0.5">${withdrawn}</h4>
            </div>
        `;
        
        thead.innerHTML = `
            <tr class="bg-slate-50 font-bold border-b text-slate-500">
                <th class="p-2.5">Name</th>
                <th class="p-2.5">Company</th>
                <th class="p-2.5">Phone</th>
                <th class="p-2.5">Status</th>
                <th class="p-2.5">Plan Type</th>
                <th class="p-2.5">Start Date</th>
                <th class="p-2.5">End Date</th>
                <th class="p-2.5 text-right">Cost (₹)</th>
                <th class="p-2.5 text-right">Paid (₹)</th>
                <th class="p-2.5 text-right">Outstanding (₹)</th>
            </tr>
        `;
        
        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" class="p-4 text-center text-slate-400 italic">No customer records in this range.</td></tr>`;
        } else {
            list.forEach(c => {
                const bal = getCustomerBalance(c.cost, c.paid);
                const tr = document.createElement('tr');
                tr.className = "border-b hover:bg-slate-50";
                tr.innerHTML = `
                    <td class="p-2.5 font-bold text-slate-700">${c.name}</td>
                    <td class="p-2.5 text-slate-500">${c.companyName || '-'}</td>
                    <td class="p-2.5 text-slate-500">${c.phone}</td>
                    <td class="p-2.5"><span class="px-2 py-0.5 rounded-full text-[9px] font-bold ${c.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}">${c.status.toUpperCase()}</span></td>
                    <td class="p-2.5 text-slate-500">${c.isTrial ? 'Trial' : c.paymentTerm}</td>
                    <td class="p-2.5 text-slate-500">${c.start || ''}</td>
                    <td class="p-2.5 text-slate-500">${c.end || ''}</td>
                    <td class="p-2.5 text-right font-semibold">₹${c.cost || 0}</td>
                    <td class="p-2.5 text-right font-semibold text-emerald-600">₹${c.paid || 0}</td>
                    <td class="p-2.5 text-right font-bold text-rose-600">₹${bal}</td>
                `;
                tbody.appendChild(tr);
            });
        }
    } 
    else if (reportType === 'revenue') {
        let list = [];
        window.customers.forEach(c => {
            const ledger = c.ledger || [];
            ledger.forEach(l => {
                if (l.date && l.credit > 0) {
                    const lDate = new Date(l.date + 'T00:00:00');
                    if (lDate >= startDate && lDate <= endDate) {
                        list.push({
                            date: l.date,
                            name: c.name,
                            phone: c.phone,
                            detail: l.detail || 'Subscription Payment',
                            credit: l.credit
                        });
                    }
                }
            });
        });
        
        list.sort((a,b) => b.date.localeCompare(a.date));
        let totalVal = list.reduce((sum, item) => sum + item.credit, 0);
        let count = list.length;
        let avg = count > 0 ? (totalVal / count).toFixed(2) : 0;
        
        cardsContainer.innerHTML = `
            <div class="bg-emerald-50 text-emerald-800 p-3 rounded-xl border shadow-sm col-span-2">
                <span class="text-slate-500 block font-semibold text-[10px]">Total Cash Collections Received</span>
                <h4 class="text-base font-bold text-emerald-600 mt-0.5">₹${totalVal}</h4>
            </div>
            <div class="bg-white p-3 rounded-xl border shadow-sm">
                <span class="text-slate-400 block font-semibold text-[10px]">Total Transactions</span>
                <h4 class="text-base font-bold text-slate-700 mt-0.5">${count}</h4>
            </div>
            <div class="bg-white p-3 rounded-xl border shadow-sm">
                <span class="text-slate-400 block font-semibold text-[10px]">Avg Transaction Size</span>
                <h4 class="text-base font-bold text-slate-700 mt-0.5">₹${avg}</h4>
            </div>
        `;
        
        thead.innerHTML = `
            <tr class="bg-slate-50 font-bold border-b text-slate-500">
                <th class="p-2.5">Date</th>
                <th class="p-2.5">Customer Name</th>
                <th class="p-2.5">Phone</th>
                <th class="p-2.5">Details</th>
                <th class="p-2.5 text-right">Amount Received (₹)</th>
            </tr>
        `;
        
        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400 italic">No cash collection payments in this range.</td></tr>`;
        } else {
            list.forEach(item => {
                const tr = document.createElement('tr');
                tr.className = "border-b hover:bg-slate-50";
                tr.innerHTML = `
                    <td class="p-2.5 font-bold text-slate-700">${item.date}</td>
                    <td class="p-2.5 text-slate-600 font-semibold">${item.name}</td>
                    <td class="p-2.5 text-slate-500">${item.phone}</td>
                    <td class="p-2.5 text-slate-500">${item.detail}</td>
                    <td class="p-2.5 text-right font-bold text-emerald-600">₹${item.credit}</td>
                `;
                tbody.appendChild(tr);
            });
        }
    } 
    else if (reportType === 'expense') {
        const list = window.expenses.filter(e => {
            if (!e.date) return false;
            const eDate = new Date(e.date + 'T00:00:00');
            return eDate >= startDate && eDate <= endDate;
        });
        
        list.sort((a,b) => b.date.localeCompare(a.date));
        
        let totalVal = list.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
        let count = list.length;
        let groceries = list.filter(e => e.category === 'Groceries').reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
        let salaries = list.filter(e => e.category === 'Salary').reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
        
        cardsContainer.innerHTML = `
            <div class="bg-rose-50 text-rose-800 p-3 rounded-xl border shadow-sm">
                <span class="text-slate-500 block font-semibold text-[10px]">Total Expenses Logged</span>
                <h4 class="text-base font-bold text-rose-600 mt-0.5">₹${totalVal}</h4>
            </div>
            <div class="bg-white p-3 rounded-xl border shadow-sm">
                <span class="text-slate-400 block font-semibold text-[10px]">Total Logs</span>
                <h4 class="text-base font-bold text-slate-700 mt-0.5">${count}</h4>
            </div>
            <div class="bg-white p-3 rounded-xl border shadow-sm">
                <span class="text-slate-400 block font-semibold text-[10px]">Grocery Spending</span>
                <h4 class="text-base font-bold text-slate-700 mt-0.5">₹${groceries}</h4>
            </div>
            <div class="bg-white p-3 rounded-xl border shadow-sm">
                <span class="text-slate-400 block font-semibold text-[10px]">Salaries Paid</span>
                <h4 class="text-base font-bold text-slate-700 mt-0.5">₹${salaries}</h4>
            </div>
        `;
        
        thead.innerHTML = `
            <tr class="bg-slate-50 font-bold border-b text-slate-500">
                <th class="p-2.5">Date</th>
                <th class="p-2.5">Expense Description</th>
                <th class="p-2.5">Category</th>
                <th class="p-2.5 text-right">Amount (₹)</th>
            </tr>
        `;
        
        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400 italic">No expenses recorded in this range.</td></tr>`;
        } else {
            list.forEach(e => {
                const tr = document.createElement('tr');
                tr.className = "border-b hover:bg-slate-50";
                tr.innerHTML = `
                    <td class="p-2.5 font-bold text-slate-700">${e.date}</td>
                    <td class="p-2.5 text-slate-600 font-semibold">${e.item || ''}</td>
                    <td class="p-2.5 text-slate-500 font-semibold">${e.category || 'Others'}</td>
                    <td class="p-2.5 text-right font-bold text-rose-600">₹${e.amount}</td>
                `;
                tbody.appendChild(tr);
            });
        }
    } 
    else if (reportType === 'profit') {
        const startY = startDate.getFullYear();
        const startM = startDate.getMonth();
        const endY = endDate.getFullYear();
        const endM = endDate.getMonth();
        
        let months = [];
        let currY = startY;
        let currM = startM;
        
        while (currY < endY || (currY === endY && currM <= endM)) {
            months.push({ year: currY, month: currM });
            currM++;
            if (currM > 11) {
                currM = 0;
                currY++;
            }
        }
        
        let grandAccrual = 0, grandCash = 0, grandExp = 0, grandProfit = 0;
        
        thead.innerHTML = `
            <tr class="bg-slate-50 font-bold border-b text-slate-500">
                <th class="p-2.5">Calendar Month</th>
                <th class="p-2.5 text-right">Accrual Recognized Revenue</th>
                <th class="p-2.5 text-right">Cash Received (Recognized)</th>
                <th class="p-2.5 text-right">Expenses Paid</th>
                <th class="p-2.5 text-right">Accrual Net Profit</th>
            </tr>
        `;
        
        months.forEach(m => {
            const mDateStr = `${m.year}-${String(m.month + 1).padStart(2, '0')}`;
            const label = new Date(m.year, m.month, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
            
            let accrualRev = 0;
            let cashRev = 0;
            const daysInMonth = new Date(m.year, m.month + 1, 0).getDate();
            const monthStart = new Date(m.year, m.month, 1);
            const monthEnd = new Date(m.year, m.month, daysInMonth, 23, 59, 59);
            
            window.customers.forEach(c => {
                if (!c.start || !c.end || c.status === 'withdrawn') return;
                const cStart = new Date(c.start + 'T00:00:00');
                const cEnd = new Date(c.end + 'T23:59:59');
                
                const overlapStart = new Date(Math.max(monthStart, cStart));
                const overlapEnd = new Date(Math.min(monthEnd, cEnd));
                
                if (overlapStart <= overlapEnd) {
                    const overlapDays = Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1;
                    const totalDays = Math.ceil((cEnd - cStart) / (1000 * 60 * 60 * 24)) + 1;
                    
                    const dailyAccrual = (parseFloat(c.cost || 0) / totalDays);
                    const dailyCash = (parseFloat(c.paid || 0) / totalDays);
                    
                    accrualRev += (dailyAccrual * overlapDays);
                    cashRev += (dailyCash * overlapDays);
                }
            });
            
            let expVal = window.expenses.filter(e => {
                if (!e.date) return false;
                const eDate = new Date(e.date + 'T00:00:00');
                return eDate.getFullYear() === m.year && eDate.getMonth() === m.month;
            }).reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
            
            let netProfit = accrualRev - expVal;
            
            grandAccrual += accrualRev;
            grandCash += cashRev;
            grandExp += expVal;
            grandProfit += netProfit;
            
            const tr = document.createElement('tr');
            tr.className = "border-b hover:bg-slate-50";
            tr.innerHTML = `
                <td class="p-2.5 font-bold text-slate-700">${label}</td>
                <td class="p-2.5 text-right font-semibold">₹${accrualRev.toFixed(2)}</td>
                <td class="p-2.5 text-right font-semibold text-emerald-600">₹${cashRev.toFixed(2)}</td>
                <td class="p-2.5 text-right font-semibold text-rose-600">₹${expVal.toFixed(2)}</td>
                <td class="p-2.5 text-right font-bold text-sky-700">₹${netProfit.toFixed(2)}</td>
            `;
            tbody.appendChild(tr);
        });
        
        cardsContainer.innerHTML = `
            <div class="bg-white p-3 rounded-xl border shadow-sm">
                <span class="text-slate-400 block font-semibold text-[10px]">Accrual Recognized Rev</span>
                <h4 class="text-base font-bold text-slate-700 mt-0.5">₹${grandAccrual.toFixed(2)}</h4>
            </div>
            <div class="bg-emerald-50 text-emerald-800 p-3 rounded-xl border shadow-sm">
                <span class="text-slate-500 block font-semibold text-[10px]">Cash Received (Recognized)</span>
                <h4 class="text-base font-bold text-emerald-600 mt-0.5">₹${grandCash.toFixed(2)}</h4>
            </div>
            <div class="bg-rose-50 text-rose-800 p-3 rounded-xl border shadow-sm">
                <span class="text-slate-500 block font-semibold text-[10px]">Expenses Total</span>
                <h4 class="text-base font-bold text-rose-600 mt-0.5">₹${grandExp.toFixed(2)}</h4>
            </div>
            <div class="bg-sky-50 text-sky-800 p-3 rounded-xl border shadow-sm">
                <span class="text-slate-500 block font-semibold text-[10px]">Net Recognized Profit</span>
                <h4 class="text-base font-bold text-sky-700 mt-0.5">₹${grandProfit.toFixed(2)}</h4>
            </div>
        `;
    } 
    else if (reportType === 'delivery') {
        let list = [];
        let delivered = 0;
        
        let curr = new Date(startDate);
        while (curr <= endDate) {
            const dateStr = curr.toLocaleDateString('sv').substring(0, 10);
            
            window.customers.forEach(c => {
                if (!c.start || !c.end || c.status === 'withdrawn') return;
                const cStart = new Date(c.start + 'T00:00:00');
                const cEnd = new Date(c.end + 'T23:59:59');
                if (curr >= cStart && curr <= cEnd) {
                    if (!isCustomerOnLeave(c.id, dateStr)) {
                        const meals = ['breakfast', 'lunch', 'dinner'];
                        meals.forEach(m => {
                            if (c[m]) {
                                const status = 'Delivered';
                                delivered++;
                                list.push({
                                    date: dateStr,
                                    name: c.name,
                                    meal: m.toUpperCase(),
                                    route: (m === 'dinner' ? 'Evening' : 'Morning'),
                                    status: status
                                });
                            }
                        });
                    }
                }
            });
            curr.setDate(curr.getDate() + 1);
        }
        
        cardsContainer.innerHTML = `
            <div class="bg-emerald-50 text-emerald-800 p-3 rounded-xl border shadow-sm">
                <span class="text-slate-500 block font-semibold text-[10px]">Delivered Meals</span>
                <h4 class="text-base font-bold text-emerald-600 mt-0.5">${delivered}</h4>
            </div>
            <div class="bg-white p-3 rounded-xl border shadow-sm col-span-3">
                <span class="text-slate-400 block font-semibold text-[10px]">Deliveries Tracked In Period</span>
                <h4 class="text-base font-bold text-slate-700 mt-0.5">${list.length} Meals</h4>
            </div>
        `;
        
        thead.innerHTML = `
            <tr class="bg-slate-50 font-bold border-b text-slate-500">
                <th class="p-2.5">Date</th>
                <th class="p-2.5">Customer Name</th>
                <th class="p-2.5">Route Session</th>
                <th class="p-2.5">Meal Type</th>
                <th class="p-2.5">Delivery Status</th>
            </tr>
        `;
        
        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400 italic">No delivery records.</td></tr>`;
        } else {
            list.slice(0, 100).forEach(item => {
                const tr = document.createElement('tr');
                tr.className = "border-b hover:bg-slate-50";
                tr.innerHTML = `
                    <td class="p-2.5 font-bold text-slate-700">${item.date}</td>
                    <td class="p-2.5 text-slate-600 font-semibold">${item.name}</td>
                    <td class="p-2.5 text-slate-500 font-semibold">${item.route}</td>
                    <td class="p-2.5 text-slate-500">${item.meal}</td>
                    <td class="p-2.5"><span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[9px]">${item.status}</span></td>
                `;
                tbody.appendChild(tr);
            });
            if (list.length > 100) {
                tbody.innerHTML += `<tr><td colspan="5" class="p-3 text-center text-slate-400 italic">Showing first 100 of ${list.length} records. Please export to CSV to view all.</td></tr>`;
            }
        }
    } 
    else if (reportType === 'kitchen') {
        let list = [];
        let totalB = 0, totalL = 0, totalD = 0;
        let curr = new Date(startDate);
        while (curr <= endDate) {
            const dateStr = curr.toLocaleDateString('sv').substring(0, 10);
            const isSunday = curr.getDay() === 0;
            let b = 0, l = 0, d = 0;
            if (!isSunday) {
                window.customers.forEach(c => {
                    if (c.status !== 'withdrawn' && c.start && c.end) {
                        const start = new Date(c.start + 'T00:00:00');
                        const end = new Date(c.end + 'T23:59:59');
                        if (curr >= start && curr <= end) {
                            if (!isCustomerOnLeave(c.id, dateStr)) {
                                if (c.breakfast && !isMealSkipped(c.id, dateStr, 'breakfast')) b += (parseInt(c.breakfastQty) || 1);
                                if (c.lunch && !isMealSkipped(c.id, dateStr, 'lunch')) l += (parseInt(c.lunchQty) || 1);
                                if (c.dinner && !isMealSkipped(c.id, dateStr, 'dinner')) d += (parseInt(c.dinnerQty) || 1);
                            }
                        }
                    }
                });
            }
            totalB += b;
            totalL += l;
            totalD += d;
            
            list.push({ date: dateStr, b, l, d });
            curr.setDate(curr.getDate() + 1);
        }
        
        list.reverse();
        
        cardsContainer.innerHTML = `
            <div class="bg-white p-3 rounded-xl border shadow-sm">
                <span class="text-slate-400 block font-semibold text-[10px]">Total Breakfast Portions</span>
                <h4 class="text-base font-bold text-slate-700 mt-0.5">${totalB}</h4>
            </div>
            <div class="bg-white p-3 rounded-xl border shadow-sm">
                <span class="text-slate-400 block font-semibold text-[10px]">Total Lunch Portions</span>
                <h4 class="text-base font-bold text-slate-700 mt-0.5">${totalL}</h4>
            </div>
            <div class="bg-white p-3 rounded-xl border shadow-sm">
                <span class="text-slate-400 block font-semibold text-[10px]">Total Dinner Portions</span>
                <h4 class="text-base font-bold text-slate-700 mt-0.5">${totalD}</h4>
            </div>
            <div class="bg-emerald-50 text-emerald-800 p-3 rounded-xl border shadow-sm">
                <span class="text-slate-500 block font-semibold text-[10px]">Grand Portion Volume</span>
                <h4 class="text-base font-bold text-emerald-600 mt-0.5">${totalB + totalL + totalD}</h4>
            </div>
        `;
        
        thead.innerHTML = `
            <tr class="bg-slate-50 font-bold border-b text-slate-500">
                <th class="p-2.5">Date</th>
                <th class="p-2.5 text-center">Breakfast Volume (காலை)</th>
                <th class="p-2.5 text-center">Lunch Volume (மதியம்)</th>
                <th class="p-2.5 text-center">Dinner Volume (இரவு)</th>
                <th class="p-2.5 text-center">Total Portions/Day</th>
            </tr>
        `;
        
        list.forEach(item => {
            const tr = document.createElement('tr');
            tr.className = "border-b hover:bg-slate-50";
            tr.innerHTML = `
                <td class="p-2.5 font-bold text-slate-700">${item.date}</td>
                <td class="p-2.5 text-center font-medium">${item.b}</td>
                <td class="p-2.5 text-center font-medium">${item.l}</td>
                <td class="p-2.5 text-center font-medium">${item.d}</td>
                <td class="p-2.5 text-center font-bold text-emerald-600">${item.b + item.l + item.d}</td>
            `;
            tbody.appendChild(tr);
        });
    } 
    else if (reportType === 'staff') {
        const list = window.staffList || [];
        
        thead.innerHTML = `
            <tr class="bg-slate-50 font-bold border-b text-slate-500">
                <th class="p-2.5">Staff Name</th>
                <th class="p-2.5">Phone Number</th>
                <th class="p-2.5">Morning Customers Assigned</th>
                <th class="p-2.5">Evening Customers Assigned</th>
                <th class="p-2.5 text-right">Daily Salary Allowance</th>
            </tr>
        `;
        
        let activeStaff = list.length;
        
        cardsContainer.innerHTML = `
            <div class="bg-white p-3 rounded-xl border shadow-sm">
                <span class="text-slate-400 block font-semibold text-[10px]">Total Staff Listed</span>
                <h4 class="text-base font-bold text-slate-700 mt-0.5">${activeStaff}</h4>
            </div>
        `;
        
        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400 italic">No staff entries.</td></tr>`;
        } else {
            list.forEach(s => {
                const morningAssigned = window.customers.filter(c => c.staffId === s.id && c.status === 'active').length;
                const eveningAssigned = window.customers.filter(c => c.eveningStaffId === s.id && c.status === 'active').length;
                
                const tr = document.createElement('tr');
                tr.className = "border-b hover:bg-slate-50";
                tr.innerHTML = `
                    <td class="p-2.5 font-bold text-slate-700">${s.name}</td>
                    <td class="p-2.5 text-slate-500">${s.phone || '-'}</td>
                    <td class="p-2.5 text-center font-semibold text-emerald-600">${morningAssigned} Cust</td>
                    <td class="p-2.5 text-center font-semibold text-blue-600">${eveningAssigned} Cust</td>
                    <td class="p-2.5 text-right font-bold text-slate-700">₹${s.salary || 0}</td>
                `;
                tbody.appendChild(tr);
            });
        }
    }
};

window.printReportDoc = function() {
    const typeSelect = document.getElementById('reports-type-select');
    const startStr = document.getElementById('reports-start-date').value;
    const endStr = document.getElementById('reports-end-date').value;
    
    if (!typeSelect || !startStr || !endStr) return;
    
    const reportType = typeSelect.value;
    const label = typeSelect.options[typeSelect.selectedIndex].text;
    
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    
    const theadHTML = document.getElementById('reports-table-thead').innerHTML;
    const tbodyHTML = document.getElementById('reports-table-tbody').innerHTML;
    const summaryHTML = document.getElementById('reports-summary-cards').innerHTML;
    
    printWindow.document.write(`
        <html>
        <head>
            <title>Healthy Home's Foods - Report: ${label}</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; }
                h1 { font-size: 20px; margin-bottom: 5px; color: #059669; }
                h2 { font-size: 13px; color: #666; margin-bottom: 20px; font-weight: normal; }
                .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
                .card { padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 11px; background: #f9f9f9; }
                .card h4 { font-size: 15px; margin: 5px 0 0 0; color: #111; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
                th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background-color: #f3f4f6; font-weight: bold; }
                .text-right { text-align: right; }
                .text-center { text-align: center; }
            </style>
        </head>
        <body>
            <h1>Healthy Home's Foods - Official Report</h1>
            <h2>Report: ${label} | Period: ${startStr} to ${endStr}</h2>
            <div class="summary">
                ${summaryHTML}
            </div>
            <table>
                <thead>
                    ${theadHTML}
                </thead>
                <tbody>
                    ${tbodyHTML}
                </tbody>
            </table>
            <script>
                window.onload = function() {
                    window.print();
                    window.close();
                };
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
};

window.exportReportToCSV = function() {
    const typeSelect = document.getElementById('reports-type-select');
    const startStr = document.getElementById('reports-start-date').value;
    const endStr = document.getElementById('reports-end-date').value;
    
    if (!typeSelect || !startStr || !endStr) return;
    
    const label = typeSelect.options[typeSelect.selectedIndex].text.replace(/\\s+/g, '_');
    
    const thead = document.getElementById('reports-table-thead');
    const tbody = document.getElementById('reports-table-tbody');
    
    let csvRows = [];
    
    let headers = [];
    thead.querySelectorAll('th').forEach(th => {
        headers.push(th.innerText.replace(/,/g, ''));
    });
    csvRows.push(headers.join(','));
    
    tbody.querySelectorAll('tr').forEach(tr => {
        let cells = [];
        tr.querySelectorAll('td').forEach(td => {
            cells.push(td.innerText.replace(/,/g, '').replace(/₹/g, ''));
        });
        csvRows.push(cells.join(','));
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join("\\n"));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", csvContent);
    dlAnchorElem.setAttribute("download", \`report_\${label}_\${startStr}_to_\${endStr}.csv\`);
    dlAnchorElem.click();
    
    showToast("அறிக்கை CSV வடிவத்தில் வெற்றிகரமாக பதிவிறக்கம் செய்யப்பட்டது!");
};

// ==========================================
// 🌟 VEHICLES & TRIP MANAGEMENT UI ENGINE
// ==========================================

// Helper function to format times e.g. "08:30" to "08:30 AM"
function formatTimeString(timeStr) {
    if (!timeStr) return '';
    const [hour, minute] = timeStr.split(':').map(Number);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${String(formattedHour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${ampm}`;
}

// 1. Vehicle CRUD handlers
window.openVehicleModal = function(id = '') {
    const title = document.getElementById('vehicle-modal-title');
    const form = document.getElementById('vehicle-form');
    
    form.reset();
    document.getElementById('vehicle-edit-id').value = '';
    
    if (id) {
        title.innerText = "வாகன விவரம் திருத்து / Edit Vehicle";
        const v = window.vehicles.find(item => item.id === id);
        if (v) {
            document.getElementById('vehicle-edit-id').value = v.id;
            document.getElementById('vehicle-plate').value = v.plateNumber || '';
            document.getElementById('vehicle-model').value = v.model || '';
            document.getElementById('vehicle-odo').value = v.odo || 0;
            document.getElementById('vehicle-status').value = v.status || 'active';
        }
    } else {
        title.innerText = "புதிய வாகனம் / Add Vehicle";
    }
    document.getElementById('vehicle-modal').style.display = 'flex';
};

window.closeVehicleModal = function() {
    document.getElementById('vehicle-modal').style.display = 'none';
};

window.saveVehicleForm = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-vehicle');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Saving...';
    }
    
    const id = document.getElementById('vehicle-edit-id').value || "veh_" + Date.now();
    const obj = {
        id,
        plateNumber: document.getElementById('vehicle-plate').value.trim(),
        model: document.getElementById('vehicle-model').value.trim(),
        odo: parseFloat(document.getElementById('vehicle-odo').value) || 0,
        status: document.getElementById('vehicle-status').value || 'active'
    };
    
    try {
        await dbSaveVehicle(obj);
        window.closeVehicleModal();
        showToast("வாகன விபரம் சேமிக்கப்பட்டது!");
        window.saveAllToLocalStorageBackup();
        renderAll();
    } catch (err) {
        showToast("வண்டி விபரங்களை சேமிக்க முடியவில்லை!", "error");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = 'சேமி / Save';
        }
    }
};

// 2. Trip CRUD handlers
window.openTripModal = function(id = '') {
    const title = document.getElementById('trip-modal-title');
    const form = document.getElementById('trip-form');
    
    form.reset();
    document.getElementById('trip-edit-id').value = '';
    document.getElementById('trip-cust-select-all').checked = false;
    document.getElementById('trip-modal-cust-search').value = '';
    
    // Set default date
    document.getElementById('trip-date').value = window.todayDateStr;
    
    // Fill selectors
    const selectVeh = document.getElementById('trip-vehicle');
    const selectDriver = document.getElementById('trip-driver');
    const selectStaff = document.getElementById('trip-staff');
    
    if (selectVeh) {
        selectVeh.innerHTML = '<option value="">Select Vehicle</option>' + 
            window.vehicles.map(v => `<option value="${v.id}">${v.plateNumber} (${v.model})</option>`).join('');
    }
    
    const staffOptions = window.staffList.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    if (selectDriver) {
        selectDriver.innerHTML = '<option value="">Select Driver</option>' + staffOptions;
    }
    if (selectStaff) {
        selectStaff.innerHTML = '<option value="">Select Staff</option>' + staffOptions;
    }
    
    // Draw customer list inside modal
    window.renderTripCustomersList([]);
    
    if (id) {
        title.innerText = "டிரிப் திருத்து / Edit Trip";
        const t = window.trips.find(item => item.id === id);
        if (t) {
            document.getElementById('trip-edit-id').value = t.id;
            document.getElementById('trip-number').value = t.tripNumber || 1;
            document.getElementById('trip-date').value = t.date || window.todayDateStr;
            document.getElementById('trip-vehicle').value = t.vehicleId || '';
            document.getElementById('trip-driver').value = t.driverName || '';
            document.getElementById('trip-staff').value = t.deliveryStaff || '';
            document.getElementById('trip-route-name').value = t.routeName || '';
            document.getElementById('trip-odo-start').value = t.startOdometer || 0;
            document.getElementById('trip-odo-end').value = t.endOdometer || 0;
            document.getElementById('trip-area').value = t.deliveryArea || '';
            document.getElementById('trip-start-time').value = t.startTime || '';
            document.getElementById('trip-end-time').value = t.endTime || '';
            
            // Re-render customers and pre-check them
            window.renderTripCustomersList(t.customerIds || []);
        }
    } else {
        title.innerText = "புதிய டிரிப் பதிவு / Register Trip";
        // Auto calculate next trip number for today
        const todayStr = window.todayDateStr;
        const count = window.trips.filter(t => t.date === todayStr).length;
        document.getElementById('trip-number').value = count + 1;
    }
    
    window.calcTripDistance();
    document.getElementById('trip-modal').style.display = 'flex';
};

window.closeTripModal = function() {
    document.getElementById('trip-modal').style.display = 'none';
};

window.calcTripDistance = function() {
    const start = parseFloat(document.getElementById('trip-odo-start').value) || 0;
    const end = parseFloat(document.getElementById('trip-odo-end').value) || 0;
    const distance = Math.max(0, end - start);
    
    document.getElementById('trip-distance').value = `${distance} km`;
    
    const fuelCostPerKm = parseFloat(window.appSettings.fuelCostPerKm) || 10;
    const fuelCost = distance * fuelCostPerKm;
    document.getElementById('trip-fuel-cost').value = `₹${fuelCost}`;
};

window.updateTripOdometerStart = function() {
    const vehicleId = document.getElementById('trip-vehicle').value;
    if (vehicleId) {
        const currentOdo = window.calculateVehicleOdometer(vehicleId);
        document.getElementById('trip-odo-start').value = currentOdo;
        window.calcTripDistance();
    }
};

// Render trip customer checkboxes inside modal
window.renderTripCustomersList = function(selectedIds = []) {
    const container = document.getElementById('trip-customers-list');
    if (!container) return;
    container.innerHTML = '';
    
    const dateStr = document.getElementById('trip-date').value || window.todayDateStr;
    const today = parseLocalDate(dateStr);
    const dateInputStr = dateStr;
    
    // Filter customers who have scheduled delivery for the trip date
    const activeCustomers = window.customers.filter(c => {
        if (!c.start || !c.end) return false;
        const start = parseLocalDate(c.start);
        const end = parseLocalDate(c.end);
        const inRange = today >= start && today <= end;
        const altB = isAlternateMealScheduled(c.id, dateInputStr, 'breakfast');
        const altL = isAlternateMealScheduled(c.id, dateInputStr, 'lunch');
        const altD = isAlternateMealScheduled(c.id, dateInputStr, 'dinner');
        
        if (!inRange && !altB && !altL && !altD) return false;
        const onLeave = isCustomerOnLeave(c.id, dateInputStr);
        if (onLeave && !altB && !altL && !altD) return false;
        return true;
    });
    
    if (activeCustomers.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-4 text-slate-400 italic">
                தேர்ந்தெடுத்த தேதியில் விநியோகக் கஸ்டமர்கள் யாரும் இல்லை!
            </div>
        `;
        return;
    }
    
    // Sort alphabetically
    activeCustomers.sort((a, b) => a.name.localeCompare(b.name));
    
    activeCustomers.forEach(c => {
        const isChecked = selectedIds.includes(c.id);
        
        let meals = [];
        if (c.breakfast) meals.push(`B(x${c.breakfastQty || 1})`);
        if (c.lunch) meals.push(`L(x${c.lunchQty || 1})`);
        if (c.dinner) meals.push(`D(x${c.dinnerQty || 1})`);
        
        let statusVal = 'Pending';
        if (window.deliveryStatus[c.id]) {
            const raw = window.deliveryStatus[c.id];
            if (raw === true) statusVal = 'Delivered';
            else if (typeof raw === 'string' && raw) statusVal = raw;
            else if (typeof raw === 'object') {
                // Check if any meal is checked
                const statuses = Object.values(raw);
                if (statuses.includes('Delivered')) statusVal = 'Delivered';
                else if (statuses.includes('Out for Delivery')) statusVal = 'Out';
                else if (statuses.includes('Packed')) statusVal = 'Packed';
                else if (statuses.includes('Payment Pending')) statusVal = 'Pay Due';
            }
        }
        
        let statusColor = 'bg-slate-100 text-slate-600 border';
        if (statusVal === 'Delivered') statusColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
        else if (statusVal === 'Out') statusColor = 'bg-blue-100 text-blue-800 border-blue-200';
        else if (statusVal === 'Packed') statusColor = 'bg-slate-200 text-slate-700 border-slate-350';
        else if (statusVal === 'Pay Due') statusColor = 'bg-rose-100 text-rose-800 border-rose-250';
        
        const card = document.createElement('div');
        card.className = `flex items-center space-x-2.5 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer select-none hover:bg-slate-50/80 transition relative ${isChecked ? 'bg-emerald-50/20 border-emerald-400' : ''}`;
        card.onclick = function(e) {
            if (e.target.tagName !== 'INPUT') {
                const cb = card.querySelector('input[type="checkbox"]');
                cb.checked = !cb.checked;
                card.classList.toggle('bg-emerald-50/20', cb.checked);
                card.classList.toggle('border-emerald-400', cb.checked);
            }
        };
        
        card.innerHTML = `
            <input type="checkbox" data-cust-id="${c.id}" ${isChecked ? 'checked' : ''} class="trip-customer-cb w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500">
            <div class="flex-1 min-w-0">
                <div class="flex justify-between items-center">
                    <span class="font-bold text-xs text-slate-800 truncate">${c.name}</span>
                    <span class="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${statusColor}">${statusVal}</span>
                </div>
                <p class="text-[9px] text-slate-400 truncate">${c.address || 'முகவரி இல்லை'}</p>
                <div class="flex items-center space-x-1.5 mt-0.5 text-[9px] text-emerald-700 font-semibold">
                    <i class="fa-solid fa-bowl-rice"></i> <span>${meals.join(', ')}</span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
};

window.toggleAllTripCustomers = function(checked) {
    document.querySelectorAll('.trip-customer-cb').forEach(cb => {
        const card = cb.closest('div');
        cb.checked = checked;
        if (card) {
            card.classList.toggle('bg-emerald-50/20', checked);
            card.classList.toggle('border-emerald-400', checked);
        }
    });
};

window.filterTripModalCustomers = function() {
    const q = document.getElementById('trip-modal-cust-search').value.toLowerCase();
    document.querySelectorAll('#trip-customers-list > div').forEach(card => {
        const text = card.innerText.toLowerCase();
        if (text.includes(q)) {
            card.classList.remove('hidden');
        } else {
            card.classList.add('hidden');
        }
    });
};

window.autoSelectTripCustomers = function() {
    const staffId = document.getElementById('trip-staff').value;
    const dateStr = document.getElementById('trip-date').value || window.todayDateStr;
    if (!staffId) {
        showToast("டெலிவரி நபரை தேர்வு செய்யவும்!", "alert");
        return;
    }
    
    let matchedCount = 0;
    document.querySelectorAll('.trip-customer-cb').forEach(cb => {
        const custId = cb.getAttribute('data-cust-id');
        const c = window.customers.find(item => item.id === custId);
        if (c) {
            // Check if this customer is assigned to the selected staff member (morning or evening)
            const isAssigned = c.staffId === staffId || c.eveningStaffId === staffId;
            if (isAssigned) {
                cb.checked = true;
                const card = cb.closest('div');
                if (card) {
                    card.classList.add('bg-emerald-50/20', 'border-emerald-400');
                }
                matchedCount++;
            }
        }
    });
    
    showToast(`இணைக்கப்பட்ட ${matchedCount} வாடிக்கையாளர்கள் தேர்ந்தெடுக்கப்பட்டனர்!`);
};

window.saveTripForm = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-trip');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Saving...';
    }
    
    const id = document.getElementById('trip-edit-id').value || "tr_" + Date.now();
    const checkedCustIds = [];
    document.querySelectorAll('.trip-customer-cb:checked').forEach(cb => {
        checkedCustIds.push(cb.getAttribute('data-cust-id'));
    });
    
    const obj = {
        id,
        tripNumber: parseInt(document.getElementById('trip-number').value) || 1,
        date: document.getElementById('trip-date').value,
        vehicleId: document.getElementById('trip-vehicle').value,
        driverName: document.getElementById('trip-driver').value,
        deliveryStaff: document.getElementById('trip-staff').value,
        routeName: document.getElementById('trip-route-name').value.trim(),
        startOdometer: parseFloat(document.getElementById('trip-odo-start').value) || 0,
        endOdometer: parseFloat(document.getElementById('trip-odo-end').value) || 0,
        deliveryArea: document.getElementById('trip-area').value.trim(),
        startTime: document.getElementById('trip-start-time').value || '',
        endTime: document.getElementById('trip-end-time').value || '',
        customerIds: checkedCustIds
    };
    
    try {
        await dbSaveTrip(obj);
        window.closeTripModal();
        showToast("டிரிப் விபரங்கள் வெற்றிகரமாக சேமிக்கப்பட்டன!");
        window.saveAllToLocalStorageBackup();
        renderAll();
    } catch (err) {
        showToast("டிரிப் விபரங்களை சேமிக்க முடியவில்லை!", "error");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = 'டிரிப் விபரங்களைச் சேமி / Save Trip';
        }
    }
};

// 3. Vehicle Detail Modal tabs logic
window.openVehicleDetailModal = function(vehicleId) {
    window.activeVehicleDetailId = vehicleId;
    window.activeVehicleDetailTab = 'today';
    
    const v = window.vehicles.find(item => item.id === vehicleId);
    if (!v) return;
    
    const title = document.getElementById('vehicle-detail-modal-title');
    const subtitle = document.getElementById('vehicle-detail-modal-subtitle');
    
    if (title) title.innerText = `Vehicle Performance Dashboard`;
    if (subtitle) subtitle.innerText = `${v.plateNumber} (${v.model})`;
    
    // Refresh stats
    const stats = window.getVehicleStats(vehicleId);
    if (stats) {
        document.getElementById('v-detail-stat-km').innerText = `${stats.totalKm} km`;
        document.getElementById('v-detail-stat-fuel').innerText = `₹${stats.totalFuel.toLocaleString('en-IN')}`;
        document.getElementById('v-detail-stat-deliv').innerText = stats.totalDeliveries;
        document.getElementById('v-detail-stat-avg-km').innerText = `${stats.averageKmPerTrip.toFixed(1)} km`;
    }
    
    window.setVehicleDetailTab('today');
    document.getElementById('vehicle-detail-modal').style.display = 'flex';
};

window.closeVehicleDetailModal = function() {
    document.getElementById('vehicle-detail-modal').style.display = 'none';
};

window.setVehicleDetailTab = function(tab) {
    window.activeVehicleDetailTab = tab;
    
    const tabs = ['today', 'yesterday', 'month'];
    tabs.forEach(t => {
        const btn = document.getElementById(`v-tab-${t}`);
        if (btn) {
            if (t === tab) {
                btn.className = "flex-1 py-1.5 text-center font-bold rounded-lg transition-all text-white bg-emerald-600 shadow-sm";
            } else {
                btn.className = "flex-1 py-1.5 text-center font-bold rounded-lg transition-all text-slate-500 hover:bg-slate-200";
            }
        }
    });
    
    window.renderVehicleDetailTrips();
};

window.renderVehicleDetailTrips = function() {
    const container = document.getElementById('vehicle-trips-list');
    if (!container) return;
    container.innerHTML = '';
    
    const stats = window.getVehicleStats(window.activeVehicleDetailId);
    if (!stats) return;
    
    let tabTrips = [];
    if (window.activeVehicleDetailTab === 'today') tabTrips = stats.todayTrips;
    else if (window.activeVehicleDetailTab === 'yesterday') tabTrips = stats.yesterdayTrips;
    else if (window.activeVehicleDetailTab === 'month') tabTrips = stats.monthlyTrips;
    
    if (tabTrips.length === 0) {
        container.innerHTML = `
            <div class="text-center py-6 text-slate-400 italic">
                டிரிப் பதிவுகள் எதுவும் இல்லை.
            </div>
        `;
        return;
    }
    
    tabTrips.forEach(t => {
        const metrics = window.calculateTripMetrics(t);
        const driverName = window.staffList.find(s => s.id === t.driverName)?.name || t.driverName || 'Unassigned';
        
        const card = document.createElement('div');
        card.className = "p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl space-y-2 text-xs";
        card.innerHTML = `
            <div class="flex justify-between items-center border-b pb-1.5">
                <span class="font-bold text-slate-700">Trip #${t.tripNumber} (${t.date})</span>
                <span class="font-bold text-indigo-600">${metrics.distance} km</span>
            </div>
            <div class="grid grid-cols-2 gap-2 text-[10px] text-slate-500">
                <div>Route: <span class="font-semibold text-slate-700">${t.routeName}</span></div>
                <div>Driver: <span class="font-semibold text-slate-700">${driverName}</span></div>
                <div>Delivered: <span class="font-semibold text-slate-700">${metrics.customersCount} Cust (${metrics.mealsCount} Meals)</span></div>
                <div>Fuel Cost: <span class="font-semibold text-rose-600">₹${metrics.fuelCost}</span></div>
            </div>
        `;
        container.appendChild(card);
    });
};

// 4. Vehicles Main View Rendering
window.renderVehiclesView = function() {
    if (window.activeView !== 'vehicles') return;
    
    // Fill Select Filters in Trips
    const filterVeh = document.getElementById('filter-trip-vehicle');
    const filterDriver = document.getElementById('filter-trip-driver');
    const filterStaff = document.getElementById('filter-trip-staff');
    
    const activeVehVal = filterVeh ? filterVeh.value : 'all';
    const activeDriverVal = filterDriver ? filterDriver.value : 'all';
    const activeStaffVal = filterStaff ? filterStaff.value : 'all';
    
    if (filterVeh) {
        filterVeh.innerHTML = '<option value="all">All Vehicles</option>' + 
            window.vehicles.map(v => `<option value="${v.id}">${v.plateNumber}</option>`).join('');
        filterVeh.value = activeVehVal;
    }
    
    const staffOptions = window.staffList.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    if (filterDriver) {
        filterDriver.innerHTML = '<option value="all">All Drivers</option>' + staffOptions;
        filterDriver.value = activeDriverVal;
    }
    if (filterStaff) {
        filterStaff.innerHTML = '<option value="all">All Staff</option>' + staffOptions;
        filterStaff.value = activeStaffVal;
    }
    
    // Set default date filter to today if blank
    const filterTripDate = document.getElementById('filter-trip-date');
    if (filterTripDate && !filterTripDate.value) {
        filterTripDate.value = window.todayDateStr;
    }
    
    // Render vehicles list on left
    const container = document.getElementById('vehicles-list-container');
    if (!container) return;
    container.innerHTML = '';
    
    if (window.vehicles.length === 0) {
        container.innerHTML = `
            <div class="text-center py-10 text-slate-400 border border-dashed rounded-xl border-slate-200">
                <i class="fa-solid fa-motorcycle text-2xl mb-1 text-slate-300"></i>
                <p class="text-xs">வாகனங்கள் எதுவும் இல்லை!</p>
            </div>
        `;
        return;
    }
    
    window.vehicles.forEach(v => {
        const latestOdo = window.calculateVehicleOdometer(v.id);
        const stats = window.getVehicleStats(v.id);
        
        let statusBadge = '';
        if (v.status === 'active') statusBadge = '<span class="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full uppercase border border-emerald-200">Active</span>';
        else if (v.status === 'maintenance') statusBadge = '<span class="text-[9px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full uppercase border border-amber-200 animate-pulse">Service</span>';
        else statusBadge = '<span class="text-[9px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full uppercase border border-slate-200">Inactive</span>';
        
        const card = document.createElement('div');
        card.className = "bg-white dark:bg-slate-800/40 rounded-xl border border-slate-200 p-3.5 space-y-3 shadow-sm hover:shadow transition";
        card.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <h4 class="font-bold text-sm text-slate-800 leading-tight">${v.plateNumber}</h4>
                    <span class="text-[10px] text-slate-400 block mt-0.5"><i class="fa-solid fa-motorcycle"></i> ${v.model}</span>
                </div>
                ${statusBadge}
            </div>
            
            <div class="grid grid-cols-2 gap-2 text-[10px] bg-slate-50 dark:bg-slate-900 border p-2 rounded-lg">
                <div>Odometer: <span class="font-bold text-slate-700">${latestOdo} km</span></div>
                <div>Tot Distance: <span class="font-bold text-slate-700">${stats ? stats.totalKm : 0} km</span></div>
                <div class="col-span-2 border-t pt-1 flex justify-between items-center text-[9px]">
                    <span class="text-slate-400 font-semibold">Total Deliveries: <b>${stats ? stats.totalDeliveries : 0}</b></span>
                    <span class="text-rose-600 font-bold">Fuel: ₹${stats ? stats.totalFuel.toLocaleString('en-IN') : 0}</span>
                </div>
            </div>
            
            <div class="flex justify-between items-center pt-2 border-t text-[10px] gap-2">
                <button onclick="window.openVehicleDetailModal('${v.id}')" class="flex-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg transition border border-emerald-100 flex items-center justify-center space-x-1">
                    <i class="fa-solid fa-gauge"></i> <span>Dashboard</span>
                </button>
                <button onclick="window.openVehicleModal('${v.id}')" class="p-1.5 bg-slate-50 hover:bg-slate-100 border rounded-lg text-slate-500 hover:text-slate-700" title="Edit Vehicle"><i class="fa-solid fa-pen"></i></button>
                <button onclick="window.triggerDeleteConfirm('${v.id}', 'vehicle')" class="p-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-lg text-rose-500 hover:text-rose-700" title="Delete Vehicle"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        container.appendChild(card);
    });
    
    // Draw right timeline panel
    window.renderTripsTimeline();
};

window.clearTripFilters = function() {
    document.getElementById('filter-trip-date').value = '';
    document.getElementById('filter-trip-vehicle').value = 'all';
    document.getElementById('filter-trip-driver').value = 'all';
    document.getElementById('filter-trip-staff').value = 'all';
    document.getElementById('filter-trip-route').value = '';
    window.renderTripsTimeline();
};

// 5. Trips Timeline view renderer
window.renderTripsTimeline = function() {
    const container = document.getElementById('trips-timeline-container');
    if (!container) return;
    container.innerHTML = '';
    
    const filterDate = document.getElementById('filter-trip-date').value;
    const filterVeh = document.getElementById('filter-trip-vehicle').value;
    const filterDriver = document.getElementById('filter-trip-driver').value;
    const filterStaff = document.getElementById('filter-trip-staff').value;
    const filterRoute = document.getElementById('filter-trip-route').value.toLowerCase();
    
    const activeTrips = (window.trips || []).filter(t => {
        if (filterDate && t.date !== filterDate) return false;
        if (filterVeh !== 'all' && t.vehicleId !== filterVeh) return false;
        if (filterDriver !== 'all' && t.driverName !== filterDriver) return false;
        if (filterStaff !== 'all' && t.deliveryStaff !== filterStaff) return false;
        if (filterRoute && !(t.routeName || '').toLowerCase().includes(filterRoute) && !(t.deliveryArea || '').toLowerCase().includes(filterRoute)) return false;
        return true;
    });
    
    // Sort chronology
    activeTrips.sort((a, b) => b.date.localeCompare(a.date) || (parseInt(a.tripNumber) || 0) - (parseInt(b.tripNumber) || 0));
    
    // Compute stats
    let totalDistance = 0;
    let totalFuel = 0;
    let totalCustomers = 0;
    
    activeTrips.forEach(t => {
        const m = window.calculateTripMetrics(t);
        totalDistance += m.distance;
        totalFuel += m.fuelCost;
        totalCustomers += m.customersCount;
    });
    
    const costPerDel = totalCustomers > 0 ? totalFuel / totalCustomers : 0;
    
    document.getElementById('trip-metric-distance').innerText = `${totalDistance} km`;
    document.getElementById('trip-metric-fuel').innerText = `₹${totalFuel.toLocaleString('en-IN')}`;
    document.getElementById('trip-metric-customers').innerText = totalCustomers;
    document.getElementById('trip-metric-cost-per-del').innerText = `₹${costPerDel.toFixed(1)}`;
    
    if (activeTrips.length === 0) {
        container.innerHTML = `
            <div class="text-center py-10 text-slate-400 italic text-xs">
                வடிகட்டலுக்கு ஏற்ப டிரிப் பதிவுகள் எதுவும் இல்லை!
            </div>
        `;
        return;
    }
    
    activeTrips.forEach(t => {
        const metrics = window.calculateTripMetrics(t);
        const v = window.vehicles.find(veh => veh.id === t.vehicleId);
        const vehiclePlate = v ? v.plateNumber : 'Unassigned';
        
        const driverName = window.staffList.find(s => s.id === t.driverName)?.name || t.driverName || 'Unassigned';
        const staffName = window.staffList.find(s => s.id === t.deliveryStaff)?.name || t.deliveryStaff || 'Unassigned';
        
        const node = document.createElement('div');
        node.className = "timeline-item relative pl-2.5 space-y-2";
        
        // Timeline node circle
        node.innerHTML = `
            <div class="timeline-node"></div>
            
            <div class="bg-white dark:bg-slate-800/20 border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3 hover:shadow-md transition">
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-2 gap-2">
                    <div>
                        <div class="flex items-center space-x-2">
                            <span class="font-bold text-xs text-slate-800">Trip #${t.tripNumber} (${t.date})</span>
                            <span class="text-[9px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded border uppercase">${t.routeName}</span>
                        </div>
                        <span class="text-[10px] text-emerald-600 font-semibold mt-0.5 block"><i class="fa-solid fa-map-pin"></i> Area: ${t.deliveryArea}</span>
                    </div>
                    <div class="flex items-center space-x-1.5 self-end text-[10px]">
                        <button onclick="window.openTripModal('${t.id}')" class="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border text-slate-500 hover:text-slate-700 font-bold rounded-lg transition"><i class="fa-solid fa-pen mr-1"></i> Edit</button>
                        <button onclick="window.triggerDeleteConfirm('${t.id}', 'trip')" class="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-500 hover:text-rose-700 font-bold rounded-lg transition"><i class="fa-solid fa-trash mr-1"></i> Delete</button>
                    </div>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] text-slate-500">
                    <div>
                        <span class="text-[9px] text-slate-400 uppercase block font-bold">வாகனம் / Driver</span>
                        <span class="font-bold text-slate-700 block">${vehiclePlate}</span>
                        <span class="text-[10px]">Driver: ${driverName}</span>
                    </div>
                    <div>
                        <span class="text-[9px] text-slate-400 uppercase block font-bold">Odometer & Time</span>
                        <span class="font-bold text-slate-700 block">${t.startOdometer} km → ${t.endOdometer} km</span>
                        <span class="text-[10px]">${t.startTime ? formatTimeString(t.startTime) : '-'} to ${t.endTime ? formatTimeString(t.endTime) : '-'}</span>
                    </div>
                    <div>
                        <span class="text-[9px] text-slate-400 uppercase block font-bold">Kilometres & Fuel</span>
                        <span class="font-bold text-indigo-700 block">${metrics.distance} km</span>
                        <span class="text-[10px] font-bold text-rose-600">Fuel: ₹${metrics.fuelCost}</span>
                    </div>
                    <div>
                        <span class="text-[9px] text-slate-400 uppercase block font-bold">Deliveries Detail</span>
                        <span class="font-bold text-emerald-600 block">${metrics.customersCount} Customers</span>
                        <span class="text-[10px] font-bold text-purple-700">Meals: ${metrics.mealsCount} | Staff: ${staffName}</span>
                    </div>
                </div>

                <!-- Checked Customers collapse panel -->
                <div class="border-t pt-2 space-y-2">
                    <button onclick="this.nextElementSibling.classList.toggle('hidden'); this.querySelector('i').classList.toggle('fa-chevron-down'); this.querySelector('i').classList.toggle('fa-chevron-up');" 
                            class="text-[10px] font-bold text-slate-500 flex items-center space-x-1 select-none hover:text-slate-700 transition">
                        <span>வாடிக்கையாளர்கள் பட்டியல் (Customers Delivered) (${metrics.customersCount})</span>
                        <i class="fa-solid fa-chevron-down text-[8px]"></i>
                    </button>
                    <div class="hidden grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 bg-slate-50/50 p-2.5 rounded-xl border border-slate-200 text-[10px] pr-1">
                        ${
                            t.customerIds && t.customerIds.length > 0 ? 
                            t.customerIds.map(custId => {
                                const c = window.customers.find(item => item.id === custId);
                                if (!c) return `<div class="p-1.5 bg-white border rounded">Deleted Customer (${custId})</div>`;
                                
                                let meals = [];
                                if (c.breakfast) meals.push('B');
                                if (c.lunch) meals.push('L');
                                if (c.dinner) meals.push('D');
                                
                                return `
                                    <div class="p-1.5 bg-white border rounded-lg space-y-0.5 leading-snug shadow-sm">
                                        <div class="font-bold text-slate-800 truncate">${c.name}</div>
                                        <div class="text-slate-400 truncate text-[9px]">ID: ${c.id.substring(5, 12)} | Addr: ${c.address || '-'}</div>
                                        <div class="text-emerald-700 font-semibold text-[8px]">Meal: ${meals.join(', ')}</div>
                                    </div>
                                `;
                            }).join('') :
                            '<div class="col-span-full text-slate-400 italic text-[10px]">வாடிக்கையாளர்கள் யாரும் தேர்வு செய்யப்படவில்லை!</div>'
                        }
                    </div>
                </div>
            </div>
        `;
        container.appendChild(node);
    });
};
