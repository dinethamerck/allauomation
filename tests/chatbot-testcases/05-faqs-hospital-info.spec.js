const { test, expect } = require('@playwright/test');
const { setupChatbotPage, askQuestion } = require('./chatbotHelper');

test.describe('Chatbot Test Suite - General FAQs & Hospital Info (TC-FAQ)', () => {

  test.beforeEach(async ({ page }) => {
    await setupChatbotPage(page);
  });

  test('TC-FAQ-001: Inpatient Visiting Hours - "What are your visiting hours?"', async ({ page }) => {
    const reply = await askQuestion(page, 'What are your visiting hours?');
    expect(reply.length).toBeGreaterThan(0);
    expect(reply.toLowerCase()).not.toContain('session has been ended');
  });

  test('TC-FAQ-002: Main Hotline Number - "What is your main hotline number?"', async ({ page }) => {
    const reply = await askQuestion(page, 'What is your main hotline number?');
    const lower = reply.toLowerCase();
    expect(lower.includes('hotline') || lower.includes('204 9999') || lower.includes('011') || lower.includes('contact') || lower.includes('phone')).toBeTruthy();
  });

  test('TC-FAQ-003: Hospital Location & Address - "Where is Ninewells Hospital located?"', async ({ page }) => {
    const reply = await askQuestion(page, 'Where is Ninewells Hospital located?');
    const lower = reply.toLowerCase();
    expect(lower.includes('kirimandala') || lower.includes('narahenpita') || lower.includes('colombo') || lower.includes('location') || lower.includes('address')).toBeTruthy();
  });

  test('TC-FAQ-004: Insurance & Payment Methods Acceptance', async ({ page }) => {
    const reply1 = await askQuestion(page, 'Do you accept insurance?');
    expect(reply1.length).toBeGreaterThan(0);

    const reply2 = await askQuestion(page, 'What payment methods do you accept?');
    expect(reply2.length).toBeGreaterThan(0);
  });

});
