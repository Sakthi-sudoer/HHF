// 🌟 VEHICLES & TRIPS BUSINESS LOGIC MODULE
import { parseLocalDate, formatLocalDate } from "../core/shared-utils.js";

/**
 * Calculates current odometer reading for a vehicle based on its trips history
 */
export function calculateVehicleOdometer(vehicleId, vehicles, trips) {
  const vehicle = vehicles.find(v => v.id === vehicleId);
  if (!vehicle) return 0;
  
  let maxOdo = parseFloat(vehicle.odo) || 0;
  if (trips && trips.length > 0) {
    const vehicleTrips = trips.filter(t => t.vehicleId === vehicleId);
    vehicleTrips.forEach(t => {
      const end = parseFloat(t.endOdometer) || 0;
      if (end > maxOdo) maxOdo = end;
    });
  }
  return maxOdo;
}

/**
 * Compiles distance, fuel, and meal quantities details for a single trip
 */
export function calculateTripMetrics(trip, customers, settings) {
  const start = parseFloat(trip.startOdometer) || 0;
  const end = parseFloat(trip.endOdometer) || 0;
  const distance = Math.max(0, end - start);
  
  const fuelCostPerKm = parseFloat(settings.fuelCostPerKm) || 10;
  const fuelCost = distance * fuelCostPerKm;
  
  const customerIds = trip.customerIds || [];
  const customersCount = customerIds.length;
  const costPerDelivery = customersCount > 0 ? fuelCost / customersCount : 0;
  
  let mealsCount = 0;
  customerIds.forEach(custId => {
    const c = customers.find(item => item.id === custId);
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
    mealsCount
  };
}

/**
 * Gathers summary statistics for a vehicle across different periods (Today, Yesterday, Month)
 */
export function getVehicleStats(vehicleId, vehicles, trips, todayDateStr, settings, staffList, customers) {
  const vehicle = vehicles.find(v => v.id === vehicleId);
  if (!vehicle) return null;
  
  const vTrips = trips.filter(t => t.vehicleId === vehicleId);
  
  const yesterday = parseLocalDate(todayDateStr);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatLocalDate(yesterday);
  const currentMonthStr = todayDateStr.substring(0, 7); // YYYY-MM
  
  const todayTrips = vTrips.filter(t => t.date === todayDateStr).sort((a,b) => (parseInt(a.tripNumber) || 0) - (parseInt(b.tripNumber) || 0));
  const yesterdayTrips = vTrips.filter(t => t.date === yesterdayStr).sort((a,b) => (parseInt(a.tripNumber) || 0) - (parseInt(b.tripNumber) || 0));
  const monthlyTrips = vTrips.filter(t => t.date && t.date.startsWith(currentMonthStr)).sort((a,b) => a.date.localeCompare(b.date) || (parseInt(a.tripNumber) || 0) - (parseInt(b.tripNumber) || 0));
  
  let totalKm = 0;
  let totalFuel = 0;
  let totalDeliveries = 0;
  
  vTrips.forEach(t => {
    const metrics = calculateTripMetrics(t, customers, settings);
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
}
