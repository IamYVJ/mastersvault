import { expect, test, type Page } from '@playwright/test';

const next = (page: Page) => page.getByRole('button', { name: /^Next/ });
const choice = (page: Page, index: number) => page.locator('.q-choice input').nth(index);

async function start(page: Page, set: string, { untimed = false } = {}) {
  await page.goto(`gmat/practice/${set}/`);
  await page.getByRole('link', { name: /^Start/ }).click();
  if (untimed) await page.getByLabel(/Untimed/).check();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.getByRole('button', { name: 'Begin section' }).click();
}

test('a practice set can be taken from start to results', async ({ page }) => {
  await start(page, 'quant-sampler', { untimed: true });
  await expect(page.getByText('Time elapsed')).toBeVisible();

  // Answer keys for ps-0001 … ps-0005 (A, C, D, E, C).
  const answers = [0, 2, 3, 4, 2];
  for (const [i, answer] of answers.entries()) {
    await expect(page.getByRole('heading', { name: `Question ${i + 1} of 5`, exact: true })).toBeVisible();
    await choice(page, answer).check();
    if (i < answers.length - 1) await next(page).click();
  }
  await page.getByRole('button', { name: /Review answers/ }).click();
  await expect(page.getByRole('heading', { name: 'Review your answers' })).toBeVisible();
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click();

  await expect(page.getByText('5 of 5 correct (100%)')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'By difficulty' })).toBeVisible();
  await expect(page.getByText('Time per question')).toBeVisible();

  await page.getByRole('button', { name: 'Review' }).first().click();
  await expect(page.getByRole('heading', { name: 'Explanation' })).toBeVisible();
  await expect(page.getByText('Correct answer')).toBeVisible();

  // The landing page now offers the saved results.
  await page.goto('gmat/practice/quant-sampler/');
  await expect(page.getByRole('link', { name: 'View last results' })).toBeVisible();
});

test('an unfinished attempt resumes where it left off, with the timer paused', async ({ page }) => {
  await start(page, 'verbal-sampler');
  await choice(page, 3).check();
  await next(page).click();
  await expect(page.getByRole('heading', { name: 'Question 2 of 6', exact: true })).toBeVisible();

  await page.reload();
  const dialog = page.getByRole('dialog', { name: 'Welcome back' });
  await expect(dialog).toBeVisible();
  const timer = page.locator('.player-timer-value');
  const paused = await timer.textContent();
  await page.waitForTimeout(2200);
  await expect(timer).toHaveText(paused!);
  await dialog.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByRole('heading', { name: 'Question 2 of 6', exact: true })).toBeVisible();
  await expect(timer).not.toHaveText(paused!, { timeout: 5000 });
  await page.getByRole('button', { name: 'All questions' }).click();
  await expect(page.locator('.player-review-table tbody tr').first()).toContainText('Answered');
});

test('Data Insights has a working calculator and whiteboard', async ({ page }) => {
  await start(page, 'di-sampler');

  await page.getByRole('button', { name: 'Calculator' }).click();
  const calc = page.getByRole('dialog', { name: 'Calculator' });
  await expect(calc).toBeVisible();
  await calc.getByRole('textbox').click();
  await page.keyboard.type('54000*0.14');
  await page.keyboard.press('Enter');
  await expect(calc.locator('.calc-value')).toHaveText('7560');
  await calc.getByRole('button', { name: 'Add', exact: true }).click();
  await calc.getByRole('button', { name: '1', exact: true }).click();
  await calc.getByRole('button', { name: '2', exact: true }).click();
  await calc.getByRole('button', { name: '0', exact: true }).click();
  await calc.getByRole('button', { name: '0', exact: true }).click();
  await calc.getByRole('button', { name: 'Equals', exact: true }).click();
  await expect(calc.locator('.calc-value')).toHaveText('8760');

  await page.getByRole('button', { name: 'Whiteboard' }).click();
  const board = page.getByRole('dialog', { name: 'Whiteboard' });
  await expect(board.getByRole('button', { name: 'Undo' })).toBeDisabled();
  const box = (await board.locator('canvas').boundingBox())!;
  await page.mouse.move(box.x + 40, box.y + 40);
  await page.mouse.down();
  await page.mouse.move(box.x + 160, box.y + 90, { steps: 8 });
  await page.mouse.up();
  await expect(board.getByRole('button', { name: 'Undo' })).toBeEnabled();

  // Closing a tool keeps its contents; both survive moving between questions.
  await board.getByRole('button', { name: /Close whiteboard/ }).click();
  await expect(board).toBeHidden();
  await choice(page, 2).check();
  await next(page).click();
  await expect(page.getByRole('heading', { name: 'Question 2 of 7', exact: true })).toBeVisible();
  await expect(calc.locator('.calc-value')).toHaveText('8760');
  await page.getByRole('button', { name: 'Whiteboard' }).click();
  await expect(board.getByRole('button', { name: 'Undo' })).toBeEnabled();
});

test('the rules are explained before a practice set starts', async ({ page }) => {
  await page.goto('gmat/practice/di-sampler/take/?new');
  await expect(page.getByRole('heading', { name: 'How it works' })).toBeVisible();
  await expect(page.getByText('You can move back and forth between questions')).toBeVisible();
});

test('question text cannot be selected, copied or right-clicked', async ({ page }) => {
  await start(page, 'verbal-sampler');
  const view = page.locator('.q-view');
  await expect(view).toHaveCSS('user-select', 'none');
  const blocked = await view.locator('.q-main').evaluate((el) =>
    ['copy', 'contextmenu'].map((type) => !el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }))),
  );
  expect(blocked).toEqual([true, true]);
});
