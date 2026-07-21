// 🌟 CUSTOMERS LOGIC MODULE
import { parseLocalDate, formatLocalDate, isSunday } from "../core/shared-utils.js";
import { dataRegistry } from "../core/accessors.js";

/**
 * Calculates remaining balance
 */
export function getCustomerBalance(cost, paid) {
  return Math.max(0, (parseFloat(cost) || 0) - (parseFloat(paid) || 0));
}

/**
 * Checks if a customer is on leave on a specific date YYYY-MM-DD
 */
export function isCustomerOnLeave(custId, dateStr) {
  const leaves = dataRegistry.getLeaves().filter(l => l.custId === custId);
  
  for (let l of leaves) {
    if (!l.date || typeof l.date !== 'string') continue;
    
    // Check range form: "2026-07-12 (3 days)"
    const match = l.date.match(/^(\d{4}-\d{2}-\d{2})\s*\((\d+)\s*days\)/);
    if (match) {
      const startDateStr = match[1];
      const days = parseInt(match[2]);
      const startDate = parseLocalDate(startDateStr);
      if (!startDate) continue;
      
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
      
      if (leaveDates.includes(dateStr)) return true;
    } else {
      if (l.date.startsWith(dateStr)) return true;
    }
  }
  return false;
}

/**
 * Checks if a meal is skipped
 */
export function isMealSkipped(custId, dateStr, meal) {
  const skips = dataRegistry.getSkips();
  return skips.some(s => s.custId === custId && s.date === dateStr && s.meal === meal);
}

/**
 * Checks if a leave date has been compensated by an alternate delivery date
 */
export function isLeaveCompensated(custId, originalDateStr) {
  const alternates = dataRegistry.getAlternates();
  return alternates.some(a => a.custId === custId && a.originalDate === originalDateStr);
}

/**
 * Checks if customer is on leave or skipped for a specific meal session
 */
export function isCustomerOnLeaveForMeal(custId, dateStr, meal) {
  return isCustomerOnLeave(custId, dateStr) || isMealSkipped(custId, dateStr, meal);
}

/**
 * Checks if alternate day meal is scheduled
 */
export function isAlternateMealScheduled(custId, dateStr, meal) {
  const alternates = dataRegistry.getAlternates();
  return alternates.some(a => a.custId === custId && a.alternateDate === dateStr && a.meals.includes(meal));
}

/**
 * Computes customer timeline end date (skipping Sundays and leaves unless compensated)
 */
export function recalculateCustomerEndDate(customer) {
  if (!customer.start) return '';
  let current = parseLocalDate(customer.start);
  if (!current || isNaN(current.getTime())) return '';
  
  let deliveryDaysCount = 0;
  const targetDays = customer.isTrial ? 6 : 26;
  
  let iterations = 0;
  while (deliveryDaysCount < targetDays && iterations < 500) {
    iterations++;
    const dateStr = formatLocalDate(current);
    const isSun = (current.getDay() === 0);
    
    const onLeave = isCustomerOnLeave(customer.id, dateStr);
    const compensated = isLeaveCompensated(customer.id, dateStr);
    
    if (!isSun && (!onLeave || compensated)) {
      deliveryDaysCount++;
    }
    
    if (deliveryDaysCount < targetDays) {
      current.setDate(current.getDate() + 1);
    }
  }
  return formatLocalDate(current);
}

/**
 * Preview calculations for leave date selection shifts
 */
export function calculateContinuousLeaveExtension(customer, startDateStr, daysCount) {
  if (!customer || !startDateStr || !daysCount) return null;
  
  // Temporarily insert a leave record in memory to simulate calculations
  const tempLeave = {
    custId: customer.id,
    date: startDateStr + ` (${daysCount} days)`
  };
  
  const originalLeaves = [...dataRegistry.getLeaves()];
  dataRegistry.setLeaves([...originalLeaves, tempLeave]);
  
  const extendedDate = recalculateCustomerEndDate(customer);
  
  // Revert back
  dataRegistry.setLeaves(originalLeaves);
  
  return extendedDate;
}

/**
 * Calculates total leave days and deduction details for a customer
 */
export function getCustomerDeductionDetails(customer, settings) {
  const matchLeaves = dataRegistry.getLeaves().filter(l => l.custId === customer.id);
  const totalLeaveDays = matchLeaves.reduce((acc, l) => {
    const dMatch = l.date && typeof l.date === 'string' ? l.date.match(/\((\d+)\s+days\)/) : null;
    return acc + (dMatch ? parseInt(dMatch[1]) : 1);
  }, 0);

  const basePlanCost = customer.cost || 0;
  const deductionPerDay = customer.isTrial 
    ? (parseFloat(settings.deductTrial) || 200) 
    : (parseFloat(settings.deductMonthly) || 220);
  
  const totalDeductions = totalLeaveDays * deductionPerDay;
  const subtotalDue = Math.max(0, basePlanCost - totalDeductions);
  const balanceDue = Math.max(0, subtotalDue - (customer.paid || 0));

  return {
    totalLeaveDays,
    deductionPerDay,
    totalDeductions,
    subtotalDue,
    balanceDue
  };
}

/**
 * Evaluates template message for WhatsApp sharing
 */
export function getWhatsAppMessageText(customer, balance, templateStr) {
  const template = templateStr || "வணக்கம் {name}, உங்களின் நிலுவைத் தொகை ₹{balance} ஆகும். நன்றி!";
  return template
    .replace("{name}", customer.name)
    .replace("{balance}", balance);
}

// Automatically register callbacks in cross-domain registry bridge
dataRegistry.registerIsCustomerOnLeave(isCustomerOnLeave);
dataRegistry.registerIsMealSkipped(isMealSkipped);
dataRegistry.registerIsLeaveCompensated(isLeaveCompensated);

