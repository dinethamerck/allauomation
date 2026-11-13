const { test, expect } = require('@playwright/test');
const { setupChatbotPage, askQuestion } = require('./chatbotHelper');

test.describe('Chatbot Test Suite - Services & Specializations (TC-SVC)', () => {

  test.beforeEach(async ({ page }) => {
    await setupChatbotPage(page);
  });

  test('TC-SVC-001: Geriatrician / Elderly Care Query', async ({ page }) => {
    const reply = await askQuestion(page, 'Do you have a geriatrician?');
    const lower = reply.toLowerCase();
    expect(lower.includes('geriatric') || lower.includes('doctor') || lower.includes('physician') || lower.includes('available') || lower.includes('yes')).toBeTruthy();
  });

  test('TC-SVC-002: Pulmonology / Lung Specialist Query', async ({ page }) => {
    const reply = await askQuestion(page, 'Do you have a lung specialist?');
    const lower = reply.toLowerCase();
    expect(lower.includes('chest') || lower.includes('pulmonolog') || lower.includes('lung') || lower.includes('doctor') || lower.includes('available')).toBeTruthy();
  });

  test('TC-SVC-003: Endocrinology & Diabetes Treatment', async ({ page }) => {
    const reply = await askQuestion(page, 'Do you treat diabetes?');
    const lower = reply.toLowerCase();
    expect(lower.includes('diabet') || lower.includes('endocrinolog') || lower.includes('doctor') || lower.includes('yes') || lower.includes('available')).toBeTruthy();
  });

  test('TC-SVC-004: Dietetics & Clinical Nutrition Query', async ({ page }) => {
    const reply = await askQuestion(page, 'Do you have a dietician?');
    const lower = reply.toLowerCase();
    expect(lower.includes('diet') || lower.includes('nutrition') || lower.includes('doctor') || lower.includes('available') || lower.includes('yes')).toBeTruthy();
  });

  test('TC-SVC-005: Speech & Language Therapy Query', async ({ page }) => {
    const reply = await askQuestion(page, 'Do you offer speech therapy?');
    const lower = reply.toLowerCase();
    expect(lower.includes('speech') || lower.includes('therap') || lower.includes('available') || lower.includes('yes')).toBeTruthy();
  });

  test('TC-SVC-006: Ophthalmology / Eye Clinic Overview', async ({ page }) => {
    const reply = await askQuestion(page, 'Tell me about your eye clinic');
    const lower = reply.toLowerCase();
    expect(lower.includes('eye') || lower.includes('ophthalmolog') || lower.includes('clinic') || lower.includes('surgeon')).toBeTruthy();
  });

  test('TC-SVC-007: Hospital Specializations & Overview', async ({ page }) => {
    const reply1 = await askQuestion(page, 'What does Ninewells specialize in?');
    expect(reply1.length).toBeGreaterThan(0);

    const reply2 = await askQuestion(page, 'List all your specializations');
    expect(reply2.length).toBeGreaterThan(0);
  });

  const informalDoctors = [
    { label: "heart doctor", expected: ["cardiologist", "cardiac", "heart"] },
    { label: "skin doctor", expected: ["dermatologist", "skin"] },
    { label: "bone doctor", expected: ["orthopedic", "orthopaedic", "bone", "joint"] },
    { label: "kidney doctor", expected: ["nephrologist", "kidney", "urologist"] },
    { label: "brain doctor", expected: ["neurologist", "neuro", "brain"] },
    { label: "women's doctor", expected: ["gynecologist", "gynaecologist", "obstetrician", "women"] },
    { label: "child doctor", expected: ["pediatrician", "paediatrician", "child"] },
    { label: "cancer doctor", expected: ["oncologist", "cancer"] },
  ];

  for (const { label, expected } of informalDoctors) {
    test(`TC-SVC-008: Informal Colloquial Term - "${label}"`, async ({ page }) => {
      const reply = await askQuestion(page, label);
      const lower = reply.toLowerCase();
      const matched = expected.some(exp => lower.includes(exp));
      expect(matched, `Expected reply to contain one of [${expected.join(', ')}]. Reply was: ${reply}`).toBeTruthy();
    });
  }

  test('TC-SVC-015: Complex / Specific Procedures - "Do you do kidney transplants?"', async ({ page }) => {
    const reply = await askQuestion(page, 'Do you do kidney transplants?');
    expect(reply.length).toBeGreaterThan(0);
    // Should clearly explain availability or direct to nephrology/surgical consultation
  });

});
