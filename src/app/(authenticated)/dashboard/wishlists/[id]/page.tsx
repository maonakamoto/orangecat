import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';
import { getOrCreateUserActor } from '@/services/actors/getOrCreateUserActor';
import { DATABASE_TABLES } from '@/config/database-tables';
import { ENTITY_REGISTRY } from '@/config/entity-registry';
import EntityDetailLayout from '@/components/entity/EntityDetailLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Progress } from '@/components/ui/progress';
import {
  WishlistWithStats,
  WishlistItem,
  WishlistItemList,
  WishlistDetailsSidebar,
} from './_components';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function WishlistDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;

  if (!user) {
    redirect(`/auth?mode=login&from=/dashboard/wishlists/${id}`);
  }

  const actor = await getOrCreateUserActor(user.id);

  const { data: wishlistData, error } = await (
    supabase.from(DATABASE_TABLES.WISHLIST_WITH_STATS) as ReturnType<typeof supabase.from>
  )
    .select('*')
    .eq('id', id)
    .eq('actor_id', actor.id)
    .single();

  if (error || !wishlistData) {
    notFound();
  }

  const wishlist = wishlistData as unknown as WishlistWithStats;

  const { data: itemsData } = await (
    supabase.from(DATABASE_TABLES.WISHLIST_ITEMS) as ReturnType<typeof supabase.from>
  )
    .select(
      'id, title, description, image_url, target_amount_btc, funded_amount_btc, is_fully_funded, is_fulfilled, external_url, priority, created_at'
    )
    .eq('wishlist_id', id)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true });

  const items = (itemsData || []) as unknown as WishlistItem[];

  const overallProgress =
    wishlist.total_target_btc > 0
      ? Math.round((wishlist.total_funded_btc / wishlist.total_target_btc) * 100)
      : 0;

  const wishlistBasePath = ENTITY_REGISTRY['wishlist'].basePath;
  const wishlistCreatePath = ENTITY_REGISTRY['wishlist'].createPath;

  const headerActions = (
    <div className="flex items-center gap-2">
      {(wishlist.visibility === 'public' || wishlist.visibility === 'unlisted') && (
        <Link href={`${ENTITY_REGISTRY['wishlist'].publicBasePath}/${id}`} target="_blank">
          <Button variant="outline" size="sm">
            <ExternalLink className="w-4 h-4 mr-1" />
            View Public Page
          </Button>
        </Link>
      )}
      <Link href={`${wishlistCreatePath}?edit=${id}`}>
        <Button size="sm">Edit Wishlist</Button>
      </Link>
    </div>
  );

  const breadcrumbItems = [
    { label: ENTITY_REGISTRY['wishlist'].namePlural, href: wishlistBasePath },
    { label: wishlist.title },
  ];

  const leftContent = (
    <div className="space-y-6">
      {wishlist.total_target_btc > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Funding Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{Number(wishlist.total_funded_btc).toFixed(8)} BTC funded</span>
              <span>{Number(wishlist.total_target_btc).toFixed(8)} BTC total</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{overallProgress}% of goal</span>
              <span>
                {wishlist.funded_item_count}/{wishlist.item_count} items funded
              </span>
            </div>
          </CardContent>
        </Card>
      )}
      <WishlistItemList items={items} wishlistBasePath={wishlistBasePath} id={id} />
    </div>
  );

  return (
    <EntityDetailLayout
      title={wishlist.title}
      headerActions={headerActions}
      breadcrumbItems={breadcrumbItems}
      left={leftContent}
      right={<WishlistDetailsSidebar wishlist={wishlist} />}
    />
  );
}
