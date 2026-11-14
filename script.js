// script.js - CAPSo Enterprise ERP Outbound Logistics, KPIs, Delivery Receipts & Audit Trail
document.addEventListener('navigationLoaded', () => {
    console.log("'navigationLoaded' event received. Initializing CAPSo Enterprise ERP Dashboard.");

    // =================================================================
    // FIREBASE CONFIGURATION & RELATIONAL COLLECTIONS
    // =================================================================
    const firebaseConfig = {
        apiKey: "AIzaSyCjKJmXAJ0C8v1To1tFaAyucfo8YRFTjcw",
        authDomain: "capso-dashboard-pwa.firebaseapp.com",
        projectId: "capso-dashboard-pwa",
        storageBucket: "capso-dashboard-pwa.appspot.com",
        messagingSenderId: "389493283794",
        appId: "1:389493283794:web:04af6938d8d8683271860b"
    };

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.firestore();
    const inventoryCollection = db.collection("inventory");
    const ordersCollection = db.collection("orders");
    const transactionsCollection = db.collection("transactions");

    // Local cache keys for offline resilience
    const LS_KEYS = {
        INVENTORY: 'capso_erp_inventory_v1',
        ORDERS: 'capso_erp_orders_v1',
        TRANSACTIONS: 'capso_erp_transactions_v1'
    };

    // =================================================================
    // STATE
    // =================================================================
    let allInventory = [];
    let allOrders = [];
    let allTransactions = [];
    let currentFilter = 'All';
    let currentPage = 1;
    const rowsPerPage = 10;
    let currentOrderInModal = null;
    let calendarDate = new Date();
    let deferredInstallPrompt = null;

    // =================================================================
    // SELECTORS
    // =================================================================
    const ordersListContainer = document.getElementById('orders-list-container');
    const paginationContainer = document.getElementById('table-pagination');
    const filterContainer = document.querySelector('.filters');
    const addNewOrderBtn = document.getElementById('add-new-order-btn');
    const openDrModalBtn = document.getElementById('open-dr-modal-btn');
    const orderModal = document.getElementById('order-modal');
    const drModal = document.getElementById('dr-modal');
    const confirmDeleteModal = document.getElementById('confirm-delete-modal');
    const skeletonLoader = document.getElementById('skeleton-loader');
    const calendarGrid = document.getElementById('calendar-grid');
    const currentWeekDisplay = document.getElementById('current-week-display');
    const prevWeekBtn = document.getElementById('prev-week-btn');
    const nextWeekBtn = document.getElementById('next-week-btn');
    const dashboardTransactionsBody = document.getElementById('dashboard-transactions-body');

    // KPI Card Selectors
    const kpiTotalSales = document.getElementById('kpi-total-sales');
    const kpiSalesSubtext = document.getElementById('kpi-sales-subtext');
    const kpiPendingDispatches = document.getElementById('kpi-pending-dispatches');
    const kpiDispatchesSubtext = document.getElementById('kpi-dispatches-subtext');
    const kpiLowStock = document.getElementById('kpi-low-stock');

    // Nav Controls (Notify Toggle Removed)
    const installAppBtn = document.getElementById('install-app-btn');
    const navSeedDemoBtn = document.getElementById('nav-seed-demo-btn');

    // =================================================================
    // PWA INSTALLATION (NO PUSH NOTIFICATION TOGGLE)
    // =================================================================
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('service-worker.js')
                .then(reg => console.log('Service Worker registered:', reg.scope))
                .catch(err => console.warn('Service Worker registration skipped:', err));
        });
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredInstallPrompt = e;
        if (installAppBtn) {
            installAppBtn.classList.remove('hidden');
            installAppBtn.classList.add('inline-flex');
        }
    });

    if (installAppBtn) {
        installAppBtn.addEventListener('click', async () => {
            if (!deferredInstallPrompt) return;
            deferredInstallPrompt.prompt();
            const { outcome } = await deferredInstallPrompt.userChoice;
            if (outcome === 'accepted') {
                installAppBtn.classList.add('hidden');
            }
            deferredInstallPrompt = null;
        });
    }

    // =================================================================
    // UTILITY HELPERS
    // =================================================================
    function formatCurrency(val) {
        const num = Number(val) || 0;
        return '₱' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function getLocalTodayStr() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function getOffsetDateStr(dayOffset = 0) {
        const d = new Date();
        d.setDate(d.getDate() + dayOffset);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function getIsoTimestampOffset(dayOffset = 0, hour = 9, minute = 0) {
        const d = new Date();
        d.setDate(d.getDate() + dayOffset);
        d.setHours(hour, minute, 0, 0);
        return d.toISOString();
    }

    function getWeekDayDateStr(dayIndex = 0) {
        const monday = getStartOfWeek(new Date());
        monday.setDate(monday.getDate() + dayIndex);
        const year = monday.getFullYear();
        const month = String(monday.getMonth() + 1).padStart(2, '0');
        const day = String(monday.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function normalizeDateStr(dateInput) {
        if (!dateInput) return '';
        if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
            return dateInput.slice(0, 10);
        }
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return '';
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function normalizeStatus(status) {
        const raw = String(status || 'Pending').trim().toUpperCase();
        if (raw === 'OUT FOR DELIVERY') return 'Out for Delivery';
        if (raw === 'COMPLETE' || raw === 'COMPLETED') return 'Complete';
        if (raw === 'SCHEDULED') return 'Scheduled';
        if (raw === 'CANCELED' || raw === 'CANCELLED') return 'Canceled';
        return 'Pending';
    }

    function isDeductingStatus(status) {
        const norm = normalizeStatus(status);
        return norm === 'Out for Delivery' || norm === 'Complete';
    }

    function getStatusBadgeHtml(status) {
        const norm = normalizeStatus(status);
        const styles = {
            'Pending': 'bg-amber-400/10 text-amber-300 ring-amber-400/30',
            'Scheduled': 'bg-sky-400/10 text-sky-300 ring-sky-400/30',
            'Out for Delivery': 'bg-violet-400/10 text-violet-300 ring-violet-400/30',
            'Complete': 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/30',
            'Canceled': 'bg-zinc-800 text-zinc-400 ring-zinc-700'
        };
        const badgeStyle = styles[norm] || styles['Pending'];
        return `<span class="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${badgeStyle}">${norm}</span>`;
    }

    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        const bgClass = type === 'error'
            ? 'bg-rose-600/95 text-white ring-rose-400/30'
            : type === 'warning'
                ? 'bg-amber-500 text-zinc-950 ring-amber-300/40'
                : 'bg-zinc-900 text-zinc-100 ring-zinc-700';
        toast.className = `pointer-events-auto flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-modal ring-1 transition-all ${bgClass}`;
        toast.innerHTML = `
            <span>${message}</span>
            <button type="button" class="opacity-70 hover:opacity-100 font-bold">&times;</button>
        `;
        toast.querySelector('button').addEventListener('click', () => toast.remove());
        container.appendChild(toast);
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 4000);
    }

    // =================================================================
    // DEMO INITIALIZER: 30 REALISTIC HARDWARE SKUs
    // =================================================================
    const HARDWARE_DEMO_CATALOG = [
        { item_name: "Portland Cement (40kg Bag)", category: "Masonry & Aggregates", baseCogs: 195, reorder_point: 50 },
        { item_name: "Pozzolan Cement Type IP (40kg Bag)", category: "Masonry & Aggregates", baseCogs: 185, reorder_point: 45 },
        { item_name: "Concrete Hollow Blocks CHB 4\" (per pc)", category: "Masonry & Aggregates", baseCogs: 11.5, reorder_point: 200 },
        { item_name: "Concrete Hollow Blocks CHB 6\" (per pc)", category: "Masonry & Aggregates", baseCogs: 15.5, reorder_point: 150 },
        { item_name: "Washed River Sand (per cu.m.)", category: "Masonry & Aggregates", baseCogs: 1150, reorder_point: 15 },
        { item_name: "Crushed Gravel 3/4\" (per cu.m.)", category: "Masonry & Aggregates", baseCogs: 1280, reorder_point: 15 },
        { item_name: "Deformed Steel Rebar 10mm x 6m", category: "Steel & Rebar", baseCogs: 148, reorder_point: 60 },
        { item_name: "Deformed Steel Rebar 12mm x 6m", category: "Steel & Rebar", baseCogs: 215, reorder_point: 50 },
        { item_name: "Deformed Steel Rebar 16mm x 6m", category: "Steel & Rebar", baseCogs: 385, reorder_point: 40 },
        { item_name: "GI Tie Wire #16 (per kg)", category: "Steel & Rebar", baseCogs: 68, reorder_point: 35 },
        { item_name: "Angle Bar 1/4\" x 2\" x 6m", category: "Steel & Rebar", baseCogs: 590, reorder_point: 20 },
        { item_name: "Tubular Steel 2\" x 4\" Ga.16 (6m)", category: "Steel & Rebar", baseCogs: 840, reorder_point: 20 },
        { item_name: "PVC Blue Water Pipe 1/2\" x 3m", category: "Plumbing & PVC", baseCogs: 72, reorder_point: 40 },
        { item_name: "PVC Blue Water Pipe 3/4\" x 3m", category: "Plumbing & PVC", baseCogs: 98, reorder_point: 35 },
        { item_name: "PVC Sanitary Orange Pipe 4\" x 3m", category: "Plumbing & PVC", baseCogs: 340, reorder_point: 25 },
        { item_name: "PVC Solvent Cement (400cc Can)", category: "Plumbing & PVC", baseCogs: 145, reorder_point: 20 },
        { item_name: "Brass Ball Valve 1/2\" Heavy Duty", category: "Plumbing & PVC", baseCogs: 190, reorder_point: 18 },
        { item_name: "Marine Plywood 1/4\" (4ft x 8ft)", category: "Lumber & Wood", baseCogs: 460, reorder_point: 30 },
        { item_name: "Marine Plywood 1/2\" (4ft x 8ft)", category: "Lumber & Wood", baseCogs: 780, reorder_point: 25 },
        { item_name: "Phenolic Film-Faced Board 3/4\" (4x8)", category: "Lumber & Wood", baseCogs: 1120, reorder_point: 20 },
        { item_name: "Kiln-Dried Good Lumber 2x2x8 ft", category: "Lumber & Wood", baseCogs: 165, reorder_point: 40 },
        { item_name: "Corrugated GI Roofing Sheet Ga.26 (8ft)", category: "Roofing & Ceiling", baseCogs: 360, reorder_point: 30 },
        { item_name: "Pre-Painted Rib-Type Roofing (8ft)", category: "Roofing & Ceiling", baseCogs: 495, reorder_point: 25 },
        { item_name: "HardieFlex Fiber Cement Board 4.5mm", category: "Roofing & Ceiling", baseCogs: 430, reorder_point: 25 },
        { item_name: "THHN Stranded Copper Wire 3.5mm² (150m)", category: "Electrical", baseCogs: 3450, reorder_point: 10 },
        { item_name: "Flexible Electrical Conduit 1/2\" (50m)", category: "Electrical", baseCogs: 390, reorder_point: 15 },
        { item_name: "Acrylic Elastomeric Roof Paint (4L Gal)", category: "Paints & Finishes", baseCogs: 640, reorder_point: 15 },
        { item_name: "Flat Wall Enamel Primer White (4L Gal)", category: "Paints & Finishes", baseCogs: 540, reorder_point: 15 },
        { item_name: "Common Wire Nails 3\" (per kg)", category: "Fasteners & Hardware", baseCogs: 64, reorder_point: 40 },
        { item_name: "Tekscrew 12x45mm for Steel (Box of 100)", category: "Fasteners & Hardware", baseCogs: 155, reorder_point: 25 }
    ];

    const DEMO_SEED_FLAG = 'capso_erp_demo_seeded_v2';

    function buildDemoOrdersAndTransactions(generatedSkus) {
        const priceOf = (name) => {
            const found = generatedSkus.find(s => s.item_name === name);
            return found ? Number(found.retail_price) : 250;
        };

        const makeOrder = (docId, customer_name, address, date, status, rawItems) => {
            const items = rawItems.map(([item_name, qty_ordered]) => ({
                item_name,
                qty_ordered,
                retail_price: priceOf(item_name)
            }));
            const total_value = Number(items.reduce((sum, i) => sum + (i.qty_ordered * i.retail_price), 0).toFixed(2));
            return {
                docId,
                customer_name,
                address,
                date,
                status,
                items,
                total_value,
                stock_deducted: status === 'Out for Delivery' || status === 'Complete'
            };
        };

        const todayStr = getLocalTodayStr();
        const otherWeekDays = [0, 1, 2, 3, 4, 5, 6].map(i => getWeekDayDateStr(i)).filter(d => d !== todayStr);

        const orders = [
            makeOrder(
                'ORD-849210',
                'Sta. Lucia Crest Residences',
                'Cainta Junction Site 3, Rizal',
                todayStr,
                'Pending',
                [
                    ['Marine Plywood 1/2" (4ft x 8ft)', 20],
                    ['Acrylic Elastomeric Roof Paint (4L Gal)', 10]
                ]
            ),
            makeOrder(
                'ORD-849209',
                'Villaruz Civil Works & Dev.',
                'Ortigas Center Exchange Rd., Pasig City',
                todayStr,
                'Out for Delivery',
                [
                    ['THHN Stranded Copper Wire 3.5mm² (150m)', 6],
                    ['PVC Sanitary Orange Pipe 4" x 3m', 30]
                ]
            ),
            makeOrder(
                'ORD-849208',
                'Metro Pacific Builders Corp.',
                'BGC High Street South Block 8, Taguig',
                todayStr,
                'Complete',
                [
                    ['Portland Cement (40kg Bag)', 120],
                    ['Deformed Steel Rebar 16mm x 6m', 60],
                    ['Phenolic Film-Faced Board 3/4" (4x8)', 12]
                ]
            ),
            makeOrder(
                'ORD-849207',
                'Pasay Bayfront Logistics Hub',
                'Macapagal Blvd., Pasay City',
                otherWeekDays[5],
                'Out for Delivery',
                [
                    ['Pre-Painted Rib-Type Roofing (8ft)', 45],
                    ['PVC Blue Water Pipe 3/4" x 3m', 30],
                    ['Brass Ball Valve 1/2" Heavy Duty', 18]
                ]
            ),
            makeOrder(
                'ORD-849206',
                'Cavite Ridge Development',
                'Tagaytay-Nasugbu Hwy, Cavite',
                otherWeekDays[4],
                'Pending',
                [
                    ['Washed River Sand (per cu.m.)', 12],
                    ['Crushed Gravel 3/4" (per cu.m.)', 10]
                ]
            ),
            makeOrder(
                'ORD-849205',
                'Makati Skyline Interiors',
                'Legazpi Village, Makati City',
                otherWeekDays[4],
                'Out for Delivery',
                [
                    ['Flat Wall Enamel Primer White (4L Gal)', 16],
                    ['Marine Plywood 1/4" (4ft x 8ft)', 35],
                    ['PVC Blue Water Pipe 1/2" x 3m', 50]
                ]
            ),
            makeOrder(
                'ORD-849204',
                'Clark Freeport Modular Co.',
                'M.A. Roxas Hwy, Clark, Pampanga',
                otherWeekDays[3],
                'Complete',
                [
                    ['Corrugated GI Roofing Sheet Ga.26 (8ft)', 55],
                    ['HardieFlex Fiber Cement Board 4.5mm', 40]
                ]
            ),
            makeOrder(
                'ORD-849203',
                'Laguna Techpark Contractors',
                'Calamba Industrial Park, Laguna',
                otherWeekDays[2],
                'Scheduled',
                [
                    ['Angle Bar 1/4" x 2" x 6m', 24],
                    ['Tubular Steel 2" x 4" Ga.16 (6m)', 18],
                    ['Tekscrew 12x45mm for Steel (Box of 100)', 15]
                ]
            ),
            makeOrder(
                'ORD-849202',
                'Quezon City Builders Guild',
                'Commonwealth Ave., Diliman, Quezon City',
                otherWeekDays[1],
                'Complete',
                [
                    ['Deformed Steel Rebar 12mm x 6m', 90],
                    ['GI Tie Wire #16 (per kg)', 30]
                ]
            ),
            makeOrder(
                'ORD-849201',
                'Alabang Horizon Estates',
                'Filinvest Ave., Muntinlupa',
                otherWeekDays[0],
                'Complete',
                [
                    ['Pozzolan Cement Type IP (40kg Bag)', 80],
                    ['Concrete Hollow Blocks CHB 4" (per pc)', 600],
                    ['Common Wire Nails 3" (per kg)', 25]
                ]
            )
        ];

        const transactions = [
            { id: 'tx-demo-14', date: getIsoTimestampOffset(0, 13, 30), type: 'Order', reference_id: 'ORD-849209', item_name: 'PVC Sanitary Orange Pipe 4" x 3m', qty_change: -30 },
            { id: 'tx-demo-13', date: getIsoTimestampOffset(0, 10, 6), type: 'Order', reference_id: 'ORD-849208', item_name: 'Deformed Steel Rebar 16mm x 6m', qty_change: -60 },
            { id: 'tx-demo-12', date: getIsoTimestampOffset(0, 10, 5), type: 'Order', reference_id: 'ORD-849208', item_name: 'Portland Cement (40kg Bag)', qty_change: -120 },
            { id: 'tx-demo-11', date: getIsoTimestampOffset(0, 9, 10), type: 'DR', reference_id: 'DR-2026-4842', item_name: 'PVC Sanitary Orange Pipe 4" x 3m', qty_change: 45 },
            { id: 'tx-demo-10', date: getIsoTimestampOffset(0, 8, 20), type: 'Order', reference_id: 'ORD-849207', item_name: 'Pre-Painted Rib-Type Roofing (8ft)', qty_change: -45 },
            { id: 'tx-demo-09', date: getIsoTimestampOffset(0, 7, 45), type: 'DR', reference_id: 'DR-2026-4838', item_name: 'Corrugated GI Roofing Sheet Ga.26 (8ft)', qty_change: 150 },
            { id: 'tx-demo-08', date: getIsoTimestampOffset(-1, 16, 45), type: 'Order', reference_id: 'ORD-849205', item_name: 'PVC Blue Water Pipe 1/2" x 3m', qty_change: -50 },
            { id: 'tx-demo-07', date: getIsoTimestampOffset(-1, 14, 20), type: 'DR', reference_id: 'DR-2026-4831', item_name: 'Deformed Steel Rebar 16mm x 6m', qty_change: 60 },
            { id: 'tx-demo-06', date: getIsoTimestampOffset(-1, 11, 25), type: 'Order', reference_id: 'ORD-849204', item_name: 'Corrugated GI Roofing Sheet Ga.26 (8ft)', qty_change: -55 },
            { id: 'tx-demo-05', date: getIsoTimestampOffset(-2, 15, 5), type: 'Order', reference_id: 'ORD-849202', item_name: 'Deformed Steel Rebar 12mm x 6m', qty_change: -90 },
            { id: 'tx-demo-04', date: getIsoTimestampOffset(-2, 10, 40), type: 'DR', reference_id: 'DR-2026-4825', item_name: 'Marine Plywood 1/2" (4ft x 8ft)', qty_change: 80 },
            { id: 'tx-demo-03', date: getIsoTimestampOffset(-3, 13, 10), type: 'Order', reference_id: 'ORD-849201', item_name: 'Pozzolan Cement Type IP (40kg Bag)', qty_change: -80 },
            { id: 'tx-demo-02', date: getIsoTimestampOffset(-3, 9, 15), type: 'DR', reference_id: 'DR-2026-4819', item_name: 'Deformed Steel Rebar 12mm x 6m', qty_change: 120 },
            { id: 'tx-demo-01', date: getIsoTimestampOffset(-4, 8, 30), type: 'DR', reference_id: 'DR-2026-4812', item_name: 'Portland Cement (40kg Bag)', qty_change: 200 }
        ];

        return { orders, transactions };
    }

    async function seedDemoInventory(silent = false) {
        if (!silent) {
            showToast('Seeding 30 SKUs, outbound orders & DR audit trail...', 'warning');
        }
        try {
            const generatedSkus = HARDWARE_DEMO_CATALOG.map((template, idx) => {
                // Randomize COGS +/- 8%
                const cogsVariance = 0.92 + Math.random() * 0.16;
                const cogs = Math.round(template.baseCogs * cogsVariance * 100) / 100;
                // Randomize Retail Margin between 24% and 42% above COGS
                const markup = 1.24 + Math.random() * 0.18;
                const retail_price = Math.round(cogs * markup * 100) / 100;
                // Make ~8 SKUs low stock (below reorder_point) to showcase alerts
                const isLowStock = idx % 4 === 0;
                const current_stock = isLowStock
                    ? Math.max(2, Math.floor(template.reorder_point * (0.2 + Math.random() * 0.6)))
                    : Math.floor(template.reorder_point * (1.2 + Math.random() * 1.8));

                return {
                    id: `sku-${String(idx + 1).padStart(2, '0')}`,
                    item_name: template.item_name,
                    category: template.category,
                    cogs: cogs,
                    retail_price: retail_price,
                    current_stock: current_stock,
                    reorder_point: template.reorder_point
                };
            });

            const { orders: demoOrders, transactions: demoTransactions } = buildDemoOrdersAndTransactions(generatedSkus);

            // Save all 3 collections to in-memory state & localStorage immediately
            allInventory = generatedSkus.sort((a, b) => a.item_name.localeCompare(b.item_name));
            allOrders = demoOrders.sort((a, b) => (b.date || '').localeCompare(a.date || '') || String(b.docId).localeCompare(String(a.docId)));
            allTransactions = demoTransactions.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

            localStorage.setItem(LS_KEYS.INVENTORY, JSON.stringify(allInventory));
            localStorage.setItem(LS_KEYS.ORDERS, JSON.stringify(allOrders));
            localStorage.setItem(LS_KEYS.TRANSACTIONS, JSON.stringify(allTransactions));
            localStorage.setItem(DEMO_SEED_FLAG, 'true');

            render();

            // Persist all 3 collections to Firestore
            const [existingInv, existingOrd, existingTx] = await Promise.all([
                inventoryCollection.get(),
                ordersCollection.get(),
                transactionsCollection.get()
            ]);
            const batch = db.batch();
            existingInv.docs.forEach(doc => batch.delete(doc.ref));
            existingOrd.docs.forEach(doc => batch.delete(doc.ref));
            existingTx.docs.forEach(doc => batch.delete(doc.ref));

            generatedSkus.forEach(sku => {
                const ref = inventoryCollection.doc(sku.id);
                batch.set(ref, {
                    item_name: sku.item_name,
                    category: sku.category,
                    cogs: sku.cogs,
                    retail_price: sku.retail_price,
                    current_stock: sku.current_stock,
                    reorder_point: sku.reorder_point
                });
            });

            demoOrders.forEach(order => {
                const ref = ordersCollection.doc(order.docId);
                batch.set(ref, {
                    customer_name: order.customer_name,
                    address: order.address,
                    date: order.date,
                    status: order.status,
                    items: order.items,
                    total_value: order.total_value,
                    stock_deducted: order.stock_deducted
                });
            });

            demoTransactions.forEach(tx => {
                const ref = transactionsCollection.doc(tx.id);
                batch.set(ref, {
                    date: tx.date,
                    type: tx.type,
                    reference_id: tx.reference_id,
                    item_name: tx.item_name,
                    qty_change: tx.qty_change
                });
            });

            await batch.commit();

            if (!silent) {
                showToast('Demo workspace populated: 30 SKUs, 10 Orders & 14 DR/Order Audit Logs!');
            }
        } catch (err) {
            console.warn('Firestore batch fallback to local storage during demo seed:', err);
            render();
            if (!silent) {
                showToast('Demo workspace populated (30 SKUs, 10 Orders, 14 Audit Logs cached locally).');
            }
        }
    }

    // Expose globally for console or external triggers
    window.seedDemoInventory = seedDemoInventory;
    window.initializeDemoData = seedDemoInventory;

    if (navSeedDemoBtn) {
        navSeedDemoBtn.addEventListener('click', () => seedDemoInventory(false));
    }

    // =================================================================
    // DATA FETCHING & NORMALIZATION
    // =================================================================
    function normalizeInventoryDoc(id, data) {
        const cogs = typeof data.cogs === 'number' ? data.cogs : (Number(data.cogs) || Number(data.unitPrice || 100) * 0.75);
        const retail_price = typeof data.retail_price === 'number' ? data.retail_price : (Number(data.retail_price) || Number(data.unitPrice) || 135);
        const current_stock = typeof data.current_stock === 'number' ? data.current_stock : (Number(data.current_stock) ?? 25);
        const reorder_point = typeof data.reorder_point === 'number' ? data.reorder_point : (Number(data.reorder_point) || 20);
        return {
            id: id,
            item_name: data.item_name || data.itemName || 'Unnamed Hardware SKU',
            category: data.category || 'General Hardware',
            cogs: Number(cogs.toFixed(2)),
            retail_price: Number(retail_price.toFixed(2)),
            current_stock: Number(current_stock),
            reorder_point: Number(reorder_point)
        };
    }

    function normalizeOrderDoc(docId, data) {
        const rawItems = Array.isArray(data.items) ? data.items : [];
        const normalizedItems = rawItems.map(i => {
            const itemName = i.item_name || i.item || 'Hardware Item';
            const qtyOrdered = Number(i.qty_ordered ?? i.quantity ?? 1);
            let retailPrice = Number(i.retail_price ?? i.price ?? 0);
            if (!retailPrice && allInventory.length) {
                const match = allInventory.find(sku => sku.item_name === itemName);
                if (match) retailPrice = match.retail_price;
            }
            return {
                item_name: itemName,
                qty_ordered: qtyOrdered,
                retail_price: retailPrice
            };
        });

        const calculatedTotal = normalizedItems.reduce((sum, i) => sum + (i.qty_ordered * i.retail_price), 0);
        const totalValue = typeof data.total_value === 'number' ? data.total_value : (Number(data.total_value) || calculatedTotal);
        const dateStr = normalizeDateStr(data.date || data.scheduledDate || data.dateCreated) || getLocalTodayStr();
        const status = normalizeStatus(data.status);

        return {
            docId: docId,
            customer_name: data.customer_name || data.customer || 'Walk-in Customer',
            address: data.address || 'Standard Pickup / Site Delivery',
            date: dateStr,
            status: status,
            items: normalizedItems,
            total_value: totalValue,
            stock_deducted: Boolean(data.stock_deducted || isDeductingStatus(status))
        };
    }

    async function fetchData() {
        showSkeleton(true);
        try {
            // Auto-populate realistic demo data on first launch of v2 demo build
            if (localStorage.getItem(DEMO_SEED_FLAG) !== 'true') {
                await seedDemoInventory(true);
                return;
            }

            // 1. Load Inventory
            let invItems = [];
            try {
                const invSnap = await inventoryCollection.get();
                const hasErpSchema = invSnap.docs.some(d => d.data().item_name !== undefined && d.data().retail_price !== undefined);
                if (invSnap.empty || !hasErpSchema) {
                    await seedDemoInventory(true);
                    return;
                } else {
                    invItems = invSnap.docs.map(doc => normalizeInventoryDoc(doc.id, doc.data()));
                    localStorage.setItem(LS_KEYS.INVENTORY, JSON.stringify(invItems));
                }
            } catch (invErr) {
                console.warn("Inventory Firestore read fallback:", invErr);
                const cachedInv = JSON.parse(localStorage.getItem(LS_KEYS.INVENTORY) || '[]');
                if (cachedInv.length) {
                    invItems = cachedInv;
                } else {
                    await seedDemoInventory(true);
                    return;
                }
            }
            allInventory = invItems.sort((a, b) => a.item_name.localeCompare(b.item_name));

            // 2. Load Orders
            try {
                const ordSnap = await ordersCollection.get();
                allOrders = ordSnap.docs.map(doc => normalizeOrderDoc(doc.id, doc.data()));
                allOrders.sort((a, b) => (b.date || '').localeCompare(a.date || '') || String(b.docId).localeCompare(String(a.docId)));
                localStorage.setItem(LS_KEYS.ORDERS, JSON.stringify(allOrders));
            } catch (ordErr) {
                console.warn("Orders Firestore read fallback:", ordErr);
                allOrders = JSON.parse(localStorage.getItem(LS_KEYS.ORDERS) || '[]');
            }

            // 3. Load Transactions (Audit Trail)
            try {
                const txSnap = await transactionsCollection.get();
                allTransactions = txSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                allTransactions.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
                localStorage.setItem(LS_KEYS.TRANSACTIONS, JSON.stringify(allTransactions));
            } catch (txErr) {
                console.warn("Transactions Firestore read fallback:", txErr);
                allTransactions = JSON.parse(localStorage.getItem(LS_KEYS.TRANSACTIONS) || '[]');
            }

            // If both orders and audit transactions are completely empty, seed demo dataset
            if (allOrders.length === 0 && allTransactions.length === 0) {
                await seedDemoInventory(true);
                return;
            }

            render();
        } catch (e) {
            console.error("Error loading ERP data:", e);
        } finally {
            showSkeleton(false);
        }
    }

    // =================================================================
    // AUDIT TRAIL & STOCK ADJUSTMENT ENGINE
    // =================================================================
    async function recordStockTransaction({ type, reference_id, item_name, qty_change }) {
        const txRecord = {
            date: new Date().toISOString(),
            type: type, // 'DR' or 'Order'
            reference_id: String(reference_id),
            item_name: item_name,
            qty_change: Number(qty_change)
        };

        // Prepend to local state & cache
        allTransactions.unshift(txRecord);
        localStorage.setItem(LS_KEYS.TRANSACTIONS, JSON.stringify(allTransactions));

        try {
            await transactionsCollection.add(txRecord);
        } catch (err) {
            console.warn('Transaction logged to local storage fallback:', err);
        }
    }

    async function deductOrderInventory(order, referenceId) {
        if (!order.items || !order.items.length) return;

        for (const orderedItem of order.items) {
            const qtyToDeduct = Math.abs(Number(orderedItem.qty_ordered) || 0);
            if (qtyToDeduct <= 0) continue;

            const sku = allInventory.find(i => i.item_name === orderedItem.item_name);
            if (sku) {
                sku.current_stock = Math.max(0, Number(sku.current_stock) - qtyToDeduct);
                try {
                    await inventoryCollection.doc(sku.id).update({
                        current_stock: sku.current_stock
                    });
                } catch (err) {
                    console.warn(`Inventory deduction fallback for ${sku.item_name}:`, err);
                }
            }

            await recordStockTransaction({
                type: 'Order',
                reference_id: referenceId,
                item_name: orderedItem.item_name,
                qty_change: -qtyToDeduct
            });
        }

        localStorage.setItem(LS_KEYS.INVENTORY, JSON.stringify(allInventory));
    }

    async function restoreOrderInventory(order, referenceId) {
        if (!order.items || !order.items.length) return;

        for (const orderedItem of order.items) {
            const qtyToRestore = Math.abs(Number(orderedItem.qty_ordered) || 0);
            if (qtyToRestore <= 0) continue;

            const sku = allInventory.find(i => i.item_name === orderedItem.item_name);
            if (sku) {
                sku.current_stock = Number(sku.current_stock) + qtyToRestore;
                try {
                    await inventoryCollection.doc(sku.id).update({
                        current_stock: sku.current_stock
                    });
                } catch (err) {
                    console.warn(`Inventory restore fallback for ${sku.item_name}:`, err);
                }
            }

            await recordStockTransaction({
                type: 'Order',
                reference_id: `${referenceId} (Restocked)`,
                item_name: orderedItem.item_name,
                qty_change: qtyToRestore
            });
        }

        localStorage.setItem(LS_KEYS.INVENTORY, JSON.stringify(allInventory));
    }

    // =================================================================
    // UI RENDERERS (KPIs, ORDERS, CALENDAR, AUDIT TRAIL)
    // =================================================================
    function showSkeleton(show) {
        if (skeletonLoader) skeletonLoader.classList.toggle('hidden', !show);
        if (ordersListContainer) ordersListContainer.classList.toggle('hidden', show);
    }

    function render() {
        renderKPIs();
        renderOrdersList();
        renderCalendar();
        renderDashboardTransactions();
    }

    function renderKPIs() {
        const todayStr = getLocalTodayStr();

        // 1. Total Sales (Today)
        const todaysValidOrders = allOrders.filter(o =>
            normalizeDateStr(o.date) === todayStr && normalizeStatus(o.status) !== 'Canceled'
        );
        const totalSalesToday = todaysValidOrders.reduce((sum, o) => sum + (Number(o.total_value) || 0), 0);
        if (kpiTotalSales) kpiTotalSales.textContent = formatCurrency(totalSalesToday);
        if (kpiSalesSubtext) {
            kpiSalesSubtext.textContent = `${todaysValidOrders.length} order${todaysValidOrders.length === 1 ? '' : 's'} today`;
        }

        // 2. Pending Dispatches
        const pendingOrders = allOrders.filter(o => {
            const st = normalizeStatus(o.status);
            return st === 'Pending' || st === 'Scheduled' || st === 'Out for Delivery';
        });
        if (kpiPendingDispatches) kpiPendingDispatches.textContent = String(pendingOrders.length);
        if (kpiDispatchesSubtext) {
            const inTransit = pendingOrders.filter(o => normalizeStatus(o.status) === 'Out for Delivery').length;
            kpiDispatchesSubtext.textContent = inTransit > 0
                ? `${inTransit} currently Out for Delivery`
                : 'Awaiting dispatch';
        }

        // 3. Low Stock Alerts
        const lowStockCount = allInventory.filter(item => Number(item.current_stock) < Number(item.reorder_point)).length;
        if (kpiLowStock) {
            kpiLowStock.textContent = String(lowStockCount);
            kpiLowStock.className = lowStockCount > 0
                ? 'font-mono text-3xl sm:text-4xl font-bold tracking-tight text-rose-400 tabular-nums'
                : 'font-mono text-3xl sm:text-4xl font-bold tracking-tight text-emerald-400 tabular-nums';
        }
    }

    function renderOrdersList() {
        if (!ordersListContainer) return;

        const filtered = allOrders.filter(o => {
            if (!o) return false;
            const st = normalizeStatus(o.status);
            if (currentFilter === 'All') return true;
            if (currentFilter === 'Active') return ['Pending', 'Scheduled', 'Out for Delivery'].includes(st);
            return st.toLowerCase() === currentFilter.toLowerCase();
        });

        const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
        if (currentPage > totalPages) currentPage = 1;
        const paginated = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

        if (paginated.length === 0) {
            ordersListContainer.innerHTML = `
                <div class="rounded-2xl bg-zinc-900/90 p-10 text-center shadow-panel ring-1 ring-zinc-800">
                    <p class="text-sm font-medium text-zinc-200">No outbound orders match this filter.</p>
                    <p class="mt-1 text-xs text-zinc-400">Click "Add New Order" above to create a customer dispatch order.</p>
                </div>
            `;
            if (paginationContainer) paginationContainer.innerHTML = '';
            return;
        }

        ordersListContainer.innerHTML = paginated.map(order => {
            const itemSummary = (order.items || [])
                .map(i => `${i.qty_ordered}× ${i.item_name}`)
                .join(', ') || 'No items specified';

            const statuses = ['Pending', 'Scheduled', 'Out for Delivery', 'Complete', 'Canceled'];
            const normStatus = normalizeStatus(order.status);

            return `
                <div class="bg-zinc-900/90 rounded-2xl shadow-panel ring-1 ring-zinc-800 hover:ring-zinc-700 hover:bg-zinc-900 transition-all overflow-hidden">
                    <div class="p-5 sm:p-6">
                        <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div class="min-w-0 flex-1">
                                <div class="flex flex-wrap items-center gap-2 mb-1.5">
                                    <span class="text-xs font-mono font-semibold text-amber-300/90">REF #${order.docId}</span>
                                    <span class="text-zinc-600">&bull;</span>
                                    <span class="text-xs font-medium text-zinc-400">Scheduled: ${order.date || 'Unscheduled'}</span>
                                    ${order.stock_deducted ? `<span class="inline-flex items-center rounded bg-emerald-400/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300 ring-1 ring-inset ring-emerald-400/25">Stock Deducted</span>` : ''}
                                </div>
                                <h3 class="text-xl font-bold text-zinc-100 truncate">${order.customer_name}</h3>
                                <p class="text-sm text-zinc-400 truncate mt-0.5">${order.address}</p>
                                <p class="text-sm text-zinc-300 mt-2 line-clamp-1"><strong class="font-semibold text-zinc-200">SKUs:</strong> ${itemSummary}</p>
                            </div>
                            <div class="flex sm:flex-col items-center sm:items-end justify-between gap-2 flex-shrink-0">
                                <div class="text-right">
                                    <p class="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Total Value</p>
                                    <p class="font-mono text-xl font-bold text-zinc-100 tabular-nums">${formatCurrency(order.total_value)}</p>
                                </div>
                                <div>${getStatusBadgeHtml(normStatus)}</div>
                            </div>
                        </div>
                    </div>
                    <div class="px-5 py-3 sm:px-6 bg-zinc-950/60 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                        <div class="flex items-center gap-2">
                            <label class="text-xs font-semibold text-zinc-400">Quick Status:</label>
                            <select class="quick-status-select rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-100 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400" data-doc-id="${order.docId}">
                                ${statuses.map(st => `<option value="${st}" ${st === normStatus ? 'selected' : ''}>${st}</option>`).join('')}
                            </select>
                        </div>
                        <button class="view-details-btn rounded-lg bg-zinc-800 px-3.5 py-1.5 text-xs font-semibold text-zinc-100 shadow-sm ring-1 ring-inset ring-zinc-700 hover:bg-zinc-700 hover:text-amber-300 transition-colors" data-doc-id="${order.docId}">
                            View / Edit Order &rarr;
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Render pagination if needed
        if (paginationContainer) {
            if (totalPages <= 1) {
                paginationContainer.innerHTML = '';
            } else {
                let pageHtml = '';
                for (let p = 1; p <= totalPages; p++) {
                    const active = p === currentPage;
                    pageHtml += `<button data-page="${p}" class="page-btn rounded-lg px-3 py-1.5 text-xs font-semibold ${active ? 'bg-amber-400 text-zinc-950 shadow-glow-amber' : 'bg-zinc-900 text-zinc-300 ring-1 ring-inset ring-zinc-800 hover:bg-zinc-800 hover:text-white'}">${p}</button>`;
                }
                paginationContainer.innerHTML = pageHtml;
            }
        }
    }

    function renderDashboardTransactions() {
        if (!dashboardTransactionsBody) return;
        const recent = allTransactions.slice(0, 8);
        if (recent.length === 0) {
            dashboardTransactionsBody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-8 text-center text-sm text-zinc-400">
                        No inventory transactions recorded yet. Dispatch an order or process a Delivery Receipt to generate audit logs.
                    </td>
                </tr>
            `;
            return;
        }

        dashboardTransactionsBody.innerHTML = recent.map(tx => {
            const isDr = String(tx.type).toUpperCase() === 'DR';
            const qty = Number(tx.qty_change) || 0;
            const formattedDate = tx.date ? new Date(tx.date).toLocaleString() : 'N/A';
            const typeBadge = isDr
                ? `<span class="inline-flex items-center rounded-md bg-emerald-400/10 px-2 py-0.5 text-xs font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-400/30">DR (Inbound)</span>`
                : `<span class="inline-flex items-center rounded-md bg-amber-400/10 px-2 py-0.5 text-xs font-semibold text-amber-300 ring-1 ring-inset ring-amber-400/30">Order (Outbound)</span>`;
            const qtyDisplay = qty > 0 ? `+${qty}` : `${qty}`;
            const qtyColor = qty > 0 ? 'text-emerald-400 font-mono font-bold tabular-nums' : 'text-rose-400 font-mono font-bold tabular-nums';

            return `
                <tr class="odd:bg-zinc-900/40 even:bg-zinc-950/30 hover:bg-zinc-800/60 transition-colors">
                    <td class="px-6 py-3.5 whitespace-nowrap font-mono text-sm text-zinc-400">${formattedDate}</td>
                    <td class="px-6 py-3.5 whitespace-nowrap">${typeBadge}</td>
                    <td class="px-6 py-3.5 whitespace-nowrap font-mono text-sm font-semibold text-amber-300">${tx.reference_id || 'N/A'}</td>
                    <td class="px-6 py-3.5 whitespace-nowrap text-base font-medium text-zinc-100">${tx.item_name || 'N/A'}</td>
                    <td class="px-6 py-3.5 whitespace-nowrap text-right text-base ${qtyColor}">${qtyDisplay}</td>
                </tr>
            `;
        }).join('');
    }

    // =================================================================
    // CALENDAR RENDERER
    // =================================================================
    function getStartOfWeek(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    function renderCalendar() {
        if (!calendarGrid || !currentWeekDisplay) return;
        const start = getStartOfWeek(calendarDate);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);

        currentWeekDisplay.textContent = `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

        const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            return d;
        });

        calendarGrid.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3';
        const todayStr = getLocalTodayStr();

        calendarGrid.innerHTML = days.map(day => {
            const year = day.getFullYear();
            const month = String(day.getMonth() + 1).padStart(2, '0');
            const dateNum = String(day.getDate()).padStart(2, '0');
            const dayStr = `${year}-${month}-${dateNum}`;
            const isToday = dayStr === todayStr;

            const ordersToday = allOrders.filter(o => normalizeDateStr(o.date) === dayStr);
            const listHtml = ordersToday.map(o => {
                const norm = normalizeStatus(o.status);
                const dotColor = norm === 'Complete'
                    ? 'bg-emerald-400'
                    : norm === 'Out for Delivery'
                        ? 'bg-violet-400'
                        : norm === 'Canceled'
                            ? 'bg-zinc-500'
                            : 'bg-amber-400';
                return `
                    <li class="calendar-order-item cursor-pointer rounded-lg bg-zinc-800/90 p-2.5 shadow-sm ring-1 ring-zinc-700/80 hover:bg-zinc-800 hover:ring-amber-400/50 transition-all text-xs sm:text-sm" data-doc-id="${o.docId}">
                        <div class="flex items-center gap-1.5 font-semibold text-zinc-100 truncate">
                            <span class="h-2 w-2 rounded-full flex-shrink-0 ${dotColor}"></span>
                            <span class="truncate">${o.customer_name}</span>
                        </div>
                        <div class="mt-1 flex justify-between text-xs text-zinc-400">
                            <span class="truncate pr-1">${norm}</span>
                            <span class="font-mono font-semibold text-amber-300 tabular-nums">${formatCurrency(o.total_value)}</span>
                        </div>
                    </li>
                `;
            }).join('');

            return `
                <div class="rounded-xl p-3 min-h-[135px] flex flex-col ${isToday ? 'bg-zinc-900 ring-2 ring-amber-400/80 shadow-glow-amber' : 'bg-zinc-900/70 ring-1 ring-zinc-800'}">
                    <div class="flex items-center justify-between mb-2 pb-1.5 border-b border-zinc-800">
                        <span class="text-xs font-semibold uppercase tracking-wider ${isToday ? 'text-amber-300' : 'text-zinc-400'}">${day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                        <span class="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${isToday ? 'bg-amber-400 text-zinc-950' : 'bg-zinc-800 text-zinc-200'}">${day.getDate()}</span>
                    </div>
                    <ul class="space-y-1.5 flex-1">
                        ${listHtml || '<li class="text-[11px] text-zinc-500 text-center py-6">No dispatches</li>'}
                    </ul>
                </div>
            `;
        }).join('');
    }

    // =================================================================
    // ORDER MODAL & DYNAMIC INVENTORY <select> DROPDOWN
    // =================================================================
    function setModalMode(mode) {
        const displayView = document.getElementById('order-display-view');
        const editView = document.getElementById('order-edit-view');
        const viewBtns = document.getElementById('order-view-buttons');
        const editBtns = document.getElementById('order-edit-buttons');

        if (mode === 'edit') {
            displayView?.classList.add('hidden');
            editView?.classList.remove('hidden');
            viewBtns?.classList.add('hidden');
            editBtns?.classList.remove('hidden');
        } else {
            displayView?.classList.remove('hidden');
            editView?.classList.add('hidden');
            viewBtns?.classList.remove('hidden');
            editBtns?.classList.add('hidden');
        }
    }

    function closeModal() {
        if (orderModal) orderModal.classList.add('hidden');
    }

    function buildInventorySelectOptions(selectedItemName = '') {
        let optionsHtml = `<option value="">-- Select SKU from Inventory --</option>`;
        allInventory.forEach(sku => {
            const isSelected = sku.item_name === selectedItemName ? 'selected' : '';
            optionsHtml += `<option value="${sku.item_name.replace(/"/g, '&quot;')}" data-price="${sku.retail_price}" data-stock="${sku.current_stock}" ${isSelected}>${sku.item_name} (Stock: ${sku.current_stock})</option>`;
        });
        // If editing an order with a legacy item not in current inventory list, preserve it
        if (selectedItemName && !allInventory.some(s => s.item_name === selectedItemName)) {
            optionsHtml += `<option value="${selectedItemName.replace(/"/g, '&quot;')}" data-price="0" data-stock="0" selected>${selectedItemName} (Stock: 0)</option>`;
        }
        return optionsHtml;
    }

    function updateModalOrderTotal() {
        const totalEl = document.getElementById('modal-order-total');
        if (!totalEl) return;
        let sum = 0;
        document.querySelectorAll('#items-container .order-item-row').forEach(row => {
            const selectEl = row.querySelector('.item-select');
            const qtyEl = row.querySelector('.item-qty-input');
            const priceBadge = row.querySelector('.item-line-price');
            const selectedOpt = selectEl?.options[selectEl.selectedIndex];
            const unitPrice = parseFloat(selectedOpt?.dataset?.price || row.dataset.customPrice || '0') || 0;
            const qty = Math.max(0, parseInt(qtyEl?.value || '0', 10) || 0);
            const lineTotal = unitPrice * qty;
            sum += lineTotal;
            if (priceBadge) {
                priceBadge.textContent = formatCurrency(lineTotal);
            }
        });
        totalEl.textContent = formatCurrency(sum);
    }

    function addEditableItemRow(itemName = '', qtyOrdered = 1, customRetailPrice = null) {
        const itemsContainer = document.getElementById('items-container');
        if (!itemsContainer) return;

        const row = document.createElement('div');
        row.className = 'order-item-row flex w-full flex-col sm:flex-row items-stretch sm:items-center gap-2 overflow-hidden rounded-lg bg-zinc-900/90 p-2.5 ring-1 ring-inset ring-zinc-800';
        if (customRetailPrice !== null) {
            row.dataset.customPrice = String(customRetailPrice);
        }

        row.innerHTML = `
            <select class="item-select block min-w-0 w-full sm:flex-1 truncate rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 shadow-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400">
                ${buildInventorySelectOptions(itemName)}
            </select>
            <div class="flex flex-shrink-0 items-center justify-between sm:justify-start gap-2">
                <input type="number" min="1" placeholder="Qty" value="${qtyOrdered || 1}" class="item-qty-input block w-20 flex-shrink-0 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-2 text-center font-mono text-sm font-semibold text-zinc-100 shadow-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400">
                <span class="item-line-price min-w-[85px] text-right font-mono text-xs font-semibold text-amber-300 tabular-nums">₱0.00</span>
                <button type="button" class="remove-item-btn flex-shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-rose-500/15 hover:text-rose-300 transition-colors" title="Remove Item">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        `;

        const selectEl = row.querySelector('.item-select');
        const qtyEl = row.querySelector('.item-qty-input');

        selectEl.addEventListener('change', () => {
            delete row.dataset.customPrice;
            updateModalOrderTotal();
        });
        qtyEl.addEventListener('input', updateModalOrderTotal);

        itemsContainer.appendChild(row);
        updateModalOrderTotal();
    }

    function populateEditView(order = {}) {
        document.getElementById('customer-name').value = order.customer_name || '';
        document.getElementById('customer-address').value = order.address || '';
        document.getElementById('schedule-date').value = normalizeDateStr(order.date) || getLocalTodayStr();
        document.getElementById('status').value = normalizeStatus(order.status || 'Pending');

        const itemsContainer = document.getElementById('items-container');
        if (itemsContainer) itemsContainer.innerHTML = '';

        if (order.items && order.items.length) {
            order.items.forEach(i => addEditableItemRow(i.item_name, i.qty_ordered, i.retail_price));
        } else {
            addEditableItemRow('', 1);
        }
        updateModalOrderTotal();
    }

    function populateDisplayView(order) {
        document.getElementById('display-order-id').textContent = `#${order.docId}`;
        document.getElementById('display-customer-name').textContent = order.customer_name || 'N/A';
        document.getElementById('display-customer-address').textContent = order.address || 'N/A';
        document.getElementById('display-schedule-date').textContent = order.date || 'Not Scheduled';
        document.getElementById('display-status').innerHTML = getStatusBadgeHtml(order.status);
        document.getElementById('display-total-value').textContent = formatCurrency(order.total_value);

        const listContainer = document.getElementById('display-items-list');
        if (!listContainer) return;

        if (order.items && order.items.length) {
            listContainer.innerHTML = order.items.map(i => {
                const subtotal = (Number(i.qty_ordered) || 0) * (Number(i.retail_price) || 0);
                return `
                    <div class="flex items-center justify-between px-4 py-2.5">
                        <div>
                            <p class="font-medium text-zinc-100">${i.item_name}</p>
                            <p class="font-mono text-xs text-zinc-400">${i.qty_ordered} × ${formatCurrency(i.retail_price)}</p>
                        </div>
                        <span class="font-mono font-semibold text-amber-300 tabular-nums">${formatCurrency(subtotal)}</span>
                    </div>
                `;
            }).join('');
        } else {
            listContainer.innerHTML = `<div class="p-4 text-center text-zinc-400">No items listed.</div>`;
        }
    }

    function openModal(isNew, order = {}) {
        currentOrderInModal = order;
        document.getElementById('modal-title').textContent = isNew ? 'Add New Outbound Order' : `Order #${order.docId} Details`;
        setModalMode(isNew ? 'edit' : 'view');
        populateEditView(order);
        if (!isNew) populateDisplayView(order);
        document.getElementById('save-new-order-btn').classList.toggle('hidden', !isNew);
        document.getElementById('save-changes-btn').classList.toggle('hidden', isNew);
        if (orderModal) orderModal.classList.remove('hidden');
    }

    function getOrderDataFromModal() {
        const customer_name = document.getElementById('customer-name').value.trim();
        const address = document.getElementById('customer-address').value.trim();
        const date = document.getElementById('schedule-date').value || getLocalTodayStr();
        const status = normalizeStatus(document.getElementById('status').value || 'Pending');
        const items = [];

        document.querySelectorAll('#items-container .order-item-row').forEach(row => {
            const selectEl = row.querySelector('.item-select');
            const qtyEl = row.querySelector('.item-qty-input');
            const item_name = selectEl?.value?.trim() || '';
            const qty_ordered = parseInt(qtyEl?.value || '0', 10) || 0;
            const selectedOpt = selectEl?.options[selectEl.selectedIndex];
            const retail_price = parseFloat(selectedOpt?.dataset?.price || row.dataset.customPrice || '0') || 0;

            if (item_name && qty_ordered > 0) {
                items.push({
                    item_name,
                    qty_ordered,
                    retail_price
                });
            }
        });

        const total_value = Number(items.reduce((sum, i) => sum + (i.qty_ordered * i.retail_price), 0).toFixed(2));

        return {
            customer_name,
            address,
            date,
            status,
            items,
            total_value
        };
    }

    async function handleSave(isNew) {
        const payload = getOrderDataFromModal();
        if (!payload.customer_name) {
            showToast('Customer name is required.', 'error');
            return;
        }
        if (payload.items.length === 0) {
            showToast('Please select at least one SKU item and quantity.', 'error');
            return;
        }

        try {
            let orderDocId = isNew
                ? `ORD-${Date.now().toString().slice(-6)}`
                : currentOrderInModal.docId;

            const wasAlreadyDeducted = !isNew && (
                Boolean(currentOrderInModal.stock_deducted) ||
                isDeductingStatus(currentOrderInModal.status)
            );
            const isNowDeducting = isDeductingStatus(payload.status);
            const shouldDeductNow = isNowDeducting && !wasAlreadyDeducted;
            const shouldRestoreNow = !isNowDeducting && wasAlreadyDeducted;

            const firestoreDoc = {
                customer_name: payload.customer_name,
                address: payload.address,
                date: payload.date,
                status: payload.status,
                items: payload.items,
                total_value: payload.total_value,
                stock_deducted: isNowDeducting
            };

            try {
                if (isNew) {
                    await ordersCollection.doc(String(orderDocId)).set(firestoreDoc);
                } else {
                    await ordersCollection.doc(String(orderDocId)).update(firestoreDoc);
                }
            } catch (fireErr) {
                console.warn("Order write fallback to local cache:", fireErr);
            }

            if (shouldDeductNow) {
                await deductOrderInventory(firestoreDoc, orderDocId);
                showToast(`Order #${orderDocId} saved & stock deducted from inventory!`);
            } else if (shouldRestoreNow) {
                await restoreOrderInventory(currentOrderInModal, orderDocId);
                showToast(`Order #${orderDocId} marked "${payload.status}" — stock returned to inventory!`);
            } else {
                showToast(`Order #${orderDocId} saved successfully.`);
            }

            // Update in-memory list
            const existingIdx = allOrders.findIndex(o => String(o.docId) === String(orderDocId));
            const updatedRecord = { docId: String(orderDocId), ...firestoreDoc };
            if (existingIdx >= 0) {
                allOrders[existingIdx] = updatedRecord;
            } else {
                allOrders.unshift(updatedRecord);
            }
            localStorage.setItem(LS_KEYS.ORDERS, JSON.stringify(allOrders));

            render();
            closeModal();
        } catch (err) {
            console.error("Failed to save order:", err);
            showToast('Failed to save order.', 'error');
        }
    }

    async function handleQuickStatusChange(docId, newStatus) {
        const order = allOrders.find(o => String(o.docId) === String(docId));
        if (!order) return;

        const normNew = normalizeStatus(newStatus);
        const wasDeducted = Boolean(order.stock_deducted) || isDeductingStatus(order.status);
        const isNowDeducting = isDeductingStatus(normNew);
        const shouldDeductNow = isNowDeducting && !wasDeducted;
        const shouldRestoreNow = !isNowDeducting && wasDeducted;

        order.status = normNew;
        order.stock_deducted = isNowDeducting;

        try {
            await ordersCollection.doc(String(docId)).update({
                status: order.status,
                stock_deducted: order.stock_deducted
            });
        } catch (err) {
            console.warn("Quick status update local fallback:", err);
        }

        if (shouldDeductNow) {
            await deductOrderInventory(order, docId);
            showToast(`Order #${docId} marked "${normNew}" — inventory stock deducted & logged!`);
        } else if (shouldRestoreNow) {
            await restoreOrderInventory(order, docId);
            showToast(`Order #${docId} marked "${normNew}" — stock returned to inventory & logged!`);
        } else {
            showToast(`Order #${docId} status updated to "${normNew}".`);
        }

        localStorage.setItem(LS_KEYS.ORDERS, JSON.stringify(allOrders));
        render();
    }

    async function handleDelete() {
        if (!currentOrderInModal) return;
        const targetId = String(currentOrderInModal.docId);
        try {
            try {
                await ordersCollection.doc(targetId).delete();
            } catch (e) {
                console.warn("Delete order fallback:", e);
            }
            allOrders = allOrders.filter(o => String(o.docId) !== targetId);
            localStorage.setItem(LS_KEYS.ORDERS, JSON.stringify(allOrders));
            if (confirmDeleteModal) confirmDeleteModal.classList.add('hidden');
            closeModal();
            render();
            showToast(`Order #${targetId} deleted.`);
        } catch (err) {
            console.error("Delete failed:", err);
            showToast('Delete failed.', 'error');
        }
    }

    // =================================================================
    // INBOUND LOGISTICS: PROCESS DELIVERY RECEIPT (DR) MODAL
    // =================================================================
    function addDrItemRow(selectedSkuName = '', qty = 10) {
        const container = document.getElementById('dr-items-container');
        if (!container) return;
        const row = document.createElement('div');
        row.className = 'dr-item-row flex w-full items-center gap-2 overflow-hidden rounded-lg bg-zinc-900/90 p-2.5 ring-1 ring-inset ring-zinc-800';
        row.innerHTML = `
            <select class="dr-sku-select block min-w-0 flex-1 truncate rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400">
                ${buildInventorySelectOptions(selectedSkuName)}
            </select>
            <input type="number" min="1" value="${qty}" placeholder="Qty Received" class="dr-qty-input block w-20 sm:w-24 flex-shrink-0 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-2 text-center font-mono text-sm font-semibold text-zinc-100 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400">
            <button type="button" class="remove-dr-row-btn flex-shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-rose-500/15 hover:text-rose-300" title="Remove row">&times;</button>
        `;
        container.appendChild(row);
    }

    function openDrModal() {
        if (!drModal) return;
        document.getElementById('dr-reference-id').value = `DR-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;
        document.getElementById('dr-date').value = getLocalTodayStr();
        const container = document.getElementById('dr-items-container');
        if (container) {
            container.innerHTML = '';
            addDrItemRow('', 20);
        }
        drModal.classList.remove('hidden');
    }

    function closeDrModal() {
        if (drModal) drModal.classList.add('hidden');
    }

    async function handleProcessDeliveryReceipt() {
        const refId = document.getElementById('dr-reference-id')?.value?.trim();
        if (!refId) {
            showToast('Please enter a Delivery Receipt (DR) Reference Number.', 'error');
            return;
        }

        const rows = document.querySelectorAll('#dr-items-container .dr-item-row');
        const entries = [];
        rows.forEach(r => {
            const itemName = r.querySelector('.dr-sku-select')?.value?.trim();
            const qtyAdded = parseInt(r.querySelector('.dr-qty-input')?.value || '0', 10);
            if (itemName && qtyAdded > 0) {
                entries.push({ item_name: itemName, qty_added: qtyAdded });
            }
        });

        if (entries.length === 0) {
            showToast('Please select at least one SKU and a valid quantity to add.', 'error');
            return;
        }

        for (const entry of entries) {
            const sku = allInventory.find(i => i.item_name === entry.item_name);
            if (sku) {
                sku.current_stock = Number(sku.current_stock) + entry.qty_added;
                try {
                    await inventoryCollection.doc(sku.id).update({
                        current_stock: sku.current_stock
                    });
                } catch (err) {
                    console.warn(`DR stock update fallback for ${sku.item_name}:`, err);
                }
            }

            await recordStockTransaction({
                type: 'DR',
                reference_id: refId,
                item_name: entry.item_name,
                qty_change: entry.qty_added
            });
        }

        localStorage.setItem(LS_KEYS.INVENTORY, JSON.stringify(allInventory));
        closeDrModal();
        render();
        showToast(`Processed ${refId}: Added stock for ${entries.length} SKU(s) & logged audit transaction!`);
    }

    // =================================================================
    // EVENT HANDLERS
    // =================================================================
    if (addNewOrderBtn) addNewOrderBtn.addEventListener('click', () => openModal(true));
    if (openDrModalBtn) openDrModalBtn.addEventListener('click', openDrModal);

    if (ordersListContainer) {
        ordersListContainer.addEventListener('click', e => {
            const btn = e.target.closest('.view-details-btn');
            if (!btn) return;
            const order = allOrders.find(o => String(o.docId) === String(btn.dataset.docId));
            if (order) openModal(false, order);
        });

        ordersListContainer.addEventListener('change', e => {
            const select = e.target.closest('.quick-status-select');
            if (!select) return;
            handleQuickStatusChange(select.dataset.docId, select.value);
        });
    }

    if (calendarGrid) {
        calendarGrid.addEventListener('click', e => {
            const item = e.target.closest('.calendar-order-item');
            if (!item) return;
            const order = allOrders.find(o => String(o.docId) === String(item.dataset.docId));
            if (order) openModal(false, order);
        });
    }

    if (paginationContainer) {
        paginationContainer.addEventListener('click', e => {
            const btn = e.target.closest('.page-btn');
            if (!btn) return;
            currentPage = parseInt(btn.dataset.page, 10) || 1;
            renderOrdersList();
        });
    }

    if (orderModal) {
        orderModal.addEventListener('click', e => {
            const t = e.target;
            if (t.closest('.modal-cancel')) closeModal();
            if (t.closest('#edit-order-btn')) setModalMode('edit');
            if (t.closest('#save-new-order-btn')) handleSave(true);
            if (t.closest('#save-changes-btn')) handleSave(false);
            if (t.closest('#delete-order-btn')) {
                document.getElementById('confirm-delete-message').textContent = `Are you sure you want to permanently delete Order #${currentOrderInModal?.docId}?`;
                if (confirmDeleteModal) confirmDeleteModal.classList.remove('hidden');
            }
            if (t.closest('#add-item-btn')) addEditableItemRow('', 1);
            if (t.closest('.remove-item-btn')) {
                const rows = document.querySelectorAll('#items-container .order-item-row');
                if (rows.length > 1) {
                    t.closest('.order-item-row').remove();
                    updateModalOrderTotal();
                } else {
                    showToast('An order must have at least one item row.', 'warning');
                }
            }
        });
    }

    if (drModal) {
        drModal.addEventListener('click', e => {
            const t = e.target;
            if (t.closest('.close-dr-modal')) closeDrModal();
            if (t.closest('#add-dr-row-btn')) addDrItemRow('', 10);
            if (t.closest('#submit-dr-btn')) handleProcessDeliveryReceipt();
            if (t.closest('.remove-dr-row-btn')) {
                const rows = document.querySelectorAll('#dr-items-container .dr-item-row');
                if (rows.length > 1) {
                    t.closest('.dr-item-row').remove();
                }
            }
        });
    }

    if (confirmDeleteModal) {
        confirmDeleteModal.addEventListener('click', e => {
            if (e.target.closest('#cancel-delete-btn')) confirmDeleteModal.classList.add('hidden');
            if (e.target.closest('#confirm-delete-btn')) handleDelete();
        });
    }

    if (filterContainer) {
        filterContainer.addEventListener('click', e => {
            const btn = e.target.closest('.filter-btn');
            if (!btn) return;
            filterContainer.querySelectorAll('.filter-btn').forEach(b => {
                b.className = 'filter-btn rounded-lg px-3 py-1.5 text-xs font-semibold text-zinc-400 transition-colors hover:bg-white/5 hover:text-white';
            });
            btn.className = 'filter-btn rounded-lg px-3 py-1.5 text-xs font-semibold bg-amber-400 text-zinc-950 shadow-glow-amber';
            currentFilter = btn.dataset.filter;
            currentPage = 1;
            renderOrdersList();
        });
    }

    if (prevWeekBtn) {
        prevWeekBtn.addEventListener('click', () => {
            calendarDate.setDate(calendarDate.getDate() - 7);
            renderCalendar();
        });
    }

    if (nextWeekBtn) {
        nextWeekBtn.addEventListener('click', () => {
            calendarDate.setDate(calendarDate.getDate() + 7);
            renderCalendar();
        });
    }

    // =================================================================
    // INIT
    // =================================================================
    fetchData();
});
