// @ts-check

class DocumentsPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Hub Header & Tabs
    this.mainContainer = page.locator('main').first();
    this.createTab = page.locator('button[role="tab"]:has-text("Create Document")');
    this.recentTab = page.locator('button[role="tab"]:has-text("Recent Documents")');

    // Create Document Tab - Template Cards
    this.templateCards = page.locator('main .rounded-xl');
    this.aiWriterCard = page.locator('main .rounded-xl').filter({ hasText: 'AI Writer' }).first();
    this.referralCard = page.locator('main .rounded-xl').filter({ hasText: 'Referral Letter' }).first();
    this.medicalLeaveCard = page.locator('main .rounded-xl').filter({ hasText: 'Medical Leave Certificate' }).first();
    this.deathConfirmationCard = page.locator('main .rounded-xl').filter({ hasText: 'Confirmation of Death' }).first();
    this.customLetterCard = page.locator('main .rounded-xl').filter({ hasText: 'Custom Letter' }).first();

    // Template Action Buttons
    this.createWithAiButton = page.locator('button:has-text("Create with AI")');
    this.createReferralButton = page.locator('button:has-text("Create Referral")');
    this.createMedicalLeaveButton = this.medicalLeaveCard.locator('button:has-text("Create Certificate")');
    this.createDeathConfirmationButton = this.deathConfirmationCard.locator('button:has-text("Create Certificate")');
    this.createCustomButton = page.locator('button:has-text("Create Custom")');

    // Recent Documents Tab Elements
    this.recentLettersList = page.locator('main ul a[href*="/admin/letters/edit/"]');
    this.noLettersFoundMessage = page.locator('text=No letters found');
    this.createFirstLetterButton = page.locator('button:has-text("Create your first letter")');
    this.paginationPreviousButton = page.locator('nav[aria-label="pagination"] a:has-text("Previous"), button:has-text("Previous"), a:has-text("Previous")').first();
    this.paginationNextButton = page.locator('nav[aria-label="pagination"] a:has-text("Next"), button:has-text("Next"), a:has-text("Next")').first();
    this.pageIndicator = page.locator('nav[aria-label="pagination"] a:has-text("/"), text=/\\d+\\/\\d+/').first();

    // Letter Editor Elements (/admin/letters/edit/...)
    this.editorBackButton = page.locator('button:has-text("Back"), a:has-text("Back")').first();
    this.statusBadge = page.locator('p:has-text("Draft")').first();
    this.patientSearchInput = page.locator('input[placeholder*="Search by name, NIC or mobile number"]');
    this.cmdkItems = page.locator('[cmdk-item]');
    this.dateInput = page.locator('input[name="date"], input[type="date"]').first();
    this.recipientNameInput = page.locator('input[name="recipient_name"], #recipient_name');
    this.recipientDesignationInput = page.locator('input[name="recipient_designation"], #recipient_designation');
    this.greetingInput = page.locator('input[name="greeting"], #greeting');
    this.subjectInput = page.locator('input[name="subject"], #subject');
    this.bodyInput = page.locator('textarea[name="body"], #body');

    // Editor View Mode Switchers
    this.formViewButton = page.locator('button:has-text("Form")');
    this.splitViewButton = page.locator('button:has-text("Split")');
    this.previewViewButton = page.locator('button:has-text("Preview")');

    // Editor Action Buttons
    this.saveDraftButton = page.locator('button:has-text("Save Draft")');
    this.printButton = page.locator('button:has-text("Print")').first();
    this.finalizePrintButton = page.locator('button:has-text("Finalize & Print")');

    // AI Letter Generator Page Elements (/admin/letters/ai)
    this.aiBackButton = page.locator('button:has-text("Back to Letters"), a:has-text("Back to Letters")').first();
    this.aiHeading = page.locator('text=AI Letter Generator');
  }

  /**
   * Navigates to the Documents hub (/admin/letters)
   */
  async goto() {
    await this.page.goto('/admin/letters', { waitUntil: 'domcontentloaded' });
    try {
      await this.createTab.waitFor({ state: 'visible', timeout: 10000 });
    } catch {
      const errorBoundary = this.page.locator('text=Something went wrong!');
      if (await errorBoundary.isVisible().catch(() => false)) {
        await this.page.reload({ waitUntil: 'domcontentloaded' });
      }
      await this.createTab.waitFor({ state: 'visible', timeout: 20000 });
    }
    await this.templateCards.first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => null);
  }

  /**
   * Switches to "Create Document" tab
   */
  async switchToCreateTab() {
    await this.createTab.waitFor({ state: 'visible' });
    await this.createTab.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Switches to "Recent Documents" tab and waits for API responses
   */
  async switchToRecentTab() {
    await this.recentTab.waitFor({ state: 'visible' });
    const responsePromise = this.page.waitForResponse(
      (res) => res.url().includes('getLatestLetters'),
      { timeout: 7000 }
    ).catch(() => null);
    await this.recentTab.click();
    await responsePromise;
    await this.page.waitForTimeout(1000);
  }

  /**
   * Clicks "Create with AI" and navigates to /admin/letters/ai
   */
  async clickCreateWithAi() {
    await this.createWithAiButton.waitFor({ state: 'visible' });
    await this.createWithAiButton.click();
    await this.page.waitForURL((url) => url.pathname.includes('/letters/ai'), { timeout: 10000 });
    await this.aiHeading.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Clicks "Create Referral" and navigates to editor
   */
  async clickCreateReferral() {
    await this.createReferralButton.waitFor({ state: 'visible' });
    await this.createReferralButton.click();
    await this.page.waitForURL((url) => url.pathname.includes('/letters/edit/'), { timeout: 10000 });
    await this.patientSearchInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.page.waitForTimeout(1000);
  }

  /**
   * Clicks "Create Certificate" for Medical Leave
   */
  async clickCreateMedicalLeave() {
    await this.createMedicalLeaveButton.waitFor({ state: 'visible' });
    await this.createMedicalLeaveButton.click();
    await this.page.waitForURL((url) => url.pathname.includes('/letters/edit/'), { timeout: 10000 });
    await this.patientSearchInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.page.waitForTimeout(1000);
  }

  /**
   * Clicks "Create Certificate" for Confirmation of Death
   */
  async clickCreateDeathConfirmation() {
    await this.createDeathConfirmationButton.waitFor({ state: 'visible' });
    await this.createDeathConfirmationButton.click();
    await this.page.waitForURL((url) => url.pathname.includes('/letters/edit/'), { timeout: 10000 });
    await this.patientSearchInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.page.waitForTimeout(1000);
  }

  /**
   * Clicks "Create Custom" and navigates to editor
   */
  async clickCreateCustom() {
    await this.createCustomButton.waitFor({ state: 'visible' });
    await this.createCustomButton.click();
    await this.page.waitForURL((url) => url.pathname.includes('/letters/edit/'), { timeout: 10000 });
    await this.patientSearchInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.page.waitForTimeout(1000);
  }

  /**
   * Searches and selects a patient in the letter editor
   * @param {string} [query='janitha0124']
   */
  async selectPatient(query = 'janitha0124') {
    await this.patientSearchInput.waitFor({ state: 'visible' });
    await this.page.waitForTimeout(500);
    await this.patientSearchInput.click();

    const patientResponsePromise = this.page.waitForResponse(
      (res) => res.url().includes('getPatients') && res.url().includes(query) && res.status() === 200,
      { timeout: 10000 }
    ).catch(() => null);

    await this.patientSearchInput.fill(query);
    await patientResponsePromise;
    await this.page.waitForTimeout(600);

    const targetItem = this.cmdkItems.filter({ hasText: new RegExp(query + '|janitha0124|Test|PID|\\d+', 'i') }).first();
    await targetItem.waitFor({ state: 'visible', timeout: 10000 });
    await targetItem.click();

    // Wait until patient is attached to draft status
    await this.page.locator('p:has-text("Draft")').filter({ hasText: /Patient:/ }).waitFor({ state: 'visible', timeout: 10000 });
    await this.page.waitForTimeout(500);
  }

  /**
   * Fills letter form fields
   * @param {{ recipientName?: string, recipientDesignation?: string, greeting?: string, subject?: string, body?: string }} data
   */
  async fillLetterDetails(data) {
    if (data.recipientName) {
      await this.recipientNameInput.waitFor({ state: 'visible' });
      await this.recipientNameInput.fill(data.recipientName);
    }
    if (data.recipientDesignation) {
      await this.recipientDesignationInput.fill(data.recipientDesignation);
    }
    if (data.greeting) {
      await this.greetingInput.fill(data.greeting);
    }
    if (data.subject) {
      await this.subjectInput.fill(data.subject);
    }
    if (data.body) {
      await this.bodyInput.fill(data.body);
    }
  }

  /**
   * Clicks Save Draft button and waits for backend mutation
   */
  async saveDraft() {
    await this.saveDraftButton.waitFor({ state: 'visible' });
    await this.page.waitForFunction(
      () => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Save Draft'));
        return btn && !btn.disabled;
      },
      { timeout: 10000 }
    ).catch(() => null);

    const responsePromise = this.page.waitForResponse(
      (res) => res.url().includes('letters') && (res.status() === 200 || res.status() === 201),
      { timeout: 10000 }
    ).catch(() => null);

    await this.saveDraftButton.click();
    await responsePromise;
    await this.page.waitForTimeout(1500);
  }

  /**
   * Returns back to /admin/letters hub
   */
  async clickBack() {
    await this.editorBackButton.waitFor({ state: 'visible' });
    await this.editorBackButton.click();
    await this.page.waitForURL((url) => url.pathname === '/admin/letters' || url.pathname.endsWith('/letters'), { timeout: 10000 });
    await this.createTab.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Returns recent document entry matching subject text
   * @param {string} subject
   */
  getRecentItemBySubject(subject) {
    return this.recentLettersList.filter({ hasText: subject }).first();
  }

  /**
   * Opens recent document matching subject
   * @param {string} subject
   */
  async openRecentLetterBySubject(subject) {
    const item = this.getRecentItemBySubject(subject);
    await item.waitFor({ state: 'visible', timeout: 10000 });
    await item.click();
    await this.page.waitForURL((url) => url.pathname.includes('/letters/edit/'), { timeout: 10000 });
    await this.subjectInput.waitFor({ state: 'visible', timeout: 10000 });
  }
}

module.exports = { DocumentsPage };
