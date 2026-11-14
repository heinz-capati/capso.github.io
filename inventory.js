// inventory.js - CAPSo Enterprise ERP Smart Inventory, Inbound DR, Margin Quotation & Audit Trail
document.addEventListener('navigationLoaded', () => {
    console.log("Inventory page 'navigationLoaded' event received. Initializing CAPSo Enterprise ERP Inventory.");

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

    const LS_KEYS = {
        INVENTORY: 'capso_erp_inventory_v1',
        ORDERS: 'capso_erp_orders_v1',
        TRANSACTIONS: 'capso_erp_transactions_v1'
    };

    // =================================================================
    // SELECTORS
    // =================================================================
    const inventoryTableBody = document.getElementById('inventory-body');
    const inventorySummaryText = document.getElementById('inventory-summary-text');
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const restockFilterBtn = document.getElementById('restock-filter-btn');

    // Quotation Selectors
    const quoteBody = document.getElementById('quote-body');
    const quoteItemCountBadge = document.getElementById('quote-item-count-badge');
    const quoteTotalCogsSpan = document.getElementById('quote-total-cogs');
    const quoteGrossProfitSpan = document.getElementById('quote-gross-profit');
    const quoteProfitMarginSpan = document.getElementById('quote-profit-margin');
    const grandTotalSpan = document.getElementById('grand-total');
    const generatedQuotePreview = document.getElementById('generated-quote-preview');
    const clearQuoteBtn = document.getElementById('clear-quote-btn');
    const copyQuoteBtn = document.getElementById('copy-quote-btn');

    // Quantity Modal Selectors
    const quantityModal = document.getElementById('quantity-modal');
    const quantityModalTitle = document.getElementById('quantity-modal-title');
    const quantityModalSubtitle = document.getElementById('quantity-modal-subtitle');
    const quantityInput = document.getElementById('quantity-input');
    const confirmQuantityBtn = document.getElementById('confirm-quantity-btn');
    const cancelQuantityBtn = document.getElementById('cancel-quantity-btn');

    // Clear Confirmation Modal
    const confirmClearModal = document.getElementById('confirm-clear-modal');
    const confirmClearBtn = document.getElementById('confirm-clear-btn');
    const cancelClearBtn = document.getElementById('cancel-clear-btn');

    // Inbound Delivery Receipt (DR) Modal & Demo Seed Selectors
    const openDrModalBtn = document.getElementById('open-dr-modal-btn');
    const drModal = document.getElementById('dr-modal');
    const seedDemoBtn = document.getElementById('seed-demo-btn');
    const navSeedDemoBtn = document.getElementById('nav-seed-demo-btn');

    // Audit Trail Selectors
    const transactionsBody = document.getElementById('transactions-body');
    const txFilterGroup = document.getElementById('tx-filter-group');

    // =================================================================
    // STATE
    // =================================================================
    let allInventory = [];
    let allTransactions = [];
    let quoteItems = [];
    let currentItemForQuote = null;
    let editingQuoteItemId = null;
    let lowStockOnly = false;
    let currentTxFilter = 'All';

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

    function getStartOfWeek(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    function getWeekDayDateStr(dayIndex = 0) {
        const monday = getStartOfWeek(new Date());
        monday.setDate(monday.getDate() + dayIndex);
        const year = monday.getFullYear();
        const month = String(monday.getMonth() + 1).padStart(2, '0');
        const day = String(monday.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function getIsoTimestampOffset(dayOffset = 0, hour = 9, minute = 0) {
        const d = new Date();
        d.setDate(d.getDate() + dayOffset);
        d.setHours(hour, minute, 0, 0);
        return d.toISOString();
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

    function seedDefaultDraftQuoteIfEmpty() {
        if (quoteItems.length > 0 || allInventory.length === 0) return;

        const targetDraftSkus = [
            ['Portland Cement (40kg Bag)', 50],
            ['Deformed Steel Rebar 12mm x 6m', 40],
            ['Marine Plywood 1/2" (4ft x 8ft)', 20]
        ];

        targetDraftSkus.forEach(([skuName, qty]) => {
            const match = allInventory.find(i => i.item_name === skuName);
            if (match) {
                quoteItems.push({
                    ...match,
                    quantity: qty,
                    quotePrice: match.retail_price
                });
            }
        });

        if (quoteItems.length === 0) {
            allInventory.slice(0, 3).forEach(sku => {
                quoteItems.push({
                    ...sku,
                    quantity: 25,
                    quotePrice: sku.retail_price
                });
            });
        }

        renderQuote();
    }

    async function seedDemoInventory(silent = false) {
        if (!silent) {
            showToast('Seeding 30 SKUs, outbound orders & DR audit trail...', 'warning');
        }
        try {
            const generatedSkus = HARDWARE_DEMO_CATALOG.map((template, idx) => {
                const cogsVariance = 0.92 + Math.random() * 0.16;
                const cogs = Math.round(template.baseCogs * cogsVariance * 100) / 100;
                const markup = 1.24 + Math.random() * 0.18;
                const retail_price = Math.round(cogs * markup * 100) / 100;
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

            allInventory = generatedSkus.sort((a, b) => a.item_name.localeCompare(b.item_name));
            allTransactions = demoTransactions.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

            localStorage.setItem(LS_KEYS.INVENTORY, JSON.stringify(allInventory));
            localStorage.setItem(LS_KEYS.ORDERS, JSON.stringify(demoOrders));
            localStorage.setItem(LS_KEYS.TRANSACTIONS, JSON.stringify(allTransactions));
            localStorage.setItem(DEMO_SEED_FLAG, 'true');

            populateCategoryDropdown();
            applyFiltersAndRender();
            renderTransactions();
            seedDefaultDraftQuoteIfEmpty();

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
            console.warn('Firestore seed fallback to local storage:', err);
            populateCategoryDropdown();
            applyFiltersAndRender();
            renderTransactions();
            seedDefaultDraftQuoteIfEmpty();
            if (!silent) {
                showToast('Demo workspace populated (30 SKUs, 10 Orders, 14 Audit Logs cached locally).');
            }
        }
    }

    window.seedDemoInventory = seedDemoInventory;
    window.initializeDemoData = seedDemoInventory;

    if (seedDemoBtn) seedDemoBtn.addEventListener('click', () => seedDemoInventory(false));
    if (navSeedDemoBtn) navSeedDemoBtn.addEventListener('click', () => seedDemoInventory(false));

    // =================================================================
    // NORMALIZATION & DATA LOADING
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

    function populateCategoryDropdown() {
        if (!categoryFilter) return;
        const currentVal = categoryFilter.value || 'All';
        const categories = Array.from(new Set(allInventory.map(i => i.category).filter(Boolean))).sort();
        categoryFilter.innerHTML = `<option value="All">All Categories (${allInventory.length})</option>` +
            categories.map(c => `<option value="${c}">${c}</option>`).join('');
        if (categories.includes(currentVal)) {
            categoryFilter.value = currentVal;
        }
    }

    function applyFiltersAndRender() {
        const term = (searchInput?.value || '').toLowerCase().trim();
        const selectedCat = categoryFilter?.value || 'All';

        const filtered = allInventory.filter(item => {
            const matchesSearch = !term ||
                item.item_name.toLowerCase().includes(term) ||
                item.category.toLowerCase().includes(term);
            const matchesCategory = selectedCat === 'All' || item.category === selectedCat;
            const matchesLowStock = !lowStockOnly || (Number(item.current_stock) < Number(item.reorder_point));
            return matchesSearch && matchesCategory && matchesLowStock;
        });

        renderInventory(filtered);
    }

    // =================================================================
    // INVENTORY TABLE RENDERER (WITH RED [RESTOCK NEEDED] BADGE)
    // =================================================================
    function renderInventory(items) {
        if (!inventoryTableBody) return;

        const lowStockTotal = allInventory.filter(i => Number(i.current_stock) < Number(i.reorder_point)).length;
        if (inventorySummaryText) {
            inventorySummaryText.innerHTML = `${allInventory.length} total SKUs &bull; <span class="${lowStockTotal > 0 ? 'font-semibold text-rose-400' : 'text-emerald-400'}">${lowStockTotal} below reorder point</span>`;
        }

        if (items.length === 0) {
            inventoryTableBody.innerHTML = `<tr><td colspan="6" class="text-center p-10 text-sm text-zinc-400">No inventory SKUs match the current filter.</td></tr>`;
            return;
        }

        inventoryTableBody.innerHTML = items.map(item => {
            const isBelowReorder = Number(item.current_stock) < Number(item.reorder_point);
            const restockBadge = isBelowReorder
                ? `<span class="inline-flex items-center rounded-md bg-rose-500/15 px-2 py-0.5 text-[11px] font-bold text-rose-300 ring-1 ring-inset ring-rose-500/30 ml-2">[RESTOCK NEEDED]</span>`
                : '';

            const stockPillClass = isBelowReorder
                ? 'bg-rose-500/15 text-rose-300 ring-rose-500/30'
                : 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/25';

            return `
                <tr class="odd:bg-zinc-900/35 even:bg-zinc-950/25 hover:bg-zinc-800/70 transition-colors">
                    <td class="px-5 py-4 text-base font-medium text-zinc-100">
                        <div class="flex flex-wrap items-center gap-y-1">
                            <span>${item.item_name}</span>
                            ${restockBadge}
                        </div>
                    </td>
                    <td class="px-4 py-4 whitespace-nowrap text-sm font-medium text-zinc-400">${item.category}</td>
                    <td class="px-4 py-4 whitespace-nowrap text-right font-mono text-sm font-medium text-zinc-400 tabular-nums">${formatCurrency(item.cogs)}</td>
                    <td class="px-4 py-4 whitespace-nowrap text-right font-mono text-base font-semibold text-zinc-100 tabular-nums">${formatCurrency(item.retail_price)}</td>
                    <td class="px-4 py-4 whitespace-nowrap text-center text-sm">
                        <span class="inline-flex items-center rounded-md px-2.5 py-0.5 font-mono text-sm font-semibold ring-1 ring-inset ${stockPillClass}">
                            ${item.current_stock}
                        </span>
                        <span class="block text-xs text-zinc-400 mt-0.5">Reorder: ${item.reorder_point}</span>
                    </td>
                    <td class="px-5 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button class="add-to-quote-btn rounded-lg bg-amber-400/15 px-3 py-1.5 text-sm font-semibold text-amber-300 ring-1 ring-inset ring-amber-400/30 hover:bg-amber-400 hover:text-zinc-950 transition-all" data-id="${item.id}">
                            + Quote
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // =================================================================
    // QUOTATION BUILDER & GROSS PROFIT MARGIN ENGINE
    // =================================================================
    function calculateQuoteFinancials() {
        const totalRevenue = quoteItems.reduce((sum, item) => sum + (item.quantity * item.quotePrice), 0);
        const totalCogs = quoteItems.reduce((sum, item) => sum + (item.quantity * (Number(item.cogs) || 0)), 0);
        const grossProfit = totalRevenue - totalCogs;
        const grossMarginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

        return {
            totalRevenue,
            totalCogs,
            grossProfit,
            grossMarginPct
        };
    }

    function renderQuote() {
        if (!quoteBody || !grandTotalSpan) return;

        if (quoteItemCountBadge) {
            const totalSkus = quoteItems.length;
            quoteItemCountBadge.textContent = `${totalSkus} SKU${totalSkus === 1 ? '' : 's'}`;
        }

        const { totalRevenue, totalCogs, grossProfit, grossMarginPct } = calculateQuoteFinancials();

        if (quoteTotalCogsSpan) quoteTotalCogsSpan.textContent = formatCurrency(totalCogs);
        if (quoteGrossProfitSpan) {
            quoteGrossProfitSpan.textContent = formatCurrency(grossProfit);
            quoteGrossProfitSpan.className = grossProfit >= 0
                ? 'font-mono font-semibold text-emerald-400 tabular-nums'
                : 'font-mono font-semibold text-rose-400 tabular-nums';
        }
        if (quoteProfitMarginSpan) {
            quoteProfitMarginSpan.textContent = `${grossMarginPct.toFixed(1)}%`;
            quoteProfitMarginSpan.className = grossMarginPct >= 20
                ? 'inline-flex items-center rounded-lg bg-emerald-400/15 px-2.5 py-1 font-mono text-sm font-bold text-emerald-300 ring-1 ring-inset ring-emerald-400/30 tabular-nums'
                : grossMarginPct > 0
                    ? 'inline-flex items-center rounded-lg bg-amber-400/15 px-2.5 py-1 font-mono text-sm font-bold text-amber-300 ring-1 ring-inset ring-amber-400/30 tabular-nums'
                    : 'inline-flex items-center rounded-lg bg-zinc-800 px-2.5 py-1 font-mono text-sm font-bold text-zinc-300 ring-1 ring-inset ring-zinc-700 tabular-nums';
        }
        grandTotalSpan.textContent = formatCurrency(totalRevenue);

        if (quoteItems.length === 0) {
            quoteBody.innerHTML = `<p class="text-sm text-zinc-400 text-center py-8">No items added yet. Click "+ Quote" on any SKU.</p>`;
            if (generatedQuotePreview) generatedQuotePreview.classList.add('hidden');
            return;
        }

        quoteBody.innerHTML = quoteItems.map(item => {
            if (item.id === editingQuoteItemId) {
                return `
                    <div class="p-3 border border-amber-400/40 rounded-xl bg-zinc-950/80 space-y-2">
                        <p class="text-xs font-semibold text-zinc-100">${item.item_name}</p>
                        <div class="flex items-center gap-2 text-xs">
                            <input type="number" min="1" value="${item.quantity}" class="edit-quantity-input w-20 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-center font-mono font-semibold text-zinc-100 focus:border-amber-400 focus:outline-none">
                            <span class="text-zinc-400">× ₱</span>
                            <input type="number" step="0.01" value="${item.quotePrice.toFixed(2)}" class="edit-price-input flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 font-mono font-semibold text-zinc-100 focus:border-amber-400 focus:outline-none">
                        </div>
                        <div class="flex justify-end gap-2 pt-1">
                            <button class="cancel-edit-quote-btn rounded-md bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-700" data-id="${item.id}">Cancel</button>
                            <button class="save-quote-item-btn rounded-md bg-amber-400 px-2.5 py-1 text-xs font-semibold text-zinc-950 hover:bg-amber-300" data-id="${item.id}">Save</button>
                        </div>
                    </div>
                `;
            }

            const itemTotal = item.quantity * item.quotePrice;
            const itemCogsTotal = item.quantity * (Number(item.cogs) || 0);
            const itemMarginPct = itemTotal > 0 ? ((itemTotal - itemCogsTotal) / itemTotal) * 100 : 0;

            return `
                <div class="flex justify-between items-start text-sm sm:text-base py-2.5 border-b border-zinc-800/80 group">
                    <div class="flex-grow pr-2 min-w-0">
                        <p class="font-medium text-zinc-100 truncate">${item.item_name}</p>
                        <p class="text-xs sm:text-sm text-zinc-400 mt-0.5">
                            ${item.quantity} × ${formatCurrency(item.quotePrice)}
                            <span class="ml-1 text-xs text-emerald-400 font-medium">(${itemMarginPct.toFixed(1)}% margin)</span>
                        </p>
                    </div>
                    <div class="flex items-center gap-1.5 flex-shrink-0">
                        <span class="font-mono font-semibold text-zinc-100 mr-1 tabular-nums">${formatCurrency(itemTotal)}</span>
                        <button class="edit-quote-item-btn rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-amber-300 text-xs transition-colors" data-id="${item.id}" title="Edit Qty/Price">Edit</button>
                        <button class="remove-quote-item-btn rounded p-1 text-zinc-400 hover:bg-rose-500/15 hover:text-rose-300 text-xs transition-colors" data-id="${item.id}" title="Remove">&times;</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    function handleCopyQuote() {
        if (quoteItems.length === 0) {
            showToast('Quotation is empty. Add SKUs first.', 'error');
            return;
        }

        const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
        const generatedDate = new Date().toLocaleDateString('en-US', dateOptions);
        const { totalRevenue } = calculateQuoteFinancials();

        let quoteText = "CAPSo Enterprise Hardware — Official Quotation\n";
        quoteText += `Generated on: ${generatedDate}\n`;
        quoteText += "------------------------------------------------\n";
        quoteItems.forEach(item => {
            const itemTotal = item.quantity * item.quotePrice;
            quoteText += `${item.item_name}\n`;
            quoteText += `  ${item.quantity} x ${formatCurrency(item.quotePrice)} = ${formatCurrency(itemTotal)}\n`;
        });
        quoteText += "------------------------------------------------\n";
        quoteText += `GRAND TOTAL:         ${formatCurrency(totalRevenue)}`;

        if (generatedQuotePreview) {
            generatedQuotePreview.textContent = quoteText;
            generatedQuotePreview.classList.remove('hidden');
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(quoteText).catch(() => fallbackCopyText(quoteText));
        } else {
            fallbackCopyText(quoteText);
        }

        showToast('Official quotation copied to clipboard!');
    }

    function fallbackCopyText(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }

    // =================================================================
    // AUDIT TRAIL (TRANSACTIONS COLLECTION) & INBOUND DR
    // =================================================================
    async function recordStockTransaction({ type, reference_id, item_name, qty_change }) {
        const txRecord = {
            date: new Date().toISOString(),
            type: type, // 'DR' or 'Order'
            reference_id: String(reference_id),
            item_name: item_name,
            qty_change: Number(qty_change)
        };

        allTransactions.unshift(txRecord);
        localStorage.setItem(LS_KEYS.TRANSACTIONS, JSON.stringify(allTransactions));

        try {
            await transactionsCollection.add(txRecord);
        } catch (err) {
            console.warn('Transaction logged to local storage fallback:', err);
        }
    }

    function renderTransactions() {
        if (!transactionsBody) return;

        const filtered = allTransactions.filter(tx => {
            if (currentTxFilter === 'All') return true;
            return String(tx.type).toLowerCase() === currentTxFilter.toLowerCase();
        });

        if (filtered.length === 0) {
            transactionsBody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-8 text-center text-sm text-zinc-400">
                        No audit transactions found for this filter.
                    </td>
                </tr>
            `;
            return;
        }

        transactionsBody.innerHTML = filtered.map(tx => {
            const isDr = String(tx.type).toUpperCase() === 'DR';
            const qty = Number(tx.qty_change) || 0;
            const formattedDate = tx.date ? new Date(tx.date).toLocaleString() : 'N/A';
            const typeBadge = isDr
                ? `<span class="inline-flex items-center rounded-md bg-emerald-400/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-400/30">DR</span>`
                : `<span class="inline-flex items-center rounded-md bg-amber-400/10 px-2.5 py-0.5 text-xs font-semibold text-amber-300 ring-1 ring-inset ring-amber-400/30">Order</span>`;
            const qtyDisplay = qty > 0 ? `+${qty}` : `${qty}`;
            const qtyClass = qty > 0 ? 'text-emerald-400 font-mono font-bold tabular-nums' : 'text-rose-400 font-mono font-bold tabular-nums';

            return `
                <tr class="odd:bg-zinc-900/35 even:bg-zinc-950/25 hover:bg-zinc-800/70 transition-colors">
                    <td class="px-6 py-3.5 whitespace-nowrap font-mono text-sm text-zinc-400">${formattedDate}</td>
                    <td class="px-6 py-3.5 whitespace-nowrap">${typeBadge}</td>
                    <td class="px-6 py-3.5 whitespace-nowrap font-mono text-sm font-semibold text-amber-300">${tx.reference_id || 'N/A'}</td>
                    <td class="px-6 py-3.5 whitespace-nowrap text-base font-medium text-zinc-100">${tx.item_name || 'N/A'}</td>
                    <td class="px-6 py-3.5 whitespace-nowrap text-right text-base ${qtyClass}">${qtyDisplay}</td>
                </tr>
            `;
        }).join('');
    }

    function buildDrSelectOptions(selectedSkuName = '') {
        let html = `<option value="">-- Select Existing SKU --</option>`;
        allInventory.forEach(sku => {
            const isSelected = sku.item_name === selectedSkuName ? 'selected' : '';
            html += `<option value="${sku.item_name.replace(/"/g, '&quot;')}" ${isSelected}>${sku.item_name} (Stock: ${sku.current_stock})</option>`;
        });
        return html;
    }

    function addDrItemRow(selectedSkuName = '', qty = 20) {
        const container = document.getElementById('dr-items-container');
        if (!container) return;
        const row = document.createElement('div');
        row.className = 'dr-item-row flex w-full items-center gap-2 overflow-hidden rounded-lg bg-zinc-900/90 p-2.5 ring-1 ring-inset ring-zinc-800';
        row.innerHTML = `
            <select class="dr-sku-select block min-w-0 flex-1 truncate rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400">
                ${buildDrSelectOptions(selectedSkuName)}
            </select>
            <input type="number" min="1" value="${qty}" placeholder="Qty" class="dr-qty-input block w-20 sm:w-24 flex-shrink-0 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-2 text-center font-mono text-sm font-semibold text-zinc-100 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400">
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
            addDrItemRow('', 25);
        }
        drModal.classList.remove('hidden');
    }

    function closeDrModal() {
        if (drModal) drModal.classList.add('hidden');
    }

    async function handleProcessDeliveryReceipt() {
        const refId = document.getElementById('dr-reference-id')?.value?.trim();
        if (!refId) {
            showToast('Please enter a DR Reference Number.', 'error');
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
            showToast('Please select at least one SKU and a valid quantity.', 'error');
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
        applyFiltersAndRender();
        renderTransactions();
        showToast(`Processed ${refId}: Added stock to ${entries.length} SKU(s) & logged DR audit record!`);
    }

    // =================================================================
    // FETCH INVENTORY & TRANSACTIONS
    // =================================================================
    async function fetchInventoryAndTransactions() {
        if (inventoryTableBody) {
            inventoryTableBody.innerHTML = `<tr><td colspan="6" class="text-center p-8 text-sm text-zinc-400">Loading inventory from Firestore...</td></tr>`;
        }
        try {
            // Auto-populate realistic demo data on first launch of v2 demo build
            if (localStorage.getItem(DEMO_SEED_FLAG) !== 'true') {
                await seedDemoInventory(true);
                return;
            }

            let items = [];
            try {
                const snapshot = await inventoryCollection.get();
                const hasErpSchema = snapshot.docs.some(d => d.data().item_name !== undefined && d.data().retail_price !== undefined);
                if (snapshot.empty || !hasErpSchema) {
                    await seedDemoInventory(true);
                    return;
                } else {
                    items = snapshot.docs.map(doc => normalizeInventoryDoc(doc.id, doc.data()));
                    localStorage.setItem(LS_KEYS.INVENTORY, JSON.stringify(items));
                }
            } catch (fireErr) {
                console.warn("Firestore inventory read fallback:", fireErr);
                const cached = JSON.parse(localStorage.getItem(LS_KEYS.INVENTORY) || '[]');
                if (cached.length) {
                    items = cached;
                } else {
                    await seedDemoInventory(true);
                    return;
                }
            }

            allInventory = items.sort((a, b) => a.item_name.localeCompare(b.item_name));
            populateCategoryDropdown();
            applyFiltersAndRender();
            seedDefaultDraftQuoteIfEmpty();

            // Load Transactions
            try {
                const txSnap = await transactionsCollection.get();
                allTransactions = txSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                allTransactions.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
                localStorage.setItem(LS_KEYS.TRANSACTIONS, JSON.stringify(allTransactions));
            } catch (txErr) {
                console.warn("Firestore transactions read fallback:", txErr);
                allTransactions = JSON.parse(localStorage.getItem(LS_KEYS.TRANSACTIONS) || '[]');
            }

            if (allTransactions.length === 0) {
                await seedDemoInventory(true);
                return;
            }

            renderTransactions();
        } catch (error) {
            console.error("Error fetching inventory: ", error);
            if (inventoryTableBody) {
                inventoryTableBody.innerHTML = `<tr><td colspan="6" class="text-center p-8 text-sm text-rose-400">Error loading inventory.</td></tr>`;
            }
        }
    }

    // =================================================================
    // QUANTITY MODAL FUNCTIONS
    // =================================================================
    function openQuantityModal(item) {
        currentItemForQuote = item;
        quantityModalTitle.textContent = item.item_name;
        if (quantityModalSubtitle) {
            quantityModalSubtitle.textContent = `Retail: ${formatCurrency(item.retail_price)} | COGS: ${formatCurrency(item.cogs)} | Stock: ${item.current_stock}`;
        }
        quantityInput.value = '1';
        quantityModal.classList.remove('hidden');
        quantityInput.focus();
        quantityInput.select();
    }

    function closeQuantityModal() {
        currentItemForQuote = null;
        quantityModal.classList.add('hidden');
    }

    function handleConfirmQuantity() {
        const quantity = parseInt(quantityInput.value, 10);
        if (currentItemForQuote && !isNaN(quantity) && quantity > 0) {
            const existingQuoteItem = quoteItems.find(item => item.id === currentItemForQuote.id);
            if (existingQuoteItem) {
                existingQuoteItem.quantity += quantity;
            } else {
                quoteItems.push({
                    ...currentItemForQuote,
                    quantity: quantity,
                    quotePrice: currentItemForQuote.retail_price
                });
            }
            renderQuote();
            closeQuantityModal();
            showToast(`Added ${quantity} × ${currentItemForQuote.item_name} to quotation.`);
        } else {
            showToast('Please enter a valid quantity greater than 0.', 'error');
        }
    }

    // =================================================================
    // EVENT HANDLERS
    // =================================================================
    if (searchInput) {
        searchInput.addEventListener('input', applyFiltersAndRender);
    }

    if (categoryFilter) {
        categoryFilter.addEventListener('change', applyFiltersAndRender);
    }

    if (restockFilterBtn) {
        restockFilterBtn.addEventListener('click', () => {
            lowStockOnly = !lowStockOnly;
            restockFilterBtn.className = lowStockOnly
                ? 'rounded-lg bg-rose-500 px-3 py-2 text-xs font-semibold text-white shadow-glow-rose transition-colors'
                : 'rounded-lg bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-200 ring-1 ring-inset ring-zinc-700 hover:bg-zinc-700 hover:text-white transition-colors';
            applyFiltersAndRender();
        });
    }

    if (inventoryTableBody) {
        inventoryTableBody.addEventListener('click', (e) => {
            const btn = e.target.closest('.add-to-quote-btn');
            if (btn) {
                const itemId = btn.dataset.id;
                const itemToAdd = allInventory.find(item => item.id === itemId);
                if (itemToAdd) openQuantityModal(itemToAdd);
            }
        });
    }

    if (openDrModalBtn) openDrModalBtn.addEventListener('click', openDrModal);

    if (drModal) {
        drModal.addEventListener('click', e => {
            const t = e.target;
            if (t.closest('.close-dr-modal')) closeDrModal();
            if (t.closest('#add-dr-row-btn')) addDrItemRow('', 15);
            if (t.closest('#submit-dr-btn')) handleProcessDeliveryReceipt();
            if (t.closest('.remove-dr-row-btn')) {
                const rows = document.querySelectorAll('#dr-items-container .dr-item-row');
                if (rows.length > 1) {
                    t.closest('.dr-item-row').remove();
                }
            }
        });
    }

    if (txFilterGroup) {
        txFilterGroup.addEventListener('click', e => {
            const btn = e.target.closest('.tx-filter-btn');
            if (!btn) return;
            txFilterGroup.querySelectorAll('.tx-filter-btn').forEach(b => {
                b.className = 'tx-filter-btn rounded-lg px-3 py-1.5 text-xs font-semibold text-zinc-400 transition-colors hover:bg-white/5 hover:text-white';
            });
            btn.className = 'tx-filter-btn rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-semibold text-zinc-950 shadow-glow-amber';
            currentTxFilter = btn.dataset.txFilter || 'All';
            renderTransactions();
        });
    }

    if (clearQuoteBtn) {
        clearQuoteBtn.addEventListener('click', () => {
            if (quoteItems.length > 0) {
                confirmClearModal.classList.remove('hidden');
            }
        });
    }

    if (copyQuoteBtn) {
        copyQuoteBtn.addEventListener('click', handleCopyQuote);
    }

    if (quoteBody) {
        quoteBody.addEventListener('click', e => {
            const target = e.target.closest('button');
            if (!target) return;
            const id = target.dataset.id;

            if (target.classList.contains('remove-quote-item-btn')) {
                quoteItems = quoteItems.filter(item => item.id !== id);
                renderQuote();
            }
            if (target.classList.contains('edit-quote-item-btn')) {
                editingQuoteItemId = id;
                renderQuote();
            }
            if (target.classList.contains('cancel-edit-quote-btn')) {
                editingQuoteItemId = null;
                renderQuote();
            }
            if (target.classList.contains('save-quote-item-btn')) {
                const itemToSave = quoteItems.find(item => item.id === id);
                const container = target.closest('.p-3');
                const newQuantity = parseInt(container.querySelector('.edit-quantity-input').value, 10);
                const newPrice = parseFloat(container.querySelector('.edit-price-input').value);

                if (itemToSave && !isNaN(newQuantity) && newQuantity > 0 && !isNaN(newPrice) && newPrice >= 0) {
                    itemToSave.quantity = newQuantity;
                    itemToSave.quotePrice = newPrice;
                    editingQuoteItemId = null;
                    renderQuote();
                } else {
                    showToast('Please enter a valid quantity and price.', 'error');
                }
            }
        });
    }

    if (confirmQuantityBtn) confirmQuantityBtn.addEventListener('click', handleConfirmQuantity);
    if (cancelQuantityBtn) cancelQuantityBtn.addEventListener('click', closeQuantityModal);
    if (quantityInput) {
        quantityInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleConfirmQuantity();
        });
    }

    if (confirmClearBtn) {
        confirmClearBtn.addEventListener('click', () => {
            quoteItems = [];
            renderQuote();
            confirmClearModal.classList.add('hidden');
        });
    }
    if (cancelClearBtn) {
        cancelClearBtn.addEventListener('click', () => {
            confirmClearModal.classList.add('hidden');
        });
    }

    // =================================================================
    // INITIALIZATION
    // =================================================================
    fetchInventoryAndTransactions();
    renderQuote();
});
