# EMR-208: System-wide Break Point Review (Batches & Stock)

**Scope**: every part of the system that creates, lists, picks, deducts or restores **product batches**. EMR-208's highlight and visibility rules depend on `quantityAvailable` and `addedDate`, so any bug that changes those shows, hides or highlights the wrong batch.
**Method**: source review of `emr-frontend` + read-only checks on QA data through the API (175 appointments, 54 invoice product lines, 81 batches across 11 products).
**Date**: 2026-11-05 · **Automated checks**: [`tests/emr-208.spec.js`](file:///c:/Users/LENOVO/Desktop/aergertuc/tests/emr-208.spec.js) TC-030 – TC-034
**Feature test cases**: [EMR_208_TEST_CASES.md](file:///c:/Users/LENOVO/Desktop/aergertuc/EMR_208_TEST_CASES.md)

---

## 1. Where batches live in the system

| # | Area | Screen / source | Batch actions | Feeds EMR-208 via |
|---|---|---|---|---|
| A1 | Invoice → Add Items | `appointments/[id]/add-item-form.jsx` | List and pick batch (one row per batch) | **The screen under test** |
| A2 | Invoice line items | `invoice-item.jsx`, `invoice-form.jsx` | Qty edit, max-qty clamp, save validation "Please select a batch" | Draft lines **deduct stock immediately** |
| A3 | Invoice lifecycle | `invoices.jsx` + backend jobs | Create, delete (Discard), complete, refund, **auto-cancel draft** | Deduct / refund stock |
| A4 | Consultation → Products tab | `appointments/[id]/products.jsx` | Adds products **without a batch**. Billed into the invoice on create | Line with no batch |
| A5 | Settings → Products → Manage Batches | `aesthetic-settings/products/manage-batches.jsx` | Add batch, remove remaining stock | New / zero-stock batches |
| A6 | Stocks → By Product / By Batch | `products/batches/by-product-view.jsx`, `by-batch-view.jsx` | View, paginated (5 / 10) | Shows "Added" from `createdAt` |
| A7 | Stock adjustment | `products/batches/batch-adjustment-dialog.jsx` | Add / deduct with reason | Refills an old batch |
| A8 | Product CSV import | `products/import-form.jsx` → `/aesthetic/import-products-csv` | Creates products + initial batches | Entry order, expiry, qty |
| A9 | Batch history | `products/batches/batch-history-dialog.jsx` | Ledger view | Audit trail |
| A10 | Batch selector dialog | `appointments/[id]/batch-selector.jsx` | Re-pick a batch | **Not imported anywhere: dead code** |

---

## 2. Confirmed defects (verified on QA data)

| ID | Defect | Evidence | Impact on EMR-208 | Severity |
|---|---|---|---|---|
| **DF-1** | Highlight follows **list (expiry) order**, not entry order | Acnechio: highlights `B-1792570045786-866` (added 21 Oct) instead of `IMP-483285-193` (added 24 Aug) | Wrong batch sold first | **High** |
| **DF-2** | Product with one listed batch gets **no highlight** | Allermine 4mg `IMP-483285-193` (4 units), plain white | Rule R1/R4 broken | Medium |
| **DF-3** | **Refunds written twice (sometimes 3×) → stock inflated** | 8 batches / 10 invoices refunded more than sold. Allermine batch id 1455: **available 16 > received 12**. Duplicates like `invoice_refund 4 AA-17662 @12:00:00 ×2` ("System auto-cancelled draft Invoice") and `invoice_refund 8 AA-17735 @05:36:53 ×3` (user action) | A sold-out first batch can come back with phantom stock, show up and **get highlighted**. Staff then try to sell stock that doesn't exist | **Critical** |
| **DF-4** | **Invoice numbers reused after delete** | `AA-17993` given to 3 different invoices today (each created, then deleted) | The stock ledger links rows by `invoiceRef`, so the audit trail is ambiguous. Possible cause of DF-3 matching | High |

### DF-3 timeline (batch 1455, Allermine 4mg)

| Time (UTC) | Type | Qty | Note |
|---|---|---|---|
| 2026-08-24 09:08 | import | +12 | Initial stock from CSV import |
| 2026-09-17 11:24–11:25 | invoice_deduct | −2, −1, −1, −2 | AA-17662 (draft) = **−6** |
| 2026-09-17 11:25:23 | invoice_refund | +2 | user removed 2 |
| 2026-09-17 12:00:00 | invoice_refund | **+4** | System auto-cancelled draft AA-17662 |
| 2026-09-17 12:00:00 | invoice_refund | **+4** | **same row again (duplicate)** |
| **Result** | | **16** | Should be 12 |

---

## 3. Break points found in code (risks to test)

### 3.1 Invoice & stock movement

| ID | Break point | Code | Risk | Test |
|---|---|---|---|---|
| BP-S1 | **Auto-retry of PUT/DELETE** | `lib/services/api.js`: the response interceptor retries PUT/DELETE once on 5xx | If the server applied the change and then errored, the retry applies it **again**. Likely contributor to DF-3 | SYS-01 |
| BP-S2 | **Drafts deduct stock immediately** | Ledger: `invoice_deduct` on each autosave of a draft | Abandoned drafts lock stock until auto-cancel. The first batch shows 0, gets hidden and the highlight moves, then jumps back after auto-cancel | SYS-02 |
| BP-S3 | Auto-cancel job not idempotent | backend "System auto-cancelled draft" | DF-3 | SYS-03 |
| BP-S4 | **Stale `batch_quantity` on the line** | `invoice-form.jsx` / `invoice-item.jsx` clamp qty to `batch_quantity` captured **when the item was added** | Stock sold elsewhere → the line still allows the old maximum → oversell, or a 4xx at save | SYS-04 |
| BP-S5 | Line without a batch is a dead end | `invoice-form.jsx`: save blocked "Please select a batch". `batch-selector.jsx` is not used anywhere. `onSplit` removes `batch_id` but is never called | Consultation-billed products (A4), or any line that loses its batch, **can't be saved** and there's no UI to pick a batch. *(All 54 QA lines had a batch, so not seen in data; test directly.)* | SYS-05 |
| BP-S6 | Same batch, two tabs | Two drafts (tabs / users) add the last units of a batch | Both deduct → negative stock or a 409. Which one wins? | SYS-06 |
| BP-S7 | Cart vs stock "Available" | `add-item-form.jsx` shows `batch_quantity − in-cart` | Combined with BP-S2, the deduction can be counted twice (stock already deducted by the draft, and the cart subtracted again) | SYS-07 |
| BP-S8 | Discard confirm label | `invoices.jsx` AlertDialog button is **"Delete"**; test POM looks for "Confirm/Yes/Discard" | Test-only: drafts left behind by automation lock stock (BP-S2) | Fixed in suite (API delete) |

### 3.2 Batch creation & maintenance

| ID | Break point | Code | Risk | Test |
|---|---|---|---|---|
| BP-S9 | Expiry in the past allowed | `manage-batches.jsx`: `<input type="date">` has no `min` | A batch can be created already expired, so it's hidden in Add Items at once ("where did my stock go?") | SYS-08 |
| BP-S10 | CSV quantity parsing | `import-form.jsx`: `parseFloat(val) \|\| 0` | `-5` → negative batch. `2.5` → fractional stock. `abc` → 0 (silently hidden) | SYS-09 |
| BP-S11 | CSV expiry is a raw string | `import-form.jsx`: "pass as string" | `05/06/2027` read as 5 Jun or 6 May → batch wrongly expired/hidden, or kept | SYS-10 |
| BP-S12 | **XSS in import error popup** | `import-form.jsx`: `err.name` concatenated into `Swal.fire({ html })` | A product name like `<img src=x onerror=alert(1)>` that fails import runs script | SYS-11 (security) |
| BP-S13 | Same timestamp for imported batches | CSV import creates rows in the same second | Entry-order tie → highlight unstable (none found within one product on QA yet) | SYS-12 |
| BP-S14 | Refill an old empty batch | `batch-adjustment-dialog.jsx` "add" | The old batch reappears and, as the oldest, **takes the highlight** from a newer batch. Is that wanted? | SYS-13 |
| BP-S15 | Remove remaining stock | `manage-batches.jsx` "remove" → deduct all | Batch must disappear from Add Items, and the highlight moves | SYS-14 |
| BP-S16 | "Added" column uses `createdAt` | Stocks views show `createdAt`. Rule uses `addedDate` | Equal on QA today (0 differences), but if a backdated `addedDate` is ever allowed, Stocks and the highlight disagree | SYS-15 |
| BP-S17 | Expired stock hidden but counted | Add Items hides expired batches. QA has **7 expired batches with 354 units** still in stock | Stock value and "Total Stock" overstated. Units never sold or written off | SYS-16 |

---

## 4. System test cases

| ID | Scenario | Steps | Expected | Priority | Automation |
|:---|:---|:---|:---|:---|:---|
| **SYS-01** | Refund under server error / slow network | Throttle the network. Make the API return 502 after it processes a refund or delete (proxy), or double-click Refund. | Exactly **one** `invoice_refund` row per unit. Stock restored once. | **P0** | Manual (proxy) |
| **SYS-02** | Abandoned draft locks stock | Draft adds all units of the first batch B1, then leave. Open Add Items on another appointment. | Document: B1 hidden (0) and B2 highlighted. After auto-cancel: B1 back with **exactly** its original qty and highlighted again. | **P0** | Manual |
| **SYS-03** | Auto-cancel idempotency | Leave a draft with 2 units. Wait for the auto-cancel time. | One refund row, +2 exactly. **Fails today (DF-3).** | **P0** | Automated: TC-031/032 (ledger) |
| **SYS-04** | Stale line max qty | Tab A: add B1 (5 left) to a draft. Tab B: sell 4 of B1. Tab A: raise qty to 5 and save. | Save rejected with a clear message. No negative stock. | **P0** | Manual |
| **SYS-05** | Consultation product → invoice | Consultation → Products tab: add a product. Create invoice. | Line gets a batch automatically (which one? should follow the EMR-208 first-batch rule) **or** the user can pick one. Invoice can be saved. | **P0** | Manual |
| **SYS-06** | Two tabs, last unit | Two drafts each add the last unit of B1 at the same time. | One succeeds, the other is told "out of stock". Stock ≥ 0. | **P1** | Manual (2 contexts) |
| **SYS-07** | Draft deduction + cart "Available" | Open a draft that already holds 3 of B1 (stock 10). Open Add Items. | Available = 10 − 3 = **7**, not 4 (counted twice). | **P1** | Manual |
| **SYS-08** | Past expiry on new batch | Manage Batches → Add batch with expiry yesterday. | Blocked or warned. If allowed, it's never highlighted and is shown as expired in Stocks. | **P2** | Manual |
| **SYS-09** | CSV quantity values | Import rows with qty `-5`, `2.5`, `abc`, `1,000`. | `-5`/`abc` rejected with row errors. `2.5` rejected or rounded per rule. `1,000` = 1000. | **P1** | Manual |
| **SYS-10** | CSV expiry formats | Import `05/06/2027`, `2027-06-05`, `6-May-2027`, `31/02/2027`. | One documented format accepted. Invalid → row error. Stored date matches the intent. | **P1** | Manual |
| **SYS-11** | XSS in import errors (**security**) | Import a row with name `<img src=x onerror=alert(1)>` that will fail (e.g. bad price). | Name shown as text. **No script runs.** | **P0** | Manual |
| **SYS-12** | Same-second batches | Import 2 batches of one product in one file. | Deterministic highlight (lowest id) across reloads. | **P2** | Manual |
| **SYS-13** | Refill old empty batch | Adjust → add 5 to the oldest (0-stock) batch of a product. | It reappears in Add Items **and is highlighted** (oldest eligible). PO to confirm this is wanted. | **P1** | Manual |
| **SYS-14** | Remove remaining stock | Manage Batches → remove on the highlighted batch. | It disappears from Add Items. The next batch is highlighted. | **P1** | Manual |
| **SYS-15** | Added date consistency | Compare Stocks "Added" with the order used for the highlight. | Same date source. Order matches. | **P2** | Automated (probe: 0 differences today) |
| **SYS-16** | Expired stock reporting | Stocks → By Product for Acnechio. | Expired batches clearly flagged. Total stock excludes them or shows them separately. A write-off path exists. | **P2** | Manual |
| **SYS-17** | Invoice number reuse (DF-4) | Create invoice → note the number → delete → create again. | A new number every time. Never reused. **Fails today.** | **P1** | Manual |
| **SYS-18** | Clinic / org isolation | Switch clinic. Open Add Items and Stocks. | Only that org's batches, stock and highlight. | **P1** | Manual |
| **TC-030** | Available ≤ received for every batch | Batches API, read-only. | No batch above received. **Fails (DF-3).** | **P0** | Automated (`test.fail`) |
| **TC-031** | Refund ≤ deduct per invoice | Ledger, read-only. | **Fails (DF-3).** | **P0** | Automated (`test.fail`) |
| **TC-032** | No duplicate refund rows | Ledger, read-only. | **Fails (DF-3).** | **P0** | Automated (`test.fail`) |
| **TC-033** | Ledger sum = available | Ledger vs batch. | Pass. | **P1** | Automated |
| **TC-034** | No negative stock | Batches API. | Pass. | **P1** | Automated |

---

## 5. Test-data notes for the team

- Draft **AA-17991** (created 2026-11-05 ~16:47 local, not by this suite) holds **5 units** of Acnechio `B-1792570045786-866`. When auto-cancel runs it may double-refund (DF-3). Worth watching as a live repro.
- The EMR-208 suite is stock-neutral: each run deducts 1 and refunds 1 (`AA-17993`) and deletes its draft.
- Draft **AA-17992** (id 598) from an early probe: GET returned 404, so it's probably gone. Please confirm on the first appointment's Invoices tab.

## 6. Questions for PO / Dev

1. Should drafts deduct stock (reservation), or only completed invoices? This decides SYS-02 / SYS-07 and how "Available" is defined for EMR-208.
2. Should refilling an old batch (SYS-13) take the highlight back?
3. Expired stock with units (SYS-16): is a write-off flow planned?
4. Can the frontend retry on PUT/DELETE (BP-S1) be removed for non-idempotent actions such as refund and invoice save, or can the backend use idempotency keys?
