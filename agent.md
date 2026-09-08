# Shangreela POS System: Comprehensive Technical Architecture

This document provides an exhaustive, up-to-date analysis of the Shangreela POS system's architecture, data structures, UI/UX logic, and system workflows.

---

## 1. System Architecture & Tech Stack

### Backend: Node.js / Express / MongoDB
The backend is a high-availability, modular REST API designed for extreme data consistency and high-velocity POS loads.
- **Entry Point**: `server.js` initializes the application, sets up global middleware (CORS, caching), connects via Mongoose, and triggers data auto-initialization.
- **Data Persistence**: MongoDB with Mongoose ODM.
- **Controllers & Modules**: The backend is extremely feature-rich, maintaining modular controllers for: `analytics`, `auth`, `dashboard`, `delivery`, `expense`, `fbr`, `floor`, `giftCard`, `hr`, `inventory`, `loyalty`, `menu`, `mobile`, `order`, `posTab`, `printer`, `reports`, `table`, `tax`, and `user`.
- **Security**: Stateless JWT-based authentication. Role Based Access Control (RBAC) middleware forces explicit endpoint security.
- **Anti-Caching Mechanism**: Server explicitly sets `Cache-Control: no-store` on all `/api` routes ensuring the POS never fetches stale 304 payloads during high-speed caching.

### Frontend: React / Vite / TypeScript / Tailwind
A highly optimized, type-safe Single Page Application specifically designed to minimize cashier friction.
- **Build Infrastructure**: Vite providing lightning-fast HMR and optimized production bundles.
- **Global State Management**: Shifted heavily to **Zustand** (`usePOSStore`, `useOrderStore`) replacing old Context APIs for maximum re-render efficiency across POS views.
- **Server State & Caching**: **TanStack Query (React Query)** handles data polling, mutation states, and background synchronization via custom hooks like `usePosRealtimeScopes`.
- **UI Architecture**: Tailwind CSS mapped via Radix UI primitives (Shadcn UI). Features a sophisticated "Bento Grid" dark-mode/glassmorphism design language.

---

## 2. Core Business Logic & State Flow

### The POS Terminal (`usePOSStore`)
The heart of cashier interaction.
- **Instant Workflow**: Optimized for extreme speed. Menu items clicked in the `MenuGrid` are **instantly added to the cart** without modal interruption. Customization modals only appear locally when explicitly selecting variations or addons.
- **Zustand Engine**: Tracks `menuItems`, `taxRates`, `orderType` (Dine-in, Takeaway, Delivery), multiple search queries natively, and deep cart modifications (qty deltas, custom addons, discount states).

### The Order & Billing Lifecycle (`useOrderStore`)
- **Pagination & Limits**: The backend restricts payload loads with a precise robust query filter (`page`, `limit=50`, `size`). Backend structures return a `pagination` object (`{ pages, total, limit }`). **Crucial Frontend Rule**: The frontend must access `pagination.pages` to limit UI loops. `totalPages` does not exist on the response.
- **Time/Data Guarding**: Filters are heavily opinionated to default `DateRange` to `today` (the current operating day) rather than `null`. This prevents the POS from accidentally requesting years of historical data simultaneously.
- **Empty States ("Verbose UX")**: When `Order` or `Billing` filters yield zero results, the UI renders a **Verbose Empty State**. Instead of a generic "No Orders Found," the UI prints exactly which variables are constrained: `Date Range`, `Status`, `Type`, `Floor`, `Cashier`, allowing immediate operator correction.
- **Taxation & Pakistani Logic**: The system dynamically handles Pakistan's specific taxation breakdown. GST and Service Charges conditionally apply based on Order Types (e.g., Service charge strictly on Dine-in). 

### Kitchen Flow & Table Locking
- Items added to dine-in orders automatically shift physical `Tables` into `occupied` statuses via `tableMap` linking. 
- The Kitchen Display (`Kitchen` view) automatically filters unprinted or `preparing` queued status items, grouped by sub-requests so line cooks don't remake existing items.

