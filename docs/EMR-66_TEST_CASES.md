# EMR-66: Local Patient Search & Admission Redirection
## QA Test Case Specification & Defect Verification Matrix

**Ticket Reference**: `EMR-66`  
**Module**: EMR → Admission Module  
**Feature / Defect**: Local Patient Search Redirection to Admission Form (Fix for Incorrect Patient Form Redirection)  
**Target Environment**: AMERCK CARE Live QA (https://qa_care.amerck.com)  
**Reference Existing Behavior**: Global Database patient search redirects to Admission Form  
**Defect Summary**: Searching and selecting a patient from the **Local Database** previously redirected to the **Patient Form** in the Patient Module (`/admin/patients/...`). Under EMR-66, the selected local patient is redirected to the **Admission Form** in the Admission Module (`/admin/admissions/...`).  
**Author**: Antigravity QA Automation  
**Automation Framework**: Playwright (Node.js)  

---

## 1. Traceability Matrix

| Requirement Ref | Test Focus Area | Test Case ID | Test Type | Priority | Automated |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **EMR66-REQ-01** | "Admit Patient" Trigger & Modal UI | TC-EMR66-01 | UI / Layout | P0 | Yes |
| **EMR66-REQ-01** | Search Query Input Validation | TC-EMR66-02 | Functional | P1 | Yes |
| **EMR66-REQ-02** | Search by National Identity Card (NIC) | TC-EMR66-03 | Search / Discovery | P0 | Yes |
| **EMR66-REQ-02** | Search by Mobile Phone Number | TC-EMR66-04 | Search / Discovery | P0 | Yes |
| **EMR66-REQ-02** | Search by Hospital ID / MRN | TC-EMR66-05 | Search / Discovery | P0 | Yes |
| **EMR66-REQ-03** | **Local Patient Selection Redirection (CORE FIX)** | **TC-EMR66-06** | **Functional / Route** | **P0 (Critical)** | **Yes** |
| **EMR66-REQ-03** | Local Patient Redirection Guard (Negative Test) | TC-EMR66-07 | Security / Routing | P0 | Yes |
| **EMR66-REQ-04** | Global Patient Selection Redirection (Baseline) | TC-EMR66-08 | Regression / Baseline | P0 | Yes |
| **EMR66-REQ-05** | Demographic Pre-population in Admission Form | TC-EMR66-09 | Data Integrity | P0 | Yes |
| **EMR66-REQ-05** | Draft Admission Record Generation & Wizard Access | TC-EMR66-10 | Business Workflow | P1 | Yes |
| **EMR66-REQ-06** | Patient Not Found (Unregistered Patient Flow) | TC-EMR66-11 | Edge Case | P1 | Manual/E2E |
| **EMR66-REQ-06** | Active Admission Conflict Warning | TC-EMR66-12 | Business Rules | P1 | Manual/E2E |
| **EMR66-REQ-07** | Search Modal Dismissal ('✕' / Backdrop) | TC-EMR66-13 | UI / Usability | P2 | Yes |
| **EMR66-REQ-07** | Special Character & Injection Handling | TC-EMR66-14 | Security / Sanitization | P2 | Yes |
| **EMR66-REQ-08** | Patient Module Isolation (Zero Regression) | TC-EMR66-15 | Regression | P0 | Yes |

---

## 2. Detailed Test Cases Specification

### Section A: Admit Patient Trigger & Search Interface

#### TC-EMR66-01: Verify "Admit Patient" Action Button and Modal Launch
- **Preconditions**: User is logged in to AMERCK CARE and navigated to `/admin/admissions`.
- **Test Steps**:
  1. Inspect the top-right action bar of the Admissions page.
  2. Verify the presence of the `"Admit Patient"` button (`bg-primary` / blue button).
  3. Click `"Admit Patient"`.
- **Expected Results**:
  - The `"Admit Patient"` button is visible, enabled, and styled consistently.
  - Clicking launches the `"Search Patients"` modal dialog (`role="dialog"`).
  - Modal title displays `"Search Patients"`.
  - Header displays close icon `'✕'`.
- **Priority**: P0 | **Automated**: Yes (`tests/admission-patient-search.spec.js`)

#### TC-EMR66-02: Verify Search Input Controls and Initial State
- **Preconditions**: `"Search Patients"` modal is open.
- **Test Steps**:
  1. Inspect the input field and search button in the modal.
- **Expected Results**:
  - Field label reads: `"Enter patient's unique identifier"`.
  - Placeholder reads: `"e.g. ID Card Number, Mobile Phone Number, Passport Number, etc."`.
  - Input field is empty and focused by default.
  - `"Search"` button is in a disabled state (`disabled=""`) when the input is empty.
  - Typing at least 1 character enables the `"Search"` button.
- **Priority**: P1 | **Automated**: Yes

---

### Section B: Search Execution & Patient Discovery

#### TC-EMR66-03: Search Patient by National Identity Card (NIC)
- **Preconditions**: A patient exists in the Local Database with a valid NIC (e.g., `199884510211` or `200603811032`).
- **Test Steps**:
  1. Enter the patient's NIC into the search input.
  2. Click `"Search"` (or press `Enter`).
- **Expected Results**:
  - A subtle loading state/spinner is displayed while querying.
  - The matching local patient record is displayed in the search results list.
  - Patient card displays: Full Name, Age/Gender, NIC/Identifier, and Hospital ID.
- **Priority**: P0 | **Automated**: Yes

#### TC-EMR66-04: Search Patient by Mobile Phone Number
- **Preconditions**: A patient exists in the Local Database with phone number `0764981884`.
- **Test Steps**:
  1. Enter `0764981884` into the search field.
  2. Click `"Search"`.
- **Expected Results**:
  - Matching patient is returned with phone number matched.
  - Contact number is highlighted in the search result item.
- **Priority**: P0 | **Automated**: Yes

#### TC-EMR66-05: Search Patient by Hospital ID / Medical Record Number (MRN)
- **Preconditions**: A local patient exists with Hospital ID (e.g. `2545` or `332925`).
- **Test Steps**:
  1. Enter the Hospital ID `2545` into the search field.
  2. Click `"Search"`.
- **Expected Results**:
  - Matching local patient is returned accurately.
- **Priority**: P0 | **Automated**: Yes

---

### Section C: Core Defect Verification & Redirection

#### TC-EMR66-06: Local Patient Selection - Redirect to Admission Form (CORE FIX)
- **Preconditions**: Local patient search returns a matching record in the "Search Patients" modal on `/admin/admissions`.
- **Test Steps**:
  1. Search for a known Local Database patient (e.g. `0764981884`).
  2. Click on the returned patient card / row (e.g. `"Dilumi Abeysekara"`).
  3. Monitor browser URL transition and rendered view.
- **Expected Results**:
  - System redirects the user to the **Admission Form / Admission Wizard** (e.g., `/admin/admissions/new?patientId=...` or `/admin/admissions/onboarding/:admissionId`).
  - Active navigation tab remains `"Admissions"` in the top navigation bar.
  - Wizard displays Step 1: `"Presenting Complaint"` or the patient admission intake screen.
  - **Defect Resolved**: User is **NOT** redirected to `/admin/patients/...`.
- **Priority**: P0 (Critical) | **Automated**: Yes

#### TC-EMR66-07: Verify Negative Redirection Guard (Defect Prevention)
- **Objective**: Explicitly assert that navigation to the Patient Module does not occur.
- **Test Steps**:
  1. Select a local patient from the search modal.
  2. Assert current URL.
- **Expected Results**:
  - `page.url()` does **not** match `/admin/patients/*`.
  - `page.url()` contains `/admin/admissions/`.
- **Priority**: P0 | **Automated**: Yes

#### TC-EMR66-08: Global Database Patient Selection - Baseline Verification
- **Objective**: Ensure the existing working behavior for Global Database patients remains intact.
- **Preconditions**: A patient exists in the Global Database.
- **Test Steps**:
  1. Search for a patient available in the Global Database.
  2. Select the global patient record.
- **Expected Results**:
  - System redirects to the Admission Form within the Admission Module.
  - Global patient data is pulled into the new admission flow.
  - Flow matches the local patient redirection behavior identically.
- **Priority**: P0 | **Automated**: Yes

---

### Section D: Data Pre-population & Workflow Continuity

#### TC-EMR66-09: Pre-populate Local Patient Demographics in Admission Form
- **Preconditions**: Local patient selected and redirected to Admission Form.
- **Test Steps**:
  1. Inspect the patient header and demographic overview in the Admission Form.
- **Expected Results**:
  - Patient Full Name matches the selected local patient.
  - Age, Gender, and Date of Birth are pre-populated.
  - Hospital ID / Identifier is bound to the admission form.
  - No manual re-entry of patient details is required.
- **Priority**: P0 | **Automated**: Yes

#### TC-EMR66-10: Draft Admission Record Generation & Wizard Access
- **Test Steps**:
  1. After selecting the local patient, inspect the admissions state or click `"Back to Admissions"`.
  2. Click the `"Draft"` status badge in the table row.
- **Expected Results**:
  - A new admission record with status `"Draft"` is created for this local patient.
  - Clicking `"Draft"` opens the Admission Wizard directly (`/admin/admissions/onboarding/...`).
  - Step 1: `"Presenting Complaint"` is rendered and active.
- **Priority**: P1 | **Automated**: Yes

---

### Section E: Edge Cases, Error Handling & Usability

#### TC-EMR66-11: Patient Not Found (Neither Local nor Global)
- **Test Steps**:
  1. Enter a non-existent identifier: `999999999999`.
  2. Click `"Search"`.
- **Expected Results**:
  - Empty state message displayed: `"No patient found with this identifier"`.
  - An option / button to `"Register New Patient"` or `"Add Patient"` is provided.
- **Priority**: P1 | **Automated**: Manual/E2E

#### TC-EMR66-12: Conflict Check for Patient Already Admitted
- **Preconditions**: Patient already has an active admission with status `"Admitted"`.
- **Test Steps**:
  1. Search and select a patient currently admitted in a bed.
- **Expected Results**:
  - System displays warning / alert: `"Patient is already admitted (Bed X). Please discharge or review existing admission."`
  - Prevents duplicate active admissions for the same patient.
- **Priority**: P1 | **Automated**: Manual/E2E

#### TC-EMR66-13: Dismiss Search Modal
- **Test Steps**:
  1. Click `"Admit Patient"` to open modal.
  2. Click the `'✕'` (Close) button or press `Escape`.
- **Expected Results**:
  - Modal closes immediately.
  - User remains on `/admin/admissions` without page reload or redirection.
- **Priority**: P2 | **Automated**: Yes

#### TC-EMR66-14: Search Input Sanitization (Special Characters & SQL/XSS)
- **Test Steps**:
  1. Enter `'; DROP TABLE patients; --` or `<script>alert(1)</script>`.
  2. Click `"Search"`.
- **Expected Results**:
  - Input is sanitized; system displays `"No patient found"` without crashing (no 500 error or uncaught script execution).
- **Priority**: P2 | **Automated**: Yes

---

### Section F: Zero Regression Verification

#### TC-EMR66-15: Direct Patient Management Isolation in Patient Module
- **Objective**: Ensure that searching/selecting patients directly within the Patient Module (`/admin/patients`) continues to open the Patient Form.
- **Test Steps**:
  1. Navigate to `/admin/patients`.
  2. Search and click on a patient row.
- **Expected Results**:
  - User is routed to the Patient Form (`/admin/patients/...` or `/admin/patients/edit/...`) to edit patient profile.
  - Redirection fix in Admission Module does **not** interfere with the Patient Module.
- **Priority**: P0 | **Automated**: Yes

---

## 3. Automation Implementation Guide (Playwright)

The automated test specification is implemented in [`tests/admission-patient-search.spec.js`](file:///c:/Users/LENOVO/Desktop/JPURA/tests/admission-patient-search.spec.js):

```powershell
# Run EMR-66 test suite
npx playwright test tests/admission-patient-search.spec.js --reporter=list

# Run EMR-66 in interactive Playwright UI
npx playwright test tests/admission-patient-search.spec.js --ui

# Open HTML test report
npx playwright show-report
```
