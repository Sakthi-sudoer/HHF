# Running Bug Tracker

This document tracks all bugs identified during the manual verification and stabilization phase.

---

## 🚨 BUG-004 [CRITICAL]: Wrong Firebase Project ID Configured (Corrected)

*   **Module:** Firebase Configuration (`js/firebase-db.js`)
*   **Severity:** CRITICAL — Complete data loss from UI
*   **Root Cause:** A previous automated run incorrectly assumed `healthy-homes-foods` was the production project and `hhfoods-3ab9b` was a wrong/empty project. In fact, `hhfoods-3ab9b` is the user's actual active database containing 21 customers, 13 expenses, 4 staffs, and 2 leaves. Changing the configuration to `healthy-homes-foods` caused the application to sync with a dummy/empty project, hiding all of the user's actual data.
*   **Evidence:** Verified via Firestore REST API that the `hhfoods-3ab9b` project contains the 21 active customer documents and 13 expenses, whereas `healthy-homes-foods` contains only a few stale test entries.
*   **Affected Files:** `js/firebase-db.js`, `js/debug-panel.js`
*   **Fix Applied:** Reverted the Firebase configuration keys in `js/firebase-db.js` and updated the `PROJECT_ID` diagnostic constant in `js/debug-panel.js` back to the active production project `hhfoods-3ab9b`:
    ```javascript
    projectId: "hhfoods-3ab9b"
    apiKey: "AIzaSyCzYfDtoOjLumIwT8xXxMoLHlnfpbLkqC8"
    appId: "1:211209874774:web:b30d04a5b0beb4b9c97af7"
    ```
*   **Verification Status:** ✅ Resolved and Verified (REST API confirmed data matching, local server 200 OK)

---

## BUG-001: Customer Does Not Appear After Save

*   **Module:** Customer Management
*   **Root Cause:** The UI relied exclusively on the Firestore `onSnapshot` latency-compensated event to refresh the display. A synchronization delay between local persistence and the event listener caused the UI to render its stale state before the snapshot array updated.
*   **Affected Files:** `js/app.js`
*   **Fix Applied:** Implemented an "Optimistic UI Update" pattern. The new customer data is manually inserted into the local `window.customers` array and `window.renderAll()` is fired synchronously after the database write succeeds.
*   **Verification Status:** ⏳ Awaiting User Verification

---

## BUG-002: Stray Markdown Text Caused Fatal SyntaxError in ui-render.js

*   **Module:** UI Rendering Engine
*   **Root Cause:** A block of Markdown text and AI commentary was accidentally appended at the end of `js/ui-render.js` (Lines 4114–4120). This caused the browser to throw a global `SyntaxError`, preventing the entire file from parsing. As a result, `renderAll()` was never defined in memory.
*   **Affected Files:** `js/ui-render.js`
*   **Fix Applied:** Deleted the 6 illegal stray lines outside all function scopes at the end of the file.
*   **Why duplicate checking still worked:** Data-layer (`firebase-db.js`) and logic-layer (`app.js`) are separate files that loaded correctly. The duplicate check reads from `window.customers` (healthy), which has no dependency on the render engine.
*   **Verification Status:** ⏳ Awaiting User Verification

---

## BUG-003: Silent Render Failures — Single Try/Catch Aborted Entire UI

*   **Module:** UI Rendering Engine — `renderAll()`
*   **Root Cause:** The entire `renderAll()` body was wrapped in a single `try/catch`. If any one sub-function failed, the catch statement swallowed the error and stopped all subsequent rendering modules from executing.
*   **Affected Files:** `js/ui-render.js`
*   **Fix Applied:** Replaced the single `try/catch` with a per-module `safeRun()` helper. Each rendering function (`renderSummary`, `renderCustomerCards`, etc.) is now individually isolated. If one module fails, execution continues uninterrupted to the next module. All failures are collected and reported to the Debug Panel.
*   **Verification Status:** ⏳ Awaiting User Verification

---

## DEBUG TOOLING ADDED

*   **New File:** `js/debug-panel.js`
*   **Purpose:** A self-contained, non-invasive diagnostic panel that is completely invisible in normal production use.
*   **Activation:** Append `?debug=1` to the URL (e.g., `http://localhost:8080/?debug=1`) or run `localStorage.setItem('hh_debug_mode', 'true')` in the console.
*   **Displays:**
    *   Firestore Connection Status
    *   Last Snapshot received timestamp
    *   Count of every collection loaded (Customers, Leaves, Expenses, Staff, Vehicles, Trips)
    *   Dashboard Render Status (success / which module failed)
    *   Last renderAll() time and run count
    *   Last JavaScript error caught globally
    *   Per-module failure details (function name, error message, stack trace)
*   **"Copy Report" button** copies a complete structured diagnostic text block for sharing.
*   **Toggle Button:** A 🛠️ floating button appears in the bottom-right corner when debug mode is active to show/hide the panel.
