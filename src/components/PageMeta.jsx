import { useEffect } from 'react';

const SITE = 'Just Idea';
const DEFAULT_DESCRIPTION =
  'Founders post startup ideas, everyone rates them out of five and leaves advice, and businesses reach out to help.';

function upsertMeta(attribute, key, content) {
  let tag = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

// Each page sets its own title, description and social metadata. Kept in a hook
// rather than a dependency so the preview build stays small.
export default function usePageMeta({ title, description = DEFAULT_DESCRIPTION, path }) {
  useEffect(() => {
    const fullTitle = title ? `${title} · ${SITE}` : `${SITE} — rate startup ideas, get real advice`;
    document.title = fullTitle;

    upsertMeta('name', 'description', description);
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('name', 'twitter:card', 'summary');

    if (path) {
      let canonical = document.head.querySelector('link[rel="canonical"]');
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.appendChild(canonical);
      }
      canonical.setAttribute('href', `${window.location.origin}${path}`);
    }
  }, [title, description, path]);
}

export { DEFAULT_DESCRIPTION };
