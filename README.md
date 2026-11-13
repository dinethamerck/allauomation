# Optical SMS Automation (Playwright + JavaScript)

End-to-end suite for the Amerck Optical system's SMS features on QA (`https://qa_opt.amerck.care`):
transactional SMS (Welcome, Ready for Pickup, Thank you, Thank you walk-in) and the **scheduled
Next Visit reminder**. It includes the positive and negative scenarios.

## 1. Setup

The test patient is configured in `.env` (`TEST_PATIENT_MOBILE` / `TEST_PATIENT_NAME`). It must be an
existing patient in the org whose name appears in the patient search for that mobile number.

```bash
npm install
npx playwright install chromium
cp .env.example .env      # then fill in the values
```

### Credentials are protected
- Usernames and passwords live **only in `.env`**, which is gitignored. Only `.env.example` (empty values) is committed.
- The code never hard-codes credentials. `src/config/env.js` exposes them through a non-enumerable
  `env.credentials(role)` function, so logging `env` cannot print them.
- Login runs once in the `setup` project, with **trace, video and screenshots switched off**, so typed
  passwords never reach a report. Sessions (JWT) are saved to `.auth/*.json` (gitignored).
- `test-results/` and `playwright-report/` are gitignored. Treat them as sensitive: they contain
  patient names and numbers from QA.
- In CI, provide the same variables as secret environment variables instead of a `.env` file.

## 2. Running

| Command | What runs |
|---|---|
| `npm test` | everything (~1.5 h, because scheduled tests wait for real SMS) |
| `npm run test:smoke` | fast health check (login, config, SMS log, one full order) |
| `npm run test:config` | Settings > Configuration |
| `npm run test:smslog` | SMS Log & Scheduled SMS pages |
| `npm run test:lifecycle` | Refraction Room → Optical Shop → Cashier workflow rules |
| `npm run test:sms` | transactional SMS triggers |
| `npm run test:scheduled` | scheduled Next Visit reminders |
| `npm run test:negative` | all negative scenarios |
| `npm run report` | open the HTML report |
| `npm run restore-config` | put SMS settings back after an aborted run (also done automatically at the start of every run) |

Tests run **serially** (`workers: 1`) on purpose. They share one QA organisation: one SMS
configuration, one scheduler and one test patient.

## 3. How SMS are verified

The UI's SMS Log has no message text, so tests verify through the same API the page uses:

1. **Configure**: the `smsConfig` fixture switches on only the SMS under test (everything else off).
   It records the original values and **restores them after every test**, including failed ones.
   Originals are also written to `.auth/config-backup.json` *before* any change, so if a run is
   killed mid-test the next run (or `npm run restore-config`) restores them.
2. **Checkpoint**: take the highest SMS-log id just before the action.
3. **Act** in the UI (send to shop, pay, QC, ready, collect…).
4. **Assert** on log entries newer than the checkpoint for **this order only**: recipient = patient
   mobile, status = Delivered, correct type. Negative tests wait through at least one scheduler
   cycle (75 s) and assert that nothing was sent.

Scheduled reminders are checked end to end:

- popup preview = click time + option
- saved `next_visit_option` / `next_visit_date`
- Scheduled SMS entry is `scheduled`
- **not sent early**
- sent within the scheduler window after the due minute
- order shows `reminder_sent` / `delivered`
- entry leaves the scheduled list
- SMS Log page shows it
- **no duplicate** on later cycles

> Automation proves the system *sent* the SMS and the gateway reported it delivered. Whether it
> physically arrived on the handset has to be spot-checked manually on `TEST_PATIENT_MOBILE`.

## 4. System map (from exploration)

| Area | URL | Role |
|---|---|---|
| Refraction Room | `/admin/optical-consultations` | doctor: New Consultation → choose patient → visual acuity → Save → **Send To Shop** |
| Optical Shop | `/admin/optical-lab` | doctor: add items → Collect Advance Payment → Start Order → Mark as Received (QC Passed/Failed) → Ready for Collection → **Mark as Collected** (Next Visit popup) |
| Cashier | `/admin/optical-cashier` | doctor: pay advance / balance with SAP reference |
| Configuration | `/admin/settings/configuration` | admin: SMS texts + toggles, Next Visit popup toggle (auto-saved, no Save button) |
| SMS Log | `/admin/settings/sms-log` | admin: *SMS Log* (All/Delivered/Failed) and *Scheduled SMS* (All/Scheduled/On Hold/Not Delivered) |

Walk-in customers: Optical Shop **New Order** → add items → **Collect Payment** (full amount, no lab/QC;
order goes straight to Ready) → cashier pays → Mark as Collected.

Order statuses: Not Started → Pending Advance → Advance Paid → In Progress → QC Failed / QC Passed →
Ready → Collected (or Cancelled).

| SMS | Trigger | Log `metadata.type` |
|---|---|---|
| Welcome | first (advance) payment marked paid | *(none)* |
| Ready for Pickup | "Ready for Collection" confirmed | *(none)* |
| Thank you / walk-in | "Mark as Collected" | `order_collected` |
| Next Visit reminder | scheduler (every minute) at `next_visit_date` | `scheduled_next_visit_reminder` |

