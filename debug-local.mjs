import { chromium } from 'playwright';
const pages = ['/wheelhub/login','/wheelhub/home','/wheelhub/workspace','/wheelhub/admin','/wheelhub/monitor','/wheelhub/visualize','/wheelhub/digital-twin','/wheelhub/platform-config'];
const base = 'http://127.0.0.1:3001';
const browser = await chromium.launch({ headless: true });
let ok = true;
for (const p of pages) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push({type:'pageerror', text:e.message}));
  page.on('console', msg => { if (msg.type()==='error') errors.push({type:'error', text:msg.text()}) });
  await page.goto(base + p, { waitUntil: 'networkidle', timeout: 60000 });
  const severe = errors.filter(e => e.type==='pageerror' || (e.type==='error' && !e.text.includes('favicon')));
  if (severe.length) { console.log(`[FAIL] ${base}${p}`, severe.slice(0,3)); ok = false; }
  else console.log(`[OK] ${base}${p}`);
  await page.close();
}
await browser.close();
process.exit(ok ? 0 : 1);
