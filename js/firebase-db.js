// 🌟 FIREBASE & FIRESTORE DATABASE SYNCHRONIZATION MODULE

// 1. Firebase configuration (Default placeholder from healthy.html)
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

// Initialize global state arrays from Cache or empty if not yet loaded
window.customers = JSON.parse(localStorage.getItem(KEY_CUST) || '[]');
window.leaves = JSON.parse(localStorage.getItem(KEY_LEAVES) || '[]');
window.menuPlan = JSON.parse(localStorage.getItem(KEY_MENU) || '[]');
window.expenses = JSON.parse(localStorage.getItem(KEY_EXP) || '[]');
window.staffList = JSON.parse(localStorage.getItem(KEY_STAFF) || '[]');
window.skips = JSON.parse(localStorage.getItem(KEY_SKIPS) || '[]');

// Today's Date representation (calculated dynamically on page load in app.js)
window.todayDateStr = new Date().toLocaleDateString('sv').substring(0, 10); // YYYY-MM-DD
window.deliveryStatus = JSON.parse(localStorage.getItem('hh_deliveries_v8_' + window.todayDateStr)) || {};

// Recalculate all end dates dynamically in memory
window.recalculateAllEndDates = function() {
    if (window.customers && typeof recalculateCustomerEndDate === 'function') {
        window.customers.forEach(c => {
            c.end = recalculateCustomerEndDate(c);
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
        console.log("Firestore sync: Customers updated", list.length);
        requestUIRefresh();
    }, error => console.error("Customers Sync Error:", error));

    // Leaves Listener
    db.collection("leaves").onSnapshot(snapshot => {
        const list = [];
        snapshot.forEach(doc => list.push(doc.data()));
        window.leaves = list;
        localStorage.setItem(KEY_LEAVES, JSON.stringify(list));
        console.log("Firestore sync: Leaves updated", list.length);
        requestUIRefresh();
    }, error => console.error("Leaves Sync Error:", error));

    // Expenses Listener
    db.collection("expenses").onSnapshot(snapshot => {
        const list = [];
        snapshot.forEach(doc => list.push(doc.data()));
        window.expenses = list;
        localStorage.setItem(KEY_EXP, JSON.stringify(list));
        console.log("Firestore sync: Expenses updated", list.length);
        requestUIRefresh();
    }, error => console.error("Expenses Sync Error:", error));

    // Staff Listener
    db.collection("staffs").onSnapshot(snapshot => {
        const list = [];
        snapshot.forEach(doc => list.push(doc.data()));
        window.staffList = list;
        localStorage.setItem(KEY_STAFF, JSON.stringify(list));
        console.log("Firestore sync: Staff list updated", list.length);
        requestUIRefresh();
    }, error => console.error("Staff Sync Error:", error));

    // Active deliveries check-off status listener for today
    db.collection("deliveries").doc(window.todayDateStr).onSnapshot(doc => {
        if (doc.exists) {
            window.deliveryStatus = doc.data() || {};
        } else {
            window.deliveryStatus = {};
        }
        localStorage.setItem('hh_deliveries_v8_' + window.todayDateStr, JSON.stringify(window.deliveryStatus));
        console.log("Firestore sync: Deliveries checked status updated");
        requestUIRefresh();
    }, error => console.error("Deliveries Sync Error:", error));

    // Skips Listener
    db.collection("skips").onSnapshot(snapshot => {
        const list = [];
        snapshot.forEach(doc => list.push(doc.data()));
        window.skips = list;
        localStorage.setItem(KEY_SKIPS, JSON.stringify(list));
        console.log("Firestore sync: Skips list updated", list.length);
        requestUIRefresh();
    }, error => console.error("Skips Sync Error:", error));
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
