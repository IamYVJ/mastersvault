import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { pageViews, SITE_PATH } from '../src/lib/pageviews';
import { url } from '../src/lib/url';

const paths = (pathname: string) => pageViews(url(pathname)).map((view) => view.path);

describe('page views', () => {
  it('records every page under the whole site, and an exam page under its exam too', () => {
    expect(paths('/')).toEqual([SITE_PATH]);
    expect(paths('/dashboard/')).toEqual([SITE_PATH]);
    expect(paths('/404')).toEqual([SITE_PATH]);
    expect(paths('/gre')).toEqual([SITE_PATH, url('/gre/')]);
    expect(paths('/gre/mocks/01/take/')).toEqual([SITE_PATH, url('/gre/')]);
    expect(paths('/gmat/revision/')).toEqual([SITE_PATH, url('/gmat/')]);
    expect(paths('/greek/')).toEqual([SITE_PATH]);
  });

  // Without "no_onload" the beacon would also record each page's own address.
  it('stops the beacon from recording the page address itself', () => {
    const layout = fs.readFileSync('src/layouts/Base.astro', 'utf8');
    expect(layout).toContain(`data-goatcounter-settings='{"no_onload": true}'`);
  });
});
