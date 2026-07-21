// 🌟 FIREBASE & FIRESTORE DATABASE SYNCHRONIZATION MODULE

// 1. Firebase configuration (Production Project - hhfoods-3ab9b)
const firebaseConfig = {
    apiKey: "AIzaSyCzYfDtoOjLumIwT8xXxMoLHlnfpbLkqC8",
    authDomain: "hhfoods-3ab9b.firebaseapp.com",
    projectId: "hhfoods-3ab9b",
    storageBucket: "hhfoods-3ab9b.firebasestorage.app",
    messagingSenderId: "211209874774",
    appId: "1:211209874774:web:b30d04a5b0beb4b9c97af7",
    measurementId: "G-PRNSFFYLZQ"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// Enable offline data persistence for robust offline support
db.enablePersistence().catch(err => {
    if (err.code == 'failed-precondition') {
        console.warn("Firestore offline persistence: Multiple tabs open, persistence enabled in first tab only.");
    } else if (err.code == 'unimplemented') {
        console.warn("Firestore offline persistence: Browser does not support persistence.");
    }
});

// 2. LocalStorage Cache Keys for Backup Fallback
const KEY_CUST = 'hh_cust_enterprise_v8';
const KEY_LEAVES = 'hh_leaves_enterprise_v8';
const KEY_MENU = 'hh_menu_enterprise_v8';
const KEY_EXP = 'hh_exp_enterprise_v8';
const KEY_STAFF = 'hh_staff_enterprise_v8';
const KEY_SKIPS = 'hh_skips_enterprise_v8';
const KEY_ALTS = 'hh_alts_enterprise_v8';
const KEY_VEHICLES = 'hh_vehicles_enterprise_v8';
const KEY_TRIPS = 'hh_trips_enterprise_v8';

// Initialize global state arrays from Cache or empty if not yet loaded
window.customers = JSON.parse(localStorage.getItem(KEY_CUST) || '[]');
window.leaves = JSON.parse(localStorage.getItem(KEY_LEAVES) || '[]');
window.menuPlan = JSON.parse(localStorage.getItem(KEY_MENU) || '[]');
window.expenses = JSON.parse(localStorage.getItem(KEY_EXP) || '[]');
window.staffList = JSON.parse(localStorage.getItem(KEY_STAFF) || '[]');
window.skips = JSON.parse(localStorage.getItem(KEY_SKIPS) || '[]');
window.alternateDays = JSON.parse(localStorage.getItem(KEY_ALTS) || '[]');
window.vehicles = JSON.parse(localStorage.getItem(KEY_VEHICLES) || '[]');
window.trips = JSON.parse(localStorage.getItem(KEY_TRIPS) || '[]');

const KEY_SETTINGS = 'hh_settings_enterprise_v8';
const defaultSettings = {
    bizName: "Healthy Home's Foods",
    bizSubtitle: "மந்த்லி கணக்கு மற்றும் டியூ டிராக்கர்",
    gpayNumber: "7868888625",
    gpayName: "Rajarajeshwari",
    priceMonthly: 5800,
    priceTrial: 1200,
    deductMonthly: 220,
    deductTrial: 200,
    whatsappTemplate: "வணக்கம் {name}, உங்களின் நிலுவைத் தொகை ₹{balance} ஆகும். நன்றி!",
    adminPassword: "1234",
    fuelCostPerKm: 10
};
window.appSettings = JSON.parse(localStorage.getItem(KEY_SETTINGS)) || {...defaultSettings};

// Today's Date representation (calculated dynamically on page load in app.js)
window.todayDateStr = new Date().toLocaleDateString('sv').substring(0, 10); // YYYY-MM-DD
window.deliveryStatus = JSON.parse(localStorage.getItem('hh_deliveries_v8_' + window.todayDateStr)) || {};

// Recalculate all end dates dynamically in memory
window.recalculateAllEndDates = function() {
    if (window.customers && typeof recalculateCustomerEndDate === 'function') {
        window.customers.forEach(c => {
            try {
                c.end = recalculateCustomerEndDate(c);
            } catch (e) {
                console.error("Error in recalculateCustomerEndDate for", c.id, e);
            }
        });
    }
};

// Debounced UI Refresh mechanism
let uiRenderTimeout;
function requestUIRefresh() {
    clearTimeout(uiRenderTimeout);
    uiRenderTimeout = setTimeout(() => {
        window.recalculateAllEndDates();
        if (typeof window.renderAll === 'function') {
            window.renderAll();
        }
    }, 50);
}

// Backup current state to LocalStorage (as offline recovery layer)
function saveAllToLocalStorageBackup() {
    localStorage.setItem(KEY_CUST, JSON.stringify(window.customers));
    localStorage.setItem(KEY_LEAVES, JSON.stringify(window.leaves));
    localStorage.setItem(KEY_MENU, JSON.stringify(window.menuPlan));
    localStorage.setItem(KEY_EXP, JSON.stringify(window.expenses));
    localStorage.setItem(KEY_STAFF, JSON.stringify(window.staffList));
    localStorage.setItem(KEY_SKIPS, JSON.stringify(window.skips));
    localStorage.setItem(KEY_ALTS, JSON.stringify(window.alternateDays));
    localStorage.setItem(KEY_VEHICLES, JSON.stringify(window.vehicles));
    localStorage.setItem(KEY_TRIPS, JSON.stringify(window.trips));
    localStorage.setItem('hh_deliveries_v8_' + window.todayDateStr, JSON.stringify(window.deliveryStatus));
}

// 3. Setup Real-time Listeners for Firestore Collections
function initRealtimeSync() {
    // Customers Listener
    db.collection("customers").onSnapshot(snapshot => {
        const list = [];
        snapshot.forEach(doc => list.push(doc.data()));
        window.customers = list;
        localStorage.setItem(KEY_CUST, JSON.stringify(list));
        if (typeof window.hhDebugSnapshotUpdate === 'function') window.hhDebugSnapshotUpdate('customers', list.length, null);
        requestUIRefresh();
    }, error => {
        console.error("Customers Sync Error:", error);
        if (typeof window.hhDebugSnapshotUpdate === 'function') window.hhDebugSnapshotUpdate('customers', 0, error.message);
    });

    // Leaves Listener
    db.collection("leaves").onSnapshot(snapshot => {
        const list = [];
        snapshot.forEach(doc => list.push(doc.data()));
        window.leaves = list;
        localStorage.setItem(KEY_LEAVES, JSON.stringify(list));
        if (typeof window.hhDebugSnapshotUpdate === 'function') window.hhDebugSnapshotUpdate('leaves', list.length, null);
        requestUIRefresh();
    }, error => {
        console.error("Leaves Sync Error:", error);
        if (typeof window.hhDebugSnapshotUpdate === 'function') window.hhDebugSnapshotUpdate('leaves', 0, error.message);
    });

    // Expenses Listener
    db.collection("expenses").onSnapshot(snapshot => {
        const list = [];
        snapshot.forEach(doc => list.push(doc.data()));
        window.expenses = list;
        localStorage.setItem(KEY_EXP, JSON.stringify(list));
        if (typeof window.hhDebugSnapshotUpdate === 'function') window.hhDebugSnapshotUpdate('expenses', list.length, null);
        requestUIRefresh();
    }, error => {
        console.error("Expenses Sync Error:", error);
        if (typeof window.hhDebugSnapshotUpdate === 'function') window.hhDebugSnapshotUpdate('expenses', 0, error.message);
    });

    // Staff Listener
    db.collection("staffs").onSnapshot(snapshot => {
        const list = [];
        snapshot.forEach(doc => list.push(doc.data()));
        window.staffList = list;
        localStorage.setItem(KEY_STAFF, JSON.stringify(list));
        if (typeof window.hhDebugSnapshotUpdate === 'function') window.hhDebugSnapshotUpdate('staff', list.length, null);
        requestUIRefresh();
    }, error => {
        console.error("Staff Sync Error:", error);
        if (typeof window.hhDebugSnapshotUpdate === 'function') window.hhDebugSnapshotUpdate('staff', 0, error.message);
    });

    // Vehicles Listener
    db.collection("vehicles").onSnapshot(snapshot => {
        const list = [];
        snapshot.forEach(doc => list.push(doc.data()));
        window.vehicles = list;
        localStorage.setItem(KEY_VEHICLES, JSON.stringify(list));
        if (typeof window.hhDebugSnapshotUpdate === 'function') window.hhDebugSnapshotUpdate('vehicles', list.length, null);
        requestUIRefresh();
    }, error => {
        console.error("Vehicles Sync Error:", error);
        if (typeof window.hhDebugSnapshotUpdate === 'function') window.hhDebugSnapshotUpdate('vehicles', 0, error.message);
    });

    // Trips Listener
    db.collection("trips").onSnapshot(snapshot => {
        const list = [];
        snapshot.forEach(doc => list.push(doc.data()));
        window.trips = list;
        localStorage.setItem(KEY_TRIPS, JSON.stringify(list));
        if (typeof window.hhDebugSnapshotUpdate === 'function') window.hhDebugSnapshotUpdate('trips', list.length, null);
        requestUIRefresh();
    }, error => {
        console.error("Trips Sync Error:", error);
        if (typeof window.hhDebugSnapshotUpdate === 'function') window.hhDebugSnapshotUpdate('trips', 0, error.message);
    });

    // Active deliveries check-off status listener for today
    db.collection("deliveries").doc(window.todayDateStr).onSnapshot(doc => {
        if (doc.exists) {
            window.deliveryStatus = doc.data() || {};
        } else {
            window.deliveryStatus = {};
        }
        localStorage.setItem('hh_deliveries_v8_' + window.todayDateStr, JSON.stringify(window.deliveryStatus));
        if (window.plannerDateStr === window.todayDateStr) {
            window.plannerDeliveryStatus = window.deliveryStatus;
        }
        requestUIRefresh();
    }, error => console.error("Deliveries Sync Error:", error));

    // Skips Listener
    db.collection("skips").onSnapshot(snapshot => {
        const list = [];
        snapshot.forEach(doc => list.push(doc.data()));
        window.skips = list;
        localStorage.setItem(KEY_SKIPS, JSON.stringify(list));
        if (typeof window.hhDebugSnapshotUpdate === 'function') window.hhDebugSnapshotUpdate('skips', list.length, null);
        requestUIRefresh();
    }, error => console.error("Skips Sync Error:", error));

    // Alternates Listener
    db.collection("alternates").onSnapshot(snapshot => {
        const list = [];
        snapshot.forEach(doc => list.push(doc.data()));
        window.alternateDays = list;
        localStorage.setItem(KEY_ALTS, JSON.stringify(list));
        console.log("Firestore sync: Alternates list updated", list.length);
        requestUIRefresh();
    }, error => console.error("Alternates Sync Error:", error));

    // Settings Listener
    db.collection("settings").doc("general").onSnapshot(doc => {
        if (doc.exists) {
            window.appSettings = { ...defaultSettings, ...doc.data() };
            localStorage.setItem(KEY_SETTINGS, JSON.stringify(window.appSettings));
            console.log("Firestore sync: Settings updated");
            if (typeof applyGlobalSettings === 'function') {
                applyGlobalSettings();
            }
        } else {
            db.collection("settings").doc("general").set(window.appSettings);
        }
    }, error => console.error("Settings Sync Error:", error));
}

// 4. Asynchronous Database CRUD Write Methods
async function dbSaveCustomer(obj) {
    try {
        await db.collection("customers").doc(obj.id).set(obj);
        return true;
    } catch (error) {
        console.error("Save customer error:", error);
        throw error;
    }
}

async function dbDeleteCustomer(id) {
    try {
        await db.collection("customers").doc(id).delete();
        return true;
    } catch (error) {
        console.error("Delete customer error:", error);
        throw error;
    }
}

async function dbSaveLeave(leaveObj) {
    try {
        await db.collection("leaves").doc(leaveObj.id).set(leaveObj);
        return true;
    } catch (error) {
        console.error("Save leave error:", error);
        throw error;
    }
}

async function dbDeleteLeave(id) {
    try {
        await db.collection("leaves").doc(id).delete();
        return true;
    } catch (error) {
        console.error("Delete leave error:", error);
        throw error;
    }
}

async function dbSaveExpense(expenseObj) {
    try {
        await db.collection("expenses").doc(expenseObj.id).set(expenseObj);
        return true;
    } catch (error) {
        console.error("Save expense error:", error);
        throw error;
    }
}

async function dbDeleteExpense(id) {
    try {
        await db.collection("expenses").doc(id).delete();
        return true;
    } catch (error) {
        console.error("Delete expense error:", error);
        throw error;
    }
}

async function dbSaveStaff(staffObj) {
    try {
        await db.collection("staffs").doc(staffObj.id).set(staffObj);
        return true;
    } catch (error) {
        console.error("Save staff error:", error);
        throw error;
    }
}

async function dbDeleteStaff(id) {
    try {
        await db.collection("staffs").doc(id).delete();
        return true;
    } catch (error) {
        console.error("Delete staff error:", error);
        throw error;
    }
}

async function dbSaveDeliveryStatus(dateStr, statusObj) {
    try {
        await db.collection("deliveries").doc(dateStr).set(statusObj);
        return true;
    } catch (error) {
        console.error("Save delivery status error:", error);
        throw error;
    }
}

async function dbSaveSkip(skipObj) {
    try {
        await db.collection("skips").doc(skipObj.id).set(skipObj);
        return true;
    } catch (error) {
        console.error("Save skip error:", error);
        throw error;
    }
}

async function dbDeleteSkip(id) {
    try {
        await db.collection("skips").doc(id).delete();
        return true;
    } catch (error) {
        console.error("Delete skip error:", error);
        throw error;
    }
}

async function dbSaveAlternate(altObj) {
    try {
        await db.collection("alternates").doc(altObj.id).set(altObj);
        return true;
    } catch (error) {
        console.error("Save alternate error:", error);
        throw error;
    }
}

async function dbDeleteAlternate(id) {
    try {
        await db.collection("alternates").doc(id).delete();
        return true;
    } catch (error) {
        console.error("Delete alternate error:", error);
        throw error;
    }
}

async function dbSaveSettings(settingsObj) {
    try {
        await db.collection("settings").doc("general").set(settingsObj);
        return true;
    } catch (error) {
        console.error("Save settings error:", error);
        throw error;
    }
}

async function dbSaveVehicle(obj) {
    try {
        await db.collection("vehicles").doc(obj.id).set(obj);
        return true;
    } catch (error) {
        console.error("Save vehicle error:", error);
        throw error;
    }
}

async function dbDeleteVehicle(id) {
    try {
        await db.collection("vehicles").doc(id).delete();
        return true;
    } catch (error) {
        console.error("Delete vehicle error:", error);
        throw error;
    }
}

async function dbSaveTrip(obj) {
    try {
        await db.collection("trips").doc(obj.id).set(obj);
        return true;
    } catch (error) {
        console.error("Save trip error:", error);
        throw error;
    }
}

async function dbDeleteTrip(id) {
    try {
        await db.collection("trips").doc(id).delete();
        return true;
    } catch (error) {
        console.error("Delete trip error:", error);
        throw error;
    }
}