---

## 3. Frontend Views & Modules

- **`pos-terminal`**: The primary operational screen. High-density cart grid.
- **`orders/index.tsx`**: A dashboard grid view of all existing active lifecycle orders allowing rapid mutation (Cancel, Edit, Switch Table).
- **`billing/index.tsx`**: A split-panel interface. Filter buttons dynamically reflect total item counts (e.g., `ALL (14)`, `PENDING (5)`). Order metadata is aggregated strictly at the top of the `BillPaymentPanel` so the operational item grid mounts higher.
- **`inventory` / `kitchen` / `delivery` / `hr` / `analytics`**: Peripheral high-functioning tracking screens integrating closely into the overarching reporting matrices.

---

## 4. Key Security & Operational Safeguards

- **Submit Locks**: Actions like `Complete Payment` or `Void Order` utilize a native system `useSubmitLock()` preventing double-clicks or multiple identical API requests from destroying the DB structure.
- **Print Guards**: Bills track explicit `printed` Booleans via `localStorage` maps overlaid with backend persistence so kitchen routing isn't duplicated on refresh.
- **Role Permissions Context**: Extensive `hasAction` and `hasDataAccess` mapping ensures Cashiers cannot execute Refunds or voids without higher managerial authentication via the backend.

---

## 5. Summary of API Controller Pipelines

| Feature Area | Controller | Responsibilities |
| :--- | :--- | :--- |
| **Orders & Checkout** | `orderController.js` | Status shifting, KOT generation, Receipt logic, Table lifecycle locks, Staff assignment & payment tracking. |
| **Tax & Govt. Logs** | `fbrController.json` & `taxController` | Integrates required FBR tracking logic alongside local taxation math. |
| **Printers & Tracking** | `printerController.js` | Directs POS and KOT printing tasks locally to hardware. |
| **Inventory & Staffing** | `inventoryController.js` / `hrController.js` | Logs deductions per-item sold, maps attendance records per shift, Employee CRUD with delete. |

---

## 6. Staff Bills Module (Implemented)

### Overview
A fully implemented module to track orders placed for staff members. Staff selection happens in the **billing page** (not during order placement), keeping the POS terminal workflow clean. A dedicated page shows pending and paid staff bills with date-wise grouping. Staff members are managed via the **HR Employee** system (not a separate User role).

### 6.1 Backend Changes

#### Order Model Updates (`backend/models/order.js`)
Two new fields added:
```javascript
staffMember: { type: ObjectId, ref: 'Employee', default: null, index: true },
staffBillPaid: { type: Boolean, default: false }
// + compound index: { staffMember: 1, staffBillPaid: 1 }
```

#### API Endpoints (`backend/routes/orders.routes.js`)

| Method | Endpoint | Request Body / Query | Purpose |
|--------|----------|---------------------|---------|
| `PATCH` | `/orders/:id/assign-staff` | `{ staffMember: employeeId \| null }` | Assign/remove staff member from an order |
| `GET` | `/orders/staff-summary` | - | Aggregated staff with pending/paid counts and totals |
| `GET` | `/orders/staff-bills` | `?employeeId=...&status=pending\|paid\|all&from=...&to=...` | Individual bills for a staff member |
| `PATCH` | `/orders/:id/mark-staff-paid` | - | Mark staff bill as paid + sets order status to `completed` |

#### Staff Summary Response Shape
```json
{
  "staff": [
    {
      "_id": "employeeMongoId",
      "name": "Ali Khan",
      "role": "Waiter",
      "pendingCount": 5,
      "pendingTotal": 17222,
      "paidCount": 0,
      "paidTotal": 0,
      "lastOrderDate": "2026-09-02T08:14:21.357Z"
    }
  ]
}
```

