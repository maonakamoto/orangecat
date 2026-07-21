/**
 * Server-rendered "recently published" strip for /discover — the page's
 * crawlable SEO content. Rendered on the server and passed into the interactive
 * client page as a slot, so its links to entity detail pages appear in the
 * initial HTML that search engines and AI crawlers read.
 */

import Link from 'next/link';
import type { FeaturedEntity } from './discoverServerFetch';

export function DiscoverFeatured({ entities }: { entities: FeaturedEntity[] }) {
  if (entities.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Recently published on OrangeCat"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8"
    >
      <h2 className="text-lg font-semibold text-fg-primary mb-4">Recently published</h2>
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {entities.map(entity => (
          <li key={entity.href}>
            <Link
              href={entity.href}
              className="block h-full rounded-lg border border-default bg-surface-base/70 p-4 transition-colors hover:border-fg-tertiary"
            >
              <span className="text-xs font-medium uppercase tracking-caps text-fg-tertiary">
                {entity.typeLabel}
              </span>
              <span className="mt-1 block font-medium text-fg-primary">{entity.title}</span>
              {entity.description && (
                <span className="mt-1 block text-sm text-fg-secondary line-clamp-2">
                  {entity.description}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
