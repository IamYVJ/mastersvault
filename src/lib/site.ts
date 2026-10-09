// Site-wide constants. Keep the disclaimer wording in one place.
export const SITE = {
  name: 'MastersVault',
  tagline: 'Free, exam-realistic practice for graduate admissions tests',
  description:
    'Free, original practice for the GMAT: full-length mock tests, section practice sets and revision notes, on a test screen that works like the real exam. Unofficial and not affiliated with GMAC.',
  repo: 'https://github.com/IamYVJ/mastersvault',
  contentLicense: { name: 'CC BY-NC-SA 4.0', url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/' },
  codeLicense: { name: 'AGPL-3.0', url: 'https://www.gnu.org/licenses/agpl-3.0.html' },
};

export const DISCLAIMER =
  'GMAT™ is a registered trademark of the Graduate Management Admission Council (GMAC). ' +
  'MastersVault is an independent project and is not affiliated with, endorsed by, or sponsored by GMAC ' +
  'or any other test maker. All questions on this site are original, and score estimates are unofficial.';

/** Pre-filled GitHub issue for reporting a problem with a question. */
export function reportIssueUrl(questionId: string, context = ''): string {
  const title = `Question ${questionId}: `;
  const body = `**Question:** ${questionId}\n${context ? `**Where:** ${context}\n` : ''}\n**What's wrong?**\n\n`;
  return `${SITE.repo}/issues/new?labels=content&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}
