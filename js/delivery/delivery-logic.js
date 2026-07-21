// 🌟 DELIVERY PLANNING BUSINESS LOGIC MODULE
import { parseLocalDate, formatLocalDate, isSunday } from "../core/shared-utils.js";
import { dataRegistry } from "../core/accessors.js";

/**
 * Calculates delivery planner stats for a selected date
 * @param {Array} customers 
 * @param {string} dateStr 
 * @param {string} routeType ('morning' | 'evening')
 * @param {string} filterDriverId ('all' | staffId)
 * @returns {Object} { planned: { B, L, D }, leaveCount: number, unassignedCount: number }
 */
export function getDeliveryStats(customers, dateStr, routeType, filterDriverId = 'all') {
  const dateObj = parseLocalDate(dateStr);
  const isSun = isSunday(dateObj);
  
  let plannedB = 0, plannedL = 0, plannedD = 0;
  let leaveCount = 0;
  let unassignedCount = 0;

  if (isSun) {
    return {
      planned: { B: 0, L: 0, D: 0 },
      leaveCount: 0,
      unassignedCount: 0
    };
  }

  customers.forEach(c => {
    if (c.status === 'withdrawn' || !c.start || !c.end) return;
    const start = parseLocalDate(c.start);
    const end = parseLocalDate(c.end);
    const targetDate = parseLocalDate(dateStr);
    
    if (targetDate >= start && targetDate <= end) {
      const onLeave = dataRegistry.isCustomerOnLeave(c.id, dateStr);
      const compensated = dataRegistry.isLeaveCompensated(c.id, dateStr);
      
      if (onLeave && !compensated) {
        leaveCount++;
        return; // customer is on leave
      }
      
      const hasB = c.breakfast && !dataRegistry.isMealSkipped(c.id, dateStr, 'breakfast');
      const hasL = c.lunch && !dataRegistry.isMealSkipped(c.id, dateStr, 'lunch');
      const hasD = c.dinner && !dataRegistry.isMealSkipped(c.id, dateStr, 'dinner');

      let isMatch = false;
      if (routeType === 'morning' && (hasB || hasL)) {
        if (filterDriverId === 'all' || c.staffId === filterDriverId) {
          isMatch = true;
          if (hasB) plannedB += (c.breakfastQty || 1);
          if (hasL) plannedL += (c.lunchQty || 1);
        }
        if (!c.staffId) unassignedCount++;
      } else if (routeType === 'evening' && hasD) {
        const driverId = c.eveningStaffId || c.staffId;
        if (filterDriverId === 'all' || driverId === filterDriverId) {
          isMatch = true;
          plannedD += (c.dinnerQty || 1);
        }
        if (!driverId) unassignedCount++;
      }
    }
  });

  return {
    planned: { B: plannedB, L: plannedL, D: plannedD },
    leaveCount,
    unassignedCount
  };
}

/**
 * Filters and sorts subscribers for the delivery checklist
 */
export function filterDeliveries(customers, dateStr, session, routeType, staffId, sortOption) {
  const dateObj = parseLocalDate(dateStr);
  if (!dateObj || isSunday(dateObj)) return [];

  const list = [];
  
  customers.forEach(c => {
    if (c.status === 'withdrawn' || !c.start || !c.end) return;
    const start = parseLocalDate(c.start);
    const end = parseLocalDate(c.end);
    const targetDate = parseLocalDate(dateStr);
    
    if (targetDate >= start && targetDate <= end) {
      const onLeave = dataRegistry.isCustomerOnLeave(c.id, dateStr);
      const compensated = dataRegistry.isLeaveCompensated(c.id, dateStr);
      
      if (onLeave && !compensated) return; // leave skipped

      // Validate meal schedules active for route/session
      const activeMeals = {
        breakfast: c.breakfast && !dataRegistry.isMealSkipped(c.id, dateStr, 'breakfast'),
        lunch: c.lunch && !dataRegistry.isMealSkipped(c.id, dateStr, 'lunch'),
        dinner: c.dinner && !dataRegistry.isMealSkipped(c.id, dateStr, 'dinner')
      };

      let routeDriver = c.staffId;
      if (routeType === 'evening') {
        routeDriver = c.eveningStaffId || c.staffId;
      }

      // Session matching
      let isSessionMatch = false;
      if (session === 'all') {
        if (routeType === 'morning' && (activeMeals.breakfast || activeMeals.lunch)) isSessionMatch = true;
        if (routeType === 'evening' && activeMeals.dinner) isSessionMatch = true;
      } else {
        if (activeMeals[session]) isSessionMatch = true;
      }

      // Staff matching
      if (isSessionMatch) {
        if (staffId === 'all' || routeDriver === staffId) {
          list.push({
            customer: c,
            activeMeals,
            driverId: routeDriver
          });
        }
      }
    }
  });

  // Apply sorting options
  list.sort((a, b) => {
    if (sortOption === 'name') {
      return a.customer.name.localeCompare(b.customer.name);
    } 
    else if (sortOption === 'area') {
      const addrA = a.customer.address || '';
      const addrB = b.customer.address || '';
      return addrA.localeCompare(addrB);
    } 
    else if (sortOption === 'staff') {
      const staffA = a.driverId || '';
      const staffB = b.driverId || '';
      return staffA.localeCompare(staffB);
    } 
    else if (sortOption === 'unassigned') {
      const hasA = !!a.driverId;
      const hasB = !!b.driverId;
      if (hasA && !hasB) return 1;
      if (!hasA && hasB) return -1;
      return a.customer.name.localeCompare(b.customer.name);
    }
    return 0;
  });

  return list;
}
