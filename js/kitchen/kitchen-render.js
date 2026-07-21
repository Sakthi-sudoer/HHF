// 🌟 KITCHEN RENDERING ENGINE & TIMER CONTROLLER
import { t } from "../core/i18n.js";
import { dataRegistry } from "../core/accessors.js";
import { formatLocalDate } from "../core/shared-utils.js";
import { dbSaveKitchenPortionSettings } from "./kitchen-firestore.js";
import { getKitchenGroceryDemands, getPortionsForecast } from "./kitchen-logic.js";

// Kitchen Timer state variables
let timerInterval = null;
let timerSecondsRemaining = 0;
let isTimerPaused = true;
let audioContext = null;

/**
 * Initializes and draws the kitchen demand calculations panel
 */
export function renderKitchenView() {
  const settings = dataRegistry.getSettings() || {};
  const customers = dataRegistry.getCustomers() || [];
  
  // Set portion size form inputs from settings (with standard defaults)
  const riceInput = document.getElementById('portion-rice');
  const dalInput = document.getElementById('portion-dal');
  const vegInput = document.getElementById('portion-veg');
  const oilInput = document.getElementById('portion-oil');

  if (riceInput && !riceInput.dataset.loaded) {
    riceInput.value = settings.portionRice || 120;
    riceInput.dataset.loaded = "true";
  }
  if (dalInput && !dalInput.dataset.loaded) {
    dalInput.value = settings.portionDal || 30;
    dalInput.dataset.loaded = "true";
  }
  if (vegInput && !vegInput.dataset.loaded) {
    vegInput.value = settings.portionVeg || 100;
    vegInput.dataset.loaded = "true";
  }
  if (oilInput && !oilInput.dataset.loaded) {
    oilInput.value = settings.portionOil || 15;
    oilInput.dataset.loaded = "true";
  }

  const portions = {
    rice: parseFloat(riceInput ? riceInput.value : 120) || 120,
    dal: parseFloat(dalInput ? dalInput.value : 30) || 30,
    veg: parseFloat(vegInput ? vegInput.value : 100) || 100,
    oil: parseFloat(oilInput ? oilInput.value : 15) || 15
  };

  const todayStr = formatLocalDate(new Date());
  
  // 1. Calculate today's grocery demands
  const demands = getKitchenGroceryDemands(customers, todayStr, portions);
  
  // Update Portion metrics
  const breakfastCountEl = document.getElementById('kit-count-breakfast');
  const lunchCountEl = document.getElementById('kit-count-lunch');
  const dinnerCountEl = document.getElementById('kit-count-dinner');

  if (breakfastCountEl) breakfastCountEl.textContent = `${demands.mealsCount.B} Portions`;
  if (lunchCountEl) lunchCountEl.textContent = `${demands.mealsCount.L} Portions`;
  if (dinnerCountEl) dinnerCountEl.textContent = `${demands.mealsCount.D} Portions`;

  // Update Weight totals
  const sumRiceEl = document.getElementById('kit-sum-rice');
  const sumDalEl = document.getElementById('kit-sum-dal');
  const sumVegEl = document.getElementById('kit-sum-veg');
  const sumOilEl = document.getElementById('kit-sum-oil');

  if (sumRiceEl) sumRiceEl.textContent = `${demands.groceryTotals.rice.toFixed(2)} kg`;
  if (sumDalEl) sumDalEl.textContent = `${demands.groceryTotals.dal.toFixed(2)} kg`;
  if (sumVegEl) sumVegEl.textContent = `${demands.groceryTotals.veg.toFixed(2)} kg`;
  if (sumOilEl) sumOilEl.textContent = `${demands.groceryTotals.oil.toFixed(2)} Litres`;

  // 2. Tomorrow's forecast
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatLocalDate(tomorrow);

  const forecast = getPortionsForecast(customers, tomorrowStr);
  const forecastBEl = document.getElementById('kit-forecast-b');
  const forecastLEl = document.getElementById('kit-forecast-l');
  const forecastDEl = document.getElementById('kit-forecast-d');

  if (forecastBEl) forecastBEl.textContent = `${forecast.B} Portions`;
  if (forecastLEl) forecastLEl.textContent = `${forecast.L} Portions`;
  if (forecastDEl) forecastDEl.textContent = `${forecast.D} Portions`;
}

/**
 * Commits the modified portion preferences back to Firestore Settings
 */
export async function savePortionSettings() {
  const settings = dataRegistry.getSettings() || {};
  
  settings.portionRice = parseFloat(document.getElementById('portion-rice').value) || 120;
  settings.portionDal = parseFloat(document.getElementById('portion-dal').value) || 30;
  settings.portionVeg = parseFloat(document.getElementById('portion-veg').value) || 100;
  settings.portionOil = parseFloat(document.getElementById('portion-oil').value) || 15;

  try {
    await dbSaveKitchenPortionSettings(settings);
    renderKitchenView();
  } catch (err) {
    console.error("Failed to sync portions preference settings", err);
  }
}

// ==========================================
// 🍳 KITCHEN TIMER CONTROL UTILITIES
// ==========================================

function playBeep() {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    osc.frequency.value = 880; // High pitch A pitch
    gain.gain.setValueAtTime(1, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
    
    osc.start();
    osc.stop(audioContext.currentTime + 0.5);
  } catch (e) {
    console.warn("Audio beeping alert blocked by browser autoplay configurations.", e);
  }
}

function updateTimerUI() {
  const display = document.getElementById('timer-display');
  if (!display) return;
  
  const m = Math.floor(timerSecondsRemaining / 60);
  const s = timerSecondsRemaining % 60;
  
  display.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function setTimerPreset(minutes) {
  pauseTimer();
  timerSecondsRemaining = minutes * 60;
  updateTimerUI();
}

export function setTimerCustom() {
  const minVal = parseInt(prompt(t('kitchen.timerCustom'), "10"));
  if (!isNaN(minVal) && minVal > 0) {
    setTimerPreset(minVal);
  }
}

export function startTimer() {
  if (!isTimerPaused) return;
  isTimerPaused = false;
  
  timerInterval = setInterval(() => {
    if (timerSecondsRemaining > 0) {
      timerSecondsRemaining--;
      updateTimerUI();
      if (timerSecondsRemaining === 0) {
        clearInterval(timerInterval);
        isTimerPaused = true;
        playBeep();
        alert("Kitchen Timer Alarm!");
      }
    }
  }, 1000);
}

export function pauseTimer() {
  isTimerPaused = true;
  clearInterval(timerInterval);
}

export function resetTimer() {
  pauseTimer();
  timerSecondsRemaining = 0;
  updateTimerUI();
}

// Hookup to window namespace
window.appKitchen = {
  render: renderKitchenView,
  savePortions: savePortionSettings,
  setPreset: setTimerPreset,
  setCustom: setTimerCustom,
  start: startTimer,
  pause: pauseTimer,
  reset: resetTimer
};
