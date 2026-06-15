import { Metadata } from 'next';
import Image from 'next/image';
import { Gift } from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';
import { generateEntityMetadata } from '@/lib/seo/metadata';
import { DATABASE_TABLES } from '@/config/database-tables';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { displayBTC } from '@/services/currency/formatting';
import { Progress } from '@/components/ui/progress';
import PublicEntityDetailPage, {
  fetchEntityForMetadata,
  type EntityDetailConfig,
} from '@/components/public/PublicEntityDetailPage';
import { WISHLIST_TYPE_LABELS } from '@/config/wishlists';
import type { Database } from '@/types/database';

type WishlistItem = Database['public']['Tables']['wishlist_items']['Row'];

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const wishlist = await fetchEntityForMetadata(
    'wishlist',
    id,
    'title, description, cover_image_url',
    { column: 'is_active', value: true }
  );
  if (!wishlist) {
    return {
      title: 'Wishlist Not Found',
      description: 'The wishlist you are looking for does not exist.',
    };
  }
  return generateEntityMetadata({
    type: 'wishlist',
    id,
    title: wishlist.title,
    description: wishlist.description,
    imageUrl: wishlist.cover_image_url,
  });
}

export default async function PublicWishlistPage({ params }: PageProps) {
  const { id } = await params;

  // Items live in a sibling table and are the page's main content —
  // fetch them here and close over the result in renderDetails so the
  // generic component still does the parent fetch.
  const supabase = await createServerClient();
  const { data: itemsData } = await supabase
    .from(DATABASE_TABLES.WISHLIST_ITEMS)
    .select(
      'id, title, description, image_url, target_amount_btc, funded_amount_btc, is_fully_funded, external_url, priority'
    )
    .eq('wishlist_id', id)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true });

  const items = (itemsData || []) as WishlistItem[];
  const totalTarget = items.reduce((sum, item) => sum + (item.target_amount_btc || 0), 0);
  const totalFunded = items.reduce((sum, item) => sum + (item.funded_amount_btc || 0), 0);
  const overallProgress = totalTarget > 0 ? Math.round((totalFunded / totalTarget) * 100) : 0;

  const config: EntityDetailConfig = {
    entityType: 'wishlist',
    ownerLabel: 'Created by',
    descriptionTitle: 'About this Wishlist',
    visibilityFilter: { column: 'is_active', value: true },
    metadataSelect: 'title, description, cover_image_url',
    getJsonLdExtra: entity => ({
      ...(entity.event_date ? { eventDate: entity.event_date } : {}),
      numberOfItems: items.length,
    }),
    renderHeaderIcon: entity =>
      entity.cover_image_url ? (
        <Image
          src={entity.cover_image_url}
          alt={entity.title}
          width={64}
          height={64}
          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
          unoptimized
        />
      ) : (
        <div className="w-16 h-16 bg-surface-raised rounded-lg flex items-center justify-center flex-shrink-0">
          <Gift className="w-8 h-8 text-fg-primary" />
        </div>
      ),
    renderHeaderExtra: entity => (
      <>
        <Badge variant="secondary" className="capitalize">
          {WISHLIST_TYPE_LABELS[entity.type as string] || entity.type}
        </Badge>
        {entity.event_date && (
          <span className="text-sm text-fg-secondary">
            {new Date(entity.event_date).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        )}
      </>
    ),
    renderDetails: () => (
      <>
        {items.length > 0 && totalTarget > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Overall Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm text-fg-secondary">
                <span>{displayBTC(totalFunded)} funded</span>
                <span>{displayBTC(totalTarget)} total</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
              <p className="text-sm text-fg-secondary">{overallProgress}% of total goal</p>
            </CardContent>
          </Card>
        )}

        {items.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-fg-primary">Items ({items.length})</h2>
            {items.map(item => {
              const funded = item.funded_amount_btc ?? 0;
              const itemProgress =
                item.target_amount_btc > 0
                  ? Math.round((funded / item.target_amount_btc) * 100)
                  : 0;
              return (
                <Card key={item.id} className={item.is_fully_funded ? 'opacity-60' : ''}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {item.image_url && (
                        <Image
                          src={item.image_url}
                          alt={item.title}
                          width={64}
                          height={64}
                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                          unoptimized
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-fg-primary">{item.title}</h3>
                          {item.is_fully_funded && (
                            <Badge variant="default" className="bg-status-positive flex-shrink-0">
                              Funded
                            </Badge>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-sm text-fg-secondary mt-1 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                        {item.external_url && (
                          <a
                            href={item.external_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-fg-primary hover:underline mt-1 inline-block"
                          >
                            View item →
                          </a>
                        )}
                        {item.target_amount_btc > 0 && (
                          <div className="mt-3 space-y-1">
                            <div className="flex justify-between text-xs text-fg-secondary">
                              <span>{displayBTC(funded)}</span>
                              <span>{displayBTC(item.target_amount_btc)} goal</span>
                            </div>
                            <Progress value={itemProgress} className="h-1.5" />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-fg-secondary">
              <Gift className="w-8 h-8 mx-auto mb-2 text-fg-tertiary dark:text-fg-secondary/50" />
              <p>No items in this wishlist yet.</p>
            </CardContent>
          </Card>
        )}
      </>
    ),
  };

  return <PublicEntityDetailPage id={id} config={config} />;
}
