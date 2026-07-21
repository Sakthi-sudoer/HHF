// ============================================================
// 🛠️ HH FOODS — PERMANENT DIAGNOSTIC CENTER
// Version: 2.0.0
// Activation: URL ?debug=1  OR  localStorage.setItem('hh_debug_mode','true')
// Always safe in production: panel never renders unless debug flag present.
// ============================================================

(function () {
    'use strict';

    // ─── Constants ───────────────────────────────────────────
    const APP_VERSION  = '2.0.0';
    const DB_VERSION   = 'v8';
    const PROJECT_ID   = 'hhfoods-3ab9b';

    const isDebugMode  = () =>
        location.search.includes('debug=1') ||
        localStorage.getItem('hh_debug_mode') === 'true';

    // ─── Central State Store ──────────────────────────────────
    const DS = {
        firestoreStatus:    'Connecting…',
        lastSnapshotTime:   null,
        lastSyncTime:       null,
        lastRenderAllTime:  null,
        renderAllCount:     0,
        renderAllStatus:    'Not run yet',
        moduleFails:        [],
        lastJsError:        null,
        snapshots: {
            customers:  { count: 0, time: null, error: null },
            leaves:     { count: 0, time: null, error: null },
            expenses:   { count: 0, time: null, error: null },
            staff:      { count: 0, time: null, error: null },
            vehicles:   { count: 0, time: null, error: null },
            trips:      { count: 0, time: null, error: null },
            skips:      { count: 0, time: null, error: null },
            alternates: { count: 0, time: null, error: null },
        },
        healthScore:    null,
        healthReport:   [],
        healthRunTime:  null,
        healthColor:    'gray',  // 'green' | 'yellow' | 'red'
    };
    window.hhDebug = DS;

    // ─── Global error capture ─────────────────────────────────
    window.addEventListener('error', e => {
        DS.lastJsError = {
            message: e.message,
            file:    (e.filename || '').split('/').pop() || 'unknown',
            line:    e.lineno, col: e.colno,
            stack:   e.error ? e.error.stack : 'No stack',
            time:    ts(),
        };
        refreshPanel();
    });

    window.addEventListener('unhandledrejection', e => {
        DS.lastJsError = {
            message: e.reason ? (e.reason.message || String(e.reason)) : 'Unhandled Promise Rejection',
            file:    'Promise', line: '-', col: '-',
            stack:   e.reason ? (e.reason.stack || 'No stack') : '',
            time:    ts(),
        };
        refreshPanel();
    });

    // ─── Public APIs (called by firebase-db.js / ui-render.js) ─
    window.hhDebugSnapshotUpdate = function (collection, count, error) {
        const now = ts();
        if (DS.snapshots[collection] !== undefined) {
            DS.snapshots[collection] = { count, time: now, error: error || null };
        }
        DS.lastSnapshotTime = now;
        if (!error) {
            DS.firestoreStatus = '✅ Connected';
            DS.lastSyncTime    = now;
        } else {
            DS.firestoreStatus = '❌ Error — ' + collection;
        }
        refreshPanel();
    };

    window.hhDebugRenderComplete = function (fails) {
        DS.renderAllCount++;
        DS.lastRenderAllTime = ts();
        DS.moduleFails       = fails || [];
        DS.renderAllStatus   = fails && fails.length > 0
            ? `⚠️ ${fails.length} module(s) failed`
            : '✅ All modules rendered';
        refreshPanel();
    };

    // ─── Helpers ──────────────────────────────────────────────
    function ts() {
        return new Date().toLocaleTimeString('en-IN', { hour12: true });
    }
    function dtFull() {
        return new Date().toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
        });
    }

    // ─── Full System Health Check Engine ─────────────────────
    function runHealthCheck() {
        const report = [];
        let totalChecks  = 0;
        let passCount    = 0;
        let warnCount    = 0;
        let failCount    = 0;

        function check(category, name, condition, warnCondition, fix) {
            totalChecks++;
            let status, icon;
            if (typeof condition === 'function' ? condition() : condition) {
                if (typeof warnCondition === 'function' ? warnCondition() : (warnCondition === true)) {
                    status = 'WARN'; icon = '⚠️'; warnCount++;
                } else {
                    status = 'PASS'; icon = '✅'; passCount++;
                }
            } else {
                status = 'FAIL'; icon = '❌'; failCount++;
            }
            report.push({ category, name, status, icon, fix: status === 'FAIL' ? (fix || 'Investigate manually.') : null });
        }

        // --- 1. FIRESTORE ---
        check('Firestore', 'Connection Status',
            () => DS.firestoreStatus.startsWith('✅'),
            false,
            'Check internet connection. Verify Firebase project ID "hhfoods-3ab9b" is correct in firebase-db.js.'
        );
        check('Firestore', 'Customers Collection Synced',
            () => DS.snapshots.customers.time !== null && !DS.snapshots.customers.error,
            false,
            'Check Firestore rules for "customers" collection. Ensure initRealtimeSync() is being called in app.js.'
        );
        check('Firestore', 'Expenses Collection Synced',
            () => DS.snapshots.expenses.time !== null && !DS.snapshots.expenses.error,
            false,
            'Check Firestore rules for "expenses" collection.'
        );
        check('Firestore', 'Staff Collection Synced',
            () => DS.snapshots.staff.time !== null && !DS.snapshots.staff.error,
            false,
            'Check Firestore rules for "staffs" collection. Note: collection name is "staffs" (plural).'
        );
        check('Firestore', 'Leaves Collection Synced',
            () => DS.snapshots.leaves.time !== null && !DS.snapshots.leaves.error,
            false,
            'Check Firestore rules for "leaves" collection.'
        );
        check('Firestore', 'Vehicles Collection Synced',
            () => DS.snapshots.vehicles.time !== null && !DS.snapshots.vehicles.error,
            false,
            'Check Firestore rules for "vehicles" collection.'
        );

        // --- 2. DATA STATE ---
        check('Data State', 'window.customers is array',
            () => Array.isArray(window.customers),
            false,
            'firebase-db.js is not initializing window.customers. Check if firebase-db.js loaded correctly.'
        );
        check('Data State', 'window.expenses is array',
            () => Array.isArray(window.expenses),
            false,
            'firebase-db.js is not initializing window.expenses.'
        );
        check('Data State', 'window.staffList is array',
            () => Array.isArray(window.staffList),
            false,
            'firebase-db.js is not initializing window.staffList.'
        );
        check('Data State', 'window.leaves is array',
            () => Array.isArray(window.leaves),
            false,
            'firebase-db.js is not initializing window.leaves.'
        );
        check('Data State', 'window.vehicles is array',
            () => Array.isArray(window.vehicles),
            false,
            'firebase-db.js is not initializing window.vehicles.'
        );
        check('Data State', 'window.todayDateStr valid',
            () => /^\d{4}-\d{2}-\d{2}$/.test(window.todayDateStr || ''),
            false,
            'window.todayDateStr is missing or malformed. Check firebase-db.js initialization block.'
        );

        // --- 3. RENDER FUNCTIONS ---
        check('Render Functions', 'renderAll() defined',
            () => typeof renderAll === 'function' || typeof window.renderAll === 'function',
            false,
            'ui-render.js failed to parse/load. Open browser console for SyntaxError details.'
        );
        check('Render Functions', 'renderDashboard() defined',
            () => typeof window.renderDashboard === 'function',
            false,
            'window.renderDashboard is undefined. Check ui-render.js for this function definition.'
        );
        check('Render Functions', 'renderProfitManagement() defined',
            () => typeof window.renderProfitManagement === 'function',
            false,
            'window.renderProfitManagement is undefined. Check ui-render.js.'
        );
        check('Render Functions', 'renderExpenseAnalytics() defined',
            () => typeof window.renderExpenseAnalytics === 'function',
            false,
            'window.renderExpenseAnalytics is undefined. Check ui-render.js.'
        );
        check('Render Functions', 'renderVehiclesView() defined',
            () => typeof window.renderVehiclesView === 'function',
            false,
            'window.renderVehiclesView is undefined. Check ui-render.js.'
        );
        check('Render Functions', 'renderReportsConsole() defined',
            () => typeof window.renderReportsConsole === 'function',
            false,
            'window.renderReportsConsole is undefined. Check ui-render.js.'
        );
        check('Render Functions', 'Last renderAll() succeeded',
            () => DS.renderAllStatus.startsWith('✅'),
            false,
            'renderAll() has not run successfully. Check for module failures listed in the debug panel.'
        );
        check('Render Functions', 'No module render failures',
            () => DS.moduleFails.length === 0,
            false,
            'One or more render modules failed. See Module Failures section in debug panel.'
        );

        // --- 4. DOM / VIEWS ---
        const requiredViews = ['dashboard', 'customers', 'delivery', 'leave', 'kitchen', 'staff', 'expenses', 'profit', 'reports', 'vehicles', 'settings'];
        requiredViews.forEach(v => {
            check('DOM Views', `view-${v} element exists`,
                () => !!document.getElementById('view-' + v),
                false,
                `DOM element #view-${v} is missing from index.html.`
            );
        });

        // --- 5. NAVIGATION BUTTONS ---
        const navBtns = ['dashboard', 'customers', 'delivery', 'leave', 'kitchen', 'staff', 'vehicles', 'expenses', 'profit', 'reports', 'control', 'settings'];
        navBtns.forEach(v => {
            check('Navigation', `d-tab-${v} button exists`,
                () => !!document.getElementById('d-tab-' + v),
                false,
                `Navigation button #d-tab-${v} is missing from index.html.`
            );
        });

        // --- 6. CRITICAL FORM ELEMENTS ---
        const criticalElements = [
            { id: 'customer-cards-list', label: 'Customer Cards Container' },
            { id: 'stat-total-cust',     label: 'Dashboard Customer Count' },
            { id: 'search-bar',          label: 'Customer Search Bar' },
            { id: 'delivery-list',       label: 'Delivery List Container' },
            { id: 'leave-history-table', label: 'Leave History Table' },
            { id: 'staff-history-table', label: 'Staff History Table' },
            { id: 'accounting-month-tabs',label: 'Accounting Month Tabs' },
        ];
        criticalElements.forEach(el => {
            check('DOM Elements', `${el.label} exists`,
                () => !!document.getElementById(el.id),
                false,
                `DOM element #${el.id} is missing. Check index.html for this element.`
            );
        });

        // --- 7. GLOBAL CONTROLLERS ---
        check('Controllers', 'switchView() defined',
            () => typeof window.switchView === 'function',
            false,
            'app.js failed to load or switchView() was not defined.'
        );
        check('Controllers', 'saveCustomer() defined',
            () => typeof window.saveCustomer === 'function',
            false,
            'app.js failed to define window.saveCustomer.'
        );
        check('Controllers', 'triggerDeleteConfirm() defined',
            () => typeof window.triggerDeleteConfirm === 'function',
            false,
            'app.js failed to define window.triggerDeleteConfirm.'
        );
        check('Controllers', 'applyGlobalSettings() defined',
            () => typeof window.applyGlobalSettings === 'function',
            false,
            'ui-render.js failed to define window.applyGlobalSettings.'
        );

        // --- 8. JAVASCRIPT ERRORS ---
        check('Stability', 'No global JS errors detected',
            () => DS.lastJsError === null,
            false,
            `JS Error: ${DS.lastJsError ? DS.lastJsError.message : 'unknown'} — see Last JS Error panel.`
        );

        // ── Compute Health Score ──
        const score = totalChecks > 0 ? Math.round((passCount / totalChecks) * 100) : 0;
        let color = 'green';
        if (failCount > 0) color = 'red';
        else if (warnCount > 0) color = 'yellow';

        DS.healthScore   = score;
        DS.healthColor   = color;
        DS.healthReport  = report;
        DS.healthRunTime = dtFull();

        refreshPanel();
        renderHealthReport(report);
    }

    // ─── Panel HTML ───────────────────────────────────────────
    function buildPanel() {
        if (!isDebugMode()) return;

        const style = document.createElement('style');
        style.textContent = `
            #hh-debug-panel {
                position: fixed; bottom: 0; left: 0; right: 0;
                max-height: 50vh; overflow-y: auto;
                background: #0f172a; color: #e2e8f0;
                font-family: 'Courier New', monospace; font-size: 11px;
                z-index: 99999; border-top: 2px solid #22d3ee;
            }
            #hh-debug-panel .dbg-header {
                display: flex; align-items: center; justify-content: space-between;
                padding: 5px 12px; background: #0e7490;
                font-weight: bold; font-size: 11px; letter-spacing: 0.5px;
                position: sticky; top: 0; z-index: 2; gap: 8px; flex-wrap: wrap;
            }
            #hh-debug-panel .dbg-score-pill {
                display: inline-flex; align-items: center; gap: 6px;
                padding: 2px 12px; border-radius: 999px; font-size: 12px;
                font-weight: 900; letter-spacing: 0.5px; border: 2px solid;
                transition: background 0.3s;
            }
            #hh-debug-panel .dbg-score-green  { background:#052e16; border-color:#4ade80; color:#4ade80; }
            #hh-debug-panel .dbg-score-yellow { background:#451a03; border-color:#fbbf24; color:#fbbf24; }
            #hh-debug-panel .dbg-score-red    { background:#450a0a; border-color:#f87171; color:#f87171; }
            #hh-debug-panel .dbg-score-gray   { background:#1e293b; border-color:#94a3b8; color:#94a3b8; }
            #hh-debug-panel .dbg-body {
                padding: 8px 12px;
                display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 6px;
            }
            #hh-debug-panel .dbg-card {
                background: #1e293b; border: 1px solid #334155;
                border-radius: 6px; padding: 6px 8px;
            }
            #hh-debug-panel .dbg-card-title {
                color: #94a3b8; font-size: 9px; text-transform: uppercase;
                letter-spacing: 0.7px; margin-bottom: 3px;
            }
            #hh-debug-panel .dbg-card-value {
                color: #f1f5f9; font-size: 11px; font-weight: bold; word-break: break-all;
            }
            #hh-debug-panel .dbg-ok    { color: #4ade80; }
            #hh-debug-panel .dbg-warn  { color: #fbbf24; }
            #hh-debug-panel .dbg-err   { color: #f87171; }
            #hh-debug-panel .dbg-muted { color: #64748b; }
            #hh-debug-panel .dbg-btn {
                background: #1e40af; color: #bfdbfe; border: none;
                border-radius: 4px; padding: 3px 10px; font-size: 10px;
                cursor: pointer; font-family: inherit; margin-left: 4px;
                white-space: nowrap;
            }
            #hh-debug-panel .dbg-btn:hover { background: #1d4ed8; }
            #hh-debug-panel .dbg-btn-run   { background: #065f46; color: #a7f3d0; }
            #hh-debug-panel .dbg-btn-run:hover { background: #047857; }
            #hh-debug-panel .dbg-btn-close { background: #374151; color: #f9fafb; }
            #hh-debug-panel .dbg-report-section {
                grid-column: 1 / -1; background: #0f172a;
                border: 1px solid #334155; border-radius: 6px; padding: 8px;
            }
            #hh-debug-panel .dbg-report-cat {
                color: #7dd3fc; font-size: 10px; font-weight: bold;
                text-transform: uppercase; letter-spacing: 0.5px;
                margin: 8px 0 4px; border-bottom: 1px solid #1e3a5f; padding-bottom: 2px;
            }
            #hh-debug-panel .dbg-report-row {
                display: flex; align-items: flex-start; gap: 6px;
                padding: 2px 0; font-size: 10px;
            }
            #hh-debug-panel .dbg-report-name { flex: 1; color: #cbd5e1; }
            #hh-debug-panel .dbg-fix {
                font-size: 9px; color: #fb923c; margin-left: 18px;
                margin-bottom: 3px;
            }
            #hh-debug-panel .dbg-fail-card {
                grid-column: 1 / -1; background: #450a0a;
                border: 1px solid #dc2626; border-radius: 6px; padding: 8px;
            }
            #hh-debug-panel .dbg-fail-fn  { color: #f97316; font-weight: bold; }
            #hh-debug-panel .dbg-stack    { color: #94a3b8; font-size: 9px; white-space: pre-wrap; max-height: 50px; overflow: auto; }
        `;
        document.head.appendChild(style);

        const panel = document.createElement('div');
        panel.id = 'hh-debug-panel';
        panel.innerHTML = `
            <div class="dbg-header">
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <span>🛠️ HH Foods ERP — Diagnostic Center v2</span>
                    <span id="dbg-score-pill" class="dbg-score-pill dbg-score-gray">— Health: —%</span>
                </div>
                <div style="display:flex;align-items:center;flex-wrap:wrap;gap:2px;">
                    <button class="dbg-btn dbg-btn-run" id="dbg-run-health-btn">🔍 Run System Health Check</button>
                    <button class="dbg-btn" id="dbg-copy-btn">📋 Copy Report</button>
                    <button class="dbg-btn" id="dbg-refresh-btn">↻</button>
                    <button class="dbg-btn dbg-btn-close" id="dbg-close-btn">✕</button>
                </div>
            </div>
            <div class="dbg-body" id="dbg-body-content">

                <!-- Row 1: App Meta -->
                <div class="dbg-card">
                    <div class="dbg-card-title">App Version</div>
                    <div class="dbg-card-value dbg-muted" id="dbg-app-version">${APP_VERSION}</div>
                </div>
                <div class="dbg-card">
                    <div class="dbg-card-title">Database Version</div>
                    <div class="dbg-card-value dbg-muted" id="dbg-db-version">${DB_VERSION} / ${PROJECT_ID}</div>
                </div>
                <div class="dbg-card">
                    <div class="dbg-card-title">Current User / Device</div>
                    <div class="dbg-card-value dbg-muted" id="dbg-user">${navigator.platform || 'Unknown'}</div>
                </div>
                <div class="dbg-card">
                    <div class="dbg-card-title">Last Full Health Check</div>
                    <div class="dbg-card-value dbg-muted" id="dbg-health-run-time">Never</div>
                </div>

                <!-- Row 2: Firestore -->
                <div class="dbg-card">
                    <div class="dbg-card-title">Firestore Status</div>
                    <div class="dbg-card-value" id="dbg-fs-status">Connecting…</div>
                </div>
                <div class="dbg-card">
                    <div class="dbg-card-title">Last Successful Sync</div>
                    <div class="dbg-card-value" id="dbg-last-sync">—</div>
                </div>
                <div class="dbg-card">
                    <div class="dbg-card-title">Last Snapshot Received</div>
                    <div class="dbg-card-value" id="dbg-last-snap">—</div>
                </div>
                <div class="dbg-card">
                    <div class="dbg-card-title">Last Refresh Time</div>
                    <div class="dbg-card-value" id="dbg-last-refresh">—</div>
                </div>

                <!-- Row 3: Data Counts -->
                <div class="dbg-card">
                    <div class="dbg-card-title">Customers Loaded</div>
                    <div class="dbg-card-value" id="dbg-c-customers">—</div>
                </div>
                <div class="dbg-card">
                    <div class="dbg-card-title">Expenses Loaded</div>
                    <div class="dbg-card-value" id="dbg-c-expenses">—</div>
                </div>
                <div class="dbg-card">
                    <div class="dbg-card-title">Delivery Staff Loaded</div>
                    <div class="dbg-card-value" id="dbg-c-staff">—</div>
                </div>
                <div class="dbg-card">
                    <div class="dbg-card-title">Leaves Loaded</div>
                    <div class="dbg-card-value" id="dbg-c-leaves">—</div>
                </div>
                <div class="dbg-card">
                    <div class="dbg-card-title">Vehicles Loaded</div>
                    <div class="dbg-card-value" id="dbg-c-vehicles">—</div>
                </div>
                <div class="dbg-card">
                    <div class="dbg-card-title">Trips Loaded</div>
                    <div class="dbg-card-value" id="dbg-c-trips">—</div>
                </div>

                <!-- Row 4: Render -->
                <div class="dbg-card">
                    <div class="dbg-card-title">renderAll() Status</div>
                    <div class="dbg-card-value" id="dbg-render-status">—</div>
                </div>
                <div class="dbg-card">
                    <div class="dbg-card-title">Last renderAll() Time</div>
                    <div class="dbg-card-value" id="dbg-render-time">—</div>
                </div>
                <div class="dbg-card">
                    <div class="dbg-card-title">renderAll() Run Count</div>
                    <div class="dbg-card-value" id="dbg-render-count">0</div>
                </div>

                <!-- JS Error -->
                <div class="dbg-card" style="grid-column:span 2;">
                    <div class="dbg-card-title">Last JS Error</div>
                    <div class="dbg-card-value dbg-ok" id="dbg-js-error">None ✅</div>
                </div>

            </div><!-- /dbg-body -->
        `;
        document.body.appendChild(panel);

        document.getElementById('dbg-close-btn').onclick    = () => { panel.style.display = 'none'; };
        document.getElementById('dbg-refresh-btn').onclick  = refreshPanel;
        document.getElementById('dbg-copy-btn').onclick     = copyReport;
        document.getElementById('dbg-run-health-btn').onclick = () => {
            const btn = document.getElementById('dbg-run-health-btn');
            btn.textContent = '⏳ Running…';
            btn.disabled = true;
            setTimeout(() => {
                runHealthCheck();
                btn.textContent = '🔍 Run System Health Check';
                btn.disabled = false;
            }, 50);
        };

        refreshPanel();
    }

    // ─── Refresh all live values ──────────────────────────────
    function refreshPanel() {
        if (!isDebugMode()) return;
        const panel = document.getElementById('hh-debug-panel');
        if (!panel || panel.style.display === 'none') return;

        const set = (id, val, cls) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.textContent = val;
            if (cls !== undefined) el.className = 'dbg-card-value ' + (cls || '');
        };

        // Health Score Pill
        const pill = document.getElementById('dbg-score-pill');
        if (pill && DS.healthScore !== null) {
            const c = DS.healthColor;
            pill.className = `dbg-score-pill dbg-score-${c}`;
            const icon = c === 'green' ? '✅' : c === 'yellow' ? '⚠️' : '❌';
            pill.textContent = `${icon} Health: ${DS.healthScore}%`;
        }

        // Meta
        set('dbg-health-run-time', DS.healthRunTime || 'Never');
        set('dbg-last-refresh', ts());

        // Firestore
        const fsOk = DS.firestoreStatus.startsWith('✅');
        set('dbg-fs-status', DS.firestoreStatus, fsOk ? 'dbg-ok' : 'dbg-err');
        set('dbg-last-sync', DS.lastSyncTime || '—', DS.lastSyncTime ? 'dbg-ok' : 'dbg-muted');
        set('dbg-last-snap', DS.lastSnapshotTime || '—');

        // Data counts
        const snap = DS.snapshots;
        const fmtSnap = (k) => {
            const s = snap[k];
            const cls = s.error ? 'dbg-err' : s.count > 0 ? 'dbg-ok' : 'dbg-warn';
            const val = s.error ? `ERR (${s.error.substring(0,30)}…)` : `${s.count} records @ ${s.time || '—'}`;
            return { val, cls };
        };
        ['customers','expenses','staff','leaves','vehicles','trips'].forEach(k => {
            const { val, cls } = fmtSnap(k);
            set(`dbg-c-${k}`, val, cls);
        });

        // Render
        const renderOk = DS.renderAllStatus.startsWith('✅');
        const renderWarn = DS.renderAllStatus.startsWith('⚠️');
        set('dbg-render-status', DS.renderAllStatus, renderOk ? 'dbg-ok' : renderWarn ? 'dbg-warn' : '');
        set('dbg-render-time',  DS.lastRenderAllTime || '—');
        set('dbg-render-count', String(DS.renderAllCount));

        // JS Error
        const errEl = document.getElementById('dbg-js-error');
        if (errEl) {
            if (DS.lastJsError) {
                errEl.className = 'dbg-card-value dbg-err';
                errEl.textContent = `[${DS.lastJsError.time}] ${DS.lastJsError.message} @ ${DS.lastJsError.file}:${DS.lastJsError.line}`;
            } else {
                errEl.className = 'dbg-card-value dbg-ok';
                errEl.textContent = 'None ✅';
            }
        }

        // Module Failures
        const body = document.getElementById('dbg-body-content');
        if (body) {
            const old = document.getElementById('dbg-module-fails');
            if (old) old.remove();
            if (DS.moduleFails && DS.moduleFails.length > 0) {
                const div = document.createElement('div');
                div.id = 'dbg-module-fails';
                div.className = 'dbg-fail-card';
                div.innerHTML = `<div style="color:#fb923c;font-weight:bold;margin-bottom:6px;">⚠️ ${DS.moduleFails.length} Render Module(s) Failed:</div>` +
                    DS.moduleFails.map(f => `
                        <div style="margin-bottom:6px;">
                            <div class="dbg-fail-fn">${f.fn}()</div>
                            <div style="color:#fca5a5;">${f.error}</div>
                            <div class="dbg-stack">${(f.stack || '').split('\n').slice(0, 4).join('\n')}</div>
                        </div>
                    `).join('<hr style="border-color:#7f1d1d;margin:4px 0">');
                body.appendChild(div);
            }
        }
    }

    // ─── Render Health Report Table ───────────────────────────
    function renderHealthReport(report) {
        const body = document.getElementById('dbg-body-content');
        if (!body) return;

        const old = document.getElementById('dbg-health-section');
        if (old) old.remove();

        const section = document.createElement('div');
        section.id = 'dbg-health-section';
        section.className = 'dbg-report-section';

        // Group by category
        const categories = {};
        report.forEach(r => {
            if (!categories[r.category]) categories[r.category] = [];
            categories[r.category].push(r);
        });

        let html = `<div style="font-weight:bold;color:#22d3ee;margin-bottom:8px;font-size:11px;">
            📊 System Health Check — ${DS.healthRunTime}
        </div>`;

        Object.entries(categories).forEach(([cat, items]) => {
            html += `<div class="dbg-report-cat">${cat}</div>`;
            items.forEach(item => {
                const color = item.status === 'PASS' ? '#4ade80' : item.status === 'WARN' ? '#fbbf24' : '#f87171';
                html += `<div class="dbg-report-row">
                    <span style="color:${color};font-size:12px;min-width:18px;">${item.icon}</span>
                    <span class="dbg-report-name">${item.name}</span>
                    <span style="color:${color};font-weight:bold;font-size:10px;">${item.status}</span>
                </div>`;
                if (item.fix) {
                    html += `<div class="dbg-fix">💡 Suggested Fix: ${item.fix}</div>`;
                }
            });
        });

        section.innerHTML = html;
        body.appendChild(section);

        // Scroll into view
        section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // ─── Copy full report ─────────────────────────────────────
    function copyReport() {
        const snap = DS.snapshots;
        const lines = [
            '╔══════════════════════════════════════════╗',
            '║    HH FOODS ERP — DIAGNOSTIC REPORT      ║',
            '╚══════════════════════════════════════════╝',
            `Generated : ${dtFull()}`,
            `URL       : ${location.href}`,
            `App Ver   : ${APP_VERSION}  |  DB Ver: ${DB_VERSION}`,
            `Project   : ${PROJECT_ID}`,
            '',
            '── FIRESTORE ──────────────────────────────',
            `Status         : ${DS.firestoreStatus}`,
            `Last Sync      : ${DS.lastSyncTime || 'Never'}`,
            `Last Snapshot  : ${DS.lastSnapshotTime || 'Never'}`,
            '',
            '── DATA COUNTS ────────────────────────────',
            ...Object.entries(snap).map(([k, v]) =>
                `${k.padEnd(12)}: ${v.count} records @ ${v.time || 'N/A'}${v.error ? '  [ERR: ' + v.error + ']' : ''}`
            ),
            '',
            '── RENDER ENGINE ──────────────────────────',
            `renderAll Status : ${DS.renderAllStatus}`,
            `Last Run Time    : ${DS.lastRenderAllTime || 'Never'}`,
            `Run Count        : ${DS.renderAllCount}`,
        ];

        if (DS.moduleFails && DS.moduleFails.length > 0) {
            lines.push('', '── MODULE FAILURES ────────────────────────');
            DS.moduleFails.forEach(f => {
                lines.push(`  Function : ${f.fn}()`);
                lines.push(`  Error    : ${f.error}`);
                lines.push(`  Stack:\n${(f.stack || '').split('\n').slice(0,5).map(l => '    ' + l).join('\n')}`);
                lines.push('  ---');
            });
        }

        if (DS.lastJsError) {
            const e = DS.lastJsError;
            lines.push('', '── LAST JAVASCRIPT ERROR ──────────────────');
            lines.push(`  [${e.time}] ${e.message}`);
            lines.push(`  File: ${e.file}  Line: ${e.line}  Col: ${e.col}`);
            lines.push(`  Stack:\n${(e.stack || '').split('\n').slice(0,5).map(l => '    ' + l).join('\n')}`);
        }

        if (DS.healthReport && DS.healthReport.length > 0) {
            lines.push('', `── HEALTH CHECK REPORT (Score: ${DS.healthScore}%) ────`);
            let lastCat = '';
            DS.healthReport.forEach(r => {
                if (r.category !== lastCat) {
                    lines.push(`  [${r.category}]`);
                    lastCat = r.category;
                }
                lines.push(`    ${r.icon} ${r.name} — ${r.status}`);
                if (r.fix) lines.push(`       💡 ${r.fix}`);
            });
        }

        lines.push('', '══════════════════════════════════════════════');

        navigator.clipboard.writeText(lines.join('\n')).then(() => {
            const btn = document.getElementById('dbg-copy-btn');
            if (btn) { btn.textContent = '✅ Copied!'; setTimeout(() => btn.textContent = '📋 Copy Report', 2000); }
        }).catch(() => alert(lines.join('\n')));
    }

    // ─── Boot ─────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', buildPanel);
    } else {
        buildPanel();
    }

    // Auto-run health check 3 seconds after page load (non-blocking)
    window.addEventListener('load', () => {
        if (isDebugMode()) {
            setTimeout(runHealthCheck, 3000);
        }
    });

})();
