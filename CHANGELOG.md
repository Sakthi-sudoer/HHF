# Changelog: Healthy Home's Foods Enterprise Dashboard

All notable changes to this project will be documented in this file.

---

## [2.0.0] - 2026-07-21
### Added
*   **Modular Architecture:** Rebuilt the entire codebase from scratch using a strict **3-file domain pattern** across isolated modules (`/js/customers/`, `/js/delivery/`, `/js/kitchen/`, `/js/vehicles/`, `/js/finance/`, `/js/admin/`).
*   **Google Firebase v9 modular SDK:** Upgraded Firestore and Auth imports to use tree-shakeable native CDN modules.
*   **Design Tokens System:** Centralized styling configurations inside `/design/tokens.js` and loaded them dynamically.
*   **Tamil/English Translation engine:** Fully decoupled translation dictionaries (`i18n/ta.json`, `i18n/en.json`) and replacement mechanisms.
*   **Cross-Domain Registry Bridge:** Implemented `js/core/accessors.js` to serve as a shared bridge, decoupling dependency boundaries between different features.
*   **Spreadsheet Grid Editor:** Added spreadsheet table grid inside Admin tab with inline `contenteditable` cells, triggering validation and automated saves back to Firestore.

## [1.2.0] - 2026-07-21
### Fixed
*   **Database Synchronization Disconnect:** Reverted database configurations back to the active production project (`hhfoods-3ab9b`) after an incorrect change pointed the app to a blank placeholder project ID. This restores sync behavior, loading the 21 existing customer details and accounting entries properly.

## [1.1.0] - 2026-07-20
### Fixed
*   **Missing Filter Method:** Implemented `window.applyFilter` in `js/ui-render.js` to fix UI crashes when filtering customers by All / Trial / Unpaid.
*   **Timezone Date-Shift Bug:** Created `parseLocalDate` and `formatLocalDate` inside `js/utils.js` and replaced all unsafe `new Date("YYYY-MM-DD")` and `.toISOString()` calls with local date equivalents across `js/utils.js` and `js/ui-render.js`. This ensures active plans, delivery sheets, and vehicle trips load dates correctly.
*   **Real-time sync disconnect:** Configured the Firestore deliveries onSnapshot listener in `js/firebase-db.js` to automatically copy `window.deliveryStatus` to `window.plannerDeliveryStatus` when today is selected.
*   **Validation Crash:** Fixed duplicate check inside `saveCustomer` in `js/app.js` which caused crashes when scanning empty phone fields or null customer details.
*   **Leave deletion database drift:** Refactored leave delete handler in `js/app.js` to dynamically compute customer's new subscription end date and save the updated customer object back to Firestore.
*   **Odometer/Vehicle Date Mismatch:** Updated yesterday's trip calculators to use safe local date conversions instead of UTC strings.
*   **Stuck Dashboard UI Block:** Refactored `recalculateCustomerEndDate`, `isCustomerOnLeave`, `printMemoBill`, and `downloadCustomerLedger` in `js/utils.js` to add property existence and type guards on `l.date` when iterating leaves, preventing TypeError crashes in the main rendering thread and restoring real-time automatic UI updates.
