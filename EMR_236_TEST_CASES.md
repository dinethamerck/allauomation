# EMR-236: "Consultation" Quick Select Button for Any Doctor's Appointment

**Feature ID**: `EMR-236`
**Area**: EMR (Amaran) → Schedule → Appointment Details → **Consultation** button → appointment page → Consultation tab
**Code reviewed**: `emr-frontend` fix commit `7bff0b8` ("doctor can consulte other oppinmnts", branch `origin/EMR-236`), merged into **`qa_release/1.1.11.1`** (`df1a8e6`). `emr-backend/src` is the local copy; it has no EMR-236 change.
**Checked on QA**: 2026-11-12, `qa_pg.amerck.care`, logged in as Dr. Parami Gamage (doctor with the "Aesthetic Consultations" permission). The fix **is deployed**: the button shows on Dr. Kavini's appointments.
**Automation**: [`tests/emr-236.spec.js`](tests/emr-236.spec.js) (24 tests; see section 8)

> **Branch note.** The local `emr-frontend` checkout is `qa_release/1.1.7.2` and doesn't contain EMR-236. The code below was read from `origin/qa_release/1.1.11.1` (refs fetched 2026-11-12 15:2x) without changing the working tree.

---

## 1. Summary

| | Result |
|---|---|
| Button for appointments of **other doctors** | ✅ Shown on QA (AC 1) |
| Button opens that appointment's consultation | ✅ Opens with no "view once completed" block (AC 2) |
| Own appointments | ✅ Unchanged for doctors with the permission (AC 4). ⚠️ Doctors **without** "Aesthetic Consultations" no longer see the button, even on their own appointments (TC-022). Confirm with PO. |
| **New risk, confirmed on QA** | ❌ **Just opening** the Consultation tab creates a consultation record under **the doctor who looked** (BP-1). Since EMR-236 the appointment page also **opens on the Consultation tab for every appointment** (BP-2). So a doctor who only clicks a colleague's appointment link becomes that consultation's doctor, and the appointment can no longer be deleted. |

**Recommendation:** EMR-236 meets its acceptance criteria for the button itself, but don't release it before BP-1/BP-2 are fixed. Opening the button up to every doctor turns a hidden side effect into wrong clinical attribution across the clinic.

---

## 2. What the Fix Changed (code review of `7bff0b8`)

**Before**, three separate places decided access, each a bit differently:

| Place | Old rule |
|---|---|
| Appointment Details button (`appointment-details.jsx`) | permission check **and** `appointment.doctor.id === profile.id`, or consultation `completed`. The permission check was written as `hasPermissions(perms, "Aesthetic Module", "Aesthetic Consultations")`. The second name lands in the `isClinical` parameter, so only "Aesthetic Module" was actually checked. |
| Appointment page tab (`[id]/page.js`) | `appointment.doctor_id === profile.id`, or `completed` (no permission check) |
| Consultation form (`[id]/edit-form.jsx`) | `hasPermissions(perms, ["Aesthetic Module","Aesthetic Consultations"])` (any-of) **and** assigned doctor. Otherwise: *"You will be able to view this consultation once it has been completed."* |

**After**, one helper is used in all three places:

```js
// lib/utils.js:127
export function canConsultAppointment(profile) {
  return !!profile?.doctor &&
    hasPermissions(profile?.decoded?.permissions, "Aesthetic Consultations");
}
```

| Place | New rule |
|---|---|
| Button | `canConsultAppointment(profile) \|\| consultation completed` (`appointment-details.jsx:574, 856`) |
| Page tab + **default tab** | Same rule (`page.js:159, 250, 275`). With no `?tab`, the page now opens **Consultation** for every appointment when the user passes the rule (`page.js:162-168`). |
| Form gate | Same rule (`edit-form.jsx:384, 398-404`). Editing: `canEdit = !completed && !!profile.doctor` (`edit-form.jsx:354`). |

