# EMR-237: Appointment Status Changes Automatically When Editing an Appointment

**Feature ID**: `EMR-237`
**Area**: EMR (Amaran) → Schedule → Appointment Details → Reschedule / edit
**Re-tested**: 2026-11-12 on QA (`BASE_URL` = qa_pg.amerck.care), desktop Chromium, against **`qa_release/1.1.11.1`**. It contains both EMR-237 commits, `05914b1` and `8a0c677`, and TC-000 confirms `8a0c677` is what QA serves.
**Test Suite Files**: [`tests/emr-237.spec.js`](tests/emr-237.spec.js) (31 tests) + [`tests/emr-237-tc033.spec.js`](tests/emr-237-tc033.spec.js) (TC-033 and TC-033b, the follow-up status race, with on-screen captions, step screenshots, video and timeline)
**Failure explainer (TC-033)**: https://claude.ai/artifact/PiY3zQQQfFWAe8ifRWFhBh (private until shared from the page's Share menu)
**Code reviewed**: `emr-frontend` @ `origin/qa_release/1.1.11.1` (read with `git show`; the working tree was not changed) + `emr-backend/src`

> **Branch note.** The local `emr-frontend` checkout is **`qa_release/1.1.7.2`** (last commit 2026-11-06, EMR-220). It does **not** contain EMR-237. The fix lives on `origin/EMR-237` and was merged into `qa_release/1.1.10.2` (05914b1) and `qa_release/1.1.11.1` (05914b1 + 8a0c677). The backend has no EMR-237 change.

---

## 1. Verdict (re-test 2026-11-12)

**Agreed business rule (ticket clarification, 2026-11-12):** when an appointment is rescheduled or edited, **only Confirmed is kept**. Every other status returns to the default, **Scheduled**. Apart from that rule, the status changes only when the user changes it.

| Acceptance criterion | QA result | Status |
|---|---|---|
| Rescheduling / editing keeps **Confirmed** (same day, 5 months ahead, add treatment, notes only, 3 moves in a row) | ✅ TC-001…TC-005, TC-009, TC-026 | Pass |
| Every other status (Waiting, Engaged, Not Reachable, No Show, Completed, Cancelled) returns to **Scheduled**, on a reschedule or a notes-only edit | ✅ TC-006 ×6, TC-015 | Pass |
| Status changes **only** when the user changes it | ✅ Reschedule form (TC-007) and status menu (TC-023). Drag-and-drop, the notes box and Treatment Room don't touch it (TC-020…TC-022). ❌ Edge case: in a follow-up form, a late background lookup overwrites the status the user picked with Confirmed (TC-033). | Pass, 1 edge-case defect |

**Ticket result: PASS for the agreed rule.** Commit `8a0c677` (the follow-up code) introduces **2 edge-case defects**:
- **BP-12, race (TC-033):** happens only when the source lookup is slower than the user. Unlikely on a normal connection.
- **BP-13, stale key:** an abandoned "N Weeks" follow-up can make a later booking for the same client start as Confirmed.

**Recommendation:** close EMR-237 and log BP-12 + BP-13 as one low-priority bug against the follow-up flow. If the team wants them fixed first, keep EMR-237 open.

*Note for the team:* the rule also covers clients who are already in the clinic. Saving a Waiting or Engaged appointment from the reschedule form, even with only a notes change, returns it to Scheduled (TC-015).

---

## 2. What the Update Changed (code review)

| Commit | Change | Where (`qa_release/1.1.11.1`) | Result |
|---|---|---|---|
| `05914b1` | `status: payload.status === "confirmed" ? "confirmed" : "scheduled"` | `appointments/[id]/create-form.jsx:291` | ✅ **Implements the agreed rule** (TC-001…TC-005, TC-006, TC-015) |
| `8a0c677` | `no_patient: !payload.patient_id` | `create-form.jsx:295` | ✅ Fixes BP-10 (TC-012) |
| `8a0c677` | `<Select key={formik.values.status}>` | `create-form.jsx:564` | ✅ The select shows the loaded value; a manual change still works (TC-007) |
| `8a0c677` | Quick Schedule **Custom Date** modal gets `status: confirmed` when the source is confirmed, otherwise `scheduled` | `appointment-details.jsx:535` | ✅ Same rule applied to follow-ups (TC-030, TC-031) |
| `8a0c677` | Quick Schedule **N Weeks**: the calendar writes the source id to `localStorage.nsrc`, and the next new-appointment form looks the source up and sets Confirmed | `schedule-calendar.jsx:418-420`, `create-form.jsx:345-361` | 🆕 Works (TC-032), but introduces **BP-12** (TC-033) and **BP-13** |
| `8a0c677` | Scheduling-tab "Create appointment" dialog sends `status: "confirmed"` when the source is confirmed (no status field shown to the user) | `schedule-calendar.jsx:544`, `scheduling-form.jsx`, `[id]/page.js:293` | 🆕 Silent. Reached only if the user clicks a day-view slot before the source appointment has loaded |
| — | Backend | none | RC-3 (blind `appointment.update(data)`) unchanged |

