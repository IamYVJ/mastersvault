// Offline use: once a test's page has been opened, the test can be taken without a connection.
import { expect, test } from '@playwright/test';

test('a practice set works offline after its page has been opened once', async ({ page, context }) => {
  await page.goto('gmat/practice/quant-sampler/');
  // The page reports that the test has been saved on this device.
  await expect(page.getByText('You can take this test without an internet connection.')).toBeVisible({ timeout: 15_000 });

  await context.setOffline(true);

  await page.getByRole('link', { name: /^Start/ }).click();
  await page.getByLabel(/Untimed/).check();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.getByRole('button', { name: 'Begin section' }).click();
  await expect(page.getByRole('heading', { name: 'Question 1 of 5', exact: true })).toBeVisible();

  for (let i = 1; i <= 5; i++) {
    await page.locator('.q-choice input').first().check();
    await page.getByRole('button', { name: i < 5 ? /^Next/ : /Review answers/ }).click();
  }
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByRole('heading', { name: 'By difficulty' })).toBeVisible();

  // The dashboard is part of the saved shell, and it lists the finished test.
  await page.goto('dashboard/');
  await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Quant sampler' }).first()).toBeVisible();
});

test('a page that was never opened shows an explanation when offline', async ({ page, context }) => {
  await page.goto('');
  // Wait until the service worker controls the page and has saved the offline page.
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await expect.poll(() => page.evaluate(() => caches.match('/mastersvault/offline/').then(Boolean))).toBe(true);

  await context.setOffline(true);
  await page.goto('gmat/revision/quant/statistics/');
  await expect(page.getByRole('heading', { name: "You're offline" })).toBeVisible();
});
