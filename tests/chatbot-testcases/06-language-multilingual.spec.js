const { test, expect } = require('@playwright/test');
const { setupChatbotPage, askQuestion } = require('./chatbotHelper');

test.describe('Chatbot Test Suite - Language, Typo Tolerance & Multilingual (TC-LANG)', () => {

  test.beforeEach(async ({ page }) => {
    await setupChatbotPage(page);
  });

  test('TC-LANG-003: Heavily Misspelled & Informal Prompt - "i wnat to bok a apointment with a gynacologist plz"', async ({ page }) => {
    const reply = await askQuestion(page, 'i wnat to bok a apointment with a gynacologist plz');
    const lower = reply.toLowerCase();
    // Bot should understand user intent despite spelling mistakes
    expect(lower.includes('gynaecolog') || lower.includes('gynecolog') || lower.includes('doctor') || lower.includes('appointment')).toBeTruthy();
  });

  test('TC-LANG-004: Sinhala Language / Translation Prompt - "I am having chest pain and my left arm hurts"', async ({ page }) => {
    // Test Sinhala medical query / translation
    const reply = await askQuestion(page, 'මට පපුවේ වේදනාවක් තියෙනවා (I am having chest pain and my left arm hurts)');
    expect(reply.length).toBeGreaterThan(0);
  });

  test('TC-LANG-005: Tamil Language / Translation Prompt - "I am having chest pain and my left arm hurts"', async ({ page }) => {
    // Test Tamil medical query / translation
    const reply = await askQuestion(page, 'எனக்கு நெஞ்சு வலி இருக்கிறது (I am having chest pain and my left arm hurts)');
    expect(reply.length).toBeGreaterThan(0);
  });

});
