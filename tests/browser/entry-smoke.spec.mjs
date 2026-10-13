import { test, expect } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';

test('public entry page loads and opens login controls', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveTitle(/TankstellenErtrag/i);
  await expect(page.locator('#heroLogin')).toBeVisible();
  await page.locator('#heroLogin').click();
  await expect(page.locator('#email')).toBeVisible();
  await expect(page.locator('#password')).toBeVisible();
  await expect(page.locator('#loginBtn')).toBeVisible();
  await expect(page.locator('#signupBtn')).toBeVisible();
  expect(pageErrors, 'uncaught JavaScript errors on entry page').toEqual([]);
});

test('entry page remains usable at mobile viewport without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.locator('#heroLogin').click();
  await expect(page.locator('#email')).toBeVisible();
  await expect(page.locator('#password')).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth,
    body: document.body.scrollWidth
  }));
  expect(dimensions.page, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport + 1);
  expect(dimensions.body, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport + 1);
});

test('login form rejects an empty submit without navigating away', async ({ page }) => {
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.locator('#heroLogin').click();
  const before = page.url();
  await page.locator('#loginBtn').click();
  await expect(page.locator('#email')).toBeVisible();
  expect(page.url()).toBe(before);
});
