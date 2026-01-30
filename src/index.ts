import puppeteer from 'puppeteer';
import 'dotenv/config';

const USERNAME = process.env.ECOTRICITY_USERNAME || '';
const PASSWORD = process.env.ECOTRICITY_PASSWORD || '';

if (!USERNAME || !PASSWORD) {
  console.error('Please set ECOTRICITY_USERNAME and ECOTRICITY_PASSWORD in your .env file');
  process.exit(1);
}

// Launch the browser and open a new blank page.
const browser = await puppeteer.launch();
const page = await browser.newPage();

// Navigate the page to a URL.
await page.goto('https://my.ecotricity.co.uk/s/login/');

console.log(`Navigated to ${page.url()}`);

// Set screen size.
await page.setViewport({width: 1080, height: 1024});

console.log('Filling in login form');

// Type into search box using accessible input name.
await page.locator('input[type="email"]').fill(USERNAME);

console.log('Filling in password');

// Type into search box using accessible input name.
await page.locator('input[type="password"]').fill(PASSWORD);

console.log('Submitting login form');

// Click on login button
await page.locator('::-p-aria(Log in)').click();

// Wait for navigation and loading to complete after login
await page.waitForNavigation();
await page.waitForNavigation();
await page.waitForNetworkIdle();

console.log(`Logged in! Now at ${page.url()}`);

// Click on first address
await page.locator('.nds-form-element__label').click();

// Type into search box using accessible input name.
await page.locator('::-p-aria(Next)').click();

await page.waitForNetworkIdle();

console.log('Done! Parsing data...');

// // Locate the full title with a unique string.
const textSelector = await page
  .locator('.customerName')
  .waitHandle();
const fullTitle = await textSelector?.evaluate(el => el.textContent);

console.log('');
console.log('-------------------');
console.log('');

// Print the full title.
console.log('Greeting:', fullTitle);

await browser.close();