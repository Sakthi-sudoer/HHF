// 🌟 OFFLINE LOCALSTORAGE CACHE MANAGER MODULE

const PREFIX = 'hh_ent_v9_';

export const KEYS = {
  CUSTOMERS: PREFIX + 'customers',
  LEAVES: PREFIX + 'leaves',
  EXPENSES: PREFIX + 'expenses',
  STAFF: PREFIX + 'staffs',
  VEHICLES: PREFIX + 'vehicles',
  TRIPS: PREFIX + 'trips',
  DELIVERIES: PREFIX + 'deliveries_day_', // dynamic suffix YYYY-MM-DD
  SKIPS: PREFIX + 'skips',
  ALTERNATES: PREFIX + 'alternates',
  SETTINGS: PREFIX + 'settings_general',
  LANGUAGE: PREFIX + 'lang'
};

/**
 * Gets a cached item
 * @param {string} key 
 * @param {*} defaultValue 
 * @returns {*}
 */
export function getCached(key, defaultValue = null) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (e) {
    console.error("Cache read error for key", key, e);
    return defaultValue;
  }
}

/**
 * Caches an item
 * @param {string} key 
 * @param {*} value 
 */
export function setCached(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("Cache write error for key", key, e);
  }
}

/**
 * Clears cached item
 * @param {string} key 
 */
export function clearCached(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error("Cache remove error for key", key, e);
  }
}

/**
 * Backs up all in-memory arrays to local storage for offline recovery
 * @param {Object} state 
 */
export function saveAllOfflineBackup(state) {
  if (state.customers) setCached(KEYS.CUSTOMERS, state.customers);
  if (state.leaves) setCached(KEYS.LEAVES, state.leaves);
  if (state.expenses) setCached(KEYS.EXPENSES, state.expenses);
  if (state.staffList) setCached(KEYS.STAFF, state.staffList);
  if (state.vehicles) setCached(KEYS.VEHICLES, state.vehicles);
  if (state.trips) setCached(KEYS.TRIPS, state.trips);
  if (state.skips) setCached(KEYS.SKIPS, state.skips);
  if (state.alternateDays) setCached(KEYS.ALTERNATES, state.alternateDays);
  if (state.settings) setCached(KEYS.SETTINGS, state.settings);
  if (state.todayDateStr && state.deliveryStatus) {
    setCached(KEYS.DELIVERIES + state.todayDateStr, state.deliveryStatus);
  }
}
