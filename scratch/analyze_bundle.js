const https = require('https');

https.get('https://qa_care.amerck.com/_next/static/chunks/app/admin/telemedicine-reports/page-bd7044cbc121c31b.js', res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    // Look for routes and endpoint paths
    const apiMatches = data.match(/\/telemed\/[a-zA-Z0-9_\-\/]+/g) || [];
    console.log('Telemed API Routes:', [...new Set(apiMatches)]);

    // Look for all string literals
    const stringMatches = data.match(/"([^"\\]|\\.)*"/g) || [];
    const cleanStrings = stringMatches.map(s => s.replace(/^"|"$/g, '')).filter(s => s.length > 3 && s.length < 100);
    const domainStrings = cleanStrings.filter(s => /report|patient|doctor|upload|review|status|view|download|file|search|dialog/i.test(s));
    console.log('UI Domain Strings:', [...new Set(domainStrings)].slice(0, 50));
  });
});
