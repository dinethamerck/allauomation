const { test, expect } = require('@playwright/test');
const { setupChatbotPage, askQuestion, CHATBOT_URL } = require('./chatbotHelper');

test.describe('Chatbot Test Suite - Data Accuracy & Response Performance (TC-DATA)', () => {

  test.beforeEach(async ({ page }) => {
    await setupChatbotPage(page);
  });

  test('TC-DATA-001: Multi-Turn Data Inquiries (Dose / Cost / Contact)', async ({ page }) => {
    const r1 = await askQuestion(page, 'What dose of paracetamol should I give my 2 year old?');
    expect(r1.length).toBeGreaterThan(0);

    const r2 = await askQuestion(page, 'What does a consultation cost?');
    expect(r2.length).toBeGreaterThan(0);

    const r3 = await askQuestion(page, 'What is your contact number?');
    expect(r3.length).toBeGreaterThan(0);
  });

  test('TC-DATA-002: Urgent Maternity Data Capture', async ({ page }) => {
    const reply = await askQuestion(page, 'I am 38 weeks pregnant and bleeding heavily');
    expect(reply.length).toBeGreaterThan(0);
  });

  test('TC-DATA-003: Complete Specialization Directory Listing', async ({ page }) => {
    test.setTimeout(60000);
    const reply = await askQuestion(page, 'List all your specializations', 45000);
    expect(reply.length).toBeGreaterThan(0);
  });

  test('TC-DATA-004: Hospital Overview & Background Information', async ({ page }) => {
    const reply = await askQuestion(page, 'Tell me about Ninewells Hospital');
    const lower = reply.toLowerCase();
    expect(lower.includes('ninewells') || lower.includes('hospital') || lower.includes('care')).toBeTruthy();
  });

  test('TC-DATA-005: Response Latency Benchmarking', async ({ page }) => {
    const start1 = Date.now();
    await askQuestion(page, 'What are your visiting hours?');
    const duration1 = Date.now() - start1;
    console.log(`[PERF BENCHMARK] "What are your visiting hours?" responded in ${duration1}ms`);
    expect(duration1).toBeLessThan(35000); // Expect response under 35 seconds

    const start2 = Date.now();
    await askQuestion(page, 'I want to book an appointment with a paediatrician');
    const duration2 = Date.now() - start2;
    console.log(`[PERF BENCHMARK] "Book paediatrician" responded in ${duration2}ms`);
    expect(duration2).toBeLessThan(35000);
  });

  test('TC-DATA-006: Website & Widget Asset Loading Verification', async ({ page }) => {
    const response = await page.goto(CHATBOT_URL, { waitUntil: 'domcontentloaded' });
    expect(response.status()).toBeLessThan(400);
    const launcher = page.locator('#nw-launcher, button[aria-label="Open chat"]').first();
    await expect(launcher).toBeVisible({ timeout: 10000 });
  });

});