**Unchanged:** the backend. `GET /aesthetic/appointments/:id/consultations` has its doctor check commented out (`aestheticController.js:383-392`). `POST /aesthetic/consultations` has no access check, and on create it sets `doctor_id = logged-in user` (`aestheticService.js:766-788`).

**Who passes the new rule**

| User | Consultation not started / draft | Consultation completed |
|---|---|---|
| Doctor + "Aesthetic Consultations" (any action, even read-only `r---`) | Button ✅ · opens · **can edit and complete** | Button ✅ · read-only |
| Doctor without "Aesthetic Consultations" | Button hidden | Button ✅ · read-only |
| Non-doctor (front desk, nurse) **with** "Aesthetic Consultations" | Button hidden | Button ✅ · read-only |
| Any other user (cashier etc.) | Button hidden | Button ✅ · read-only (no permission check on the "completed" path) |

---

## 3. Evidence from QA (2026-11-12)

Logged in as Dr. Parami Gamage (user 187). Dr. Kavini Amandi is user 148. Fictional clients.

| # | Action | Result |
|---|---|---|
| 1 | Appointment Details of Dr. Parami's own appointment (#1006) | Buttons: **Consultation**, History, Scheduling, Treatments, Invoices, Confirmation, Reschedule |
| 2 | Appointment Details of **Dr. Kavini's** appointment (#1007) | Same buttons, **Consultation included** (fix deployed) |
| 3 | `GET /appointments/1008/consultations` ×3, then open Appointment Details | No consultation created ✅ |
| 4 | Open `/appointments/1008?tab=emr` and **type nothing** | Page sends `POST /aesthetic/consultations {patient_id, appointment_id, consultation_data, organization}` → **draft #234, `doctor_id` 187 (Dr. Parami)** on Dr. Kavini's appointment ❌ |
| 5 | Open `/appointments/1012` **without `?tab`** (as the Appointment Log, invoice and Treatment Room links do) | Active tab **Consultation** → `POST` sent → **draft #235, `doctor_id` 187** ❌ |
| 6 | Delete the appointments afterwards | `400 "Cannot delete appointment with existing consultation"` ❌. They had to be soft-deleted (status `deleted`). |
| 7 | Two tabs on one draft: A saves a note, then B (holding the older copy) saves a weight (TC-031) | Weight saved, **A's note gone** ❌ (last write wins) |
| 8 | Save a completed consultation again through the API (TC-032) | `200`, note changed after sign-off ⚠️ |
| 9 | Save "completed" twice with one treatment (TC-034) | **2** planned sessions instead of 1 ⚠️ |
| 10 | Send `doctor_id` of another doctor in a save request (TC-042) | Ignored ✅. The QA backend does **not** let the doctor be rewritten, unlike the local backend copy. |

---

## 4. Break Points

