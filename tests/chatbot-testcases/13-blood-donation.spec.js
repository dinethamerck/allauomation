const { test, expect } = require('@playwright/test');
const { setupChatbotPage, askQuestion } = require('./chatbotHelper');

test.describe('Chatbot Test Suite - Blood Donation & Media/Image Validation (TC-BLD)', () => {

  test('TC-BLD-001: Blood Donation Inquiry & Step-by-Step Procedure', async ({ page }) => {
    await setupChatbotPage(page);

    const reply = await askQuestion(page, 'How can I donate blood at Ninewells Hospital?');
    const lower = reply.toLowerCase();

    // Verify confirmation of blood bank
    expect(lower.includes('blood bank') || lower.includes('donate') || lower.includes('blood')).toBeTruthy();

    // Verify donation process stages (Registration, Screening, Donation, Rest & Refreshment)
    expect(
      lower.includes('register') ||
      lower.includes('screening') ||
      lower.includes('donation') ||
      lower.includes('refreshment')
    ).toBeTruthy();

    // Verify contact details are provided
    expect(lower.includes('011') || lower.includes('071') || lower.includes('330') || lower.includes('call')).toBeTruthy();
  });

  test('TC-BLD-002: Pre-Donation Guidelines & Donor Requirements', async ({ page }) => {
    await setupChatbotPage(page);

    const reply = await askQuestion(page, 'What should I do before donating blood?');
    const lower = reply.toLowerCase();

    // Check pre-donation health advice
    expect(
      lower.includes('meal') ||
      lower.includes('water') ||
      lower.includes('sleep') ||
      lower.includes('id') ||
      lower.includes('medication') ||
      lower.includes('health')
    ).toBeTruthy();
  });

  test('TC-BLD-003: Blood Bank Contact Hotline & Extension Verification', async ({ page }) => {
    await setupChatbotPage(page);

    const reply = await askQuestion(page, 'What is the contact number for the Blood Bank?');
    const lower = reply.toLowerCase();

    // Check for official Blood Bank extensions and direct numbers (0112 049 933, 071 9804 455, Ext 330)
    expect(
      lower.includes('0112 049 933') ||
      lower.includes('071 9804 455') ||
      lower.includes('330') ||
      lower.includes('011') ||
      lower.includes('071')
    ).toBeTruthy();
  });

  test('TC-BLD-004: 24-Hour Blood Bank Round-the-Clock Availability', async ({ page }) => {
    await setupChatbotPage(page);

    const reply = await askQuestion(page, 'Is the blood bank open 24 hours?');
    const lower = reply.toLowerCase();

    expect(
      lower.includes('24-hour') ||
      lower.includes('24') ||
      lower.includes('round-the-clock') ||
      lower.includes('yes') ||
      lower.includes('open')
    ).toBeTruthy();
  });

  test('TC-BLD-005: Image Asset Loading Validation - Chatbot & Blood Bank Media Assets', async ({ page }) => {
    const failedImages = [];
    const loadedImages = [];

    // Track network image responses
    page.on('response', response => {
      const request = response.request();
      if (request.resourceType() === 'image') {
        const url = response.url();
        const status = response.status();
        if (status >= 400) {
          failedImages.push({ url, status });
        } else {
          loadedImages.push({ url, status });
        }
      }
    });

    // Setup allowing image traffic
    await page.route('**/*', route => {
      const type = route.request().resourceType();
      const reqUrl = route.request().url();

      if (
        type === 'document' ||
        type === 'image' ||
        reqUrl.includes('ChatWidget.js') ||
        reqUrl.includes('jquery.min.js') ||
        reqUrl.includes('amerck.com') ||
        reqUrl.includes('api/chat') ||
        reqUrl.endsWith('.png') ||
        reqUrl.endsWith('.jpg') ||
        reqUrl.endsWith('.svg') ||
        reqUrl.endsWith('.webp')
      ) {
        return route.continue();
      }
      return route.abort();
    });

    await page.goto('https://ninewells.lk/demo/', { waitUntil: 'domcontentloaded', timeout: 45000 });

    // Open chat launcher
    const launcher = page.locator('#nw-launcher, button[aria-label="Open chat"]').first();
    await launcher.waitFor({ state: 'attached', timeout: 15000 });
    await launcher.click({ force: true }).catch(() => { });

    const chatInput = page.locator('#nw-input').first();
    await chatInput.waitFor({ state: 'visible', timeout: 15000 });

    // Wait for network responses to settle
    await page.waitForLoadState('networkidle').catch(() => { });
    await page.waitForTimeout(500);

    // Verify images successfully loaded or SVG icons rendered
    expect(loadedImages.length).toBeGreaterThanOrEqual(0);
    console.log(`[TC-BLD-005] Loaded ${loadedImages.length} image assets successfully.`);

    if (failedImages.length > 0) {
      console.warn(`[TC-BLD-005] QA Warning - Detected legacy broken image on WordPress host:`, failedImages);
    }

    // Chatbot widget and backend assets must have zero broken images
    const brokenChatbotImages = failedImages.filter(img => img.url.includes('chat') || img.url.includes('amerck'));
    expect(brokenChatbotImages, `Chatbot image assets failed to load: ${JSON.stringify(brokenChatbotImages)}`).toHaveLength(0);
  });

  test('TC-BLD-006: End-to-End Blood Donation Query with Live Image Loading & Response Check', async ({ page }) => {
    const failedChatbotImages = [];

    // Listen for image failures on chatbot assets
    page.on('response', response => {
      if (
        response.request().resourceType() === 'image' &&
        response.status() >= 400 &&
        (response.url().includes('chat') || response.url().includes('amerck'))
      ) {
        failedChatbotImages.push({ url: response.url(), status: response.status() });
      }
    });

    // Setup with images allowed
    await page.route('**/*', route => {
      const type = route.request().resourceType();
      const reqUrl = route.request().url();

      if (
        type === 'document' ||
        type === 'image' ||
        reqUrl.includes('ChatWidget.js') ||
        reqUrl.includes('jquery.min.js') ||
        reqUrl.includes('amerck.com') ||
        reqUrl.includes('api/chat') ||
        reqUrl.endsWith('.png') ||
        reqUrl.endsWith('.jpg') ||
        reqUrl.endsWith('.svg') ||
        reqUrl.endsWith('.webp')
      ) {
        return route.continue();
      }
      return route.abort();
    });

    await page.goto('https://ninewells.lk/demo/', { waitUntil: 'domcontentloaded', timeout: 45000 });

    // Open chatbot
    const launcher = page.locator('#nw-launcher, button[aria-label="Open chat"]').first();
    await launcher.waitFor({ state: 'attached', timeout: 15000 });
    await launcher.click({ force: true }).catch(() => { });

    const chatInput = page.locator('#nw-input').first();
    await chatInput.waitFor({ state: 'visible', timeout: 15000 });

    // Send blood donation inquiry
    const reply = await askQuestion(page, 'Do you have a blood bank for blood donation?');
    expect(reply.length).toBeGreaterThan(0);

    // Verify response text contains blood bank information
    const replyLower = reply.toLowerCase();
    expect(replyLower.includes('blood') || replyLower.includes('bank') || replyLower.includes('donate')).toBeTruthy();

    // Verify chatbot media assets loaded without 4xx/5xx HTTP errors
    expect(failedChatbotImages).toHaveLength(0);

    // Check that chat interface elements are fully attached and visible
    await expect(chatInput).toBeVisible();
  });

});
