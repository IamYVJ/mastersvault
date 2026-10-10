// Structured data (schema.org) for search engines. Everything here describes free, original,
// unofficial practice material, so nothing claims a link to a test maker.
import { SITE } from './site.ts';
import { url } from './url.ts';

/** Absolute URL of a site path, e.g. "/gmat/mocks/" → "https://…/mastersvault/gmat/mocks/". */
export const absolute = (site: URL | undefined, path: string) => new URL(url(path), site).href;

const publisher = { '@type': 'Organization', name: SITE.name, url: SITE.repo };

export function websiteData(site: URL | undefined) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    description: SITE.description,
    url: absolute(site, '/'),
    inLanguage: 'en',
    publisher,
  };
}

/** Breadcrumb trail; each item is a label and a site path. */
export function breadcrumbData(site: URL | undefined, items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absolute(site, item.path),
    })),
  };
}

/** A free practice test or a revision note. */
export function learningResourceData(
  site: URL | undefined,
  resource: { name: string; description?: string; path: string; type: 'Practice test' | 'Study notes'; about: string; minutes?: number },
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: resource.name,
    description: resource.description,
    url: absolute(site, resource.path),
    learningResourceType: resource.type,
    about: resource.about,
    inLanguage: 'en',
    isAccessibleForFree: true,
    license: absolute(site, SITE.contentTermsPath),
    ...(resource.minutes ? { timeRequired: `PT${resource.minutes}M` } : {}),
    publisher,
  };
}