Next-visit options: **1 Min, 2 Min, 4 Min, Customized** (calendar, past days disabled).

## 5. Scenario catalogue

| ID | Scenario | Type |
|---|---|---|
| AUTH-01..02 | admin / doctor login and navigation | positive |
| AUTH-03..06 | wrong password, unknown user, empty form, unauthenticated deep link | negative |
| AUTH-07..08 | SMS log / config APIs without token | negative |
| CFG-01..02 | all SMS settings shown; UI matches stored config | positive |
| CFG-03 ×5 | each SMS toggle persists | positive |
| CFG-04 | Next Visit popup toggle persists | positive |
| CFG-05 ×5 | each SMS text saved on blur | positive |
| CFG-06 | Sinhala/Tamil text stored unchanged | edge |
| CFG-07 | enabled SMS cannot be saved empty | negative |
| CFG-08 | doctor cannot change configuration | negative (security) |
| LOG-01..02 | columns/filters; UI matches API | positive |
| LOG-03..04 | Delivered / Failed filters | positive |
| LOG-05..06 | pagination, View Order link | positive |
| LOG-07..09 | Scheduled tab columns, status filters vs API, patient/mobile shown | positive |
| ORD-01 | full lifecycle to Collected | positive |
| ORD-02 | Send To Shop disabled without visual acuity | negative |
| ORD-03 | Collect Advance disabled without items | negative |
| ORD-04 | advance defaults to 50 % | positive |
| ORD-05 | advance > total rejected | negative |
| ORD-06 | Mark as Paid without SAP ref rejected | negative |
| ORD-07 | QC failed → recheck → passed | negative/recovery |
| ORD-08 | cannot collect with balance outstanding | negative |
| ORD-09 | Cancel order No/Yes | positive/negative |
| ORD-10 | shop status filter | positive |
| TX-01 | Welcome sent once (not again on balance payment) | positive |
| TX-02 | Welcome disabled → none | negative |
| TX-03 | Pickup sent on Ready | positive |
| TX-04 | Pickup disabled → none | negative |
| TX-05 | QC failed → no pickup SMS | negative |
| TX-06 | Thank you sent with next visit date | positive |
| TX-07 | Thank you disabled → none, reminder still scheduled | negative |
| TX-08 | walk-in Thank you | positive |
| TX-09 | walk-in gets no regular Thank you | negative |
| SCH-01..03 | 1 / 2 / 4 Min reminder: scheduled → on-time delivery → once only | positive |
| SCH-04 | Customized future date stored, not sent early | positive |
| SCH-05 | past dates not selectable | negative |
| SCH-06 | closing popup: no collection, no schedule, no SMS | negative |
| SCH-07 | reminder SMS disabled → not sent, entry On Hold/Not Delivered | negative |
| SCH-08 | disabled then re-enabled before due → delivered | edge |
| SCH-09 | Next Visit popup disabled → no options, nothing scheduled | negative |
| SCH-10 | two orders same minute → one reminder each | edge |
| SCH-11 | browser in another time zone still schedules org time | edge |

## 6. Project layout

```
playwright.config.js        serial run, org time zone, setup project for auth
tests/auth.setup.js         logs in admin + doctor once, saves .auth/*.json
src/config/env.js           env loading + protected credentials
src/constants.js            statuses, config keys, SMS types, next-visit options
src/api/ApiClient.js        backend client (config, sms logs, scheduled, orders)
src/api/SmsVerifier.js      checkpoint → wait / expect-none helpers
src/pages/*                 page objects (Login, RefractionRoom, OpticalShop + CollectDialog, Cashier, Configuration, SmsLog)
src/flows/OrderJourney.js   drives an order to any stage (until('ready') etc.)
src/fixtures.js             adminPage, doctorApi/adminApi, sms, smsConfig (auto-restore), journey
tests/01..06-*              specs
```

## 7. Reported issues → regression tests (`npm run test:bugs`)

| Issue | Tests | How it is reproduced |
|---|---|---|
| Scheduled SMS empty state should read "No records found!" | BUG-EMPTY-01, BUG-EMPTY-02 | API responses are mocked as empty for every tab/filter (with reminders on and off); asserts the common message and that "No scheduled reminders found!" never appears |
| Customised-date reminder logged as multiple "Delivered" entries | BUG-DUP-01, BUG-DUP-02, BUG-DUP-03 | audits the whole SMS log for >1 reminder entry per order; checks every due customised-date reminder; runs a live reminder and watches two extra scheduler cycles |
| Story: Next Visit popup toggle + Next Visit Reminder SMS toggle | STORY-01..03 (+ SCH-01..03 reminder ON, SCH-07 reminder OFF, CFG-03/04 persistence) | toggles are switched in the Configuration UI, then the collect popup is checked |
| Reminder shown as "Scheduled" when Next Visit Recommendation is disabled | BUG-SCHED-01 (+ SCH-09) | follows the report's steps: popup = No, reminder = Yes, mark collected, check Scheduled SMS tab + API + no SMS sent |
