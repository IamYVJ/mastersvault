// Service worker: lets the site work without a connection for pages and tests already opened.
// This file is a template. The build (see astro.config.mjs) fills in the three placeholders
// and writes it to <base>/sw.js. It isn't used in development.
//
// Strategy, chosen so that being online behaves exactly as it would without a service worker:
//   - Files under _astro/ have a content hash in their name and never change: cache first.
//   - Everything else (pages, test data, images): network first, falling back to the saved copy.
//   - Opening a test's page saves that test's screen and data, so the test can be taken offline.
const VERSION = '__VERSION__';
const BASE = '__BASE__';
const ASSETS = __ASSETS__;

const CACHE = `mv-${VERSION}`;
const OFFLINE_PAGE = `${BASE}/offline/`;
const SHELL = [`${BASE}/`, `${BASE}/dashboard/`, OFFLINE_PAGE, `${BASE}/favicon.svg`, `${BASE}/manifest.webmanifest`];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      await cache.addAll(ASSETS);
      // The shell pages are a bonus; don't fail the install if one can't be fetched.
      await Promise.allSettled(SHELL.map((url) => cache.add(url)));
    }),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('mv-') && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

async function save(request, response) {
  if (response.ok && response.type === 'basic') {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

// Saved copies are looked up by address alone. Query strings ("?new", Astro's retry marker) and the
// Vary header don't change which file it is, and a strict match would miss copies saved at install.
const LOOSE = { ignoreSearch: true, ignoreVary: true };

async function cacheFirst(request) {
  return (await caches.match(request, LOOSE)) ?? save(request, await fetch(request));
}

async function networkFirst(request) {
  try {
    return await save(request, await fetch(request));
  } catch (error) {
    const saved = await caches.match(request, LOOSE);
    if (saved) return saved;
    if (request.mode === 'navigate') {
      const offline = await caches.match(OFFLINE_PAGE);
      if (offline) return offline;
    }
    throw error;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(`${BASE}/`)) return;
  event.respondWith(url.pathname.startsWith(`${BASE}/_astro/`) ? cacheFirst(request) : networkFirst(request));
});

// A test's page asks for that test to be saved. Replies with whether everything was saved.
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'save' || !Array.isArray(event.data.urls)) return;
  const urls = event.data.urls.filter((u) => typeof u === 'string' && u.startsWith(`${BASE}/`));
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => Promise.all(urls.map((u) => fetch(u).then((response) => (response.ok ? cache.put(u, response) : Promise.reject(new Error(u)))))))
      .then(
        () => event.ports[0]?.postMessage({ saved: true }),
        () => event.ports[0]?.postMessage({ saved: false }),
      ),
  );
});
