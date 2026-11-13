# EMR-75: Enhance Past Medical History – Diabetes, CKD & COVID-19
## Comprehensive QA Test Case Specification & Impact Matrix

**Ticket Reference**: EMR-75  
**Target Module**: EMR → Admission Wizard → Step 3: Past Medical History  
**Downstream Impacted Modules**: Step 10: Summary View, Preview Tab, PDF Export, Legacy Patient Records  
**Environment**: AMERCK CARE Live QA (https://qa_care.amerck.com)  
**Author**: Antigravity QA Automation  
**Automation Framework**: Playwright (Node.js)  

---

## 1. Traceability Matrix

| Requirement Reference | Feature / Area | Test Case ID | Test Category | Priority | Automated |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **EMR75-REQ-01** | Diabetes Quick Selection | TC-EMR75-01 | UI / Layout | P0 | Yes |
| **EMR75-REQ-01** | Diabetes Type I Selection | TC-EMR75-02 | Functional | P0 | Yes |
| **EMR75-REQ-01** | Diabetes Switch Type I → Type II | TC-EMR75-03 | Functional | P0 | Yes |
| **EMR75-REQ-01** | Diabetes "Other" Popover / Selection | TC-EMR75-04 | Functional | P1 | Yes |
| **EMR75-REQ-01** | Diabetes Toggle Off (Deselect) | TC-EMR75-05 | Functional | P2 | Yes |
| **EMR75-REQ-02** | CKD Section Placement (Before COVID-19) | TC-EMR75-06 | Layout / DOM Order | P0 | Yes |
| **EMR75-REQ-02** | CKD Types I–V Quick Options Display | TC-EMR75-07 | UI / Layout | P0 | Yes |
| **EMR75-REQ-02** | CKD Direct Type Selection (e.g. Type III) | TC-EMR75-08 | Functional | P0 | Yes |
| **EMR75-REQ-02** | CKD Type Switching (Type III → Type V) | TC-EMR75-09 | Functional | P1 | Yes |
| **EMR75-REQ-02** | CKD Duration Input Field | TC-EMR75-10 | Functional | P1 | Yes |
| **EMR75-REQ-03** | COVID-19 "When" Field (replaces "Duration") | TC-EMR75-11 | UI / Functional | P0 | Yes |
| **EMR75-REQ-03** | COVID-19 "When" Date/Text Entry | TC-EMR75-12 | Functional | P1 | Yes |
| **EMR75-REQ-04** | COVID-19 Vaccination Status (Yes / No) | TC-EMR75-13 | UI / Functional | P0 | Yes |
| **EMR75-REQ-04** | Vaccination Status "No" (No Modal) | TC-EMR75-14 | Functional | P1 | Yes |
| **EMR75-REQ-04** | Vaccination Status "Yes" (Triggers Modal) | TC-EMR75-15 | Functional | P0 | Yes |
| **EMR75-REQ-05** | Modal Columns (Dose & Vaccine Name) | TC-EMR75-16 | UI / Data | P0 | Yes |
| **EMR75-REQ-05** | Modal Dose & Name Text Input | TC-EMR75-17 | Functional | P0 | Yes |
| **EMR75-REQ-05** | Modal "+ Add Dose" Row Addition | TC-EMR75-18 | Functional | P1 | Yes |
| **EMR75-REQ-05** | Modal Enter Keyboard Shortcut | TC-EMR75-19 | Usability / Keyboard | P2 | Manual |
| **EMR75-REQ-05** | Modal Row Deletion / Bin Button | TC-EMR75-20 | Functional | P1 | Yes |
| **EMR75-REQ-05** | Modal Cancel / Dismissal ('✕') | TC-EMR75-21 | Functional | P2 | Yes |
| **EMR75-REQ-05** | Modal "OK" Confirmation & Save | TC-EMR75-22 | Functional | P0 | Yes |
| **EMR75-REQ-05** | Main Form Vaccination Details Display | TC-EMR75-23 | UI / Functional | P0 | Yes |
| **EMR75-REQ-05** | Main Form "Edit" Link to Reopen Modal | TC-EMR75-24 | Functional | P1 | Yes |
| **EMR75-REQ-06** | Admission Wizard Summary View Integration | TC-EMR75-25 | Downstream Impact | P0 | Manual/E2E |
| **EMR75-REQ-06** | Admission Wizard Preview Tab Integration | TC-EMR75-26 | Downstream Impact | P1 | Manual/E2E |
| **EMR75-REQ-06** | Admission PDF Export Rendering | TC-EMR75-27 | Downstream Impact | P0 | Manual/E2E |
| **EMR75-REQ-07** | Backward Compatibility (Legacy Records) | TC-EMR75-28 | Compatibility | P0 | Manual/E2E |
| **EMR75-REQ-07** | Hydration Error Fix (`<h6>` in `<h3>`) | TC-EMR75-29 | Non-Functional / Console | P1 | Yes |
| **EMR75-REQ-07** | Formik State Serialization & Backend JSON | TC-EMR75-30 | Integration / API | P0 | Manual/E2E |

---

## 2. Detailed Test Cases Specification

### Section A: Diabetes Quick-Selection Options

#### TC-EMR75-01: Verify Diabetes Quick-Selection Buttons Rendering
- **Objective**: Ensure the Diabetes section renders the new quick-selection pills correctly.
- **Preconditions**: User is logged in to AMERCK CARE and navigated to Admission Wizard Step 3: Past Medical History.
- **Test Steps**:
  1. Navigate to the "Diabetes" card on Step 3.
  2. Inspect the sub-options displayed below the "Diabetes" label and "Duration" input.
- **Expected Results**:
  - The label "Type" is visible.
  - Three distinct selection options are rendered: `I`, `II`, and `Other`.
  - Default appearance: rounded pill badges (`rounded-full`) with neutral background (`bg-gray-200`) and `Other` with dashed border (`border-dashed`).
- **Priority**: P0 | **Automated**: Yes (`tests/past-medical-history.spec.js`)

#### TC-EMR75-02: Select Type I Diabetes
- **Test Steps**:
  1. Click on the `I` pill under Diabetes.
- **Expected Results**:
  - The `I` pill becomes active with visual indicator (`bg-blue-500 text-white`).
  - `II` and `Other` remain in their default/unselected states.
  - Formik state stores `{ type: 'Type I' }` for diabetes.
- **Priority**: P0 | **Automated**: Yes

#### TC-EMR75-03: Switch Diabetes Selection from Type I to Type II
- **Test Steps**:
  1. Ensure `I` is selected.
  2. Click on the `II` pill.
- **Expected Results**:
  - `I` returns to unselected (`bg-gray-200`).
  - `II` gains active state (`bg-blue-500 text-white`).
  - Only one primary diabetes type remains active.
- **Priority**: P0 | **Automated**: Yes

#### TC-EMR75-04: Select "Other" Diabetes Option
- **Test Steps**:
  1. Click on the `Other` button under Diabetes.
- **Expected Results**:
  - The `Other` button triggers a Radix popover (`aria-expanded="true"`, `data-state="open"`).
  - Popover allows entering custom text (e.g. "Gestational Diabetes Mellitus").
  - Value persists upon closing the popover.
- **Priority**: P1 | **Automated**: Yes

#### TC-EMR75-05: Toggle Off Active Diabetes Option
- **Test Steps**:
  1. Click on the currently active `I` pill.
- **Expected Results**:
  - The `I` pill toggles off and returns to `bg-gray-200`.
  - No diabetes type is active.
- **Priority**: P2 | **Automated**: Yes

---

### Section B: Chronic Kidney Disease (CKD) Section

#### TC-EMR75-06: Verify CKD Section Placement Immediately Before COVID-19
- **Objective**: Confirm the structural DOM ordering of the new CKD section.
- **Test Steps**:
  1. Inspect the bounding boxes and DOM flow of the cards in Step 3.
  2. Locate the "Chronic Kidney Disease (CKD)" card and the "COVID 19" card.
- **Expected Results**:
  - CKD section is positioned directly after COPD and immediately above COVID-19 (`ckdBox.y < covidBox.y`).
- **Priority**: P0 | **Automated**: Yes

#### TC-EMR75-07: Verify CKD Types I through V Quick-Selection Options
- **Test Steps**:
  1. Inspect the "Chronic Kidney Disease (CKD)" card.
- **Expected Results**:
  - Section header reads "Chronic Kidney Disease (CKD)".
  - Five quick-selection pills are present: `I`, `II`, `III`, `IV`, and `V`.
  - A "Duration" text field is present alongside the title.
- **Priority**: P0 | **Automated**: Yes

#### TC-EMR75-08: Select CKD Stage/Type Directly (e.g. Type III)
- **Test Steps**:
  1. Click on the `III` pill under CKD.
- **Expected Results**:
  - `III` pill gains active state (`bg-blue-500 text-white`).
  - Other CKD pills (`I`, `II`, `IV`, `V`) remain unselected.
- **Priority**: P0 | **Automated**: Yes

#### TC-EMR75-09: Switch CKD Type Selection (e.g. Type III to Type V)
- **Test Steps**:
  1. With `III` active, click on the `V` pill.
- **Expected Results**:
  - `III` reverts to unselected (`bg-gray-200`).
  - `V` becomes active (`bg-blue-500 text-white`).
- **Priority**: P1 | **Automated**: Yes

#### TC-EMR75-10: Enter Duration for CKD
- **Test Steps**:
  1. Click on the "Duration" field in the CKD card.
  2. Enter `"3 years"`.
- **Expected Results**:
  - Text field accepts and retains `"3 years"`.
- **Priority**: P1 | **Automated**: Yes

---

### Section C: COVID-19 Section Modifications

#### TC-EMR75-11: Verify "When" Field Replaces "Duration"
- **Test Steps**:
  1. Scroll to the "COVID 19" card.
  2. Inspect the placeholder and label of the timing input.
- **Expected Results**:
  - Field placeholder reads `"When"` (replaces legacy `"Duration"`).
  - Field type is standard text (`<input type="text">`).
- **Priority**: P0 | **Automated**: Yes

#### TC-EMR75-12: Enter Date or Free Text in "When" Field
- **Test Steps**:
  1. In the "When" input, enter `"August 2021"`.
- **Expected Results**:
  - Value `"August 2021"` is retained in form state.
- **Priority**: P1 | **Automated**: Yes

#### TC-EMR75-13: Verify Vaccination Status Radio Buttons
- **Test Steps**:
  1. Check the controls under the "Vaccination Status" label in the COVID-19 card.
- **Expected Results**:
  - Label reads `"Vaccination Status"`.
  - Radio options `"Yes"` and `"No"` are available.
- **Priority**: P0 | **Automated**: Yes

#### TC-EMR75-14: Select Vaccination Status "No"
- **Test Steps**:
  1. Select `"No"`.
- **Expected Results**:
  - `"No"` radio is checked.
  - COVID-19 Vaccination Details modal does **not** open.
  - Vaccination details summary is not shown.
- **Priority**: P1 | **Automated**: Yes

#### TC-EMR75-15: Select Vaccination Status "Yes"
- **Test Steps**:
  1. Click `"Yes"`.
- **Expected Results**:
  - `"Yes"` radio is checked.
  - COVID-19 Vaccination Details modal opens automatically.
  - Modal title reads `"COVID-19 Vaccination Details"`.
- **Priority**: P0 | **Automated**: Yes

---

### Section D: Standalone Vaccination Details Modal

#### TC-EMR75-16: Verify Modal Columns and Structure
- **Preconditions**: Vaccination Details modal is open.
- **Test Steps**:
  1. Inspect the modal layout and table headers.
- **Expected Results**:
  - Table headers display `"Dose"` and `"Vaccine Name"`.
  - Action buttons: `"+ Add"` (or `"+ Add Dose"`), `"Cancel"`, `"OK"`, and `'✕'` close icon.
- **Priority**: P0 | **Automated**: Yes

#### TC-EMR75-17: Enter Dose and Vaccine Name Values
- **Test Steps**:
  1. In row 1: enter Dose = `"Dose 1"`, Vaccine Name = `"Pfizer"`.
  2. In row 2: enter Dose = `"Dose 2"`, Vaccine Name = `"Moderna"`.
- **Expected Results**:
  - Both input fields accept and display entered values without lag.
- **Priority**: P0 | **Automated**: Yes

#### TC-EMR75-18: Add Additional Dose Row via "+ Add" Button
- **Test Steps**:
  1. Click `"+ Add"`.
- **Expected Results**:
  - A new editable row is appended to the table.
  - Total row count increments by 1.
- **Priority**: P1 | **Automated**: Yes

#### TC-EMR75-19: Enter Key Shortcut for Adding Dose Rows
- **Test Steps**:
  1. Focus on the Vaccine Name input of the last row.
  2. Press the `Enter` key.
- **Expected Results**:
  - Focus moves to or appends a new dose row. Form is not prematurely submitted.
- **Priority**: P2 | **Automated**: Manual

#### TC-EMR75-20: Remove Dose Row via Clear/Bin Button
- **Test Steps**:
  1. Click the trash/bin icon button on row 2.
- **Expected Results**:
  - Row 2 is deleted from the table.
  - Remaining rows adjust index dynamically.
- **Priority**: P1 | **Automated**: Yes

#### TC-EMR75-21: Dismiss Modal via Cancel / Close
- **Test Steps**:
  1. Make edits to row inputs in the modal.
  2. Click `"Cancel"` or `'✕'`.
- **Expected Results**:
  - Modal closes.
  - Unsaved temporary changes are discarded.
- **Priority**: P2 | **Automated**: Yes

#### TC-EMR75-22: Confirm Modal via "OK" Button
- **Test Steps**:
  1. Enter Dose 1: `"Dose 1"` | `"Pfizer"`.
  2. Click `"OK"`.
- **Expected Results**:
  - Modal closes smoothly.
  - Vaccination details are committed to the Formik state.
- **Priority**: P0 | **Automated**: Yes

#### TC-EMR75-23: Verify Display in Main Form After OK
- **Test Steps**:
  1. Inspect the COVID-19 section on the main form after confirming the modal.
- **Expected Results**:
  - `"VACCINATION DETAILS"` header appears.
  - Recorded doses are listed clearly (e.g. `Dose 1 | Pfizer`).
  - An `"Edit"` button/link is displayed next to the details.
- **Priority**: P0 | **Automated**: Yes

#### TC-EMR75-24: Reopen and Update Vaccinations via "Edit" Button
- **Test Steps**:
  1. Click the `"Edit"` button in the Vaccination Details block on the main form.
- **Expected Results**:
  - Modal re-opens populated with the existing saved doses (`Dose 1 | Pfizer`).
  - Modifications can be made and re-saved via `"OK"`.
- **Priority**: P1 | **Automated**: Yes

---

### Section E: Downstream Impact & Cross-Cutting Verification

#### TC-EMR75-25: Admission Wizard Summary View Integration
- **Objective**: Verify that Step 10 (Summary) correctly renders CKD types and vaccination dose lists.
- **Preconditions**: Patient admission has CKD Type III and COVID-19 Vaccinations (Dose 1: Pfizer, Dose 2: Moderna).
- **Test Steps**:
  1. Complete Steps 3 through 9 and proceed to Step 10: Summary.
  2. Inspect the Past Medical History section in the Summary card.
- **Expected Results**:
  - CKD appears with its selected type (e.g. `Chronic Kidney Disease (CKD) - Type III`).
  - COVID-19 section lists the complete vaccination dose breakdown.
  - No `[object Object]` or `undefined` text is displayed.
- **Priority**: P0 | **Automated**: Manual / E2E

#### TC-EMR75-26: Admission Wizard Preview Tab Formatting
- **Test Steps**:
  1. Navigate to the Admission Wizard Preview tab.
  2. Review the rendered Past Medical History section.
- **Expected Results**:
  - CKD types and COVID-19 vaccination records are formatted gracefully into readable text.
  - If CKD has no type selected, only the condition name appears without empty hyphens.
- **Priority**: P1 | **Automated**: Manual / E2E

#### TC-EMR75-27: Admission PDF Export Text Rendering
- **Test Steps**:
  1. Click "Export PDF" / "Print Admission" from the completed admission.
  2. Inspect the generated PDF document.
- **Expected Results**:
  - PDF builds and downloads successfully without 500 errors or build crashes.
  - Past Medical History section in PDF includes:
    - CKD type label (e.g. `Type III`).
    - COVID-19 vaccination doses list.
  - Safe string interpolation prevents null/undefined crashes.
- **Priority**: P0 | **Automated**: Manual / E2E

#### TC-EMR75-28: Backward Compatibility with Legacy Records
- **Test Steps**:
  1. Open an existing draft or completed admission created prior to EMR-75 changes.
  2. Navigate through Step 3: Past Medical History, Step 10: Summary, and PDF Export.
- **Expected Results**:
  - The record loads completely without console errors or crash.
  - Default values are safely merged (`types: []`, `vaccinationDetails: []`).
  - Unpopulated new fields remain blank/default without throwing errors.
- **Priority**: P0 | **Automated**: Manual / E2E

#### TC-EMR75-29: Next.js Hydration Check (No `<h6>` inside `<h3>`)
- **Test Steps**:
  1. Open browser developer tools console.
  2. Perform a hard refresh (`Ctrl + F5`) on the Admission Wizard.
  3. Inspect console logs for hydration warnings.
- **Expected Results**:
  - Zero hydration errors (e.g., `Warning: validateDOMNesting(...): <h6> cannot appear as a descendant of <h3>`).
  - Card titles render using clean semantic `<span>` tags.
- **Priority**: P1 | **Automated**: Yes

#### TC-EMR75-30: Backend JSON Schema Compatibility
- **Test Steps**:
  1. Complete Step 3 with CKD Type IV and COVID-19 Vaccination (Dose 1: Sinopharm).
  2. Save admission as Draft or submit.
  3. Inspect network request payload to `/api/admissions/...`.
- **Expected Results**:
  - `pastMedicalProblems` JSON payload correctly serializes new properties:
    ```json
    {
      "name": "Chronic Kidney Disease (CKD)",
      "type": "Type IV",
      "duration": "1 year"
    },
    {
      "name": "COVID 19",
      "when": "2021",
      "vaccinationStatus": "Yes",
      "vaccinationDetails": [
        { "dose": "Dose 1", "name": "Sinopharm" }
      ]
    }
    ```
  - Backend responds with HTTP 200/201 OK.
- **Priority**: P0 | **Automated**: Manual / E2E

---

## 3. Automation Status & Execution Guide

### Automated Playwright Spec: `tests/past-medical-history.spec.js`
The core functional test cases for EMR-75 have been automated in [`tests/past-medical-history.spec.js`](file:///c:/Users/LENOVO/Desktop/JPURA/tests/past-medical-history.spec.js) and executed against `https://qa_care.amerck.com/`:

```powershell
# Run the complete EMR-75 Step 3 test suite
npx playwright test tests/past-medical-history.spec.js --reporter=list

# Run with interactive UI mode
npx playwright test tests/past-medical-history.spec.js --ui

# View full HTML test report
npx playwright show-report
```

**Execution Result**: 19 out of 19 tests **100% PASSED**.
