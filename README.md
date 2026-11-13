# AMERCK CARE - EMR Admission Wizard Test Automation Suite

Enterprise-grade Playwright & Node.js test automation framework targeting the **live AMERCK CARE QA Environment** ([https://qa_care.amerck.com](https://qa_care.amerck.com)).

---

## 🔒 Security & Credential Protection

- Real credentials are saved exclusively in `.env` (which is excluded from source control via `.gitignore`).
- Authenticated storage states are cached in `.auth/` (also excluded via `.gitignore`).
- `.env.example` provides a sanitized template without exposing sensitive values.

---

## 📁 Repository Structure

```
c:/Users/LENOVO/Desktop/JPURA/
├── .env                             # Real QA credentials (Protected & Gitignored)
├── .env.example                     # Sanitized credentials template
├── .gitignore                       # Ignores .env, .auth/, test-results/, reports
├── docs/
│   ├── EMR-66_TEST_CASES.md         # Local Patient Search & Admission Redirection Specification
│   ├── EMR-75_TEST_CASES.md         # Past Medical History (Step 3) Specification
│   ├── EMR-78_TEST_CASES.md         # Investigation Tab & Multi-Parameter Matrix (Step 2) Specification
│   ├── EMR-134_TEST_CASES.md        # Medication Taper & Sub-Row Hierarchy Management Specification
│   ├── STEP8_DRUG_HISTORY_TEST_CASES.md # Drug History (Step 8) Specification
│   └── TEST_CASES_SPECIFICATION.md  # Combined QA Test Case Specification Matrix
├── pages/
│   ├── BasePage.js                  # Base page abstraction with wait & navigation helpers
│   ├── LoginPage.js                 # POM for https://qa_care.amerck.com/login
│   ├── AdmissionInvestigationTemplatePage.js # POM for Template Management (/admin/admission-investigations)
│   ├── InvestigationPage.js         # POM for Step 2: Investigation & Multi-Parameter Matrix
│   ├── PastMedicalHistoryPage.js    # POM for Step 3: PMH (Diabetes, CKD, COVID-19, Modal)
│   ├── DrugHistoryPage.js           # POM for Step 8: Drug History & PrescriptionPad
│   ├── PrescriptionPadPage.js       # POM for Care/OPD/Presets regression validation
│   └── MedicationTaperPage.js       # POM for EMR-134 Medication Taper & Sub-Rows
├── tests/
│   ├── live-qa-care.spec.js         # Live authentication & dashboard redirection tests
│   ├── admission-patient-search.spec.js # EMR-66 Local patient search & redirection tests
│   ├── investigation-template-and-inputs.spec.js # EMR-78 Template Management & Wizard Inputs (T001-T052)
│   ├── investigation-template-management.spec.js # EMR-78 Template Management (T003-T037)
│   ├── investigation-step2.spec.js  # EMR-78 Step 2 Investigation Matrix & Dates (T038-T048)
│   ├── past-medical-history.spec.js # EMR-75 Live Step 3: Past Medical History test cases
│   ├── drug-history-step8-integration.spec.js # Step 8 Drug History integration test cases
│   ├── regression-views.spec.js     # Zero-regression tests (Care, OPD, Presets)
│   └── emr-134-medication-taper.spec.js # EMR-134 Medication Taper tests (MT_TC_001-030)
├── package.json
└── playwright.config.js
```

---

## 🚀 Running the Tests Against Live QA

### 1. Execute Live Login Test
```bash
npx playwright test tests/live-qa-care.spec.js
```

### 2. Execute EMR-66: Local Patient Search & Admission Redirection
```bash
npx playwright test tests/admission-patient-search.spec.js
```

### 3. Execute EMR-78: Admission Investigation Suites
```bash
# Template Management Suite (T003 - T037)
npx playwright test tests/investigation-template-management.spec.js

# Step 2 Investigation Matrix Suite (T038 - T048, Blood Group, Date Columns)
npx playwright test tests/investigation-step2.spec.js

# Run all EMR-78 tests together
npx playwright test investigation
```

### 4. Execute Step 3 Past Medical History Tests
```bash
npx playwright test tests/past-medical-history.spec.js
```

### 5. Execute Step 8 Drug History Integration Tests
```bash
npx playwright test tests/drug-history-step8-integration.spec.js
```

### 6. Execute Regression Tests (Care View, OPD, Presets)
```bash
npx playwright test tests/regression-views.spec.js
```

### 7. Interactive Headed Mode & UI Runner
```bash
# Run with browser window visible
npx playwright test --headed

# Launch interactive UI mode
npx playwright test --ui

# Open HTML test execution report
npx playwright show-report
```

---

## 🧪 Offline Unit Tests for Page Objects (`tests-unit/`)

Every function in `pages/*.js` (plus `isTokenValid` in `global-setup.js`) has unit tests that run against
mocked HTML fixtures served via `page.route()`. They need no credentials, no network and no QA environment.

```bash
npm run test:unit          # run all 112 unit tests
npm run test:unit:report   # open the HTML report (playwright-report-unit/)
```

| Spec file | Covers |
|---|---|
| `BasePage.spec.js` | `navigate`, `waitForReady`, `getText`, `ensureAuthenticated` |
| `LoginPage.spec.js` | `goto`, `login`, `isSignInEnabled` |
| `AdmissionInvestigationTemplatePage.spec.js` | `goto`, `openCreateModal`, `createTemplate`, `getTemplateRow`, `isTemplateListed`, `deleteTemplate`, `copyTemplate` |
| `InvestigationPage.spec.js` | `goto` (draft & admit flows), blood group, date columns, parameter matrix, step navigation |
| `PastMedicalHistoryPage.spec.js` | `goto`, Diabetes, CKD, COVID-19 & vaccination modal |
| `DrugHistoryPage.spec.js` | `goto`, condition-label modal, badges |
| `MedicationTaperPage.spec.js` | Preferences toggle, Care View, reset, taper sub-rows, presets |
| `PrescriptionPadPage.spec.js` | Care/OPD/Presets navigation, `verifyConditionLabelsNotRendered` |
| `global-setup.spec.js` | `isTokenValid` (expiry, 15-min buffer, origin match, corrupt files) |

The unit suite uses `playwright.unit.config.js` and is not picked up by the live `npm test` run.
