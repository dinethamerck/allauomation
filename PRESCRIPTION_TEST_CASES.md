# QA Care EMR - Prescription Module Comprehensive Test Plan & Test Cases

**Application Under Test:** Amerck Care EMR (`https://qa_care.amerck.com`)  
**Target Module:** `/admin/prescription`  
**Test Suite Version:** 1.0  
**Test Environment:** QA Staging  
**Authentication Standard:** Role-Based Access Control (Physician / Clinical Provider)  
**Security Classification:** Confidential & HIPAA/Privacy Compliant  

---

## 1. Overview & Test Scope

The **Prescription Module** is the core clinical workflow component of the Amerck Care EMR system. It allows doctors and healthcare practitioners to:
1. Search and link registered patients or quickly register walk-in patients.
2. Record patient vitals, complaints, diagnoses, and medical histories.
3. Prescribe medications with dosages, durations, and auto-calculated expiration dates.
4. Auto-save in-progress consultation drafts with real-time sync and retry handling.
5. Finalize consultations with security PIN issuance and completion timestamps.
6. Dispatch prescriptions directly to the internal pharmacy.
7. Render and print high-fidelity PDF prescriptions with official hospital seal and doctor signature.
8. Share prescription links via WhatsApp with phone number validation.

---

## 2. Test Execution & Credential Protection Guidelines

> [!IMPORTANT]
> **Credential Security Notice:**
> - Test credentials must **never** be hardcoded directly into shared test scripts, public repositories, or plain-text logs.
> - Store credentials strictly in `.env` files protected by `.gitignore`.
> - In CI/CD pipelines (GitHub Actions, GitLab CI, Jenkins), inject credentials via encrypted secrets (`QA_CARE_USERNAME`, `QA_CARE_PASSWORD`).
> - The credentials for this test suite:
>   - **Username:** `Janitha01234`
>   - **Password:** `Janitha6868@`

---

## 3. Comprehensive Test Cases Table

