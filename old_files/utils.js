// 🌟 UTILITY HELPER & BUSINESS CALCULATIONS MODULE

// 0. Timezone-Safe Local Date Parsers and Formatters
window.parseLocalDate = function(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return new Date(dateStr);
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
};

window.formatLocalDate = function(date) {
    if (!date || isNaN(date.getTime())) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

// 1. Calculate balance remaining
function getCustomerBalance(cost, paid) {
    return Math.max(0, (parseFloat(cost) || 0) - (parseFloat(paid) || 0));
}

// 2. Auto-calculate subscription end date (skipping Sundays)
function calculateEndDate(startDateStr, isTrial) {
    if (!startDateStr) return '';
    let current = parseLocalDate(startDateStr);
    let added = (current.getDay() !== 0) ? 1 : 0;
    const daysToDeliver = isTrial ? 6 : 26;
    
    while (added < daysToDeliver) {
        current.setDate(current.getDate() + 1);
        if (current.getDay() !== 0) {
            added++;
        }
    }
    return formatLocalDate(current);
}

// 3. Check if customer is on leave on a specific date (YYYY-MM-DD)
function isCustomerOnLeave(custId, dateStr) {
    const customerLeaves = window.leaves.filter(l => l.custId === custId);
    
    for (let l of customerLeaves) {
        if (!l.date || typeof l.date !== 'string') continue;
        // e.g. "2026-07-12 (3 days)"
        const match = l.date.match(/^(\d{4}-\d{2}-\d{2})\s*\((\d+)\s*days\)/);
        if (match) {
            const startDateStr = match[1];
            const days = parseInt(match[2]);
            const startDate = parseLocalDate(startDateStr);
            
            // Calculate actual dates of the leave range (skipping Sundays)
            let tempDate = new Date(startDate);
            let counted = 0;
            const leaveDates = [];
            
            while (counted < days) {
                if (tempDate.getDay() !== 0) {
                    leaveDates.push(formatLocalDate(tempDate));
                    counted++;
                }
                tempDate.setDate(tempDate.getDate() + 1);
            }
            
            if (leaveDates.includes(dateStr)) {
                return true;
            }
        } else {
            // Fallback for simple date matches
            if (l.date.startsWith(dateStr)) {
                return true;
            }
        }
    }
    return false;
}

// 3b. Check if customer skipped a specific meal on a specific date (YYYY-MM-DD)
function isMealSkipped(custId, dateStr, meal) {
    if (!window.skips) return false;
    return window.skips.some(s => s.custId === custId && s.date === dateStr && s.meal === meal);
}

// 3c. Check if customer has a meal-specific leave/skip or full leave
function isCustomerOnLeaveForMeal(custId, dateStr, meal) {
    return isCustomerOnLeave(custId, dateStr) || isMealSkipped(custId, dateStr, meal);
}

// 3d. Check if customer has an alternate day meal scheduled for a specific date
function isAlternateMealScheduled(custId, dateStr, meal) {
    if (!window.alternateDays) return false;
    return window.alternateDays.some(a => a.custId === custId && a.alternateDate === dateStr && a.meals.includes(meal));
}

// 3e. Check if a leave/skip date has been compensated by an alternate date
function isLeaveCompensated(custId, originalDateStr) {
    if (!window.alternateDays) return false;
    return window.alternateDays.some(a => a.custId === custId && a.originalDate === originalDateStr);
}

// 3f. Query Firestore to check if the customer was missed yesterday (active but no delivery marked)
async function wasCustomerMissedYesterday(custId) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatLocalDate(yesterday);
    const isSun = yesterday.getDay() === 0;
    if (isSun) return false;

    const c = window.customers.find(item => item.id === custId);
    if (!c || !c.start || !c.end) return false;

    const start = parseLocalDate(c.start);
    const end = parseLocalDate(c.end);
    const yDate = parseLocalDate(yesterdayStr);

    if (yDate >= start && yDate <= end) {
        if (isCustomerOnLeave(custId, yesterdayStr)) return false;

        const hasB = c.breakfast && !isMealSkipped(custId, yesterdayStr, 'breakfast');
        const hasL = c.lunch && !isMealSkipped(custId, yesterdayStr, 'lunch');
        const hasD = c.dinner && !isMealSkipped(custId, yesterdayStr, 'dinner');

        if (hasB || hasL || hasD) {
            try {
                const doc = await db.collection("deliveries").doc(yesterdayStr).get();
                if (doc.exists) {
                    const data = doc.data() || {};
                    const custDelivery = data[custId] || {};
                    const checkedB = c.breakfast && custDelivery.breakfast;
                    const checkedL = c.lunch && custDelivery.lunch;
                    const checkedD = c.dinner && custDelivery.dinner;

                    const checkedCount = (checkedB ? 1 : 0) + (checkedL ? 1 : 0) + (checkedD ? 1 : 0);
                    return checkedCount === 0;
                } else {
                    return true;
                }
            } catch (e) {
                console.error("Error checking yesterday's deliveries:", e);
            }
        }
    }
    return false;
}

