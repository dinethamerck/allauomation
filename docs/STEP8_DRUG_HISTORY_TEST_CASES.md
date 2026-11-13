# Step 8: Drug History & PrescriptionPad Multi-Label Feature
## Comprehensive QA Test Case Specification & Regression Matrix

**Module**: EMR → Admission Wizard → Step 8: Drug History  
**Component**: Shared `PrescriptionPad`, `PrescriptionRow`, `ConditionModal`  
**Downstream Modules**: Step 10: Summary View, Preview Tab, PDF Export  
**Regression Scope**: Care View (`/admin/prescription`), OPD View (`/admin/opd`), Prescription Presets (`/admin/drugs/presets`)  
**Live Target**: AMERCK CARE QA (https://qa_care.amerck.com)  
**Automation Framework**: Playwright (Node.js)  

---

## 1. Traceability Matrix

| Requirement Reference | Feature / Area | Test Case ID | Test Category | Priority | Automated |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **ST8-REQ-01** | Add Label Button Visibility | TC-ST8-01 | UI / Layout | P0 | Yes |
| **ST8-REQ-02** | Condition Extraction & Inclusion (CKD, Standard) | TC-ST8-02 | Data Extraction | P0 | Yes |
| **ST8-REQ-02** | Condition Exclusion (Transfusions, Other PMH) | TC-ST8-03 | Filtering / Business Logic | P0 | Yes |
| **ST8-REQ-03** | Condition Modal 2-Column Grid Layout | TC-ST8-04 | UI / Accessibility | P1 | Yes |
| **ST8-REQ-03** | Condition Multi-Selection & Highlight | TC-ST8-05 | Functional | P0 | Yes |
| **ST8-REQ-03** | Condition Modal "Clear All" Action | TC-ST8-06 | Functional | P1 | Yes |
| **ST8-REQ-03** | Condition Modal "Done" / "OK" Confirmation | TC-ST8-07 | Functional | P0 | Yes |
| **ST8-REQ-03** | Modal Dismissal ('✕' Close Button) | TC-ST8-08 | Functional | P2 | Yes |
| **ST8-REQ-04** | Compact Blue Badges Display Under Medication | TC-ST8-09 | UI / Visual | P0 | Yes |
| **ST8-REQ-04** | Badge Remove Button ('✕') | TC-ST8-10 | Functional | P0 | Yes |
| **ST8-REQ-04** | "+ Add More" Button Next to Existing Badges | TC-ST8-11 | UI / Functional | P1 | Yes |
| **ST8-REQ-04** | Single Horizontal Row (`flex-nowrap overflow-x-auto`) | TC-ST8-12 | CSS / Layout | P1 | Yes |
| **ST8-REQ-05** | Table Row Vertical Alignment (`align-top`) | TC-ST8-13 | UI / Alignment | P1 | Yes |
| **ST8-REQ-05** | Medication Inputs Functionality (Dosage, Freq, Route, Dur) | TC-ST8-14 | Functional | P0 | Yes |
| **ST8-REQ-06** | Data Synchronization (`item.labels` & `item.label`) | TC-ST8-15 | State / Data Integrity | P0 | Manual/E2E |
| **ST8-REQ-07** | Summary View Individual Badges Rendering | TC-ST8-16 | Downstream View | P0 | Manual/E2E |
| **ST8-REQ-07** | Preview Tab Dedicated Labels Line | TC-ST8-17 | Downstream View | P1 | Manual/E2E |
| **ST8-REQ-07** | PDF Export Dedicated Labels Rendering | TC-ST8-18 | Export / Reporting | P0 | Manual/E2E |
| **REG-REQ-01** | Care View Isolation (`showConditionLabel={false}`) | TC-REG-01 | Regression | P0 | Yes |
| **REG-REQ-02** | OPD View Isolation (`showConditionLabel={false}`) | TC-REG-02 | Regression | P0 | Yes |
| **REG-REQ-03** | Prescription Presets Isolation (`showConditionLabel={false}`) | TC-REG-03 | Regression | P1 | Yes |
| **CORE-REQ-01** | Drug Search Autocomplete Functionality | TC-CORE-01 | Core Regression | P0 | Yes |
| **CORE-REQ-02** | Keyboard Navigation & Shortcuts (Enter, Arrow keys) | TC-CORE-02 | Usability | P2 | Manual |
| **CORE-REQ-03** | Row Reordering (Move Up / Down) & Deletion | TC-CORE-03 | Core Regression | P1 | Yes |
| **CORE-REQ-04** | Autosave & Draft Debounce Integration | TC-CORE-04 | Core Integration | P0 | Yes |

---

## 2. Detailed Test Cases Specification

### Section A: Condition Extraction & Exclusion Rules (Step 8 Modal)

#### TC-ST8-01: Verify "Add Label" Button Initial Visibility
- **Preconditions**: User logged into AMERCK CARE, navigated to Admission Wizard Step 8: Drug History on a clean medication row without existing labels.
- **Test Steps**:
  1. Inspect the "Generic/Brand" column in the first medication row of the table.
  2. Locate the action button underneath the Generic name input field.
- **Expected Results**:
  - The button displays text `"Add Label"`.
  - The button is visible and enabled.
- **Priority**: P0 | **Automated**: Yes (`tests/drug-history-step8-integration.spec.js`)

#### TC-ST8-02: Condition Modal Dynamic Extraction & Explicit Inclusions
- **Preconditions**: Step 3 (Past Medical History) completed with Chronic Kidney Disease (CKD) Type II, Diabetes Type II, and standard conditions recorded.
- **Test Steps**:
  1. Navigate to Step 8: Drug History.
  2. Click the `"Add Label"` (or `"+ Add More"`) button.
  3. Inspect all condition options listed in the opened dialog.
- **Expected Results**:
  - Modal title displays `"Select Past Medical History Labels"`.
  - Subtitle reads: `"Select one or more past medical conditions to associate with this medication."`
  - Explicitly contains:
    - `"Chronic Kidney Disease (CKD)"`
    - `"Diabetes"`
    - `"Past ACS/IHD"`
    - `"Hypertension"`
    - `"Dyslipidemia (DL)"`
    - `"Cerebro Vascular Accidents (CVA)"`
    - `"Bronchial Asthma"`
    - `"Chronic Obstructive Pulmonary Disease (COPD)"`
    - `"COVID 19"`
- **Priority**: P0 | **Automated**: Yes

#### TC-ST8-03: Strict Condition Exclusions (Blood Transfusions & Other PMH)
- **Preconditions**: Step 3 has Blood Transfusions checked (`"Before 3 months"`) and Other Past Medical Problems filled (`"Seasonal allergic rhinitis"`).
- **Test Steps**:
  1. In Step 8, open the condition labels modal.
  2. Inspect the condition options list for excluded categories.
- **Expected Results**:
  - `"Previous Blood Transfusions"` is **NOT** present in the modal.
  - `"Before 3 months"` is **NOT** present in the modal.
  - `"Other Past Medical Problems"` is **NOT** present in the modal.
  - `"Seasonal allergic rhinitis"` is **NOT** present in the modal.
- **Priority**: P0 | **Automated**: Yes

#### TC-ST8-04: Modal 2-Column Grid Layout
- **Test Steps**:
  1. Open the condition modal.
  2. Inspect the CSS layout of the condition buttons container.
- **Expected Results**:
  - Condition buttons are arranged in a 2-column responsive grid layout (`grid grid-cols-2`).
  - Buttons have consistent padding, border styling, and accessible touch targets.
- **Priority**: P1 | **Automated**: Yes

#### TC-ST8-05: Multi-Condition Selection with Active Highlight
- **Test Steps**:
  1. In the open condition modal, click `"Past ACS/IHD"`.
  2. Click `"Chronic Kidney Disease (CKD)"`.
- **Expected Results**:
  - Both condition options reflect the active/selected visual state (blue border / blue text / active highlight).
  - Multi-selection allows any combination of conditions simultaneously.
- **Priority**: P0 | **Automated**: Yes

#### TC-ST8-06: Modal "Clear All" Action
- **Test Steps**:
  1. In the modal, select multiple conditions.
  2. Click the `"Clear All"` button in the dialog footer.
- **Expected Results**:
  - All selected condition buttons return to the unselected default state.
- **Priority**: P1 | **Automated**: Yes

#### TC-ST8-07: Modal "Done" / "OK" Confirmation
- **Test Steps**:
  1. Select `"Chronic Kidney Disease (CKD)"` and `"Past ACS/IHD"`.
  2. Click the `"Done"` button.
- **Expected Results**:
  - Modal closes.
  - Selected conditions are committed to the medication item.
  - Both badges appear immediately under the Generic/Brand input.
- **Priority**: P0 | **Automated**: Yes

#### TC-ST8-08: Modal Dismissal via Close Button ('✕')
- **Test Steps**:
  1. Open modal, toggle a condition on or off.
  2. Click the `'✕'` (Close) button in the modal header.
- **Expected Results**:
  - Modal closes immediately without saving pending temporary modifications.
- **Priority**: P2 | **Automated**: Yes

---

### Section B: PrescriptionRow Badge Display & Alignment

#### TC-ST8-09: Compact Blue Badges Display Under Medication
- **Test Steps**:
  1. After confirming conditions in the modal, inspect the area under the Generic name input field.
- **Expected Results**:
  - Each selected condition is rendered as an individual, compact blue badge/pill (`bg-blue-50 text-blue-700 border-blue-200` or equivalent Tailwind tokens).
  - Badge text accurately displays the condition name.
- **Priority**: P0 | **Automated**: Yes

#### TC-ST8-10: Badge Individual Removal via '✕' Button
- **Test Steps**:
  1. On a medication row with multiple badges, click the remove button (`✕`) on the `"Chronic Kidney Disease (CKD)"` badge.
- **Expected Results**:
  - The `"Chronic Kidney Disease (CKD)"` badge is removed from the row.
  - Other badges remain intact.
  - If all badges are removed, the button reverts from `"+ Add More"` back to `"Add Label"`.
- **Priority**: P0 | **Automated**: Yes

#### TC-ST8-11: "+ Add More" Button State
- **Test Steps**:
  1. Observe the action button when at least one badge is active.
- **Expected Results**:
  - The button text is displayed as `"+ Add More"` (instead of `"Add Label"`).
  - Clicking `"+ Add More"` re-opens the condition modal with current badges pre-selected.
- **Priority**: P1 | **Automated**: Yes

#### TC-ST8-12: Single Horizontal Row Layout (`flex-nowrap overflow-x-auto`)
- **Test Steps**:
  1. Add 4 or more conditions to a single medication row.
  2. Inspect the badge container styling and row height.
- **Expected Results**:
  - Badges and `+ Add More` button are constrained in a single horizontal row (`flex-nowrap`).
  - Container enables horizontal scrolling (`overflow-x-auto`) rather than wrapping to multiple lines and expanding table row height.
- **Priority**: P1 | **Automated**: Yes

#### TC-ST8-13: Table Row Vertical Alignment (`align-top`)
- **Test Steps**:
  1. Inspect the `TableRow` and `TableCell` elements across columns (Generic, Dosage, Frequency, Route, Duration).
- **Expected Results**:
  - `align-top` CSS class is present on table row/cells.
  - Input fields across all columns remain top-aligned and do not shift downwards when badges are added to the Generic column.
- **Priority**: P1 | **Automated**: Yes

#### TC-ST8-14: Medication Input Field Integrity
- **Test Steps**:
  1. Enter Generic Name: `"Panadol"`.
  2. Enter Dosage: `"500mg"`.
  3. Enter Frequency: `"BID"`.
  4. Verify Route: `"PO"`.
  5. Enter Duration: `"5 days"`.
- **Expected Results**:
  - All input fields retain their typed values.
  - Adding or removing condition badges does not clear or disrupt medication input values.
- **Priority**: P0 | **Automated**: Yes

---

### Section C: Data Synchronization & Downstream Views

#### TC-ST8-15: Dual Property Data Synchronization (`item.labels` & `item.label`)
- **Objective**: Verify backward compatibility with systems expecting string or array representations.
- **Test Steps**:
  1. Select conditions: `"Past ACS/IHD"` and `"Chronic Kidney Disease (CKD)"`.
  2. Inspect the Formik row object in developer console / network payload.
- **Expected Results**:
  - `item.labels` is an array: `["Past ACS/IHD", "Chronic Kidney Disease (CKD)"]`.
  - `item.label` is a comma-delimited string: `"Past ACS/IHD, Chronic Kidney Disease (CKD)"`.
- **Priority**: P0 | **Automated**: Manual / E2E

#### TC-ST8-16: Step 10 Summary View Badge Rendering
- **Preconditions**: Medication configured with condition labels in Step 8.
- **Test Steps**:
  1. Navigate to Step 10: Summary.
  2. Locate the Drug History / Medications table in the summary.
- **Expected Results**:
  - Medication name is displayed on the primary row.
  - Associated condition labels appear as discrete badges underneath the drug name.
  - No missing or corrupted text is rendered.
- **Priority**: P0 | **Automated**: Manual / E2E

#### TC-ST8-17: Admission Preview Tab Formatting
- **Test Steps**:
  1. Open the Admission Wizard Preview tab.
  2. Review the Drug History section.
- **Expected Results**:
  - Renders labels on a dedicated line directly under the medication name:
    ```text
    panadol - 500 - BID - PO x 5 days
    Labels: Past ACS/IHD, Chronic Kidney Disease (CKD)
    ```
- **Priority**: P1 | **Automated**: Manual / E2E

#### TC-ST8-18: PDF Export Rendering
- **Test Steps**:
  1. Generate and download the Admission PDF.
  2. Inspect the Drug History section in the PDF reader.
- **Expected Results**:
  - Medication entry displays the dedicated `Labels:` line directly beneath the drug details.
  - If a medication has no labels, no blank `Labels:` line is printed.
  - PDF generation completes with 0 errors.
- **Priority**: P0 | **Automated**: Manual / E2E

---

### Section D: Regression Isolation (Care View, OPD, Presets)

#### TC-REG-01: Care View (/admin/prescription) Zero Regression
- **Test Steps**:
  1. Navigate to `/admin/prescription`.
  2. Inspect the PrescriptionPad component within `TodayForm`.
- **Expected Results**:
  - `showConditionLabel` defaults to `false`.
  - No `"Add Label"` or `"+ Add More"` button is rendered under Generic Name.
  - No condition badges are rendered.
  - Condition modal dialog is not mountable.
- **Priority**: P0 | **Automated**: Yes (`tests/regression-views.spec.js`)

#### TC-REG-02: OPD View (/admin/opd) Zero Regression
- **Test Steps**:
  1. Navigate to `/admin/opd`.
  2. Inspect the PrescriptionPad in the OPD encounter form.
- **Expected Results**:
  - `showConditionLabel` defaults to `false`.
  - Condition label UI elements are completely absent.
- **Priority**: P0 | **Automated**: Yes

#### TC-REG-03: Prescription Presets View (/admin/drugs) Zero Regression
- **Test Steps**:
  1. Navigate to `/admin/drugs` (Presets management).
  2. Inspect the preset medication editor table.
- **Expected Results**:
  - `showConditionLabel` defaults to `false`.
  - Medication rows render standard prescription fields without condition label additions.
- **Priority**: P1 | **Automated**: Yes

---

### Section E: Core PrescriptionPad Functionality Verification

#### TC-CORE-01: Drug Search Autocomplete Functionality
- **Test Steps**:
  1. In a medication row on Step 8, type `"Amox"` into the Generic name field.
  2. Observe the autocomplete dropdown suggestions.
  3. Select an item from the list.
- **Expected Results**:
  - Autocomplete dropdown renders rapidly and accurately.
  - Selecting an item populates Generic name and default dosage/route.
  - Condition label container remains unaffected below the input.
- **Priority**: P0 | **Automated**: Yes

#### TC-CORE-02: Keyboard Navigation & Shortcuts
- **Test Steps**:
  1. Focus Generic Name input, press `Tab` to navigate across Dosage, Frequency, Route, Duration.
  2. Test `Enter` and arrow key navigation within autocomplete dropdown.
- **Expected Results**:
  - Tab order flows sequentially across medication inputs without being trapped in condition badges.
- **Priority**: P2 | **Automated**: Manual

#### TC-CORE-03: Row Reordering & Deletion
- **Test Steps**:
  1. Create Row 1 (with CKD badge) and Row 2 (with Diabetes badge).
  2. Click "Move Down" on Row 1.
  3. Click the delete (trash) button on a row.
- **Expected Results**:
  - Rows reorder cleanly, keeping associated condition badges attached to their respective medication data.
  - Deleted row and its labels are cleanly removed from state.
- **Priority**: P1 | **Automated**: Yes

#### TC-CORE-04: Autosave & Draft Debounce Integration
- **Test Steps**:
  1. Add medication with condition labels on Step 8.
  2. Wait 3 seconds for draft debounced autosave.
  3. Refresh the page or reload the draft admission.
- **Expected Results**:
  - Data updates seamlessly via `formik.setFieldValue`.
  - Reloading the draft restores the medication row with its exact condition badges intact.
- **Priority**: P0 | **Automated**: Yes

---

## 3. Automation Execution Commands

All automated tests for Step 8 and the shared PrescriptionPad are verified 100% green against `https://qa_care.amerck.com`:

```powershell
# 1. Run Step 8 Drug History & Multi-Label integration tests
npx playwright test tests/drug-history-step8-integration.spec.js --reporter=list

# 2. Run Regression Views (Care View, OPD, Presets)
npx playwright test tests/regression-views.spec.js --reporter=list

# 3. Run all tests in interactive Playwright UI mode
npx playwright test --ui

# 4. View detailed HTML test report
npx playwright show-report
```

**Status**: **100% Passed (All tests green on live QA environment)**.