| ID | Break point | Code | Risk | Status | Test |
|---|---|---|---|---|---|
| **BP-1** | **Opening the Consultation tab creates a consultation.** Without any input, the form saves a blank consultation (`POST /aesthetic/consultations`). The backend creates it with `doctor_id` = the viewer. Before EMR-236 only the assigned doctor got here; now every doctor does. | `edit-form.jsx` (some input fires its change handler on first render) + `aestheticService.js:784-786` | **High**: wrong doctor on clinical records; appointment becomes undeletable; empty records | ❌ Confirmed on QA | TC-027 |
| **BP-2** | **Default tab is now Consultation for every appointment.** `page.js:162-168` uses `isAssignedDoctor`, which now means "can consult", so tab-less links open Consultation. Combined with BP-1, a doctor who clicks an appointment link in the **Appointment Log** (`aesthetic-appointments/page.js:433`), an **invoice** (`aesthetic-finances/invoice-view.jsx:93`) or **Treatment Room** (`TreatmentForm.jsx:106`, `TreatmentItem.jsx:196`) creates a consultation under their name. | `page.js:159-168` | **High** | ❌ Confirmed on QA | TC-028 |
| **BP-3** | **A draft is credited to whoever opened it first.** `doctor_id` is set when the consultation is created, and BP-1 creates it on viewing. While the consultation is a draft, the record names the first viewer (TC-027, TC-030). **On QA, completing it re-credits the doctor who completed it** (TC-030 ✅). The local backend copy would keep the first saver. | `aestheticService.js:784-786` (local), QA backend differs | Medium | Drafts: open · completed: ✅ | TC-027, TC-030 |
| **BP-4** | ~~"Completed by" changes after reload~~. On QA the completing doctor is shown before **and** after reload. | `edit-form.jsx:323-345` | — | ✅ Not reproducible on QA | TC-030 |
| **BP-5** | **Two doctors in one draft: last write wins.** Every autosave sends the whole consultation (`update(data)`), with no version check. The other doctor's answers, treatments or prescription are lost silently. EMR-236 makes this realistic. | `edit-form.jsx:60-73`, `aestheticService.js:778-782` | High | Open | TC-031 |
| **BP-6** | **Reading a consultation has no access check.** On QA any logged-in user can read any consultation through the API (cashier → `200` with the clinical note; TC-036). Saving **is** protected on QA (`403 "Only doctors with consultation access can save a consultation"`; TC-037), and the doctor can't be rewritten (TC-042). The local backend copy has neither save check. | `aestheticController.js:383-392` (read check commented out) | High (privacy) | ❌ Read open · ✅ save protected | TC-036, TC-037, TC-042 |
| **BP-7** | **Completed consultations aren't locked in the backend.** The UI is read-only, but `POST /consultations` still updates a completed consultation. | `aestheticService.js:778-782` | Medium | Open | TC-032 |
| **BP-8** | **Read-only permission still edits.** `hasPermissions` passes for any non-dash action (`r---`), and `canEdit` checks only `!completed && profile.doctor`. | `utils.js` `hasPermissions`, `edit-form.jsx:354` | Medium | Open | TC-024 |
| **BP-9** | **Completed consultations are visible to every user.** The `consultationStatus === "completed"` path has no permission check. A QA account **without** "Aesthetic Consultations" opens a completed consultation and reads the clinical notes (TC-026). This existed before; AC 3 makes it more visible. | `appointment-details.jsx:856`, `page.js:250, 275` | Medium (privacy) | Confirmed on QA · confirm intended | TC-026 |
| **BP-10** | **Doctors without "Aesthetic Consultations" lose the button on their own appointments.** The old dialog check effectively required only "Aesthetic Module". | `utils.js:127-132` vs old code | Medium (AC 4) | Verify per role | TC-022 |
| **BP-11** | **Rule ignores the appointment.** The button shows on "No Patient Needed" appointments (nothing can be saved: autosave needs `patient_id`), on cancelled / no-show appointments, and on appointments with no doctor. | `canConsultAppointment(profile)` | Medium | Open (PO) | TC-005, TC-006, TC-007 |
| **BP-12** | **Patient can be changed from a colleague's consultation.** The consultation's patient panel (`handlePatientSelected`) updates the appointment's client. Every permitted doctor can now do that on any appointment. | `edit-form.jsx:302-313` | Medium | Open (PO) | TC-035 |
| **BP-13** | **Completing twice duplicates planned sessions.** Each save with `status: "completed"` runs `createTreatmentsForScheduling(... shouldDestroyExisting: false)`. Two doctors completing, or one completing twice, doubles the sessions. | `aestheticController.js:368-374` | Medium | Open | TC-034 |
| **BP-14** | **Medicines go to the consulting doctor's drug list.** New drugs are stored with `doctor_id` = current user's doctor, so Dr. B's personal list fills from Dr. A's patients. | `aestheticService.js:790-826` | Low | Open | TC-035 |
| **BP-15** | **No org check** on reading a consultation by appointment id. | `getConsultationsByAppointmentId` | High (security) | Needs 2nd org | TC-038 |
| **BP-16** | **Confusing name.** `isAssignedDoctor` now means "can consult" (`appointment-details.jsx:573`, `page.js:158`). Future changes may treat it as "assigned". | — | Low | Code quality | Review |

