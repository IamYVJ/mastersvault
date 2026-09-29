// @ts-check
import path from 'node:path';
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

// Served from https://iamyvj.github.io/mastersvault/ via GitHub Pages.
// If a custom domain is added later, set `site` to it and `base` to '/'.
export default defineConfig({
  site: 'https://iamyvj.github.io',
  base: '/mastersvault',
  trailingSlash: 'ignore',
  integrations: [react()],
  vite: {
    plugins: [contentReload()],
  },
});
