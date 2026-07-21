// 🌟 KITCHEN PRODUCTION BUSINESS LOGIC MODULE
import { parseLocalDate, isSunday } from "../core/shared-utils.js";
import { dataRegistry } from "../core/accessors.js";

/**
 * Calculates total meals and total grocery weights for a given date
 * @param {Array} customers 
 * @param {string} dateStr 
 * @param {Object} portions { rice, dal, veg, oil }
 * @returns {Object} 
 */
export function getKitchenGroceryDemands(customers, dateStr, portions) {
  const dateObj = parseLocalDate(dateStr);
  const isSun = isSunday(dateObj);
  
  let totalB = 0, totalL = 0, totalD = 0;

  if (!isSun) {
    customers.forEach(c => {
      if (c.status === 'withdrawn' || !c.start || !c.end) return;
      const start = parseLocalDate(c.start);
      const end = parseLocalDate(c.end);
      const targetDate = parseLocalDate(dateStr);
      
      if (targetDate >= start && targetDate <= end) {
        if (!dataRegistry.isCustomerOnLeave(c.id, dateStr)) {
          if (c.breakfast && !dataRegistry.isMealSkipped(c.id, dateStr, 'breakfast')) {
            totalB += (parseInt(c.breakfastQty) || 1);
          }
          if (c.lunch && !dataRegistry.isMealSkipped(c.id, dateStr, 'lunch')) {
            totalL += (parseInt(c.lunchQty) || 1);
          }
          if (c.dinner && !dataRegistry.isMealSkipped(c.id, dateStr, 'dinner')) {
            totalD += (parseInt(c.dinnerQty) || 1);
          }
        }
      }
    });
  }

  const lunchDinnerCount = totalL + totalD;
  const allMealsCount = totalB + totalL + totalD;

  const totalRice = (lunchDinnerCount * (portions.rice || 120)) / 1000;
  const totalDal = (lunchDinnerCount * (portions.dal || 30)) / 1000;
  const totalVeg = (lunchDinnerCount * (portions.veg || 100)) / 1000;
  const totalOil = (allMealsCount * (portions.oil || 15)) / 1000;

  return {
    mealsCount: { B: totalB, L: totalL, D: totalD },
    groceryTotals: {
      rice: totalRice,
      dal: totalDal,
      veg: totalVeg,
      oil: totalOil
    }
  };
}

/**
 * Forecasts portion counts for a future date
 */
export function getPortionsForecast(customers, targetDateStr) {
  const dateObj = parseLocalDate(targetDateStr);
  const isSun = isSunday(dateObj);
  
  let tomB = 0, tomL = 0, tomD = 0;
  
  if (!isSun) {
    customers.forEach(c => {
      if (c.status === 'withdrawn' || !c.start || !c.end) return;
      const start = parseLocalDate(c.start);
      const end = parseLocalDate(c.end);
      const targetDate = parseLocalDate(targetDateStr);
      
      if (targetDate >= start && targetDate <= end) {
        if (!dataRegistry.isCustomerOnLeave(c.id, targetDateStr)) {
          if (c.breakfast && !dataRegistry.isMealSkipped(c.id, targetDateStr, 'breakfast')) tomB += (parseInt(c.breakfastQty) || 1);
          if (c.lunch && !dataRegistry.isMealSkipped(c.id, targetDateStr, 'lunch')) tomL += (parseInt(c.lunchQty) || 1);
          if (c.dinner && !dataRegistry.isMealSkipped(c.id, targetDateStr, 'dinner')) tomD += (parseInt(c.dinnerQty) || 1);
        }
      }
    });
  }

  return { B: tomB, L: tomL, D: tomD };
}
