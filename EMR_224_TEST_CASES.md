# EMR-224: Unable to Delete Created Appointments and Treatments

**Feature ID**: `EMR-224`
**Status on board**: QA Ready · **Tested**: 2026-11-09 on QA (`BASE_URL`, API `pg_api_emr_dev.amerck.care`)
**Test Suite File**: [`tests/emr-224.spec.js`](file:///c:/Users/LENOVO/Desktop/aergertuc/tests/emr-224.spec.js)
**Code reviewed**: `emr-backend/src` (routes, controllers, services, models, migrations) + `emr-frontend/app`

> **The deployed QA build is ahead of the local repos again.** Treatment delete is **already fixed on QA** (in-use treatments are deactivated). The local `emr-backend` still hard-deletes. Appointment delete is **not fixed** on QA. Get the EMR-224 branch for both repos before code sign-off.

---

## 1. Verdict

| Part of the ticket | QA result | Ticket status |
|---|---|---|
| Delete a **treatment** (Settings → Treatments) | ✅ Unused → deleted. In use → **deactivated** with message *"Treatment is already in use, so it was deactivated and will no longer be available"*. Hidden from the list and Add Items. Scheduled history kept. | **Pass** |
| Delete an **appointment** | ❌ **No Delete button** on Appointment Details. The backend also refuses any appointment that has a treatment scheduled into it, because of a wrong check. | **Fail: reopen** |

---

## 2. Root Causes (code)

| ID | Root cause | Where | Evidence on QA |
|---|---|---|---|
| **RC-1** | **Delete button commented out.** `AlertDialogTrigger` has no child, so the "Delete Appointment / Are you sure?" dialog can never open. Both Schedule and Availability pass `onDelete`, but there's nothing to click. | `emr-frontend/app/admin/aesthetic-schedule/appointment-details.jsx:841-849` | Appointment Details buttons: Confirmation, Reschedule, Quick Schedule, Close. **No Delete** (TC-001) |
| **RC-2** | **Wrong association in the "scheduled treatments" check.** `treatmentsForScheduling` is defined with `foreignKey: "scheduled_appointment_id"`, so it loads treatments booked **into this appointment**. For those rows `scheduled_appointment_id` = this id, so `some(t => t.scheduled_appointment_id !== null)` is **always true**. Every appointment created from Treatment Room / Scheduling is undeletable. The intended check was this appointment's **own planned** treatments (`appointment_id = id`) that were scheduled elsewhere. | `emr-backend/src/services/aestheticService.js` `deleteAppointment` (~L2355) + `database/models/aestheticAppointment.js:26-29` | `DELETE` → **400 "Cannot delete appointment with scheduled treatments"** for an appointment with just one session booked into it (TC-020) |
| **RC-3** | *(local code only, fixed on QA)* Treatment hard `destroy`. FK `Aesthetic_Treatments_For_Scheduling.treatment_id` has **no ON DELETE** rule, so MySQL RESTRICTs and the API returns 500 for any treatment ever planned. | `aestheticService.js` `deleteTreatment` (~L1023), migration `20251110095145` | QA returns 200 + `softDeleted: true` (TC-012) |
| **RC-4** | **Delete-rule bypass through status.** The status menu offers **"Deleted"**, which calls `PUT /appointments/:id`. `updateAppointment` does `appointment.update(data)` with **no checks**. Appointments with a consultation, invoice or scheduled treatments can still be "deleted", leaving orphaned consultations, invoices and sessions. | `appointment-details.jsx` (statusConfig `deleted`), `aestheticService.updateAppointment` (~L256) | Same appointment: `DELETE` → 400, `PUT {status:"deleted"}` → **200** (TC-024) |
| **RC-5** | **Real error hidden.** Both delete handlers swallow the backend message: *"Failed to delete appointment"* / *"Failed to delete treatment"*. Users never see *"Cannot delete appointment with existing consultation"*, so "delete doesn't work" is all they can report. | `aesthetic-schedule/page.js:839-846`, `availability/page.js:329-336`, `aesthetic-settings/treatments/page.jsx:74`, `treatment-room.js:44` | Code review |

---

## 3. Break Points

| ID | Break point | Code | Risk | Test |
|---|---|---|---|---|
| **BP-1** | **No org check (IDOR)** on `DELETE /appointments/:id`, `PUT /appointments/:id`, `DELETE /treatments/:id`, `DELETE /appointments/:id/treatments/:tid`. All use `findByPk(id)` / `destroy({where:{id}})` without `org_id`. | `aestheticService` delete/update functions | A user in clinic A can delete or modify clinic B's records by id | TC-030 (needs 2nd org) |
| **BP-2** | **No permission check.** Other modules use `rolePermissionMiddleware(module,'d')`; the aesthetic routes only use `authMiddleware`. | `routes/aestheticRoutes.js` | Any logged-in role (e.g. front desk) can delete | TC-031 |
| **BP-3** | **Mass assignment** on update: `appointment.update(data)` accepts any field (`org_id`, `created_by`, `status`). | `updateAppointment` | Move an appointment to another org, forge the creator | TC-032 |
| **BP-4** | **"Any consultation" blocks delete.** The consultation auto-saves (800 ms debounce) as soon as anything is typed in the Consultation tab, so opening and touching an appointment makes it undeletable for good. | `edit-form.jsx:60-73` + `deleteAppointment` | Even a mistakenly opened appointment can't be deleted | TC-023 |
| **BP-5** | **Any invoice blocks delete**, including cancelled, refunded and auto-cancelled drafts (`hasOne invoice`, status ignored). | `deleteAppointment` | Appointments with a cancelled draft stay forever | TC-027 |
| **BP-6** | Soft delete not in a **transaction**: status update, then planned-treatment destroy. If the second step fails, the appointment is "deleted" but its sessions remain. | `deleteAppointment` | Orphan sessions | Review |
| **BP-7** | **Treatments scheduled into OTHER appointments**: deleting the source appointment (or removing a treatment row) leaves `scheduled_appointment_id` rows pointing at a deleted appointment. | `deleteTreatmentFromAppointment`, `deleteAppointment` | Treatment Room shows ghost sessions | TC-028 |
| **BP-8** | `deleteTreatmentFromAppointment` has no checks: deletes **done** and **already-scheduled** sessions, returns "Treatment deleted!" even when nothing was deleted (wrong id / other org). The UI shows a delete action on **Completed** treatments. | `aestheticService` L6, `treatment-room.js:95-130` | Clinical history lost silently | TC-029 |
| **BP-9** | **Deleting twice** returns 200 (no status check). | `deleteAppointment` | Misleading audit / double side-effects | TC-022 |
| **BP-10** | Wrong HTTP codes: not found → **400** (should be 404). Every error, including DB errors, → 400 for appointments and 500 for treatments. | controllers | Hard to tell user errors from server faults | TC-025 |
| **BP-11** | **No audit trail**: no `deleted_by` / `deleted_at`, and the reason isn't stored. | model | Who deleted a patient's appointment can't be traced | TC-033 |
| **BP-12** | Treatment delete has **no confirmation dialog** (one click). | `treatment-form.jsx:49-56` | Accidental deletes | TC-015 |
| **BP-13** | `createTreatmentsForScheduling` (consultation save) **destroys all** planned rows of the appointment, including already-scheduled ones, and recreates them. | `aestheticService` ~L2095 | Breaks links to booked sessions | TC-034 |

---

## 4. Affected Areas

| Area | How it's affected | Check |
|---|---|---|
| **Schedule calendar / Upcoming** (`aesthetic-schedule/page.js:474`) | Hides `deleted` ✅. A "Deleted" filter shows nothing, because they're filtered out before the status filter. | TC-040 |
| **Availability / Doctor calendar** (`availability/page.js`, `doctor-calendar.jsx`) | Backend `getAppointments` / doctor query **don't exclude deleted**. Only some screens filter them. A deleted appointment may still block or show in a slot. | TC-041 |
| **Appointment Log** (`/admin/aesthetic-appointments`) | Shows deleted rows (KPI "Deleted: n"). Expected, but rows must be clearly marked and not editable. | TC-042 |
| **Patient History / Past history** (`getAppointmentsByPatientId`, `past-history.jsx`) | Doesn't filter deleted, so deleted visits appear in the patient's clinical history. | TC-043 |
| **Appointment Types** (`deleteAppointmentType`) | Counts **deleted** appointments too, so a type used once can never be deleted. | TC-044 |
| **Treatment Room / Scheduling** (`/appointments/:id/scheduling`) | Sessions of deleted appointments, and of **deactivated** treatments. Kept ✅ (TC-014). | TC-014, TC-028 |
| **Add Items catalog / Treatments list** | Deactivated treatments hidden ✅ (TC-013). | TC-013 |
| **Treatment Plan Templates** (`treatment_ids` JSON) | Still reference deactivated or deleted treatment ids. Applying a template could add an unavailable treatment or fail. | TC-045 |
| **Consultation treatment plan** (consultation JSON `originalId`) | Saving later recreates rows with `treatment_id` of a deactivated treatment. Must still work. | TC-046 |
| **Invoices / Finances** | Appointment with an invoice is blocked from DELETE but can be "Deleted" via status (RC-4), leaving the invoice attached to a deleted appointment. | TC-047 |
| **Real-time (socket) updates** | Delete doesn't emit an event, so other users' open calendars still show the appointment until refresh. | TC-048 |
| **Reports / KPIs / Dashboard** | Counts must exclude deleted where appropriate (appointment counts, doctor workload). | TC-049 |

---

## 5. Test Cases

### Part 1: Appointment delete

| ID | Scenario | Steps | Expected | Priority | Automation |
|:---|:---|:---|:---|:---|:---|
| **TC-001** | Delete action exists (RC-1) | Schedule → click an appointment → Appointment Details. | A **Delete** button opens "Delete Appointment – Are you sure?". | **P0** | Automated (`test.fail`) ❌ |
| **TC-002** | Status menu "Deleted" | Open the status menu. | Documents current behaviour. PO to decide whether "Deleted" should be removed from the menu (use Delete instead). | **P1** | Automated ✅ |
| **TC-020** | Appointment created via Treatment Room / scheduling (RC-2) | Appointment with one session booked into it → Delete. | Deleted (or a clear rule). **QA: 400 "Cannot delete appointment with scheduled treatments"**. | **P0** | Automated (`test.fail`) ❌ |
| **TC-021** | Plain new appointment | Create, then Delete. | 200. Status `deleted`. Gone from Schedule. | **P0** | Automated ✅ |
| **TC-022** | Delete twice (BP-9) | Delete an already-deleted appointment. | 404/409. **QA: 200**. | **P3** | Automated (`test.fail`) ❌ |
| **TC-023** | Has consultation (BP-4) | Type one note in Consultation → Delete. | Blocked with the **real message shown in the UI**, or allowed if the consultation is empty (PO). | **P1** | Automated (API, test patient) / Manual (UI message) |
| **TC-024** | Status bypass (RC-4) | On an appointment DELETE refuses → set status "Deleted". | Same rules as DELETE. **QA: 200, status deleted**. | **P0** | Automated (`test.fail`) ❌ |
| **TC-025** | Unknown id (BP-10) | DELETE id 999999999. | 404 "Appointment not found". QA: 400 with the right message. | **P3** | Automated ✅ |
| **TC-026** | Error message shown (RC-5) | Trigger a blocked delete from the UI. | Toast shows the backend reason, not "Failed to delete appointment". | **P1** | Manual |
| **TC-027** | Cancelled / auto-cancelled invoice (BP-5) | Appointment whose only invoice is cancelled → Delete. | Allowed, or a clear message (PO). | **P1** | Manual |
| **TC-028** | Source appointment of scheduled sessions (BP-7) | Appointment A plans 3 sessions, 1 booked into B → delete B, then A. | No ghost sessions in Treatment Room. A's remaining sessions handled. | **P1** | Manual |
| **TC-035** | Past / completed / engaged appointment | Delete a completed visit. | Blocked or allowed per PO. Clinical record protected. | **P1** | Manual |
| **TC-036** | Calendar refresh | Delete from the Schedule dialog. | Card disappears without a reload. Upcoming count drops. | **P1** | Manual |

### Part 2: Treatment delete

| ID | Scenario | Steps | Expected | Priority | Automation |
|:---|:---|:---|:---|:---|:---|
| **TC-010** | Unused treatment | Settings → Treatments → create → Delete. | 200. Removed. | **P0** | Automated ✅ |
| **TC-012** | Treatment in use | Treatment with a scheduled session → Delete. | 200, **soft-deleted** with the "in use… deactivated" message. | **P0** | Automated ✅ |
| **TC-013** | Deactivated treatment hidden | After TC-012. | Not in Settings list. Not in Add Items search. | **P0** | Automated ✅ |
| **TC-014** | History kept | Treatment Room of the appointment. | The session still shows. | **P1** | Automated ✅ |
| **TC-015** | Confirmation (BP-12) | Click Delete on a treatment. | Confirmation dialog first. *(Today one click deletes.)* | **P2** | Manual |
| **TC-016** | UI message for in-use | Delete an in-use treatment in the UI. | Toast shows the **deactivated** message, not "Deleted successfully". | **P2** | Manual |
| **TC-017** | Reactivate / re-create same name | Re-create a treatment with the name of a deactivated one. | Allowed, no duplicate-name clash, or a reactivate option. | **P2** | Manual |
| **TC-029** | Remove a **done** session in Treatment Room (BP-8) | Completed Treatments → delete. | Blocked, or confirmation + audit. Clinical history protected. | **P1** | Manual |
| **TC-026b** | Unknown treatment id | DELETE id 999999999. | "Treatment not found", no crash. | **P3** | Automated ✅ |

### Part 3: Security & data integrity

| ID | Scenario | Expected | Priority | Automation |
|:---|:---|:---|:---|:---|
| **TC-030** | IDOR (BP-1): user of clinic B deletes clinic A's appointment or treatment by id. | 403/404. Nothing changed. | **P0** | Manual (needs 2nd org login) |
| **TC-031** | Role without delete permission (BP-2) | 403. Delete action hidden. | **P0** | Manual (needs low-role user) |
| **TC-032** | Mass assignment (BP-3): `PUT /appointments/:id {org_id: other}` | Field ignored or 400. | **P0** | Manual / API |
| **TC-033** | Audit (BP-11) | `deleted_by`, `deleted_at` (and reason) recorded. | **P2** | Manual / DB |
| **TC-034** | Consultation save after scheduling (BP-13) | Booked sessions keep their `scheduled_appointment_id`. | **P1** | Manual |

### Part 4: Affected areas (regression)

| ID | Area | Expected | Priority |
|:---|:---|:---|:---|
| **TC-040** | Schedule / Upcoming | Deleted hidden. Counts drop. | P1 |
| **TC-041** | Availability / Doctor calendar | Deleted appointment doesn't occupy the slot. A new booking in the same slot is allowed. | **P0** |
| **TC-042** | Appointment Log | Deleted rows shown with a Deleted badge, read-only. KPI "Deleted" +1. | P2 |
| **TC-043** | Patient history | Deleted visits hidden or clearly marked (PO). | P1 |
| **TC-044** | Appointment Types | A type used only by deleted appointments can be deleted. | P2 |
| **TC-045** | Treatment Plan Templates | A template containing a deactivated treatment applies cleanly (skips or flags it). | P1 |
| **TC-046** | Consultation plan with a deactivated treatment | Saving the consultation still works, no 500. | **P0** |
| **TC-047** | Invoice on a status-deleted appointment (RC-4) | Not possible after the fix. Today the invoice is orphaned. | P1 |
| **TC-048** | Two users, real-time | User B's calendar removes the card without a refresh (or on the next refresh). | P2 |
| **TC-049** | Reports / dashboard counts | Deleted excluded from workload and appointment totals. | P2 |

---

## 6. Execution Results (QA, Chromium, 2026-11-09)

`npx playwright test tests/emr-224.spec.js`: **10 passed, 4 known defects (`test.fail`), 0 skipped**. Stable over 2 consecutive runs.

The suite runs on **desktop Chromium only**. `playwright.config.js` lists it in `CHROMIUM_ONLY_SPECS`, so Firefox, WebKit and Mobile Chrome don't pick it up at all, which means no "skipped" noise. The reasons:
- its checks are mostly API calls that create QA data;
- WebKit on Windows fails the TLS handshake ("SSL connect error");
- the Schedule card is hidden at phone width.

| Result | Tests |
|---|---|
| ✅ Pass | TC-002, TC-010, TC-011, **TC-012** (soft-delete), **TC-013**, **TC-014**, TC-021, TC-025, TC-026 |
| ❌ RC-1 | **TC-001**: no Delete button on Appointment Details |
| ❌ RC-2 | **TC-020**: `400 "Cannot delete appointment with scheduled treatments"` for an appointment with one booked session |
| ❌ RC-4 | **TC-024**: `DELETE` refused (400) but `PUT {status:"deleted"}` → **200**, appointment deleted |
| ❌ BP-9 | **TC-022**: second delete of the same appointment → 200 |
| ✅ Pass | **TC-023**: an appointment with a consultation is blocked: `400 "Cannot delete appointment with existing consultation"`. Uses the reusable test patient **"QA224 Test Patient"** (id 333796, created once and reused on later runs). |

**Test data left on QA (by design, isolated):** each run creates appointments on **2027-12-31 03:00–05:30 UTC**, ending in status `deleted`. They have no patient, except TC-023's, which uses the dedicated **"QA224 Test Patient"**. That appointment also has a test consultation. Its test treatments are deleted or deactivated (`QA224X…`). Skip the data-creating tests with `EMR224_READONLY=1`.

---

## 7. Recommended Fixes (for dev)

1. **Restore the Delete button** in `appointment-details.jsx` and show the backend error text in the toast (RC-1, RC-5).
2. **Fix the scheduled-treatment check**: query `AestheticTreatmentsForScheduling` where `appointment_id = id AND scheduled_appointment_id IS NOT NULL AND scheduled_appointment_id <> id` (RC-2). Decide what happens to sessions booked into the appointment.
3. **Route "Deleted" status through the delete rules**, or remove it from the status menu (RC-4). Whitelist the fields `updateAppointment` accepts (BP-3).
4. Add **`org_id` scoping** and **`rolePermissionMiddleware('Appointments','d')`** to every delete and update route (BP-1, BP-2).
5. Ignore **cancelled / refunded** invoices and **empty** consultations in the delete rules, or say exactly why delete is blocked (BP-4, BP-5).
6. Wrap the delete in a **transaction**. Add `deleted_by` / `deleted_at`. Return **404** for not found (BP-6, BP-10, BP-11).
7. Exclude `deleted` in the backend appointment queries used by availability, patient history and appointment-type counts (TC-041, TC-043, TC-044).

## 8. Open Questions for PO

1. Should an appointment with a consultation or invoice be deletable at all, or only cancellable?
2. Should "Deleted" be removed from the status menu now that there will be a Delete button?
3. Who may delete: all roles, or admins and doctors only?
4. Should deleted visits appear in Patient History (marked) or be hidden?
5. Can completed treatment sessions ever be removed from the Treatment Room?