#### Order List Response — Staff Fields
The order list endpoint (`GET /orders`) now includes:
```json
{
  "staffMember": "employeeMongoId" | null,
  "staffBillPaid": false
}
```

#### HR Employee Delete Endpoint
| Method | Endpoint | Purpose |
|--------|----------|---------|
| `DELETE` | `/hr/employees/:id` | Delete an HR employee |

---

### 6.2 Frontend Changes

#### A. Billing Page — Staff Assignment
**File**: `frontend/src/pages/billing/components/BillPaymentPanel.tsx`

- "Assign to Staff" section in the payment panel (between order header and items)
- Dropdown fetches active HR employees from `GET /hr/employees?limit=100`
- Default: "None (Customer)" — selecting removes assignment
- Assignment persists across page navigation (loaded from `order.staffMember`)
- Shows assigned staff name below the dropdown
- `Order` interface now includes `staffMember` and `staffBillPaid` fields

#### B. Staff Bills Page
**File**: `frontend/src/pages/staff-bills/index.tsx`
**Route**: `/pos/staff-bills`

**2-panel layout (desktop) / stacked (mobile):**

**Left Panel — Staff List:**
- Fetches from `GET /orders/staff-summary`
- Status filter tabs: Pending / Paid / All
- Each staff card shows name, role, pending count, pending total
- Click to select → right panel loads their bills

**Right Panel — Selected Staff's Bills:**
- Header with staff name, role, pending/paid stats
- Bills grouped by calendar day (date-wise)
- Each bill card: Order ID, date/time, type, items count, total, status badge
- "Mark as Paid" button → calls `PATCH /orders/:id/mark-staff-paid`
- Marking as paid also sets order status to `completed` (removes from billing list)

#### C. Sidebar Navigation
**File**: `frontend/src/components/pos/POSLayout.tsx`
```javascript
{ to: '/pos/staff-bills', icon: Users, label: 'Staff Bills', page: 'staffbills' }
```

#### D. Route Registration
**File**: `frontend/src/App.tsx`
```javascript
const StaffBills = lazy(() => import("./pages/staff-bills/index.tsx"));
<Route path="staff-bills" element={<PageGuard page="staffbills"><StaffBills /></PageGuard>} />
```

#### E. Page Permissions
**File**: `frontend/src/contexts/auth/AuthContext.tsx`
- `'staffbills'` added to `PageKey` type union

---

### 6.3 HR Module Enhancements

#### Add/Edit Employee Modal (`frontend/src/pages/hr/index.tsx`)
- All fields now have labels with required/optional indicators
- **Role** changed from free text input to **dropdown** with 13 options: Waiter, Chef, Head Chef, Sous Chef, Line Cook, Host, Manager, Assistant Manager, Cashier, Bartender, Busser, Delivery, Supervisor
- Photo upload marked as **Optional** with "Remove" button when selected
- Required fields marked with red asterisk `*` (Name, Role)
- Delete button added to each employee card (red, with confirmation prompt)

#### User Management Modal (`frontend/src/pages/hr/users/index.tsx`)
- All fields labeled with red asterisk `*` for required
- "Add Staff" and "Edit Staff" modals have consistent labeled layout

---

### 6.4 Realtime Updates (Socket.IO)

**File**: `frontend/src/contexts/pos/RealtimeContext.tsx`

All React Query keys are properly invalidated per scope:

| Scope | Query Keys Invalidated |
|-------|----------------------|
| `orders` / `deliveries` | `deliveries`, `orders-management`, `staff-summary`, `staff-bills` |
| `orders` / `tables` | `pos-tables`, `pos-init-data`, `orders-init-data`, `order-mgmt-init`, `orders-management` |
| `menu` | `pos-menu-items`, `pos-init-data`, `orders-init-data`, `order-mgmt-init`, `menu-categories` |
| `floors` / `tables` | `floors-list`, `pos-floors`, `pos-init-data`, `orders-init-data`, `order-mgmt-init` |
| `inventory` / `dashboard` | All `inventory-*` keys (stock, alerts, stats, suppliers, logs, transfers, locations, transfer-categories, all) |
| `settings` | `pos-init-data`, `dashboard-overview`, `reports-dashboard`, `analytics-dashboard` |
| `users` | `orders-init-data`, `order-mgmt-init`, `users-list` |
| `hr` | `hr-employees` |
| `dashboard` (any data change) | `dashboard-overview`, `reports-dashboard`, `analytics-dashboard` |

