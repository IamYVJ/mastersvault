// Page-view counting with GoatCounter: the beacon is in Base.astro, the visitor count in Footer.astro.
// Only three addresses are ever recorded. Every page counts as a view of the whole site, and an exam's
// pages count once more as a view of that exam. Individual pages are never recorded.
import { SITE } from './site';
import { url } from './url';

const EXAMS = ['gre', 'gmat'];

/** The whole site's address. The footer always shows this count, whatever the page. */
export const SITE_PATH = url('/');

/**
 * The views to record for the page at `pathname`. Each has a fixed title, so the GoatCounter dashboard
 * doesn't show whichever page happened to send the latest view.
 */
export function pageViews(pathname: string): { path: string; title: string }[] {
  const views = [{ path: SITE_PATH, title: SITE.name }];
  const exam = EXAMS.find((id) => `${pathname}/`.startsWith(url(`/${id}/`)));
  if (exam) views.push({ path: url(`/${exam}/`), title: `${SITE.name} ${exam.toUpperCase()}` });
  return views;
}