| Test Case ID | Module / Feature | Test Scenario | Pre-conditions | Test Steps | Test Data | Expected Result | Priority | Type |
|---|---|---|---|---|---|---|---|---|
| **TC-AUTH-001** | Authentication | Valid Login with Provider Credentials | User is on `/login` page | 1. Enter username<br>2. Enter password<br>3. Click "Sign In" | User: `Janitha01234`<br>Pass: `Janitha6868@` | Successful login; user is redirected to dashboard or `/admin/prescription`. JWT/session cookie is stored securely. | Critical | Functional / Smoke |
| **TC-AUTH-002** | Authentication | Invalid Password Handling | User is on `/login` page | 1. Enter valid username<br>2. Enter invalid password<br>3. Click "Sign In" | User: `Janitha01234`<br>Pass: `WrongPass123!` | Authentication fails. Toast error message is displayed: "Invalid credentials" or similar. Form remains on login page. | High | Negative |
| **TC-AUTH-003** | Authentication | Password Masking & Visibility Toggle | User is on `/login` page | 1. Enter password<br>2. Click the eye toggle icon<br>3. Verify text visibility<br>4. Click eye toggle again | Pass: `Janitha6868@` | Characters are masked by default (`type="password"`). Clicking eye reveals plain text. Clicking again masks it. | Medium | UI / Security |
| **TC-AUTH-004** | Authentication | Direct URL Navigation Without Active Session | Browser cache/session cleared | 1. Directly navigate to `https://qa_care.amerck.com/admin/prescription` | N/A | System redirects user to `/login` with `from=/admin/prescription` redirect param preserved. | High | Security |
| **TC-AUTH-005** | Authentication | Session Expiry & Token Refresh | User is logged in | 1. Let session token expire or invalidate token<br>2. Attempt an action on prescription page | Expired session token | System alerts session expiration, prevents data loss, and prompts re-login. | Medium | Security |
| **TC-PAT-001** | Patient Management | Initial State: No Patient Selected | Logged in on `/admin/prescription` without `pid` | 1. Load `/admin/prescription` directly | URL has no `pid` param | Empty state card is displayed: "No patient selected" with description "Search or register a new patient to get started...". "Register Patient" button is visible. | High | UI / Functional |
| **TC-PAT-002** | Patient Management | Search & Select Existing Patient by Name | Patient records exist in DB | 1. Click patient search input (`Search by name, NIC or mobile number..`)<br>2. Type patient name `janitha0124`<br>3. Wait for cmdk autocomplete dropdown<br>4. Click matching item `janitha0124 (P#0000333566)` | Patient: `janitha0124` (Code: `P#0000333566`, ID: `333566`) | Dropdown appears with patient details. Clicking item navigates to `/admin/prescription?pid=333566`. Prescription unlocks clinical inputs, displays `Story` tab, and replaces empty card with patient bio. | Critical | Functional / E2E |
| **TC-PAT-007** | Patient Management | Search Patient by Mobile Number | Patient has registered mobile number | 1. Click patient search input<br>2. Type mobile number `0741222870`<br>3. Select patient from dropdown | Mobile: `0741222870` | Autocomplete displays patient `janitha0124`. Selecting patient navigates to `?pid=333566` and loads full prescription. | High | Functional |
| **TC-PAT-003** | Patient Management | Register New Patient via Wizard (NIC Format) | "No patient selected" state | 1. Click "Register Patient"<br>2. Enter valid 10-character (e.g. 123456789V) or 12-digit NIC in search/input<br>3. Proceed to new patient form | NIC: `199512345678` | System navigates to `/admin/patients/edit/new?nic=199512345678&from=/admin/prescription` with NIC pre-filled. | High | Functional |
| **TC-PAT-004** | Patient Management | Register New Patient via Wizard (Mobile Format) | "No patient selected" state | 1. Click "Register Patient"<br>2. Enter mobile number<br>3. Proceed to new patient form | Mobile: `0771234567` | System navigates to `/admin/patients/edit/new?mobile=0771234567&from=/admin/prescription`. | High | Functional |
| **TC-PAT-005** | Patient Management | Unsaved Draft Safeguard when Switching Patient | In-progress draft open for Patient A | 1. Select Patient A<br>2. Enter symptoms/treatments<br>3. Search and select Patient B | Patient A & Patient B | Modal dialog prompts user to confirm switching patient or discard/save current consultation draft. Prevents accidental overwrite. | High | Integrity / UX |
| **TC-PAT-006** | Patient Management | Patient Bio & Clinical Summary Sidebar | Patient selected (`pid` in URL) | 1. Select patient<br>2. Inspect right sidebar (desktop) or "Patient Details" tab (mobile) | Existing patient with medical records | Displays patient name, age, gender, contact number, known allergies, chronic medical problems, and past consultation history. | High | Functional |
| **TC-FN-PAT-GOTO-001** | Patient Management (POM) | Empty State Navigation Verification | User navigates to `/admin/prescription` | 1. Call `rxPage.goto()` without params<br>2. Assert URL contains `/admin/prescription`<br>3. Verify `noPatientCard` is displayed | N/A | Empty state card with "No patient selected" is visible. | High | POM / Unit-Functional |
| **TC-FN-PAT-GOTO-002** | Patient Management (POM) | Direct PID Navigation Verification | Active patient record | 1. Call `rxPage.goto('pid=333566')`<br>2. Assert URL contains `pid=333566`<br>3. Verify `todayTab` and patient heading visible | PID: `333566` | Clinical consultation form opens immediately with patient data. | Critical | POM / Unit-Functional |
| **TC-FN-PAT-SEARCH-001** | Patient Management (POM) | Autocomplete Search by Name | Patient in DB | 1. Call `rxPage.searchPatient('janitha0124')`<br>2. Assert first cmdk result visible | Name: `janitha0124` | Dropdown displays matching patient suggestion. | High | POM / Search |
| **TC-FN-PAT-SEARCH-002** | Patient Management (POM) | Autocomplete Search by Mobile Number | Patient in DB | 1. Call `rxPage.searchPatient('0741222870')`<br>2. Assert first cmdk result visible | Mobile: `0741222870` | Autocomplete returns patient item matching phone number. | High | POM / Search |
| **TC-FN-PAT-SEARCH-003** | Patient Management (POM) | Non-Existent Query Empty Dropdown Handling | Invalid query | 1. Call `rxPage.searchPatient('NonExistentPatientXYZ999')`<br>2. Verify dropdown indicates no results | Query: `NonExistentPatientXYZ999` | Dropdown displays "No patients found" empty state gracefully. | Medium | Negative / UX |
| **TC-FN-PAT-CLEAR-001** | Patient Management (POM) | Clear Patient Search Input | Search input populated | 1. Call `rxPage.clearPatientSearch()`<br>2. Assert `searchInput` value | N/A | Search input resets to empty string `""`. | Medium | POM / UI |
| **TC-FN-PAT-SELFIRST-001** | Patient Management (POM) | Select First Patient Dropdown Item | Autocomplete results displayed | 1. Call `rxPage.selectFirstPatient()`<br>2. Verify returned text | N/A | Returns selected patient label string and triggers selection. | High | POM / Functional |
| **TC-FN-PAT-SEARCHSEL-001** | Patient Management (POM) | Full Search & Select Workflow Navigation | Patient in DB | 1. Call `rxPage.searchAndSelectPatient('janitha0124')`<br>2. Assert page URL has `pid=333566` | Name: `janitha0124` | Combines search and click, navigating to patient prescription URL. | Critical | POM / E2E |
| **TC-FN-PAT-SEARCHSEL-002** | Patient Management (POM) | Patient Heading Verification After Selection | Patient selected | 1. Call `rxPage.getPatientHeading('janitha0124')`<br>2. Assert heading is visible | Name: `janitha0124` | Patient heading confirms active consultation session. | High | POM / Verification |
| **TC-FN-PAT-WIZARD-001** | Patient Management (POM) | Open Register Patient Wizard Modal | Empty state | 1. Call `rxPage.openPatientWizard()`<br>2. Assert `patientWizardModal` is visible | N/A | New Patient Wizard slide-over/dialog opens. | High | POM / Modal |
| **TC-FN-PAT-WIZARD-002** | Patient Management (POM) | Dismiss Register Patient Wizard Modal | Wizard open | 1. Call `rxPage.closePatientWizard()`<br>2. Assert modal is hidden | Escape key | Modal closes smoothly, returning to empty prescription view. | High | POM / Modal |
| **TC-FN-PAT-TABS-001** | Patient Management (POM) | Switch to Patient Story Tab | Patient selected | 1. Call `rxPage.switchToStoryTab()`<br>2. Assert Story tab state active | PID: `333566` | Story tab becomes active (`data-state="active"`). | High | POM / Navigation |
| **TC-FN-PAT-TABS-002** | Patient Management (POM) | Switch Back to Today Consultation Tab | Patient selected | 1. Call `rxPage.switchToTodayTab()`<br>2. Assert Today tab active and form visible | PID: `333566` | Today tab becomes active, unlocking clinical vitals/medications. | High | POM / Navigation |
| **TC-FN-PAT-STATE-001** | Patient Management (POM) | Patient Selection State Detection (`isPatientSelected`) | Various page states | 1. Check on `/admin/prescription` (expect `false`)<br>2. Check on `?pid=333566` (expect `true`) | N/A | Accurately returns boolean state based on active URL params. | High | POM / Helper |
| **TC-FN-PAT-DETAILSTAB-001** | Patient Management (POM) | Patient Details Tab Navigation (`switchToPatientDetailsTab`) | Patient selected | 1. Call `rxPage.switchToPatientDetailsTab()`<br>2. Assert page URL preserved | PID: `333566` | Switches to patient details tab on responsive viewports without state loss. | Medium | POM / Navigation |
| **TC-FN-NAV-SCHED-001** | Top Toolbar Navigation | Navigate to Schedule via Calendar Icon | User on `/admin/prescription` | 1. Call `rxPage.navigateToSchedule()`<br>2. Verify URL contains `/admin/schedule` | N/A | Opens Schedule view with calendar grid. | High | Navigation / Integration |
| **TC-FN-NAV-PAT-001** | Top Toolbar Navigation | Navigate to Patients via Users Icon | User on `/admin/prescription` | 1. Call `rxPage.navigateToPatients()`<br>2. Verify URL contains `/admin/patients` | N/A | Opens Patients directory table view. | High | Navigation / Integration |
| **TC-VIT-001** | Vitals & Clinical Data | Default Consultation Date Verification | Patient selected on "Today" tab | 1. Check Date field | Current date | Date field defaults to today's date formatted as `YYYY-MM-DD`. Field is required. | High | Validation |
| **TC-VIT-002** | Vitals & Clinical Data | Future Date Restriction | Patient selected | 1. Try to set consultation date to tomorrow or next week | Tomorrow's date | Form shows validation error or datepicker restricts future dates depending on clinic configuration. | Medium | Validation |
| **TC-VIT-003** | Vitals & Clinical Data | Blood Pressure (Systolic/Diastolic) Auto-Formatting | Patient selected | 1. Enter Systolic BP: `120`<br>2. Enter Diastolic BP: `80`<br>3. Inspect combined BP output | Systolic: `120`, Diastolic: `80` | Formik values automatically synchronize `bp` as `120/80`. | High | Functional |
| **TC-VIT-004** | Vitals & Clinical Data | Vitals Range Validation (BPM, Temp, RR) | Patient selected | 1. Enter Heart Rate (BPM): `72`<br>2. Enter Temperature: `98.6`<br>3. Enter Respiratory Rate: `18` | Vitals numerical data | Inputs accept valid numerical strings, update formik state, and trigger debounced auto-save. | Medium | Functional |
| **TC-VIT-005** | Vitals & Clinical Data | Systemic Examination Fields (Lungs, CVS, HC) | Patient selected | 1. Enter Lungs examination: "Clear to auscultation"<br>2. Enter CVS: "S1 S2 normal, no murmurs"<br>3. Enter Head Circumference: `45 cm` | Text descriptions | Values are persisted in consultation draft and reflected in print preview. | Medium | Functional |
| **TC-VIT-006** | Vitals & Clinical Data | Presenting Problems / Chief Complaints | Patient selected | 1. Enter presenting complaint text: "Fever and sore throat for 3 days"<br>2. Blur input | Text string | Input saves successfully; debounced auto-save triggers within 500ms. | High | Functional |
| **TC-VIT-007** | Vitals & Clinical Data | Other Clinical Notes & Observations | Patient selected | 1. Enter detailed observation in `other_notes`<br>2. Click outside input | Text observations | Draft retains text; save indicator updates to "All changes saved". | Medium | Functional |
| **TC-DX-001** | Diagnoses | Add Clinical Diagnosis Tag | Patient selected | 1. In Diagnosis section, search for condition (e.g. "Acute Pharyngitis")<br>2. Select from list | Diagnosis: "Acute Pharyngitis" | Diagnosis tag is added to `diagnosis` array and visible in UI chips/pills. | High | Functional |
| **TC-DX-002** | Diagnoses | Remove Diagnosis Tag | Diagnosis tag exists | 1. Click remove 'x' icon on diagnosis chip | Added diagnosis tag | Diagnosis is removed from `diagnosis` array and UI updates immediately. | Medium | Functional |
| **TC-DX-003** | Chronic Conditions | Update Patient Medical Problems | Patient selected | 1. Add chronic problem: "Type 2 Diabetes Mellitus"<br>2. Confirm addition | Medical problem string | Problem is saved to patient's chronic health profile and persists across future consultations. | High | Functional |
| **TC-DX-004** | Allergies | Record Critical Drug Allergies | Patient selected | 1. Add allergy: "Penicillin - Anaphylaxis"<br>2. Save | Drug allergy details | Allergy displays prominently in red/warning badge on patient summary card and prescription header. | Critical | Patient Safety |
| **TC-MED-001** | Medications | Add Single Medication | Patient selected | 1. Search medication (e.g. "Paracetamol 500mg")<br>2. Select Dosage (e.g. "1 tablet")<br>3. Select Frequency (e.g. "TDS / Three times daily")<br>4. Enter Duration (e.g. "5 days")<br>5. Add special instructions (e.g. "After meals") | Paracetamol 500mg, 1 tab, TDS, 5 days | Medication is added to `treatments` list with all dosage, frequency, and instructions correctly rendered. | Critical | Functional |
| **TC-MED-002** | Medications | Auto-Calculation of Expiration Date Based on Duration | Patient selected | 1. Add medication with Duration = "7 days"<br>2. Inspect calculated expiration | Duration: "7 days" | System parses duration via `zO()` utility and populates `expiration_date` exactly 7 days from today. | High | Business Logic |
| **TC-MED-003** | Medications | Modify Medication Dosage / Frequency | Existing medication in list | 1. Change frequency from "TDS" to "BD (Twice daily)"<br>2. Change duration to "3 days" | Updated dosage params | Prescription updates dynamically; auto-save saves changes to backend draft. | High | Functional |
| **TC-MED-004** | Medications | Delete Medication from Prescription | Medication exists in list | 1. Click delete / trash icon on medication row | Selected treatment item | Treatment is removed from `treatments` array. If no treatments remain, UI updates appropriately. | High | Functional |
| **TC-MED-005** | Medications | Drug Allergy Warning / Interaction Alert | Patient has known Penicillin allergy | 1. Add "Amoxicillin 500mg" to treatments list | Penicillin-allergic patient | System flags cross-reactive allergy warning or prevents prescription without doctor override acknowledgement. | Critical | Patient Safety |
| **TC-MED-006** | Medications | Preserve Prescribed Medicines on Consultation Save | Medicine entered in prescription | 1. Enter medication (e.g. "Metformin 500mg")<br>2. Click "Save" button | Valid medication details | Prescription persists medication without loss; consultation remains in valid draft state. | High | Functional |
| **TC-MED-007** | Medications | Medication Quick-Action Controls Readiness | Patient prescription open | 1. Verify "Add Medication", "Use Preset", and "Clear All" buttons | Consultation editor loaded | Action buttons are visible, enabled, and responsive to user interaction. | Medium | UI / Functional |
| **TC-MED-008** | Medications | Click "Clear All" to Reset Prescribed Medications | Prescriptions with 1+ medication rows | 1. Add/populate medication rows<br>2. Click "Clear All" button | Multiple medication rows | System resets all medication entries, removes appended rows, and returns to a single blank entry line. | High | Functional |
| **TC-SAVE-001** | Auto-Save Engine | Debounced Auto-Save on Text Input | Patient selected | 1. Modify presenting complaints or vitals<br>2. Stop typing for 500ms<br>3. Observe `#save-indicator` | In-progress draft | Save indicator shows "Auto-Saving..." with spinner, then transitions to "All changes saved" (green) and fades out after 2000ms. | Critical | Functional / UX |
| **TC-SAVE-002** | Auto-Save Engine | Network Failure & Retry Mechanism | Active draft editing | 1. Simulate network disconnect / offline state<br>2. Edit field | Offline network | Indicator shows "Saving failed. Retrying..." (amber). System retries up to 3 times (with 2-sec intervals). Upon persistent failure, displays error toast: "Changes couldn't be saved after multiple attempts." | High | Reliability |
| **TC-SAVE-003** | Auto-Save Engine | Manual "Save" Button Action | In-progress draft | 1. Click "Save" button in action bar | Valid draft data | Formik submits draft (`is_draft: true`), shows success toast, URL reflects `?id=<prescription_id>&pid=<patient_id>`. | High | Functional |
| **TC-SAVE-004** | Auto-Save Engine | Unload Protection (`beforeunload` event) | Unsaved changes in draft | 1. Make changes to draft<br>2. Attempt to close browser tab or reload immediately | Unsaved dirty state | Synchronous `XMLHttpRequest` triggers POST to `/admin/api/prescription/${id}` to flush pending changes before tab closes. | High | Data Integrity |
| **TC-SAVE-005** | Auto-Save Engine | Navigation Protection (`popstate` back button) | Unsaved changes in draft | 1. Make changes in prescription<br>2. Click browser back button | Unsaved dirty state | `popstate` listener cancels pending debounce and immediately triggers `eG` save call. | Medium | Data Integrity |
| **TC-STATE-001** | Consultation Lifecycle | End Consultation - Validation Check | Draft with missing mandatory fields | 1. Remove required fields (e.g. date)<br>2. Click "End Consultation" | Invalid draft | Toast error appears: "Please fill all required fields". Consultation remains open. | High | Validation |
| **TC-STATE-002** | Consultation Lifecycle | End Consultation - Confirmation Modal | Valid consultation draft | 1. Click "End Consultation" button | Valid draft | Confirmation modal (`x.lG`) opens asking confirmation to finalize consultation and optionally send to pharmacy. | High | Functional |
| **TC-STATE-003** | Consultation Lifecycle | End Consultation - Finalization & PIN Generation | In confirmation modal | 1. Click "Yes, End Consultation"<br>2. Observe state change | Finalize action | Prescription `is_draft` is set to `false`. System generates unique consultation PIN, locks fields from unauthorized edits, and refreshes UI. | Critical | Business Logic |
| **TC-STATE-004** | Consultation Lifecycle | "Use This" / Clone Past Prescription | Viewing completed prescription (`!is_draft`) | 1. Open a completed past prescription<br>2. Click "Use this" button | Completed prescription `id` | System creates a new draft cloned from past prescription (`from_id`), clears old dates/PINs/timestamps, sets today's date, and loads in editor. | High | Functional |
| **TC-PHARM-001** | Send to Pharmacy | Send to Pharmacy with No Medications | Prescription has 0 treatments | 1. Ensure `treatments` array is empty<br>2. Click "Send to Pharmacy" | Empty medications list | Toast error is displayed: "No medications found in this prescription". Dispatch is blocked. | High | Validation |
| **TC-PHARM-002** | Send to Pharmacy | Send to Pharmacy Confirmation Dialog | Prescription with valid medications | 1. Click "Send to Pharmacy" button | 1+ medications added | Modal displays: "Are you sure you want to send this prescription to your internal pharmacy for dispensing? This action cannot be undone." with "No" and "Yes" buttons. | High | Functional |
| **TC-PHARM-003** | Send to Pharmacy | Successful Dispatch to Pharmacy | Confirmed in modal | 1. Click "Yes" in Send to Pharmacy modal | Valid prescription, patient, doctor, org ID | Success toast appears: "Prescription sent to pharmacy successfully". Dispensing order created in pharmacy queue. | Critical | Integration |
| **TC-PRINT-001** | Print & PDF | Open Print Preview Modal | Saved prescription with patient selected | 1. Click "Print" button or press `Ctrl+P` | Saved prescription | Print preview modal (`el`) opens. Spinner shows "Please wait while we generate the prescription...". PDF is fetched from `/admin/api/prescription`. | High | Functional |
| **TC-PRINT-002** | Print & PDF | PDF Rendering via PDF.js Canvas / Iframe | Inside print preview modal | 1. Wait for PDF generation | Desktop and mobile devices | PDF is rendered cleanly. If touch/mobile detected, renders multi-page canvas images; on desktop, displays via embedded iframe/object. | High | UI / Compatibility |
| **TC-PRINT-003** | Print & PDF | "Print with Seal and Signature" Toggle | Print preview modal open | 1. Locate `#seal-toggle`<br>2. Toggle ON and OFF<br>3. Observe preview update | Doctor ID matches authorized practitioner | When ON, official clinic seal and digital signature are rendered on PDF. When OFF, preview regenerates without seal. | High | Functional |
| **TC-PRINT-004** | Print & PDF | Download PDF File | Inside print preview modal | 1. Click "Download" button | Generated PDF | Browser downloads PDF file with standardized filename (timestamp/patient ID). Download completes successfully. | High | Functional |
| **TC-PRINT-005** | Print & PDF | Native Browser Print Execution | Inside print preview modal | 1. Click "Print" button | Connected printer / Print to PDF | Native browser print dialog opens targeting the rendered iframe or popup window. Header/footer styling is preserved (`@media print`). | High | Functional |
| **TC-WA-001** | WhatsApp Sharing | Share via WhatsApp (Patient Mobile Available) | Patient has mobile number on file | 1. Click "Share" / WhatsApp icon<br>2. Click "Send via WhatsApp (<mobile>)" | Patient mobile: `0771234567` | Triggers POST to `/admin/api/prescription/share` with patient's mobile number. Success toast appears. | High | Integration |
| **TC-WA-002** | WhatsApp Sharing | Share via WhatsApp - Custom Mobile Prompt | Patient has no mobile or custom share | 1. Click "Send via WhatsApp"<br>2. Enter custom number in modal | Valid number: `+94771234567` | Validates format `07xxxxxxxxx` or `+xxxxxxxxxxxx`. Form submits and toast shows success. | High | Functional |
| **TC-WA-003** | WhatsApp Sharing | WhatsApp Number Validation - Invalid Format | WhatsApp modal open | 1. Enter invalid number: `1234`<br>2. Click "Send" | Invalid number `1234` | Form validation rejects submission; displays helper text: "Format: 07xxxxxxxxx or +xxxxxxxxxxxx". | Medium | Negative / Validation |
| **TC-UX-001** | Usability & Shortcuts | Keyboard Shortcut: Ctrl + S / Alt + S | Active prescription editor | 1. Modify any field<br>2. Press `Ctrl + S` or `Alt + S` | Keyboard shortcut | Browser default save dialog is suppressed (`e.preventDefault()`), and prescription form is submitted/saved. | Medium | Usability |
| **TC-UX-002** | Usability & Shortcuts | Keyboard Shortcut: Ctrl + P / Alt + P | Saved prescription | 1. Press `Ctrl + P` or `Alt + P` | Keyboard shortcut | Browser default print dialog is suppressed, and custom prescription print preview modal opens. | Medium | Usability |
| **TC-UX-003** | Responsive UI | Mobile Viewport Layout & Action Bar | Viewport width < 640px (Mobile) | 1. Resize browser or view on mobile device<br>2. Inspect bottom action bar and tabs | Screen width 375px | Desktop action buttons collapse into circular floating action buttons with tooltip icons (Save Draft, Print, Share, End Consultation). Tabs include "Patient Details" (Bio). | High | Responsive / UI |
| **TC-SEC-001** | Security & Privacy | Patient Confidentiality - Private Notes Separation | Prescription with private comments | 1. Add note in `private_comments`<br>2. Open Print preview<br>3. Check generated PDF | Private note entered | `private_comments` are displayed only to the doctor in the admin portal and are strictly excluded from the patient-facing printed PDF. | Critical | Security / HIPAA |
| **TC-SEC-002** | Security & Permissions | Permission Verification: Prescriptions Role | User account logged in | 1. Inspect decoded JWT permissions in user profile | Role permissions | User must possess the `Prescriptions` permission; otherwise access to `/admin/prescription` is blocked with unauthorized error. | Critical | Security |
| **TC-MAND-001** | Mandatory Fields | Patient Selection Mandate | Logged in on `/admin/prescription` without `pid` | 1. Load prescription page without patient id | URL with no `pid` | "No patient selected" card blocks clinical fields, showing registration and search prompts. | Critical | Validation / Security |
| **TC-MAND-002** | Mandatory Fields | Mandatory Consultation Date Verification | Patient selected (`pid=333566`) | 1. Inspect consultation date field | Default date | Field is visible, populated with valid `YYYY-MM-DD` date, and marked required. | High | Validation |
| **TC-MAND-003** | Mandatory Fields | Mandatory Medications for Pharmacy Dispatch | Patient selected, treatments cleared | 1. Clear all treatments<br>2. Click Send to Pharmacy | Empty medications list | Pharmacy dispatch is blocked or shows warning toast that medications are required. | High | Validation |
| **TC-BMI-001** | Clinical Calculations | Automatic BMI Calculation Formula Accuracy & Readonly State | Patient selected (`pid=333566`) | 1. Enter Weight: `70 kg`<br>2. Enter Height: `1.75 m`<br>3. Verify auto-calculated BMI (`70 / 1.75² = 22.86`)<br>4. Verify BMI field is readonly<br>5. Update to Weight: `80 kg`, Height: `1.80 m`<br>6. Verify BMI updates to `24.69` | Weight: 70kg/80kg, Height: 1.75m/1.80m | System computes accurate BMI value using standard metric formula and prevents manual tampering (readonly). | Critical | Clinical Accuracy |
| **TC-E2E-001** | Full Prescription Creation | Comprehensive End-to-End Prescription Workflow | Patient selected (`pid=333566`) | 1. Verify demographics<br>2. Enter chief complaints<br>3. Fill full vitals (BP, BPM, Temp, RR, Weight, Height, BMI, Lungs, CVS)<br>4. Enter Diagnosis<br>5. Prescribe multiple medications (dose, freq, duration)<br>6. Add management plan<br>7. Save draft | Vitals, complaints, multiple drugs, advice | All clinical components are recorded, BMI is verified accurate, and draft is saved with zero data loss. | Critical | End-to-End |
| **TC-GEN-001** | Post-Generation Workflow | Prescription Preview Modal Display & Control Verification | Prescription generated/saved (`pid=333566`) | 1. Trigger preview modal via `Ctrl+P`<br>2. Inspect modal elements | Generated prescription | Modal displays title "Prescription", generation/loading status, Close button, Download button, Print button, and top-right close 'x'. | High | Functional |
| **TC-GEN-002** | Post-Generation Workflow | Download Generated Prescription PDF File | Prescription preview modal open | 1. Click "Download" button in modal<br>2. Intercept download event | Active preview modal | Browser downloads generated PDF file with valid `.pdf` extension. | Critical | Functional / Integration |
| **TC-GEN-003** | Post-Generation Workflow | Prescription Preview Modal Dismissal (Close, X, Escape) | Prescription preview modal open | 1. Dismiss via bottom Close button<br>2. Dismiss via top-right 'x'<br>3. Dismiss via Escape key | Active preview modal | Modal dismisses smoothly for all three triggers while consultation editor remains intact. | Medium | UI / Usability |
| **TC-GEN-004** | Post-Generation Workflow | End Consultation Confirmation Dialog Validation & Dismissal Safeguards | Prescription in consultation editor | 1. Click "End Consultation" button<br>2. Inspect title and warning text<br>3. Dismiss via 'X' button<br>4. Re-open and dismiss via Escape key | Active consultation | Dialog opens with warning text. Dismissing via 'X' or Escape closes dialog without ending consultation. | High | Functional / UX |
| **TC-GEN-005** | Post-Generation Workflow | End Consultation Finalization & Trigger Generated Prescription Modal | Consultation ready to finalize | 1. Click "End Consultation" button<br>2. Click "Print & End Consultation" button<br>3. Inspect finalized URL and generated modal | Finalized prescription | Consultation finalizes, URL captures assigned ID, and Prescription preview modal opens automatically. | Critical | Functional / E2E |
| **TC-REP-001** | Lab Reports & Test Results | Add Reports Catalog Popup Display, Search Filter & Dismissal | Patient selected (`pid=333566`) | 1. Click "+ Add Reports"<br>2. Verify "Select Report" dialog, search input, catalog cards<br>3. Filter catalog by search term (e.g. `CRP`)<br>4. Dismiss via 'X' and Escape | Active consultation | Catalog dialog displays available investigation reports, search filters matching tests, and modal closes cleanly without page reload. | High | Functional / UX |
| **TC-REP-002** | Lab Reports & Test Results | Add Results Popup Fields Verification, Dynamic Row Append & Safeguards | Patient selected (`pid=333566`) | 1. Click "+ Add Results"<br>2. Verify "Add/Upload Test Results" dialog controls<br>3. Verify Test name, Result, Unit, Normal range inputs<br>4. Click "Add Test Field" to append row<br>5. Dismiss via 'X' and Escape | Active consultation | Modal opens with PDF upload and manual entry inputs. "Add Test Field" dynamically adds input rows. Dismissal keeps consultation intact. | High | Functional / Dynamic UI |
| **TC-REP-003** | Lab Reports & Test Results | Add Results Enter Manual Findings & Save to Prescription | Patient selected (`pid=333566`) | 1. Click "+ Add Results"<br>2. Enter test name (`Hemoglobin`), value (`14.2`), unit (`g/dL`), range (`13.8 - 17.2`)<br>3. Click "Save" button in dialog<br>4. Verify dialog closes and result reflects in prescription | Findings data | Manual lab results are saved to prescription findings section, and dialog closes cleanly. | Critical | Functional / Data Entry |
| **TC-CAB-001** | Drug Cabinet | Table & Column Header Verification | User on `/admin/drugs` | 1. Navigate to `/admin/drugs`<br>2. Verify table visibility<br>3. Verify headers: Generic Name, Brand Name, Strength, Frequency | N/A | Table loads with active drug inventory; column headers are clearly rendered. | High | UI / Functional |
| **TC-CAB-002** | Drug Cabinet | Toolbar & Action Controls Display | User on `/admin/drugs` | 1. Inspect top toolbar controls | N/A | Search input, "Add", "Presets", "Populate", and "Clear" buttons are visible and active. | High | UI / Navigation |
| **TC-CAB-003** | Drug Cabinet | Search & Filter Drugs by Generic Name | Inventory has records | 1. Enter drug name in search box (e.g. `Paracetamol`)<br>2. Inspect table rows | Query: `Paracetamol` | Table reactively filters to display only rows matching the search term. | Critical | Functional / Search |
| **TC-CAB-004** | Drug Cabinet | Clear Search Filter & Restore Full Inventory | Filtered search active | 1. Clear search input box or click "Clear"<br>2. Inspect table row count | Cleared query | Full inventory list is restored without needing a page refresh. | High | Functional |
| **TC-CAB-005** | Drug Cabinet | Add Drug Drawer / Modal Elements Verification | User on `/admin/drugs` | 1. Click "Add" button<br>2. Verify dialog title and input fields<br>3. Close dialog via close button | N/A | Slide-over drawer opens titled "Add Drug". Fields: Generic Name, Brand Name, Strength, Method, Frequency, Save. Closes cleanly. | High | UI / Validation |
| **TC-CAB-006** | Drug Cabinet | Create New Drug & Cabinet Persistence | User on `/admin/drugs` | 1. Click "Add"<br>2. Fill Generic Name, Brand Name, Strength, Method, Frequency<br>3. Click "Save"<br>4. Search for newly added drug | Test drug data | Drug is saved, dialog closes, and newly created drug is immediately searchable in the cabinet. | Critical | Functional / E2E |
| **TC-CAB-007** | Drug Cabinet | Edit Drug via Row Click & Update Fields | Existing drug in table | 1. Click table row of target drug<br>2. Verify "Edit Drug" dialog opens<br>3. Update Brand Name or Strength<br>4. Click "Save" | Updated values | Dialog opens pre-populated; modifications are saved and updated in the inventory table. | High | Functional / CRUD |
| **TC-CAB-008** | Drug Cabinet | Delete Drug via Edit Drawer | Existing drug in table | 1. Click table row of target drug<br>2. Click "Delete" button inside drawer<br>3. Search for deleted drug | Target drug | Drug is deleted from inventory; drawer closes and drug no longer appears in cabinet. | High | Functional / CRUD |
| **TC-CAB-009** | Drug Cabinet | Presets Dialog Display & Dismissal | User on `/admin/drugs` | 1. Click "Presets" button<br>2. Verify dialog appears<br>3. Press Escape key | N/A | Presets dialog opens cleanly and dismisses upon pressing Escape. | Medium | Functional / UX |

