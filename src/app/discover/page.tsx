/**
 * /discover — server entry.
 *
 * The browsing experience is an interactive client app (DiscoverPageClient),
 * whose live results are fetched client-side and so are invisible to crawlers.
 * This server component gives the route real, indexable HTML: it fetches a small
 * "recently published" set on the server and slots it into the client page as
 * server-rendered content. ISR-cached (admin client, no cookies) so it's cheap
 * and static-friendly; the interactive app hydrates on top.
 */

import DiscoverPageClient from './DiscoverPageClient';
import { DiscoverFeatured } from './DiscoverFeatured';
import { fetchDiscoverFeatured } from './discoverServerFetch';

// Refresh the server-rendered strip every 5 minutes.
export const revalidate = 300;

export default async function DiscoverPage() {
  const featured = await fetchDiscoverFeatured();
  return <DiscoverPageClient topContent={<DiscoverFeatured entities={featured} />} />;
}
