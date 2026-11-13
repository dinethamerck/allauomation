# EMR-208 (#29): Highlight the First Batch Entered Under a Product

**Feature ID**: `EMR-208` (board item #29, status *QA Ready*)
**Path**: EMR | Amaran → Schedule → Appointment → Invoices → New/Draft Invoice → **Add Items**
**Target Application**: AMERCK CARE QA (`BASE_URL` in `.env`; API `pg_api_emr_dev.amerck.care`)
**Test Suite File**: [`tests/emr-208.spec.js`](file:///c:/Users/LENOVO/Desktop/aergertuc/tests/emr-208.spec.js)
**Page Objects**: [`tests/pages/ConsultationInvoicePage.js`](file:///c:/Users/LENOVO/Desktop/aergertuc/tests/pages/ConsultationInvoicePage.js), [`tests/pages/StocksPage.js`](file:///c:/Users/LENOVO/Desktop/aergertuc/tests/pages/StocksPage.js)

---

## 1. Feature Overview & Requirements

The Add Items catalog shows one card per **product batch** (`Product (Batch: B-…)`). Staff need to see which batch to sell first, so the first batch entered into stock is used up before newer stock.

### 1.1 Ticket requirements

| ID | Requirement |
|---|---|
| **R1** | For each product, highlight one batch with a **light yellow** background. It must clearly differ from the other batches. |
| **R2** | The highlighted batch is the **first entered** eligible batch, based on **batch entry order**. |
| **R3** | Batches with **available stock = 0** are **not displayed**. Only batches with stock > 0 are shown. |
| **R4** | If the first-entered batch has 0 stock, it is hidden and the **next available batch in entry order** is highlighted. The highlight moves automatically as stock changes. |
| **R5** | *(derived)* Treatments have no batches, so they are never highlighted. |

### 1.2 Oracle used by the tests

"Entry order" = `addedDate` ascending (then `id` ascending as a tie-break) from `GET /aesthetic/products/:id/batches`. "Eligible" = `quantityAvailable > 0` and not expired (QA already hides expired batches; see Q2).

### 1.3 Code & system review: how it works

| Layer | Where | What it does |
|---|---|---|
| Catalog API | `GET /aesthetic/search?query=&page=&limit=10&invoice_id=` | Returns one row per product batch: `item_id, batch_id, batch_number, batch_quantity, batch_expiry, type, name, price`. **No `addedDate` and no "first batch" flag.** |
| Catalog UI | `app/admin/aesthetic-schedule/appointments/[id]/add-item-form.jsx` | Renders cards in API order. "Available" = `batch_quantity − qty already in this invoice`. |
| Highlight (QA build) | Card class `border-amber-200 bg-amber-50/40` | Applied to the **first card of each product in list order**. |
| Batch dialog | `batch-selector.jsx` | Shows zero-stock batches (Select disabled). **Not imported anywhere: dead code.** Out of scope. |

> **The local `emr-frontend` source is behind QA.** The local `add-item-form.jsx` has no highlight, still renders zero-stock batches (Add disabled), and the h6 has no `(Batch: …)` text. QA has all of these. Get the EMR-208 branch from dev and re-review it.

### 1.4 Break points

| ID | Break point | Why it breaks | Covered by |
|---|---|---|---|
| **BP-1** | **List order ≠ entry order** | The API sorts by **expiry first** (dated batches first, then the rest by id). Highlighting the "first card" therefore highlights the earliest-expiry batch, not the first-entered one. | TC-002 → **DF-1** |
| **BP-2** | **Single-batch product** | If the logic only highlights when a product has 2+ visible batches, a product with one eligible batch gets no highlight. | TC-001 → **DF-2** |
| **BP-3** | Search has no `addedDate` | The frontend can't compute entry order from `/aesthetic/search`. It needs a backend sort or an `is_first_batch` flag. | TC-002, TC-013 |
| **BP-4** | Pagination (`limit=10`) | If one product's batches span page 1 and page 2, the first card on page 2 could also get highlighted (two highlights), or the true first batch could be on page 2. | TC-010 |
| **BP-5** | Search / filter subset | If the highlight is computed on the filtered list, a search that hides the first batch would highlight a later batch. | TC-007, TC-008 |
| **BP-6** | Stock vs cart quantity | UI "Available" subtracts what is already in this invoice. When the cart takes all units of the first batch, it shows **Available: 0** but stock is still > 0. Should it hide, and should the highlight move? | TC-014 (Q1) |
| **BP-7** | Expired batches | QA hides expired batches that still have stock (e.g. Acnechio: 5 expired batches, 332 units). The ticket doesn't mention expiry. | TC-012 (Q2) |
| **BP-8** | Same `addedDate` | Imports create many batches with identical timestamps (`2026-09-28T10:54:17`). Without a tie-break the highlight can flip between reloads. | TC-015 |
| **BP-9** | Stock changes after the list loads | Another user completes an invoice and the first batch hits 0. The open dialog keeps showing the old highlight until it re-fetches. | TC-018 |
| **BP-10** | Editing an invoice | With `invoice_id`, the backend may add back quantities reserved by this invoice. A batch that is 0 for others but in this invoice must still show for editing. | TC-019 |
| **BP-11** | Colour-only signal | Light yellow at 40% opacity is faint on some screens and invisible to colour-blind users. There's no text or `aria` label saying "First batch". | TC-006, TC-021 |
| **BP-12** | Expiring-soon badge on the highlighted card | A red "Exp" badge (< 30 days) on a yellow card: check it is readable and not confused with the highlight. | TC-022 |

---

## 2. Test Execution Commands

```bash
# Run all EMR-208 tests (Chromium)
npx playwright test tests/emr-208.spec.js --project=chromium

# Headed / UI mode
npx playwright test tests/emr-208.spec.js --project=chromium --headed
npx playwright test tests/emr-208.spec.js --ui

# Single test
npx playwright test tests/emr-208.spec.js --project=chromium -g "TC-002"
```

The suite runs **serially** in one draft invoice and deletes that draft through the API in `afterAll`.

---

## 3. Test Data (QA, 2026-11-05)

| Product | Batches (entry order → stock) | Expected highlight | QA shows |
|---|---|---|---|
| **Acnechio anti acne body spray 100ml** (id 662) | `IMP-483285-193` 24 Aug → **6** · `B-…080-128` 17 Sep → 5 · … · `B-…786-866` 21 Oct → 55 (+5 zero-stock, +5 expired) | `IMP-483285-193` | `B-1792570045786-866` ❌ |
| **Allermine 4mg** (id 666) | 7 batches at 0 · `IMP-483285-193` 24 Aug → **4** | `IMP-483285-193` | none ❌ |
| **Astrocort - 15g** (id 670) | `IMP-483285-193` 24 Aug → **0** · … · `IMP-274009-597` 28 Sep 09:21 → 5 · `B-…805-010` 28 Sep 10:54 → 5 | `IMP-274009-597` | `IMP-274009-597` ✅ |

---

## 4. Test Matrix

### Part 1: Core rules

| ID | Scenario | Steps | Expected | Priority | Automation |
|:---|:---|:---|:---|:---|:---|
| **TC-001** | One highlight per product (R1) | Open Add Items; group cards by product. | Every product has **exactly one** yellow card. | **P0** | Automated |
| **TC-002** | Highlight = first **entered** eligible batch (R2) | For each product, compare the highlighted card with the oldest `addedDate` batch that has stock > 0. | They match. Acnechio → `IMP-483285-193`. | **P0** | Automated |
| **TC-003** | Zero-stock batches hidden (R3) | Read all cards and check against the API. | No card shows `Available: 0`. Every API batch with `quantityAvailable = 0` is absent. | **P0** | Automated |
| **TC-004** | Highlight moves when first batch is 0 (R4) | Product whose first-entered batch is 0 (Astrocort). | Highlight on the next batch in entry order (`IMP-274009-597`). | **P0** | Automated |
| **TC-005** | Treatments never highlighted (R5) | Inspect treatment cards (Microneedling, HydraFacial…). | No yellow background. | **P1** | Automated |
| **TC-006** | Colour: light yellow and distinct | Inspect class and computed background. | Light amber/yellow (`bg-amber-50`/`bg-yellow-50/100`). Other cards are white. Text contrast ≥ 4.5:1. | **P1** | Automated |
| **TC-013** | Order of batches within a product | Compare card order with entry order. | *(Confirm with PO)* Cards appear in entry order, or the highlight is correct even when they don't (FEFO list order). | **P2** | Manual |

### Part 2: Dynamic / stock movement

| ID | Scenario | Steps | Expected | Priority | Automation |
|:---|:---|:---|:---|:---|:---|
| **TC-016** | First batch sold out by a completed invoice | 1. Note product X's highlighted batch B1 (stock n).<br>2. Complete an invoice selling all n units of B1.<br>3. Reopen Add Items on another invoice. | B1 is gone. The highlight is on B2 (next in entry order). | **P0** | Manual |
| **TC-017** | Stock returns (invoice deleted / refund / stock adjustment) | Put B1 back to stock > 0 (delete the completed invoice, or adjust stock in Stocks). | B1 reappears **and** is highlighted again. B2 is no longer highlighted. | **P1** | Manual |
| **TC-018** | Stock changes while the dialog is open (**BP-9**) | Tab A: Add Items open on X. Tab B: sell out B1. Tab A: search again / reopen. | After re-fetch, B1 is hidden and B2 highlighted. Adding B1 from the stale list is blocked with an "out of stock" error, not oversold. | **P1** | Manual |
| **TC-014** | Cart takes all units of the first batch (**BP-6**) | Add B1 until `Available: 0` in the same invoice. | Per PO (Q1): either B1 stays visible with Add disabled and stays highlighted, **or** it hides and B2 is highlighted. It must never show 2 highlights or an enabled Add at 0. | **P1** | Manual |
| **TC-011** | Add 1 unit of the highlighted batch | Click Add on the yellow card. | `Added (1)` badge. Available drops by 1. Highlight stays on the same batch. The right column lists the batch. | **P1** | Automated |
| **TC-019** | Edit an existing draft that already holds B1 (**BP-10**) | Draft has B1 × all remaining units. Reopen Add Items. | Highlight rules still hold. Existing line items aren't affected. B1's quantity in the invoice isn't counted twice. | **P2** | Manual |
| **TC-020** | New batch received (GRN) | Add a new batch B9 for X today. | B9 is **not** highlighted (newest). The highlight stays on the oldest eligible batch. | **P1** | Manual |

### Part 3: Search, pagination, edge data

| ID | Scenario | Steps | Expected | Priority | Automation |
|:---|:---|:---|:---|:---|:---|
| **TC-007** | Search by product name (**BP-5**) | Search `Acnechio`. | Same batch highlighted as in the unfiltered list. | **P1** | Automated |
| **TC-008** | Search by batch number (**BP-5**) | Search a non-first batch number. | That later batch must **not** be highlighted as "first". *(QA: search matches product names only, so the test checks the "No items found" result instead.)* | **P2** | Automated |
| **TC-009** | Clear search | Search, then click `Clear`. | Highlights identical to before. | **P2** | Automated |
| **TC-010** | Infinite scroll / page 2 (**BP-4**) | Scroll to the bottom to load page 2. | Page-2 products are highlighted correctly. No product ends up with 2 highlights across the page boundary. | **P1** | Automated |
| **TC-012** | Expired batches (**BP-7**) | Product with expired batches that still have stock. | *(System behaviour)* Expired batches are not listed and not highlighted. Confirm with PO (Q2). | **P1** | Automated |
| **TC-015** | Same `addedDate` tie (**BP-8**) | Two batches with an identical `addedDate` (import). Reload 5 times. | The same batch is highlighted every time (lowest id). | **P2** | Manual |
| **TC-023** | Product with no stock at all | All batches 0. | The product doesn't appear. No empty group, no orphan highlight. | **P1** | Manual |
| **TC-024** | Negative / null stock | Batch with `quantityAvailable` < 0 or null (data bug). | Hidden, never highlighted, no crash. | **P3** | Manual |
| **TC-025** | Batch quantity exactly 1 | First batch has 1 unit. | Shown and highlighted. After it's sold, it hides and the next batch is highlighted. | **P1** | Manual |

### Part 4: UI / UX / non-functional

| ID | Scenario | Expected | Priority | Automation |
|:---|:---|:---|:---|:---|
| **TC-021** | Accessibility (**BP-11**) | The highlight isn't conveyed by colour only. Recommend a "First batch" label or `aria-label`. Check in Windows high-contrast mode. | **P2** | Manual |
| **TC-022** | Expiring-soon badge on the highlighted card (**BP-12**) | Red `Exp:` badge stays readable on yellow. Hover border (`hover:border-blue-300`) still visible. | **P3** | Manual |
| **TC-026** | Mobile / narrow dialog | On a tablet / 768px width, the yellow highlight is visible and the batch number truncates with an ellipsis, but the full number shows on hover. | **P3** | Manual |
| **TC-027** | Other clinic / org | Switch clinic (top-right). Highlights use that org's batches only. | **P2** | Manual |
| **TC-028** | Performance | A product with 100+ batches: dialog opens in < 2s. No visible jump of the highlight after load. | **P3** | Manual |
| **TC-029** | Regression: invoice totals and stock deduction | Add highlighted and non-highlighted batches and complete the invoice. Totals and per-batch stock deduction are correct (see `invoice-stock-twotabs.spec.js`). | **P1** | Existing suites |

---

## 5. Execution Results (QA, Chromium, 2026-11-05)

Run result (feature tests): **11 passed, 1 skipped**. System-wide stock checks (TC-030 – TC-034) and defects **DF-3/DF-4** are in [EMR_208_SYSTEM_BREAKPOINTS.md](file:///c:/Users/LENOVO/Desktop/aergertuc/EMR_208_SYSTEM_BREAKPOINTS.md). The two defect tests are marked `test.fail()`, and both failed for the expected reason.

| Result | Test cases |
|---|---|
| **Pass** | TC-003, TC-004 (Astrocort), TC-005, TC-006, TC-007, TC-009, TC-010, TC-011, TC-012 |
| **Defect DF-1 (`test.fail`)** | **TC-002**: the highlight follows list/expiry order, not entry order. **Acnechio**: QA highlights `B-1792570045786-866` (added **21 Oct 2026**, the newest) instead of `IMP-483285-193` (added **24 Aug 2026**). |
| **Defect DF-2 (`test.fail`)** | **TC-001 / TC-002**: **Allermine 4mg**, which has only one listed batch (`IMP-483285-193`, 4 units), is **not highlighted**. |
| **Pass – feature gap** | **TC-008**: catalog search matches **product names only**. Batch-number queries (`B-1791887801034-333`, `1791887801034`, `IMP-274009-597`, name + batch) all return 0 items and show *No items found matching "…"*. The test checks this behaviour now, and runs the highlight check automatically once batch search exists. Raise as an enhancement: staff can't find a batch by typing or scanning its number. |

When dev fixes DF-1/DF-2, TC-001/TC-002 will show as "unexpected pass". Then remove the `test.fail(...)` lines.

### Defect write-ups

**DF-1 – Wrong batch highlighted (not first entered)** · Severity: High
Steps: Schedule → appointment → Invoices → New Invoice → Add Items → search `Acnechio`.
Expected: `IMP-483285-193` (added 2026-08-24, 6 in stock) highlighted.
Actual: `B-1792570045786-866` (added 2026-10-21, 55 in stock) highlighted. The list is sorted by expiry date, and the first card is highlighted.

**DF-2 – No highlight for products with a single available batch** · Severity: Medium
Steps: Add Items → find `Allermine 4mg` (7 batches at 0 stock, 1 batch with 4).
Expected: `IMP-483285-193` highlighted (R1/R4).
Actual: the card has a plain white background.

---

## 6. Open Questions for PO / Dev

1. **Q1 Cart vs stock:** when this invoice's cart takes all units of the first batch, should that batch hide and the highlight move (TC-014)?
2. **Q2 Expired batches:** QA hides expired batches that still have stock. Is that intended? Should "first eligible" skip expired batches, and should those units be flagged for write-off?
3. **Q3 FIFO vs FEFO:** the ticket says first **entered** (FIFO). The list is sorted by expiry (FEFO). Confirm FIFO is the rule, because pharmacy practice often prefers FEFO.
4. **Q4 Tie-break:** for batches imported with the same timestamp, is lowest id OK as the tie-break?
5. **Q5 Accessibility:** add a "First batch" text label in addition to the colour?
