# EMR-67: Social History – "No. of Children" accepts decimal values

## QA Test Case Specification, Execution Report & Defect Findings

| | |
|---|---|
| **Ticket** | `EMR-67` |
| **Module** | EMR → Admissions → Admission Wizard → **Step 8: Social History** |
| **Fields under test** | No. of Children → Dependent Children (Male, Female), Independent Children (Male, Female) |
| **Environment (current)** | **QA – `https://qa_pg.amerck.care`** (API `https://pg_api_emr_dev.amerck.care`) |
| **Test data** | First draft admission in the Admissions list (draft `#222`) |
| **Executed** | 2026-11-03, Chromium (Playwright 1.63) |
| **Automation** | `tests/EMR-67/emr-67-social-history-children.spec.js` + `pages/SocialHistoryPage.js` |
| **Verdict** | 🟡 **UI fix verified – ticket NOT fully done.** Decimals can no longer be entered or saved from the UI. The **backend still accepts invalid values (AC-5 not met)**. See §6. |

---

## 1. Requirement (from the ticket)

| Ref | Acceptance criterion | Status on QA |
|---|---|:-:|
| **AC-1** | Users can enter only non-negative whole numbers (0, 1, 2, 3, …). | ✅ |
| **AC-2** | Decimal values are rejected. | ✅ in the UI. See the risk in §2. |
| **AC-3** | Minimum accepted value is 0. | ✅ |
| **AC-4** | Invalid values cannot be saved. | ✅ from the UI · ❌ through the API |
| **AC-5** | Validation is applied at **both** UI and backend. | ❌ **UI only** |

---

## 2. How the system now behaves (QA build)

This is what the test cases check.

| Input | Typed | Pasted | Message shown |
|---|---|---|---|
| `1.5` | `15` (`.` blocked) | `1` | none |
| `0.5` / `.5` | `5` | `0` | none |
| `2.0` | `20` | `2` | none |
| `1,5` | `15` (`,` blocked) | `15` | none |
| `2.75` | – | `2` | none |
| `-1` / `-3` | `1` (`-` blocked) | `0` (clamped) | none |
| `1e2` | `12` (`e` blocked) | `1` | none |
| `+2` | `2` | – | none |
| `abc` | empty | empty | none |
| `007` | `7` | – | none |

The inputs are `type="number"`, `min="0"`, `step="1"`, `inputmode="numeric"`. Only digit keys are accepted.

The save payload, the total (Male + Female) and the Admission Summary always show the same whole numbers.

### Clinical risk (doctor's view)

The fix **blocks the decimal-separator keystroke without telling the user**. So a doctor who types "1.5" by mistake gets **15 children**. "0.5" becomes 5 and "2.0" becomes 20. Nothing indicates that the value changed.

The number of children affects:
- discharge and social planning (dependants and caregiving)
- obstetric history, where ≥ 5 births flags grand multiparity, an obstetric risk factor
- contact tracing for household infections
- the medico-legal Admission Summary that the doctor signs

A silently inflated number is arguably more dangerous than a visible decimal, because it looks plausible. These cases pass, since this is how the system is built. Each one carries a **`clinical-risk`** note in the Playwright report.

**Recommendation:** when `.` or `,` is pressed, show an inline message such as "Whole numbers only". Do not silently drop the character. Consider a soft warning for counts above about 15.

---

## 3. Scope

**In scope:**
- the 4 children inputs, typed and pasted
- the keyboard arrow keys
- the autosave payload and persistence after reload
- the total and the Admission Summary
- the backend save endpoint `PUT /admissions/form/:id`
- regression of Occupation and Continue

**Out of scope:** Marital Status, Smoking and Alcohol chips, other wizard steps, and finalizing the admission.

**Open question for the Product Owner:** there is no maximum. The UI and the API both accept `99999`.

---

## 4. Traceability matrix and results (QA, 2026-11-03)

