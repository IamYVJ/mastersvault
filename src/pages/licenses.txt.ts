// Third-party licences: the copyright notices and licence texts of the open-source software that is
// shipped to the browser. The MIT and OFL licences require these to travel with every copy, and the
// build strips them from the bundled scripts, so they are published here, read from the installed packages.
import fs from 'node:fs';
import path from 'node:path';
import type { APIRoute } from 'astro';
import { SITE } from '../lib/site.ts';

// Packages whose code or fonts end up in the built site. Build-only tools are not redistributed.
const SHIPPED = [
  { name: 'astro', use: 'page scripts' },
  { name: '@astrojs/react', use: 'page scripts' },
  { name: 'react', use: 'interface' },
  { name: 'react-dom', use: 'interface' },
  { name: 'scheduler', use: 'interface' },
  { name: 'katex', use: 'maths typesetting and its fonts' },
  { name: '@fontsource/ibm-plex-mono', use: 'the IBM Plex Mono typeface' },
];

export const GET: APIRoute = () => {
  const rule = '='.repeat(78);
  const parts = SHIPPED.map(({ name, use }) => {
    const dir = path.resolve('node_modules', name);
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    const file = fs.readdirSync(dir).find((f) => /^licen[cs]e/i.test(f));
    if (!file) throw new Error(`No licence file found for ${name}`);
    const text = fs.readFileSync(path.join(dir, file), 'utf8').trim();
    return `${rule}\n${name} ${pkg.version} (${pkg.license}), used for ${use}\n${rule}\n\n${text}\n`;
  });
  const intro =
    `${SITE.name} includes the open-source software listed below. Each is the work of its own authors\n` +
    `and is used under the licence shown. ${SITE.name}'s own code and content are licensed separately:\n` +
    `${SITE.codeLicense.name} (code) and ${SITE.contentLicense.name} (questions and notes). See ${SITE.repo}\n`;
  return new Response(`${intro}\n${parts.join('\n')}`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
