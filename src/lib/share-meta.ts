type ShareMetaPayload = {
  title: string;
  description: string;
  url: string;
  image: string;
};

function upsertMetaTag(attribute: 'name' | 'property', key: string, content: string) {
  let tag = document.head.querySelector(`meta[${attribute}="${key}"]`) as HTMLMetaElement | null;

  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }

  tag.setAttribute('content', content);
}

function upsertCanonical(url: string) {
  let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;

  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }

  canonical.setAttribute('href', url);
}

export function applyShareMeta(payload: ShareMetaPayload) {
  document.title = payload.title;

  upsertMetaTag('name', 'description', payload.description);

  upsertMetaTag('property', 'og:type', 'website');
  upsertMetaTag('property', 'og:title', payload.title);
  upsertMetaTag('property', 'og:description', payload.description);
  upsertMetaTag('property', 'og:url', payload.url);
  upsertMetaTag('property', 'og:image', payload.image);

  upsertMetaTag('name', 'twitter:card', 'summary_large_image');
  upsertMetaTag('name', 'twitter:title', payload.title);
  upsertMetaTag('name', 'twitter:description', payload.description);
  upsertMetaTag('name', 'twitter:image', payload.image);

  upsertCanonical(payload.url);
}
