# QA Aesthetic - Import Products Test Suite

## Overview
Playwright test suite for testing the **Import Products** feature on the EMR site:
- **URL**: https://qa_care.amerck.com
- **Credentials**: `doc_aesthetic` / `amk@123`
- **Feature**: Products & Services → Import Products (CSV Upload)

---

## Project Structure

```
QA Aesthertic/
├── INVENTORY LIST 2026.csv        # Real inventory CSV (28KB, 15 products)
├── playwright.config.js           # Playwright configuration
├── package.json                   # npm scripts
├── README.md                      # This file
│
├── pages/
│   ├── LoginPage.js               # Login Page Object Model
│   └── ImportProductsPage.js      # Import Products Page Object Model
│
├── tests/
│   └── importProducts.spec.js     # Main test file (35+ test cases)
│
└── test-data/
    ├── valid_products.csv         # Valid CSV with 2 test products
    ├── empty_products.csv         # CSV with headers only, no data
    ├── missing_fields.csv         # CSV with missing Name/Price
    ├── invalid_date.csv           # CSV with invalid expiry date (month 13)
    └── invalid_format.txt         # Non-CSV file for rejection testing
```

---

## Test Cases Summary

### TC-AUTH: Authentication & Navigation (5 tests)
| ID | Test Case |
|----|-----------|
| TC-AUTH-01 | Login with valid credentials should succeed |
| TC-AUTH-02 | Login with invalid credentials should show error |
| TC-AUTH-03 | Login with empty credentials should not proceed |
| TC-AUTH-04 | Products page should load after login |
| TC-AUTH-05 | Import Products button should be visible on Products page |

### TC-MODAL: Import Modal UI (8 tests)
| ID | Test Case |
|----|-----------|
| TC-MODAL-01 | Clicking "Import Products" should open a modal/dialog |
| TC-MODAL-02 | Import modal should contain a file input or browse button |
| TC-MODAL-03 | Import modal should have an Upload/Submit/Import button |
| TC-MODAL-04 | Import modal should have a Close/Cancel button |
| TC-MODAL-05 | Pressing Escape key should close the import modal |
| TC-MODAL-06 | Cancel button should close the modal without importing |
| TC-MODAL-07 | Download Template button should be present (if available) |
| TC-MODAL-08 | Submitting without a file should show validation error |

### TC-IMPORT: Successful Product Import (5 tests)
| ID | Test Case |
|----|-----------|
| TC-IMPORT-01 | Import valid CSV using INVENTORY LIST 2026.csv |
| TC-IMPORT-02 | Import valid small CSV (valid_products.csv) should succeed |
| TC-IMPORT-03 | After successful import, products should appear in list |
| TC-IMPORT-04 | Import using file path input field (if available) |
| TC-IMPORT-05 | Selected file name should display in modal after choosing |

### TC-VALID: Validation & Error Handling (6 tests)
| ID | Test Case |
|----|-----------|
| TC-VALID-01 | Uploading .txt file should show error or be rejected |
| TC-VALID-02 | Uploading empty CSV should show appropriate message |
| TC-VALID-03 | Uploading CSV with missing required fields should show error |
| TC-VALID-04 | Uploading CSV with invalid expiry date should show error |
| TC-VALID-05 | Modal should not close when wrong file is selected |
| TC-VALID-06 | File input should only accept CSV files (accept attribute) |

### TC-INVENTORY: Import Actual Inventory File (8 tests)
| ID | Test Case |
|----|-----------|
| TC-INVENTORY-01 | Successfully upload INVENTORY LIST 2026.csv |
| TC-INVENTORY-02 | Verify product "Aclin Gel 15g" appears in list |
| TC-INVENTORY-03 | Verify product "Allegra 180 mg" appears in list |
| TC-INVENTORY-04 | Verify product "Astrocort - 15g" appears in list |
| TC-INVENTORY-05 | Verify product "Adapalene Gel" appears in list |
| TC-INVENTORY-06 | Product price matches CSV data (LKR 6,000.00) |
| TC-INVENTORY-07 | Product availability status shows "Available" |
| TC-INVENTORY-08 | Import handles products with special characters (&) in supplier |

### TC-UX: Usability (7 tests)
| ID | Test Case |
|----|-----------|
| TC-UX-01 | Import button should be clearly visible and clickable |
| TC-UX-02 | Products page should have a search bar |
| TC-UX-03 | Searching for product name should filter results |
| TC-UX-04 | Page should have Stocks button visible |
| TC-UX-05 | Page should have Add Product button visible |
| TC-UX-06 | Modal should display loading indicator during upload |
| TC-UX-07 | Page title should be "Products & Services" or similar |

### TC-E2E: End-to-End Full Flows (3 tests)
| ID | Test Case |
|----|-----------|
| TC-E2E-01 | Full flow: Login → Navigate → Import CSV → Verify Product Appears |
| TC-E2E-02 | Full flow: Open modal → Cancel → Verify products unchanged |
| TC-E2E-03 | Full flow: Import CSV → Search product by SKU |

---

## How to Run

### Prerequisites
- Node.js v18+ installed
- Playwright browsers installed

### Install dependencies (first time only)
```bash
npm install
npx playwright install chromium
```

### Run all tests
```bash
npm test
```

### Run tests with browser visible (headed mode)
```bash
npm run test:headed
```

### Run specific test suites
```bash
npm run test:auth        # Authentication tests only
npm run test:modal       # Modal UI tests only
npm run test:import      # Happy path import tests
npm run test:valid       # Validation/error tests
npm run test:inventory   # Full inventory CSV tests
npm run test:ux          # UX/usability tests
npm run test:e2e         # End-to-end flow tests
```

### View HTML report
```bash
npm run test:report
```

### Debug a specific test
```bash
npm run test:debug
```

---

## CSV File Format

The import expects the following column order (matching `INVENTORY LIST 2026.csv`):

| Col | Header | Example |
|-----|--------|---------|
| 1 | (row#) | 1 |
| 2 | Name | Aclin Gel 15g |
| 3 | SKU | sew1 |
| 4 | Brand | hemas |
| 5 | Supplier Name | Maars Pharmacy & Grocery |
| 6 | Unit | 10ml button |
| 7 | Expiry Date | 10/6/2027 |
| 8 | Buying price | 507.30 |
| 9 | Selling Price | 6,000.00 |
| 10 | $ | (discount flag) |
| 11 | 10% | 558.03 |
| 12 | 20% | 608.76 |
| 13 | Staff | (staff price) |
| 14 | Stock count | 14 |

---

## Notes
- Tests use **Page Object Model (POM)** pattern for maintainability
- All locators use flexible selectors to handle minor UI changes
- Observational tests log results without hard-failing (for feature discovery)
- Tests run **sequentially** (workers: 1) to avoid data conflicts
