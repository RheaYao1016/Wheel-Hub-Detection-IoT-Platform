import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on('console', msg => console.log(msg.type(), msg.text()));
await page.goto('http://118.31.164.41:8080/wheelhub/login');
await page.waitForSelector('.auth-form');
await page.fill(".auth-form input[autocomplete='username']", 'admin-demo');
await page.fill(".auth-form input[autocomplete='current-password']", 'admin123');
await page.click(".auth-form button[type='submit']");
try {
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
  console.log('LOGIN OK:', page.url());
} catch (e) {
  console.log('LOGIN FAILED:', e.message);
}
await browser.close();
