# QA Care EMR - Prescription Testing Suite

Automated E2E Test Suite and Comprehensive Manual Test Case Specifications for **Amerck Care EMR** (`/admin/prescription`).

---

## 🔒 Credential Security & Protection

The test suite uses credentials provided for QA testing:
- **User:** `Janitha01234`
- **Password:** `Janitha6868@`

### Protection Rules Applied:
1. **Never Hardcoded in Tests:** Credentials are kept strictly in the local [`.env`](file:///.env) file.
2. **Git Ignored:** The [`.gitignore`](file:///.gitignore) file explicitly ignores `.env`, preventing credentials from ever being committed or leaked into version control.
3. **Template Provided:** Team members can copy [`.env.example`](file:///.env.example) to `.env` with their own accounts.
4. **CI/CD Safe:** In CI/CD pipelines, credentials should be injected via environment secrets (`QA_CARE_USERNAME`, `QA_CARE_PASSWORD`).

---

## 📂 Project Structure

```
c:\Users\LENOVO\Desktop\prescription\
├── .env                          # Protected credentials (ignored by git)
├── .env.example                  # Safe credential template
├── .gitignore                    # Git ignore file protecting .env & artifacts
├── PRESCRIPTION_TEST_CASES.md    # Module-level comprehensive test cases
├── PRESCRIPTION_TEST_CASES.csv   # Module-level test cases spreadsheet
├── SETTINGS_TEST_CASES.md        # Settings & Admin Configuration test specifications (85 TCs)
├── SETTINGS_TEST_CASES.csv       # Settings & Admin Configuration spreadsheet format (85 TCs)
├── DIAGNOSIS_TEST_CASES.md       # Diagnosis Directory comprehensive test case specifications (34 TCs)
├── DIAGNOSIS_TEST_CASES.csv      # Diagnosis Directory spreadsheet format
├── TELEMEDICINE_TEST_CASES.md    # Telemedicine & Virtual Consultations test specifications (34 TCs)
├── TELEMEDICINE_TEST_CASES.csv   # Telemedicine & Virtual Consultations spreadsheet format
├── REPORT_REVIEWS_TEST_CASES.md  # Telemedicine Report Reviews test specifications (34 TCs)
├── REPORT_REVIEWS_TEST_CASES.csv # Telemedicine Report Reviews spreadsheet format
├── FUNCTION_TEST_CASES.md        # Function-by-function categorized test case specification (61 TCs)
├── FUNCTION_TEST_CASES.csv       # Function-by-function spreadsheet format
├── package.json                  # NPM test scripts and dependencies
├── playwright.config.js          # Playwright test runner configuration
├── pages/
│   ├── AdmissionsPage.js         # Page Object for /admin/admissions
│   ├── DiagnosisPage.js          # Page Object for /admin/diagnosis
│   ├── DocumentsPage.js          # Page Object for /admin/letters
│   ├── DrugCabinetPage.js        # Page Object for /admin/drugs
│   ├── InvestigationsPage.js     # Page Object for /admin/investigations
│   ├── LoginPage.js              # Page Object for /login
│   ├── PatientsPage.js           # Page Object for /admin/patients
│   ├── PrescriptionPage.js       # Page Object for /admin/prescription
│   ├── ReportReviewsPage.js      # Page Object for /admin/telemedicine-reports & patient reviews
│   ├── ReportTemplatesPage.js    # Page Object for /admin/report-templates
│   ├── SettingsPage.js           # Page Object for /admin/settings & sub-modules
│   └── TelemedicinePage.js       # Page Object for /admin/telemedicine & /admin/telemedicine-reports
└── tests/
    ├── admissions.spec.js        # Admissions E2E test scenarios
    ├── auth.setup.js             # Global login & session preservation
    ├── auth.spec.js              # Authentication test scenarios
    ├── diagnosis.spec.js         # Diagnosis Directory E2E & CRUD test suite (20 TCs)
    ├── documents.spec.js         # Medical Letters & Documents test scenarios
    ├── drug_cabinet.spec.js      # Drug Cabinet test scenarios
    ├── full_prescription.spec.js # Full prescription lifecycle & modals
    ├── functions.spec.js         # Function-by-function automated test suite
    ├── investigations.spec.js    # Investigations directory test scenarios
    ├── medication.spec.js        # Prescribed medicines test scenarios
    ├── patient_flow.spec.js      # Patient search & flow test scenarios
    ├── prescription.spec.js      # Core Prescription E2E test scenarios
    ├── report_reviews.spec.js    # Report Reviews E2E & workflow suite (14 TCs)
    ├── report_templates.spec.js  # Report templates test scenarios
    ├── settings.spec.js          # Settings & Admin Configuration E2E suite (37 TCs)
    └── telemedicine.spec.js      # Telemedicine Kanban & Reports E2E suite (14 TCs)
```

---

## 📋 Test Case Artifacts

- **Settings Module Test Specification:** [SETTINGS_TEST_CASES.md](file:///c:/Users/LENOVO/Desktop/prescription/SETTINGS_TEST_CASES.md)
  - 85 exhaustive test cases covering all 10 tasks: Settings Hub, Organizations, Users Directory, RBAC Roles Matrix & Creation, Bed & Ward Management, Consent Form Dynamic Token Templates, Multi-Tenancy Isolation, Global Navigation, Security/RBAC Guard, and Performance Resilience.
- **Settings Module CSV Export:** [SETTINGS_TEST_CASES.csv](file:///c:/Users/LENOVO/Desktop/prescription/SETTINGS_TEST_CASES.csv)
  - Complete 85 test cases ready for import into Jira (Xray / Zephyr), TestRail, or Microsoft Excel.
- **Report Reviews Test Specification:** [REPORT_REVIEWS_TEST_CASES.md](file:///c:/Users/LENOVO/Desktop/prescription/REPORT_REVIEWS_TEST_CASES.md)
  - 34 comprehensive test cases covering Directory Table, Universal NIC/Mobile Search, Validation, File Attachments, Review Dispatch, and Cross-Navigation.
- **Report Reviews CSV Export:** [REPORT_REVIEWS_TEST_CASES.csv](file:///c:/Users/LENOVO/Desktop/prescription/REPORT_REVIEWS_TEST_CASES.csv)
  - Ready for import into Jira (Xray / Zephyr), TestRail, or Microsoft Excel.
- **Telemedicine Module Test Specification:** [TELEMEDICINE_TEST_CASES.md](file:///c:/Users/LENOVO/Desktop/prescription/TELEMEDICINE_TEST_CASES.md)
  - 34 comprehensive test cases covering Kanban 5-Stage Consultations, Provider Online/Offline Status, Audio Notifications, Flatpickr Date Filtering, Report Reviews, and EHR Integration.
- **Telemedicine Module CSV Export:** [TELEMEDICINE_TEST_CASES.csv](file:///c:/Users/LENOVO/Desktop/prescription/TELEMEDICINE_TEST_CASES.csv)
  - Ready for import into Jira (Xray / Zephyr), TestRail, or Microsoft Excel.
- **Diagnosis Module Test Specification:** [DIAGNOSIS_TEST_CASES.md](file:///c:/Users/LENOVO/Desktop/prescription/DIAGNOSIS_TEST_CASES.md)
  - 34 comprehensive test cases covering Page Init, Directory Search, Custom CRUD, Global Reference Protection, Pagination, and Cross-Navigation.
- **Diagnosis Module CSV Export:** [DIAGNOSIS_TEST_CASES.csv](file:///c:/Users/LENOVO/Desktop/prescription/DIAGNOSIS_TEST_CASES.csv)
  - Ready for import into Jira (Xray / Zephyr), TestRail, or Microsoft Excel.
- **Function-by-Function Test Specification:** [FUNCTION_TEST_CASES.md](file:///c:/Users/LENOVO/Desktop/prescription/FUNCTION_TEST_CASES.md)
  - 61 test cases categorized across all methods in `LoginPage` and `PrescriptionPage`.
  - Covers Functional, Negative, Boundary, UI, and Usability scenarios.
- **Function-by-Function CSV Export:** [FUNCTION_TEST_CASES.csv](file:///c:/Users/LENOVO/Desktop/prescription/FUNCTION_TEST_CASES.csv)
  - Importable format for Jira, TestRail, and Excel.
- **Detailed Module Specification:** [PRESCRIPTION_TEST_CASES.md](file:///c:/Users/LENOVO/Desktop/prescription/PRESCRIPTION_TEST_CASES.md)
  - 45+ detailed test cases organized into clinical modules.
- **Importable Module Spreadsheet:** [PRESCRIPTION_TEST_CASES.csv](file:///c:/Users/LENOVO/Desktop/prescription/PRESCRIPTION_TEST_CASES.csv)
  - Ready for import into Jira (Xray / Zephyr), TestRail, or Microsoft Excel.

---

## 🚀 How to Run Automated Tests

### 1. Install Dependencies
Run in your terminal:
```bash
npm install
```

### 2. Install Playwright Browsers (Chromium)
```bash
npx playwright install chromium
```

### 3. Run Automated Tests
```bash
# Run headless tests
npm test

# Run with interactive Playwright UI
npm run test:ui

# Run with visible browser window
npm run test:headed

# Open HTML execution report
npm run test:report
```