// 4. Calculate leave extension date (skipping Sundays and other leaves dynamically)
function calculateContinuousLeaveExtension() {
    const custId = document.getElementById('leave-cust-id').value;
    const leaveDateStr = document.getElementById('leave-date').value;
    const leaveDays = parseInt(document.getElementById('leave-days-count').value) || 1;
    const previewEl = document.getElementById('leave-extended-preview');
    
    if (!custId || !leaveDateStr || !leaveDays) {
        if (previewEl) previewEl.innerText = "-";
        return null;
    }
    
    const customer = window.customers.find(c => c.id === custId);
    if (!customer) return null;
    
    // Create a temporary leave record in memory to run the self-healing calculation
    const tempLeave = {
        custId: custId,
        date: leaveDateStr + ` (${leaveDays} days)`,
    };
    
    // Backup actual leaves
    const originalLeaves = [...window.leaves];
    window.leaves.push(tempLeave);
    
    // Calculate new end date
    const extendDate = recalculateCustomerEndDate(customer);
    
    // Restore leaves
    window.leaves = originalLeaves;
    
    if (previewEl) previewEl.innerText = extendDate;
    return extendDate;
}

// 4b. Recalculate customer subscription end date dynamically (self-healing timeline)
function recalculateCustomerEndDate(c) {
    if (!c.start) return '';
    let current = parseLocalDate(c.start);
    let deliveryDaysCount = 0;
    const targetDays = c.isTrial ? 6 : 26;
    
    let iterations = 0;
    while (deliveryDaysCount < targetDays && iterations < 500) {
        iterations++;
        const dateStr = formatLocalDate(current);
        const isSun = (current.getDay() === 0);
        
        // Check if customer has a leave on this specific day
        const onLeave = window.leaves.some(l => {
            if (l.custId !== c.id || !l.date || typeof l.date !== 'string') return false;
            // Matches format "YYYY-MM-DD (X days)"
            const match = l.date.match(/^(\d{4}-\d{2}-\d{2})\s*\((\d+)\s*days\)/);
            if (match) {
                const startStr = match[1];
                const days = parseInt(match[2]);
                const startDate = parseLocalDate(startStr);
                
                let temp = new Date(startDate);
                let counted = 0;
                const leaveDates = [];
                while (counted < days) {
                    if (temp.getDay() !== 0) {
                        leaveDates.push(formatLocalDate(temp));
                        counted++;
                    }
                    temp.setDate(temp.getDate() + 1);
                }
                return leaveDates.includes(dateStr);
            }
            return l.date.startsWith(dateStr);
        });

        // Check if there are any skips on this day (meal-level leaves)
        const hasSkips = window.skips && window.skips.some(s => s.custId === c.id && s.date === dateStr);

        // If the day is a leave or has skips, check if it's compensated by an alternate day
        const compensated = isLeaveCompensated(c.id, dateStr);

        if (!isSun && (!onLeave || compensated)) {
            deliveryDaysCount++;
        }
        
        if (deliveryDaysCount < targetDays) {
            current.setDate(current.getDate() + 1);
        }
    }
    return formatLocalDate(current);
}