---

### 6.5 UI/UX Flow

```
Billing Page Flow:
1. Cashier selects a bill from the list
2. In BillPaymentPanel, scrolls to "Assign to Staff" section
3. Selects a staff member from dropdown (HR employees)
4. Assignment saves immediately via PATCH /orders/:id/assign-staff
5. Staff assignment persists when navigating away and back

Staff Bills Page Flow:
1. User navigates to /pos/staff-bills
2. Summary cards: Total Pending Bills, Total Pending Amount, Staff Count
3. Left panel: Staff list with Pending/Paid/All filter tabs
4. Clicks on a staff member → right panel loads their bills
5. Bills grouped by calendar day with date headers
6. "Mark as Paid" button on each pending bill
7. Marking paid → order status becomes "completed" → clears from billing
8. All updates via Socket.IO (instant across tabs)
```

---

### 6.6 Files Summary

| File | Action | Description |
|------|--------|-------------|
| `backend/models/order.js` | Modified | Added `staffMember` (ObjectId, indexed) and `staffBillPaid` (Boolean) fields |
| `backend/controllers/orderController.js` | Modified | Added 4 staff endpoints + `staffMember`/`staffBillPaid` in order list response |
| `backend/routes/orders.routes.js` | Modified | Registered staff routes (GET routes before POST /:id) |
| `backend/controllers/hrController.js` | Modified | Added `deleteEmployee` endpoint |
| `backend/routes/hr.routes.js` | Modified | Added `DELETE /hr/employees/:id` route |
| `frontend/src/contexts/auth/AuthContext.tsx` | Modified | Added `'staffbills'` to PageKey type |
| `frontend/src/data/pos/mockData.ts` | Modified | Added `staffMember` and `staffBillPaid` to Order interface |
| `frontend/src/components/pos/POSLayout.tsx` | Modified | Added sidebar link for Staff Bills |
| `frontend/src/App.tsx` | Modified | Added route and lazy import |
| `frontend/src/pages/billing/components/BillPaymentPanel.tsx` | Modified | Added staff assignment dropdown with HR employees |
| `frontend/src/pages/staff-bills/index.tsx` | **Created** | New Staff Bills page (2-panel layout) |
| `frontend/src/pages/hr/index.tsx` | Modified | Labeled form, role dropdown, delete button, optional photo |
| `frontend/src/pages/hr/users/index.tsx` | Modified | Labeled form with required indicators |
| `frontend/src/contexts/pos/RealtimeContext.tsx` | Modified | Added all missing query key invalidations |

---

### 6.7 Key Design Decisions

1. **No POS Terminal Changes**: Staff selection happens in billing only, keeping order placement fast
2. **Uses HR Employees**: Staff members come from `/hr/employees`, not a separate User role
3. **Simple Payment Tracking**: No credit/debt logic — just pending vs paid status
4. **Mark as Paid = Completed**: Marking a staff bill as paid also sets order status to `completed`
5. **Staff Assignment Persists**: `staffMember` field returned in order list response, loaded on revisit
6. **Date-wise Grouping**: Bills organized by calendar day for easy review
7. **Real-time Updates**: Socket.IO broadcasts on all changes, all query keys properly invalidated
8. **No Duplicate Role**: Avoided creating a "staff" User role — HR Employees already serve this purpose

---

## 7. Menu Category Hierarchy Requirements (Approved)

