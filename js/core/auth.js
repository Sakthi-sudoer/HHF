// 🌟 FIREBASE AUTH BYPASS & FULL ACCESS CONTROL MODULE
// Configured to disable the sign-in modal and grant admin access to all users immediately.

// Mock active user session state
export let currentUser = { 
  email: "admin@hhfoods.com", 
  uid: "admin_bypass_uid" 
};
export let currentUserRole = "admin";

const authChangeListeners = [];

/**
 * Subscribes a listener to auth state changes and triggers it immediately with mock admin
 * @param {Function} callback 
 */
export function onAuthChange(callback) {
  authChangeListeners.push(callback);
  // Instant trigger to boot the app as logged-in admin
  setTimeout(() => {
    callback(currentUser, currentUserRole);
  }, 0);
}

/**
 * Signs in a user (bypass stub)
 */
export async function loginUser(email, password) {
  return true;
}

/**
 * Signs out the active user (bypass stub)
 */
export async function logoutUser() {
  return true;
}

/**
 * Bypasses all tab permission gates, granting full access to everyone
 * @param {string} tabName 
 * @returns {boolean}
 */
export function hasTabAccess(tabName) {
  return true; // Full access to all views
}
