# CRAVEABLES Business Validation & Test Report

All 10 mandatory business test scenarios from Section 18 of the specification have been implemented, verified, and automated.

```
Ran 10 tests in 6.957s
Status: OK (100% Passed)
```

---

## Detailed Test Verification Matrix

### TEST 1 — Inventory Deduction
- **Scenario:** Starting Flour = 1,000g. Confirmed production batch requires 250g flour.
- **Expected:** Remaining stock = 750g.
- **Result:** **PASSED**. Ingredient `current_stock` updated to `750.00g` and `StockTransaction` logged with `quantity_change = -250.00`.

### TEST 2 — Low Stock Warning
- **Scenario:** Current Flour stock = 150g, Reorder Level = 200g.
- **Expected:** Stock Status = `LOW` (Orange warning badge on dashboard and inventory table).
- **Result:** **PASSED**. Ingredient status evaluated dynamically to `LOW`.

### TEST 3 — Out of Stock
- **Scenario:** Current Sugar stock = 0g.
- **Expected:** Stock Status = `OUT_OF_STOCK` (Red warning badge).
- **Result:** **PASSED**. Ingredient status evaluated dynamically to `OUT_OF_STOCK`.

### TEST 4 — Ingredient Restocking
- **Scenario:** Current Flour stock = 150g. New purchase order received = 1,000g.
- **Expected:** Remaining stock = 1,150g.
- **Result:** **PASSED**. Automated stock increment via `PurchaseOrder` updated stock to `1,150.00g`.

### TEST 5 — Automated Recipe Costing
- **Scenario:** Flour purchase cost ₱60 for 1,000g (₱0.06/g). Recipe usage = 250g.
- **Expected:** Ingredient Cost = 250g × ₱0.06 = ₱15.00.
- **Result:** **PASSED**. Exact unit cost calculation matching Excel costing formulas.

### TEST 6 — Production Management
- **Scenario:** One batch requires 250g flour. Produce 2 batches.
- **Expected:** Total deduction = 500g flour.
- **Result:** **PASSED**. 1,000g - 500g = 500g remaining stock.

### TEST 7 — Sales Management
- **Scenario:** Record product sale (2 boxes of Choco Chip Delight at ₱180).
- **Expected:** Sales revenue = ₱360.00, Gross profit = ₱360.00 - COGS.
- **Result:** **PASSED**. Sale order, total revenue, and historical gross profit updated immediately.

### TEST 8 — Expense Management
- **Scenario:** Record electricity (₱500) and shipping courier (₱150).
- **Expected:** Total operating expenses = ₱650.00. Net profit = Gross Profit - Operating Expenses.
- **Result:** **PASSED**. Correct accounting separation between COGS and operating overheads.

### TEST 9 — Multi-Device Synchronization
- **Scenario:** Stock transaction recorded on client 1. Query immediately by client 2.
- **Expected:** Centralized database synchronizes and reflects identical state across devices.
- **Result:** **PASSED**. ACID-compliant ORM persistence ensures multi-client consistency.

### TEST 10 — Data Integrity & Shortage Prevention
- **Scenario:** Attempt production requiring 60g cocoa when only 50g is available.
- **Expected:** System rejects confirmation, prevents deduction, and explains the 10g shortage.
- **Result:** **PASSED**. Transaction is aborted with explicit validation error detailing the ingredient shortage.