Also in this release, not part of EMR-237: a new drag-to-resize handler (`aesthetic-schedule/page.js` `handleEventResize`) sends only `doctor_id/start_time/end_time`, so it doesn't touch the status ✅.

---

## 3. Root Cause and Fix

| ID | Root cause of the original bug | Where | Status |
|---|---|---|---|
| **RC-1** | The reschedule form hard-coded `status: "scheduled"` when it loaded an appointment, so Confirmed was lost on every save. | `create-form.jsx:291` | ✅ **Fixed.** Confirmed is kept; other statuses return to Scheduled (agreed rule) |
| **RC-2** | On Update, the form sends **all values** (`{...values}`), including `status`. | `create-form.jsx:222-231` | By design. It now carries the status the rule produced |
| **RC-3** | The backend saves the body as-is: `appointment.update(data)`. | `emr-backend/src/services/aestheticService.js:256-262` | Open. The rule lives only in the frontend, so any other API client can still set any status (see BP-6) |
| **RC-4** | The reschedule page passes `initialData` without `status` (falls back to "scheduled" until the load finishes). | `[id]/page.js:176-181` + `create-form.jsx:167` | Harmless. The loading overlay and validation block an early save (TC-014) |

**Suggested fixes (remaining)**
1. **BP-12:** apply the source status only if the user hasn't touched the status field (`formik.touched.status`). Better: pass it synchronously (`initialData` or the URL) instead of an async lookup.
2. **BP-13:** clear `nsrc` (and `npid`) when the follow-up flow is left, or carry the source id in the URL instead of `localStorage`.
3. **Side issues, not part of this ticket:** BP-4 (removed treatments come back), BP-5 (return 400 instead of 500), BP-6/BP-7 (backend field allow-list and org check).

---

## 4. Break Points (status after the re-test)

