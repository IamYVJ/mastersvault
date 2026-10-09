// Keyboard-only use: nothing in these tests clicks or uses a mouse.
import { expect, test, type Page } from '@playwright/test';

/** Presses Tab until the focused element's accessible label or text matches. */
async function tabTo(page: Page, name: string | RegExp, max = 80) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    const label = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return (el?.getAttribute('aria-label') ?? el?.textContent ?? '').trim();
    });
    if (typeof name === 'string' ? label === name : name.test(label)) return;
  }
  throw new Error(`Could not reach "${name}" with the Tab key`);
}

/** Tag and accessible label of the focused element, e.g. "main|Question 2 of 5, Quantitative Reasoning, Quant sampler". */
const focused = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    return `${el?.tagName.toLowerCase()}|${el?.getAttribute('aria-label') ?? ''}`;
  });

test('the first Tab stop on a page is a link that skips to the content', async ({ page }) => {
  await page.goto('gmat/revision/');
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toHaveText('Skip to content');
  await page.keyboard.press('Enter');
  await expect(page.locator('main#main')).toBeFocused();
});

test('a practice set can be completed with the keyboard alone, and focus follows each new screen', async ({ page }) => {
  await page.goto('gmat/practice/quant-sampler/take/?new');
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeVisible();
  expect(await focused(page)).toMatch(/^main\|Set up/);

  // Timing is a radio group: Tab reaches it, the arrow keys change it.
  await page.keyboard.press('Tab');
  await expect(page.getByLabel(/^Timed/)).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByLabel(/Untimed/)).toBeChecked();

  await tabTo(page, 'Start');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Quantitative Reasoning' })).toBeVisible();
  expect(await focused(page)).toMatch(/^main\|Quantitative Reasoning instructions/);

  await tabTo(page, 'Begin section');
  await page.keyboard.press('Enter');

  for (let i = 1; i <= 5; i++) {
    await expect(page.getByRole('heading', { name: `Question ${i} of 5`, exact: true })).toBeVisible();
    // Focus has moved to the top of the new question, not stayed on the Next button.
    expect(await focused(page)).toMatch(new RegExp(`^main\\|Question ${i} of 5`));
    await page.keyboard.press('Tab');
    await expect(page.locator('.q-choice input').first()).toBeFocused();
    await page.keyboard.press('Space');
    await expect(page.locator('.q-choice input').first()).toBeChecked();
    await tabTo(page, i < 5 ? /^Next/ : /^Review answers/);
    await page.keyboard.press('Enter');
  }

  await expect(page.getByRole('heading', { name: 'Review your answers' })).toBeVisible();
  expect(await focused(page)).toMatch(/^main\|Review/);
  await tabTo(page, 'Submit');
  await page.keyboard.press('Enter');
  // The confirmation dialog takes focus, and Enter confirms.
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Submit' })).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(page.getByRole('heading', { name: 'By difficulty' })).toBeVisible();
  expect(await focused(page)).toMatch(/^main\|Results/);
});

test('the calculator and whiteboard work from the keyboard', async ({ page }) => {
  await page.goto('gmat/practice/di-sampler/take/?new');
  await tabTo(page, 'Start');
  await page.keyboard.press('Enter');
  await tabTo(page, 'Begin section');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Question 1 of 7', exact: true })).toBeVisible();

  // Calculator: opens with focus in its display, takes typed input, moves with the arrow keys.
  await tabTo(page, 'Calculator');
  await page.keyboard.press('Enter');
  const calculator = page.getByRole('dialog', { name: 'Calculator' });
  await expect(calculator.locator('.calc-display')).toBeFocused();
  await page.keyboard.type('12*3=');
  await expect(calculator.locator('output')).toHaveText('36');

  await tabTo(page, /^Move calculator/);
  const before = (await calculator.boundingBox())!.x;
  await page.keyboard.press('ArrowLeft');
  await expect.poll(async () => (await calculator.boundingBox())!.x).toBe(before - 24);

  await tabTo(page, 'Close calculator');
  await page.keyboard.press('Enter');
  await expect(calculator).toBeHidden();
  // Focus returns to the button that opened the panel.
  await expect(page.getByRole('button', { name: 'Calculator' })).toBeFocused();

  // Whiteboard: typed notes for people who can't draw with a pointer. Escape closes it.
  await tabTo(page, 'Whiteboard');
  await page.keyboard.press('Enter');
  const whiteboard = page.getByRole('dialog', { name: 'Whiteboard' });
  await tabTo(page, 'Type');
  await page.keyboard.press('Enter');
  await expect(whiteboard.getByLabel('Typed notes')).toBeFocused();
  await page.keyboard.type('x = 4');
  await page.keyboard.press('Escape');
  await expect(whiteboard).toBeHidden();
  await expect(page.getByRole('button', { name: 'Whiteboard' })).toBeFocused();

  // The notes are still there when the whiteboard is reopened.
  await page.keyboard.press('Enter');
  await expect(whiteboard.getByLabel('Typed notes')).toHaveValue('x = 4');
});

test('multi-source tabs switch with the arrow keys', async ({ page }) => {
  await page.goto('gmat/practice/di-sampler/take/?new');
  await tabTo(page, 'Start');
  await page.keyboard.press('Enter');
  await tabTo(page, 'Begin section');
  await page.keyboard.press('Enter');
  // Skip the two data sufficiency questions.
  for (let i = 0; i < 2; i++) {
    await tabTo(page, /^Next/);
    await page.keyboard.press('Enter');
  }
  await expect(page.getByRole('heading', { name: 'Question 3 of 7', exact: true })).toBeVisible();
  const tabs = page.getByRole('tab');
  await page.keyboard.press('Tab'); // the sources pane
  await page.keyboard.press('Tab'); // its first tab
  await expect(tabs.first()).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.nth(1)).toBeFocused();
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
});