| Test case | Title | AC | Priority | Result |
|---|---|---|:-:|:-:|
| TC-01 | All 4 children fields rendered | – | P1 | ✅ Pass |
| TC-02 | `type=number`, `min=0` | AC-3 | P2 | ✅ Pass |
| TC-03 | Accepts 0 in every field | AC-1, AC-3 | P0 | ✅ Pass |
| TC-04 | Accepts 1, 2, 3, 12 in every field (4 runs) | AC-1 | P0 | ✅ Pass |
| TC-05 | Arrow keys step by 1 and never go below 0 | AC-1, AC-3 | P2 | ✅ Pass |
| TC-06 | Typed `1.5`: `.` blocked, digits only (`15`), each of 4 fields | AC-2 | P0 | ✅ Pass ⚠️ risk |
| TC-07 | Typed `0.5` / `.5`: `.` blocked (`5`) | AC-2 | P0 | ✅ Pass ⚠️ risk |
| TC-08 | Pasted decimals keep the whole part (`2.75→2`, `0.5→0`, `2.0→2`, `1.5→1`) | AC-2 | P0 | ✅ Pass |
| TC-09 | Typed `2.0`: `.` blocked, `20` saved | AC-2, AC-4 | P1 | ✅ Pass ⚠️ risk |
| TC-10 | Typed `1,5`: `,` blocked (`15`) | AC-2 | P0 | ✅ Pass ⚠️ risk |
| TC-10b | No validation message is shown (silent blocking) | AC-2 | P2 | ✅ Pass |
| TC-11 | Typed `-1`: `-` blocked in every field | AC-3 | P0 | ✅ Pass |
| TC-12 | Pasted `-3` is clamped to `0` | AC-3 | P0 | ✅ Pass |
| TC-13 | `1e2`: typed → `12`, pasted → `1` | AC-1 | P1 | ✅ Pass |
| TC-14 | `abc+#` → empty, `+2` → `2` | AC-1 | P1 | ✅ Pass |
| TC-14b | Leading zeros normalised (`007` → `7`) | AC-1 | P2 | ✅ Pass |
| TC-15 | Valid integers saved and persist after reload | AC-1, AC-4 | P0 | ✅ Pass |
| TC-16 | Totals = Male + Female | – | P1 | ✅ Pass |
| TC-17 | A decimal is never saved from the UI (payload and after reload) | AC-4 | P0 | ✅ Pass |
| TC-18 | Saved total = saved breakdown | AC-4 | P0 | ✅ Pass |
| TC-19 | A count can be cleared and stays cleared | – | P2 | ✅ Pass |
| TC-20 | Summary shows the entered whole numbers | – | P1 | ✅ Pass |
| TC-21 | Summary shows exactly what is in the field | AC-4 | P0 | ✅ Pass |
| TC-22 | API rejects `"1.5"`, each of 4 fields (4 runs) | AC-5 | P0 | ❌ **Known defect** (marked `test.fail`) |
| TC-23 | API rejects `"1.5"`, `2.5`, `"-1"`, `"abc"` (4 runs) | AC-3, AC-5 | P0 | ❌ **Known defect** (marked `test.fail`) |
| TC-24 | API accepts a valid whole number | AC-5 | P1 | ✅ Pass |
| TC-25 | Occupation still saves free text | – | P2 | ✅ Pass |
| TC-26 | Continue moves to Step 9 | – | P2 | ✅ Pass |
| OBS-01 | A value typed while the form is still loading is saved | – | P0 | ❌ **Known defect** (marked `test.fail`) |

**Totals:** 41 automated tests. 32 pass. 9 are known defects marked `test.fail()`, so the run still shows green. 5 of the passes carry a clinical-risk note.

`test.fail()` means "this is expected to fail because of a known defect". Once the defect is fixed, Playwright reports the test as *"Expected to fail, but passed"*. At that point, remove the `test.fail()` line.

---

## 5. Test case details

**Common preconditions**
- Logged in as a doctor.
- The first draft admission is open on **Step 8: Social History**, and its saved data has finished loading.
- The children fields are empty. The automation resets them before each test and restores them after.

### A. Rendering
- **TC-01:** "No. of Children" shows the Dependent and Independent cards, each with editable Male and Female inputs.
- **TC-02:** each input is `type="number"` with `min="0"`.

### B. Valid whole numbers
- **TC-03:** type `0` in each field. The value is `0` and the field is valid.
- **TC-04:** type `1`, `2`, `3` and `12` in each field. Each value is kept exactly. 12 represents a large but clinically plausible family.
- **TC-05:** from 0, ArrowDown gives `0`, ArrowUp twice gives `2`, then ArrowDown gives `1`.

### C. Decimal input (core of EMR-67)
- **TC-06:** type `1`, `.`, `5` in each field. The field never contains `.` or `,`, and it shows `15`. ⚠️ Clinical risk: 15 children are shown with no warning.
- **TC-07:** typing `0.5` or `.5` gives `5`. ⚠️
- **TC-08:** pasting `2.75`, `0.5`, `2.0` and `1.5` gives `2`, `0`, `2` and `1`. The whole-number part is kept, which is clinically acceptable.
- **TC-09:** typing `2.0` saves `"20"`. ⚠️
- **TC-10:** typing `1,5` gives `15`. ⚠️ This is common on keyboards that use a comma as the decimal separator.
- **TC-10b:** no validation message is shown when a separator is blocked. That is the current design, which §2 recommends changing.

### D. Negative and non-numeric input
- **TC-11:** typing `-1` gives `1` in every field.
- **TC-12:** pasting `-3` gives `0`.
- **TC-13:** typing `1e2` gives `12`, and pasting `1e2` gives `1`.
- **TC-14:** typing `abc+#` leaves the field empty, and typing `+2` gives `2`.
- **TC-14b:** typing `007` gives `7`.

### E. Save and persistence
The wizard autosaves about 1 s after typing stops, using `PUT /admissions/form/:id`.
- **TC-15:** enter 2 / 1 / 0 / 3. The save payload, the server and the UI after reload all show the same values.
- **TC-16:** Dependent 2 + 3 gives a total of `5`. Independent 1 + 0 gives `1`.
- **TC-17:** typing `1.5` and `2.7` saves `"15"` and `"27"`. No decimal reaches the server, and the values persist after reload.
- **TC-18:** the saved total equals Male + Female.
- **TC-19:** set 2, then clear the field. It is still empty after reload.

