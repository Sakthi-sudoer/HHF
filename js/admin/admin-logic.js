// 🌟 ADMIN CONTROL BUSINESS LOGIC MODULE

/**
 * Validates and converts spreadsheet cell values to correct datatypes based on the domain schema
 * @param {string} tabId ('customers' | 'kitchen' | 'leaves' | 'skips' | 'staff')
 * @param {Object} originalRow 
 * @param {string} field 
 * @param {string} rawValue 
 * @returns {Object} Updated document payload
 */
export function parseSpreadsheetCellUpdate(tabId, originalRow, field, rawValue) {
  const updated = { ...originalRow };
  const cleanVal = String(rawValue).trim();

  if (tabId === 'customers') {
    switch (field) {
      case 'cost':
      case 'paid':
        updated[field] = Math.max(0, parseFloat(cleanVal) || 0);
        break;
      case 'breakfastQty':
      case 'lunchQty':
      case 'dinnerQty':
        updated[field] = Math.max(1, parseInt(cleanVal) || 1);
        break;
      case 'breakfast':
      case 'lunch':
      case 'dinner':
      case 'isTrial':
        updated[field] = cleanVal.toLowerCase() === 'true' || cleanVal === '1';
        break;
      default:
        updated[field] = cleanVal;
    }
  } 
  else if (tabId === 'kitchen') { // kitchen category is mapped to expenses
    switch (field) {
      case 'amount':
        updated[field] = Math.max(0, parseFloat(cleanVal) || 0);
        break;
      default:
        updated[field] = cleanVal;
    }
  }
  else if (tabId === 'leaves') {
    updated[field] = cleanVal;
  }
  else if (tabId === 'skips') {
    updated[field] = cleanVal;
  }
  else if (tabId === 'staff') {
    updated[field] = cleanVal;
  }

  return updated;
}

/**
 * Validates role-change requests
 * @param {string} email 
 * @param {string} targetRole 
 * @returns {Object} Payload for Firestore user update
 */
export function buildUserRolePayload(email, targetRole) {
  const allowed = ['admin', 'kitchen', 'driver', 'finance'];
  if (!allowed.includes(targetRole)) {
    throw new Error(`Invalid role assignment target: ${targetRole}`);
  }
  return {
    role: targetRole,
    email: email,
    updatedAt: new Date()
  };
}
