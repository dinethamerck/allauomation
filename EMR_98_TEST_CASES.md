# EMR-98: Free of Charge (FOC) Invoice & Instant Complete Invoice Specification

**Feature ID**: `EMR-98`  
**Feature Name**: Free of Charge (FOC) Invoice & Zero-Total Instant Completion Flow  
**Target Application**: [AMERCK CARE Clinical Portal (QA)](https://qa_care.amerck.com)  
**Backend API**: `https://api_emr_dev.amerck.com`  
**Module**: Invoicing & Billing (`/admin/aesthetic-schedule/appointments/:id` -> `Invoices`)  
**Test Suite File**: [`tests/emr-98.spec.js`](file:///c:/Users/LENOVO/Desktop/aergertuc/tests/emr-98.spec.js)  
**Page Object Model**: [`tests/pages/ConsultationInvoicePage.js`](file:///c:/Users/LENOVO/Desktop/aergertuc/tests/pages/ConsultationInvoicePage.js)  

---

## 1. Feature Overview & Requirements

In clinical workflows, doctors and clinic administrators occasionally provide consultations, procedures, or medications as complimentary or **Free of Charge (FOC)**. 

### Core Functional Rules:
1. **Zero Total Calculation**:
   - When an item is marked as 100% FOC, its chargeable amount becomes 0.
   - If **all** line items in an invoice are marked as FOC, the invoice subtotal, tax, and Grand Total must automatically drop to `0.00`.
   - If an invoice contains a mix of FOC and non-FOC items, the total must only sum the chargeable items.
2. **FOC Modal & Toggle Trigger Rules (Quantity Threshold)**:
   - **Quantity = 1**: Clicking the FOC button on a line item with quantity 1 **does NOT display a popup modal**; it immediately toggles the item directly to/from FOC.
   - **Quantity > 1**: Clicking the FOC button on a line item with quantity greater than 1 **opens the 'Apply FOC' popup modal** (displaying `FOC Quantity` input, `Total Quantity: N`, `Cancel`, and `Save`), allowing partial or full complimentary unit assignment.
3. **"Complete Invoice" Button Behavior**:
   - A dedicated **Complete Invoice** action button appears directly adjacent to the **Print Invoice** button in the action toolbar.
   - **Enabled State**: The **Complete Invoice** button is **enabled ONLY when 100% of the invoice items are FOC** (Grand Total = `0.00`).
   - **Disabled State**: The **Complete Invoice** button must remain **disabled** if:
     - No items have been added to the invoice.
     - None of the items are marked FOC.
     - Only some items are FOC (mixed cart) or any item is only partially FOC.
     - An FOC item is toggled back to chargeable.
4. **Completion & Document State Lifecycle**:
   - Clicking **Complete Invoice** bypasses the payment gateway (since no funds are due) and completes the transaction immediately.
   - The invoice status badge transitions directly from `Draft` / `Unpaid` to **`Paid`**.
   - The finalized document is designated as an **`Invoice`** (with a `Paid` indicator/watermark) and must **never** be labeled as a `Quotation`.
   - The `Paid` status and `0.00` total must persist across page refreshes, tab reloads, reopening historical appointments, and user logout/login sessions.
4. **Idempotency & Backend Security**:
   - Rapid multiple clicks on the Complete Invoice button must be debounced, preventing duplicate ledger entries.
   - The backend API must reject direct completion requests for non-FOC or payable invoices without a recorded financial transaction (HTTP 400/422).

---

## 2. Test Execution Commands

```bash
# Run all EMR-98 tests in headless Chromium
npx playwright test tests/emr-98.spec.js --project=chromium

# Run all EMR-98 tests across all configured browsers
npx playwright test tests/emr-98.spec.js

# Run in interactive headed mode
npx playwright test tests/emr-98.spec.js --headed

# Run with interactive UI mode
npx playwright test tests/emr-98.spec.js --ui

# Run a specific test case (e.g., TC-001)
npx playwright test tests/emr-98.spec.js -g "TC-001"
```

---

## 3. Comprehensive Test Matrix

### Part 1: Positive Functional Scenarios

| Test Case ID | Test Scenario | Preconditions | Step-by-Step Actions | Expected Result | Priority | Automation Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-001** | Add one item and mark it as FOC | Logged in as `parami`, draft invoice open | 1. Click `Add Item`.<br>2. Select 1 product/treatment item.<br>3. Click `FOC` button on line item.<br>4. Set FOC Quantity = Total Quantity.<br>5. Click `Save`. | Invoice total automatically updates to `0.00`. | **P0 (Critical)** | Automated |
| **TC-002** | Add multiple items and mark all as FOC | Draft invoice open | 1. Add multiple items (2+ items).<br>2. Click `FOC` on each line item.<br>3. Set 100% quantity as FOC for all items.<br>4. Save each modal. | Invoice Grand Total remains `0.00`. | **P0 (Critical)** | Automated |
| **TC-003** | Add multiple items with both FOC and non-FOC items | Draft invoice open | 1. Add Item A and Item B.<br>2. Mark Item A as 100% FOC.<br>3. Leave Item B as chargeable. | Invoice total includes only chargeable items (Item B price); Item A is billed at 0. | **P0 (Critical)** | Automated |
| **TC-004** | Verify the Complete Invoice button is visible | Invoice editor open | 1. Navigate to consultation invoices tab.<br>2. Inspect action toolbar header. | `Complete Invoice` button is visible next to `Print Invoice`. | **P1 (High)** | Automated |
| **TC-005** | Verify Complete Invoice when all items are FOC | Invoice has items, all marked 100% FOC | 1. Ensure all added items have 100% FOC applied.<br>2. Verify Grand Total is 0.<br>3. Inspect Complete Invoice button. | `Complete Invoice` button is **enabled**. | **P0 (Critical)** | Automated |
| **TC-006** | Verify Complete Invoice when only some items are FOC | Invoice has 2 items, only 1 is FOC | 1. Add 2 items.<br>2. Mark 1 item as FOC and 1 item as chargeable.<br>3. Inspect Complete Invoice button. | `Complete Invoice` button is **disabled**; standard payment is required. | **P0 (Critical)** | Automated |
| **TC-007** | Verify Complete Invoice when no items are FOC | Draft invoice has chargeable items | 1. Add items to invoice without applying FOC.<br>2. Verify Grand Total > 0.<br>3. Inspect Complete Invoice button. | `Complete Invoice` button is **disabled**; `Record Payment` is enabled. | **P0 (Critical)** | Automated |
| **TC-008** | Click Complete Invoice for an all-FOC invoice | All items are FOC, button enabled | 1. Click `Complete Invoice` button.<br>2. Wait for completion handler. | Invoice completes successfully without requiring payment gateway. | **P0 (Critical)** | Automated |
| **TC-009** | Verify invoice status after completion | Completed all-FOC invoice | 1. Complete an all-FOC invoice.<br>2. Observe the invoice status badge. | Invoice status badge changes to **`Paid`**. | **P0 (Critical)** | Automated |
| **TC-010** | Open Print Invoice after completing an all-FOC invoice | Completed FOC invoice | 1. Click `Print Invoice`.<br>2. Switch to print preview dialog / tab. | Print document displays **`Paid`** watermark/stamp. | **P1 (High)** | Automated |
| **TC-011** | Verify completed FOC invoice document | Completed FOC invoice | 1. Inspect header of completed invoice view/document. | Document displays **`Invoice`**, never `Quotation`. | **P1 (High)** | Automated |
| **TC-012** | Refresh the page after completing the FOC invoice | Completed FOC invoice (`Paid`) | 1. Refresh browser window (`F5`).<br>2. Navigate back to Invoices tab. | **`Paid`** status remains unchanged; does not revert to Draft. | **P1 (High)** | Automated |
| **TC-013** | Reopen the completed FOC invoice | Completed FOC invoice | 1. Navigate to Appointments list.<br>2. Re-open appointment & Invoices tab. | Invoice remains completed with total `0.00`. | **P1 (High)** | Automated |
| **TC-014** | Verify normal non-FOC invoice flow | Standard chargeable draft invoice | 1. Add chargeable items.<br>2. Proceed through standard payment flow (`Record Payment`). | Existing payment, receipt, and invoice flow remains completely unchanged. | **P1 (High)** | Automated |

---

### Part 2: Negative and Edge Test Scenarios

| Test Case ID | Test Scenario | Preconditions | Step-by-Step Actions | Expected Result | Priority | Automation Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-015** | Click Complete Invoice multiple times rapidly | All items FOC, button enabled | 1. Trigger 3 rapid consecutive clicks on `Complete Invoice`.<br>2. Monitor network API requests and ledger records. | Invoice completed only once; UI disables button on first click; no duplicate transaction. | **P0 (Critical)** | Automated |
| **TC-016** | Try to complete an invoice without adding items | Empty draft invoice (0 items) | 1. Create a new empty draft invoice.<br>2. Inspect `Complete Invoice` button. | `Complete Invoice` remains **disabled** when 0 items are added. | **P1 (High)** | Automated |
| **TC-017** | Mark all items FOC, then uncheck FOC for one item | All items originally FOC | 1. Mark item as FOC.<br>2. Re-open FOC dialog and click `Remove FOC`.<br>3. Verify button state. | `Complete Invoice` immediately becomes **disabled**; `Record Payment` active. | **P0 (Critical)** | Automated |
| **TC-018** | Mark all items FOC, then add a non-FOC item | All existing items are FOC | 1. Invoice has 1 FOC item (Complete Invoice enabled).<br>2. Add a new chargeable item from catalog. | `Complete Invoice` dynamically toggles to **disabled** due to non-zero balance. | **P0 (Critical)** | Automated |
| **TC-019** | Verify a completed FOC invoice after logout and login | Completed FOC invoice (`Paid`) | 1. Log out of Amerck Care.<br>2. Log back in as `parami`.<br>3. Open target appointment invoice. | Invoice remains **`Paid`** and is not shown as `Quotation`. | **P1 (High)** | Automated |
| **TC-020** | Attempt to complete a non-FOC invoice through direct API request | Non-FOC invoice ID / payload with balance | 1. Send direct `POST /aesthetic/invoices/complete` with `isFoc: false` and `totalAmount: 1400`. | Backend rejects the invalid request with HTTP **`400 Bad Request`** or **`422 Unprocessable`**. | **P0 (Critical)** | Automated |

---

## 4. Detailed Test Case Specifications

### TC-001: Add One Item and Mark it as FOC
- **Objective**: Verify that marking an added item as 100% FOC calculates the total to 0.
- **Preconditions**: User is logged in and on an appointment invoice draft.
- **Steps**:
  1. Click `Add Item`.
  2. Search for `Acnechio` and click `Add`.
  3. Close catalog dialog.
  4. Locate the `FOC` button on the line item.
  5. In the `Apply FOC` modal, enter `FOC Quantity` equal to total item quantity.
  6. Click `Save`.
- **Expected Result**: Subtotal and Grand Total display `0.00`. The line item displays an FOC badge (e.g., `1 FREE`).

### TC-002: Add Multiple Items and Mark All as FOC
- **Objective**: Verify multi-item invoice calculates to 0 when all items are FOC.
- **Steps**:
  1. Add 2 or more distinct products/treatments.
  2. For each line item, click `FOC` and apply 100% quantity.
  3. Verify Grand Total.
- **Expected Result**: Grand Total displays `0.00`.

### TC-003: Add Multiple Items with Both FOC and Non-FOC Items
- **Objective**: Verify that non-FOC items are correctly charged and FOC items contribute 0 to the total.
- **Steps**:
  1. Add Item 1 (Price: LKR 1,400) and Item 2 (Price: LKR 2,500).
  2. Apply FOC to Item 1 only.
- **Expected Result**: Grand Total equals LKR 2,500.00.

### TC-004: Complete Invoice Button Visibility
- **Objective**: Verify placement of the `Complete Invoice` button.
- **Steps**:
  1. Navigate to Invoices toolbar.
- **Expected Result**: `Complete Invoice` is visible and located adjacent to `Print Invoice`.

### TC-005 to TC-007: Complete Invoice Button State Rules
- **Objective**: Verify enabled/disabled states based on 100% FOC condition.
- **Matrix**:
  - **100% Items FOC**: `Complete Invoice` = **Enabled**, `Record Payment` = Disabled/Hidden.
  - **Partial FOC (Some items or partial qty)**: `Complete Invoice` = **Disabled**, `Record Payment` = Enabled.
  - **0% FOC (All chargeable)**: `Complete Invoice` = **Disabled**, `Record Payment` = Enabled.

### TC-008 & TC-009: Complete Invoice Execution & Status Transition
- **Objective**: Execute completion and confirm status transition to `Paid`.
- **Steps**:
  1. With all items FOC, click `Complete Invoice`.
  2. Wait for confirmation toast / state update.
- **Expected Result**: Status badge changes from `Draft` to `Paid`.

### TC-010 & TC-011: Print Document Presentation (Invoice vs Quotation)
- **Objective**: Validate that completed FOC documents are labeled `Invoice` and marked `Paid`.
- **Steps**:
  1. Click `Print Invoice`.
  2. Review the rendered print preview document.
- **Expected Result**: 
  - Document Title is `Invoice` (never `Quotation`).
  - Contains visible `Paid` indicator.

### TC-012 & TC-013: State Persistence on Reload / Navigation
- **Objective**: Ensure FOC completion state is permanently saved.
- **Steps**:
  1. Hard refresh browser page (`Ctrl+F5` or `page.reload()`).
  2. Navigate away to another tab (e.g. `Scheduling`) and back to `Invoices`.
- **Expected Result**: Status remains `Paid` and Grand Total remains `0.00`.

### TC-014: Non-FOC Regression Verification
- **Objective**: Guarantee that standard payment flows are not disrupted.
- **Steps**:
  1. Create standard invoice with chargeable items.
- **Expected Result**: `Record Payment` opens standard payment recording modal (Cash, Card, Bank Transfer).

### TC-015: Rapid Click / Double Submission Prevention
- **Objective**: Verify UI debouncing and single-completion integrity.
- **Steps**:
  1. Rapidly click `Complete Invoice` 3 times in quick succession.
- **Expected Result**: Button disables on initial click; single network request dispatched; 0 duplicate transactions created.

### TC-016 to TC-018: Dynamic Reactive Button State Changes
- **Objective**: Ensure `Complete Invoice` button updates reactively when items or FOC flags change.
- **Scenarios**:
  - Empty cart: Button disabled.
  - Remove FOC from line item: Button disables immediately.
  - Add new non-FOC item to an all-FOC cart: Button disables immediately.

### TC-019: Session Logout & Cross-Session Persistence
- **Objective**: Verify that completed FOC status is stored in the database and persists across authentication sessions.
- **Steps**:
  1. Complete FOC invoice.
  2. Click user avatar and log out.
  3. Log back in and navigate back to the appointment invoice.
- **Expected Result**: Invoice is immediately loaded as `Paid` with total `0.00`.

### TC-020: Direct Backend API Security Validation
- **Objective**: Prevent bypassing frontend validation via direct HTTP API calls.
- **Endpoint**: `POST https://api_emr_dev.amerck.com/aesthetic/invoices/complete`
- **Payload**:
  ```json
  {
    "invoiceId": "test-inv-id",
    "isFoc": false,
    "totalAmount": 1400.00
  }
  ```
- **Expected Result**: Backend returns HTTP 400 Bad Request or 422 Unprocessable Entity rejecting completion of unpaid non-FOC invoice.