---

## 5. Test Cases

**Roles needed**

| Role | Account |
|---|---|
| **Dr P** | Doctor with "Aesthetic Consultations" (QA: Dr. Parami Gamage) |
| **Dr K** | Another doctor (QA: Dr. Kavini Amandi); needs its own login for TC-016 |
| **Dr N** | Doctor **without** "Aesthetic Consultations" |
| **FD** | Front desk (no doctor profile) **with** "Aesthetic Consultations" |
| **CA** | Cashier (no clinical permissions) |

Accounts for Dr N, FD and CA still need to be created on QA. Use fictional clients (`@example.com`).

### A. Button visibility (AC 1, AC 4)

| TC | Scenario | Steps | Expected | Priority | QA 2026-11-12 |
|---|---|---|---|---|---|
| TC-001 | Dr P, **own** appointment, no consultation | Schedule → open own appointment | Consultation button shown | High | ✅ |
| TC-002 | Dr P, **Dr K's** appointment, no consultation | Schedule → open Dr K's appointment | Consultation button shown | High | ✅ |
| TC-003 | Dr P, Dr K's appointment, **draft** started by Dr K | Dr K types in the consultation; Dr P opens the appointment | Button shown; Dr K's answers visible | High | ✅ (draft seeded via API) |
| TC-004 | Dr P, Dr K's appointment, **completed** consultation | Dr K completes; Dr P opens | Button shown; read-only | High | ✅ |
| TC-005 | Appointment with **no doctor** | Book without a doctor → open | Agreed behaviour (PO); no error | Medium | Button shown, no error |
| TC-006 | **"No Patient Needed"** appointment | Book without a client → open | Button hidden, or a clear "no client" message. Today it opens a form that can't save. | Medium | Button shown; form opens, nothing saved, no error |
| TC-007 | **Cancelled / No-show / Deleted** appointment | Set the status → open | Agreed behaviour (PO); at least read-only | Medium | Button shown on cancelled |
| TC-008 | Same rule from **every entry point** | Open Dr K's appointment from: Schedule, Scheduling-tab calendar, History tab list, Client profile → Appointments | Button shown everywhere | High | ✅ Schedule, client profile, History (calendar: manual) |
| TC-009 | Page refreshed while the dialog opens | Reload Schedule, open Dr K's appointment straight away | Button appears once the profile has loaded; no flicker of a wrong state | Low | |

### B. Opening the consultation (AC 2)

| TC | Scenario | Steps | Expected | Priority | QA |
|---|---|---|---|---|---|
| TC-010 | Button opens the right consultation | Dr P → Dr K's appointment → **Consultation** | `/appointments/{id}?tab=emr`; Consultation tab active; correct client and date | High | ✅ (tab shown) |
| TC-011 | Dr P can work on Dr K's draft | Answer questions, add treatment, product, prescription, follow-up; reload | All saved; values back after reload | High | ✅ (follow-up note) |
| TC-012 | Dr P completes Dr K's consultation | Complete | Status completed, read-only; planned sessions created **once** | High | ✅ (recorded doctor: Dr P) |
| TC-013 | Page shows the Consultation tab | Open Dr K's appointment page | Tab list includes **Consultation** | High | ✅ |
| TC-014 | No "view once completed" block | Open the tab as Dr P on Dr K's draft | Form shown, no block message | High | ✅ |
| TC-015 | No access by URL | Dr N / CA opens `/appointments/{id}?tab=emr` (not completed) | Clear message; no blank page; **no record created** | Medium | ✅ No record created (Dr N) |

### C. Consultations by any doctor (AC 3)