| ID | Break point | Code | Risk | 2026-11-12 | Test |
|---|---|---|---|---|---|
| **BP-1** | ~~Only Confirmed is preserved~~ **By design** (agreed rule, 2026-11-12): every other status returns to Scheduled on any save from the reschedule form, including Waiting/Engaged clients already in the clinic. | `create-form.jsx:291` | — | ✅ Not a defect | TC-006, TC-015 |
| **BP-2** | Slow-load race: clicking Update before the appointment has loaded. | `create-form.jsx:280-307` | — | ✅ Mitigated: a full-screen loading overlay blocks the click, and validation blocks empty values | TC-014 |
| **BP-3** | *(latent)* The treatment **X** button has no `type="button"`. It doesn't submit today only because the row is removed during the click. | `create-form.jsx:601-603` | Low | Open (latent) | TC-010 |
| **BP-4** | **Removing an existing treatment in the form is not saved.** Only new treatments are POSTed, so the removed one is still on the appointment. | `create-form.jsx:391-411` | Medium | ❌ Open, confirmed on QA | TC-013 (known gap) |
| **BP-5** | Invalid, empty or `null` status → **HTTP 500**, and the error leaks DB internals (`invalid input value for enum "enum_Aesthetic_Appointments_status"`). Data is not changed. | `aestheticController.updateAppointment` | Low | Open | TC-024, TC-025 |
| **BP-6** | Mass assignment: `PUT /appointments/:id` accepts any column (`org_id`, `created_by`, …). | `aestheticService.updateAppointment` | High (security) | Open | Review |
| **BP-7** | No org check (IDOR) on `PUT /appointments/:id`. | same | High (security) | Open | Needs a 2nd org |
| **BP-8** | No audit trail for status changes (who / when / from → to). | model | Medium | Open | Review |
| **BP-9** | The form's error toast says *"Error creating appointment"* on **update** too. | `create-form.jsx:428` | Low | Open | Review |
| **BP-10** | `no_patient` checkbox uncontrolled after load. | `create-form.jsx:295` | — | ✅ **Fixed** in 8a0c677 | TC-012 |
| **BP-11** 🆕 | The Availability page calls `handleReschedule()`, which is **not defined** in that file (since the first commit). | `availability/page.js:363` | None today: the page renders unavailability blocks only (`:124`, `:171`), so the dialog is unreachable | Dead code. Define it or remove it before appointments are shown there | Review |
| **BP-12** 🆕 | **Introduced by 8a0c677.** The source lookup for a follow-up is async. If the user picks a status before it returns, the lookup **overwrites it with Confirmed**. | `create-form.jsx:347-358` | Low–Medium (edge case of the second acceptance criterion; needs a slow lookup) | ❌ Open | TC-033, TC-033b (own file) |
| **BP-13** 🆕 | **Stale `nsrc`.** If the N-Weeks flow is abandoned on the Schedule page, `nsrc` stays in `localStorage`. The next new-appointment form for the **same patient** reads it and becomes Confirmed. | `schedule-calendar.jsx:418-420`, `create-form.jsx:347-361` | Low–Medium | Open | Manual (steps below) |
| **BP-14** 🆕 | **One follow-up path skips the rule.** N Weeks and Custom Date apply it (Confirmed carries over, others start Scheduled), but the **Scheduling-tab day-view slot** writes `npid` only (`schedule-calendar.jsx:671`). So a follow-up booked there from a Confirmed appointment starts Scheduled. | `appointment-details.jsx:535`, `schedule-calendar.jsx:418-420/544/671` | Low | Confirm with PO/dev which is intended | TC-030, TC-031, TC-032 + review |
| **BP-15** 🆕 | **Doctor field looks empty after a page refresh.** On a fresh load of the New Appointment link (`/appointments/new?doctorId=…`), the Doctor field shows "Select a doctor" although the doctor is set in the form. `FormikSelect` looks up the label only when the value changes, not when the doctor list arrives. The normal slot click is fine because the list is already loaded. Not part of this ticket; found while building TC-033. | `components/custom/form/formik-keyval-select.jsx:24-32` | Low (misleading display; the appointment is still booked with that doctor) | Open | Review + first TC-033 draft run |

**BP-13 manual steps**
1. Open a **Confirmed** appointment A of patient P → Quick Schedule **2 Weeks** → click any date. You land on the Schedule page. Don't create anything; leave the page.
2. Open another appointment B of the same patient P that is **Scheduled** → Scheduling tab → day view → click an empty slot.
3. **Actual:** the new appointment form shows **Confirmed**, taken from A. **Expected:** Scheduled.

**BP-12 manual steps** (verified on QA 2026-11-12; TC-033b runs exactly these)

*Why it doesn't show on a normal connection:* the background lookup answers in a fraction of a second, before anyone can open the Status dropdown. The form already shows Confirmed, and whatever you pick after that stays. The lookup has to be slower than you, so slow the network first.

