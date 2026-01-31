import fs from 'fs';
import puppeteer from 'puppeteer';
import 'dotenv/config';
import { addDays, startOfDay, subDays } from 'date-fns';

const USERNAME = process.env.ECOTRICITY_USERNAME || '';
const PASSWORD = process.env.ECOTRICITY_PASSWORD || '';
const OUTPUT_FILE = 'output.csv';

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

console.log('Filling in username');

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
await page.waitForNetworkIdle();

console.log(`Logged in! Now at ${page.url()}`);

// Click on first address
await page.locator('.nds-form-element__label').click();

// Type into search box using accessible input name.
await page.locator('::-p-aria(Next)').click();

await page.waitForNetworkIdle();

console.log(`Selected address, now at ${page.url()}`);

await page.locator('.sidebar-navigation button:has([title="Your Meter"])').click();
await page.locator('.sidebar-navigation li[data-id="2"]').click();

await page.waitForNetworkIdle();

console.log(`Navigated to View Consumption, now at ${page.url()}`);

await page.locator('button[data-name="MPAN"]').click();

await page.waitForNetworkIdle();

await page.locator('input[data-value="Total"]').click();
await page.locator('[data-value="Day"]').click();
await page.locator('::-p-text(Apply)').click();

console.log('Navigated to electricity usage');

const arr: {day: number[], night: number[]} = {day: [], night: []};
await page.waitForResponse(async response => {
  try {
    const data = await response.json();
    if ('actions' in data) {
      const returnValueStr = data.actions[0].returnValue.returnValue;
      const parsedData = JSON.parse(returnValueStr);

      const responseStr = parsedData.IPResult.response;
      const responseData = JSON.parse(responseStr);
      if (responseData.Data) {
        arr.day.push(...responseData.Data);
        return true;
      }
    }
  } catch (error) {}
  return false;
});

await page.locator('input[data-value="Day"]').click();
await page.locator('[data-value="Night"]').click();
await page.locator('::-p-text(Apply)').click();

// TODO: make this a function when I'm not being lazy
await page.waitForResponse(async response => {
  try {
    const data = await response.json();
    if ('actions' in data) {
      const returnValueStr = data.actions[0].returnValue.returnValue;
      const parsedData = JSON.parse(returnValueStr);

      const responseStr = parsedData.IPResult.response;
      const responseData = JSON.parse(responseStr);
      if (responseData.Data) {
        arr.night.push(...responseData.Data);
        return true;
      }
    }
  } catch (error) {}
  return false;
});

console.log('');
console.log('-------------------');
console.log('');

let lastDate: Date | undefined = undefined;
// Write CSV header
if (!fs.existsSync(OUTPUT_FILE)) {
  fs.writeFileSync(OUTPUT_FILE, 'Date,Day,Night\n');
} else {
  const data = fs.readFileSync(OUTPUT_FILE, 'utf-8');
  const lines = data.split('\n');

  const lastDateStr = lines[lines.length - 2]?.split(',')[0];

  if (!lastDateStr) throw new Error('Output file is empty');

  lastDate = new Date(lastDateStr);
}

// Remove 6 days from the date
const sixDaysAgo = startOfDay(subDays(new Date(), 6));

for (let i = 0; i < arr.day.length; i++) {
  const date = new Date(sixDaysAgo);
  const newDate = addDays(date, i);
  const dateStr = newDate.toISOString().split('T')[0];
  
  if (lastDate && newDate <= lastDate) continue;
  
  fs.appendFileSync(OUTPUT_FILE, `${dateStr},${arr.day[i]},${arr.night[i]}\n`);
}

console.log(`Data written to ${OUTPUT_FILE}`);

// Close the browser.
await browser.close();