/** "Search patient(s)" dialog shared by Refraction Room (New Consultation) and Optical Shop (New Order). */
class PatientSearchDialog {
  constructor(page) {
    this.page = page;
    this.dialog = page.getByRole('dialog');
    this.query = this.dialog.getByRole('textbox').first();
    this.searchButton = this.dialog.getByRole('button', { name: 'Search' });
  }

  async search(identifier) {
    await this.query.fill(identifier);
    await this.searchButton.click();
    await this.dialog.getByText('Select a patient to continue').waitFor();
  }

  async select(patientName) {
    await this.dialog.getByText(patientName, { exact: true }).first().click();
  }
}

module.exports = { PatientSearchDialog };
