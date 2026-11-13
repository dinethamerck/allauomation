# AMERCK CARE — End-to-End Automated Test Cases

**Target Application**: [AMERCK CARE Clinical Portal (QA)](https://qa_care.amerck.com)  
**Authentication**:
- **Username**: `parami`
- **Password**: `parami`  
**Framework**: Playwright (JavaScript) with Page Object Model (POM) architecture.

---

## Test Execution Commands

```bash
# Run all tests across the entire application
npx playwright test

# Run Appointments tests specifically
npx playwright test tests/appointments.spec.js

# Run Schedule tests specifically
npx playwright test tests/schedule.spec.js

# Run Login tests specifically
npx playwright test tests/login.spec.js

# Run Product Inventory & Appointment Invoice Stock Sync tests (2 Tabs)
npx playwright test tests/invoice-product-sync.spec.js

# Run Multi-Tab 20 Concurrency Refresh & 500/Timeout Reproduction Test Suite
npx playwright test tests/multi-tab-refresh-stress.spec.js

# Run EMR-98 Free of Charge (FOC) & Instant Complete Invoice Test Suite
npx playwright test tests/emr-98.spec.js

# Run EMR-138 Free of Charge (FOC) Invoice PDF Item Pricing & "FREE" Discount Column Test Suite
npx playwright test tests/emr-138.spec.js

# Run tests in interactive UI mode
npx playwright test --ui

# Run tests with visible browser (headed)
npx playwright test --headed

# View HTML Test Report
npx playwright show-report
```

---

## Complete Test Matrix

### 🛒 Product Inventory & Appointment Invoice Stock Sync (`tests/invoice-product-sync.spec.js`)

| Test ID | Category | Description | Priority |
| :--- | :--- | :--- | :--- |
| **INV-01** | Multi-Tab Sync | Verify available stock in Product Settings (`/admin/aesthetic-settings/products`) matches Invoice Catalog across 2 browser tabs | P0 (Critical) |
| **INV-02** | Invoice Line Item | Add product batch item to appointment invoice and verify Added Items, quantity, unit price, and subtotal | P0 (Critical) |
| **INV-03** | Stock Integrity | Verify batch numbers, stock fields, and available inventory integrity remain consistent | P1 (High) |

---

### 📋 Appointments Module (`tests/appointments.spec.js`)

| Test ID | Category | Description | Priority |
| :--- | :--- | :--- | :--- |
| **APT-01** | Navigation | Navigate to Appointments (`/admin/aesthetic-appointments`), verify URL & page title | P0 (Critical) |
| **APT-02** | Header | Verify clinic selector button (`Amaran Aesthetic Clinic`) and user avatar (`PG`) | P1 (High) |
| **APT-03** | Metrics | Render all appointment status KPI badges (Scheduled, Confirmed, Waiting, Completed, etc.) | P1 (High) |
| **APT-04** | Search | Enter query in patient search input and clear search value | P1 (High) |
| **APT-05** | Filter | Open Status filter dropdown and assert presence of status options | P1 (High) |
| **APT-06** | Filter | Select specific status filter (e.g. `Confirmed`) and reset back to `All` | P1 (High) |
| **APT-07** | Filter | Render Type filter dropdown and verify default `All Types` | P2 (Medium) |
| **APT-08** | Date Range | Open Date Range popover calendar on click and verify calendar controls | P1 (High) |
| **APT-09** | Date Range | Select preset date shortcut (e.g. `All time`) and update data table | P1 (High) |
| **APT-10** | Data Table | Verify table columns (`Patient`, `Contact No.`, `Email`, `Type`, `Doctor`, `Date & Time`, `Status`) | P0 (Critical) |
| **APT-11** | Data Table | Verify table rows or empty state notification (`No appointments found...`) | P1 (High) |
| **APT-12** | Pagination | Verify pagination bar, `Previous` / `Next` controls, and page indicator | P2 (Medium) |

---

### 📅 Schedule Module (`tests/schedule.spec.js`)

| Test ID | Category | Description | Priority |
| :--- | :--- | :--- | :--- |
| **SCH-01** | Navigation | Navigate to Schedule (`/admin/aesthetic-schedule`) and verify container | P0 (Critical) |
| **SCH-02** | Toolbar | Render clinic selector, user profile, Today button, and filters | P1 (High) |
| **SCH-03** | Date Picker | Render date input and interact with 'Today' button | P1 (High) |
| **SCH-04** | Calendar | Open flatpickr calendar dropdown on date picker click | P1 (High) |
| **SCH-05** | Filter | Open Status dropdown and verify all status options | P1 (High) |
| **SCH-06** | Filter | Filter appointments by selecting specific status (e.g. Scheduled) | P1 (High) |
| **SCH-07** | Mark Off-Day | Open Mark Off-Day dialog and verify all fields & controls | P0 (Critical) |
| **SCH-08** | Mark Off-Day | Toggle between 'Single Day' and 'Mark Week' modes | P1 (High) |
| **SCH-09** | Mark Off-Day | Select category types (Holiday, Poya Day, Other) | P1 (High) |
| **SCH-10** | Mark Off-Day | Fill name, notes and dismiss dialog via Cancel button | P1 (High) |
| **SCH-11** | Mark Off-Day | Dismiss Mark Off-Day dialog using keyboard `Escape` key | P2 (Medium) |
| **SCH-12** | Grid Controls | Render doctor column rearrangement controls (Move Left / Right) | P2 (Medium) |

---


### 🔐 Authentication & Login (`tests/login.spec.js`)

| Test ID | Category | Description | Priority |
| :--- | :--- | :--- | :--- |
| **TC-01** | Positive Auth | Valid login with credentials `parami` / `parami` redirects to dashboard | P0 (Critical) |
| **TC-02** | Positive Auth | Whitespace around username is trimmed and login succeeds | P1 (High) |
| **TC-03** | Negative Auth | Invalid password is rejected and user remains on `/login` | P0 (Critical) |
| **TC-04** | Negative Auth | Non-existent username is rejected | P0 (Critical) |
| **TC-05** | Negative Auth | Both invalid username and password are rejected | P1 (High) |
| **TC-06** | Validation | Empty submission does not allow login | P1 (High) |
| **TC-07** | Validation | Empty password submission prevents login | P1 (High) |
| **TC-08** | Validation | Empty username submission prevents login | P1 (High) |
| **TC-09** | UI Controls | Password eye icon toggles input type between `password` and `text` | P1 (High) |
| **TC-10** | UI / Branding | Page title, inputs, placeholders (`Required`), and links render properly | P2 (Medium) |
| **TC-11** | Navigation | Clicking "Don't have an account? Sign Up" navigates to `/signup` | P2 (Medium) |
| **TC-12** | Navigation | Clicking "Forgot password?" navigates to `/forgotPassword` | P2 (Medium) |
| **TC-13** | Accessibility | Pressing `Enter` key inside the password field submits the form | P1 (High) |

---

### 💥 Multi-Tab 20 Concurrency & Refresh Stress Tests (Timeout & 500 Error Reproduction) (`tests/multi-tab-refresh-stress.spec.js`)

| Test ID | Category | Description | Priority |
| :--- | :--- | :--- | :--- |
| **TC-STRESS-01** | Concurrency / Refresh | Reproduce 500 errors and timeouts by concurrently refreshing 20 tabs on Appointments (`/admin/aesthetic-appointments`) | P0 (Critical) |
| **TC-STRESS-02** | Multi-Route Load | Reproduce 500 and timeout errors across mixed heavy routes (Appointments, Schedule, Products, Dashboard across 20 tabs) | P0 (Critical) |
| **TC-STRESS-03** | Burst / Pool Starvation | Burst rapid double-refresh across 20 tabs while in-flight queries are executing to provoke connection pool exhaustion & 500 error | P0 (Critical) |
| **TC-STRESS-04** | Rolling Concurrency | Staggered refresh wave of 20 tabs with 250ms interval to profile performance degradation under sustained spike | P1 (High) |
| **TC-STRESS-05** | Defect Reproduction | Defect reproduction assertion: Capture and log comprehensive telemetry on HTTP 500 status codes, network timeouts, and UI error banners | P0 (Critical) |

---

### 🎁 EMR-98: Free of Charge (FOC) Invoice & Instant Complete Workflow (`tests/emr-98.spec.js`)

| Test ID | Category | Description | Priority |
| :--- | :--- | :--- | :--- |
| **TC-001** | Positive / Total | Add one item and mark it as FOC — Invoice total automatically becomes 0 | P0 (Critical) |
| **TC-002** | Positive / Total | Add multiple items and mark all as FOC — Invoice total remains 0 | P0 (Critical) |
| **TC-003** | Positive / Mixed Total | Add multiple items with both FOC and non-FOC items — Invoice total includes only chargeable items | P0 (Critical) |
| **TC-004** | UI / Toolbar | Verify the Complete Invoice button is visible next to Print Invoice | P1 (High) |
| **TC-005** | UI State / Enable | Verify Complete Invoice when all items are FOC — Button is enabled | P0 (Critical) |
| **TC-006** | UI State / Disable | Verify Complete Invoice when only some items are FOC — Button is disabled | P0 (Critical) |
| **TC-007** | UI State / Disable | Verify Complete Invoice when no items are FOC — Button is disabled | P0 (Critical) |
| **TC-008** | Flow / Complete | Click Complete Invoice for an all-FOC invoice — Invoice is completed successfully | P0 (Critical) |
| **TC-009** | Status Lifecycle | Verify invoice status after completion — Status changes to Paid | P0 (Critical) |
| **TC-010** | Document / Print | Open Print Invoice after completing an all-FOC invoice — Invoice displays Paid | P1 (High) |
| **TC-011** | Document / Label | Verify completed FOC invoice document — Document displays Invoice, not Quotation | P1 (High) |
| **TC-012** | Persistence / Refresh | Refresh the page after completing the FOC invoice — Paid status remains unchanged | P1 (High) |
| **TC-013** | Persistence / Reopen | Reopen the completed FOC invoice — Invoice remains completed with total 0 | P1 (High) |
| **TC-014** | Regression | Verify normal non-FOC invoice flow — Existing payment and invoice flow remains unchanged | P1 (High) |
| **TC-015** | Edge / Idempotency | Click Complete Invoice multiple times rapidly — Invoice completed only once; no duplicate transaction | P0 (Critical) |
| **TC-016** | Edge / Empty State | Try to complete an invoice without adding items — Complete Invoice remains disabled | P1 (High) |
| **TC-017** | Edge / Uncheck | Mark all items FOC, then uncheck FOC for one item — Complete Invoice becomes disabled | P0 (Critical) |
| **TC-018** | Edge / Dynamic Cart | Mark all items FOC, then add a non-FOC item — Complete Invoice becomes disabled | P0 (Critical) |
| **TC-019** | Edge / Session Auth | Verify a completed FOC invoice after logout and login — Invoice remains Paid and not shown as Quotation | P1 (High) |
| **TC-020** | Negative / API Security | Attempt to complete a non-FOC invoice through direct API request — Backend rejects invalid request | P0 (Critical) |

---

### 📄 EMR-138: Free of Charge (FOC) Invoice PDF Item Pricing & "FREE" Discount Column Display (`tests/emr-138.spec.js`)

| Test ID | Category | Description | Priority |
| :--- | :--- | :--- | :--- |
| **TC-001** | PDF / 100% FOC (Qty=1) | Single item 100% FOC: PDF retains original unit price (400.00), displays "FREE" in Discount column, and displays 0.00 Subtotal | P0 (Critical) |
| **TC-002** | PDF / Multi-Qty FOC | Single item multi-quantity 100% FOC (Qty=3, 3 FREE): PDF retains unit price and displays "FREE" / "3 FREE" discount | P0 (Critical) |
| **TC-003** | PDF / Partial FOC (2 of 3) | Reference scenario (Qty=3, 2 FREE): Retains unit price 400.00, displays "2 FREE" in Discount, subtotal 400.00, Grand Total 400.00 | P0 (Critical) |
| **TC-004** | PDF / Multi-Item All FOC | Multi-item invoice all 100% FOC: Each item retains original unit price, displays "FREE" in Discount, Grand Total 0.00 | P0 (Critical) |
| **TC-005** | PDF / Mixed Cart (Full FOC) | 1 FOC item + 1 regular chargeable item: FOC displays FREE, chargeable item retains standard unit price and subtotal | P0 (Critical) |
| **TC-006** | PDF / Mixed Cart (Partial) | Partial FOC item + regular item: Accurate multi-row calculations and discount tagging in PDF | P0 (Critical) |
| **TC-007** | PDF / Completed Invoice | Completed all-FOC invoice PDF displays "Paid" watermark/stamp and retains original unit prices | P0 (Critical) |
| **TC-008** | PDF / Summary Totals | Invoice summary totals alignment: SUBTOTAL, Subtotal after discount, and GRAND TOTAL accurately reflect deductions | P1 (High) |
| **TC-009** | PDF / Description Tag | Description column complimentary tagging: Appends "(N FREE)" to item description in PDF | P1 (High) |
| **TC-010** | PDF / High-Value Item | High-value product/procedure FOC: Retains currency formatting (e.g. 85,000.00) and displays "FREE" discount | P1 (High) |
| **TC-011** | PDF / Channel Parity | PDF content consistency across in-browser preview and direct binary file download | P1 (High) |
| **TC-012** | PDF / Inventory Batches | Multiple batches of same product: One marked FOC, one chargeable, distinct rows rendered in PDF | P1 (High) |
| **TC-013** | PDF / Revert FOC | Revert FOC on line item: PDF removes "FREE" from Discount column and restores full chargeable Subtotal | P0 (Critical) |
| **TC-014** | PDF / Promote to 100% | Adjust FOC quantity from partial to 100%: PDF reflects full "FREE" discount and 0.00 subtotal | P1 (High) |
| **TC-015** | PDF / Demote to Partial | Adjust FOC quantity from 100% to partial: PDF recalculates chargeable subtotal and updates discount column | P1 (High) |
| **TC-016** | PDF / Zero FOC Qty | Zero FOC quantity validation: Entering 0 leaves Discount column blank and charges full price in PDF | P1 (High) |
| **TC-017** | PDF / Column Integrity | Long product descriptions: Text wraps cleanly without table column collision or overlapping | P1 (High) |
| **TC-018** | PDF / Header Alignment | Header metadata integrity: Clinic details ("Amaran Aesthetic Clinic"), Invoice Details (AA-XXXXX), and patient info align | P2 (Medium) |
| **TC-019** | PDF / Session Persistence | Cross-session & page reload consistency: PDF retains unit price retention and FREE discount across sessions | P1 (High) |
| **TC-020** | PDF / API Payload Contract | Backend PDF endpoint / print route data contract: Validates unit_price, foc_quantity, and subtotal payload schema | P1 (High) |

---

## Project Structure

```
├── package.json                   # Node project configuration and Playwright dependency
├── playwright.config.js           # Playwright runner & multi-browser configuration
├── TEST_CASES.md                  # Master test specifications & documentation
├── EMR_98_TEST_CASES.md           # EMR-98 dedicated FOC & Complete Invoice test specifications
├── EMR_138_TEST_CASES.md          # EMR-138 dedicated FOC PDF Unit Price & "FREE" Discount specifications
└── tests/
    ├── pages/
    │   ├── LoginPage.js               # Page Object Model for Login screen
    │   ├── DashboardPage.js           # Page Object Model for Dashboard screen
    │   ├── SchedulePage.js            # Page Object Model for Schedule module
    │   ├── AppointmentsPage.js        # Page Object Model for Appointments module
    │   ├── ProductSettingsPage.js     # Page Object Model for Products & Batches
    │   ├── StocksPage.js              # Page Object Model for Stocks screen
    │   └── ConsultationInvoicePage.js # Page Object Model for Consultation, Invoices & FOC
    ├── login.spec.js                  # Authentication Test Suite (13 tests)
    ├── schedule.spec.js               # Schedule Module Test Suite (12 tests)
    ├── appointments.spec.js           # Appointments Module Test Suite (12 tests)
    ├── invoice-product-sync.spec.js   # Multi-tab Product & Invoice Sync Test Suite (3 tests)
    ├── invoice-stock-twotabs.spec.js  # 2-Tab Stock Sync Test Suite (3 tests)
    ├── multi-tab-refresh-stress.spec.js # Multi-Tab 20 Concurrency Stress & 500 Error Suite (5 tests)
    ├── emr-98.spec.js                 # EMR-98 FOC & Complete Invoice Test Suite (20 tests)
    └── emr-138.spec.js                # EMR-138 FOC Invoice PDF Pricing & Discount Suite (20 tests)
```



