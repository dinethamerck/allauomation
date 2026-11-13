// @ts-check

class AdmissionsPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // Header & Tabs
    this.heading = page.locator('h3:has-text("Admissions")').first();
    this.admittedTab = page.locator('button[role="tab"]:has-text("Admitted")');
    this.dischargedTab = page.locator('button[role="tab"]:has-text("Discharged")');

    // Search Input
    this.searchInput = page.locator('input[placeholder="Search patients"], input[name="query"]').first();

    // Action Button
    this.admitPatientButton = page.locator('button:has-text("Admit Patient")');

    // Table & rows
    this.table = page.locator('table');
    this.tableHeaders = page.locator('table thead th, table th');
    this.tableRows = page.locator('table tbody tr');
    this.tableBody = page.locator('table tbody');

    // Pagination
    this.previousButton = page.locator('button:has-text("Previous"), a:has-text("Previous")').first();
    this.nextButton = page.locator('button:has-text("Next"), a:has-text("Next")').first();

    // Admit Patient Search Dialog
    this.admitDialog = page.locator('div[role="dialog"]:has-text("Search Patients")');
    this.admitDialogTitle = this.admitDialog.locator('text=Search Patients');
    this.admitDialogInput = this.admitDialog.locator('input[placeholder*="ID Card Number"]');
    this.admitDialogSearchBtn = this.admitDialog.locator('button:has-text("Search")');
    this.admitDialogCloseBtn = this.admitDialog.locator('button:has-text("Close"), button.absolute').first();
    this.admitDialogResultCards = this.admitDialog.locator('div.cursor-pointer');
    this.admitDialogCreateNewBtn = this.admitDialog.locator('button:has-text("Create New Patient")');

    // Existing Draft Modal
    this.existingDraftDialog = page.locator('div[role="dialog"]:has-text("Existing Draft Admission Found")');
    this.continueDraftBtn = this.existingDraftDialog.locator('button:has-text("Continue Existing Draft")');
    this.createNewAdmissionBtn = this.existingDraftDialog.locator('button:has-text("Create New Admission")');
    this.cancelDraftBtn = this.existingDraftDialog.locator('button:has-text("Cancel")');

    // Admission Onboarding Page Controls
    this.backToAdmissionsBtn = page.locator('button:has-text("Back to Admissions")');
    this.onboardingContinueBtn = page.locator('button:has-text("Continue")');
  }

  /**
   * Navigates to Admissions page
   */
  async goto() {
    await this.page.goto('/admin/admissions', { waitUntil: 'domcontentloaded' });
    await this.table.first().waitFor({ state: 'visible', timeout: 20000 }).catch(async () => {
      await this.page.goto('/admin/admissions');
      await this.table.first().waitFor({ state: 'visible', timeout: 15000 });
    });
    await this.page.waitForTimeout(1000);
  }

  /**
   * Switches admission tab (Admitted / Discharged)
   * @param {'Admitted' | 'Discharged'} tabName
   */
  async switchTab(tabName) {
    const tab = tabName === 'Discharged' ? this.dischargedTab : this.admittedTab;
    await tab.waitFor({ state: 'visible' });
    await tab.click();
    await this.page.waitForTimeout(1500);
  }

  /**
   * Filters patients list by name, NIC, or mobile
   * @param {string} query
   */
  async searchPatient(query) {
    await this.searchInput.waitFor({ state: 'visible' });
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(1500);
  }

  /**
   * Clears patient search input
   */
  async clearSearch() {
    await this.searchInput.waitFor({ state: 'visible' });
    await this.searchInput.fill('');
    await this.page.waitForTimeout(1500);
  }

  /**
   * Opens Admit Patient Search dialog
   */
  async openAdmitPatientDialog() {
    await this.admitPatientButton.waitFor({ state: 'visible' });
    await this.admitPatientButton.click();
    await this.admitDialog.waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Closes Admit Patient Search dialog
   */
  async closeAdmitPatientDialog() {
    await this.admitDialogCloseBtn.waitFor({ state: 'visible' });
    await this.admitDialogCloseBtn.click();
    await this.admitDialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => null);
  }

  /**
   * Searches for a patient inside Admit Patient modal
   * @param {string} identifier
   */
  async searchInAdmitDialog(identifier) {
    await this.admitDialogInput.waitFor({ state: 'visible' });
    await this.admitDialogInput.fill(identifier);

    const responsePromise = this.page.waitForResponse(
      (res) => res.url().includes('getUniqueIdentifyPatients'),
      { timeout: 10000 }
    ).catch(() => null);

    await this.admitDialogSearchBtn.click();
    await responsePromise;
    await this.page.waitForTimeout(1000);
  }

  /**
   * Selects a patient result card inside Admit Patient dialog
   * @param {number} [index=0]
   */
  async selectPatientFromAdmitDialog(index = 0) {
    await this.admitDialogResultCards.nth(index).waitFor({ state: 'visible', timeout: 8000 });
    await this.admitDialogResultCards.nth(index).click();
    await this.page.waitForTimeout(1500);
  }

  /**
   * If existing draft prompt appears, continues existing draft
   */
  async continueExistingDraft() {
    try {
      if (await this.continueDraftBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await this.continueDraftBtn.click();
      }
    } catch (_) {}
    await this.page.waitForURL((url) => url.pathname.includes('/admissions/onboarding'), { timeout: 15000 });
    await this.page.waitForTimeout(1000);
  }

  /**
   * Clicks an admission record row in the table
   * @param {number} [index=0]
   */
  async selectAdmissionRow(index = 0) {
    await this.tableRows.nth(index).waitFor({ state: 'visible' });
    await this.tableRows.nth(index).click();
    await this.page.waitForURL((url) => url.pathname.includes('/admissions/onboarding'), { timeout: 10000 });
    await this.page.waitForTimeout(1000);
  }

  /**
   * Clicks Back to Admissions button from Onboarding page
   */
  async clickBackToAdmissions() {
    await this.backToAdmissionsBtn.waitFor({ state: 'visible', timeout: 8000 });
    await this.backToAdmissionsBtn.click();
    await this.page.waitForURL((url) => url.pathname === '/admin/admissions' || url.pathname.includes('/admin/admissions'), { timeout: 10000 });
    await this.table.waitFor({ state: 'visible', timeout: 15000 });
  }
}

module.exports = { AdmissionsPage };