---

## 4. Dedicated Patient Flow Suite (`tests/patient_flow.spec.js`)

| Test Case ID | Feature / Component | Test Scenario | Pre-conditions | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|---|---|
| **TC-PAT-FLOW-001** | Empty State | Empty Prescription State Navigation | User on `/admin/prescription` | 1. Navigate to `/admin/prescription`<br>2. Check URL<br>3. Inspect cards | URL is clean without `pid`. "No patient selected" empty state card, "Register Patient" button, and search input are visible. | Critical | UI / Smoke |
| **TC-PAT-FLOW-002** | Selection State | Empty State Selection Status (`isPatientSelected`) | Empty state | 1. Call `rxPage.isPatientSelected()` | Returns `false`. | High | Functional |
| **TC-PAT-FLOW-003** | Autocomplete Search | Search by Name & Select Existing Patient | Patient in DB | 1. Search `janitha0124`<br>2. Wait for cmdk dropdown<br>3. Select first item | Navigates to `/admin/prescription?pid=333566`. Today & Story tabs become visible, patient heading rendered. | Critical | Functional / E2E |
| **TC-PAT-FLOW-004** | Autocomplete Search | Search by Mobile Number | Patient in DB | 1. Search `0741222870`<br>2. Select patient item | Navigates to `?pid=333566` and unlocks consultation form. | High | Functional |
| **TC-PAT-FLOW-005** | Search Input | Clear Search Query | Search populated | 1. Call `clearPatientSearch()`<br>2. Verify input value | Search input resets to empty string `""`. | Medium | UI |
| **TC-PAT-FLOW-006** | Negative Search | Non-Existent Patient Indicator | Invalid query | 1. Search `NonExistentPatientXYZ999` | Cmdk displays "No patients found" graceful empty state. | Medium | Negative / UX |
| **TC-PAT-FLOW-007** | Patient Wizard | Open & Dismiss Wizard via Escape | Empty state | 1. Click "Register Patient"<br>2. Press Escape key | New Patient Wizard dialog opens and dismisses cleanly. | High | Modal / UX |
| **TC-PAT-FLOW-008** | Patient Wizard | Dismiss Wizard via Dialog Close Button | Wizard open | 1. Click Close (X) button | Dialog closes returning to empty prescription view. | High | Modal / UX |
| **TC-PAT-FLOW-009** | Patient Wizard | Search Existing Identifier in Wizard | Wizard open | 1. Search `0741222870` in wizard | Displays matching patient card, "Add" button, and "Create New Patient" option. | High | Functional |
| **TC-PAT-FLOW-010** | Patient Wizard | Attach Patient via Wizard "Add" Button | Patient found in wizard | 1. Click "Add" button on patient card | Dialog closes, patient is attached, and URL updates to `?pid=...`. | Critical | Functional / E2E |
| **TC-PAT-FLOW-011** | Patient Wizard | Unregistered NIC Redirect to New Patient Form | Wizard open | 1. Search new NIC `199912345678` in wizard | Redirects to `/admin/patients/edit/new?nic=199912345678&from=/admin/prescription`. | High | Integration |
| **TC-PAT-FLOW-012** | Patient Wizard | Unregistered Mobile Redirect to Registration | Wizard open | 1. Search new mobile `0779998877` in wizard | Redirects to `/admin/patients/edit/new?mobile=0779998877&from=/admin/prescription`. | High | Integration |
| **TC-PAT-FLOW-013** | Patient Wizard | Wizard "Create New Patient" Button Action | Wizard search results | 1. Click "Create New Patient" button | Navigates to `/admin/patients/edit/new` form. | High | Functional |
| **TC-PAT-FLOW-014** | Consultation Navigation | Direct PID URL Navigation | Active patient record | 1. Navigate to `/admin/prescription?pid=333566` | Loads patient consultation immediately without search step. | High | Functional |
| **TC-PAT-FLOW-015** | Tabs Navigation | Story & Today Tab State Switching | Patient selected | 1. Click "Story"<br>2. Click "Today"<br>3. Verify form inputs | Tabs toggle correctly; clinical form inputs remain fully intact. | High | Navigation |
| **TC-PAT-FLOW-016** | Responsive Navigation | Patient Details Tab Navigation | Patient selected | 1. Call `switchToPatientDetailsTab()` | Preserves patient session across responsive viewport layouts. | Medium | Responsive / UI |
| **TC-PAT-FLOW-017** | Patient Switching | Seamless Patient Switching | Patient A active | 1. Search Patient B via top search bar<br>2. Select Patient B | Switches active consultation session to Patient B. | High | Functional / UX |

