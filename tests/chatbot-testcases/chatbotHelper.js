const { expect } = require('@playwright/test');

const CHATBOT_URL = 'https://ninewells.lk/demo/';

/**
 * Ultra-Fast Setup:
 * - Aggressively blocks all unneeded WordPress plugins, Google Maps, ads, stylesheets, images, media, and fonts
 * - Injects CSS to suppress promotional popup overlay before rendering
 * - Opens the chatbot launcher immediately and reliably
 */
async function setupChatbotPage(page, url = CHATBOT_URL) {
  // 1. Block heavy WordPress plugins, Google Maps, tracking, stylesheets, images, fonts
  await page.route('**/*', route => {
    const req = route.request();
    const type = req.resourceType();
    const reqUrl = req.url();

    // Always allow document, ChatWidget.js, jQuery, and chatbot backend API
    if (
      type === 'document' ||
      reqUrl.includes('ChatWidget.js') ||
      reqUrl.includes('jquery.min.js') ||
      reqUrl.includes('amerck.com') ||
      reqUrl.includes('api/chat')
    ) {
      return route.continue();
    }

    // Abort everything else (images, stylesheets, fonts, google maps, facebook, woocommerce, etc.)
    return route.abort();
  });

  // 2. Suppress promotional popup overlay via CSS injection before navigation
  await page.addInitScript(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .ult-overlay,
      .ult-overlay-close,
      #button-click-overlay,
      .mobile-sticky-header-overlay {
        display: none !important;
        pointer-events: none !important;
        opacity: 0 !important;
        visibility: hidden !important;
        z-index: -9999 !important;
      }
    `;
    if (document.head) {
      document.head.appendChild(style);
    } else {
      document.addEventListener('DOMContentLoaded', () => document.head.appendChild(style));
    }
  });

  // 3. Fast navigation (commit = resolves instantly when HTML headers arrive)
  await page.goto(url, { waitUntil: 'commit', timeout: 45000 });

  // 4. Open chat launcher as soon as it is attached to DOM
  const launcher = page.locator('#nw-launcher, button[aria-label="Open chat"]').first();
  const chatInput = page.locator('#nw-input').first();

  await launcher.waitFor({ state: 'attached', timeout: 15000 });
  await launcher.click({ force: true }).catch(() => { });
  await page.evaluate(() => {
    const c = document.querySelector('#nw-chat');
    if (c && !c.classList.contains('nw-open')) c.classList.add('nw-open');
  }).catch(() => { });

  // 5. Wait for message input field to be ready
  await chatInput.waitFor({ state: 'visible', timeout: 15000 });
}

/**
 * Send a message via the chatbot input
 */
async function sendChatMessage(page, message) {
  const messageInput = page.locator('#nw-input').first();
  await messageInput.waitFor({ state: 'visible', timeout: 15000 });
  
  // Check if the chat input was disabled (e.g., after session termination guardrail)
  const isInputDisabled = await messageInput.isDisabled().catch(() => false);
  if (isInputDisabled) {
    throw new Error('Chatbot input is disabled (session was terminated by chatbot guardrail)');
  }

  await messageInput.fill(message);
  await messageInput.press('Enter');
}

/**
 * Event-driven wait for the new bot reply:
 * Listens for the count of bot messages to increment and returns the new reply immediately.
 */
async function askQuestion(page, question, timeout = 30000) {
  const botMessages = page.locator('.nw-msg:not(.user), [class*="bot-msg"]');
  const initialCount = await botMessages.count();

  await sendChatMessage(page, question);

  // Wait directly for the new bot message bubble to appear (event-driven, no arbitrary sleep)
  const newBotMessage = botMessages.nth(initialCount);
  await newBotMessage.waitFor({ state: 'visible', timeout });

  // Wait for typing dots indicator to finish if streaming
  const typingIndicator = page.locator('.nw-typing, [class*="typing"]').first();
  await typingIndicator.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => { });

  // Ensure message has text content
  await expect(async () => {
    const text = (await newBotMessage.innerText()).trim();
    expect(text.length).toBeGreaterThan(0);
    expect(text).not.toBe('...');
  }).toPass({ timeout: 8000, intervals: [100, 200, 300] }).catch(() => { });

  const reply = (await newBotMessage.innerText()).trim();
  console.log(`[Q]: "${question}" -> [A]: ${reply.slice(0, 70)}...`);
  return reply;
}

/**
 * Wait for bot reply for already sent actions (like clicking quick-reply buttons)
 */
async function waitForBotReply(page, timeout = 30000) {
  const typingIndicator = page.locator('.nw-typing, [class*="typing"]').first();
  await typingIndicator.waitFor({ state: 'hidden', timeout }).catch(() => { });

  const botMessages = page.locator('.nw-msg:not(.user), [class*="bot-msg"]');
  await botMessages.last().waitFor({ state: 'visible', timeout });

  // Ensure message has text content
  await expect(async () => {
    const text = (await botMessages.last().innerText()).trim();
    expect(text.length).toBeGreaterThan(0);
    expect(text).not.toBe('...');
  }).toPass({ timeout: 8000, intervals: [100, 200, 300] }).catch(() => { });

  const text = await botMessages.last().innerText();
  return text.trim();
}

module.exports = {
  CHATBOT_URL,
  setupChatbotPage,
  sendChatMessage,
  waitForBotReply,
  askQuestion
};

