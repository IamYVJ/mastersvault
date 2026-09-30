import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';

async function finishQuantSampler(page: Page, answers: number[]) {
  await page.goto('gmat/practice/quant-sampler/take/?new');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.getByRole('button', { name: 'Begin section' }).click();
  for (const [i, a] of answers.entries()) {
    await page.locator('.q-choice input').nth(a).check();
    if (i < answers.length - 1) await page.getByRole('button', { name: /^Next/ }).click();
  }
  await page.getByRole('button', { name: /Review answers/ }).click();
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText(/of 5 correct/)).toBeVisible();
}

test('the dashboard summarises finished tests and reopens their results', async ({ page }) => {
  await page.goto('dashboard/');
  await expect(page.getByText('No tests taken yet.')).toBeVisible();

  await finishQuantSampler(page, [0, 2, 3, 1, 1]); // 3 of 5 correct
  await page.goto('dashboard/');
  await expect(page.locator('.dash-tile').filter({ hasText: 'Tests completed' })).toContainText('1');
  await expect(page.locator('.dash-tile').filter({ hasText: 'Accuracy' })).toContainText('60%');
  await expect(page.getByRole('heading', { name: 'Where to focus' })).toBeVisible();

  await page.getByRole('link', { name: 'Review' }).first().click();
  await expect(page.getByRole('heading', { name: 'Quant sampler' })).toBeVisible();
  await expect(page.getByText('3 of 5 correct (60%)')).toBeVisible();
  await page.getByRole('link', { name: 'Dashboard' }).click();
  await expect(page).toHaveURL(/dashboard\/$/);
});

test('progress can be exported, deleted and imported again', async ({ page }) => {
  await finishQuantSampler(page, [0, 2, 3, 4, 2]);
  await page.goto('dashboard/');
  await expect(page.locator('.dash-tile').filter({ hasText: 'Accuracy' })).toContainText('100%');

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export progress' }).click();
  const file = await (await download).path();
  const backup = JSON.parse(fs.readFileSync(file, 'utf8'));
  expect(backup.format).toBe('mastersvault-backup');
  expect(backup.history).toHaveLength(1);

  await page.getByRole('button', { name: 'Delete all progress' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByText('No tests taken yet.')).toBeVisible();

  await page.locator('input[type=file]').setInputFiles(file);
  await expect(page.getByRole('status').filter({ hasText: 'Added 1 finished test' })).toBeVisible();
  await expect(page.locator('.dash-tile').filter({ hasText: 'Tests completed' })).toContainText('1');

  // A file that isn't a backup is rejected with a clear message.
  await page.locator('input[type=file]').setInputFiles({ name: 'notes.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":1}') });
  await expect(page.getByText("This doesn't look like a MastersVault backup file.")).toBeVisible();
});

test('revision notes render with contents, maths and practice links', async ({ page }) => {
  await page.goto('gmat/revision/');
  await page.getByRole('link', { name: 'Percents', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Percents' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'On this page' })).toBeVisible();
  await expect(page.locator('.note-body .katex').first()).toBeVisible();
  await page.getByRole('link', { name: 'Quant sampler' }).click();
  await expect(page).toHaveURL(/practice\/quant-sampler\/$/);
});
