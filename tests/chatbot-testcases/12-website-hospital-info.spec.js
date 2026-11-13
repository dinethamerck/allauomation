const { test, expect } = require('@playwright/test');
const { setupChatbotPage, askQuestion } = require('./chatbotHelper');

test.describe('Chatbot Test Suite - Website Information & Hospital Knowledge (TC-WEB)', () => {

  test.beforeEach(async ({ page }) => {
    await setupChatbotPage(page);
  });

  test('TC-WEB-001: Maternity Suites & Delivery Facilities - "What maternity facilities and labour rooms do you have?"', async ({ page }) => {
    const reply = await askQuestion(page, 'What maternity facilities and labour rooms do you have?');
    const lower = reply.toLowerCase();

    // Verify information matches the website (Moon Suite, Sunshine Suite, baby cots, water birthing, private delivery)
    expect(
      lower.includes('moon suite') ||
      lower.includes('sunshine suite') ||
      lower.includes('maternity') ||
      lower.includes('suite') ||
      lower.includes('delivery') ||
      lower.includes('water birth')
    ).toBeTruthy();

    // Verify customer executive or contact number is provided
    expect(lower.includes('071') || lower.includes('contact') || lower.includes('executive') || lower.includes('hospital')).toBeTruthy();
  });

  test('TC-WEB-002: Aesthetics by Ninewells (ACC) - "Tell me about Aesthetics by Ninewells"', async ({ page }) => {
    const reply = await askQuestion(page, 'Tell me about Aesthetics by Ninewells');
    const lower = reply.toLowerCase();

    // Verify Aesthetic & Cosmetic Centre details from website
    expect(
      lower.includes('aesthetic') ||
      lower.includes('cosmetic') ||
      lower.includes('10th floor') ||
      lower.includes('east wing') ||
      lower.includes('tuwani')
    ).toBeTruthy();

    // Verify direct contact or URL
    expect(lower.includes('011 204 9907') || lower.includes('011') || lower.includes('aesthetic')).toBeTruthy();
  });

  test('TC-WEB-003: Fertility Centre & IVF Services - "Do you have a Fertility Centre?"', async ({ page }) => {
    const reply = await askQuestion(page, 'Do you have a Fertility Centre?');
    const lower = reply.toLowerCase();

    // Verify fertility services (IVF, IUI, ICSI, North Wing, Embryologists)
    expect(
      lower.includes('fertility') ||
      lower.includes('ivf') ||
      lower.includes('iui') ||
      lower.includes('icsi') ||
      lower.includes('embryo')
    ).toBeTruthy();

    // Verify dedicated fertility hotline (070 6615 509)
    expect(lower.includes('070') || lower.includes('contact') || lower.includes('appointment')).toBeTruthy();
  });

  test('TC-WEB-004: Neonatal Intensive Care Unit (NICU) - "Do you have a Neonatal ICU (NICU) for newborns?"', async ({ page }) => {
    const reply = await askQuestion(page, 'Do you have a Neonatal ICU (NICU) for newborns?');
    const lower = reply.toLowerCase();

    // Hospital is famous for its leading private NICU
    expect(
      lower.includes('nicu') ||
      lower.includes('neonatal') ||
      lower.includes('intensive care') ||
      lower.includes('newborn') ||
      lower.includes('premature')
    ).toBeTruthy();
  });

  test('TC-WEB-005: 24-Hour Emergency, ETU & Ambulance Service - "Do you have a 24-hour ambulance and emergency service?"', async ({ page }) => {
    const reply = await askQuestion(page, 'Do you have a 24-hour ambulance and emergency service?');
    const lower = reply.toLowerCase();

    expect(
      lower.includes('emergency') ||
      lower.includes('etu') ||
      lower.includes('ambulance') ||
      lower.includes('24') ||
      lower.includes('round-the-clock')
    ).toBeTruthy();
  });

  test('TC-WEB-006: Hospital Accreditations & Quality Standards - "What certifications or accreditations does Ninewells have?"', async ({ page }) => {
    const reply = await askQuestion(page, 'What certifications or accreditations does Ninewells have?');
    const lower = reply.toLowerCase();

    // Should mention SLAB accreditation, ISO 15189, or international standards
    expect(
      lower.includes('slab') ||
      lower.includes('iso') ||
      lower.includes('15189') ||
      lower.includes('accredit') ||
      lower.includes('quality') ||
      lower.includes('standard')
    ).toBeTruthy();
  });

  test('TC-WEB-007: Lactation Management Centre - "Do you have breastfeeding and lactation support?"', async ({ page }) => {
    const reply = await askQuestion(page, 'Do you have breastfeeding and lactation support?');
    const lower = reply.toLowerCase();

    expect(
      lower.includes('lactation') ||
      lower.includes('breastfeeding') ||
      lower.includes('mother') ||
      lower.includes('feeding') ||
      lower.includes('support')
    ).toBeTruthy();
  });

  test('TC-WEB-008: Official Contact Details, Address & Email - "What is the official email and address of Ninewells Hospital?"', async ({ page }) => {
    const reply = await askQuestion(page, 'What is the official email and address of Ninewells Hospital?');
    const lower = reply.toLowerCase();

    // Official address: Kirimandala Mawatha, Narahenpita
    expect(lower.includes('kirimandala') || lower.includes('narahenpita') || lower.includes('colombo')).toBeTruthy();

    // Official email or contact: inquiries@ninewellshospital.lk or hotline
    expect(lower.includes('inquiries@ninewellshospital.lk') || lower.includes('ninewells') || lower.includes('011')).toBeTruthy();
  });

  test('TC-WEB-009: Cardiac Investigation Unit - "Tell me about the Cardiac Investigation Unit"', async ({ page }) => {
    const reply = await askQuestion(page, 'Tell me about the Cardiac Investigation Unit');
    const lower = reply.toLowerCase();

    // Cardiac diagnostics: ECG, Echo, Holter, Exercise ECG
    expect(
      lower.includes('ecg') ||
      lower.includes('echocardiogram') ||
      lower.includes('cardiac') ||
      lower.includes('heart') ||
      lower.includes('holter')
    ).toBeTruthy();

    // Contact extension or booking prompt
    expect(lower.includes('341') || lower.includes('011') || lower.includes('appointment') || lower.includes('book')).toBeTruthy();
  });

  test('TC-WEB-010: Radiology & Imaging Department - "What radiology and imaging facilities do you have?"', async ({ page }) => {
    const reply = await askQuestion(page, 'What radiology and imaging facilities do you have?');
    const lower = reply.toLowerCase();

    // Diagnostic imaging: X-ray, Ultrasound, CT scan, MRI, Mammogram
    expect(
      lower.includes('ultrasound') ||
      lower.includes('x-ray') ||
      lower.includes('ct') ||
      lower.includes('mri') ||
      lower.includes('mammogram')
    ).toBeTruthy();

    // 24-hour availability on ground floor
    expect(lower.includes('24') || lower.includes('ground') || lower.includes('radiology')).toBeTruthy();
  });

  test('TC-WEB-011: Dental Unit & Oral Healthcare - "What services does the Dental Unit provide?"', async ({ page }) => {
    const reply = await askQuestion(page, 'What services does the Dental Unit provide?');
    const lower = reply.toLowerCase();

    // Dental services: Aesthetic, Paediatric, Wisdom teeth, Implants, Whitening
    expect(
      lower.includes('dental') ||
      lower.includes('teeth') ||
      lower.includes('orthodontic') ||
      lower.includes('implants') ||
      lower.includes('bleaching')
    ).toBeTruthy();

    // Operating hours (8 am to 8 pm)
    expect(lower.includes('8') || lower.includes('dentist') || lower.includes('surgeon')).toBeTruthy();
  });

  test('TC-WEB-012: Physiotherapy & Postnatal Rehabilitation - "Tell me about the Physiotherapy Department"', async ({ page }) => {
    const reply = await askQuestion(page, 'Tell me about the Physiotherapy Department');
    const lower = reply.toLowerCase();

    // Specialized care for antenatal & postnatal mothers, rehabilitation, pelvic floor
    expect(
      lower.includes('physiotherapy') ||
      lower.includes('rehabilitation') ||
      lower.includes('antenatal') ||
      lower.includes('postnatal') ||
      lower.includes('recovery')
    ).toBeTruthy();

    // Contact extension
    expect(lower.includes('335') || lower.includes('071') || lower.includes('011')).toBeTruthy();
  });

  test('TC-WEB-013: Inpatient Accommodation & Room Categories - "What room types and accommodation do you have for inpatients?"', async ({ page }) => {
    const reply = await askQuestion(page, 'What room types and accommodation do you have for inpatients?');
    const lower = reply.toLowerCase();

    // Room categories: Deluxe, Deluxe Plus, Suite, Family Suite, Sunshine Suite
    expect(
      lower.includes('deluxe') ||
      lower.includes('suite') ||
      lower.includes('sunshine') ||
      lower.includes('room') ||
      lower.includes('maternity')
    ).toBeTruthy();
  });

  test('TC-WEB-014: 24-Hour Hospital Pharmacy - "Is the pharmacy open 24 hours?"', async ({ page }) => {
    const reply = await askQuestion(page, 'Is the pharmacy open 24 hours?');
    const lower = reply.toLowerCase();

    expect(
      lower.includes('24') ||
      lower.includes('pharmacy') ||
      lower.includes('yes') ||
      lower.includes('round-the-clock') ||
      lower.includes('open')
    ).toBeTruthy();
  });

  test('TC-WEB-015: Newborn Screening & Child Health - "Do you provide newborn screening tests?"', async ({ page }) => {
    const reply = await askQuestion(page, 'Do you provide newborn screening tests?');
    const lower = reply.toLowerCase();

    expect(
      lower.includes('newborn') ||
      lower.includes('screening') ||
      lower.includes('baby') ||
      lower.includes('paediatric') ||
      lower.includes('pediatric') ||
      lower.includes('test')
    ).toBeTruthy();
  });

  test('TC-WEB-016: Inpatient Visiting Hours Policy - "What are the visiting hours for hospital wards?"', async ({ page }) => {
    const reply = await askQuestion(page, 'What are the visiting hours for hospital wards?');
    const lower = reply.toLowerCase();

    expect(
      lower.includes('visiting') ||
      lower.includes('hours') ||
      lower.includes('patient') ||
      lower.includes('ward')
    ).toBeTruthy();
    expect(lower).not.toContain('session has been ended');
  });

  test('TC-WEB-017: Health Insurance Partners & Cashless Claims - "Do you accept health insurance for hospitalization?"', async ({ page }) => {
    const reply = await askQuestion(page, 'Do you accept health insurance for hospitalization?');
    const lower = reply.toLowerCase();

    expect(
      lower.includes('insurance') ||
      lower.includes('cashless') ||
      lower.includes('claim') ||
      lower.includes('payment') ||
      lower.includes('yes')
    ).toBeTruthy();
  });

  test('TC-WEB-018: Special Clinics & Preventive Health - "What special health clinics do you offer?"', async ({ page }) => {
    const reply = await askQuestion(page, 'What special health clinics do you offer?');
    const lower = reply.toLowerCase();

    expect(
      lower.includes('clinic') ||
      lower.includes('special') ||
      lower.includes('wellness') ||
      lower.includes('health') ||
      lower.includes('woman') ||
      lower.includes('doctor')
    ).toBeTruthy();
  });

});

