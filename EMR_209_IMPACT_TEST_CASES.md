# EMR-209 Impact Analysis: Areas Affected by the Running "Balance" Change

**Change under test**: Batch Transaction History gets a **Balance** column, backed by a new API field `balanceAfter` on `GET /aesthetic/batches/:id/transactions`.
**Why other areas are affected**: every screen or job that **writes** a stock transaction now has to leave a correct running balance. Every screen that **reads** stock must agree with the latest balance, or users see two different numbers for the same batch.
**Feature test cases**: [EMR_209_TEST_CASES.md](file:///c:/Users/LENOVO/Desktop/aergertuc/EMR_209_TEST_CASES.md) · **Impact suite**: [`tests/emr-209-impact.spec.js`](file:///c:/Users/LENOVO/Desktop/aergertuc/tests/emr-209-impact.spec.js)
**Date**: 2026-11-05 · **QA data swept**: 118 products · 269 batches with history · 1,985 transactions · 253 catalog batches

---

## 1. Affected Areas Map

### 1.1 Writers: create a transaction row, so a balance must be produced

| # | Area / action | Screen · source | Transaction type written | Impact | Risk |
|---|---|---|---|---|---|
| W1 | Create product with initial Quantity | Settings → Products → Add (`products/form.jsx`), and the **inline "create product"** in Consultation → Products tab (`appointments/[id]/products.jsx`) | first row of the new batch (`grn` / import) | First balance = initial qty | Medium |
| W2 | Add batch | Manage Batches → Add (`manage-batches.jsx`) | `grn` | Balance starts at qty | Medium |
| W3 | CSV import | Products → Import (`import-form.jsx` → `/aesthetic/import-products-csv`) | `import` **or `null`** (legacy) | Type shows "Unknown" (**DF-2**) | Medium |
| W4 | Manual Add / Deduct | Stocks → Adjust (`batch-adjustment-dialog.jsx`) | `manual_add` / `manual_deduct` + `transactionDate` | Backdating (**DF-1**), over-deduct | **High** |
| W5 | Remove remaining stock | Manage Batches → Remove (`manage-batches.jsx`) | `manual_deduct` (all units) | Balance must hit exactly 0 | Medium |
| W6 | Invoice draft: add item / raise qty | Invoice → Add Items, line qty (`add-item-form.jsx`, `invoice-item.jsx`, autosave `PUT /invoices/:id`) | `invoice_deduct` | Every autosave writes a row | **High** |
| W7 | Invoice draft: lower qty / remove item | Invoice line (`invoice-form.jsx`) | `invoice_refund` | Partial returns | **High** |
| W8 | Complete invoice (paid) | Invoice → Record Payment / Complete | `invoice_deduct` with change **0** → "Purchase" | Balance unchanged | Low |
| W9 | Refund paid invoice | Invoice → Refund (`PUT /invoices/:id/refund`) | `invoice_refund` | Must return exactly what was sold | **High** |
| W10 | Delete (Discard) invoice | Invoice → Discard → **Delete** (`DELETE /invoices/:id`) | `invoice_refund` "(Invoice #… deleted)" | Verified OK (IMP-20) | Medium |
| W11 | **Auto-cancel draft job** | Backend, "before 5:30 PM daily cutoff" | `invoice_refund` | **Duplicate rows (EMR-208 DF-3)** | **Critical** |

### 1.2 Readers: must show the same number as the latest balance

| # | Area | Screen · source | Field | Verified |
|---|---|---|---|---|
| R1 | Batch Transaction History | Stocks → By Product → History (`batch-history-dialog.jsx`) | `balanceAfter` | ✅ EMR-209 suite |
| R2 | By Product: batch "Available" | `by-product-view.jsx` (5 per page) | `quantityAvailable` | ✅ IMP-01 |
| R3 | By Product: product **Total Stock** | `by-product-view.jsx` header (red when ≤ `min_stock_level`) | `availableQuantity` | ✅ IMP-02, IMP-07 |
| R4 | By Batch: "Available" | `by-batch-view.jsx` (`/aesthetic/batches`) | `quantityAvailable` | ✅ IMP-08 |
| R5 | Manage Batches table | `manage-batches.jsx` | `quantityAvailable` | ✅ IMP-01 (same field) |
| R6 | **Add Items catalog "Available"** | `add-item-form.jsx` (`/aesthetic/search`) | `batch_quantity` | ✅ IMP-03, IMP-20 |
| R7 | EMR-208 highlight / zero-stock hiding | `add-item-form.jsx` | depends on R6 | Linked: wrong stock → wrong highlight |
| R8 | Invoice line max qty | `invoice-item.jsx` / `invoice-form.jsx` | `batch_quantity` captured when added (stale) | Manual (SYS-04) |

### 1.3 Not affected (checked)

| Area | Why not |
|---|---|
| Finances → Invoices list / Invoice view (`aesthetic-finances/`) | Shows invoice **status** only. No stock reads or writes. Regression check only. |
| Telemedicine → Transactions (`telemedicine/transactions`) | Same word "transactions" but these are **payment** transactions (`/telemed/admin/transactions`). Not stock. |
| Treatments (no batches) | No stock. |

---

## 2. System Sweep Results (QA, read-only, 2026-11-05)

| Check | Result |
|---|---|
| Latest balance = batch Available (269 batches) | **0 mismatches** ✅ |
| Product Total Stock = sum of batches (118 products) | **0 mismatches** ✅ |
| Add Items catalog Available = latest balance (253 batches) | **0 mismatches** ✅ |
| Running balance recomputes from changes (1,985 rows) | **0 mismatches** ✅ |
| Negative balances / missing `balanceAfter` | **0** ✅ |
| Batches with stock but no history | **0** ✅ |
| Rows with **no type** (shown as "Unknown") | **248 rows** ❌ (DF-2). Newer imports use `import` (4 rows), older ones `null`. |
| Types in use | `invoice_deduct` 1,095 · `invoice_refund` 587 · `null` 248 · `manual_deduct` 19 · `manual_add` 16 · `grn` 16 · `import` 4 |

**Conclusion:** the balance is consistent everywhere it's read. The risks are in the **writers**: auto-cancel duplicates, backdated adjustments, and untyped import rows.

---

## 3. Impact Test Cases

### Part 1: Readers agree with the balance (automated, read-only)

| ID | Area | Scenario | Expected | Priority | Automation |
|:---|:---|:---|:---|:---|:---|
| **IMP-01** | R2 / R5 | Every batch: latest `balanceAfter` vs `quantityAvailable`. | Equal. | **P0** | Automated |
| **IMP-02** | R3 | Every product: Total Stock vs sum of its batches. | Equal. | **P0** | Automated |
| **IMP-03** | R6 / R7 | Every catalog batch: Add Items "Available" vs latest balance. | Equal. | **P0** | Automated |
| **IMP-04** | W1–W11 | Recalculate the running balance per batch, across every transaction type. | Matches `balanceAfter` on every row. | **P0** | Automated |
| **IMP-05** | all | Negative balances. Stock with no history. | None. | **P1** | Automated |
| **IMP-06** | W3 | Every row has a `type`. | **Fails: 248 null rows (DF-2).** | **P3** | Automated (`test.fail`) |
| **IMP-07** | R3 (UI) | By Product: Total Stock vs the sum of "Available" across all batch pages. | Equal. | **P1** | Automated |
| **IMP-08** | R4 (UI) | By Batch: search a batch, compare "Available" with the history balance. | Equal. | **P1** | Automated |

### Part 2: Writers produce the right balance

| ID | Area | Steps | Expected row in History | Priority | Automation |
|:---|:---|:---|:---|:---|:---|
| **IMP-20** | W6 + W10 | Draft invoice → Add 1 unit → open History. Then delete the draft. | `Invoice Deduct −1`, balance −1. Catalog Available −1. After delete: **exactly one** `Invoice Refund +1`, balance restored. | **P0** | Automated (net 0) ✅ |
| **IMP-21** | W1 | Create product "QA-209 Test" with Quantity 10. | New batch. First row +10 → **balance 10**. Type not "Unknown". | **P1** | Manual |
| **IMP-22** | W1 (consultation) | Consultation → Products → create a product inline with Quantity 5. | Same as IMP-21 (balance 5). Product auto-added to the consultation. | **P2** | Manual |
| **IMP-23** | W2 | Manage Batches → Add batch qty 8, expiry next year. | `Grn +8`, balance 8. Shown in Add Items (EMR-208). | **P1** | Manual |
| **IMP-24** | W3 | Import a CSV with 1 product, qty 12. | First row typed "Import" (not "Unknown"), +12, balance 12. | **P2** | Manual |
| **IMP-25** | W4 | Adjust +5, then −5 on one batch. | `Manual Add +5` → `Manual Deduct −5`. Balances +5 then back. "Update Date" = the chosen date. | **P0** | Automated in EMR-209 TC-020 (±1) |
| **IMP-26** | W4 (backdate) | Adjust −2 with Date = 7 days ago. | Placement and dates clearly labelled per PO. Never negative. Blocked before the batch was received (**DF-1**). | **P1** | Manual |
| **IMP-27** | W4 (over-deduct) | Deduct Available + 1. | Rejected. No row. Balance unchanged. | **P0** | Manual |
| **IMP-28** | W5 | Manage Batches → Remove remaining stock. | One row `−Available`, balance **0**. Batch disappears from Add Items (EMR-208). | **P1** | Manual |
| **IMP-29** | W6 | Draft: raise a line qty 1 → 3 in steps. | One deduct row per autosave (−1, −1). Each balance correct. No skipped or duplicate row. | **P1** | Manual |
| **IMP-30** | W7 | Draft: lower qty 3 → 1, then remove the line. | `Invoice Refund +2` then `+1`. Balance back to the start. | **P1** | Manual |
| **IMP-31** | W8 | Pay and complete the invoice. | `Purchase` row, change `-`, balance unchanged. | **P1** | Manual |
| **IMP-32** | W9 | Refund a paid invoice of 2 units. | **Exactly one** `Invoice Refund +2`. Balance +2. | **P0** | Manual |
| **IMP-33** | W11 | Leave a draft with 2 units past the 5:30 PM cutoff. | **One** "System auto-cancelled" refund +2. **Fails today (EMR-208 DF-3: written twice).** | **P0** | Manual + EMR-208 TC-031/032 |
| **IMP-34** | W6 multi-batch | One invoice with 2 batches of the same product. | Each batch's history gets only its own rows and balance. | **P1** | Manual |
| **IMP-35** | W6 + W11 cross-day | Draft created before the cutoff, edited after. | No refund for units still on the invoice. Balance never above received. | **P1** | Manual |

### Part 3: Concurrency, refresh, cross-module

| ID | Scenario | Expected | Priority | Automation |
|:---|:---|:---|:---|:---|
| **IMP-40** | Tab A: History open. Tab B: invoice deducts. Tab A: close and reopen History. | New row shown. Balance = new Available (no stale react-query cache). | **P2** | Manual |
| **IMP-41** | Two users deduct the same batch within 1s (invoice + manual). | Two rows with different, consecutive balances. Final = start − both. | **P1** | Manual |
| **IMP-42** | Low-stock indicator: deduct until Total Stock ≤ `min_stock_level`. | Total Stock turns **red** on By Product. History balance matches the number. | **P2** | Manual |
| **IMP-43** | EMR-208 link: deduct the first-entered batch to 0. | History balance 0. Batch hidden in Add Items. Highlight moves to the next batch. | **P1** | Manual |
| **IMP-44** | Clinic switch (org isolation). | History, balances and totals only for the selected clinic's batches. | **P1** | Manual |
| **IMP-45** | Finances → Invoices list after refund / cancel. | Status shows Refunded / Cancelled. No stock change from just viewing. | **P3** | Manual (regression) |

---

## 4. Execution Results (QA, Chromium, 2026-11-05)

`npx playwright test tests/emr-209-impact.spec.js --project=chromium`: **8 passed, 1 expected failure**.

| Result | Tests |
|---|---|
| **Pass** | IMP-01, IMP-02, IMP-03, IMP-04, IMP-05 (20 products by default), IMP-07, IMP-08, **IMP-20** (invoice deduct and delete-refund: exactly one refund, balance restored, net zero) |
| **Known defect (`test.fail`)** | IMP-06: 57 untyped rows in the first 20 products (248 system-wide). |

Run the full sweep (≈ 8 min) with `EMR209_FULL=1`. Skip the IMP-20 write with `EMR209_READONLY=1`.

**What this tells dev:**
- **The delete path is fine.** Deleting a draft writes exactly one refund (IMP-20). The duplicate-refund bug (EMR-208 DF-3) is limited to the **auto-cancel job** and some manual refund paths (e.g. `AA-17735` written ×3). Fix those writers. The Balance calculation itself is correct.
- **Backfill `type` on 248 legacy rows** (`null` → `import`) so History doesn't show "Unknown".
- **Block backdated adjustments** before the batch's added date (DF-1). Otherwise Balance and "Update Date" tell different stories.

## 5. Automated Writers & Readers Suite: all 11 writers and 8 readers

**File**: [`tests/emr-209-writers.spec.js`](file:///c:/Users/LENOVO/Desktop/aergertuc/tests/emr-209-writers.spec.js) · runs serially in about 4 minutes

```bash
npx playwright test tests/emr-209-writers.spec.js --project=chromium
```

**Safety design:** each run creates its **own test products** (`QA209X<timestamp> Balance Test` and `… CSV Import`, price LKR 1). Every stock write happens on those products only, never on real stock. `afterAll` deletes the run's drafts, empties the test batches and **deletes the test products** (HTTP 200 on every run).
**By design, each run leaves** one **Refunded LKR 1 invoice** on the first appointment (W8 → W9), because a finance record isn't deleted.

| ID | Writer / reader | What the test does | Expected | Result |
|:---|:---|:---|:---|:---|
| **W1** | Create product with qty | `POST /aesthetic/products` qty 10 | 1 batch, first row +10, balance 10, has a type | ✅ Pass (type = `import`) |
| **W2** | Add batch | `POST /products/:id/batches` qty 8 | `Grn +8`, balance 8 | ✅ Pass |
| **W3** | CSV import | `POST /import-products-csv` qty 12 | +12, balance 12 | ✅ Pass |
| **W3b** | CSV import type | same | type not null | ❌ **DF-2 reproduced live**: new CSV imports still write `type = null` ("Unknown") |
| **W4** | Manual Add / Deduct | +3 then −2 | `manual_add` → 13, `manual_deduct` → 11, chain intact | ✅ Pass |
| **W4b** | Over-deduct | Deduct Available + 1 | Rejected (≥ 400), no row, balance unchanged | ✅ Pass: the server blocks it |
| **W4c** | Backdated adjustment | Adjust dated 2020-01-01 | Rejected | ❌ **DF-1 reproduced live**: HTTP 200, stored `transactionDate 2020-01-01` (then reverted by the test) |
| **W6** | Draft: add + raise qty (UI) | Add Items → Add, then qty 1 → 3 | `Invoice Deduct` rows, balance 11 → 10 → 8 | ✅ Pass |
| **R8** | Invoice line max qty (UI) | Type qty far above stock | Clamped to what the batch can supply | ✅ Pass |
| **W7** | Draft: lower qty / remove line (UI) | qty 3 → 2, then remove | `Invoice Refund +1`, then refund of the rest, balance back to start | ✅ Pass |
| **W8** | Complete (pay in full) (UI) | Record Payment → Save payment | "Fully Paid". `Purchase` row (change 0), balance unchanged | ✅ Pass |
| **W9** | Refund (UI) | Initiate Refund → Confirm Refund | **Exactly one** `Invoice Refund +1`, balance restored | ✅ Pass: manual refund writes one row |
| **W10** | Delete invoice (UI) | Discard → Delete | **Exactly one** refund, balance restored | ✅ Pass |
| **W11** | Auto-cancel job | Read-only ledger check (can't be triggered on demand) | Refund ≤ deducted per auto-cancelled invoice | ❌ **EMR-208 DF-3**: 10 over-refunds in the first 20 products |
| **R1–R6** | History · By Product Available · Total Stock · By Batch · Manage Batches · Add Items | Compare all six with the latest balance for both test batches | All equal | ✅ Pass |
| **R6b** | Add Items search vs slow first list | Delay the empty-search response by 3 s, type the search while it's pending | Search results kept (not replaced by the late full list) | ✅ Pass: the app handles out-of-order responses |
| **W5** | Remove remaining stock | Deduct all with "Removed manually: …" | One row −Available, balance 0, batch hidden in Add Items | ✅ Pass |
| **R7** | EMR-208 highlight | Before W5 the first-entered batch is highlighted. After W5 the next batch should be. | Highlight moves | ⚠️ Before: ✅ highlighted. After: ❌ **EMR-208 DF-2 reproduced live** (single remaining batch not highlighted) |

**Run result (QA, Chromium, 2026-11-05): 14 passed, 4 known defects (`test.fail`, each failing for the documented reason). Stable over 2 consecutive runs.**

**What the live run proves for dev:**
- The running balance is written correctly by **every** writer the UI exposes: product create, GRN, import, manual add/deduct, remove, draft add/raise/lower/remove, payment/purchase, refund and delete.
- **Manual refund (W9) and delete (W10) write exactly one refund.** The duplicate-refund defect (EMR-208 DF-3) is isolated to the **auto-cancel job (W11)**.
- Over-deduct is safely blocked on the server (W4b), but **backdating is not** (W4c, DF-1).
- **New** CSV imports still create untyped rows (W3b, DF-2), so the fix is needed in the import code, not just a data backfill.

### Test-data housekeeping (needs a manual action)

On the **first appointment** (Parami Gamage – Initial Consultation), please delete by hand (Invoices tab → Discard → **Delete**):
- **Empty drafts** created by two earlier runs of this suite, before the W5 cleanup fix. They have **no items**.
- **AA-17992**, an empty draft from my EMR-208 probe.

Leave **AA-17990, AA-17991 and AA-17993** alone: they belong to someone else and hold items. My automated cleanup of these empty drafts was blocked by the permission check, so it needs a person to confirm.

## 6. Open Questions

1. Should the auto-cancel duplicate rows already in the data (EMR-208 DF-3) be cleaned up? They inflate today's balances, e.g. Allegra 16 out of 12 received.
2. Should Batch History be reachable from **By Batch** and **Manage Batches** too (currently only By Product)?
3. Should the invoice line show the live balance instead of `batch_quantity` captured when the item was added (R8)?
