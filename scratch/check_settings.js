const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: 'playwright/.auth/user.json' });
  const page = await context.newPage();

  console.log('Navigating to /admin/settings...');
  await page.goto('https://qa_care.amerck.com/admin/settings', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=Settings', { timeout: 15000 });
  await page.waitForTimeout(2000);

  const dump = await page.evaluate(() => {
    const textNodes = [];
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim()) {
        textNodes.push({ tag: node.parentElement.tagName, text: node.nodeValue.trim(), href: node.parentElement.getAttribute('href') });
      }
      for (const child of node.childNodes) walk(child);
    };
    walk(document.body);
    return textNodes;
  });

  console.log('Text nodes found:', dump.length);
  console.log('Text nodes sample:\n', JSON.stringify(dump.slice(0, 50), null, 2));

  // Let's find all 'a' tags
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).map(a => ({
      text: a.innerText.trim(),
      href: a.getAttribute('href')
    }));
  });
  console.log('All links:\n', JSON.stringify(links, null, 2));

  await browser.close();
})();