| TC | Scenario | Steps | Expected | Priority | QA |
|---|---|---|---|---|---|
| TC-016 | Assigned doctor sees a colleague's consultation | Dr P completes Dr K's consultation; **Dr K** logs in and opens it | Dr K sees it; "completed by **Dr P**" | High | ✅ |
| TC-017 | Read-only view for non-doctors | FD opens a completed consultation | Button shown; form read-only | Medium | ✅ |
| TC-018 | **Print** a consultation done by another doctor | Dr P completes Dr K's; Print | Doctor name, SLMC no. and signature match the agreed rule (performing doctor, not first viewer) and match "completed by" | High | |
| TC-019 | History lists all doctors' consultations | Client with consultations by Dr P and Dr K → History tab | Both listed with the right doctor names | Medium | |

### D. Own appointments unchanged (AC 4)

| TC | Scenario | Steps | Expected | Priority | QA |
|---|---|---|---|---|---|
| TC-020 | Own appointment flow | Dr P: open own appointment → Consultation → edit → complete | Same as before EMR-236 | High | ✅ (button) |
| TC-021 | Own appointment without `?tab` | Open own appointment page by link | Opens on Consultation (as before) | Medium | ✅ |
| TC-022 | Doctor **without** "Aesthetic Consultations", own appointment | Dr N opens own appointment | Agreed behaviour. **Before**: button shown (only "Aesthetic Module" was checked). **Now**: hidden. Confirm with PO (AC 4). | High | Hidden (current rule) |
| TC-023 | (see E) Front desk **with** the permission, draft | FD opens Dr K's draft | Hidden (rule needs a doctor profile) | High | ✅ Hidden |

### E. Permissions

| TC | Scenario | Steps | Expected | Priority | QA |
|---|---|---|---|---|---|
| TC-023 | Front desk **with** "Aesthetic Consultations" | FD opens Dr K's appointment (draft) | Hidden (rule needs a doctor profile). Confirm with PO: the business value mentions front-desk workflows | High | |
| TC-024 | Doctor with **read-only** Consultations (`r---`) | Open Dr K's draft | Read-only (expected). Today: editable (BP-8) | Medium | |
| TC-025 | User with only "Aesthetic Module" | Open Dr K's draft | Hidden | Medium | |
| TC-026 | Cashier, **completed** consultation | CA opens the appointment | Agreed behaviour. Today: visible to everyone (BP-9) | Medium | Button shown; cashier reads the clinical note (current rule) |

### F. Data integrity (break points)

