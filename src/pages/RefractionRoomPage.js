const { PatientSearchDialog } = require('./PatientSearchDialog');

/** Refraction Room: /admin/optical-consultations (list) and /admin/optical-consultations/:id (form). */
class RefractionRoomPage {
  constructor(page) {
    this.page = page;
    this.newConsultationButton = page.getByRole('button', { name: 'New Consultation' });
    this.searchInput = page.getByPlaceholder('Search consultations…');
    this.remarks = page.locator('#remarks');
    this.saveButton = page.getByRole('button', { name: 'Save', exact: true });
    this.sendToShopButton = page.getByRole('button', { name: 'Send To Shop' });
    this.patientSearch = new PatientSearchDialog(page);
  }

  async goto() {
    await this.page.goto('/admin/optical-consultations');
    await this.newConsultationButton.waitFor();
  }

  /** Creates a draft consultation and returns its prescription id. */
  async startConsultation(patient) {
    await this.newConsultationButton.click();
    await this.patientSearch.search(patient.mobile);
    await this.patientSearch.select(patient.name);
    await this.page.waitForURL(/\/optical-consultations\/\d+$/, { timeout: 60_000 });
    await this.saveButton.waitFor();
    return Number(this.page.url().match(/(\d+)$/)[1]);
  }

  /** Visual-acuity values are clickable chips (div), e.g. "6/9". First group = right eye uncorrected. */
  async selectVisualAcuity(value = '6/9', index = 0) {
    await this.page.getByText(value, { exact: true }).nth(index).click();
  }

  async save() {
    const saved = this.page.waitForResponse(r => /\/optical-system\/prescriptions\/\d+$/.test(r.url()) && r.request().method() === 'PUT');
    await this.saveButton.click();
    await saved;
  }

  async sendToShop() {
    await this.sendToShopButton.click();
    const dialog = this.page.getByRole('dialog');
    await dialog.getByText('End Consultation').waitFor();
    await dialog.getByRole('button', { name: 'Confirm' }).click();
    await this.page.waitForURL(/\/optical-consultations$/, { timeout: 60_000 });
  }

  rowByPatient(name) {
    return this.page.getByRole('row').filter({ hasText: name });
  }
}

module.exports = { RefractionRoomPage };
