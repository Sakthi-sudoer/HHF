// 🌟 ENTERPRISE DASHBOARD ANALYTICS CORE
// Compiles real-time metrics, portion audits, and finance aggregates for Chart.js.
import { dataRegistry } from "../core/accessors.js";
import { formatLocalDate } from "../core/shared-utils.js";


/**
 * Compiles revenue vs expenses totals grouped by categories.
 */
export function getFinanceChartData() {
  const customers = dataRegistry.getCustomers();
  const expenses = dataRegistry.getExpenses();

  // 1. Calculate Total Cash Revenue (from customer payments)
  const totalRevenue = customers.reduce((sum, c) => sum + (parseFloat(c.paid) || 0), 0);

  // 2. Group expenses by category
  const categories = {
    grocery: 0,
    fuel: 0,
    salary: 0,
    kitchen: 0,
    maintenance: 0,
    rent: 0,
    others: 0
  };

  expenses.forEach(e => {
    const cat = (e.category || 'others').toLowerCase();
    const amt = parseFloat(e.amount) || 0;
    if (categories[cat] !== undefined) {
      categories[cat] += amt;
    } else {
      categories.others += amt;
    }
  });

  const expenseLabels = ['Grocery', 'Fuel', 'Salary', 'Kitchen', 'Maintenance', 'Rent', 'Others'];
  const expenseValues = [
    categories.grocery,
    categories.fuel,
    categories.salary,
    categories.kitchen,
    categories.maintenance,
    categories.rent,
    categories.others
  ];

  return {
    revenue: totalRevenue,
    expenseLabels,
    expenseValues,
    totalExpenses: expenseValues.reduce((a, b) => a + b, 0)
  };
}

/**
 * Compiles portion size counts for breakfast, lunch, and dinner.
 */
export function getMealPortionsData() {
  const customers = dataRegistry.getCustomers();

  let breakfast = 0;
  let lunch = 0;
  let dinner = 0;

  customers.forEach(c => {
    if (c.breakfast) breakfast += parseInt(c.breakfastQty) || 1;
    if (c.lunch) lunch += parseInt(c.lunchQty) || 1;
    if (c.dinner) dinner += parseInt(c.dinnerQty) || 1;
  });

  return {
    labels: ['காலை உணவு (Breakfast)', 'மதிய உணவு (Lunch)', 'இரவு உணவு (Dinner)'],
    values: [breakfast, lunch, dinner]
  };
}

/**
 * Compiles subscriber plan counts (Trial vs Weekly vs Monthly).
 */
export function getSubscribersPlansData() {
  const customers = dataRegistry.getCustomers();

  let trial = 0;
  let weekly = 0;
  let monthly = 0;

  customers.forEach(c => {
    if (c.isTrial) {
      trial++;
    } else if (c.paymentTerm === 'weekly') {
      weekly++;
    } else {
      monthly++;
    }
  });

  return {
    labels: ['Trial Plan', 'Weekly Plan', 'Monthly Plan'],
    values: [trial, weekly, monthly]
  };
}

/**
 * Compiles today's delivery progress (Delivered vs Pending vs Skipped/Leave).
 */
export function getDeliveryProgressData() {
  const customers = dataRegistry.getCustomers();
  const todayStr = formatLocalDate(new Date());
  
  // Deliveries map structure from dataRegistry:
  // e.g. { custId: { breakfast: true, lunch: false } }
  const deliveries = dataRegistry.getDeliveries() || {};

  let delivered = 0;
  let pending = 0;
  let skippedOrLeave = 0;

  customers.forEach(c => {
    const custDeliv = deliveries[c.id] || {};
    
    // Check breakfast
    if (c.breakfast) {
      if (dataRegistry.isCustomerOnLeave(c.id, todayStr)) {
        skippedOrLeave += parseInt(c.breakfastQty) || 1;
      } else if (dataRegistry.isMealSkipped(c.id, todayStr, 'breakfast')) {
        skippedOrLeave += parseInt(c.breakfastQty) || 1;
      } else if (custDeliv.breakfast === true) {
        delivered += parseInt(c.breakfastQty) || 1;
      } else {
        pending += parseInt(c.breakfastQty) || 1;
      }
    }

    // Check lunch
    if (c.lunch) {
      if (dataRegistry.isCustomerOnLeave(c.id, todayStr)) {
        skippedOrLeave += parseInt(c.lunchQty) || 1;
      } else if (dataRegistry.isMealSkipped(c.id, todayStr, 'lunch')) {
        skippedOrLeave += parseInt(c.lunchQty) || 1;
      } else if (custDeliv.lunch === true) {
        delivered += parseInt(c.lunchQty) || 1;
      } else {
        pending += parseInt(c.lunchQty) || 1;
      }
    }

    // Check dinner
    if (c.dinner) {
      if (dataRegistry.isCustomerOnLeave(c.id, todayStr)) {
        skippedOrLeave += parseInt(c.dinnerQty) || 1;
      } else if (dataRegistry.isMealSkipped(c.id, todayStr, 'dinner')) {
        skippedOrLeave += parseInt(c.dinnerQty) || 1;
      } else if (custDeliv.dinner === true) {
        delivered += parseInt(c.dinnerQty) || 1;
      } else {
        pending += parseInt(c.dinnerQty) || 1;
      }
    }
  });

  return {
    labels: ['Delivered', 'Pending', 'Leave / Skipped'],
    values: [delivered, pending, skippedOrLeave]
  };
}