| TC | Scenario | Steps | Expected | Priority | QA |
|---|---|---|---|---|---|
| TC-027 | **Viewing doesn't create a record** | Dr P opens Dr K's Consultation tab, types nothing, leaves | No `POST /consultations`; no consultation exists | **Critical** | ❌ Draft created under Dr P (#234) |
| TC-028 | **Links don't create records** | Dr P opens Dr K's appointment from Appointment Log, an invoice, Treatment Room | Lands on an agreed tab; **no consultation created** | **Critical** | ❌ Opens Consultation, draft under Dr P (#235) |
| TC-029 | Attribution | Dr P opens Dr K's appointment first (no typing); Dr K then does and completes the consultation | Record, print and "completed by" show the agreed doctor (Dr K) | High | Draft: Dr P (viewer) ❌ · after completion: the completing doctor (see TC-030) |
| TC-030 | "Completed by" stays the same after reload | Dr K only opens (draft under Dr K); Dr P completes; reload | Same name before and after reload | Medium | ✅ "Parami Gamage" both times |
| TC-031 | Two doctors at once | Dr P and Dr K open the same draft in two browsers and edit different questions | No silent loss: both changes kept, or a clear conflict warning | High | ❌ First tab's note lost (two tabs, one user) |
| TC-032 | Completed is locked | After completion: UI read-only; `POST /consultations` with changes | UI read-only; API **403/409** (today: updates) | Medium | ⚠️ 200, changed (known gap) |
| TC-033 | Viewing doesn't block delete | Dr P views Dr K's appointment; then delete it (no real consultation) | Delete rules unchanged (today: "Cannot delete appointment with existing consultation") | High | ❌ |
| TC-034 | No duplicate sessions | Complete twice / Dr P and Dr K both complete | Planned sessions created once | Medium | ⚠️ 2 sessions (known gap) |
| TC-035 | Side effects of consulting another doctor's patient | Dr P adds a new medicine; changes the client in the patient panel | Medicine goes to the agreed doctor's list; client change follows the PO rule and is traceable | Low | |

### G. API / security

| TC | Scenario | Request | Expected | Priority | QA |
|---|---|---|---|---|---|
| TC-036 | Read without permission | CA: `GET /aesthetic/appointments/{id}/consultations` (draft) | 403 | High | ❌ 200, clinical note returned (known gap) |
| TC-037 | Save without permission | CA / FD: `POST /aesthetic/consultations` | 403 | High | ✅ 403 "Only doctors with consultation access can save a consultation" |
| TC-038 | Other clinic | User of clinic B reads clinic A's appointment id | 403 / 404 | High | Needs 2nd org |
| TC-042 | Doctor on the record can't be rewritten | Dr P: `POST /aesthetic/consultations` with `doctor_id` of Dr K on an existing consultation | Doctor unchanged | High | ✅ |

### H. Regression

| TC | Scenario | Expected | Priority |
|---|---|---|---|
| TC-039 | Other buttons in Appointment Details (History, Scheduling, Treatments, Invoices, Confirmation, Reschedule, Quick Schedule) for own and other appointments | Unchanged | Medium |
| TC-040 | Consultation status lookup fails (offline) | Permitted doctors still see the button; others don't; other buttons work | Low |
| TC-041 | Button row on tablet / phone width | Layout intact (2 / 3 / 5 columns) | Low |

---

## 6. Questions for the PO

1. Should another doctor be able to **edit** a colleague's in-progress consultation, or only **view** it?
2. Which doctor goes on the record and the print when Dr B consults Dr A's appointment: the appointment's doctor, the doctor who completes it, or the first one who opened it (today)?
3. Should **front desk** see the button (the business value mentions front-desk workflows)? Today they can't unless the consultation is completed.
4. Should doctors **without** "Aesthetic Consultations" keep the button on their **own** appointments (AC 4)?
5. Should **completed** consultations be visible to every user, including cashiers?
6. Should the button show for "No Patient Needed", cancelled or no-show appointments?

---

## 7. Test Data Left on QA

While checking the baseline, opening the Consultation tab created **empty draft consultations #232–#235** (`doctor_id` 187) on test appointments #1006, #1007, #1008 and #1012. There is no API to delete consultations, so the appointments were **soft-deleted** (status `deleted`). The drafts remain attached to them. All clients are fictional (`@example.com`).

The automated suite works the same way: **every full run leaves about 13 consultations** (drafts and completed) on soft-deleted appointments, until BP-1 is fixed and an API to delete consultations exists. Run it when needed rather than on every build.

---

## 8. Automation

**File:** [`tests/emr-236.spec.js`](tests/emr-236.spec.js), desktop Chromium only.

```bash
npx playwright test tests/emr-236.spec.js --project=chromium          # full run (creates QA data, see section 7)
npx playwright test tests/emr-236.spec.js --project=chromium -g "TC-027"   # one test
npm run test:report                                                    # results, screenshots, traces
```

- `QA_USERNAME` must be a **doctor with "Aesthetic Consultations"** (Dr P). Otherwise the suite skips itself with the reason.
- **Role tests** use the accounts in `.env`: `EMR236_DRK_USERNAME`/`_PASSWORD` (another doctor: TC-016, TC-030), `EMR236_NOPERM_…` (TC-022 + TC-015), `EMR236_FRONTDESK_…` (TC-023 + TC-017), `EMR236_CASHIER_…` (TC-026, TC-036, TC-037).
- After logging in, each role test **checks that the account fits its role** (doctor or not; has "Aesthetic Consultations" or not). It skips with the reason instead of passing for the wrong reason.

**Role accounts (set up 2026-11-12, at the user's request)**

| `.env` role | Account | Type |
|---|---|---|
| `EMR236_DRK` | user 931 | Doctor with "Aesthetic Consultations". **Onboarding finished** with test values: phone 0712349310, address "No. 25, Flower Road, Colombo 07", licence `QA-931`; the existing speciality (Dermatologist) was kept. |
| `EMR236_NOPERM` | **user 938, `qa_dr_ruwan`**, "Dr. Ruwan Jayasekara", ruwan.jayasekara@example.com | **New**: clinical user (doctor profile), role **Default** only, so no "Aesthetic Consultations". Onboarded. |
| `EMR236_FRONTDESK` | **user 932** (existing front-desk account) | Not a doctor, with "Aesthetic Consultations". TC-023/017 ✅ with it. Alternative created for the tests: **user 939, `qa_frontdesk_ishara`**, "Ishara Weerakoon" (non-clinical, role **Doctor**, onboarded), kept commented out in `.env`. |
| `EMR236_CASHIER` | user 488 | Non-doctor, role Default (no "Aesthetic Consultations") |

- Dr. Ruwan Jayasekara has a doctor profile, so he appears as an **extra doctor column** on the Schedule. To remove both new accounts after testing: Settings → Users → open the user → deactivate.
- Their passwords are only in `.env` (random, never shown).

**Side finding (onboarding wizard, not EMR-236):** clicking **Next** while the cursor is still in a text field does nothing the first time; the second click works. `NextButton` is a component defined inside the wizard's render, so the blur re-render replaces the button between mouse-down and mouse-up (`components/welcome/wizard.js`). From the code, a failed step save also leaves the button disabled, because `setLoading(false)` is skipped when `updateOnboarding` throws.
- `EMR236_READONLY=1` skips every test that creates data.
- Test data: the fictional clients from EMR-237, appointments on Feb–Mar 2028. Each test writes `appointment #id · client` into the report.

**Latest results (2026-11-12, QA)**

| Result | Tests |
|---|---|
| ✅ Passed (19) | TC-001, 002, 003, 004, 005, 006, 007, 008, 010 (+013/014), 011, 012, 021, 042 · roles: **016**, **030**, **022/015**, **023/017**, **026** (current rule), **037** |
| ⚠️ Known defects, marked as expected failures (6) | EMR-236 risks: **TC-027** (viewing creates a consultation under the viewer, and the appointment can't be deleted), **TC-028** (tab-less link opens Consultation and creates one), **TC-031** (last write wins). Older backend gaps: TC-032 (completed consultation still changeable through the API), TC-034 (completing twice duplicates planned sessions), TC-036 (cashier can read consultations through the API). |
| ⏭ Skipped | none |

Known-defect tests show as ✓ ("expected failure") while the defect is still there. They still record what they observed (for example the draft created by viewing). When a defect is fixed, its test turns **red** ("expected to fail, but passed"); then remove its `test.fail(...)` line so it becomes a normal check.

**Running from VS Code**
- `playwright.config.js` loads `.env` with `override: true`. The VS Code extension keeps its test process alive between runs, and without this it kept using old `.env` values (TC-022 once ran with the cashier account for that reason).
- Don't run the suite from VS Code and the terminal at the same time. Every run empties `test-results`, which breaks the other run's traces (that's how TC-001 once failed with *"ENOENT … .playwright-artifacts-0\traces"*).

25 tests in total. These results come from the full run plus re-runs of the tests changed afterwards (TC-007, TC-008, TC-031, TC-042) and the role-test run with the new accounts.

**Manual only:** TC-009, TC-018 (print), TC-019, TC-035, TC-038 (second clinic), TC-040, TC-041, and the Scheduling-tab calendar entry point of TC-008.
