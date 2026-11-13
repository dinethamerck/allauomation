const { test, expect } = require('@playwright/test');
const { setupChatbotPage, askQuestion } = require('./chatbotHelper');
const fs = require('fs');
const path = require('path');

const testCasesPath = path.join(__dirname, 'all-testcases.txt');
const testCases = fs.readFileSync(testCasesPath, 'utf8').split('\n').filter(line => line.trim() !== '');

test.describe('Miscellaneous Testcases', () => {
  test.beforeEach(async ({ page }) => {
    await setupChatbotPage(page);
  });

  for (const [index, prompt] of testCases.entries()) {
    test(`Prompt ${index + 1}: ${prompt.substring(0, 50)}`, async ({ page }) => {
      const reply = await askQuestion(page, prompt);
      expect(reply.length).toBeGreaterThan(0);
    });
  }
});
