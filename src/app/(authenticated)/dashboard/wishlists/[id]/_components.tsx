import Link from 'next/link';
import { Plus, Gift } from 'lucide-react';
import { formatDate } from '@/utils/dates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/Button';
import { WISHLIST_TYPE_LABELS } from '@/config/wishlists';

export interface WishlistWithStats {
  id: string;
  actor_id: string;
  title: string;
  description: string | null;
  type: string;
  visibility: string;
  is_active: boolean;
  event_date: string | null;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
  item_count: number;
  funded_item_count: number;
  fulfilled_item_count: number;
  total_target_btc: number;
  total_funded_btc: number;
}

export interface WishlistItem {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  target_amount_btc: number;
  funded_amount_btc: number;
  is_fully_funded: boolean;
  is_fulfilled: boolean;
  external_url: string | null;
  priority: number;
  created_at: string;
}

export function WishlistItemCard({
  item,
  wishlistBasePath,
}: {
  item: WishlistItem;
  wishlistBasePath: string;
}) {
  const itemProgress =
    item.target_amount_btc > 0
      ? Math.round((item.funded_amount_btc / item.target_amount_btc) * 100)
      : 0;

  return (
    <Link key={item.id} href={`${wishlistBasePath}/items/${item.id}`} className="block">
      <Card
        className={`hover:shadow-md transition-shadow ${item.is_fulfilled ? 'opacity-60' : ''}`}
      >
        <CardContent className="p-4">
          <div className="flex gap-3">
            {item.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.image_url}
                alt={item.title}
                className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Gift className="w-6 h-6 text-gray-300" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-gray-900">{item.title}</span>
                <div className="flex gap-1 flex-shrink-0">
                  {item.is_fulfilled && (
                    <Badge variant="secondary" className="text-xs">
                      Fulfilled
                    </Badge>
                  )}
                  {item.is_fully_funded && !item.is_fulfilled && (
                    <Badge className="bg-green-500 text-xs">Funded</Badge>
                  )}
                </div>
              </div>
              {item.description && (
                <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{item.description}</p>
              )}
              {item.external_url && (
                <span className="text-xs text-tiffany-600">External link →</span>
              )}
              {item.target_amount_btc > 0 && (
                <div className="mt-2 space-y-1">
                  <Progress value={itemProgress} className="h-1" />
                  <p className="text-xs text-gray-500">
                    {Number(item.funded_amount_btc).toFixed(8)} /{' '}
                    {Number(item.target_amount_btc).toFixed(8)} BTC
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function WishlistItemList({
  items,
  wishlistBasePath,
  id,
}: {
  items: WishlistItem[];
  wishlistBasePath: string;
  id: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Items {items.length > 0 && `(${items.length})`}</h2>
        <Link href={`${wishlistBasePath}/items/new?wishlist_id=${id}`}>
          <Button size="sm" variant="outline">
            <Plus className="w-4 h-4 mr-1" />
            Add Item
          </Button>
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-lg">
          <Gift className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-gray-500 mb-3">No items yet</p>
          <Link href={`${wishlistBasePath}/items/new?wishlist_id=${id}`}>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add First Item
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <WishlistItemCard key={item.id} item={item} wishlistBasePath={wishlistBasePath} />
          ))}
        </div>
      )}
    </div>
  );
}

export function WishlistDetailsSidebar({ wishlist }: { wishlist: WishlistWithStats }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <div className="text-gray-500">Type</div>
            <div className="font-medium capitalize">
              {WISHLIST_TYPE_LABELS[wishlist.type] || wishlist.type}
            </div>
          </div>
          <div>
            <div className="text-gray-500">Visibility</div>
            <div className="font-medium capitalize">{wishlist.visibility}</div>
          </div>
          <div>
            <div className="text-gray-500">Status</div>
            <div className="font-medium">{wishlist.is_active ? 'Active' : 'Inactive'}</div>
          </div>
          {wishlist.event_date && (
            <div>
              <div className="text-gray-500">Event Date</div>
              <div className="font-medium">
                {new Date(wishlist.event_date).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            </div>
          )}
          <div>
            <div className="text-gray-500">Created</div>
            <div className="font-medium">{formatDate(wishlist.created_at)}</div>
          </div>
          {wishlist.fulfilled_item_count > 0 && (
            <div>
              <div className="text-gray-500">Fulfilled Items</div>
              <div className="font-medium">
                {wishlist.fulfilled_item_count} of {wishlist.item_count}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {wishlist.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{wishlist.description}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