The menu category system will be changed from a flat category list to a two-level hierarchy:

```text
Parent Category
└── Child / Subcategory
  └── Menu Items
```

### 7.1 Parent Category Form

The parent category form must contain only the following fields:

- **Name**
- **Description**
- **Image**
- **Active** toggle

No color, sort order, or additional parent-category fields are required at this stage.

### 7.2 Category Pages and Navigation

Categories must have separate pages, not a tab inside the existing menu-management page.

Required route:

```text
/pos/menu/categories
```

The categories page must have its own sidebar navigation entry. It must allow users to:

1. View parent categories.
2. Create and edit parent categories.
3. Open a parent category and view its child/subcategories.
4. Create and edit child/subcategories by selecting their parent category.
5. Open an individual category page and view only its related menu items.

The existing menu-management page remains responsible for menu items, while category navigation and category CRUD live on the separate categories pages.

### 7.3 Child/Subcategory Form

Child/subcategory creation must require selecting a parent category before saving. The form must include:

- Parent category
- Name
- Description
- Image
- Active toggle

The current flat categories should be migrated or mapped as child/subcategories. The system must not guess new parent assignments where the correct parent is unknown.

### 7.4 Menu Item Category Selection

Menu item creation and editing must use dependent category selectors:

1. Select the main/parent category.
2. Load the relevant child/subcategories.
3. Select the child/subcategory.
4. Fill the remaining menu item fields and save.

Changing the selected parent must clear the selected child/subcategory. Menu items should be assigned to child/subcategories, not directly to parent categories.

The menu item list must show the complete category path where available, for example `Main Course / Karahi`.

### 7.5 Legacy and Unassigned Menu Items

Existing menu items must be preserved during migration. Items whose current category string does not match a known category must remain **Unassigned**.

Unassigned items must:

- Remain visible in the global **All** menu-item view.
- Be excluded from normal parent/subcategory views until assigned.
- Be assignable later through the menu item form.
- Not be deleted or silently moved during migration.

The old category string must remain available during the transition so historical orders and legacy consumers continue to work safely.

### 7.6 POS Terminal

The POS terminal must be updated in the same implementation pass to use the real parent/child category hierarchy.

The hardcoded `Pakistani` / `Handi` / `Karahi` grouping must be removed and replaced with category data from the backend. The POS should:

- Load categories with the menu data.
- Show parent categories first.
- Show child/subcategories after selecting a parent.
- Display items for the selected child/subcategory.
- Keep unassigned items available through an appropriate All/unassigned view.

### 7.7 Category Deletion Policy

Category deletion must be blocked when the category has children or menu items assigned to it.

The API and UI error must clearly identify the blocking dependency by name. For example:

- `Cannot delete "Main Course" because it has child categories: Karahi, Handi.`
- `Cannot delete "Karahi" because it has menu items: Chicken Karahi, Mutton Karahi.`

The system must not automatically move children or menu items to Unassigned during deletion. The user must first move or remove the dependent records.

### 7.8 Stable References and Historical Data

New menu items must reference the selected child/subcategory by stable ID rather than relying only on its name. Category names may change without invalidating the relationship.

Existing order records must retain their historical category snapshot. Renaming, moving, or deactivating a category must not rewrite historical orders or reports.

Special `Deals` and `Platters` behavior must not depend only on category-name string comparisons. Bundle behavior should use an explicit item type or equivalent stable flag.

### 7.9 Implementation Scope

The implementation must include:

- Hierarchical category model and indexes.
- Category list/tree, create, update, and guarded delete APIs.
- Legacy category migration and Unassigned handling.
- Separate categories page and sidebar entry.
- Parent/child category forms.
- Dependent parent/subcategory selectors in menu item forms.
- Individual category item views.
- POS terminal hierarchy integration in the same pass.
- Clear deletion validation errors naming dependent categories or items.
- Tests for migration, hierarchy, filtering, assignment, POS navigation, and deletion guards.

