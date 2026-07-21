// 🌟 AI CHAT ASSISTANT FIRESTORE & STORAGE ADAPTER
// Manages the Gemini API developer key.

const KEY_NAME = 'hh_gemini_api_key';

/**
 * Retrieves the saved Gemini API key
 * @returns {string}
 */
export function getGeminiAPIKey() {
  return localStorage.getItem(KEY_NAME) || '';
}

/**
 * Saves the Gemini API key
 * @param {string} key 
 */
export function saveGeminiAPIKey(key) {
  localStorage.setItem(KEY_NAME, key.trim());
}
