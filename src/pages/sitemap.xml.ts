// Every public page, for search engines. Test screens, the dashboard and dev previews are left out;
// those pages also carry a "noindex" tag.
import type { APIRoute } from 'astro';
import { getExams } from '../lib/content/index.ts';
import { noteHref, sortedNotes } from '../lib/content/revision.ts';
import { absolute } from '../lib/seo.ts';

function sitePaths(): string[] {
  const paths = ['/', '/about/', '/disclaimer/', '/privacy/'];
  for (const exam of getExams()) {
    paths.push(`/${exam.id}/`, `/${exam.id}/mocks/`, `/${exam.id}/practice/`, `/${exam.id}/revision/`);
    for (const test of exam.mocks) paths.push(`/${exam.id}/mocks/${test.id}/`);
    for (const test of exam.practice) paths.push(`/${exam.id}/practice/${test.id}/`);
    for (const note of sortedNotes(exam)) paths.push(noteHref(exam.id, note));
  }
  return paths;
}

export const GET: APIRoute = ({ site }) => {
  const urls = sitePaths()
    .map((path) => `  <url><loc>${absolute(site, path)}</loc></url>`)
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