---

## 5. Schedule & Patients Function-by-Function Suite (`tests/functions.spec.js`)

| Test Case ID | Page Object / Module | Function Tested | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|---|
| **TC-FN-SCHED-INIT-001** | `SchedulePage` | `constructor(page)` | Inspect instance locators | `todayButton`, `dayViewButton`, `weekViewButton`, `monthViewButton`, `allAppointmentsButton` are defined. | High | POM / Unit |
| **TC-FN-SCHED-GOTO-001** | `SchedulePage` | `goto()` | Call `schedulePage.goto()` | Navigates to `/admin/schedule`, URL verified, today button visible. | High | POM / Functional |
| **TC-FN-SCHED-VIEW-001** | `SchedulePage` | `switchView(view)` | Switch to Day, Week, Month | Calendar view switches seamlessly between Day, Week, and Month modes. | High | Functional |
| **TC-FN-SCHED-TODAY-001** | `SchedulePage` | `clickToday()` | Click Today button on calendar | Re-centers calendar on current date. | Medium | Functional |
| **TC-FN-SCHED-ALLAPP-001** | `SchedulePage` | `clickAllAppointments()` | Click All Appointments button | Displays all scheduled clinic appointments. | Medium | Functional |
| **TC-FN-PATPAGE-INIT-001** | `PatientsPage` | `constructor(page)` | Inspect instance locators | `searchInput`, `patientTable`, `patientRows`, `newPatientButton` are defined. | High | POM / Unit |
| **TC-FN-PATPAGE-GOTO-001** | `PatientsPage` | `goto()` | Call `patientsPage.goto()` | Navigates to `/admin/patients`, patient table loaded with 1+ rows. | High | POM / Functional |
| **TC-FN-PATPAGE-SEARCH-001** | `PatientsPage` | `searchPatient(query)` | Enter query and press Enter | Directory table filters results matching search query. | High | POM / Functional |
| **TC-FN-PATPAGE-CLEAR-001** | `PatientsPage` | `clearSearch()` | Clear query and press Enter | Restores full patient inventory table. | Medium | POM / Functional |
| **TC-FN-PATPAGE-ROW-001** | `PatientsPage` | `selectPatientRow(index)` | Click patient row | Navigates to patient edit profile (`/admin/patients/edit/...`). | High | POM / Functional |

