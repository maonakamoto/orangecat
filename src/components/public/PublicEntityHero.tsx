/**
 * PublicEntityHero — cover imagery for image-centric public entity pages.
 *
 * The generic entity page only had a 64px type icon, so a product/service/event
 * with photos showed a generic glyph instead of the actual thing. This renders
 * the entity's images (cover first) as a responsive hero, with up to four more
 * as a thumbnail row.
 *
 * Data-driven: returns null when there are no images, so the page falls back to
 * the existing header icon — no empty frames, no regression for entities that
 * haven't uploaded anything. Server component, no client state.
 */

import Image from 'next/image';

interface PublicEntityHeroProps {
  /** Ordered image URLs, cover first. */
  images: string[];
  /** Entity title, used for alt text. */
  title: string;
}

export default function PublicEntityHero({ images, title }: PublicEntityHeroProps) {
  const clean = images.filter(Boolean);
  if (clean.length === 0) {
    return null;
  }

  const [cover, ...rest] = clean;
  const extras = rest.slice(0, 4);

  return (
    <div className="space-y-3">
      <div className="relative w-full aspect-[16/9] overflow-hidden rounded-lg border border-default bg-surface-raised">
        <Image src={cover} alt={title} fill unoptimized className="object-cover" />
      </div>
      {extras.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {extras.map((src, i) => (
            <div
              key={`${src}-${i}`}
              className="relative aspect-square overflow-hidden rounded-md border border-subtle bg-surface-raised"
            >
              <Image
                src={src}
                alt={`${title} — image ${i + 2}`}
                fill
                unoptimized
                className="object-cover"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
