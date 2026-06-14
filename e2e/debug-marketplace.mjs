import { chromium } from '@playwright/test';
import { mockMarketplaceApis } from './helpers/mock-marketplace.ts';

const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', (msg) => console.log('CONSOLE', msg.type(), msg.text()));
page.on('pageerror', (err) => console.log('PAGEERROR', err.message));
page.on('requestfailed', (req) => console.log('REQFAIL', req.url(), req.failure()?.errorText));
await page.addInitScript(() => localStorage.clear());
await mockMarketplaceApis(page);
await page.goto('http://127.0.0.1:4310/marketplace', { waitUntil: 'networkidle', timeout: 60000 });
console.log('URL', page.url());
const root = await page.locator('#root').innerHTML().catch((e) => `ERR: ${e.message}`);
console.log('ROOT', root.slice(0, 800));
await browser.close();
