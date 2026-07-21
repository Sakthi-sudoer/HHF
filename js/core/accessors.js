// 🌟 CROSS-DOMAIN DATA ACCESSORS BRIDGE
// Prevents direct dependencies between different business domains.

let customers = [];
let leaves = [];
let skips = [];
let alternates = [];
let staffList = [];
let vehicles = [];
let trips = [];
let expenses = [];
let settings = {};
let deliveryStatus = {}; // day-specific deliveries

// Logic callback pointers
let isCustomerOnLeaveFn = () => false;
let isMealSkippedFn = () => false;
let isLeaveCompensatedFn = () => false;

// Database write hook pointers
let dbSaveCustomerFn = async () => {};
let dbSaveLeaveFn = async () => {};
let dbSaveSkipFn = async () => {};
let dbSaveAlternateFn = async () => {};
let dbSaveDeliveryStatusFn = async () => {};

export const dataRegistry = {
  getCustomers: () => customers,
  setCustomers: (list) => { customers = list; },

  getLeaves: () => leaves,
  setLeaves: (list) => { leaves = list; },

  getSkips: () => skips,
  setSkips: (list) => { skips = list; },

  getAlternates: () => alternates,
  setAlternates: (list) => { alternates = list; },

  getStaff: () => staffList,
  setStaff: (list) => { staffList = list; },

  getVehicles: () => vehicles,
  setVehicles: (list) => { vehicles = list; },

  getTrips: () => trips,
  setTrips: (list) => { trips = list; },

  getExpenses: () => expenses,
  setExpenses: (list) => { expenses = list; },

  getSettings: () => settings,
  setSettings: (map) => { settings = map; },

  getDeliveries: () => deliveryStatus,
  setDeliveries: (map) => { deliveryStatus = map; },

  // Logic functions
  isCustomerOnLeave: (custId, dateStr) => isCustomerOnLeaveFn(custId, dateStr),
  registerIsCustomerOnLeave: (fn) => { isCustomerOnLeaveFn = fn; },

  isMealSkipped: (custId, dateStr, meal) => isMealSkippedFn(custId, dateStr, meal),
  registerIsMealSkipped: (fn) => { isMealSkippedFn = fn; },

  isLeaveCompensated: (custId, originalDateStr) => isLeaveCompensatedFn(custId, originalDateStr),
  registerIsLeaveCompensated: (fn) => { isLeaveCompensatedFn = fn; },

  // DB Write Hooks
  dbSaveCustomer: async (obj) => { await dbSaveCustomerFn(obj); },
  registerDbSaveCustomer: (fn) => { dbSaveCustomerFn = fn; },

  dbSaveLeave: async (obj) => { await dbSaveLeaveFn(obj); },
  registerDbSaveLeave: (fn) => { dbSaveLeaveFn = fn; },

  dbSaveSkip: async (obj) => { await dbSaveSkipFn(obj); },
  registerDbSaveSkip: (fn) => { dbSaveSkipFn = fn; },

  dbSaveAlternate: async (obj) => { await dbSaveAlternateFn(obj); },
  registerDbSaveAlternate: (fn) => { dbSaveAlternateFn = fn; },

  dbSaveDeliveryStatus: async (dateStr, statusObj) => { await dbSaveDeliveryStatusFn(dateStr, statusObj); },
  registerDbSaveDeliveryStatus: (fn) => { dbSaveDeliveryStatusFn = fn; }
};
