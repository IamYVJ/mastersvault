import { expect, test } from '@playwright/test';

test('Mock 1 runs with the exam rules: section order, answer to advance, no going back, review & edit', async ({ page }) => {
  await page.goto('gmat/mocks/');
  await page.getByRole('link', { name: /^Mock Test 1/ }).click();
  await expect(page.getByRole('cell', { name: 'Quantitative Reasoning' })).toBeVisible();
  await page.getByRole('link', { name: /^Start/ }).click();

  await expect(page.getByText('You must answer each question before moving to the next.')).toBeVisible();
  await page.getByRole('button', { name: 'Start test' }).click();

  // Choose Quant first.
  await expect(page.getByRole('heading', { name: 'Choose your section order' })).toBeVisible();
  await page.getByLabel('Quantitative Reasoning, then Verbal Reasoning, then Data Insights').check();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Quantitative Reasoning' })).toBeVisible();
  await page.getByRole('button', { name: 'Begin section' }).click();

  await expect(page.getByRole('heading', { name: 'Question 1 of 21', exact: true })).toBeVisible();
  await expect(page.getByText('Time remaining')).toBeVisible();
  const next = page.getByRole('button', { name: /^Next/ });
  await expect(next).toBeDisabled();
  await expect(page.getByRole('button', { name: /Back/ })).toHaveCount(0);

  // Answer every question with the first choice.
  for (let i = 1; i <= 21; i++) {
    await expect(page.getByRole('heading', { name: `Question ${i} of 21`, exact: true })).toBeVisible();
    await page.locator('.q-choice input').first().check();
    if (i < 21) await next.click();
  }
  await page.getByRole('button', { name: /Review answers/ }).click();
  await expect(page.getByRole('heading', { name: 'Review & Edit' })).toBeVisible();
  await expect(page.getByText(/change up to 3 more answers/)).toBeVisible();
  await expect(page.locator('.player-review-table tbody tr')).toHaveCount(21);
});
