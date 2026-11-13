// pages/SocialHistoryPage.js
const { BasePage } = require('./BasePage');

/**
 * Page Object Model for Admission Wizard -> Step 8: Social History
 * Focus: "No. of Children" counts (EMR-67)
 *
 * Field -> form-data key mapping (PUT {api}/admissions/form/:id):
 *   Dependent  / Male   -> dependentChildrenMale
 *   Dependent  / Female -> dependentChildrenFemale   (total: dependentChildrenCount)
 *   Independent/ Male   -> independentChildrenMale
 *   Independent/ Female -> independentChildrenFemale (total: independentChildrenCount)
 */
class SocialHistoryPage extends BasePage {
  static FIELDS = [
    { group: 'Dependent', gender: 'Male', key: 'dependentChildrenMale' },
    { group: 'Dependent', gender: 'Female', key: 'dependentChildrenFemale' },
    { group: 'Independent', gender: 'Male', key: 'independentChildrenMale' },
    { group: 'Independent', gender: 'Female', key: 'independentChildrenFemale' },
  ];

  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    super(page);
    this.admissionId = null;
    /** API origin + bearer token, sniffed from the app's own authenticated requests. */
    this.api = { origin: null, auth: null };
    /** Every form save (PUT /admissions/form/:id) the wizard sends, in order. */
    this.saves = [];
    page.on('request', (req) => {
      const auth = req.headers().authorization;
      if (auth && !this.api.auth) {
        this.api = { origin: new URL(req.url()).origin, auth };
      }
      if (req.method() === 'PUT' && /\/admissions\/form\/\d+/.test(req.url())) {
        this.saves.push({ at: Date.now(), req, data: JSON.parse(req.postData() || '{}').data ?? null });
      }
    });

