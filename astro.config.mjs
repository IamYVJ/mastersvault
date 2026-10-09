// @ts-check
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

const contentDir = path.resolve('content');

/** Reload the browser in dev when anything under content/ changes. */
function contentReload() {
  return {
    name: 'mastersvault:content-reload',
    /** @param {import('vite').ViteDevServer} server */
    configureServer(server) {
      server.watcher.add(contentDir);
      const reload = (/** @type {string} */ file) => {
        if (path.resolve(file).startsWith(contentDir)) server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('change', reload);
      server.watcher.on('add', reload);
      server.watcher.on('unlink', reload);
    },
  };
}

const BASE = '/mastersvault';

/**
 * Writes the service worker (<base>/sw.js) after a build, from src/service-worker.js.
 * It lists the scripts, styles and fonts to save for offline use. The older font formats
 * (.woff, .ttf) are left out, because every browser that supports service workers uses .woff2.
 * @returns {import('astro').AstroIntegration}
 */
function serviceWorker() {
  return {
    name: 'mastersvault:service-worker',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const out = fileURLToPath(dir);
        const assets = fs
          .readdirSync(path.join(out, '_astro'))
          .filter((file) => /\.(js|css|woff2)$/.test(file))
          .sort()
          .map((file) => `${BASE}/_astro/${file}`);
        const version = createHash('sha1').update(assets.join(' ')).digest('hex').slice(0, 10);
        const template = fs.readFileSync(path.resolve('src/service-worker.js'), 'utf8');
        const code = template
          .replace("'__VERSION__'", JSON.stringify(version))
          .replace("'__BASE__'", JSON.stringify(BASE))
          .replace('__ASSETS__', JSON.stringify(assets));
        fs.writeFileSync(path.join(out, 'sw.js'), code);
        logger.info(`sw.js: ${assets.length} files saved for offline use (version ${version})`);
      },
    },
  };
}

// Served from https://iamyvj.github.io/mastersvault/ via GitHub Pages.
// If a custom domain is added later, set `site` to it and `base` to '/'.
export default defineConfig({
  site: 'https://iamyvj.github.io',
  base: BASE,
  trailingSlash: 'ignore',
  integrations: [react(), serviceWorker()],
  vite: {
    plugins: [contentReload()],
  },
});