---

## 6. Admissions Module & Patient Admission Suite (`tests/admissions.spec.js`)

| Test Case ID | Category | Feature / Function | Preconditions | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|---|---|
| **TC-ADM-INIT-001** | Initialization | Direct Route Access | Auth state | 1. Navigate to `/admin/admissions` | Loads Admissions page with heading, tabs, search, and data table. | Critical | Smoke / Functional |
| **TC-ADM-INIT-002** | Navigation | Care View Toolbar Navigation | Care View open | 1. Click Admissions navbar icon (`a[href*="/admin/admissions"]`) | Seamlessly routes from Care View to Admissions page. | High | Navigation / Integration |
| **TC-ADM-INIT-003** | Schema | Clinical Table Headers Verification | Admissions loaded | 1. Read table headers | Displays `Hospital ID`, `Name`, `Age`, `Bed`, `Admitted For`, `Admitted On`, `Admitted By`, `Consultant`, and `Status`. | High | UI / Schema |
| **TC-ADM-TAB-001** | Tab State | Default Active Tab | Admissions loaded | 1. Check tab data-state attributes | "Admitted" tab is selected by default (`data-state="active"`). | High | UI / Functional |
| **TC-ADM-TAB-002** | Tab Switching | Switch to "Discharged" Tab | Admissions loaded | 1. Click "Discharged" tab | Switches active tab and presents discharged patients list. | High | Functional |
| **TC-ADM-TAB-003** | Tab Switching | Restore "Admitted" Tab | Discharged active | 1. Click "Admitted" tab | Restores active admitted patients table rows. | High | Functional |
| **TC-ADM-SRCH-001** | Live Search | Patient Name Filter | Admissions loaded | 1. Fill query `Dilumi` into search input | Instantly filters table to matching patient record. | Critical | Search / UX |
| **TC-ADM-SRCH-002** | Live Search | Clear Search Input | Filtered table | 1. Clear search input | Restores full inventory of admitted patients. | High | Search / UX |
| **TC-ADM-SRCH-003** | Live Search | Non-Existent Patient Query | Admissions loaded | 1. Fill non-existent query | Gracefully handles non-matching query with 0 rows or no match. | Medium | Negative / UX |
| **TC-ADM-MODAL-001** | Admit Modal | Open Search Patients Dialog | Admissions loaded | 1. Click "Admit Patient" button | Opens Search Patients modal with identifier input and action buttons. | High | Modal / Functional |
| **TC-ADM-MODAL-002** | Admit Modal | Dismiss Modal via Close Button | Modal open | 1. Click "Close" button | Closes modal cleanly and returns focus to admissions list. | High | Modal / UX |
| **TC-ADM-MODAL-003** | Patient Search | Identifier Lookup (NIC / Mobile) | Modal open | 1. Fill mobile `0741222870`<br>2. Click "Search" | Returns patient candidate card (`div.cursor-pointer`) and "Create New Patient" option. | High | Functional / Integration |
| **TC-ADM-ONBOARD-001** | Draft Handling | Active Draft Conflict Modal | Modal open | 1. Select patient with active draft | Displays "Existing Draft Admission Found" dialog with resolution options. | High | Conflict Handling / UX |
| **TC-ADM-ONBOARD-002** | Draft Handling | Continue Existing Draft Action | Conflict dialog open | 1. Click "Continue Existing Draft" | Routes to `/admin/admissions/onboarding/<id>?step=0`. | Critical | Functional / E2E |
| **TC-ADM-ONBOARD-003** | Onboarding | Clinical Workflow Multi-Step Form | Onboarding page open | 1. Inspect onboarding layout | Renders all 11 clinical workflow steps, Source, Reason, and Consultant options. | High | Form / Clinical |
| **TC-ADM-ONBOARD-004** | Onboarding | Return to Admissions List | Onboarding page open | 1. Click "Back to Admissions" button | Safely navigates back to `/admin/admissions` maintaining session state. | High | Navigation / Functional |
| **TC-ADM-ROW-001** | Table Navigation | Direct Patient Row Click | Admissions loaded | 1. Click patient row in table | Directly opens patient's admission onboarding session (`/admin/admissions/onboarding/...`). | Critical | Functional / E2E |
| **TC-ADM-PAG-001** | Pagination | Controls Visibility & Interaction | Admissions loaded | 1. Check "Previous" and "Next" buttons | Pagination controls are rendered and interactive. | Medium | UI / Functional |

