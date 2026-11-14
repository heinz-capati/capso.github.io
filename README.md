# CAPSo Enterprise ERP: Logistics & Operations MVP

**Live Demo:**

An automated, closed-loop supply chain dashboard engineered to eliminate manual spreadsheet bottlenecks in hardware retail and outbound fulfillment. This MVP translates raw inventory data into actionable executive metrics, margin analysis, and immutable audit trails.

## The Business Problem

Manual procurement, dispatch scheduling, and inventory tracking lead to critical operational failures: stock shrinkage, unoptimized gross margins, and delivery bottlenecks. Operations teams need a unified, relational database to tie inbound logistics (restocking) directly to outbound fulfillment (orders) in real-time.

## The Architecture

This Progressive Web App (PWA) operates on a serverless architecture, functioning as a lightweight Enterprise Resource Planning (ERP) system tailored for high-volume physical goods.

- **Frontend Interface:** Vanilla JavaScript (ES6+), HTML5, and Tailwind CSS (CDN). Styled as a dark-mode, high-contrast operational terminal for rapid data digestion.
- **Backend & Database:** Google Firebase Firestore (Web SDK v9). Relational NoSQL architecture utilizing three core collections: `inventory`, `orders`, and `transactions`.
- **Offline Capabilities:** Fully configured with `manifest.json` and `service-worker.js` for mobile-responsive, edge-cached accessibility in warehouse environments.

## Core Operational Features

### 1. Closed-Loop Stock Mechanics

Orders are built dynamically by querying live SKUs from the Firestore `inventory` collection. When an order transitions to **Out for Delivery** or **Complete**, the system automatically deducts the exact quantities from the master stock, preventing phantom inventory allocation.

### 2. Immutable Audit Trail (Shrinkage Control)

Every inventory state change—whether an inbound Delivery Receipt (stock addition) or an outbound Order (stock deduction)—is automatically logged into an immutable `transactions` ledger. This provides executive oversight with exact timestamps, reference IDs, and quantity adjustments.

### 3. Margin-Aware Quotation Engine

The quoting module calculates live Cost of Goods Sold (COGS), Estimated Gross Profit, and Gross Profit Margin (%) on the fly. This prevents sales reps from underpricing bulk orders and protects bottom-line revenue.

### 4. Executive KPI Dashboard

A real-time metrics terminal tracks Total Daily Sales, Pending Dispatches, and Low Stock Alerts, automatically flagging SKUs that fall below their predefined safety reorder points with a strict `[RESTOCK NEEDED]` warning.

## Demo Environment Notes

This repository contains a live portfolio demonstration. The application includes a `Seed 30 Demo SKUs` initializer function that populates the Firestore database with fictional construction materials, randomized pricing, and mock inventory levels for testing purposes.
