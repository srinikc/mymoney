import { chromium } from 'playwright';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const PROFILE_DIR = join(__dirname, '..', '.gpay-profile');

const context = await chromium.launchPersistentContext(PROFILE_DIR, {
  headless: false,
  channel: "chrome",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

const page = await context.newPage();

// Capture all batchexecute and takeout-pa requests
const captured = [];
context.on('request', req => {
  const url = req.url();
  if (url.includes('batchexecute') || url.includes('takeout-pa')) {
    const postData = req.postData();
    captured.push({
      url: url.slice(0, 400),
      method: req.method(),
      headers: JSON.stringify(req.headers()),
      postData: postData ? postData.slice(0, 5000) : null,
      time: new Date().toISOString(),
    });
    console.log(`\n=== ${req.method()} ${url.includes('batchexecute') ? 'BATCHEXECUTE' : 'TAKEOUT-PA'} ===`);
    console.log('URL:', url.slice(0, 300));
    if (postData) console.log('BODY:', postData.slice(0, 3000));
  }
});

console.log('Navigating to takeout.google.com...');
await page.goto('https://takeout.google.com', { waitUntil: 'networkidle', timeout: 30000 });
console.log('URL:', page.url().slice(0, 120));

if (page.url().includes('accounts.google.com')) {
  console.log('Not logged in. Please log in manually (browser is open).');
  await page.waitForURL('https://takeout.google.com/**', { timeout: 120000 });
  console.log('Logged in!');
}

await page.waitForTimeout(2000);

// Step 1: Deselect all
console.log('\n=== Deselecting all ===');
const deselectBtn = page.locator('[data-tooltip="Deselect all"]');
if (await deselectBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
  await deselectBtn.click();
  console.log('Clicked Deselect all');
} else {
  const deselectAll2 = page.locator('text=Deselect all');
  if (await deselectAll2.isVisible({ timeout: 2000 }).catch(() => false)) {
    await deselectAll2.click();
    console.log('Clicked Deselect all alt');
  }
}
await page.waitForTimeout(1000);

// Step 2: Select Google Pay
console.log('\n=== Selecting Google Pay ===');
const gpayToggle = page.locator('[data-id="google_pay"]');
if (await gpayToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
  await gpayToggle.click();
  console.log('Clicked Google Pay');
} else {
  console.log('Google Pay toggle not found');
}
await page.waitForTimeout(1000);

// Step 3: Click "Next step"
console.log('\n=== Next step ===');
const nextBtn = page.locator('button:has-text("Next step")');
if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
  await nextBtn.click();
  console.log('Clicked Next step');
} else {
  const nextBtn2 = page.locator('button:has-text("Next")');
  if (await nextBtn2.isVisible({ timeout: 2000 }).catch(() => false)) {
    await nextBtn2.click();
    console.log('Clicked Next');
  }
}
await page.waitForTimeout(2000);

// Step 4: Select "Add to Drive"
console.log('\n=== Selecting Add to Drive ===');
const driveOption = page.locator('text=Add to Drive');
if (await driveOption.isVisible({ timeout: 3000 }).catch(() => false)) {
  await driveOption.click();
  console.log('Clicked Add to Drive');
} else {
  const driveRadio = page.locator('[value="DRIVE"]');
  if (await driveRadio.isVisible({ timeout: 2000 }).catch(() => false)) {
    await driveRadio.click();
    console.log('Clicked Drive radio');
  }
}
await page.waitForTimeout(1000);

// Step 5: Click "Create export"
console.log('\n=== Creating export ===');
const createBtn = page.locator('button:has-text("Create export")');
if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
  await createBtn.click();
  console.log('Clicked Create export');
} else {
  console.log('Create export button not found');
}

// Wait for API calls to complete
await page.waitForTimeout(5000);

console.log(`\n\n=== CAPTURED ${captured.length} REQUESTS ===`);
for (let i = 0; i < captured.length; i++) {
  console.log(`\n--- Request ${i + 1} ---`);
  console.log('URL:', captured[i].url);
  console.log('Method:', captured[i].method);
  console.log('Headers:', captured[i].headers);
  if (captured[i].postData) {
    console.log('BODY:', captured[i].postData);
  }
}

// Don't close - let user see result
console.log('\n\nBrowser will close in 10 seconds...');
await page.waitForTimeout(10000);
await context.close();