    this.socialHistoryTab = page.getByRole('button', { name: /8\.\s*Social History/i }).first();
    this.summaryTab = page.getByRole('button', { name: /Summary/i }).first();
    this.childrenHeading = page.locator('label', { hasText: /^No\. of Children$/ }).first();
    this.occupationInput = page.locator('input[name="occupation"]');
    this.continueButton = page.getByRole('button', { name: /^Continue/ });
    this.validationErrors = page.locator('.text-destructive, [role="alert"], .text-red-500, [aria-invalid="true"]');
  }

  /**
   * Opens the first draft admission and lands on Step 8: Social History
   */
  /**
   * @param {{waitForData?: boolean}} [opts] waitForData=false types-ready as soon as the form is
   *   visible (like a fast user), without waiting for the saved data to load.
   */
  async goto({ waitForData = true } = {}) {
    await this.page.goto('/admin/admissions', { waitUntil: 'domcontentloaded' });
    await this.ensureAuthenticated();
    const draft = this.page.locator('text=Draft').first();
    await draft.waitFor({ state: 'visible', timeout: 60000 });
    const loaded = this._formLoaded();
    await draft.click();
    await this.page.waitForURL(/\/onboarding\/\d+/, { timeout: 20000 });
    this.admissionId = Number(this.page.url().match(/\/onboarding\/(\d+)/)[1]);
    if (waitForData) await loaded;
    await this.openSocialHistory();
    if (waitForData) await this.waitForFieldsToMatchServer();
  }

  /**
   * Waits until all 4 children inputs show exactly what the server has stored.
   * More reliable than a fixed pause on slow environments (QA hydrates the form several seconds late).
   */
  async waitForFieldsToMatchServer(timeout = 20000) {
    if (!this.api.auth || !this.admissionId) return;
    const server = (await this.apiGetForm()).data || {};
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const ui = await Promise.all(SocialHistoryPage.FIELDS.map((f) => this.getChildren(f.group, f.gender)));
      if (SocialHistoryPage.FIELDS.every((f, i) => ui[i] === String(server[f.key] ?? ''))) return;
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * Resolves once the wizard has fetched the admission's saved data (GET {api}/admissions/:id).
   * The form renders empty first and fills in ~1s later; typing before that gets overwritten.
   */
  async _formLoaded() {
    await this.page
      .waitForResponse((r) => r.request().method() === 'GET' && /\/admissions\/(form\/)?\d+(\?|$)/.test(r.url()), { timeout: 30000 })
      .catch(() => null);
    await this.page.waitForTimeout(750); // let React apply the loaded data
  }

  async openSocialHistory() {
    await this.socialHistoryTab.waitFor({ state: 'visible', timeout: 15000 });
    await this.socialHistoryTab.click();
    await this.childrenHeading.waitFor({ state: 'visible', timeout: 15000 });
  }

  /**
   * @param {'Dependent'|'Independent'} group
   * @param {'Male'|'Female'} gender
   */
  childrenInput(group, gender) {
    return this.page
      .locator(`div:has(> div > span:text-is("${group} Children"))`)
      .locator(`div:has(> label:text-is("${gender}")) > input`);
  }

  /**
   * Clears the field and types key-by-key exactly as a user would (click, Ctrl+A, Backspace, type).
   * Note: Playwright's programmatic fill('') does not reliably clear these React-controlled inputs.
   */
  async typeChildren(group, gender, text) {
    await this._typeLikeUser(this.childrenInput(group, gender), String(text));
  }

  async typeOccupation(text) {
    await this._typeLikeUser(this.occupationInput, text);
  }

  async _typeLikeUser(input, text) {
    await input.click();
    await this.page.keyboard.press('Control+A');
    await this.page.keyboard.press('Backspace');
    if (text) await this.page.keyboard.type(text, { delay: 30 });
  }

  /** Sets the value in one step, as a paste / autofill would. */
  async pasteChildren(group, gender, text) {
    await this.childrenInput(group, gender).fill(String(text));
  }

  async getChildren(group, gender) {
    return this.childrenInput(group, gender).inputValue();
  }

  /** Browser constraint-validation state of the field. */
  async getValidity(group, gender) {
    return this.childrenInput(group, gender).evaluate((el) => ({
      valid: el.validity.valid,
      stepMismatch: el.validity.stepMismatch,
      rangeUnderflow: el.validity.rangeUnderflow,
      message: el.validationMessage,
    }));
  }

  /**
   * The wizard autosaves ~1s after typing stops (Continue itself does not save).
   * Call markSave() before an edit, then waitForSave(mark) to get the `data` object of the
   * last save sent after the mark, once saving has gone quiet. Returns null if nothing was saved
   * (i.e. the UI blocked the save).
   */
  markSave() {
    return this.saves.length;
  }

  async waitForSave(mark, { timeout = 8000, quietMs = 2000 } = {}) {
    // Some saves carry only part of the form, so merge everything sent since the mark.
    const merged = () => Object.assign({}, ...this.saves.slice(mark).map((s) => s.data || {}));
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const last = this.saves[this.saves.length - 1];
      if (this.saves.length > mark && Date.now() - last.at >= quietMs) {
        // Make sure the server has answered every save before the caller reloads or reads back.
        await Promise.all(this.saves.slice(mark).map((s) => s.req.response().catch(() => null)));
        return merged();
      }
      await this.page.waitForTimeout(250);
    }
    return this.saves.length > mark ? merged() : null;
  }

  /**
   * Workaround for a defect: the FIRST edit after the wizard opens is never autosaved.
   * Makes a throwaway edit (type 0, then clear) so that later edits are autosaved normally.
   */
  async primeAutosave() {
    await this.typeChildren('Independent', 'Female', '0');
    await this.page.waitForTimeout(1500);
    const mark = this.markSave();
    await this.typeChildren('Independent', 'Female', '');
    await this.waitForSave(mark);
  }

  /** Types values into several fields and returns what the autosave sent (or null). */
  async enterAndCaptureSave(values) {
    const mark = this.markSave();
    for (const [group, gender, text] of values) await this.typeChildren(group, gender, text);
    return this.waitForSave(mark);
  }

  /** Reloads the wizard and reopens Social History. */
  async reloadAndReopen() {
    const loaded = this._formLoaded();
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await loaded;
    await this.openSocialHistory();
    await this.waitForFieldsToMatchServer();
  }

  async openSummary() {
    await this.summaryTab.click();
    await this.page.locator('text=Admission Summary').first().waitFor({ state: 'visible', timeout: 15000 });
  }

  /** Text shown in the Summary step for 'Dependent' / 'Independent' children. */
  async getSummaryChildrenText(group) {
    return (await this.page.locator(`span:text-is("${group} Children") + span`).last().innerText()).trim();
  }

  // ---------------------------------------------------------------------------
  // Backend helpers (same endpoint the wizard uses)
  // ---------------------------------------------------------------------------

  _formUrl() {
    if (!this.api.origin || !this.admissionId) throw new Error('API origin / admission id not captured yet - call goto() first');
    return `${this.api.origin}/admissions/form/${this.admissionId}`;
  }

  /** @returns {Promise<{data: object, version: number, status: string, current_step: number}>} */
  async apiGetForm() {
    const res = await this.page.context().request.get(this._formUrl(), { headers: { authorization: this.api.auth } });
    if (!res.ok()) throw new Error(`GET form failed: ${res.status()}`);
    return (await res.json()).payload.formData;
  }

  /**
   * Saves form data exactly like the wizard does.
   * @param {object} data full form `data` object
   * @param {{version:number,status:string,current_step:number}} meta
   */
  async apiPutForm(data, meta) {
    return this.page.context().request.put(this._formUrl(), {
      headers: { authorization: this.api.auth, 'content-type': 'application/json' },
      data: { currentStep: meta.current_step ?? 7, data, version: meta.version ?? 1, status: meta.status ?? 'draft' },
    });
  }
}

module.exports = { SocialHistoryPage };
