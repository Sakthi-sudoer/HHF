// 🌟 TIMEZONE-SAFE LOCAL DATE UTILITIES & SHARED BUSINESS MATH MODULE

/**
 * Parses YYYY-MM-DD string into a timezone-safe local Date object
 * @param {string} dateStr 
 * @returns {Date|null}
 */
export function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return new Date(dateStr);
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

/**
 * Formats a Date object into local YYYY-MM-DD string format
 * @param {Date} date 
 * @returns {string}
 */
export function formatLocalDate(date) {
  if (!date || isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns Swedish representation date (equivalent format YYYY-MM-DD)
 * @param {Date} date 
 * @returns {string}
 */
export function getSwedishDateString(date) {
  return formatLocalDate(date);
}

import { dataRegistry } from "./accessors.js";

/**
 * Calculates a subscription end date (skipping Sundays unless Sunday delivery is enabled)
 * @param {string} startDateStr 
 * @param {boolean} is6Days (true for 6-day trial/weekly plans, false for 26-day monthly plans)
 * @returns {string}
 */
export function calculateEndDate(startDateStr, is6Days) {
  if (!startDateStr) return '';
  let current = parseLocalDate(startDateStr);
  if (!current || isNaN(current.getTime())) return '';
  
  let added = (!isSunday(current)) ? 1 : 0;
  const daysToDeliver = is6Days ? 6 : 26;
  
  while (added < daysToDeliver) {
    current.setDate(current.getDate() + 1);
    if (!isSunday(current)) {
      added++;
    }
  }
  return formatLocalDate(current);
}

/**
 * Checks if a date falls on a Sunday (returns false if deliverOnSundays is active in settings)
 * @param {Date|string} date 
 * @returns {boolean}
 */
export function isSunday(date) {
  const settings = dataRegistry.getSettings ? dataRegistry.getSettings() : {};
  const deliverOnSundays = settings.deliverOnSundays === true || settings.deliverOnSundays === 'true';
  if (deliverOnSundays) return false;

  const d = typeof date === 'string' ? parseLocalDate(date) : date;
  return d ? d.getDay() === 0 : false;
}


/**
 * Formats a 24-hour HH:MM time string into a 12-hour AM/PM format
 * @param {string} timeStr 
 * @returns {string}
 */
export function formatTimeString(timeStr) {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0]);
  const minutes = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  return `${hours}:${minutes} ${ampm}`;
}

/**
 * Formats number as Indian Rupees (INR)
 * @param {number} amount 
 * @returns {string}
 */
export function formatCurrency(amount) {
  const parsed = parseFloat(amount) || 0;
  return '₹' + parsed.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  });
}