### F. Admission Summary
- **TC-20:** entering 2 / 1 shows "3 (Male: 2, Female: 1)".
- **TC-21:** after typing `1.5` for Female, the Summary shows exactly the value in the field, e.g. "17 (Male: 2, Female: 15)".

### G. Backend validation (AC-5): known defect
Direct `PUT /admissions/form/:id` requests, with the same token and body the wizard uses.
- **TC-22:** `"1.5"` in each of the 4 fields. Expected: 4xx. **Actual: 200, and the value is stored.**
- **TC-23:** `"1.5"`, `2.5`, `"-1"` and `"abc"`. Expected: 4xx and nothing stored. **Actual: 200, and each is stored as sent.**
- **TC-24:** `"3"` returns 200 and is stored. ✅

Also observed (not automated): `"99999"` is accepted with 200.

### H. Regression
- **TC-25:** "Paddy farmer" in Occupation is autosaved together with the children count.
- **TC-26:** Continue goes to Step 9 (`step=8`), and Social History is no longer shown.

### I. Additional finding (outside EMR-67: raise a separate ticket)
**OBS-01: input typed while the form is still loading is shown but never saved.**

Steps:
1. Open a draft from the Admissions list.
2. Go to Step 8.
3. Type a count **straight away**. The form looks empty because the saved data is still loading, which takes about 10 s on QA.
4. Wait, then click Continue.

Expected: the value is saved.
Actual: the value stays on screen, but **no save request is sent**, and the server is still empty.

Result on QA (2026-11-03): reproduced **4 out of 4** when typing straight away. The value saves correctly once you wait for the data to load.

Clinical impact: the doctor sees the value on screen and believes it's recorded, but it's silently lost.

---

## 6. Defects and risks

| ID | Summary | Severity | Status on QA | Evidence |
|---|---|---|---|---|
| EMR-67 (UI) | Decimals accepted in the children fields | Major | ✅ **Fixed**: decimals can't be entered or saved from the UI | TC-06…10, TC-17 |
| **EMR-67-b** | **No backend validation.** Decimals, negatives, text and out-of-range values are stored with 200. | **Critical**, AC-5 not met | ❌ **Open** | TC-22, TC-23 |
| **EMR-67-risk** | The decimal separator is dropped silently, so `1.5` becomes **15** with no message | **Major** (patient-safety / UX) | ⚠️ Open: needs PO / clinical decision | TC-06, 07, 09, 10, 10b |
| **NEW** | Input typed while the form is loading is never saved (data loss) | **Critical** | ❌ Open | OBS-01 |
| EMR-67-c | Stored total contradicted the breakdown (staging) | Major | ✅ Fixed on QA | TC-18 |
| EMR-67-d | Summary truncated the stored value (staging) | Major | ✅ Fixed on QA | TC-21 |

**Recommendation:** do not close EMR-67 until backend validation (AC-5) is added. Raise OBS-01 as a new ticket. Ask the PO to decide whether blocked separators should show a message.

---

## 7. Recommended fix (for developers)

**Backend (`PUT /admissions/form/:id`)**
- Validate `dependentChildrenMale`, `dependentChildrenFemale`, `independentChildrenMale` and `independentChildrenFemale` as integers ≥ 0, with an agreed maximum.
- Return 400 with a field-level error otherwise.
- Calculate `*ChildrenCount` on the server.

**UI**
- On a blocked `.` or `,`, show "Whole numbers only" instead of dropping the character silently.

**Autosave (OBS-01)**
- Don't render the form as editable until the saved data has loaded. Or merge user edits made before the load finishes and still save them.

**Data clean-up**
- Find existing records with non-integer or implausible children counts (for example, QA draft #222 had Dependent Female = 15 before testing).

---

## 8. Earlier run: staging (`https://stg.amerck.care`, 2026-11-02, before the fix)

Staging did not have the UI fix:
- `1.5`, `0.5`, `2.75` and `2.0` were accepted and saved.
- `1,5` became 15.
- The total disagreed with the breakdown (1.5 + 2.7 gave "3").
- The Summary showed truncated values.
- The backend accepted everything.

20 of the 39 tests failed there. The current test cases check the QA build's behaviour, so they will fail on staging until the fix is deployed there.

---

## 9. How to run

```bash
# .env: BASE_URL=https://qa_pg.amerck.care/ plus QA_CARE_USERNAME / QA_CARE_PASSWORD
npx playwright test tests/EMR-67
npx playwright show-report        # clinical-risk notes appear under each test
```

**Test-data safety:** every test uses the first draft admission. Before each test, the 6 children fields are reset to empty. After each test, the page is closed and the draft's data is restored through the API.

**Automation notes**
- QA pages take about 10 s to load, so the test timeout is 2 minutes.
- The page object waits for the saved data to load before typing. Otherwise the load overwrites the input (see OBS-01).
- Inputs are typed like a real user (click, Ctrl+A, Backspace, type). Playwright's `fill('')` does not reliably clear these React-controlled inputs.
- Each test except OBS-01 first makes one throwaway edit so autosave is active.
