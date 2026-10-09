// Generates the link-preview image (public/og.png) and the app icons (public/icon-*.png).
// The results are committed, so this only needs running when the branding changes:
//   node scripts/make-images.mjs            (uses Playwright's Chromium)
//   PW_CHANNEL=chrome node scripts/make-images.mjs   (uses an installed Chrome)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'public');
// The site's ink and paper colours (see src/styles/global.css).
const INK = '#171716';
const PAPER = '#faf9f6';
const MUTED = '#5d5b56';

// The site's typeface, embedded so that the images don't depend on the fonts installed here.
const face = (weight) => {
  const file = path.join(root, `node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-${weight}-normal.woff2`);
  return `@font-face { font-family: 'IBM Plex Mono'; font-weight: ${weight}; src: url(data:font/woff2;base64,${fs.readFileSync(file).toString('base64')}) format('woff2'); }`;
};

// The logo mark from public/favicon.svg, without its rounded background.
const mark = (size, color) => `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${size}" height="${size}">
    <circle cx="16" cy="16" r="9" fill="none" stroke="${color}" stroke-width="2.2"/>
    <circle cx="16" cy="13.6" r="2.6" fill="${color}"/>
    <path d="M14.6 15.4h2.8l.9 5.4h-4.6z" fill="${color}"/>
  </svg>`;

const page = (body, css = '') => `<!doctype html><html><head><meta charset="utf-8"><style>
  ${face(400)} ${face(500)} ${face(600)}
  * { box-sizing: border-box; margin: 0; }
  html, body { width: 100%; height: 100%; }
  body { font-family: 'IBM Plex Mono', monospace; ${css} }
</style></head><body>${body}</body></html>`;

const preview = page(
  `<div class="top"><span class="logo">${mark(44, PAPER)}</span><span>MastersVault</span></div>
   <h1>Practice that feels like test day.<i></i></h1>
   <p class="sub">Free GMAT mock tests, section practice and revision notes, on a test screen that works like the real exam.</p>
   <p class="note"><span>Full-length mocks · Original questions · No sign-up</span><span>Unofficial. Not affiliated with GMAC.</span></p>`,
  `background: ${PAPER}; color: ${INK}; padding: 64px 76px 56px; display: flex; flex-direction: column;`,
).replace(
  '</style>',
  `.top { display: flex; align-items: center; gap: 16px; font-size: 30px; font-weight: 600; letter-spacing: -0.02em; }
   .logo { display: grid; place-items: center; width: 52px; height: 52px; border-radius: 12px; background: ${INK}; }
   h1 { margin-top: 52px; max-width: 20ch; font-size: 76px; line-height: 1.04; letter-spacing: -0.05em; font-weight: 500; }
   h1 i { display: inline-block; width: 0.5em; height: 0.84em; margin-left: 0.14em; background: ${INK}; vertical-align: -0.05em; }
   .sub { margin-top: 28px; max-width: 40em; font-size: 24px; line-height: 1.45; color: ${MUTED}; }
   .note { margin-top: auto; padding-top: 22px; border-top: 2px solid ${INK}; display: flex; justify-content: space-between; gap: 24px; white-space: nowrap; font-size: 18px; color: ${MUTED}; }
  </style>`,
);

// Full-bleed square so that "maskable" icons can be cropped to any shape; the mark sits in the safe zone.
const icon = (size) => page(`<div style="width:100%;height:100%;display:grid;place-items:center">${mark(Math.round(size * 0.74), PAPER)}</div>`, `background: ${INK};`);

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined });
const shoot = async (html, width, height, file) => {
  const p = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await p.setContent(html);
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: path.join(out, file), type: 'png' });
  await p.close();
  console.log(`wrote public/${file} (${width}×${height})`);
};

await shoot(preview, 1200, 630, 'og.png');
for (const size of [512, 192, 180]) await shoot(icon(size), size, size, `icon-${size}.png`);
await browser.close();