---

## 7. Investigations Directory & Report Management Suite (`tests/investigations.spec.js`)

| Test Case ID | Category | Feature / Function | Preconditions | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|---|---|
| **TC-INV-INIT-001** | Initialization | Direct Route Access | Auth state | 1. Navigate to `/admin/investigations` | Loads Investigations directory with search input, action button, and table. | Critical | Smoke / Functional |
| **TC-INV-INIT-002** | Navigation | Care View Toolbar Navigation | Care View open | 1. Click Investigations navbar icon (`a[href*="/admin/investigations"]`) | Seamlessly routes from Care View to Investigations directory. | High | Navigation / Integration |
| **TC-INV-INIT-003** | Schema | Column Headers Verification | Directory loaded | 1. Read table headers | Displays `Abbreviation`, `Name`, `Description`, `Instructions`, and `Actions`. | High | UI / Schema |
| **TC-INV-SRCH-001** | Live Search | Report Name / Keyword Filter | Directory loaded | 1. Fill query `CBC` into search input | Instantly filters table to matching investigation records. | Critical | Search / UX |
| **TC-INV-SRCH-002** | Live Search | Clear Search Input | Filtered directory | 1. Clear search input | Restores full inventory of investigation reports. | High | Search / UX |
| **TC-INV-SRCH-003** | Live Search | Non-Existent Report Query | Directory loaded | 1. Fill non-existent query | Gracefully handles non-matching query with 0 rows. | Medium | Negative / UX |
| **TC-INV-MODAL-001** | Add Modal | Open Modal Controls Verification | Directory loaded | 1. Click "Add New Report" button | Opens modal with Abbreviation, Name, Description, Instructions, and Create Report button. | High | Modal / UI |
| **TC-INV-MODAL-002** | Add Modal | Dismiss Modal via Close Button | Modal open | 1. Click Close button | Closes modal cleanly without persisting changes. | High | Modal / UX |
| **TC-INV-CREATE-001** | CRUD: Create | Create New Report End-to-End | Directory loaded | 1. Open Add modal<br>2. Fill unique abbreviation & name<br>3. Fill description & instructions<br>4. Click "Create Report" | Persists report to database and displays record in directory table. | Critical | Functional / E2E |
| **TC-INV-EDIT-001** | CRUD: Read/Edit | Edit Modal Data Population | Report in table | 1. Click "Edit" on report row | Opens Edit modal pre-filled with existing report name, abbreviation, and details. | High | Functional / UI |
| **TC-INV-EDIT-002** | CRUD: Edit | Dismiss Edit Modal Without Changes | Edit modal open | 1. Click Close button | Dismisses Edit modal leaving existing record unchanged. | High | Modal / UX |
| **TC-INV-EDIT-003** | CRUD: Update | Update Report Details | Edit modal open | 1. Update description text<br>2. Click "Update Report" | Saves updates to backend and reflects new description in directory table. | Critical | Functional / E2E |
| **TC-INV-DEL-001** | CRUD: Delete | Delete Report & Directory Cleanup | Edit modal open | 1. Click "Delete Report"<br>2. Confirm deletion | Permanently removes report and verifies it no longer appears in directory. | Critical | Functional / E2E |
| **TC-INV-ROW-001** | Row Actions | Row Action Buttons Verification | Directory loaded | 1. Inspect table rows | Each row renders both "Create Template" and "Edit" action buttons. | High | UI / Functional |
| **TC-INV-PAG-001** | Pagination | Controls Visibility | Directory loaded | 1. Check "Previous" and "Next" controls | Pagination buttons are rendered and accessible. | Medium | UI / Functional |

