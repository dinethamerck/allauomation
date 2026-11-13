# EMR-78: Admission Investigation & Template Management
## Comprehensive QA Test Case Specification & Master Verification Matrix (T001 – T052)

**Ticket Reference**: `EMR-78`  
**Module**: EMR → Admission Module & Admission Investigation Templates  
**Target Environment**: AMERCK CARE Live QA (https://qa_care.amerck.com)  
**Author**: Antigravity QA Automation  
**Automation Framework**: Playwright (Node.js)  

---

## 1. Executive Summary & Objective

**EMR-78** encompasses the end-to-end clinical workflow for **Admission Investigations**, combining:
1. **Template Management (`/admin/admission-investigations`)**: 
   - Super Admin and clinical administrators create, configure, view, edit, copy, and delete investigation templates.
   - Templates support custom sections, investigation parameters, and arbitrary multi-level nested hierarchies (e.g. `1.1` → `1.1.1` → `1.1.1.1` → `1.1.1.1.1`).
2. **Admission Wizard Step 2 Investigation Entry (`/admin/admissions`)**:
   - Positioned as the **2nd step** in the Admission wizard immediately following Presenting Complaints.
   - Features **Blood Group** capture (single global capture per admission: `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`, and `Custom`).
   - Dynamic date-based investigation table (`Date 1`, `Date 2`, `Date 3`, `+ Add Date Column`) with calendar selectors and delete capability.
   - Comprehensive parameters matrix:
     - **General Investigations**: `FBS`, `S. Creatinine`, `S. Electrolytes`, `LFT`, `S. Protein`, `Lipid Profile`, `FBC`, `Differential Count (DC)`, `BT`, `ESR – First Hour`, `Fibrinogen Level`, Cultures, `HIV`, `HBsAg`.
     - **LFT Sub-Parameters**: `Total Cholesterol`, `HDL`, `LDL`, `Triglycerides`, `VLDL`, `Non-HDL`, `Total/HDL Ratio`, `LDL/HDL Ratio`.
     - **UFR Sub-Parameters**: Physical Examination (4), Chemical Examination (9), Microscopic Examination (9).
     - **Urine Culture + ABST**: Specimen Information, Culture, Antibiotic Sensitivity (`S`/`I`/`R`/`MIC`), Final Report.
3. **Data Integrity & Isolation**:
   - Results are saved independently per date without overwriting existing columns.
   - Values are strictly isolated per patient admission.

---

## 2. Master Test Cases Specification Matrix (T001 – T052)

| Test ID | Category / Module | Test Summary & Objective | Preconditions | Test Steps | Expected Result | Priority | Automated |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **T001** | Permission / Access Control | Verify Admission Investigation is enabled when Admission permission is enabled by Super Admin | Super Admin has access to permission management; Admission permission is disabled initially | 1. Login as Super Admin<br>2. Navigate to Permission Management<br>3. Enable the Admission permission for the required user/role<br>4. Save the permission changes<br>5. Login as the assigned user<br>6. Navigate to EMR → Admission | Admission module becomes accessible and the Investigation option/tab is enabled and available under Admission | High | Manual / E2E |
| **T002** | Permission / Access Control | Verify Admission Investigation is disabled when Admission permission is disabled | Admission permission is disabled for the user/role | 1. Login as the assigned user<br>2. Navigate to EMR | Admission and its Investigation functionality are not accessible to the user | High | Manual / E2E |
| **T003** | Create Template | Verify user can create an Admission Investigation Template | User has permission to manage Admission Investigation Templates | 1. Navigate to `/admin/admission-investigations`<br>2. Click `Create Template`<br>3. Enter valid Template Name & Description<br>4. Add sections, parameters and groups<br>5. Click `Save` / `Create Template` | Template is created successfully and confirmation message is displayed | High | **Yes** |
| **T004** | Create Template | Verify Template Name is mandatory | Create Template modal is open | 1. Leave `Template Name` blank<br>2. Enter other valid details<br>3. Click `Save` / `Create Template` | Validation message is displayed / Save is disabled and template is not created | High | **Yes** |
| **T005** | Create Template | Verify template can be created with only the mandatory field | Create Template modal is open | 1. Enter only a valid Template Name<br>2. Click `Save` / `Create Template` | Template is created successfully | Medium | **Yes** |
| **T006** | Create Template | Verify user can add multiple sections | Create Template modal is open | 1. Click `Add Section` repeatedly<br>2. Add 3 or more sections with different names<br>3. Save template | All added sections are saved and displayed correctly | High | **Yes** |
| **T007** | Create Template | Verify parameters can be added to a section | At least one section is created | 1. Click `Add Parameter`<br>2. Enter parameter details<br>3. Save | Parameter is added under the selected section | High | **Yes** |
| **T008** | Create Template | Verify multiple parameters can be added to a section | A section exists | 1. Add multiple parameters to the same section | All parameters are displayed in the correct section | High | **Yes** |
| **T009** | Create Template | Verify groups can be added to a section | A section exists | 1. Click `Add Group`<br>2. Enter group details<br>3. Save | Group is added successfully under the selected section | High | **Yes** |
| **T010** | Create Template | Verify nested sub-items can be created | A group exists | 1. Add sub-items such as `1.1` → `1.1.1` → `1.1.1.1` → `1.1.1.1.1` | Nested hierarchy is created and displayed correctly | High | **Yes** |
| **T011** | Create Template | Verify template supports multiple levels of nesting | Create Template page is open | 1. Create nested groups/sub-items across several levels | All levels are saved without data loss or hierarchy errors | High | **Yes** |
| **T012** | Create Template | Verify section without parameters can be saved | Template creation page is open | 1. Add a section without adding parameters<br>2. Inspect placeholder | Section displays `No parameters in this section. Click "Add Parameter" to begin.` where applicable | Medium | **Yes** |
| **T013** | Create Template | Verify duplicate Template Name validation | A template with the same name already exists | 1. Create another template using the existing Template Name | System prevents duplicate creation or displays appropriate validation | High | **Yes** |
| **T014** | Create Template | Verify created template appears under Admission → Investigation | Template has been successfully created | 1. Navigate to Admission → Step 2: Investigation | Created template is available under the Investigation template combobox | High | **Yes** |
| **T015** | View Template | Verify user can view the created template | Template exists | 1. Navigate to `/admin/admission-investigations`<br>2. Click `View` (eye icon) on template row | Template details, sections, parameters, groups and nested items are displayed correctly | High | **Yes** |
| **T016** | View Template | Verify template hierarchy is displayed correctly | Template contains nested groups | 1. Open the template in View mode | Sections, groups and sub-items appear in the same hierarchy/order as configured | High | **Yes** |
| **T017** | View Template | Verify template description is displayed correctly | Template has a description | 1. Open template in View mode | Correct description is displayed | Medium | **Yes** |
| **T018** | Edit Template | Verify user can edit Template Name | Template exists | 1. Click `Edit` (pencil icon)<br>2. Change Template Name<br>3. Save | Updated Template Name is saved and displayed | High | **Yes** |
| **T019** | Edit Template | Verify user can edit template description | Template exists | 1. Open Edit<br>2. Modify Description<br>3. Save | Updated description is displayed | Medium | **Yes** |
| **T020** | Edit Template | Verify user can add a new section while editing | Template exists | 1. Open Edit<br>2. Click `Add Section`<br>3. Save | New section is added successfully | High | **Yes** |
| **T021** | Edit Template | Verify user can add a parameter while editing | Template exists | 1. Open Edit<br>2. Select section → `Add Parameter`<br>3. Save | New parameter is added under the selected section | High | **Yes** |
| **T022** | Edit Template | Verify user can add a new group while editing | Template exists | 1. Open Edit<br>2. Click `Add Group`<br>3. Save | New group is added successfully | High | **Yes** |
| **T023** | Edit Template | Verify user can modify nested sub-items | Template contains nested groups | 1. Edit an existing nested sub-item<br>2. Save | Updated nested item is displayed correctly without affecting other hierarchy levels | High | **Yes** |
| **T024** | Edit Template | Verify user can remove a parameter | Template contains parameters | 1. Open Edit<br>2. Delete/remove a parameter<br>3. Save | Selected parameter is removed successfully | High | **Yes** |
| **T025** | Edit Template | Verify user can remove a section | Template contains multiple sections | 1. Open Edit<br>2. Remove a section<br>3. Save | Selected section and its associated items are removed | High | **Yes** |
| **T026** | Delete Template | Verify user can delete an Admission Investigation Template | Template exists | 1. Click `Delete` (trash icon)<br>2. Confirm deletion | Template is deleted successfully and no longer appears in the template list | High | **Yes** |
| **T027** | Delete Template | Verify delete confirmation popup is displayed | Template exists | 1. Click `Delete` on template row | Confirmation popup is displayed before deletion | High | **Yes** |
| **T028** | Delete Template | Verify template is not deleted when deletion is cancelled | Delete confirmation popup is displayed | 1. Click `Cancel` / `No` on confirmation popup | Popup closes and template remains available | High | **Yes** |
| **T029** | Delete Template | Verify deleted template is no longer available under Admission → Investigation | Template has been deleted | 1. Navigate to Admission → Step 2: Investigation | Deleted template is not displayed in the combobox | High | **Yes** |
| **T030** | Copy Template | Verify user can copy an existing template | Existing template is available | 1. Select template<br>2. Click `Copy` icon | Copy template screen/dialog is displayed with existing template configuration | High | **Yes** |
| **T031** | Copy Template | Verify copied template contains all sections | Existing template contains multiple sections | 1. Copy template<br>2. Save | New template contains all original sections | High | **Yes** |
| **T032** | Copy Template | Verify copied template contains all parameters | Existing template contains parameters | 1. Copy template<br>2. Save | All parameters are copied correctly | High | **Yes** |
| **T033** | Copy Template | Verify copied template contains nested groups/sub-items | Existing template contains multi-level nested items | 1. Copy template<br>2. Save | Complete nested hierarchy is copied correctly | High | **Yes** |
| **T034** | Copy Template | Verify copied template can have a different name | Existing template exists | 1. Click Copy<br>2. Change Template Name<br>3. Save | New template is created with the new name | High | **Yes** |
| **T035** | Copy Template | Verify copied template does not modify the original template | Original template exists | 1. Copy template<br>2. Modify copied template<br>3. Save<br>4. Open original template | Original template remains unchanged | High | **Yes** |
| **T036** | Admission Investigation | Verify created template is available under Admission → Investigation | Template has been created | 1. Navigate to Admission → Step 2: Investigation | Created investigation template is listed/displayed | High | **Yes** |
| **T037** | Admission Investigation | Verify user can open the created template from Admission → Investigation | Template exists under Investigation | 1. Navigate to Admission → Step 2: Investigation<br>2. Select template | Selected template opens successfully | High | **Yes** |
| **T038** | Admission Investigation | Verify configured sections are displayed when entering investigation values | Template contains multiple sections | 1. Open template from Admission → Investigation | All configured sections are displayed | High | **Yes** |
| **T039** | Admission Investigation | Verify parameters are available for entering investigation values | Template contains parameters | 1. Open template<br>2. Enter values against parameters | User can enter values for the configured parameters | High | **Yes** |
| **T040** | Admission Investigation | Verify values can be entered for multiple parameters | Template contains multiple parameters | 1. Enter different values for each parameter<br>2. Save | All entered values are saved against the correct parameters | High | **Yes** |
| **T041** | Admission Investigation | Verify values can be entered against nested sub-items | Template contains nested sub-items | 1. Navigate through nested hierarchy<br>2. Enter values | Values can be entered against the appropriate nested items | High | **Yes** |
| **T042** | Admission Investigation | Verify entered values remain after saving | Investigation values have been entered | 1. Save values<br>2. Exit template<br>3. Reopen the investigation | Previously entered values are retained and displayed correctly | High | **Yes** |
| **T043** | Admission Investigation | Verify entered values are associated with the correct patient/admission | Patient has an active admission | 1. Open Admission → Investigation<br>2. Enter values<br>3. Save<br>4. Reopen patient admission | Values are displayed only against the relevant patient's admission | **Critical** | **Yes** |
| **T044** | Admission Investigation | Verify different patients have separate investigation values | At least two patients/admissions exist | 1. Enter values for Patient A<br>2. Save<br>3. Open Patient B<br>4. Open same template | Patient B does not display Patient A's values | **Critical** | **Yes** |
| **T045** | Admission Investigation | Verify editing an investigation value updates the existing value | Previously saved values exist | 1. Open investigation<br>2. Modify an existing value<br>3. Save | Updated value is displayed correctly | High | **Yes** |
| **T046** | Admission Investigation | Verify empty optional parameters can be saved | Template contains optional parameters | 1. Leave optional parameters empty<br>2. Save | Investigation is saved without validation errors | Medium | **Yes** |
| **T047** | Admission Investigation | Verify configured parameter order is maintained | Template contains parameters in a specific order | 1. Create template with ordered parameters<br>2. Open under Admission → Investigation | Parameters appear in the configured order | Medium | **Yes** |
| **T048** | Admission Investigation | Verify configured section order is maintained | Template contains multiple sections | 1. Create sections in a specific order<br>2. Open investigation | Sections appear in the configured order | Medium | **Yes** |
| **T049** | Data Persistence | Verify template configuration persists after logout/login | Template has been created | 1. Logout<br>2. Login<br>3. Navigate to Admission → Investigation | Template and its configuration remain available | High | **Yes** |
| **T050** | Data Persistence | Verify copied template remains available after refresh | Template has been copied successfully | 1. Refresh the page<br>2. Navigate to Admission → Investigation | Copied template remains available with complete configuration | Medium | **Yes** |
| **T051** | Negative | Verify unsaved template changes are not incorrectly persisted | Existing template is available | 1. Edit template<br>2. Make changes<br>3. Navigate away without saving | System prompts appropriately or does not persist unsaved changes | Medium | **Yes** |
| **T052** | Permission | Verify users without template management permission cannot create/edit/delete templates | User does not have required permission | 1. Login with restricted role<br>2. Navigate to Admission Investigation Template | Create/Edit/Delete actions are hidden or access is denied | High | Manual / E2E |

---

## 3. Admission Wizard Step 2 Investigation Specifications

### 3.1 Stepper Placement
- **Step Position**: Step 2 (immediately under `1. Presenting Complaint`).
- **Sidebar Stepper Item**: `2. Investigation`.

### 3.2 Blood Group Capture
- **Placement**: Rendered directly above the Investigation Table.
- **Controls**: Standard single-select badges (`A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`) + `Custom` button.
- **Data Rule**: Captured once per admission; does **not** duplicate per date.

### 3.3 Dynamic Date Columns
- **Default Columns**: `Date 1`, `Date 2`, `Date 3`.
- **Add Action**: `+ Add Date Column` appends `Date #(N+1)` with its own date-picker.
- **Delete Action**: Column trash icon removes unwanted columns.
- **Data Non-Overwriting**: Adding date columns does **not** erase entered values in previous columns.

### 3.4 Full Parameter Hierarchy
1. **General Investigations**:
   - `FBS`, `S. Creatinine`, `S. Electrolytes`, `LFT`, `S. Protein`, `Lipid Profile`, `FBC`, `Differential Count (DC)`, `BT`, `ESR – First Hour`, `Fibrinogen Level`, `Throat Swab Culture`, `Nasal Swab Culture`, `Groin Swab Culture`, `Sputum Culture + ABST`, `HIV`, `HBsAg`.
2. **LFT Sub-Parameters**:
   - `Total Cholesterol`, `HDL Cholesterol`, `LDL Cholesterol`, `Triglycerides`, `VLDL Cholesterol`, `Non-HDL Cholesterol`, `Total Cholesterol/HDL Ratio`, `LDL/HDL Ratio`.
3. **UFR Sub-Parameters**:
   - *Physical Examination*: `Colour`, `Appearance`, `Specific Gravity`, `Volume`.
   - *Chemical Examination*: `pH`, `Protein`, `Glucose`, `Ketones`, `Blood`, `Bilirubin`, `Urobilinogen`, `Nitrite`, `Leukocyte Esterase`.
   - *Microscopic Examination*: `RBC`, `WBC / Pus Cells`, `Epithelial Cells`, `Casts`, `Crystals`, `Bacteria`, `Yeast`, `Mucus`, `Other Findings`.
4. **Urine Culture + ABST**:
   - *Specimen Information*: `Specimen Type`, `Collection Date/Time`, `Received Date/Time`.
   - *Culture*: `Culture Result`, `Organism`, `Colony Count`, `Significant Growth`.
   - *Antibiotic Sensitivity*: Antibiotic Name, `Sensitive (S)`, `Intermediate (I)`, `Resistant (R)`, `MIC`.
   - *Final Report*: `Interpretation`, `Comments`, `Report Status`, `Reported Date/Time`, `Pathologist/Microbiologist`.

---

## 4. Test Execution Commands

```powershell
# 1. Execute Template Management Test Suite (T003 - T037)
npx playwright test tests/investigation-template-management.spec.js --reporter=list

# 2. Execute Step 2 Investigation & Date Matrix Test Suite (T038 - T048, Blood Group, Columns)
npx playwright test tests/investigation-step2.spec.js --reporter=list

# 3. Execute Both EMR-78 Suites Together
npx playwright test tests/investigation-*.spec.js --reporter=list

# 4. Run interactively with Playwright UI Runner
npx playwright test --ui

# 5. Open HTML Test Execution Report
npx playwright show-report
```
