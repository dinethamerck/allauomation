# EMR-138: Free of Charge (FOC) Invoice PDF Item Pricing & "FREE" Discount Column Verification

**Feature ID**: `EMR-138`  
**Feature Name**: Free of Charge (FOC) Invoice PDF Unit Price Retention & "FREE" Discount Column Display  
**Target Application**: [AMERCK CARE Clinical Portal (QA)](https://qa_care.amerck.com)  
**Backend API**: `https://api_emr_dev.amerck.com`  
**Module**: Invoicing & Billing (`/admin/aesthetic-schedule/appointments/:id` -> `Invoices` -> Print / PDF Export)  
**Test Suite File**: [`tests/emr-138.spec.js`](file:///c:/Users/LENOVO/Desktop/aergertuc/tests/emr-138.spec.js)  
**Page Object Model**: [`tests/pages/ConsultationInvoicePage.js`](file:///c:/Users/LENOVO/Desktop/aergertuc/tests/pages/ConsultationInvoicePage.js)  
**Reference Document**: [EMR-98 FOC Invoice Specification](file:///c:/Users/LENOVO/Desktop/aergertuc/EMR_98_TEST_CASES.md)

---

## 1. Feature Overview & Requirements

In clinical workflows, clinics frequently provide promotional, complimentary, or compensation treatments and medications as **Free of Charge (FOC)**. 
When billing a patient, transparency is paramount: patients should clearly recognize the standard commercial value of the complimentary items they received, while the invoice clearly confirms that no charge was levied.

### Business & Visual Design Rules:
1. **Unit Price Retention (Original Commercial Value)**:
   - When an item is marked as FOC (either 100% complimentary or partially complimentary), the generated invoice PDF **MUST retain the original unit price** in the `UNIT PRICE` column (e.g., `400.00`).
   - The `UNIT PRICE` column must **NEVER** display `0.00`, `-`, or be omitted for FOC items.
2. **Discount Column Presentation ("FREE" / "N FREE")**:
   - For a **100% FOC item** (where complimentary quantity equals total quantity):
     - The `DISCOUNT` column in the PDF must display **`"FREE"`** (or `"1 FREE"` for unit quantity).
   - For a **Partially FOC item** (e.g., Total Quantity = 3, Complimentary Quantity = 2):
     - The `DISCOUNT` column in the PDF must display **`"2 FREE"`** (reflecting the exact number of complimentary units).
3. **Subtotal / Total Amount Calculation**:
   - For a **100% FOC item**, the line item `SUBTOTAL` column in the PDF displays **`0.00`**.
   - For a **Partially FOC item**, the line item `SUBTOTAL` column in the PDF displays the chargeable portion:  
     $$\text{SUBTOTAL} = (\text{Total Qty} - \text{FOC Qty}) \times \text{Unit Price}$$  
     *(e.g., $(3 - 2) \times 400.00 = 400.00$)*.
4. **Description Column Complimentary Tagging**:
   - When FOC is assigned, the `DESCRIPTION` column in the PDF appends the complimentary indicator:  
     *(e.g., `Acnechio anti acne body spray 100ml (2 FREE)`)*.
5. **Invoice Summary Section Alignment**:
   - `SUBTOTAL`: Displays cumulative gross subtotal.
   - `Subtotal after discount`: Displays net subtotal after deducting complimentary FOC units.
   - `GRAND TOTAL`: Displays final balance payable (or `0.00` if 100% FOC).
6. **Paid Watermark & Document designation**:
   - Fully completed FOC invoices must display `INVOICE` with a `Paid` watermark/stamp, preserving all original unit prices and `FREE` discount labels.

---

## 2. Test Execution Commands

```bash
# Run all EMR-138 tests in headless Chromium
npx playwright test tests/emr-138.spec.js --project=chromium

# Run all EMR-138 tests across all configured browsers
npx playwright test tests/emr-138.spec.js

# Run in interactive headed browser mode
npx playwright test tests/emr-138.spec.js --headed

# Run in interactive Playwright UI mode
npx playwright test tests/emr-138.spec.js --ui

# Run a specific test case (e.g., TC-001)
npx playwright test tests/emr-138.spec.js -g "TC-001"

# Run tests matching partial FOC scenarios (e.g., TC-003)
npx playwright test tests/emr-138.spec.js -g "TC-003"
```

---

## 3. Comprehensive Test Matrix

### Part 1: Positive Functional & PDF Presentation Scenarios

| Test Case ID | Test Scenario | Preconditions | Step-by-Step Actions | Expected Result | Priority | Automation Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-001** | Single Item 100% FOC (Qty = 1) PDF Presentation | Logged in, appointment draft invoice open | 1. Add 1 item (Unit Price: 400.00, Qty: 1).<br>2. Click FOC button to mark 100% FOC.<br>3. Click `Print Invoice` to generate PDF.<br>4. Inspect generated PDF table. | **UNIT PRICE**: `400.00`<br>**DISCOUNT**: `FREE` (or `1 FREE`)<br>**SUBTOTAL**: `0.00`<br>**GRAND TOTAL**: `0.00`. | **P0 (Critical)** | Automated |
| **TC-002** | Single Item Multi-Qty 100% FOC (Qty = 3, 3 FREE) | Draft invoice open | 1. Add item with Qty: 3.<br>2. Open Apply FOC modal and set FOC Qty = 3.<br>3. Save modal and generate invoice PDF. | **UNIT PRICE**: `400.00`<br>**QTY**: `3`<br>**DISCOUNT**: `FREE` / `3 FREE`<br>**SUBTOTAL**: `0.00`. | **P0 (Critical)** | Automated |
| **TC-003** | Single Item Partial FOC (Qty = 3, 2 FREE — As in Spec Image) | Draft invoice open | 1. Add `Acnechio anti acne body spray 100ml` (Qty: 3, Unit Price: 400.00).<br>2. Click FOC and set FOC Qty = 2.<br>3. Save and generate invoice PDF. | **DESCRIPTION**: `Acnechio... (2 FREE)`<br>**UNIT PRICE**: `400.00`<br>**QTY**: `3`<br>**DISCOUNT**: `2 FREE`<br>**SUBTOTAL**: `400.00`<br>**GRAND TOTAL**: `400.00`. | **P0 (Critical)** | Automated |
| **TC-004** | Multi-Item Invoice with All Items Marked 100% FOC | Draft invoice open | 1. Add Item A (Price: 400.00) and Item B (Price: 1,500.00).<br>2. Mark both 100% FOC.<br>3. Generate invoice PDF. | Each item displays its original unit price (`400.00` & `1,500.00`); both display `FREE` in Discount column; Grand Total = `0.00`. | **P0 (Critical)** | Automated |
| **TC-005** | Mixed Cart: 1 FOC Item + 1 Regular Chargeable Item | Draft invoice open | 1. Add Item A (FOC, Price: 400.00).<br>2. Add Item B (Chargeable, Price: 2,500.00).<br>3. Generate invoice PDF. | Item A: Unit Price `400.00`, Discount `FREE`, Subtotal `0.00`.<br>Item B: Unit Price `2,500.00`, Discount `-`, Subtotal `2,500.00`.<br>Grand Total = `2,500.00`. | **P0 (Critical)** | Automated |
| **TC-006** | Mixed Cart: Partial FOC Item + Regular Chargeable Item | Draft invoice open | 1. Add Item A (Qty: 3, 2 FOC @ 400.00 = 400.00).<br>2. Add Item B (Qty: 1, Chargeable @ 1,000.00).<br>3. Generate invoice PDF. | Item A Discount: `2 FREE`, Subtotal: `400.00`.<br>Item B Subtotal: `1,000.00`.<br>Grand Total: `1,400.00`. | **P0 (Critical)** | Automated |
| **TC-007** | Completed All-FOC Invoice PDF Status & Formatting | Completed all-FOC invoice (`Paid`) | 1. Complete an all-FOC invoice via `Complete Invoice`.<br>2. Generate invoice PDF.<br>3. Inspect watermark and table. | Document displays `INVOICE`, `Paid` watermark, original unit prices, `FREE` discount, and `0.00` total. | **P0 (Critical)** | Automated |
| **TC-008** | Invoice Summary Totals Alignment in Generated PDF | Invoice with partial/full FOC | 1. Add items and apply FOC.<br>2. Generate invoice PDF.<br>3. Inspect summary block below items table. | PDF clearly separates:<br>- `SUBTOTAL`<br>- `Subtotal after discount`<br>- `GRAND TOTAL`<br>Matching exact math. | **P1 (High)** | Automated |
| **TC-009** | Description Column Complimentary Tag Format | Draft invoice with FOC | 1. Apply FOC quantity N to an item.<br>2. Generate PDF.<br>3. Inspect `DESCRIPTION` column text. | Description text matches `[Product Name] (N FREE)`. | **P1 (High)** | Automated |
| **TC-010** | High-Value Product/Procedure FOC Pricing Retention | Draft invoice open | 1. Add a high-value item (e.g., LKR 85,000.00).<br>2. Mark as FOC.<br>3. Generate PDF. | UNIT PRICE retains `85,000.00`; Discount displays `FREE`; Subtotal displays `0.00`. | **P1 (High)** | Automated |
| **TC-011** | PDF Content Consistency Across Preview and File Download | Invoice with FOC | 1. Trigger print preview popup.<br>2. Trigger direct PDF download.<br>3. Compare extracted text from both. | Both sources produce identical unit price (`400.00`) and discount (`FREE`) outputs. | **P1 (High)** | Automated |
| **TC-012** | Multiple Batches of Same Product (One FOC, One Chargeable) | Draft invoice open | 1. Add Batch 1 of Item X (Mark 100% FOC).<br>2. Add Batch 2 of Item X (Chargeable).<br>3. Generate PDF. | Row 1: Original Unit Price, `FREE` discount, Subtotal 0.00.<br>Row 2: Original Unit Price, standard discount, chargeable subtotal. | **P1 (High)** | Automated |

---

### Part 2: Negative, Revert & Edge Test Scenarios

| Test Case ID | Test Scenario | Preconditions | Step-by-Step Actions | Expected Result | Priority | Automation Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-013** | Revert FOC (Toggle FOC Off) on Line Item | Item currently marked FOC | 1. Uncheck / remove FOC on line item.<br>2. Verify UI line item updates.<br>3. Generate invoice PDF. | PDF Discount column reverts to blank/empty (`-`); Subtotal column restores full price ($400.00$). | **P0 (Critical)** | Automated |
| **TC-014** | Adjust FOC Quantity from Partial to 100% Complimentary | Item has Partial FOC (e.g. 2 of 3) | 1. Re-open Apply FOC modal.<br>2. Update FOC quantity from 2 to 3.<br>3. Save and generate PDF. | PDF Discount updates to `3 FREE` / `FREE`; Subtotal drops from `400.00` to `0.00`. | **P1 (High)** | Automated |
| **TC-015** | Adjust FOC Quantity from 100% to Partial Complimentary | Item has 100% FOC (3 of 3) | 1. Re-open Apply FOC modal.<br>2. Update FOC quantity from 3 to 1.<br>3. Save and generate PDF. | PDF Discount displays `1 FREE`; Subtotal recalculates to $2 \times 400.00 = 800.00$. | **P1 (High)** | Automated |
| **TC-016** | Validation When FOC Quantity Set to 0 in Modal | Item with Qty > 1 | 1. Open Apply FOC modal.<br>2. Enter `0` in FOC Quantity field.<br>3. Save and generate PDF. | Item treated as regular non-FOC: Unit Price `400.00`, Discount empty, Subtotal full amount. | **P1 (High)** | Automated |
| **TC-017** | Text Wrapping & Table Column Integrity with Long Names | Product with lengthy name | 1. Add product with 60+ characters title.<br>2. Apply FOC.<br>3. Generate PDF. | Description wraps cleanly; `UNIT PRICE`, `QTY`, `DISCOUNT`, and `SUBTOTAL` columns maintain strict horizontal alignment. | **P1 (High)** | Automated |
| **TC-018** | PDF Header Metadata Alignment with FOC Document | Draft invoice with FOC | 1. Generate invoice PDF.<br>2. Verify Header elements: Clinic Name, Address, Contact, Bill To, Invoice No, Date. | Clinic details ("Amaran Aesthetic Clinic"), Invoice Details (AA-XXXXX), and Patient details accurately match appointment data. | **P2 (Medium)** | Automated |
| **TC-019** | Cross-Session & Page Reload PDF Consistency | Completed or saved FOC invoice | 1. Apply FOC and save.<br>2. Hard reload browser page (`Ctrl+F5`).<br>3. Generate PDF. | Generated PDF maintains identical unit price retention and `FREE` discount column display. | **P1 (High)** | Automated |
| **TC-020** | Backend PDF Endpoint / Print Route Data Verification | Draft invoice with FOC | 1. Monitor network response for `/invoices/:id/pdf` or print preview payload.<br>2. Verify JSON/PDF stream data contract. | Response schema specifies `unit_price`, `foc_qty`, `is_foc: true`, and computed `discount_display: "FREE"`. | **P1 (High)** | Automated |

---

## 4. Detailed Test Case Specifications

### TC-001: Single Item 100% FOC (Qty = 1) PDF Presentation
- **Objective**: Verify that when a single-quantity item is marked FOC, the generated invoice PDF retains the original unit price, displays "FREE" in the Discount column, and calculates Subtotal as `0.00`.
- **Preconditions**: User is logged in as `parami`, consultation invoice tab is open with a new draft.
- **Steps**:
  1. Click `Add Item`.
  2. Select 1 product item (e.g., `Acnechio anti acne body spray 100ml`, price `400.00`, qty `1`).
  3. Close catalog dialog.
  4. Click the `FOC` button on the line item.
  5. Click `Print Invoice` (or trigger PDF download).
  6. Extract/inspect text and table columns of the generated PDF document.
- **Expected Result**:
  - `UNIT PRICE`: Displays `400.00` (original price preserved).
  - `QTY`: Displays `1`.
  - `DISCOUNT`: Displays `FREE` (or `1 FREE`).
  - `SUBTOTAL`: Displays `0.00`.
  - `GRAND TOTAL`: Displays `0.00`.

### TC-002: Single Item Multi-Quantity 100% FOC (Qty = 3, 3 FREE)
- **Objective**: Verify that an item with quantity > 1 marked fully complimentary preserves its original unit price and displays "FREE" / "3 FREE" in the Discount column.
- **Steps**:
  1. Add an item with quantity set to 3 (price: `400.00`).
  2. Click `FOC` to trigger the `Apply FOC` modal.
  3. Enter `3` in `FOC Quantity`.
  4. Click `Save`.
  5. Click `Print Invoice` to generate PDF.
- **Expected Result**:
  - `UNIT PRICE`: `400.00`.
  - `QTY`: `3`.
  - `DISCOUNT`: `FREE` or `3 FREE`.
  - `SUBTOTAL`: `0.00`.
  - `GRAND TOTAL`: `0.00`.

### TC-003: Single Item Partial FOC (Qty = 3, 2 FREE — Clinical Reference Scenario)
- **Objective**: Validate the exact scenario depicted in the reference clinical invoice PDF: 3 total units, 2 complimentary units, 1 chargeable unit.
- **Steps**:
  1. Add `Acnechio anti acne body spray 100ml` with total quantity 3.
  2. Click `FOC` on line item.
  3. In `Apply FOC` modal, enter `FOC Quantity` = `2` (out of Total Quantity: 3).
  4. Click `Save`.
  5. Generate / download the invoice PDF.
  6. Validate all table columns against reference specification:
     - `NO.`: `1`
     - `DESCRIPTION`: `Acnechio anti acne body spray 100ml (2 FREE)`
     - `UNIT PRICE`: `400.00`
     - `QTY`: `3`
     - `DISCOUNT`: `2 FREE`
     - `SUBTOTAL`: `400.00`
     - `SUBTOTAL (Summary)`: `400.00`
     - `Subtotal after discount`: `400.00`
     - `GRAND TOTAL`: `400.00`
- **Expected Result**: Matches the clinical reference screenshot exactly.

### TC-004: Multi-Item Invoice with All Items Marked 100% FOC
- **Objective**: Ensure that on an invoice with multiple products/treatments, each complimentary item independently retains its original unit price while displaying "FREE" in Discount.
- **Steps**:
  1. Add Item 1 (Price `400.00`) and Item 2 (Price `1,500.00`).
  2. Mark both items as 100% FOC.
  3. Generate invoice PDF.
- **Expected Result**:
  - Item 1: `UNIT PRICE: 400.00`, `DISCOUNT: FREE`, `SUBTOTAL: 0.00`.
  - Item 2: `UNIT PRICE: 1500.00`, `DISCOUNT: FREE`, `SUBTOTAL: 0.00`.
  - Invoice Grand Total: `0.00`.

### TC-005: Mixed Cart (1 FOC Item + 1 Regular Chargeable Item)
- **Objective**: Verify that FOC rules do not bleed into non-FOC items on the same PDF invoice.
- **Steps**:
  1. Add Item A (Price `400.00`) and mark 100% FOC.
  2. Add Item B (Price `2,500.00`) and leave chargeable.
  3. Generate invoice PDF.
- **Expected Result**:
  - Item A: `UNIT PRICE: 400.00`, `DISCOUNT: FREE`, `SUBTOTAL: 0.00`.
  - Item B: `UNIT PRICE: 2,500.00`, `DISCOUNT: -` or blank, `SUBTOTAL: 2,500.00`.
  - Grand Total: `2,500.00`.

### TC-006: Mixed Cart (Partial FOC Item + Regular Chargeable Item)
- **Objective**: Verify proper multi-row arithmetic when partial FOC is combined with full-priced items.
- **Steps**:
  1. Add Item A: Qty 3, Unit Price 400.00, FOC Qty 2.
  2. Add Item B: Qty 1, Unit Price 1,000.00, FOC Qty 0.
  3. Generate invoice PDF.
- **Expected Result**:
  - Item A Subtotal: `400.00` with `2 FREE` discount.
  - Item B Subtotal: `1,000.00` with standard discount.
  - Cumulative Grand Total: `1,400.00`.

### TC-007: Completed All-FOC Invoice PDF Status & Formatting
- **Objective**: Verify that after completing an all-FOC invoice via `Complete Invoice`, the generated PDF retains all pricing transparency rules and exhibits `Paid` status.
- **Steps**:
  1. Create invoice with FOC items.
  2. Click `Complete Invoice`.
  3. Verify status badge changes to `Paid`.
  4. Click `Print Invoice` to inspect completed PDF.
- **Expected Result**:
  - PDF watermark/status displays `Paid`.
  - Original unit prices remain intact.
  - Discount column displays `FREE`.
  - Grand Total displays `0.00`.

### TC-008: Invoice Summary Totals Alignment in Generated PDF
- **Objective**: Ensure the summary totals section below the items table accurately reflects FOC reductions.
- **Steps**:
  1. Create invoice with partial or full FOC items.
  2. Generate PDF.
  3. Check `SUBTOTAL`, `Subtotal after discount`, and `GRAND TOTAL` rows.
- **Expected Result**: Math is strictly consistent; no rounding discrepancies or missing discount deductions.

### TC-009: Description Column Complimentary Tag Format
- **Objective**: Verify that the line item description in the PDF explicitly annotates complimentary count.
- **Steps**:
  1. Mark 2 units of an item as FOC.
  2. Generate PDF.
- **Expected Result**: Description text reads: `<Item Name> (2 FREE)`.

### TC-010: High-Value Product/Procedure FOC Pricing Retention
- **Objective**: Verify formatting of thousand separators and decimal precision for high-value items marked FOC.
- **Steps**:
  1. Add high-value item (e.g. `85,000.00`).
  2. Apply FOC.
  3. Generate PDF.
- **Expected Result**: Unit price displays `85,000.00`, discount displays `FREE`, subtotal displays `0.00`.

### TC-011: PDF Content Consistency Across Preview and File Download
- **Objective**: Confirm that both PDF generation channels (in-browser print preview dialog and direct file download) yield identical data.
- **Steps**:
  1. Capture popup preview stream.
  2. Trigger file download event.
  3. Compare text content.
- **Expected Result**: Both streams match 100% in unit price, discount column, and total values.

### TC-012: Multiple Batches of Same Product (One FOC, One Chargeable)
- **Objective**: Validate that inventory batches of the same product behave independently in the PDF table.
- **Steps**:
  1. Add Batch 1 of a product and apply FOC.
  2. Add Batch 2 of the same product and leave chargeable.
  3. Generate PDF.
- **Expected Result**: Row 1 shows `FREE` discount with 0 subtotal; Row 2 shows standard pricing.

### TC-013: Revert FOC (Toggle FOC Off) on Line Item
- **Objective**: Ensure that removing FOC updates the PDF immediately, removing "FREE" from the Discount column and restoring the chargeable Subtotal.
- **Steps**:
  1. Item has FOC applied.
  2. Click FOC button to remove complimentary status.
  3. Generate PDF.
- **Expected Result**: Discount column is empty/`-`; Subtotal displays full `Unit Price * Qty`.

### TC-014: Adjust FOC Quantity from Partial to 100% Complimentary
- **Objective**: Verify PDF updates dynamically when partial FOC is promoted to full FOC.
- **Steps**:
  1. Item has Qty 3, FOC Qty 2.
  2. Update FOC Qty to 3.
  3. Generate PDF.
- **Expected Result**: Discount displays `3 FREE` / `FREE`; Subtotal drops from `400.00` to `0.00`.

### TC-015: Adjust FOC Quantity from 100% to Partial Complimentary
- **Objective**: Verify PDF updates dynamically when full FOC is reduced to partial FOC.
- **Steps**:
  1. Item has Qty 3, FOC Qty 3.
  2. Update FOC Qty to 1.
  3. Generate PDF.
- **Expected Result**: Discount displays `1 FREE`; Subtotal changes from `0.00` to `800.00`.

### TC-016: Zero FOC Quantity Input Validation
- **Objective**: Ensure that entering 0 in the FOC modal does not result in an erroneous "0 FREE" discount in the PDF.
- **Steps**:
  1. Open Apply FOC modal and enter `0`.
  2. Save and generate PDF.
- **Expected Result**: Line item is treated as fully chargeable; Discount column is empty/`-`.

### TC-017: Text Wrapping & Table Column Integrity with Long Names
- **Objective**: Verify visual stability of the PDF invoice table when product names are unusually long.
- **Steps**:
  1. Add product with long name and append `(N FREE)`.
  2. Generate PDF.
- **Expected Result**: Text wraps within `DESCRIPTION` column without overlapping `UNIT PRICE` or `DISCOUNT`.

### TC-018: PDF Header Metadata Alignment with FOC Document
- **Objective**: Ensure clinic branding, contact information, patient name, and invoice reference number are rendered properly alongside FOC items.
- **Steps**:
  1. Generate invoice PDF.
  2. Check header text for clinic branding ("Amaran Aesthetic Clinic"), patient name, and invoice reference.
- **Expected Result**: All metadata elements render cleanly with exact match.

### TC-019: Cross-Session & Page Reload PDF Consistency
- **Objective**: Verify persistence of FOC PDF pricing rules across sessions.
- **Steps**:
  1. Mark item FOC.
  2. Reload page / re-login.
  3. Generate PDF.
- **Expected Result**: Generated PDF retains original unit price and `FREE` discount column.

### TC-020: Backend PDF Endpoint / Print Route Data Verification
- **Objective**: Verify backend JSON / PDF stream payload contract for FOC pricing data.
- **Steps**:
  1. Intercept network call for invoice PDF generation.
  2. Verify payload attributes for line items.
- **Expected Result**: Backend contract provides `unit_price`, `foc_quantity`, and calculated subtotal.
