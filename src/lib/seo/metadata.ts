import { Metadata } from 'next';
import { ENTITY_REGISTRY, type EntityType } from '@/config/entity-registry';

const BASE_URL = 'https://orangecat.ch';

interface EntityMetadataInput {
  type: EntityType;
  id: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
}

/**
 * Generate Next.js Metadata for an entity page.
 * Derives canonical URL from ENTITY_REGISTRY publicBasePath (SSOT).
 */
export function generateEntityMetadata({
  type,
  id,
  title,
  description,
  // Accepted for backward-compat but no longer used for the share image:
  // the dynamic entity OG card below re-derives the cover from the row and
  // renders it WITH the title + key fact, which previews far better than a
  // bare cropped image.
  imageUrl: _imageUrl,
}: EntityMetadataInput): Metadata {
  const entityMeta = ENTITY_REGISTRY[type];
  const url = `${BASE_URL}${entityMeta.publicBasePath}/${id}`;
  const desc = description || `${title} on OrangeCat - Bitcoin-native marketplace.`;

  // Rich per-entity share card (cover/mark + type + title + key fact). Every
  // entity type that uses this helper now unfurls as a branded card instead
  // of the generic site image — the top-of-funnel lever for shared links.
  const image = `${BASE_URL}/api/og/entity/${type}/${id}`;

  return {
    title,
    description: desc,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: desc,
      images: [image],
      url,
      type: 'website',
      siteName: 'OrangeCat',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: [image],
    },
  };
}
