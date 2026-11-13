// tests-unit/helpers/mockApp.js

/**
 * Serves fixture HTML for the fake app origin (and any extra absolute URLs).
 * - `pages` maps a pathname (e.g. '/admin/account') or absolute URL to an HTML string.
 * - Any request whose path starts with /api/ is answered with `{ ok: true }`.
 * - Every other request gets a 404.
 * Returns an array that collects the URLs of all /api/ requests.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Record<string, string>} pages
 */
async function mockApp(page, pages) {
  const apiCalls = [];
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    const html = pages[url.origin + url.pathname] ?? (url.origin === 'http://emr.test' ? pages[url.pathname] : undefined);
    if (html !== undefined) {
      return route.fulfill({ status: 200, contentType: 'text/html', body: doc(html) });
    }
    if (url.pathname.startsWith('/api/')) {
      apiCalls.push(url.href);
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    }
    return route.fulfill({ status: 404, body: 'not found' });
  });
  return apiCalls;
}

/** Wraps a body fragment in a minimal HTML document. */
function doc(body) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    .hidden{display:none}
    span{cursor:pointer;padding:2px 6px}
  </style></head><body>${body}</body></html>`;
}

module.exports = { mockApp, doc };
