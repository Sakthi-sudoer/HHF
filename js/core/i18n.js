// 🌟 MULTILINGUAL i18n LOCALIZATION CONTROLLER
import { getCached, setCached, KEYS } from "./cache.js";

let translations = {};
export let currentLang = getCached(KEYS.LANGUAGE, 'en');

/**
 * Initializes translations by fetching dictionaries
 */
export async function initTranslations() {
  try {
    const response = await fetch(`./i18n/${currentLang}.json`);
    translations = await response.json();
  } catch (e) {
    console.error("Failed to load translation file", currentLang, e);
  }
}

/**
 * Resolves a dotted-notation key to its localized text (e.g., 'nav.dashboard')
 * @param {string} key 
 * @param {Object} replaces Optional key-value replace map (e.g., { name: 'Arun' })
 * @returns {string}
 */
export function t(key, replaces = null) {
  const parts = key.split('.');
  let current = translations;
  
  for (let part of parts) {
    if (current && current[part] !== undefined) {
      current = current[part];
    } else {
      return key; // Fallback
    }
  }
  
  if (typeof current !== 'string') return key;

  let localized = current;
  if (replaces) {
    Object.keys(replaces).forEach(k => {
      localized = localized.replace(`{${k}}`, replaces[k]);
    });
  }
  return localized;
}

/**
 * Switches the active language, updates storage, and triggers a full page rerender
 */
export async function toggleLanguage() {
  currentLang = currentLang === 'en' ? 'ta' : 'en';
  setCached(KEYS.LANGUAGE, currentLang);
  await initTranslations();
  
  // Update translation attributes
  translatePage();
  
  // Trigger general app layout rerendering
  if (window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: currentLang }));
  }
}

/**
 * Finds all DOM elements with 'data-i18n' attributes and translates them in-place
 */
export function translatePage() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  
  // Inputs placeholders translation
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.setAttribute('placeholder', t(key));
  });

  // ARIA labels translation
  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    const key = el.getAttribute('data-i18n-aria');
    el.setAttribute('aria-label', t(key));
  });
}