1. Open an appointment that is **Confirmed** and has a client.
2. Appointment Details → **Quick Schedule Follow-up → 2 Weeks** (any "Weeks" button). Only these buttons start the background lookup. **Custom Date** and the Scheduling tab's own "+ weeks" buttons don't.
3. Click the highlighted date in the calendar. You land on the Schedule page.
4. Chrome DevTools (F12) → **Network** → throttling menu → **Add…** → profile with **Latency 6000 ms** (download/upload 20000 kbit/s) → select it.
5. Click an empty slot and wait for the form (a few seconds).
6. As soon as it shows **Scheduled**, pick **Waiting**. You have about 5 s.
7. **Actual:** about 6 s later the status changes to **Confirmed** on its own. **Expected:** stays **Waiting**.
8. Set throttling back to "No throttling" and press **Cancel** (don't save the test booking).

---

## 5. Affected Areas (regression scope)

| Area | Why | Covered by |
|---|---|---|
| Schedule calendar card colour and Appointment Details status | Reads `status` | TC-001, TC-009 |
| Drag-and-drop reschedule and the new drag-to-resize (`aesthetic-schedule/page.js`) | Send only doctor and times, so they're safe | TC-020 (API) + review |
| Appointment Details notes box / status menu | `PUT {notes}` / `PUT {status}` | TC-021, TC-023 |
| Treatment Room / Add Treatment (`scheduled-treatments`) | Doesn't touch status | TC-022 |
| Appointment Log status filter and KPI counts | Counts by status | TC-027 |
| **Quick Schedule Follow-up** (N Weeks / Custom Date) 🆕 | Applies the rule: Confirmed carries over, others start Scheduled | TC-030…TC-033 |
| **Scheduling tab calendar** 🆕 | Day-view slot doesn't apply the rule; the dialog applies it without showing a status field | Review (BP-14) |
| WhatsApp confirmation button | Message depends on the current status (Scheduled vs Confirmed) | Manual |
| Availability page | Reschedule handler undefined but unreachable | Review (BP-11) |

---

## 6. Test Cases and Results

| TC | Title | Type | Expected | QA 2026-11-12 (1.1.11.1) |
|---|---|---|---|---|
| TC-000 | Build fingerprint: QA serves EMR-237 commit 8a0c677 | Build | `"nsrc"` present in the form's JS | ✅ |
| TC-001 | Schedule → Details → **Reschedule** opens the form with **Confirmed** | UI | Status = Confirmed | ✅ |
| TC-002 | Reschedule time, same day | UI | Stays confirmed | ✅ |
| TC-003 | Reschedule **5 months ahead** | UI | Stays confirmed | ✅ |
| TC-004 | Add a treatment, no time change | UI | Stays confirmed | ✅ |
| TC-005 | Edit notes only | UI | Stays confirmed | ✅ |
| TC-006 ×6 | Reschedule a **waiting / engaged / not-reachable / no-show / completed / cancelled** appointment | UI | Returns to `scheduled` (rule) | ✅ all 6 |
| TC-007 | User changes Confirmed → Waiting in the form | UI | `waiting` saved | ✅ |
| TC-008 | Change time, then **Cancel** | UI | No PUT | ✅ |
| TC-009 | Details shows "Patient confirmed attendance" after a reschedule | UI | Confirmed | ✅ |
| TC-010 | Treatment X must not submit the form | UI | No PUT | ✅ (BP-3 latent) |
| TC-012 | Appointment **without a patient**: reschedule | UI | "No Patient Needed" ticked, stays confirmed | ✅ (fixed in 8a0c677) |
| TC-013 | Remove an **existing** treatment in the form, save | UI | Treatment removed | ⚠️ Still there (BP-4, known gap) |
| TC-014 | Slow load (6 s): click Update early | UI | No PUT | ✅ Overlay blocks the click |
| TC-015 | **Waiting** appointment, **notes-only** edit | UI | Returns to `scheduled` (rule) | ✅ |
| TC-020 | Drag-and-drop payload | API | Stays confirmed | ✅ |
| TC-021 | Notes-only payload | API | Stays confirmed | ✅ |
| TC-022 | `POST /scheduled-treatments` | API | Stays confirmed | ✅ |
| TC-023 | Explicit `PUT {status:"engaged"}` | API | `engaged` | ✅ |
| TC-024 | Invalid status `"rescheduled"` | API | 400, unchanged | ⚠️ 500, unchanged (known gap) |
| TC-025 | `status: ""` / `null` in an edit payload | API | Not wiped | ✅ Unchanged (but HTTP 500) |
| TC-026 | 3 reschedules in a row | API | Stays confirmed | ✅ |
| TC-027 | Appointment Log, *Confirmed* filter | API | Listed | ✅ |
| TC-030 | Quick Schedule → **Custom Date** from Confirmed | UI | Follow-up created Confirmed (rule) | ✅ (saved `confirmed`) |
| TC-031 | Quick Schedule → **Custom Date** from Completed | UI | Follow-up starts Scheduled (rule) | ✅ |
| TC-032 | Quick Schedule → **2 Weeks** → date → new form | UI | `npid`/`nsrc` written; form shows Confirmed; `nsrc` cleared | ✅ |
| TC-033 | Follow-up form (real path: Details → 2 Weeks → date → empty 11:00 slot): user picks **Waiting** while the source lookup is held back 8 s | UI, own file | Waiting kept | ❌ Overwritten with **Confirmed** (BP-12). Measured: lookup sent 0.0 s · Waiting picked +1.5 s · answer +8.5 s · Confirmed +9.3 s |
| TC-033b | Same path on a slow network: **Chrome throttling, 6000 ms latency** switched on just before the slot click (the manual reproduction, no request interception) | UI, own file | Waiting kept | ❌ Overwritten with **Confirmed** (BP-12). Measured: Waiting picked +1.7 s · answer +6.0 s · Confirmed +6.7 s |

**Last runs (2026-11-12, agreed rule, realistic test data):** the full run had 32 tests: 29 passed, 2 known gaps (TC-013, TC-024; not part of this ticket), 1 failed (TC-033, BP-12). TC-033 has since moved to its own file, next to TC-033b (the same race on a throttled network). Both were re-run there and both fail at step 8 of 8, as expected until BP-12 is fixed. The other 31 tests were not re-run after the move; the move doesn't change them. After every run, all appointments of the test clients were soft-deleted (0 live). HTML report: `npm run test:report`.

**Manual only:** BP-13 (steps above), the Scheduling-tab day-view path (BP-14), the WhatsApp confirmation wording.

---

## 7. Test Data

All test data is realistic but **fictional**. It uses the same fields a receptionist fills in on the **New Client** form: name, email, mobile, date of birth, gender.

| QA client # | Name | Email | Mobile | Gender | Date of birth | Used by |
|---|---|---|---|---|---|---|
| 333825 | Nimali Perera | nimali.perera@example.com | 0771234501 | Female | 1992-03-14 | TC-001, 007, 013, 025, 031 |
| 333826 | Tharushi Fernando | tharushi.fernando@example.com | 0712345602 | Female | 1996-07-22 | TC-002, 008, 014, 020, 026, 032 |
| 333827 | Kasun Herath | kasun.herath@example.com | 0763456703 | Male | 1988-11-05 | TC-003, 009, 015, 021, 027, 033 |
| 333828 | Dilani Rathnayake | dilani.rathnayake@example.com | 0754567804 | Female | 1985-01-30 | TC-004, 010, 022 |
| 333829 | Sachini Liyanage | sachini.liyanage@example.com | 0725678905 | Female | 1999-09-18 | TC-005, 023 |
| 333830 | Chamath Ekanayake | chamath.ekanayake@example.com | 0786789006 | Male | 1983-12-11 | TC-006 (all 6 statuses), 024, 030 |
| — | *No patient* ("No Patient Needed") | — | — | — | — | TC-012 |

- **Emails** use `example.com`, a domain reserved for examples, so no email can ever be delivered. The backend only emails staff users (password reset, welcome, support), never clients.
- **Mobiles** are made up in the Sri Lankan format. They could belong to a real person, so **never press WhatsApp "Confirmation"** on these test appointments: it opens a real `wa.me` chat with that number. The system sends no SMS or WhatsApp automatically.
- **Clients** are created once on QA (found again by email) and reused by every run. They are not deleted, and the client # above is QA's ID. The client for a test is fixed by its number (TC-001 → Nimali Perera, TC-002 → Tharushi Fernando, …).
- **Appointment notes** are realistic front-desk notes (e.g. *"Client asked for a slightly later slot on the same day."*, *"Arrived 10 minutes early – waiting at reception."*). Each test writes `appointment #<id> · <client>` into the Playwright report, so any appointment can be traced back to its test.
- **Dates:** appointments are booked 2027-11-15 … 2027-12-28 (follow-ups 2028-01, moves up to 2028-05). Bookings that far ahead never appear on the clinic's working calendar. Each UI test that clicks a calendar card uses its own date.
- **Doctor, appointment type, treatments:** taken from QA's existing setup (first doctor, first active type, first treatment).
- **Cleanup:** `afterAll` removes the appointments' treatment rows, then soft-deletes every appointment the run created (including follow-ups created through the UI).
- The old shared patient *"QA224 Test Patient"* is no longer used by EMR-237. EMR-224 still uses it.

---

## 8. How to Run

```bash
npx playwright test tests/emr-237.spec.js --project=chromium   # full run (creates test appointments, cleaned up in afterAll)
EMR237_READONLY=1 npx playwright test tests/emr-237.spec.js     # only TC-000 (build fingerprint), no data created

npx playwright test tests/emr-237-tc033.spec.js --project=chromium --headed   # TC-033 + TC-033b, watch each in one browser tab
npx playwright test tests/emr-237-tc033.spec.js --project=chromium -g "TC-033b" --headed   # only the manual-reproduction run
npm run test:report                                                            # TC-033 → steps, screenshots, video, trace
```

- Desktop Chromium only (`CHROMIUM_ONLY_SPECS` in `playwright.config.js`, both files).
- TC-033 records a video and a trace on every run (`test.use({ video: 'on', trace: 'on' })` in its file) and attaches 4 step screenshots plus close-ups of the Appointment Status field.
- Avoid running the suite twice at once on the same QA account (for example from VS Code and a terminal). Both runs use the same clients and dates.
- TC-000 fails when QA is not serving `qa_release/1.1.11.1` or later. Re-check the build before trusting the other results.
