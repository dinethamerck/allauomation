# EMR-209: Running "Balance" Column in Batch Transaction History

**Feature ID**: `EMR-209` *(next number in sequence; the ticket had none, so rename if the board uses another)*
**Path**: EMR | Amaran → Product → **Stocks** → **By Product** → select product → batch **History** button
**Target Application**: AMERCK CARE QA (`BASE_URL` in `.env`; API `pg_api_emr_dev.amerck.care`)
**Test Suite File**: [`tests/emr-209.spec.js`](file:///c:/Users/LENOVO/Desktop/aergertuc/tests/emr-209.spec.js)
**Related**: [EMR-208 system break points](file:///c:/Users/LENOVO/Desktop/aergertuc/EMR_208_SYSTEM_BREAKPOINTS.md) (stock ledger defects DF-3/DF-4)

---

## 1. Feature Overview & Requirements

Clicking **History** on a batch opens *Batch Transaction History*. Every stock movement is listed (newest first). The ticket adds a **Balance** column so users can see the stock left after each movement.

### 1.1 Ticket requirements

| ID | Requirement |
|---|---|
| **R1** | New column **Balance**, placed **immediately after Change**. |
| **R2** | Each row shows the stock balance **after that transaction**. |
| **R3** | Stock Added → balance increases. Stock Removed → decreases. Stock Adjusted → changes by the adjustment. |
| **R4** | The balance is accurate and consistent across the whole history (newest balance = current stock). |
| **R5** | The balance updates whenever a new transaction happens. |

### 1.2 Oracle used by the tests

Rows are newest first, so for each row *i*: **Balance(i) = Balance(i+1) + Change(i)**. The oldest row's balance = its own change (starting from 0). The newest balance = the batch's **Available** column. The API field `balanceAfter` must match the UI and a fresh recalculation from all `change` values in `(createdAt, id)` order.

### 1.3 Code & system review

| Layer | Where | Finding |
|---|---|---|
| Dialog (local source) | `app/admin/aesthetic-settings/products/batches/batch-history-dialog.jsx` | Columns: Date, Type, Change, Notes, User/Details. **No Balance**. Renders rows in API order. Type label = `type.replace('_',' ')` (first underscore only). `type` null → "Unknown". `change 0` + `invoice_deduct` → "purchase" with `-`. |
| Dialog (QA build) | same, newer | Columns: **Date · Update Date · Type · Change · Balance · Notes · User/Details**. Balance taken from API `balanceAfter`. All rows render (98 on one batch), no pagination. |
| API | `GET /aesthetic/batches/:id/transactions` | Returns `id, change, notes, type, metadata, transactionDate, batchId, orgId, createdAt, updatedAt, balanceAfter`. Sorted `createdAt` desc, then `id` desc. |
| Adjust dialog (QA) | `batch-adjustment-dialog.jsx` (QA build adds a Date field) | Action Add/Deduct, Quantity `min=1` (**no max**), **Date `max=today`, no `min`**, Reason required. On success it invalidates `["batch-transactions", batchId]`, so History refreshes. |
| Opened from | `by-product-view.jsx` | Only from **By Product**. Batch table is paginated at 5 per page. The product row **toggles** open/closed on click. |

> **The local `emr-frontend` source is behind QA:** no Balance column, no Update Date column and no date field in Adjust. Get the EMR-209 branch from dev and re-review it.

### 1.4 Break points

| ID | Break point | Why it can break | Covered by |
|---|---|---|---|
| **BP-1** | **Backdated adjustments** | The Adjust date has no lower limit, so stock can be adjusted with a date **before the batch existed**. The balance is calculated in entry order (`createdAt`) while "Update Date" shows the business date. Re-ordered by business date, the Acnechio batch goes **negative (−10 on 12 Aug)** before it was received on 18 Sep. | TC-009, TC-010 → **DF-1** |
| **BP-2** | Rows with no type | CSV import rows have `type = null` → shows **"Unknown"** instead of "Stock Added / Import". GRN shows as "Grn". | TC-011 → **DF-2** |
| **BP-3** | Duplicate ledger rows | EMR-208 DF-3 duplicate refunds show as two identical rows, and the Balance faithfully shows the inflated figure (Allegra 8 → 12 → **16**, received 12). | TC-012 |
| **BP-4** | Same-second rows | Many rows share a timestamp (`13:44` burst). If the sort ever uses only `createdAt`, rows swap and the chain looks broken. The tie-break by `id` must stay. | TC-004 |
| **BP-5** | Zero-change rows | "Purchase" rows (`change 0`) show `-`. Balance must stay unchanged. | TC-007 |
| **BP-6** | Long history | 98+ rows, no pagination. If pagination or "load more" is added later, the balance **must stay server-side**: client-side running totals break on page 2. | TC-008, TC-018 |
| **BP-7** | Concurrent adjustments | Two users adjust the same batch at the same moment. If `balanceAfter` is stored at write time without a lock, both rows can get the same balance. | TC-019 |
| **BP-8** | Over-deduct | Deduct quantity has no max in the UI. The server must reject it, and the balance must never be negative. | TC-016 |
| **BP-9** | Decimal / invalid qty | `parseInt("2.5") = 2` → the balance moves by 2 while the user typed 2.5. | TC-017 |
| **BP-10** | "Update Date" meaning | Column labelled *Update Date* actually shows the **effective transaction date** (`transactionDate`), not when the row was updated. Stored as midnight UTC → can show the previous day in negative-UTC time zones. | TC-014 |
| **BP-11** | Batches with stock but no history | Old batches created before the ledger existed would show "No transactions found" while Available > 0, so the Balance can't be reconciled. | TC-015 |
| **BP-12** | Product total vs batch balances | "Total Stock" on the product row must equal the sum of each batch's latest balance. | TC-013 |

---

## 2. Test Execution Commands

```bash
# Full suite (includes TC-020: real +1 / -1 adjustment, net zero)
npx playwright test tests/emr-209.spec.js --project=chromium

# Read-only (skips TC-020)
EMR209_READONLY=1 npx playwright test tests/emr-209.spec.js --project=chromium

# Single test
npx playwright test tests/emr-209.spec.js --project=chromium -g "TC-004"
```

**Test data (QA):** Allegra 180 mg `IMP-483285-193` (13 rows: import, invoice, refund, auto-cancel). Acnechio anti acne body spray 100ml `B-1789710766674-126` (98 rows: GRN, invoice, manual add/deduct, backdated). Allermine 4mg `B-1790592857773-006` (no history).

---

## 3. Test Matrix

### Part 1: Column & display

| ID | Scenario | Steps | Expected | Priority | Automation |
|:---|:---|:---|:---|:---|:---|
| **TC-001** | Balance column position (R1) | Open History on any batch. | Header order: … **Change, Balance** … | **P0** | Automated |
| **TC-002** | Balance on every row (R2) | Read each row. | Every row has a whole number. None blank, `NaN` or `undefined`. | **P0** | Automated |
| **TC-003** | Empty history | History on a batch with no transactions. | "No transactions found." spans **all** columns, including Balance. | **P2** | Automated |
| **TC-014** | Date vs Update Date (**BP-10**) | Compare with a backdated adjustment. | Column labels make sense to users (e.g. "Entered" / "Effective date"). Dates are correct in Asia/Colombo. | **P2** | Manual |
| **TC-021** | Visual / responsive | Open the dialog at 1366px and 768px wide. | Balance column readable and not wrapped. Long notes wrap without pushing Balance off-screen. | **P3** | Manual |

### Part 2: Running balance correctness

| ID | Scenario | Steps | Expected | Priority | Automation |
|:---|:---|:---|:---|:---|:---|
| **TC-004** | Chain consistency (R3/R4) | For each row: Balance = next-older Balance + Change. | 0 breaks. Oldest row balance = its change. Run on Allegra (13 rows) and Acnechio (98 rows). | **P0** | Automated |
| **TC-005** | Newest balance = Available (R4) | Compare the top row's Balance with the batch table "Available". | Equal. | **P0** | Automated |
| **TC-006** | UI = API | Compare each UI Balance with `balanceAfter`. | Identical for all rows. | **P1** | Automated |
| **TC-007** | Purchase / zero rows (**BP-5**) | Find "Purchase" rows. | Change `-`. Balance equals the row below. | **P1** | Automated |
| **TC-008** | System sweep (API) | First 15 products, all batches with history: recalculate the running balance. | `balanceAfter` always matches. Never negative. Last balance = `quantityAvailable`. | **P0** | Automated |
| **TC-013** | Product total (**BP-12**) | Sum each batch's top Balance for a product. | Equals the product's "Total Stock". | **P1** | Manual |
| **TC-015** | Stock without history (**BP-11**) | Find a batch with Available > 0 and no transactions. | Shouldn't exist. If it does, flag it: Balance can't be reconciled. | **P2** | Manual |

### Part 3: Live updates per transaction type (R3/R5)

| ID | Transaction | Steps | Expected | Priority | Automation |
|:---|:---|:---|:---|:---|:---|
| **TC-020** | Manual **Add** then **Deduct** | Adjust +1 (reason) → History. Then adjust −1 → History. | New top row "Manual Add +1", balance = previous + 1. Then "Manual Deduct −1", balance back. Available matches each time. | **P0** | Automated (writes, net 0) |
| **TC-022** | GRN / new batch | Add a new batch (qty 10). | First row "GRN +10", balance 10. | **P1** | Manual |
| **TC-023** | Invoice deduct (draft autosave) | Add 2 units to a draft invoice. | Row "Invoice Deduct −2", balance −2. Notes name the invoice. | **P0** | Manual |
| **TC-024** | Invoice item removed / qty lowered | Lower qty 2 → 1 on the draft. | "Invoice Refund +1", balance +1. | **P1** | Manual |
| **TC-025** | Invoice completed (purchase) | Complete the invoice. | "Purchase" row, change `-`, balance unchanged. | **P1** | Manual |
| **TC-026** | Invoice deleted / refunded / auto-cancelled | Delete or refund the invoice, or let auto-cancel run. | **Exactly one** "Invoice Refund" per unit. Balance returns to the pre-invoice value. *(Fails today: EMR-208 DF-3.)* | **P0** | Manual + TC-012 |
| **TC-027** | Import (CSV) | Import a product with qty 12. | First row with a meaningful type (not "Unknown"), +12, balance 12. | **P2** | Manual |
| **TC-028** | Dialog refresh | Keep History open in tab A. Adjust in tab B. Reopen in tab A. | New row and new balance shown (no stale cache). | **P2** | Manual |

### Part 4: Break points / negative

| ID | Scenario | Steps | Expected | Priority | Automation |
|:---|:---|:---|:---|:---|:---|
| **TC-009** | Adjustment dated before batch existed (**BP-1**) | Read `transactionDate` vs the batch's first row. | No adjustment dated before the batch was received. **Fails (DF-1).** | **P1** | Automated (`test.fail`) |
| **TC-010** | Adjust date lower limit (**BP-1**) | Open Adjust and inspect the Date input. | `min` = batch added date, `max` = today. **Fails: no min (DF-1).** | **P1** | Automated (`test.fail`) |
| **TC-011** | Import row type (**BP-2**) | History on an imported batch. | Type is not "Unknown". **Fails (DF-2).** | **P3** | Automated (`test.fail`) |
| **TC-012** | Duplicate refunds visible (**BP-3**) | History on Allegra `IMP-483285-193`. | No duplicate refund rows. **Fails (EMR-208 DF-3).** | **P0** | Automated (`test.fail`) |
| **TC-016** | Over-deduct (**BP-8**) | Deduct Available + 1. | Rejected with a clear error. No new row. Balance unchanged and never negative. | **P0** | Manual |
| **TC-017** | Qty 0 / negative / decimal (**BP-9**) | Adjust with `0`, `-1`, `2.5`, `e`. | 0 / −1 / `e` blocked. 2.5 blocked or explicitly rounded. Balance moves by exactly what's shown in Change. | **P1** | Manual |
| **TC-018** | Large history performance (**BP-6**) | Batch with 98+ rows. | Opens in < 2s. Scrolls smoothly. Balance chain still correct at the bottom. | **P2** | Automated (chain) / Manual (timing) |
| **TC-019** | Concurrent adjustments (**BP-7**) | Two users submit +5 on the same batch within 1s. | Two rows with **different** balances (e.g. 88, 93). Final = start + 10. | **P1** | Manual |
| **TC-029** | Backdated adjustment display (**BP-1**) | Adjust with Date = 1 week ago. | PO decides: the row stays in entry order (current) and the dates are clearly labelled, **or** it's placed by business date and balances are recalculated. Never a negative balance. | **P1** | Manual |
| **TC-030** | Permissions | Log in as a role without stock rights. | History is read-only. The Adjust action is hidden or rejected. | **P2** | Manual |

---

## 4. Execution Results (QA, Chromium, 2026-11-05)

Full run: **13 passed, 1 skipped** in read-only mode (TC-020 skipped). TC-020 also passed on its own write run, which was net zero: batch `B-1789710766674-126` went **83 → 84 → 83**, with rows reasoned "EMR-209 QA automated test".

| Result | Test cases |
|---|---|
| **Pass** | TC-001 (Balance right after Change), TC-002, TC-003, TC-004 ×2 (0 chain breaks on 13 + 98 rows), TC-005, TC-006, TC-007, TC-008 (sweep of 15 products: all `balanceAfter` correct, none negative), TC-020 |
| **Defect DF-1 (`test.fail`)** | **TC-009 / TC-010**: adjustment date has no lower limit. Acnechio `B-1789710766674-126` (received **18 Sep 2026**) has *Manual Deduct −10* dated **12 Aug 2026** and *Manual Add +10* dated **15 Sep 2026**. By business date the balance would be **−10**. |
| **Defect DF-2 (`test.fail`)** | **TC-011**: CSV import rows show Type **"Unknown"**. |
| **Known (EMR-208 DF-3)** | **TC-012**: Allegra `IMP-483285-193` shows two identical **+4** "System auto-cancelled draft Invoice #AA-17662" rows. Balance 8 → 12 → **16**, but only 12 were ever received. The Balance column now makes this defect visible to users. |

**Verdict on the change itself:** the Balance column works as specified (R1–R5). The open issues come from the data and validation around it (DF-1, DF-2, EMR-208 DF-3), not from the balance calculation.

> **Heads-up:** during this run someone was also using the shared `parami` account on QA. They created batch `B-1793880333809-649` and were editing invoice `AA-17993` (another reused number, EMR-208 DF-4). Total Stock for Acnechio changed between runs because of that, not because of this suite.

---

## 5. Open Questions for PO / Dev

1. **Backdated adjustments:** should a back-dated row be placed (and the balance recalculated) by its effective date, or stay in entry order? Either way, block dates before the batch was received.
2. **Column naming:** rename "Update Date" to "Effective Date" and "Date" to "Entered"?
3. **Type labels:** map `null` → "Stock Added (Import)" and `grn` → "GRN"?
4. Should the Batch History also be reachable from **By Batch** (currently By Product only)?
5. Export / print of the history with balances (audits)?
