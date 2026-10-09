// Automated accessibility checks (axe-core, WCAG 2.1 A and AA plus best practices) on the site's
// pages and on every screen of the test player, in both colour themes.
// Automated checks catch only part of what matters; e2e/keyboard.spec.ts covers keyboard use.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];

async function scan(page: Page, where: string) {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const summary = violations.map(
    (v) => `[${where}] ${v.id} (${v.impact}): ${v.help}\n` + v.nodes.slice(0, 3).map((n) => `    ${n.target.join(' ')}  ${n.failureSummary?.split('\n')[1]?.trim() ?? ''}`).join('\n'),
  );
  expect.soft(summary, `accessibility violations on ${where}`).toEqual([]);
}

const PAGES = [
  '',
  'gmat/',
  'gmat/mocks/',
  'gmat/mocks/01/',
  'gmat/practice/',
  'gmat/practice/di-tables-graphs/',
  'gmat/revision/',
  'gmat/revision/quant/inequalities/',
  'gmat/revision/data-insights/business-math/',
  'dashboard/',
  'about/',
  'disclaimer/',
  'privacy/',
];

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} theme`, () => {
    test.use({ colorScheme: scheme });

    test('site pages have no detectable accessibility violations', async ({ page }) => {
      for (const path of PAGES) {
        await page.goto(path);
        await scan(page, `/${path}`);
      }
    });

    test('every screen of a Data Insights practice set passes', async ({ page }) => {
      await page.goto('gmat/practice/di-sampler/take/?new');
      await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeVisible();
      await scan(page, 'setup');
      await page.getByLabel(/Untimed/).check();
      await page.getByRole('button', { name: 'Start', exact: true }).click();
      await scan(page, 'section intro');
      await page.getByRole('button', { name: 'Begin section' }).click();

      // ds, ds, msr (choice), msr (yes/no), table, graph, two-part
      for (let i = 1; i <= 7; i++) {
        await expect(page.getByRole('heading', { name: `Question ${i} of 7`, exact: true })).toBeVisible();
        await scan(page, `question ${i}`);
        if (i === 1) {
          await page.getByRole('button', { name: 'Calculator' }).click();
          await scan(page, 'calculator open');
          await page.getByRole('button', { name: 'Close calculator' }).click();
          await page.getByRole('button', { name: 'Whiteboard' }).click();
          await scan(page, 'whiteboard open');
          await page.getByRole('button', { name: 'Close whiteboard' }).click();
        }
        await page.getByRole('button', { name: i < 7 ? /^Next/ : /Review answers/ }).click();
      }
      await expect(page.getByRole('heading', { name: 'Review your answers' })).toBeVisible();
      await scan(page, 'review');
      await page.getByRole('button', { name: 'Submit' }).click();
      await scan(page, 'submit dialog');
      await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click();
      await expect(page.getByRole('heading', { name: 'By difficulty' })).toBeVisible();
      await scan(page, 'results');
      await page.getByRole('button', { name: 'Review' }).first().click();
      await expect(page.getByRole('heading', { name: 'Explanation' })).toBeVisible();
      await scan(page, 'results: question review');
    });

    test('a reading passage question and the mock setup screens pass', async ({ page }) => {
      await page.goto('gmat/practice/verbal-reading/take/?new');
      await page.getByRole('button', { name: 'Start', exact: true }).click();
      await page.getByRole('button', { name: 'Begin section' }).click();
      await expect(page.getByRole('heading', { name: 'Question 1 of 14', exact: true })).toBeVisible();
      await scan(page, 'passage question');

      await page.goto('gmat/mocks/01/take/?new');
      await page.getByRole('button', { name: 'Start test' }).click();
      await expect(page.getByRole('heading', { name: 'Choose your section order' })).toBeVisible();
      await scan(page, 'section order');
    });
  });
}

test.describe('phone-sized screen', () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test('pages and question screens pass at 375px wide', async ({ page }) => {
    for (const path of ['', 'gmat/', 'gmat/revision/quant/inequalities/', 'gmat/revision/data-insights/percents-ratios-in-data/', 'dashboard/']) {
      await page.goto(path);
      await scan(page, `phone /${path}`);
    }
    await page.goto('gmat/practice/di-sampler/take/?new');
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    await page.getByRole('button', { name: 'Begin section' }).click();
    for (let i = 1; i <= 7; i++) {
      await expect(page.getByRole('heading', { name: `Question ${i} of 7`, exact: true })).toBeVisible();
      await scan(page, `phone question ${i}`);
      if (i < 7) await page.getByRole('button', { name: /^Next/ }).click();
    }
  });
});