---

## 8. Report Templates Management Suite (`tests/report_templates.spec.js`)

| Test Case ID | Category | Feature / Function | Preconditions | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|---|---|
| **TC-TMPL-INIT-001** | Initialization | Direct Route Access | Auth state | 1. Navigate to `/admin/report-templates` | Renders search bar, "New Template" button, and template cards list. | Critical | Smoke / Functional |
| **TC-TMPL-INIT-002** | Navigation | Care View Toolbar Navigation | Care View open | 1. Click Report Templates link (`a[href*="/admin/report-templates"]`) | Successfully routes to `/admin/report-templates`. | High | Navigation / Integration |
| **TC-TMPL-INIT-003** | Schema | Template Card Layout & Badges | Catalog loaded | 1. Inspect first template card | Card displays name, category badge, abbreviation badge, and description text. | High | UI / Visual |
| **TC-TMPL-SRCH-001** | Search | Keyword Filtering | Catalog loaded | 1. Type "Lipid" into search input | Real-time filters template catalog to matching entries. | Critical | Search / UX |
| **TC-TMPL-SRCH-002** | Search | Clear Search Input | Filtered catalog | 1. Clear search input | Restores full inventory of report templates. | High | Search / UX |
| **TC-TMPL-SRCH-003** | Search | Non-Existent Query Handling | Catalog loaded | 1. Type non-existent query | Gracefully displays "No templates found" empty state message. | Medium | Negative / UX |
| **TC-TMPL-FORM-001** | Form Navigation | Open New Template Creation Form | Catalog loaded | 1. Click "New Template" button | Routes to `/admin/report-templates/new` with Name, Abbreviation, Category, Description fields, and Back link. | Critical | Functional / UI |
| **TC-TMPL-FORM-002** | Form Navigation | Return to Catalog via Back Link | New template form | 1. Click "Back" link | Seamlessly navigates back to `/admin/report-templates` directory. | High | Navigation / Functional |
| **TC-TMPL-CREATE-001** | CRUD: Create | Create Report Template End-to-End | Catalog loaded | 1. Open New Template form<br>2. Fill Name, Abbreviation, Category, Description<br>3. Click "Save" | Persists template to backend, redirects to template editor, and verifies card is listed in directory. | Critical | Functional / E2E |
| **TC-TMPL-EDIT-001** | CRUD: Update | Edit Existing Template Details | Template card visible | 1. Click "Edit template" icon on card<br>2. Verify pre-populated values<br>3. Update description<br>4. Click "Save" | Saves changes and verifies updated description appears on template card in directory. | Critical | Functional / E2E |
| **TC-TMPL-DEL-001** | CRUD: Delete | Delete Template with Dialog Confirmation | Template card visible | 1. Click "Delete template" icon on card<br>2. Confirm "Delete Template" in alert dialog | Template is removed from directory and search confirms deletion. | Critical | Functional / E2E |
| **TC-TMPL-PAG-001** | Pagination | Pagination Controls & Summary | Catalog loaded | 1. Check summary text and navigation buttons | Displays "Showing X to Y of Z templates" with interactive Previous and Next controls. | Medium | UI / Functional |

