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
  const dimensions = await page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    const offenders = [...document.querySelectorAll('body *')]
      .map(el => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return {
          tag: el.tagName.toLowerCase(),
          id: el.id || '',
          className: typeof el.className === 'string' ? el.className.slice(0, 100) : '',
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          position: style.position,
          overflowX: style.overflowX
        };
      })
      .filter(el => el.width > 0 && (el.right > viewport + 1 || el.left < -1))
      .sort((a, b) => b.right - a.right)
      .slice(0, 12);
    return {
      viewport,
      page: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
      offenders
    };
  });
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
