import { test, expect } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';

test('capture public landing page before login on desktop and mobile', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveTitle(/TankstellenErtrag/i);
  await expect(page.locator('main > section.hero.publicOnly')).toBeVisible();
  await expect(page.locator('.heroVisual')).toContainText('Beispielansicht');
  await expect(page.locator('.heroVisual')).toContainText('96.343,52 €');
  await expect(page.locator('#heroTest')).toHaveAttribute('href', './quickcheck.html');
  await expect(page.locator('#navLogin')).toBeVisible();
  await expect(page.locator('#heroLogin')).toBeVisible();
  await page.screenshot({ path: 'test-results/startseite-desktop.png', fullPage: true, animations: 'disabled' });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('main > section.hero.publicOnly')).toBeVisible();
  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth
  }));
  expect(widths.document, JSON.stringify(widths)).toBeLessThanOrEqual(widths.viewport + 1);
  expect(widths.body, JSON.stringify(widths)).toBeLessThanOrEqual(widths.viewport + 1);
  await page.screenshot({ path: 'test-results/startseite-handy.png', fullPage: true, animations: 'disabled' });

  await page.locator('#heroLogin').click();
  await expect(page.locator('#email')).toBeVisible();
  await expect(page.locator('#password')).toBeVisible();
  await expect(page.locator('#loginBtn')).toBeVisible();
  await expect(page.locator('#signupBtn')).toBeVisible();
  expect(pageErrors, 'uncaught JavaScript errors on public entry page').toEqual([]);
});
