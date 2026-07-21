// 🌟 FINANCE & REVENUE RECOGNITION BUSINESS LOGIC MODULE
import { parseLocalDate } from "../core/shared-utils.js";

/**
 * Calculates recognized and deferred revenue for a customer in a specific month
 * @param {Object} customer 
 * @param {number} year 
 * @param {number} month (1-indexed: Jan=1, Dec=12)
 * @returns {Object} 
 */
export function getMonthAccrualRevenue(customer, year, month) {
  const start = parseLocalDate(customer.start);
  const end = parseLocalDate(customer.end);
  if (!start || !end) return { recognized: 0, cashRecognized: 0, deferred: 0, daysInMonth: 0, totalDays: 0 };
  
  // Set month boundaries in local time
  const monthStart = new Date(year, month - 1, 1, 0, 0, 0);
  const monthEnd = new Date(year, month, 0, 23, 59, 59); // Sweden last day of month
  
  // Get overlap dates
  const overlapStart = new Date(Math.max(start.getTime(), monthStart.getTime()));
  const overlapEnd = new Date(Math.min(end.getTime(), monthEnd.getTime()));
  
  if (overlapStart > overlapEnd) {
    return { recognized: 0, cashRecognized: 0, deferred: 0, daysInMonth: 0, totalDays: 0 };
  }
  
  const oneDayMs = 1000 * 60 * 60 * 24;
  
  // Calculate day counts
  const totalDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / oneDayMs) || 1;
  const daysInMonth = Math.ceil(Math.abs(overlapEnd.getTime() - overlapStart.getTime()) / oneDayMs) || 1;
  
  const cost = parseFloat(customer.cost) || 0;
  const paid = parseFloat(customer.paid) || 0;
  
  const dailyRate = cost / totalDays;
  const cashDailyRate = paid / totalDays;
  
  const recognized = dailyRate * daysInMonth;
  const cashRecognized = cashDailyRate * daysInMonth;
  
  let deferred = 0;
  if (end.getTime() > monthEnd.getTime()) {
    const deferredDays = Math.floor((end.getTime() - monthEnd.getTime()) / oneDayMs);
    deferred = dailyRate * deferredDays;
  }
  
  return {
    recognized,
    cashRecognized,
    deferred,
    daysInMonth,
    totalDays
  };
}

/**
 * Summarizes expenses categorized by category or filtered by date range
 */
export function getExpensesSummary(expenses, filterCategory = 'all', startDateStr = '', endDateStr = '') {
  let list = [...expenses];
  
  if (filterCategory !== 'all') {
    list = list.filter(e => e.category === filterCategory);
  }
  
  if (startDateStr) {
    const start = parseLocalDate(startDateStr);
    list = list.filter(e => parseLocalDate(e.date) >= start);
  }
  
  if (endDateStr) {
    const end = parseLocalDate(endDateStr);
    list = list.filter(e => parseLocalDate(e.date) <= end);
  }
  
  const total = list.reduce((acc, e) => acc + (parseFloat(e.amount) || 0), 0);
  
  return {
    expensesList: list,
    totalAmount: total
  };
}
