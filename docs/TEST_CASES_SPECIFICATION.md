# Test Case Specification: EMR Admission Wizard & PrescriptionPad

**Application**: AMERCK CARE EMR (https://qa_care.amerck.com)  
**Target Module**: Admission Wizard → Step 3: Past Medical History & Step 8: Drug History  
**Framework**: Playwright (Node.js)  
**Execution Type**: Automated (End-to-End & Integration) + Manual Exploratory Checklist  

---

## 1. Traceability Matrix

| Requirement Ref | Module / Feature Description | Test Case IDs | Priority |
| :--- | :--- | :--- | :--- |
| **REQ-PMH-01** | Diabetes: Quick-selection options (Type I, Type II, Other) | TC-PMH-01 to TC-PMH-05 | P0 / High |
| **REQ-PMH-02** | Chronic Kidney Disease (CKD): Section before COVID-19, Types I–V | TC-PMH-06 to TC-PMH-09 | P0 / High |
| **REQ-PMH-03** | COVID-19: "When" text field replacing "Duration" | TC-PMH-10, TC-PMH-11 | P1 / Medium |
| **REQ-PMH-04** | COVID-19: Vaccination Status radio button (Yes / No) | TC-PMH-12 to TC-PMH-14 | P0 / High |
| **REQ-PMH-05** | COVID-19: Vaccination Details pop-up modal (Dose & Name columns, OK button) | TC-PMH-15 to TC-PMH-22 | P0 / High |
| **REQ-PMH-06** | Form Display: Selected information listed clearly in main form | TC-PMH-23 | P1 / Medium |
| **REQ-ST8-01** | Step 8: Dynamic extraction of conditions (Include CKD, Exclude Blood Transfusions & Other PMH) | TC-ST8-01 | P0 / High |
| **REQ-ST8-02** | PrescriptionRow: Compact blue badges with (✕) and "+ Add Label" in single horizontal row | TC-ST8-02 to TC-ST8-04 | P1 / Medium |
| **REQ-ST8-03** | Condition Modal: 2-column grid, multi-selection, Clear All, Done actions | TC-ST8-05 to TC-ST8-07 | P0 / High |
| **REQ-ST8-04** | Summary & PDF Preview: Dedicated label line under medication name | TC-ST8-08 | P1 / Medium |
| **REQ-REG-01** | Care View (/admin/prescription): Zero regression (showConditionLabel={false}) | TC-REG-01, TC-REG-04 | P0 / Critical |
| **REQ-REG-02** | OPD View (/admin/opd): Zero regression (showConditionLabel={false}) | TC-REG-02 | P0 / Critical |
| **REQ-REG-03** | Presets View (/admin/drugs/presets/edit/[id]): Zero regression (showConditionLabel={false}) | TC-REG-03 | P1 / High |

---

## 2. Test Cases Specification

### Section A: Step 3 – Past Medical History (PMH)

#### TC-PMH-01: Verify Diabetes Quick-Selection Options Visibility
- **Preconditions**: User is logged in and navigated to Admission Wizard Step 3: Past Medical History.
- **Test Steps**:
  1. Scroll to the "Diabetes" section.
  2. Inspect the available quick-selection buttons.
- **Expected Result**: 
  - Section title displays "Diabetes".
  - Three quick-selection buttons are rendered: `Type I`, `Type II`, and `Other`.
  - Buttons are in an unselected default state (unless pre-existing data exists).
- **Priority**: P0 | **Automated**: Yes (`past-medical-history.spec.js`)

#### TC-PMH-02: Select Type I Diabetes Quick Option
- **Test Steps**:
  1. Click on the `Type I` button in the Diabetes section.
- **Expected Result**:
  - `Type I` button gains active/selected visual state (blue highlight / `.selected` class).
  - `Type II` and `Other` buttons remain unselected.
- **Priority**: P0 | **Automated**: Yes

#### TC-PMH-03: Switch Selection Between Diabetes Types
- **Test Steps**:
  1. Select `Type I`.
  2. Click on `Type II`.
- **Expected Result**:
  - `Type I` is deselected.
  - `Type II` becomes the active selected option.
- **Priority**: P1 | **Automated**: Yes

#### TC-PMH-04: Select "Other" Diabetes Type and Enter Custom Description
- **Test Steps**:
  1. Click on `Other` under Diabetes.
  2. Verify if a custom specification text field appears.
  3. Enter `"Gestational Diabetes Mellitus (GDM)"`.
- **Expected Result**:
  - `Other` button becomes active.
  - A text input field is revealed.
  - User can enter and retain custom diabetes text.
- **Priority**: P1 | **Automated**: Yes

#### TC-PMH-05: Deselect Active Diabetes Option (Toggle Off)
- **Test Steps**:
  1. Click on `Type I` (active).
  2. Click on `Type I` a second time.
- **Expected Result**:
  - `Type I` returns to unselected state. No diabetes type is active.
- **Priority**: P2 | **Automated**: Yes

---

### Section B: Chronic Kidney Disease (CKD)

#### TC-PMH-06: Verify CKD Section Placement Before COVID-19
- **Preconditions**: On Step 3: Past Medical History.
- **Test Steps**:
  1. Inspect the layout and DOM order of form sections.
- **Expected Result**:
  - The "Chronic Kidney Disease (CKD)" section appears **after** COPD/Diabetes and **immediately before** the "COVID 19" section.
- **Priority**: P0 | **Automated**: Yes

#### TC-PMH-07: Verify CKD Quick-Selection Options (Type I to Type V)
- **Test Steps**:
  1. Inspect the quick-selection options under "Chronic Kidney Disease (CKD)".
- **Expected Result**:
  - Five quick-selection options are displayed: `Type I`, `Type II`, `Type III`, `Type IV`, `Type V`.
- **Priority**: P0 | **Automated**: Yes

#### TC-PMH-08: Select CKD Stage/Type Option
- **Test Steps**:
  1. Click on `Type III` under Chronic Kidney Disease (CKD).
- **Expected Result**:
  - `Type III` option is highlighted as active.
  - Other CKD options (`Type I`, `Type II`, `Type IV`, `Type V`) remain unselected.
- **Priority**: P0 | **Automated**: Yes

#### TC-PMH-09: Switch CKD Selection (e.g., from Type III to Type V)
- **Test Steps**:
  1. With `Type III` active, click on `Type V`.
- **Expected Result**:
  - `Type III` is deselected; `Type V` becomes active.
- **Priority**: P1 | **Automated**: Yes

---

### Section C: COVID-19 Section Modifications

#### TC-PMH-10: Verify "When" Field Replaces "Duration"
- **Test Steps**:
  1. Locate the timing input within the COVID-19 section.
- **Expected Result**:
  - The label / placeholder displays `"When"` (not `"Duration"`).
  - The input is a text field (`<input type="text">`).
- **Priority**: P1 | **Automated**: Yes

#### TC-PMH-11: Enter Date or Free Text in "When" Field
- **Test Steps**:
  1. Click the "When" input.
  2. Enter `"August 2021 (Mild symptoms)"`.
- **Expected Result**:
  - Text is entered and preserved correctly in the field.
- **Priority**: P1 | **Automated**: Yes

#### TC-PMH-12: Verify Vaccination Status Radio Buttons
- **Test Steps**:
  1. Check the COVID-19 section for the Vaccination Status control.
- **Expected Result**:
  - Label reads `"Vaccination Status"`.
  - Radio button group provides two options: `"Yes"` and `"No"`.
- **Priority**: P0 | **Automated**: Yes

#### TC-PMH-13: Select Vaccination Status "No"
- **Test Steps**:
  1. Click the `"No"` radio button.
- **Expected Result**:
  - `"No"` is selected.
  - The Vaccination Details pop-up modal does **not** appear.
  - No vaccination details list is displayed.
- **Priority**: P1 | **Automated**: Yes

#### TC-PMH-14: Select Vaccination Status "Yes" (Triggers Pop-up)
- **Test Steps**:
  1. Click the `"Yes"` radio button.
- **Expected Result**:
  - `"Yes"` radio button is checked.
  - A pop-up/modal dialog titled `"COVID-19 Vaccination Details"` immediately appears.
- **Priority**: P0 | **Automated**: Yes

---

### Section D: Vaccination Details Modal & Form Display

#### TC-PMH-15: Verify Vaccination Modal Columns & Pre-populated Rows
- **Preconditions**: Vaccination modal is open.
- **Test Steps**:
  1. Inspect table headers and default row values.
- **Expected Result**:
  - Table contains two columns: `"Dose"` and `"Name"`.
  - Pre-populated/sample rows are present:
    - Row 1: `Dose 1` | `Pfizer`
    - Row 2: `Dose 2` | `Pfizer`
- **Priority**: P0 | **Automated**: Yes

#### TC-PMH-16: Edit Dose and Vaccine Name in Modal
- **Test Steps**:
  1. Change Row 1 Name to `"AstraZeneca"`.
  2. Change Row 2 Name to `"Moderna"`.
- **Expected Result**:
  - Inputs accept and reflect updated values without error.
- **Priority**: P1 | **Automated**: Yes

#### TC-PMH-17: Add Additional Dose Row in Modal
- **Test Steps**:
  1. Click `"+ Add Dose"`.
  2. In the new row, enter Dose: `"Booster 1"` and Name: `"Pfizer-BioNTech"`.
- **Expected Result**:
  - A new row is appended to the modal table.
  - User can enter the dose and vaccine name.
- **Priority**: P1 | **Automated**: Yes

#### TC-PMH-18: Remove a Dose Row in Modal
- **Test Steps**:
  1. Click the `✕` (Remove) button on Row 2.
- **Expected Result**:
  - Row 2 is removed from the table. Total row count decreases by 1.
- **Priority**: P1 | **Automated**: Yes

#### TC-PMH-19: Confirm Modal with "OK" Button & Verify Display in Main Form
- **Test Steps**:
  1. Ensure Dose 1 (`Pfizer`) and Dose 2 (`Pfizer`) are in the table.
  2. Click the `"OK"` button.
- **Expected Result**:
  - The modal closes.
  - The main COVID-19 section displays the recorded vaccination details clearly (e.g. `Dose 1: Pfizer`, `Dose 2: Pfizer`).
  - An `"Edit Details"` link/button is provided.
- **Priority**: P0 | **Automated**: Yes

#### TC-PMH-20: Edit Existing Vaccinations via "Edit Details" Link
- **Test Steps**:
  1. In the main COVID-19 section, click `"Edit Details"`.
- **Expected Result**:
  - Modal re-opens displaying the previously saved doses and names intact.
- **Priority**: P1 | **Automated**: Yes

#### TC-PMH-21: Dismiss Modal via Cancel / Close ('✕')
- **Test Steps**:
  1. Open modal, make a temporary text change.
  2. Click `"Cancel"` or header `'✕'`.
- **Expected Result**:
  - Modal closes without committing the temporary modifications.
- **Priority**: P2 | **Automated**: Yes

#### TC-PMH-22: Full State Persistence on Step 3
- **Test Steps**:
  1. Set Diabetes = `Type II`.
  2. Set CKD = `Type IV`.
  3. Set COVID When = `"November 2022"`.
  4. Set Vaccination Status = `"Yes"` and confirm details via `"OK"`.
  5. Check `Before 3 months` under Blood Transfusions.
  6. Verify all selections remain visible simultaneously on the main form.
- **Expected Result**:
  - All selected information is clearly displayed within the form without truncation or layout displacement.
- **Priority**: P0 | **Automated**: Yes

---

### Section E: Integration with Step 8 (Drug History)

#### TC-ST8-01: Dynamic Extraction of Conditions & Exclusions
- **Preconditions**: Conditions entered in Step 3 (CKD Type II, Diabetes Type II, COVID-19, Blood Transfusion checked, Other PMH text entered).
- **Test Steps**:
  1. Navigate to Step 8: Drug History.
  2. Click `"+ Add Label"` on a drug row.
- **Expected Result**:
  - Modal opens displaying extracted conditions in a 2-column grid.
  - **Included**: `Chronic Kidney Disease (CKD)`, `Diabetes (Type II)`, `COVID 19`, and standard conditions (`Past ACS/IHD`, `Dyslipidemia (DL)`).
  - **Excluded**: `Previous Blood Transfusions`, `Other Past Medical Problems`.
- **Priority**: P0 | **Automated**: Yes (`drug-history-step8-integration.spec.js`)

#### TC-ST8-02: Compact Blue Badges with (✕) and Single Horizontal Row
- **Test Steps**:
  1. Inspect drug row condition badges under Generic/Brand input.
- **Expected Result**:
  - Active condition labels display as compact blue badges with remove buttons (`✕`).
  - Label row has class `flex-nowrap overflow-x-auto` to prevent pushing down table row height.
- **Priority**: P1 | **Automated**: Yes

#### TC-ST8-03: Table Row Vertical Alignment (`align-top`)
- **Test Steps**:
  1. Inspect `TableRow` and `TableCell` elements in the PrescriptionPad table.
- **Expected Result**:
  - `align-top` class is applied so Dosage, Frequency, Route, Duration inputs remain aligned at the top regardless of badge count.
- **Priority**: P1 | **Automated**: Yes

#### TC-ST8-04: Condition Modal Multi-Selection, Clear All, and Done
- **Test Steps**:
  1. Open Condition modal, select multiple conditions (e.g. `Chronic Kidney Disease (CKD)` and `Past ACS/IHD`).
  2. Click `"Done"`.
  3. Verify updated badges appear in row.
  4. Open modal again, click `"Clear All"`, click `"Done"`.
- **Expected Result**:
  - Multi-selection applies blue highlights.
  - `"Done"` updates both `item.labels` array and `item.label` string.
  - `"Clear All"` removes all labels.
- **Priority**: P0 | **Automated**: Yes

#### TC-ST8-05: Summary & PDF Preview Formatting
- **Test Steps**:
  1. Inspect Prescription Summary & PDF Preview.
- **Expected Result**:
  - Medication name is displayed on the main line.
  - Condition labels are rendered on a dedicated line directly under medication:
    `panadol - 500 - BID - PO x 5 days`  
    `Labels: Chronic Kidney Disease (CKD), Past ACS/IHD`
- **Priority**: P1 | **Automated**: Yes

---

### Section F: Regression Testing (Care View, OPD, Presets)

#### TC-REG-01: Care View (/admin/prescription) Zero Regression
- **Test Steps**:
  1. Navigate to `/admin/prescription`.
- **Expected Result**:
  - `showConditionLabel` defaults to `false`.
  - Condition label badges, horizontal container, and `+ Add Label` button are **not** rendered (0% regression).
- **Priority**: P0 | **Automated**: Yes (`regression-views.spec.js`)

#### TC-REG-02: OPD View (/admin/opd) Zero Regression
- **Test Steps**:
  1. Navigate to `/admin/opd`.
- **Expected Result**:
  - `showConditionLabel` defaults to `false`. Condition badges and dialog are not rendered.
- **Priority**: P0 | **Automated**: Yes

#### TC-REG-03: Prescription Presets (/admin/drugs/presets/edit/[id]) Zero Regression
- **Test Steps**:
  1. Navigate to `/admin/drugs/presets/edit/1`.
- **Expected Result**:
  - Condition labels and buttons are not rendered.
- **Priority**: P1 | **Automated**: Yes

#### TC-REG-04: Core PrescriptionPad Functionality Untouched
- **Test Steps**:
  1. In Care View, test Drug Autocomplete, Dosage, Frequency, Route, Duration inputs.
- **Expected Result**:
  - All standard inputs function without error or lag.
- **Priority**: P0 | **Automated**: Yes
