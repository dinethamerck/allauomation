# Amerck Care EMR - Function-by-Function Test Case Specification

**Application Under Test:** Amerck Care EMR (`https://qa_care.amerck.com`)  
**Target Modules:** `LoginPage` (`/login`) & `PrescriptionPage` (`/admin/prescription`)  
**Specification Version:** 1.0  
**Test Framework:** Playwright (Node.js)  
**Classification:** Categorized Function-by-Function Test Suite

---

## Table of Contents
1. [LoginPage Functions](#1-loginpage-functions)
   - [1.1 constructor(page)](#11-loginpageconstructorpage)
   - [1.2 goto()](#12-loginpagegoto)
   - [1.3 login(username, password)](#13-loginpageloginusername-password)
   - [1.4 isPasswordMasked()](#14-loginpageispasswordmasked)
   - [1.5 togglePasswordVisibility()](#15-loginpagetogglepasswordvisibility)
2. [PrescriptionPage Functions](#2-prescriptionpage-functions)
   - [2.1 constructor(page)](#21-prescriptionpageconstructorpage)
   - [2.2 goto(params)](#22-prescriptionpagegotoparams--)
   - [2.3 searchPatient(query)](#23-prescriptionpagesearchpatientquery)
   - [2.4 selectFirstPatient()](#24-prescriptionpageselectfirstpatient)
   - [2.5 searchAndSelectPatient(query)](#25-prescriptionpagesearchandselectpatientquery)
   - [2.6 waitForSaveIndicator(status, timeout)](#26-prescriptionpagewaitforsaveindicatorstatus-timeout)
   - [2.7 triggerPrintShortcut()](#27-prescriptionpagetriggerprintshortcut)
   - [2.8 triggerSaveShortcut()](#28-prescriptionpagetriggersaveshortcut)
   - [2.9 fillVitals(vitals)](#29-prescriptionpagefillvitalsvitals)
   - [2.10 fillPresentingProblems(problems)](#210-prescriptionpagefillpresentingproblemsproblems)
   - [2.11 addDiagnosis(diagnosis)](#211-prescriptionpageadddiagnosisdiagnosis)
   - [2.12 addNewMedicationRow()](#212-prescriptionpageaddnewmedicationrow)
   - [2.13 fillMedicationRow(med, index)](#213-prescriptionpagefillmedicationrowmed-index--0)
   - [2.14 addMedication(med)](#214-prescriptionpageaddmedicationmed)
   - [2.15 clickSave()](#215-prescriptionpageclicksave)
   - [2.16 clickPrint()](#216-prescriptionpageclickprint)
   - [2.17 openPrescriptionModal()](#217-prescriptionpageopenprescriptionmodal)
   - [2.18 closePrescriptionModal()](#218-prescriptionpagecloseprescriptionmodal)
   - [2.19 clickEndConsultation()](#219-prescriptionpageclickendconsultation)
   - [2.20 confirmEndConsultation()](#220-prescriptionpageconfirmendconsultation)
   - [2.21 openAddResultsModal()](#221-prescriptionpageopenaddresultsmodal)
   - [2.22 openAddReportsModal()](#222-prescriptionpageopenaddreportsmodal)
3. [Summary Matrix & Statistics](#3-summary-matrix--statistics)

---

# 1. LoginPage Functions

## 1.1 `LoginPage.constructor(page)`
*Initializes all locators for the authentication page.*

| Test Case ID | Test Scenario | Type | Pre-conditions | Test Steps | Test Data | Expected Result | Priority |
|---|---|---|---|---|---|---|---|
| **TC-FN-AUTH-INIT-001** | Verify all core locators are initialized | Unit / Sanity | Page object instantiated | 1. Instantiate `LoginPage(page)`<br>2. Check locator properties | `page` instance | `usernameInput`, `passwordInput`, `submitButton`, `passwordToggle` locators exist and are defined. | Critical |
| **TC-FN-AUTH-INIT-002** | Verify locator selector mappings match DOM elements | UI / Sanity | User navigates to `/login` | 1. Check selector matching for inputs and buttons | `/login` page loaded | All mapped selectors resolve to visible DOM nodes without throwing locator resolution errors. | High |

---

## 1.2 `LoginPage.goto()`
*Navigates to `/login` with `domcontentloaded` state.*

| Test Case ID | Test Scenario | Type | Pre-conditions | Test Steps | Test Data | Expected Result | Priority |
|---|---|---|---|---|---|---|---|
| **TC-FN-AUTH-GOTO-001** | Successful navigation to Login page | Functional / Smoke | Browser opened | 1. Call `await loginPage.goto()`<br>2. Check URL and DOM load state | Target: `/login` | Page URL contains `/login`. `domcontentloaded` is reached, and Sign In form is displayed. | Critical |
| **TC-FN-AUTH-GOTO-002** | Navigation with active session cookies | Security / Functional | User already authenticated | 1. Authenticate user<br>2. Call `await loginPage.goto()` | Active auth token | System redirects authenticated user to `/admin/prescription` or dashboard, preventing redundant login. | High |
| **TC-FN-AUTH-GOTO-003** | Offline network resilience during navigation | Negative | Network offline | 1. Disconnect network<br>2. Call `await loginPage.goto()` | Offline mode | Throws clear network navigation error or displays browser offline fallback. | Medium |

---

## 1.3 `LoginPage.login(username, password)`
*Enters provider credentials, submits form, and waits for post-login load state.*

| Test Case ID | Test Scenario | Type | Pre-conditions | Test Steps | Test Data | Expected Result | Priority |
|---|---|---|---|---|---|---|---|
| **TC-FN-AUTH-LOGIN-001** | Valid provider login with correct credentials | Functional / Critical | User on `/login` | 1. Call `await loginPage.login(validUser, validPass)`<br>2. Check URL change | User: `Janitha01234`<br>Pass: `Janitha6868@` | Successful authentication; redirected away from `/login`; session tokens/cookies set in browser context. | Critical |
| **TC-FN-AUTH-LOGIN-002** | Invalid password handling | Negative | User on `/login` | 1. Call `await loginPage.login(validUser, wrongPass)`<br>2. Verify error message | User: `Janitha01234`<br>Pass: `WrongPassword123!` | Authentication fails; remains on `/login`; error toast/alert is displayed. | High |
| **TC-FN-AUTH-LOGIN-003** | Non-existent username | Negative | User on `/login` | 1. Call `await loginPage.login(fakeUser, password)`<br>2. Verify error handling | User: `GhostUser999`<br>Pass: `AnyPass123` | System denies access with "User not found" or "Invalid credentials" error message. | High |
| **TC-FN-AUTH-LOGIN-004** | Empty username and empty password submission | Validation / Boundary | User on `/login` | 1. Call `await loginPage.login('', '')`<br>2. Check form state | Empty strings `""`, `""` | HTML5 validation or form error prevents submission; fields highlighted as required. | Medium |
| **TC-FN-AUTH-LOGIN-005** | SQL injection and script string sanitization | Security | User on `/login` | 1. Enter `' OR '1'='1` in username<br>2. Enter `<script>alert(1)</script>` in password<br>3. Submit | Payload strings | Injection payload safely escaped; authentication rejected without server errors or XSS execution. | High |

---

## 1.4 `LoginPage.isPasswordMasked()`
*Checks if the password input element has attribute `type="password"`.*

| Test Case ID | Test Scenario | Type | Pre-conditions | Test Steps | Test Data | Expected Result | Priority |
|---|---|---|---|---|---|---|---|
| **TC-FN-AUTH-MASK-001** | Verify default password state is masked | Security / UI | User on `/login` | 1. Enter password text<br>2. Call `const masked = await loginPage.isPasswordMasked()` | Password: `Janitha6868@` | Returns `true`; input attribute `type` strictly equals `"password"`. | High |
| **TC-FN-AUTH-MASK-002** | Verify return value after unmasking | Functional / UI | Password unmasked via toggle | 1. Toggle visibility<br>2. Call `await loginPage.isPasswordMasked()` | Unmasked state | Returns `false` because input attribute `type` equals `"text"`. | Medium |

---

## 1.5 `LoginPage.togglePasswordVisibility()`
*Clicks the eye icon toggle button to switch between masked and plaintext password display.*

| Test Case ID | Test Scenario | Type | Pre-conditions | Test Steps | Test Data | Expected Result | Priority |
|---|---|---|---|---|---|---|---|
| **TC-FN-AUTH-TOGGLE-001** | Toggle from masked to unmasked plaintext | Functional / UI | Password entered, masked | 1. Call `await loginPage.togglePasswordVisibility()`<br>2. Check `type` attribute | Password string | Input `type` switches from `"password"` to `"text"`. Plain text becomes visible to the user. | High |
| **TC-FN-AUTH-TOGGLE-002** | Toggle back from unmasked to masked | Functional / UI | Password currently visible | 1. Call `await loginPage.togglePasswordVisibility()` again<br>2. Check `type` attribute | Plaintext state | Input `type` switches back from `"text"` to `"password"`. Characters re-masked with dots/asterisks. | High |
| **TC-FN-AUTH-TOGGLE-003** | Rapid double-click toggle stability | Edge / UI | Password entered | 1. Rapidly click toggle icon twice | Password string | Input returns cleanly to initial masked state without UI glitching or desync. | Low |

---

# 2. PrescriptionPage Functions

## 2.1 `PrescriptionPage.constructor(page)`
*Initializes all selectors for clinical inputs, action bar buttons, patient cards, dialogs, and modals.*

| Test Case ID | Test Scenario | Type | Pre-conditions | Test Steps | Test Data | Expected Result | Priority |
|---|---|---|---|---|---|---|---|
| **TC-FN-RX-INIT-001** | Verify all core PrescriptionPage locators are initialized | Unit / Sanity | Page object instantiated | 1. Instantiate `PrescriptionPage(page)`<br>2. Check locators existence | `page` instance | Locators (`searchInput`, `todayTab`, `storyTab`, `noPatientCard`, `dateInput`, `systolicBpInput`, `bmiInput`, `addMedicationButton`, `saveButton`, `prescriptionModal`, `addResultsDialog`, `selectReportDialog`) exist and are defined. | Critical |
| **TC-FN-RX-INIT-002** | Validate action bar locator selectors integrity | UI / Sanity | Prescription editor loaded | 1. Verify `saveButton`, `printButton`, `endConsultationButton`, `sendToPharmacyButton` | DOM loaded | All action bar locators map correctly to visible interactive elements in DOM. | High |

---

## 2.2 `PrescriptionPage.goto(params = '')`
*Navigates to `/admin/prescription` with optional query parameters and smart wait conditions.*

| Test Case ID | Test Scenario | Type | Pre-conditions | Test Steps | Test Data | Expected Result | Priority |
|---|---|---|---|---|---|---|---|
| **TC-FN-RX-GOTO-001** | Default navigation without query parameters | Functional / Smoke | User logged in | 1. Call `await rxPage.goto()`<br>2. Inspect loaded URL and page state | `params = ''` | Navigates to `/admin/prescription`. Empty state "No patient selected" is displayed. | Critical |
| **TC-FN-RX-GOTO-002** | Navigation with patient ID query param (`pid`) | Functional / Smoke | Patient `333566` exists | 1. Call `await rxPage.goto('pid=333566')`<br>2. Wait for `todayTab` visibility | `params = 'pid=333566'` | Navigates to `/admin/prescription?pid=333566`. Smart-wait waits for `todayTab`. Clinical consultation inputs are unlocked. | Critical |
| **TC-FN-RX-GOTO-003** | Navigation with existing consultation ID (`id` and `pid`) | Functional | Saved prescription exists | 1. Call `await rxPage.goto('id=1024&pid=333566')`<br>2. Check consultation state | `id=1024&pid=333566` | Loads specific consultation draft or finalized record with all previously saved data pre-populated. | High |
| **TC-FN-RX-GOTO-004** | Navigation with invalid/non-existent patient ID | Negative | Logged in | 1. Call `await rxPage.goto('pid=999999999')`<br>2. Verify system response | `pid=999999999` | System shows error toast "Patient not found" or redirects to empty state without crashing. | Medium |

---

## 2.3 `PrescriptionPage.searchPatient(query)`
*Clicks search input, intercepts `/patients/getPatients` network call, and types query.*

| Test Case ID | Test Scenario | Type | Pre-conditions | Test Steps | Test Data | Expected Result | Priority |
|---|---|---|---|---|---|---|---|
| **TC-FN-RX-SEARCH-001** | Search patient by valid full or partial name | Functional | On `/admin/prescription` | 1. Call `await rxPage.searchPatient('janitha0124')`<br>2. Verify response intercept | Query: `'janitha0124'` | Network call `/patients/getPatients` returns 200 OK. Search input retains value and cmdk dropdown populates results. | Critical |
| **TC-FN-RX-SEARCH-002** | Search patient by registered mobile number | Functional | On `/admin/prescription` | 1. Call `await rxPage.searchPatient('0741222870')`<br>2. Verify autocomplete items | Query: `'0741222870'` | Autocomplete displays patient matching mobile number `0741222870`. | High |
| **TC-FN-RX-SEARCH-003** | Search patient with non-existent query | Negative | On `/admin/prescription` | 1. Call `await rxPage.searchPatient('unknown_patient_9999')`<br>2. Inspect dropdown | Query: `'unknown_patient_9999'` | Dropdown displays "No results found" or empty list. No unhandled errors thrown. | Medium |
| **TC-FN-RX-SEARCH-004** | Search with special characters and leading/trailing spaces | Boundary / Edge | On `/admin/prescription` | 1. Call `await rxPage.searchPatient('  janitha  ')`<br>2. Check search behavior | Query: `'  janitha  '` | Search trims whitespace and returns relevant matching records smoothly. | Low |

---

## 2.4 `PrescriptionPage.selectFirstPatient()`
*Waits for the first suggestion in search results, extracts patient text, and clicks to select.*

| Test Case ID | Test Scenario | Type | Pre-conditions | Test Steps | Test Data | Expected Result | Priority |
|---|---|---|---|---|---|---|---|
| **TC-FN-RX-SELFIRST-001** | Successfully select first matching patient from dropdown | Functional | Search results open | 1. Call `const text = await rxPage.selectFirstPatient()`<br>2. Check returned string | 1+ matching items | Returns non-empty patient label (e.g. `'janitha0124 (P#0000333566)'`). Clicks item and triggers patient selection. | Critical |
| **TC-FN-RX-SELFIRST-002** | Selection when search results take time to load | Reliability | Slow network simulation | 1. Trigger search with artificial latency<br>2. Call `await rxPage.selectFirstPatient()` | 8s timeout cushion | Function waits up to 8000ms for item visibility before clicking without premature failure. | High |

---

## 2.5 `PrescriptionPage.searchAndSelectPatient(query)`
*End-to-end composite workflow: searches patient, clicks first result, and waits for URL `pid`.*

| Test Case ID | Test Scenario | Type | Pre-conditions | Test Steps | Test Data | Expected Result | Priority |
|---|---|---|---|---|---|---|---|
| **TC-FN-RX-SEARCHSEL-001** | Full search-and-select flow by patient name | Functional / E2E | On `/admin/prescription` | 1. Call `const pt = await rxPage.searchAndSelectPatient('janitha0124')`<br>2. Check URL | Query: `'janitha0124'` | Patient selected; URL transitions to include `?pid=333566`; returns patient name string; unlocks clinical editor. | Critical |
| **TC-FN-RX-SEARCHSEL-002** | Full search-and-select flow by patient mobile | Functional / E2E | On `/admin/prescription` | 1. Call `await rxPage.searchAndSelectPatient('0741222870')`<br>2. Check URL | Query: `'0741222870'` | Matches mobile number; navigates to prescription URL `?pid=333566` within 10000ms. | High |

---

## 2.6 `PrescriptionPage.waitForSaveIndicator(status, timeout)`
*Monitors the `#save-indicator` DOM node until it contains the expected status text.*

| Test Case ID | Test Scenario | Type | Pre-conditions | Test Steps | Test Data | Expected Result | Priority |
|---|---|---|---|---|---|---|---|
| **TC-FN-RX-WAITIND-001** | Wait for "All changes saved" status | Functional | Changes made to draft | 1. Edit a field<br>2. Call `await rxPage.waitForSaveIndicator('All changes saved')` | Status: `'All changes saved'` | Resolves successfully once `#save-indicator` updates to "All changes saved". | High |
| **TC-FN-RX-WAITIND-002** | Wait for "Auto-Saving..." in-progress status | Functional | Typing in form | 1. Type in complaints<br>2. Call `await rxPage.waitForSaveIndicator('Auto-Saving...', 5000)` | Status: `'Auto-Saving...'` | Detects transition to auto-saving spinner state immediately after blur/debounce. | Medium |
| **TC-FN-RX-WAITIND-003** | Timeout handling when status does not occur | Boundary / Negative | No changes triggered | 1. Call `await rxPage.waitForSaveIndicator('NonExistentStatus', 2000)` | Expected failure | Rejects/throws timeout error as expected after specified timeout period expires. | Low |

---

## 2.7 `PrescriptionPage.triggerPrintShortcut()`
*Emulates `Control+p` keyboard shortcut.*

| Test Case ID | Test Scenario | Type | Pre-conditions | Test Steps | Test Data | Expected Result | Priority |
|---|---|---|---|---|---|---|---|
| **TC-FN-RX-PRNTSHORT-001** | Trigger Ctrl+P shortcut on prescription editor | Usability / Functional | Prescription loaded | 1. Call `await rxPage.triggerPrintShortcut()`<br>2. Check preview modal | Keys: `Control+p` | Native browser print dialog is intercepted; custom Prescription preview modal opens. | High |
| **TC-FN-RX-PRNTSHORT-002** | Trigger Ctrl+P shortcut when editor is focused on input | Edge / Usability | Focused in text area | 1. Focus `presentingProblemsInput`<br>2. Call `await rxPage.triggerPrintShortcut()` | Focused input | Shortcut still triggers prescription preview modal without appending control characters into text field. | Medium |

---

## 2.8 `PrescriptionPage.triggerSaveShortcut()`
*Emulates `Control+s` keyboard shortcut.*

| Test Case ID | Test Scenario | Type | Pre-conditions | Test Steps | Test Data | Expected Result | Priority |
|---|---|---|---|---|---|---|---|
| **TC-FN-RX-SAVESHORT-001** | Trigger Ctrl+S shortcut to save consultation | Usability / Functional | Prescription draft modified | 1. Call `await rxPage.triggerSaveShortcut()`<br>2. Check consultation state | Keys: `Control+s` | Native browser "Save Page As" dialog suppressed; consultation draft save is triggered. | High |
| **TC-FN-RX-SAVESHORT-002** | Multiple consecutive Ctrl+S presses | Edge / Stress | Prescription loaded | 1. Press `Control+s` 3 times rapidly | Multiple keypresses | System debounces calls gracefully without creating duplicate prescription IDs or corrupted drafts. | Medium |

---

## 2.9 `PrescriptionPage.fillVitals(vitals)`
*Populates all patient clinical vitals: BP, BPM, Weight, Height, Temp, RR, Lungs, CVS.*

| Test Case ID | Test Scenario | Type | Pre-conditions | Test Steps | Test Data | Expected Result | Priority |
|---|---|---|---|---|---|---|---|
| **TC-FN-RX-VITALS-001** | Fill normal complete vitals profile | Functional | Prescription open (`pid=333566`) | 1. Call `await rxPage.fillVitals({ systolic: '120', diastolic: '80', bpm: '72', temp: '98.6', rr: '18', lungs: 'Clear', cvs: 'Normal' })`<br>2. Verify field values | Full vitals object | All input fields are populated with exact values and retain them upon verification. | Critical |
| **TC-FN-RX-VITALS-002** | Automatic BMI calculation upon filling weight and height | Clinical Accuracy / Functional | Prescription open | 1. Call `await rxPage.fillVitals({ weight: '70', height: '1.75' })`<br>2. Check `bmiInput` | Weight: `70`, Height: `1.75` | System calculates BMI as `22.86` (`70 / 1.75²`). BMI input remains readonly and cannot be edited manually. | Critical |
| **TC-FN-RX-VITALS-003** | Partial vitals entry (only BP and BPM) | Functional / Boundary | Prescription open | 1. Call `await rxPage.fillVitals({ systolic: '130', diastolic: '85', bpm: '80' })`<br>2. Check other fields | Partial vitals | Only specified fields are updated; unspecified fields remain untouched or retain previous entries. | High |
| **TC-FN-RX-VITALS-004** | Extreme numerical vitals validation | Boundary / Negative | Prescription open | 1. Call `await rxPage.fillVitals({ systolic: '300', bpm: '250', temp: '110' })`<br>2. Check field display | Extreme values | Inputs accept numbers; UI highlights warning thresholds if configured or saves values as entered. | Medium |

---

## 2.10 `PrescriptionPage.fillPresentingProblems(problems)`
*Fills chief complaints / medical history textarea.*

| Test Case ID | Test Scenario | Type | Pre-conditions | Test Steps | Test Data | Expected Result | Priority |
|---|---|---|---|---|---|---|---|
| **TC-FN-RX-PROB-001** | Fill presenting complaints with standard clinical narrative | Functional | Prescription open | 1. Call `await rxPage.fillPresentingProblems('Fever and cough for 3 days')`<br>2. Assert value | Text: `'Fever and cough for 3 days'` | Textarea reflects the full string; input event registers with formik state. | High |
| **TC-FN-RX-PROB-002** | Fill multi-line detailed medical history | Functional / Boundary | Prescription open | 1. Enter multi-line string with line breaks and medical terms<br>2. Verify value | Multi-line formatted history | Text retains all newline characters and formatting without truncation. | Medium |
| **TC-FN-RX-PROB-003** | Clear presenting complaints field | Boundary | Complaints already filled | 1. Call `await rxPage.fillPresentingProblems('')`<br>2. Check value | Empty string `''` | Field is completely cleared; form state updates to empty. | Medium |

---

## 2.11 `PrescriptionPage.addDiagnosis(diagnosis)`
*Fills diagnosis input and commits diagnosis tag by pressing `Enter`.*

| Test Case ID | Test Scenario | Type | Pre-conditions | Test Steps | Test Data | Expected Result | Priority |
|---|---|---|---|---|---|---|---|
| **TC-FN-RX-DX-001** | Add single clinical diagnosis tag | Functional | Prescription open | 1. Call `await rxPage.addDiagnosis('Acute Pharyngitis')`<br>2. Check diagnosis input / chip | Diagnosis: `'Acute Pharyngitis'` | Diagnosis is entered and committed via `Enter`; diagnosis tag is rendered in UI chips. | High |
| **TC-FN-RX-DX-002** | Add multiple diagnoses sequentially | Functional | Prescription open | 1. Call `await rxPage.addDiagnosis('Hypertension')`<br>2. Call `await rxPage.addDiagnosis('Type 2 Diabetes')` | Two diagnoses | Both diagnoses are appended to the diagnosis list as separate tags. | High |
| **TC-FN-RX-DX-003** | Add duplicate diagnosis tag | Edge / UX | 'Hypertension' already exists | 1. Call `await rxPage.addDiagnosis('Hypertension')` again | Duplicate name | System deduplicates tag or ignores second addition gracefully without crashing. | Low |

---

## 2.12 `PrescriptionPage.addNewMedicationRow()`
*Clicks "Add Medication" button to dynamically append a new medication line.*

| Test Case ID | Test Scenario | Type | Pre-conditions | Test Steps | Test Data | Expected Result | Priority |
|---|---|---|---|---|---|---|---|
| **TC-FN-RX-ADDROW-001** | Click Add Medication and verify row count increments | Functional | Prescription open | 1. Check `genericNameInputs.count()`<br>2. Call `await rxPage.addNewMedicationRow()`<br>3. Check count | N/A | Medication row count increments by exactly 1. All new row inputs are visible and empty. | Critical |
| **TC-FN-RX-ADDROW-002** | Rapid successive row additions | Stress / Edge | Prescription open | 1. Call `addNewMedicationRow()` 4 times consecutively<br>2. Check total row count | 4 additions | 4 new medication rows are rendered with proper indices and unique field bindings. | Medium |

---

## 2.13 `PrescriptionPage.fillMedicationRow(med, index = 0)`
*Populates generic name, dosage, frequency, route, and duration at a specific row index.*

| Test Case ID | Test Scenario | Type | Pre-conditions | Test Steps | Test Data | Expected Result | Priority |
|---|---|---|---|---|---|---|---|
| **TC-FN-RX-FILLROW-001** | Fill first medication row (`index=0`) with complete drug info | Functional | Row 0 visible | 1. Call `await rxPage.fillMedicationRow({ generic: 'Paracetamol 500mg', dosage: '1 tab', frequency: 'TDS', route: 'Oral', duration: '5 days' }, 0)`<br>2. Verify all inputs | Full med object | Generic, dosage, frequency, route, and duration fields in row 0 match entered values. | Critical |
| **TC-FN-RX-FILLROW-002** | Fill second medication row (`index=1`) | Functional | Row 1 added and visible | 1. Call `await rxPage.fillMedicationRow({ generic: 'Omeprazole 20mg', dosage: '1 cap', frequency: 'OD', route: 'Oral', duration: '14 days' }, 1)` | Row index `1` | Row 1 fields are filled correctly without modifying row 0 values. | High |
| **TC-FN-RX-FILLROW-003** | Partial medication row fill (only generic and duration) | Boundary | Row visible | 1. Call `await rxPage.fillMedicationRow({ generic: 'Amoxicillin 500mg', duration: '7 days' }, 0)` | Partial med object | Only generic and duration inputs are filled; other fields retain their default/current states. | Medium |

---

## 2.14 `PrescriptionPage.addMedication(med)`
*Legacy / convenience helper that fills row 0 with medication data.*

| Test Case ID | Test Scenario | Type | Pre-conditions | Test Steps | Test Data | Expected Result | Priority |
|---|---|---|---|---|---|---|---|
| **TC-FN-RX-ADDMED-001** | Helper adds medication directly to primary row | Functional | Prescription open | 1. Call `await rxPage.addMedication({ generic: 'Cetirizine 10mg', dosage: '1 tab', frequency: 'Nocte', duration: '3 days' })`<br>2. Check row 0 | Med object | Primary row is populated with Cetirizine details; delegates properly to `fillMedicationRow(med, 0)`. | High |

---

## 2.15 `PrescriptionPage.clickSave()`
*Clicks the action bar "Save" button to commit consultation changes.*

| Test Case ID | Test Scenario | Type | Pre-conditions | Test Steps | Test Data | Expected Result | Priority |
|---|---|---|---|---|---|---|---|
| **TC-FN-RX-CLKSAVE-001** | Click Save button commits consultation draft | Functional | Prescription modified | 1. Call `await rxPage.clickSave()`<br>2. Verify response / page state | Target: `saveButton` | Save request is dispatched; consultation remains in valid draft state with assigned ID; URL retains `pid`. | Critical |
| **TC-FN-RX-CLKSAVE-002** | Click Save when button is momentarily disabled | Edge / UI | Save in progress | 1. Click Save<br>2. Attempt rapid second click | Rapid clicks | Second click is safely debounced; no duplicate consultation records created. | Medium |

---

## 2.16 `PrescriptionPage.clickPrint()`
*Clicks the action bar "Print" button.*

| Test Case ID | Test Scenario | Type | Pre-conditions | Test Steps | Test Data | Expected Result | Priority |
|---|---|---|---|---|---|---|---|
| **TC-FN-RX-CLKPRINT-001** | Click Print button launches prescription print preview | Functional | Saved prescription | 1. Call `await rxPage.clickPrint()`<br>2. Verify modal opening | Target: `printButton` | Print preview modal (`prescriptionModal`) opens, displaying the generated PDF preview. | High |

---

## 2.17 `PrescriptionPage.openPrescriptionModal()`
*Opens prescription preview modal via shortcut and waits for modal visibility.*

| Test Case ID | Test Scenario | Type | Pre-conditions | Test Steps | Test Data | Expected Result | Priority |
|---|---|---|---|---|---|---|---|
| **TC-FN-RX-OPENMODAL-001** | Open modal and verify visibility | Functional | Prescription open | 1. Call `await rxPage.openPrescriptionModal()`<br>2. Check `prescriptionModal.isVisible()` | Shortcut: `Ctrl+P` | Modal opens within 10000ms; title displays "Prescription"; controls (Close, Download, Print) are visible. | Critical |

---

## 2.18 `PrescriptionPage.closePrescriptionModal()`
*Clicks bottom Close button and waits for modal to hide.*

| Test Case ID | Test Scenario | Type | Pre-conditions | Test Steps | Test Data | Expected Result | Priority |
|---|---|---|---|---|---|---|---|
| **TC-FN-RX-CLSMODAL-001** | Close modal via bottom Close button | Functional / UI | Prescription modal open | 1. Call `await rxPage.closePrescriptionModal()`<br>2. Check modal visibility | Target: `modalCloseButton` | Modal hides within 5000ms; consultation editor behind it remains intact and active. | High |

---

## 2.19 `PrescriptionPage.clickEndConsultation()`
*Clicks "End Consultation" in action bar and waits for confirmation dialog.*

| Test Case ID | Test Scenario | Type | Pre-conditions | Test Steps | Test Data | Expected Result | Priority |
|---|---|---|---|---|---|---|---|
| **TC-FN-RX-ENDCONS-001** | Click End Consultation opens confirmation dialog | Functional | Consultation active | 1. Call `await rxPage.clickEndConsultation()`<br>2. Check `endConsultationDialog.isVisible()` | Target: `endConsultationButton` | "End Consultation" confirmation dialog appears; warning text and "Print & End Consultation" button are displayed. | Critical |

---

## 2.20 `PrescriptionPage.confirmEndConsultation()`
*Confirms end consultation, finalizes record, and waits for generated prescription modal.*

| Test Case ID | Test Scenario | Type | Pre-conditions | Test Steps | Test Data | Expected Result | Priority |
|---|---|---|---|---|---|---|---|
| **TC-FN-RX-CONFIRMEND-001** | Confirm End Consultation and verify generated modal | Functional / E2E | End consultation dialog open | 1. Call `await rxPage.confirmEndConsultation()`<br>2. Check URL and modal | Target: `printAndEndConsultationButton` | Consultation is finalized (`is_draft: false`); URL gets assigned `id=...`; `prescriptionModal` opens automatically. | Critical |

---

## 2.21 `PrescriptionPage.openAddResultsModal()`
*Clicks "+ Add Results" button and waits for "Add/Upload Test Results" dialog.*

| Test Case ID | Test Scenario | Type | Pre-conditions | Test Steps | Test Data | Expected Result | Priority |
|---|---|---|---|---|---|---|---|
| **TC-FN-RX-ADDRES-001** | Open Add Results dialog and verify interactive fields | Functional | Prescription open | 1. Call `await rxPage.openAddResultsModal()`<br>2. Check dialog elements | Target: `addResultsButton` | Dialog opens with title "Add/Upload Test Results"; test name, result, unit, normal range inputs, and upload button are visible. | High |

---

## 2.22 `PrescriptionPage.openAddReportsModal()`
*Clicks "+ Add Reports" button and waits for "Select Report" catalog dialog.*

| Test Case ID | Test Scenario | Type | Pre-conditions | Test Steps | Test Data | Expected Result | Priority |
|---|---|---|---|---|---|---|---|
| **TC-FN-RX-ADDREP-001** | Open Add Reports dialog and verify catalog view | Functional | Prescription open | 1. Call `await rxPage.openAddReportsModal()`<br>2. Check dialog elements | Target: `addReportsButton` | Dialog opens with title "Select Report"; search input and investigation report cards are displayed. | High |

---

# 3. Summary Matrix & Statistics

| Class | Function Name | Total Test Cases | Positive / Functional | Negative / Boundary | UI / Usability |
|---|---|:---:|:---:|:---:|:---:|
| **LoginPage** | `constructor(page)` | 2 | 1 | 0 | 1 |
| **LoginPage** | `goto()` | 3 | 1 | 1 | 1 |
| **LoginPage** | `login(username, password)` | 5 | 1 | 3 | 1 |
| **LoginPage** | `isPasswordMasked()` | 2 | 1 | 0 | 1 |
| **LoginPage** | `togglePasswordVisibility()` | 3 | 2 | 0 | 1 |
| **PrescriptionPage** | `constructor(page)` | 2 | 1 | 0 | 1 |
| **PrescriptionPage** | `goto(params)` | 4 | 3 | 1 | 0 |
| **PrescriptionPage** | `searchPatient(query)` | 4 | 2 | 1 | 1 |
| **PrescriptionPage** | `selectFirstPatient()` | 2 | 1 | 0 | 1 |
| **PrescriptionPage** | `searchAndSelectPatient(query)` | 2 | 2 | 0 | 0 |
| **PrescriptionPage** | `waitForSaveIndicator(status, timeout)` | 3 | 2 | 1 | 0 |
| **PrescriptionPage** | `triggerPrintShortcut()` | 2 | 1 | 0 | 1 |
| **PrescriptionPage** | `triggerSaveShortcut()` | 2 | 1 | 0 | 1 |
| **PrescriptionPage** | `fillVitals(vitals)` | 4 | 2 | 2 | 0 |
| **PrescriptionPage** | `fillPresentingProblems(problems)` | 3 | 2 | 1 | 0 |
| **PrescriptionPage** | `addDiagnosis(diagnosis)` | 3 | 2 | 1 | 0 |
| **PrescriptionPage** | `addNewMedicationRow()` | 2 | 1 | 1 | 0 |
| **PrescriptionPage** | `fillMedicationRow(med, index)` | 3 | 2 | 1 | 0 |
| **PrescriptionPage** | `addMedication(med)` | 1 | 1 | 0 | 0 |
| **PrescriptionPage** | `clickSave()` | 2 | 1 | 1 | 0 |
| **PrescriptionPage** | `clickPrint()` | 1 | 1 | 0 | 0 |
| **PrescriptionPage** | `openPrescriptionModal()` | 1 | 1 | 0 | 0 |
| **PrescriptionPage** | `closePrescriptionModal()` | 1 | 1 | 0 | 0 |
| **PrescriptionPage** | `clickEndConsultation()` | 1 | 1 | 0 | 0 |
| **PrescriptionPage** | `confirmEndConsultation()` | 1 | 1 | 0 | 0 |
| **PrescriptionPage** | `openAddResultsModal()` | 1 | 1 | 0 | 0 |
| **PrescriptionPage** | `openAddReportsModal()` | 1 | 1 | 0 | 0 |
| **Total** | **27 Functions** | **61 Test Cases** | **37 Functional** | **14 Negative/Boundary** | **10 UI/Usability** |