---

## 8. Menu Category Work Completed (2026-09-08)

The approved category hierarchy work has been implemented across the backend and frontend.

### 8.1 Backend Completed

- `MenuCategory` now supports `parentId`, description, image, active status, timestamps, and a parent/name index.
- `MenuItem` now supports a stable `categoryId` reference while retaining the legacy `category` string for compatibility.
- `GET /menu/categories` now returns:
  - The legacy flat `categories` string array for existing dashboard/report consumers.
  - Structured `categoryRecords`.
  - A nested `tree` of parent categories and subcategories.
  - `legacy` category names that exist on menu items but have no category record.
- `POST /menu/categories` supports parent assignment, descriptions, images, and active status.
- `PUT /menu/categories/:id` supports changing a category's parent, including moving it back to top-level with no parent.
- `DELETE /menu/categories/:id` blocks deletion when children or menu items exist and names the blocking records in the error response.
- Only two hierarchy levels are permitted. A subcategory cannot contain another subcategory.
- Creating a subcategory whose name matches legacy menu items automatically assigns those unassigned items to the new category ID.
- POS initialization now returns active categories together with menu data.

### 8.2 Category Management UI Completed

- Added separate routes:
  - `/pos/menu/categories`
  - `/pos/menu/categories/:categoryId`
- Added a **Menu Categories** sidebar entry using the existing menu permission.
- Parent category cards show existing subcategory names and provide **View subcategories**.
- Parent pages show their child categories and allow creating subcategories.
- Subcategory pages show their assigned menu items.
- Existing subcategories have a dedicated **Change parent** action.
- The category edit form includes a parent selector:
  - Selecting another parent moves the category.
  - Selecting **No parent (top-level)** unlinks it.
- Legacy/unassigned category names are displayed with a parent selector and **Link category** action.
- Linking a legacy name creates the subcategory and preserves/adopts its existing menu items.

### 8.3 Menu Item UI Completed

- Menu item forms now use dependent selectors:
  1. Parent category.
  2. Child category.
  3. Remaining menu item fields.
- Changing the selected parent clears the child selection.
- New items submit `categoryId` and retain the category name for compatibility.
- Existing items can be assigned or reassigned through the same form.

### 8.4 POS Terminal Completed

- POS terminal loads the real category tree from the backend.
- The old hardcoded `Pakistani` / `Handi` / `Karahi` navigation path is no longer used for menu filtering.
- The terminal always shows two selectors:
  - Parent category
  - Child category
- Both initially show `All`.
- Selecting a parent resets the child selector to `All` and shows items from all of that parent's child categories.
- Selecting a child filters items to that child category.
- Selecting `All` at child level returns to the selected parent's aggregate view.
- The global `All` view continues to include legacy/unassigned items.

### 8.5 Dashboard and Reports Completed

- Dashboard **Menu Items Sales** now has parent and child selectors.
- Reports **Menu Items Sales** now has parent and child selectors.
- Both pages start with parent and child set to `All`.
- Changing the parent resets the child to `All`.
- Parent selection aggregates historical sales rows whose stored category names belong to that parent's child categories.
- Child selection filters historical sales to the selected child category.
- Reports top-item response typing now includes category and bundle fields used by the UI.

### 8.6 Validation Completed

- Backend syntax checks passed for the changed controllers, routes, and models.
- Focused TypeScript checks passed for the changed category, menu, POS, dashboard, and reports files.
- Production frontend builds passed after the hierarchy, assignment, POS, dashboard, and reports updates.
- Live authenticated browser verification was unavailable because the shared server URL redirected to login with a 401 response.

### 8.7 Remaining Follow-Up

- Automated backend/frontend tests for hierarchy migration, assignment, deletion guards, and POS navigation have not yet been added.
- `Deals` and `Platters` bundle detection still uses legacy category-name checks in existing reporting code; an explicit stable item type remains a future hardening task.
