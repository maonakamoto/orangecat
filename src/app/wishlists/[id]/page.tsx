import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Gift } from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';
import { generateEntityMetadata } from '@/lib/seo/metadata';
import { generateEntityJsonLd, JsonLdScript } from '@/lib/seo/structured-data';
import { fetchEntityOwner } from '@/lib/entities/fetchEntityOwner';
import { DATABASE_TABLES } from '@/config/database-tables';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { displayBTC } from '@/services/currency/formatting';
import { Progress } from '@/components/ui/progress';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import PublicEntityOwnerCard from '@/components/public/PublicEntityOwnerCard';
import EntityShare from '@/components/sharing/EntityShare';
import { PublicEntityPaymentSection } from '@/components/payment';
import { WISHLIST_TYPE_LABELS } from '@/config/wishlists';
import { ENTITY_REGISTRY } from '@/config/entity-registry';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface WishlistItem {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  target_amount_btc: number;
  funded_amount_btc: number;
  is_fully_funded: boolean;
  external_url: string | null;
  priority: number;
}

interface Wishlist {
  id: string;
  actor_id: string;
  title: string;
  description: string | null;
  type: string;
  visibility: string;
  is_active: boolean;
  cover_image_url: string | null;
  event_date: string | null;
  created_at: string;
  updated_at: string;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data } = await supabase
    .from(DATABASE_TABLES.WISHLISTS)
    .select('title, description, cover_image_url')
    .eq('id', id)
    .eq('is_active', true)
    .single();

  if (!data) {
    return {
      title: 'Wishlist Not Found',
      description: 'The wishlist you are looking for does not exist.',
    };
  }

  const wishlist = data as Pick<Wishlist, 'title' | 'description' | 'cover_image_url'>;
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
  const supabase = await createServerClient();

  const { data: wishlistData, error } = await supabase
    .from(DATABASE_TABLES.WISHLISTS)
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single();

  if (error || !wishlistData) {
    notFound();
  }

  const wishlist = wishlistData as Wishlist;

  const { data: itemsData } = await supabase
    .from(DATABASE_TABLES.WISHLIST_ITEMS)
    .select(
      'id, title, description, image_url, target_amount_btc, funded_amount_btc, is_fully_funded, external_url, priority'
    )
    .eq('wishlist_id', id)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true });

  const items = (itemsData || []) as WishlistItem[];
  const owner = await fetchEntityOwner(supabase, wishlist);

  const totalTarget = items.reduce((sum, item) => sum + (item.target_amount_btc || 0), 0);
  const totalFunded = items.reduce((sum, item) => sum + (item.funded_amount_btc || 0), 0);
  const overallProgress = totalTarget > 0 ? Math.round((totalFunded / totalTarget) * 100) : 0;

  const jsonLd = generateEntityJsonLd({
    type: 'wishlist',
    id,
    title: wishlist.title,
    description: wishlist.description ?? undefined,
    extra: {
      ...(wishlist.event_date && { eventDate: wishlist.event_date }),
      numberOfItems: items.length,
    },
  });

  return (
    <>
      <JsonLdScript data={jsonLd} />
      <div className="min-h-screen bg-background">
        <div className="bg-card border-b border-border">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Breadcrumb
              items={[
                {
                  label: ENTITY_REGISTRY['wishlist'].namePlural,
                  href: ENTITY_REGISTRY['wishlist'].publicBasePath,
                },
                { label: wishlist.title },
              ]}
              className="mb-4"
            />
            <div className="flex items-start gap-4">
              {wishlist.cover_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={wishlist.cover_image_url}
                  alt={wishlist.title}
                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-16 bg-rose-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Gift className="w-8 h-8 text-rose-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{wishlist.title}</h1>
                <div className="flex items-center gap-3 mt-2">
                  <Badge variant="secondary" className="capitalize">
                    {WISHLIST_TYPE_LABELS[wishlist.type] || wishlist.type}
                  </Badge>
                  {wishlist.event_date && (
                    <span className="text-sm text-muted-foreground">
                      {new Date(wishlist.event_date).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {wishlist.description && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">About this Wishlist</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground whitespace-pre-wrap">{wishlist.description}</p>
                  </CardContent>
                </Card>
              )}

              {items.length > 0 && totalTarget > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Overall Progress</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{displayBTC(totalFunded)} funded</span>
                      <span>{displayBTC(totalTarget)} total</span>
                    </div>
                    <Progress value={overallProgress} className="h-2" />
                    <p className="text-sm text-muted-foreground">
                      {overallProgress}% of total goal
                    </p>
                  </CardContent>
                </Card>
              )}

              {items.length > 0 ? (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-foreground">Items ({items.length})</h2>
                  {items.map(item => {
                    const itemProgress =
                      item.target_amount_btc > 0
                        ? Math.round((item.funded_amount_btc / item.target_amount_btc) * 100)
                        : 0;
                    return (
                      <Card key={item.id} className={item.is_fully_funded ? 'opacity-60' : ''}>
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            {item.image_url && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.image_url}
                                alt={item.title}
                                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="font-semibold text-foreground">{item.title}</h3>
                                {item.is_fully_funded && (
                                  <Badge variant="default" className="bg-green-500 flex-shrink-0">
                                    Funded
                                  </Badge>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {item.description}
                                </p>
                              )}
                              {item.external_url && (
                                <a
                                  href={item.external_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-tiffany-600 hover:underline mt-1 inline-block"
                                >
                                  View item →
                                </a>
                              )}
                              {item.target_amount_btc > 0 && (
                                <div className="mt-3 space-y-1">
                                  <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>{displayBTC(item.funded_amount_btc)}</span>
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
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Gift className="w-8 h-8 mx-auto mb-2 text-muted-dim dark:text-muted-foreground/50" />
                    <p>No items in this wishlist yet.</p>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-6">
              {owner && <PublicEntityOwnerCard owner={owner} label="Created by" />}

              <EntityShare
                entityType="wishlist"
                entityId={id}
                title={wishlist.title}
                description={wishlist.description ?? undefined}
              />

              <PublicEntityPaymentSection
                entityType="wishlist"
                entityId={id}
                entityTitle={wishlist.title}
                sellerProfileId={owner?.id ?? null}
                sellerUserId={owner?.user_id ?? null}
                signInRedirect={`${ENTITY_REGISTRY['wishlist'].publicBasePath}/${id}`}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
