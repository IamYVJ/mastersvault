// Site-wide constants. Keep the disclaimer wording in one place.
export const SITE = {
  name: 'MastersVault',
  tagline: 'Free, exam-realistic practice for graduate admissions tests',
  repo: 'https://github.com/IamYVJ/mastersvault',
  /** The questions and notes aren't openly licensed. The full terms are on the About page. */
  contentRights: 'All rights reserved',
  contentTermsPath: '/about/#licences',
  codeLicense: { name: 'AGPL-3.0', url: 'https://www.gnu.org/licenses/agpl-3.0.html' },
};

/** The parts of an exam's exam.yaml that the site's description and disclaimer mention. */
export interface ExamNotice {
  name: string;
  testMaker: string;
  trademark: string;
}

/** "GMAT and GRE", "GMAC or ETS". */
export const list = (items: string[], last: string) =>
  items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} ${last} ${items[items.length - 1]}`;
/** "GMAC" from "the Graduate Management Admission Council (GMAC)". */
export const short = (maker: string) => /\(([^)]+)\)\s*$/.exec(maker)?.[1] ?? maker;

/** The site's description for search results and link previews, naming the exams it covers. */
export function siteDescription(exams: ExamNotice[]): string {
  return (
    `Free, original practice for the ${list(exams.map((e) => e.name), 'and')}: full-length mock tests, section practice sets and revision notes, ` +
    `on a test screen that works like the real exam. Unofficial and not affiliated with ${list(exams.map((e) => short(e.testMaker)), 'or')}.`
  );
}

export function disclaimer(exams: ExamNotice[]): string {
  return (
    `${exams.map((e) => e.trademark).join(' ')} ` +
    `MastersVault is an independent project and is not affiliated with, endorsed by, or sponsored by ${list(
      exams.map((e) => short(e.testMaker)),
      'or',
    )} or any other test maker. All questions on this site are original, and score estimates are unofficial.`
  );
}

/** Pre-filled GitHub issue for reporting a problem with a question. */
export function reportIssueUrl(questionId: string, context = ''): string {
  const title = `Question ${questionId}: `;
  const body = `**Question:** ${questionId}\n${context ? `**Where:** ${context}\n` : ''}\n**What's wrong?**\n\n`;
  return `${SITE.repo}/issues/new?labels=content&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}