// 5. Generate and Print Invoice/Memo Bill
function printMemoBill(id) {
    const c = window.customers.find(item => item.id === id);
    if (!c) return;

    const matchLeaves = window.leaves.filter(l => l.custId === id);
    const totalLeaveDays = matchLeaves.reduce((acc, l) => {
        const dMatch = l.date && typeof l.date === 'string' ? l.date.match(/\((\d+)\s+days\)/) : null;
        return acc + (dMatch ? parseInt(dMatch[1]) : 1);
    }, 0);

        const basePlanCost = c.cost || 0;
    const deductionPerDay = c.isTrial ? (parseFloat(window.appSettings.deductTrial) || 200) : (parseFloat(window.appSettings.deductMonthly) || 220);
    const totalDeductions = totalLeaveDays * deductionPerDay;
    const subtotalDue = Math.max(0, basePlanCost - totalDeductions);
    const balanceDue = Math.max(0, subtotalDue - c.paid);

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Memo Bill - ${c.name}</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #334155; max-width: 700px; margin: 0 auto; line-height: 1.5; }
                .header { text-align: center; border-bottom: 3px double #059669; padding-bottom: 15px; margin-bottom: 25px; }
                .header h1 { color: #059669; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: 0.5px; }
                .header p { margin: 4px 0; color: #64748b; font-size: 14px; }
                .details-table { width: 100%; margin-bottom: 25px; font-size: 14px; border-spacing: 0; }
                .details-table td { padding: 6px 0; }
                .details-table td.label { font-weight: bold; color: #475569; width: 30%; }
                .details-table td.value { color: #1e293b; }
                .bill-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 14px; }
                .bill-table th, .bill-table td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
                .bill-table th { background-color: #f8fafc; color: #475569; font-weight: 600; }
                .total-row { font-weight: bold; background-color: #f0fdf4; }
                .payment-info { border: 2px dashed #059669; padding: 20px; border-radius: 12px; text-align: center; background-color: #f0fdf4; margin-top: 30px; }
                .payment-info h3 { margin: 0 0 10px 0; color: #059669; font-size: 16px; }
                .payment-info p { margin: 5px 0; font-size: 14px; }
                .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
                @media print {
                    body { padding: 10px; }
                }
            </style>
        </head>
        <body onload="window.print(); window.close();">
            <div class="header">
                <h1>${(window.appSettings.bizName || "HEALTHY HOME'S FOODS").toUpperCase()}</h1>
                <p>Premium Catering & Tiffin Service • கோவை (Coimbatore)</p>
                <p style="font-weight: bold; font-size: 15px; color: #059669; margin-top: 8px;">MEMO BILL / INVOICE</p>
            </div>
            
            <table class="details-table">
                <tr>
                    <td class="label">Customer Name:</td><td class="value"><b>${c.name}</b></td>
                </tr>
                ${c.companyName ? `<tr><td class="label">Company Name:</td><td class="value">${c.companyName}</td></tr>` : ''}
                <tr>
                    <td class="label">Phone:</td><td class="value">${c.phone}</td>
                </tr>
                <tr>
                    <td class="label">Address:</td><td class="value">${c.address || '-'}</td>
                </tr>
                <tr>
                    <td class="label">Date Generated:</td><td class="value">${new Date().toLocaleDateString('en-IN')}</td>
                </tr>
                ${c.start && c.end ? `<tr><td class="label">Billing Cycle:</td><td class="value">${c.start} to ${c.end}</td></tr>` : ''}
            </table>

            <table class="bill-table">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th style="text-align: right; width: 150px;">Amount (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Subscription Cost (Base Plan Type: ${c.isTrial ? 'Trial' : 'Regular'})</td>
                        <td style="text-align: right;">${basePlanCost.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td>Leaves Deducted (${totalLeaveDays} days)</td>
                        <td style="text-align: right; color: #ef4444;">- ${totalDeductions.toFixed(2)}</td>
                    </tr>
                    <tr class="total-row">
                        <td>Subtotal (Adjusted Cost)</td>
                        <td style="text-align: right;">${subtotalDue.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td>Amount Paid</td>
                        <td style="text-align: right; color: #059669;">${(c.paid || 0).toFixed(2)}</td>
                    </tr>
                    <tr class="total-row" style="font-size: 16px; background-color: #fef2f2;">
                        <td style="color: #991b1b;">Net Balance Due</td>
                        <td style="text-align: right; color: #ef4444;">${balanceDue.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>

            <div class="payment-info">
                <h3>Payment Methods</h3>
                <p><strong>GPay Number:</strong> ${window.appSettings.gpayNumber || "7868888625"}</p>
                <p><strong>Name:</strong> ${window.appSettings.gpayName || "Rajarajeshwari"}</p>
                <p style="font-size: 12px; color: #64748b; margin-top: 10px;">Please share a screenshot of the payment on WhatsApp after making the transfer.</p>
            </div>

            <div class="footer">
                <p>Thank you for choosing ${window.appSettings.bizName || "Healthy Home's Foods"}! Clean. Hygienic. Healthy.</p>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// 6. Generate and Print Customer Ledger Statement
function downloadCustomerLedger(id) {
    const c = window.customers.find(item => item.id === id);
    if (!c) return;

    const matchLeaves = window.leaves.filter(l => l.custId === id);
    const totalLeaveDays = matchLeaves.reduce((acc, l) => {
        const dMatch = l.date && typeof l.date === 'string' ? l.date.match(/\((\d+)\s+days\)/) : null;
        return acc + (dMatch ? parseInt(dMatch[1]) : 1);
    }, 0);

    const basePlanCost = c.cost || 0;
    const deductionPerDay = c.isTrial ? (parseFloat(window.appSettings.deductTrial) || 200) : (parseFloat(window.appSettings.deductMonthly) || 220);
    const totalDeductions = totalLeaveDays * deductionPerDay;
    const subtotalDue = Math.max(0, basePlanCost - totalDeductions);
    const balanceDue = Math.max(0, subtotalDue - c.paid);

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Customer Ledger - ${c.name}</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #334155; max-width: 800px; margin: 0 auto; line-height: 1.5; }
                .header { text-align: center; border-bottom: 3px double #0284c7; padding-bottom: 15px; margin-bottom: 25px; }
                .header h1 { color: #0284c7; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: 0.5px; }
                .header p { margin: 4px 0; color: #64748b; font-size: 14px; }
                .details-table { width: 100%; margin-bottom: 25px; font-size: 14px; border-spacing: 0; }
                .details-table td { padding: 6px 0; }
                .details-table td.label { font-weight: bold; color: #475569; width: 30%; }
                .details-table td.value { color: #1e293b; }
                .section-title { font-size: 16px; font-weight: bold; color: #0284c7; margin: 25px 0 10px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
                .bill-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 13px; }
                .bill-table th, .bill-table td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
                .bill-table th { background-color: #f8fafc; color: #475569; font-weight: 600; }
                .total-row { font-weight: bold; background-color: #f0f9ff; }
                .leave-table { width: 100%; border-collapse: collapse; font-size: 13px; }
                .leave-table th, .leave-table td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
                .leave-table th { background-color: #f8fafc; color: #475569; }
                .badge { font-size: 10px; font-weight: bold; padding: 2px 8px; border-radius: 9999px; }
                .badge-trial { background-color: #fef3c7; color: #92400e; }
                .badge-monthly { background-color: #e0f2fe; color: #0369a1; }
                .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
            </style>
        </head>
        <body onload="window.print(); window.close();">
            <div class="header">
                <h1>${(window.appSettings.bizName || "HEALTHY HOME'S FOODS").toUpperCase()}</h1>
                <p>Catering Dashboard & Customer Accounts Portal</p>
                <p style="font-weight: bold; font-size: 15px; color: #0284c7; margin-top: 8px;">CUSTOMER ACCOUNT LEDGER STATEMENT</p>
            </div>
            
            <table class="details-table">
                <tr>
                    <td class="label">Customer ID:</td><td class="value"><code>${c.id}</code></td>
                </tr>
                <tr>
                    <td class="label">Customer Name:</td><td class="value"><b>${c.name}</b></td>
                </tr>
                ${c.companyName ? `<tr><td class="label">Company Name:</td><td class="value">${c.companyName}</td></tr>` : ''}
                <tr>
                    <td class="label">Phone:</td><td class="value">${c.phone}</td>
                </tr>
                <tr>
                    <td class="label">Plan Type:</td>
                    <td class="value">
                        <span class="badge ${c.isTrial ? 'badge-trial' : 'badge-monthly'}">${c.isTrial ? '6 Days Trial' : 'Monthly subscription'}</span>
                    </td>
                </tr>
                <tr>
                    <td class="label">Address:</td><td class="value">${c.address || 'No Address Provided'}</td>
                </tr>
                <tr>
                    <td class="label">Subscription Window:</td><td class="value">${c.start || '-'} to ${c.end || '-'}</td>
                </tr>
            </table>

            <div class="section-title">Financial Summary</div>
            <table class="bill-table">
                <thead>
                    <tr>
                        <th>Transaction Detail</th>
                        <th style="text-align: right; width: 180px;">Amount (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Initial Subscription Base Charge</td>
                        <td style="text-align: right;">${basePlanCost.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td>Adjustments (Leaves Deductions: ${totalLeaveDays} Days @ ₹${c.isTrial ? (window.appSettings.deductTrial || 200) : (window.appSettings.deductMonthly || 220)}/day)</td>
                        <td style="text-align: right; color: #ef4444;">- ${totalDeductions.toFixed(2)}</td>
                    </tr>
                    <tr class="total-row">
                        <td>Net Cost Accrued</td>
                        <td style="text-align: right;">${subtotalDue.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td>Total Amount Paid / Received</td>
                        <td style="text-align: right; color: #059669;">${(c.paid || 0).toFixed(2)}</td>
                    </tr>
                    <tr class="total-row" style="font-size: 15px; background-color: #fef2f2;">
                        <td style="color: #991b1b;">Net Balance Due (Outstanding)</td>
                        <td style="text-align: right; color: #ef4444;">₹${balanceDue.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>

            <div class="section-title">Leaves & Skips Records History (${matchLeaves.length})</div>
            ${matchLeaves.length === 0 ? 
                `<p style="font-size: 13px; color: #64748b; font-style: italic;">No leave or skip logs recorded for this subscription period.</p>` : 
                `<table class="leave-table">
                    <thead>
                        <tr>
                            <th>Leave Request Date (Days Duration)</th>
                            <th>Plan Extension New Expiry Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${matchLeaves.map(l => `
                            <tr>
                                <td>${l.date}</td>
                                <td><b>${l.extendDate}</b></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>`
            }

            <div class="footer">
                <p>Generates dynamically from ${(window.appSettings.bizName || "Healthy Home's Foods")} Cloud Sync System.</p>
                <p>© ${new Date().getFullYear()} ${(window.appSettings.bizName || "Healthy Home's Foods")}. All rights reserved.</p>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// 7. Print Delivery Checklist Sheet Grouped by Delivery Staff
function printDeliveryChecklist() {
    const session = window.activeMealSession || 'all';
    const staffId = document.getElementById('route-staff-filter').value;
    
    // Filter active subscribers for today
    const todayStr = window.todayDateStr;
    const today = new Date(todayStr);
    today.setHours(0,0,0,0);
    const isSunday = today.getDay() === 0;
    
    let activeDeliveries = window.customers.filter(c => {
        // Date active bounds
        if (!c.start || !c.end) return false;
        const start = new Date(c.start);
        const end = new Date(c.end);
        if (today < start || today > end) return false;
        
        // Skip Sundays
        if (isSunday) return false;
        
        // On Leave today?
        if (isCustomerOnLeave(c.id, todayStr)) return false;
        
        // Meal Session filter matches
        if (session === 'breakfast' && !c.breakfast) return false;
        if (session === 'lunch' && !c.lunch) return false;
        if (session === 'dinner' && !c.dinner) return false;
        if (session === 'all' && !c.breakfast && !c.lunch && !c.dinner) return false;
        
        // Staff filter
        if (staffId !== 'all' && c.staffId !== staffId) return false;
        
        return true;
    });

    // Group by Staff
    const grouped = {};
    activeDeliveries.forEach(c => {
        const staff = window.staffList.find(s => s.id === c.staffId);
        const staffName = staff ? staff.name : 'Unassigned (ஊழியர் ஒதுக்கப்படவில்லை)';
        if (!grouped[staffName]) grouped[staffName] = [];
        grouped[staffName].push(c);
    });

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Delivery Checklist - ${todayStr}</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; color: #334155; }
                .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #059669; padding-bottom: 10px; margin-bottom: 20px; }
                .header h1 { font-size: 20px; color: #059669; margin: 0; }
                .header p { margin: 4px 0; font-size: 13px; color: #64748b; }
                .staff-section { margin-bottom: 30px; page-break-inside: avoid; }
                .staff-title { font-size: 15px; font-weight: bold; background: #e2e8f0; padding: 8px 12px; border-radius: 6px; color: #1e293b; margin-bottom: 10px; }
                .table { width: 100%; border-collapse: collapse; font-size: 12px; }
                .table th, .table td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; vertical-align: top; }
                .table th { background-color: #f1f5f9; color: #475569; font-weight: bold; }
                .meals-col { font-weight: bold; color: #0f766e; }
                .checkbox-cell { text-align: center; font-size: 16px; width: 40px; color: #cbd5e1; }
                .notes { font-style: italic; color: #64748b; font-size: 10px; }
            </style>
        </head>
        <body onload="window.print(); window.close();">
            <div class="header">
                <div>
                    <h1>${(window.appSettings.bizName || "HEALTHY HOME'S FOODS").toUpperCase()} - DAILY SHEET</h1>
                    <p>விநியோகப் பட்டியல் (Grouped by Delivery Driver)</p>
                </div>
                <div style="text-align: right;">
                    <p style="font-weight: bold; font-size: 14px; color: #1e293b;">Date: ${todayStr}</p>
                    <p>Session: <b>${session.toUpperCase()}</b></p>
                </div>
            </div>

            ${isSunday ? `<div style="text-align:center; padding: 30px; font-weight:bold; color:#ef4444; border:1px solid #fecaca; background:#fef2f2; border-radius:10px;">ஞாயிற்றுக்கிழமை - விநியோக விடுமுறை (Sunday - Delivery Holiday)</div>` : ''}

            ${Object.keys(grouped).length === 0 && !isSunday ? '<p style="text-align:center; color:#94a3b8; font-style:italic; margin-top:40px;">விநியோகப் பட்டியலில் தகவல்கள் எதுவும் இல்லை.</p>' : ''}

            ${Object.keys(grouped).map(staffName => `
                <div class="staff-section">
                    <div class="staff-title">Delivery Driver: ${staffName} (${grouped[staffName].length} Orders)</div>
                    <table class="table">
                        <thead>
                            <tr>
                                <th style="width: 25px;">#</th>
                                <th style="width: 130px;">Name / Company</th>
                                <th style="width: 85px;">Phone</th>
                                <th>Address (முகவரி)</th>
                                <th style="width: 140px;">Meals & Qty</th>
                                <th class="checkbox-cell">B</th>
                                <th class="checkbox-cell">L</th>
                                <th class="checkbox-cell">D</th>
                                <th>Driver Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${grouped[staffName].map((c, i) => {
                                let mealStr = [];
                                if (c.breakfast) mealStr.push(`B(${c.breakfastQty || 1})`);
                                if (c.lunch) mealStr.push(`L(${c.lunchQty || 1})`);
                                if (c.dinner) mealStr.push(`D(${c.dinnerQty || 1})`);
                                
                                return `
                                    <tr>
                                        <td>${i + 1}</td>
                                        <td><b>${c.name}</b> ${c.companyName ? `<br><span style="color:#64748b;font-size:10px;">${c.companyName}</span>` : ''}</td>
                                        <td>${c.phone}</td>
                                        <td>${c.address || '-'}</td>
                                        <td class="meals-col">${mealStr.join(', ')}</td>
                                        <td class="checkbox-cell">${c.breakfast ? '☐' : '-'}</td>
                                        <td class="checkbox-cell">${c.lunch ? '☐' : '-'}</td>
                                        <td class="checkbox-cell">${c.dinner ? '☐' : '-'}</td>
                                        <td class="notes">${c.notes || ''}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `).join('')}
        </body>
        </html>
    `);
    printWindow.document.close();
}

// 8. Calculate Kitchen Grocery Quantities Needed
function recalculateKitchenGroceryPortions() {
    const ricePortion = parseFloat(document.getElementById('portion-rice').value) || 0;
    const dalPortion = parseFloat(document.getElementById('portion-dal').value) || 0;
    const vegPortion = parseFloat(document.getElementById('portion-veg').value) || 0;
    const oilPortion = parseFloat(document.getElementById('portion-oil').value) || 0;

    // Filter active subscribers for today (skipping leaves)
    const todayStr = window.todayDateStr;
    const today = parseLocalDate(todayStr);
    const isSunday = today.getDay() === 0;

    let totalB = 0, totalL = 0, totalD = 0;

    if (!isSunday) {
        window.customers.forEach(c => {
            if (!c.start || !c.end) return;
            const start = parseLocalDate(c.start);
            const end = parseLocalDate(c.end);
            
            // Check if active today
            if (today >= start && today <= end) {
                // Check if not on leave
                if (!isCustomerOnLeave(c.id, todayStr)) {
                    if (c.breakfast && !isMealSkipped(c.id, todayStr, 'breakfast')) totalB += (parseInt(c.breakfastQty) || 1);
                    if (c.lunch && !isMealSkipped(c.id, todayStr, 'lunch')) totalL += (parseInt(c.lunchQty) || 1);
                    if (c.dinner && !isMealSkipped(c.id, todayStr, 'dinner')) totalD += (parseInt(c.dinnerQty) || 1);
                }
            }
        });
    }

    const lunchDinnerCount = totalL + totalD;
    const allMealsCount = totalB + totalL + totalD;

    // Calculate in kilograms / litres
    const totalRice = (lunchDinnerCount * ricePortion) / 1000;
    const totalDal = (lunchDinnerCount * dalPortion) / 1000;
    const totalVeg = (lunchDinnerCount * vegPortion) / 1000;
    const totalOil = (allMealsCount * oilPortion) / 1000;

    // Update DOM
    const elCountB = document.getElementById('kit-count-breakfast');
    const elCountL = document.getElementById('kit-count-lunch');
    const elCountD = document.getElementById('kit-count-dinner');
    if (elCountB) elCountB.innerText = `${totalB} Portion`;
    if (elCountL) elCountL.innerText = `${totalL} Portion`;
    if (elCountD) elCountD.innerText = `${totalD} Portion`;

    document.getElementById('kit-sum-rice').innerText = `${totalRice.toFixed(2)} kg`;
    document.getElementById('kit-sum-dal').innerText = `${totalDal.toFixed(2)} kg`;
    document.getElementById('kit-sum-veg').innerText = `${totalVeg.toFixed(2)} kg`;
    document.getElementById('kit-sum-oil').innerText = `${totalOil.toFixed(2)} Litres`;

    // Tomorrow's preparation forecasting
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

    const forecastBEl = document.getElementById('kit-forecast-b');
    const forecastLEl = document.getElementById('kit-forecast-l');
    const forecastDEl = document.getElementById('kit-forecast-d');
    if (forecastBEl) forecastBEl.innerText = `${tomB} Portions`;
    if (forecastLEl) forecastLEl.innerText = `${tomL} Portions`;
    if (forecastDEl) forecastDEl.innerText = `${tomD} Portions`;
}

// 9. Utility Toast triggers
function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');
    
    if (toast && toastMsg) {
        toastMsg.innerText = msg;
        if (toastIcon) {
            if (type === 'success') {
                toastIcon.innerHTML = '<i class="fa-solid fa-circle-check text-emerald-400"></i>';
            } else if (type === 'alert') {
                toastIcon.innerHTML = '<i class="fa-solid fa-circle-exclamation text-amber-400"></i>';
            } else {
                toastIcon.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-rose-400"></i>';
            }
        }
        toast.classList.remove('translate-y-20', 'opacity-0');
        setTimeout(() => {
            toast.classList.add('translate-y-20', 'opacity-0');
        }, 2500);
    }
}

// 8. Vehicle & Trip Calculations Helpers
window.calculateVehicleOdometer = function(vehicleId) {
    const vehicle = window.vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return 0;
    
    let maxOdo = parseFloat(vehicle.odo) || 0;
    if (window.trips && window.trips.length > 0) {
        const vehicleTrips = window.trips.filter(t => t.vehicleId === vehicleId);
        vehicleTrips.forEach(t => {
            const end = parseFloat(t.endOdometer) || 0;
            if (end > maxOdo) maxOdo = end;
        });
    }
    return maxOdo;
};

window.calculateTripMetrics = function(trip) {
    const start = parseFloat(trip.startOdometer) || 0;
    const end = parseFloat(trip.endOdometer) || 0;
    const distance = Math.max(0, end - start);
    
    const fuelCostPerKm = parseFloat(window.appSettings.fuelCostPerKm) || 10;
    const fuelCost = distance * fuelCostPerKm;
    
    const customerIds = trip.customerIds || [];
    const customersCount = customerIds.length;
    const costPerDelivery = customersCount > 0 ? fuelCost / customersCount : 0;
    const costPerCustomer = customersCount > 0 ? fuelCost / customersCount : 0;
    
    let mealsCount = 0;
    customerIds.forEach(custId => {
        const c = window.customers.find(item => item.id === custId);
        if (c) {
            let activeMeals = 0;
            if (c.breakfast) activeMeals += (parseInt(c.breakfastQty) || 1);
            if (c.lunch) activeMeals += (parseInt(c.lunchQty) || 1);
            if (c.dinner) activeMeals += (parseInt(c.dinnerQty) || 1);
            mealsCount += activeMeals;
        }
    });
    
    return {
        distance,
        fuelCost,
        customersCount,
        costPerDelivery,
        costPerCustomer,
        mealsCount
    };
};

window.getVehicleStats = function(vehicleId) {
    const vehicle = window.vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return null;
    
    const vTrips = (window.trips || []).filter(t => t.vehicleId === vehicleId);
    
    const todayStr = window.todayDateStr;
    const yesterday = parseLocalDate(todayStr);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatLocalDate(yesterday);
    const currentMonthStr = todayStr.substring(0, 7); // YYYY-MM
    
    const todayTrips = vTrips.filter(t => t.date === todayStr).sort((a,b) => (parseInt(a.tripNumber) || 0) - (parseInt(b.tripNumber) || 0));
    const yesterdayTrips = vTrips.filter(t => t.date === yesterdayStr).sort((a,b) => (parseInt(a.tripNumber) || 0) - (parseInt(b.tripNumber) || 0));
    const monthlyTrips = vTrips.filter(t => t.date && t.date.startsWith(currentMonthStr)).sort((a,b) => a.date.localeCompare(b.date) || (parseInt(a.tripNumber) || 0) - (parseInt(b.tripNumber) || 0));
    
    let totalKm = 0;
    let totalFuel = 0;
    let totalDeliveries = 0;
    
    vTrips.forEach(t => {
        const metrics = window.calculateTripMetrics(t);
        totalKm += metrics.distance;
        totalFuel += metrics.fuelCost;
        totalDeliveries += metrics.customersCount;
    });
    
    const averageKmPerTrip = vTrips.length > 0 ? totalKm / vTrips.length : 0;
    
    return {
        todayTrips,
        yesterdayTrips,
        monthlyTrips,
        totalKm,
        totalFuel,
        totalDeliveries,
        averageKmPerTrip
    };
};