---

## 9. Medical Documents & Letters Suite (`tests/documents.spec.js`)

The Medical Documents & Letters hub (`/admin/letters`) allows clinicians to draft, manage, and print official clinical letters and medical certificates. It supports AI-powered letter drafting, standardized templates (Referral, Medical Leave, Death Confirmation, Custom Letters), multi-view editors (Form, Split, Preview), patient combobox autocomplete, and draft persistence.

| Test Case ID | Test Category | Test Objective / Function | Preconditions | Execution Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|---|---|
| **TC-DOC-INIT-001** | Hub Initialization | Direct Navigation to Hub | Authenticated session | 1. Navigate to `/admin/letters`<br>2. Verify main container, tabs, and template cards | Route is `/admin/letters`; "Create Document" and "Recent Documents" tabs render with template cards visible. | Critical | Smoke / Functional |
| **TC-DOC-INIT-002** | Cross-Navigation | Navigation from Care View | Care View loaded | 1. Click "Documents" link in top navigation bar | Redirects seamlessly to `/admin/letters` hub with tabs and templates ready. | High | Navigation |
| **TC-DOC-INIT-003** | Template Catalog | Verify All 5 Template Cards | Documents hub loaded | 1. Verify AI Writer card<br>2. Verify Referral Letter card<br>3. Verify Medical Leave card<br>4. Verify Death Confirmation card<br>5. Verify Custom Letter card | All 5 template cards are visible with correct titles and action buttons. | High | UI / Functional |
| **TC-DOC-TAB-001** | Tab Switching | Seamless Tab Navigation | Documents hub loaded | 1. Click "Recent Documents" tab<br>2. Verify tab active state<br>3. Click "Create Document" tab | Tabs switch without errors; state toggles between `active` and inactive seamlessly. | Medium | UI / Functional |
| **TC-DOC-TAB-002** | Tab Switching | Recent Documents Catalog & Pagination | Documents hub loaded | 1. Switch to "Recent Documents" tab<br>2. Verify document catalog or empty state message<br>3. If populated, verify Previous/Next pagination | Renders latest letters list or "No letters found" state with functional navigation controls. | Medium | Functional |
| **TC-DOC-ROUTE-001** | Template Routing | "Create with AI" Routing | Create tab loaded | 1. Click "Create with AI" button on AI Writer card<br>2. Verify `/admin/letters/ai`<br>3. Click "Back to Letters" link | Navigates to AI Letter Generator page with Back button that returns to hub. | High | Navigation / Functional |
| **TC-DOC-ROUTE-002** | Template Routing | "Create Referral" Routing | Create tab loaded | 1. Click "Create Referral" button<br>2. Verify `/admin/letters/edit/new?type=referral`<br>3. Click "Back" button | Loads Referral letter editor with pre-selected type and returns cleanly via Back link. | High | Navigation / Functional |
| **TC-DOC-ROUTE-003** | Template Routing | "Create Certificate" (Medical Leave) | Create tab loaded | 1. Click "Create Certificate" on Medical Leave card<br>2. Verify `/admin/letters/edit/new?type=medical-leave`<br>3. Click "Back" button | Loads Medical Leave certificate editor and returns to hub via Back button. | High | Navigation / Functional |
| **TC-DOC-ROUTE-004** | Template Routing | "Create Certificate" (Death Confirmation) | Create tab loaded | 1. Click "Create Certificate" on Death Confirmation card<br>2. Verify `/admin/letters/edit/new?type=death-confirmation`<br>3. Click "Back" button | Loads Death Confirmation editor with registrar & cause-of-death inputs, and returns cleanly. | High | Navigation / Functional |
| **TC-DOC-ROUTE-005** | Template Routing | "Create Custom" Routing | Create tab loaded | 1. Click "Create Custom" button<br>2. Verify `/admin/letters/edit/new?type=custom`<br>3. Click "Back" button | Loads Custom Letter editor with blank fields and returns to hub via Back button. | High | Navigation / Functional |
| **TC-DOC-FORM-001** | Editor Controls | Comprehensive Editor Controls Presence | Editor loaded | 1. Open Custom Letter editor<br>2. Verify patient search input, recipient inputs, greeting, subject, body, Save Draft, Print, Finalize buttons | All form fields and action controls are present and visible. | High | UI / Functional |
| **TC-DOC-FORM-002** | Editor Controls | View Mode Switchers (Form, Split, Preview) | Editor loaded | 1. Click "Preview" view switcher<br>2. Verify preview panel<br>3. Click "Form" view switcher | View modes toggle dynamically; editor fields remain intact across mode switches. | Medium | UI / Functional |
| **TC-DOC-FORM-003** | Editor Validation | Save Draft Disabled without Patient | Editor loaded | 1. Verify "Save Draft" button status<br>2. Verify status badge text | "Save Draft" is strictly disabled; status badge displays "Draft • No patient selected". | Critical | Validation / Functional |
| **TC-DOC-CREATE-001** | CRUD: Create | Patient Selection & Draft Persistence | Editor loaded | 1. Search and select patient via cmdk combobox<br>2. Verify status badge updates to "Draft • Patient: [Name]"<br>3. Verify Save Draft enables<br>4. Fill recipient, greeting, subject, body<br>5. Click "Save Draft"<br>6. Verify URL updates to `/admin/letters/edit/[id]`<br>7. Return to Recent Documents and verify letter card | Creates draft, updates URL with document ID, and lists new letter card in Recent Documents tab. | Critical | Functional / E2E |
| **TC-DOC-EDIT-001** | CRUD: Update | Existing Draft Viewing & Updating | Recent tab loaded | 1. Open saved draft from Recent Documents<br>2. Verify form is populated with saved values<br>3. Update body text<br>4. Click "Save Draft"<br>5. Return to Recent Documents and verify persistence | Loads existing draft, updates content, persists changes via backend API, and confirms persistence. | Critical | Functional / E2E |

---

## 10. Test Execution Instructions

### A. Manual Execution
1. Open Google Chrome or Microsoft Edge.
2. Navigate to `https://qa_care.amerck.com/login` or `https://qa_pg.amerck.care/login`.
3. Log in with the credentials defined in your local `.env`.
4. Work through the test cases sequentially, marking status in the corresponding spreadsheet or Jira issue.

### B. Automated Execution (Playwright)
To execute the automated regression test suite:
1. Ensure dependencies are installed: `npm install`
2. Run the tests:
   ```bash
   npx playwright test
   ```
3. Run specific test suites:
   ```bash
   npx playwright test tests/documents.spec.js
   npx playwright test tests/report_templates.spec.js
   npx playwright test tests/investigations.spec.js
   npx playwright test tests/admissions.spec.js
   npx playwright test tests/patient_flow.spec.js
   ```
4. To view interactive UI mode:
   ```bash
   npx playwright test --ui
   ```
5. To view the HTML test execution report:
   ```bash
   npx playwright show-report
   ```
