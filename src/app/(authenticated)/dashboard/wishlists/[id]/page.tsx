import { createServerClient } from '@/lib/supabase/server';
import { DATABASE_TABLES } from '@/config/database-tables';
import PublicEntityDetailPage from '@/components/public/PublicEntityDetailPage';
import {
  buildWishlistDetailConfig,
  WISHLIST_ITEM_COLUMNS,
  type WishlistDetailItem,
} from '@/components/public/detail-configs/wishlist';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Wishlist detail (owner / dashboard).
 *
 * Renders the SAME intent-driven layout visitors see (PublicEntityDetailPage)
 * plus the owner manage bar — no separate flat label→value grid. The shared
 * config detects ownership and swaps the read-only item list for the managed
 * one (Add Item + per-item edit links). Config is SSOT with the public route.
 */
export default async function WishlistDetailPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createServerClient();
  const { data: itemsData } = await supabase
    .from(DATABASE_TABLES.WISHLIST_ITEMS)
    .select(WISHLIST_ITEM_COLUMNS)
    .eq('wishlist_id', id)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true });

  const items = (itemsData || []) as unknown as WishlistDetailItem[];

  return <PublicEntityDetailPage id={id} config={buildWishlistDetailConfig(items)} />;
}
