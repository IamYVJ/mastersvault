// Web app manifest: lets the site be installed to a phone's home screen or as a desktop app.
// Generated here, not kept in public/, so that every path includes the site's base path.
import type { APIRoute } from 'astro';
import { SITE } from '../lib/site.ts';
import { url } from '../lib/url.ts';

export const GET: APIRoute = () => {
  const manifest = {
    name: `${SITE.name}: exam practice`,
    short_name: SITE.name,
    description: SITE.description,
    start_url: url('/'),
    scope: url('/'),
    display: 'standalone',
    background_color: '#faf9f6',
    theme_color: '#faf9f6',
    icons: [
      { src: url('/icon-192.png'), sizes: '192x192', type: 'image/png' },
      { src: url('/icon-512.png'), sizes: '512x512', type: 'image/png' },
      { src: url('/icon-512.png'), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
  return new Response(JSON.stringify(manifest, null, 2), { headers: { 'Content-Type': 'application/manifest+json' } });
};
