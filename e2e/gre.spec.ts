// The GRE-style question formats in the real player. The GRE is kept out of production builds until
// it is published, so these tests run only against a build made with MV_INCLUDE_UNPUBLISHED=1:
//   MV_INCLUDE_UNPUBLISHED=1 npm run build && npx playwright test e2e/gre.spec.ts
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const next = (page: Page) => page.getByRole('button', { name: /^Next/ });
const heading = (page: Page, n: number, of: number) => page.getByRole('heading', { name: `Question ${n} of ${of}`, exact: true });

async function start(page: Page, set: string) {
  const landing = await page.goto(`gre/practice/${set}/`);
  test.skip(landing?.status() === 404, 'The GRE is not in this build (it is unpublished); build with MV_INCLUDE_UNPUBLISHED=1');
  await page.getByRole('link', { name: /^Start/ }).click();
  await page.getByLabel(/Untimed/).check();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.getByRole('button', { name: 'Begin section' }).click();
}

async function goTo(page: Page, n: number, of: number) {
  for (let i = 1; i < n; i++) await next(page).click();
  await expect(heading(page, n, of)).toBeVisible();
}

test('numeric entry: typing, the calculator in order of operations, and Transfer Display', async ({ page }) => {
  await start(page, 'quant-mixed-1');
  await goTo(page, 3, 15); // ne-0001, a one-box Numeric Entry question
  const box = page.getByRole('textbox', { name: 'Answer' });
  await box.fill('1e3');
  await expect(box).toHaveValue(''); // letters can't be typed
  await box.fill('-2.5');
  await expect(box).toHaveValue('-2.5');

  await page.getByRole('button', { name: 'Calculator' }).click();
  const calc = page.locator('.calc');
  // 30 + 6 × 2 = 42 by the order of operations (not 72), then 60 − 42 = 18.
  for (const key of ['3', '0', 'Add', '6', 'Multiply', '2', 'Equals']) await calc.getByRole('button', { name: key, exact: true }).click();
  await expect(calc.locator('.calc-value')).toHaveText('42');
  for (const key of ['Clear all', '6', '0', 'Subtract', '4', '2', 'Equals']) await calc.getByRole('button', { name: key, exact: true }).click();
  await calc.getByRole('button', { name: 'Transfer Display' }).click();
  await expect(box).toHaveValue('18');

  // ne-0003, a fraction question: the button is off, and one box alone is "Incomplete" on the review screen.
  for (let i = 3; i < 12; i++) await next(page).click();
  await expect(heading(page, 12, 15)).toBeVisible();
  await expect(calc.getByRole('button', { name: 'Transfer Display' })).toBeDisabled();
  await page.getByRole('textbox', { name: 'Numerator' }).fill('8');
  await page.getByRole('button', { name: 'All questions' }).click();
  const rows = page.locator('.player-review-table tbody tr');
  await expect(rows.nth(2)).toContainText('Answered');
  await expect(rows.nth(11)).toContainText('Incomplete');
  await expect(rows.nth(0)).toContainText('Not answered');
});

test('select-all, two-choice and sentence questions', async ({ page }) => {
  await start(page, 'verbal-mixed-1');
  // se-0001: at most two choices can be ticked.
  await goTo(page, 3, 15);
  const boxes = page.locator('.q-choice input[type="checkbox"]');
  await boxes.nth(0).check();
  await boxes.nth(1).check();
  await expect(boxes.nth(2)).toBeDisabled();
  await boxes.nth(0).uncheck();
  await expect(boxes.nth(2)).toBeEnabled();

  // rc-0004: only the second paragraph's sentences can be selected, by click or keyboard.
  for (let i = 3; i < 10; i++) await next(page).click();
  await expect(heading(page, 10, 15)).toBeVisible();
  const first = page.locator('.q-sentence[data-p="1"]').first();
  const second = page.locator('.q-sentence[data-p="2"]');
  await expect(first).not.toHaveClass(/is-selectable/);
  await first.click();
  await expect(page.getByText('none yet')).toBeVisible();
  await second.nth(1).click();
  await expect(second.nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.q-sentence-status q')).toHaveText(await second.nth(1).innerText());
  await second.nth(2).focus();
  await page.keyboard.press('Enter');
  await expect(second.nth(2)).toHaveAttribute('aria-pressed', 'true');
  await expect(second.nth(1)).toHaveAttribute('aria-pressed', 'false');
});

test('the dashboard keeps each exam’s results apart', async ({ page }) => {
  await start(page, 'quant-mixed-1');
  await page.getByRole('button', { name: 'All questions' }).click();
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText(/0 of 15 correct/)).toBeVisible();

  await page.goto('dashboard/');
  const exams = page.getByRole('group', { name: 'Exam' });
  await expect(exams.getByRole('button', { name: 'GRE' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('link', { name: 'Quant mixed set 1' })).toBeVisible();
  await exams.getByRole('button', { name: 'GMAT' }).click();
  await expect(page.getByText('No GMAT tests taken yet.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Quant mixed set 1' })).toBeHidden();
});

// The same accessibility rules as e2e/a11y.spec.ts, on every GRE question screen, the calculator and
// the review screen, in both colour themes.
for (const theme of ['light', 'dark'] as const)
  test(`every GRE question screen passes the accessibility checks (${theme} theme)`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    const scan = async (where: string) => {
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze();
      expect.soft(violations.map((v) => `[${where}] ${v.id}: ${v.help} (${v.nodes[0]?.target.join(' ')})`), where).toEqual([]);
    };
    for (const set of ['quant-mixed-1', 'verbal-mixed-1']) {
      await start(page, set);
      for (let i = 1; i <= 15; i++) {
        await expect(heading(page, i, 15)).toBeVisible();
        await scan(`${set} question ${i}`);
        if (set === 'quant-mixed-1' && i === 3) {
          await page.getByRole('button', { name: 'Calculator' }).click();
          await scan('calculator open');
          await page.getByRole('button', { name: 'Close calculator' }).click();
        }
        if (i < 15) await next(page).click();
      }
      await page.getByRole('button', { name: /Review answers/ }).click();
      await scan(`${set} review`);
    }
  });
