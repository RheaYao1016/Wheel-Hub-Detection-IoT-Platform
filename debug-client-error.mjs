import { chromium } from 'playwright';

const urls = [
  'http://127.0.0.1:3001/wheelhub/login',
  'http://127.0.0.1:3001/wheelhub/home',
  'http://127.0.0.1:3001/wheelhub/workspace',
  'http://127.0.0.1:3001/wheelhub/admin',
  'http://127.0.0.1:3001/wheelhub/monitor',
  'http://127.0.0.1:3001/wheelhub/visualize',
  'http://127.0.0.1:3001/wheelhub/digital-twin',
  'http://127.0.0.1:3001/wheelhub/platform-config',
];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });

for (const url of urls) {
  const page = await context.newPage();
  const errors = [];
  const consoleLogs = [];

  page.on('pageerror', err => {
    errors.push({ type: 'pageerror', message: err.message, stack: err.stack });
  });

  page.on('console', msg => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });

  page.on('response', resp => {
    if (resp.status() >= 400 && !resp.url().includes('_next/image')) {
      consoleLogs.push({ type: 'error', text: `HTTP ${resp.status()} ${resp.url()}` });
    }
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);
  } catch (e) {
    console.log(`[${url}] navigation error: ${e.message}`);
  }

  if (errors.length || consoleLogs.some(l => l.type === 'error')) {
    console.log(`\n=== ${url} ===`);
    console.log('Page errors:', JSON.stringify(errors, null, 2));
    console.log('Console errors:', JSON.stringify(consoleLogs.filter(l => l.type === 'error'), null, 2));
  } else {
    console.log(`[OK] ${url}`);
  }

  await page.close();
}

await browser.close();
