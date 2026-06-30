import { Metadata } from 'next';
import { generateEntityMetadata } from '@/lib/seo/metadata';
import PublicEntityDetailPage, {
  fetchEntityForMetadata,
  type EntityDetailConfig,
} from '@/components/public/PublicEntityDetailPage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import PriceDisplay from '@/components/public/PriceDisplay';
import { ROUTES } from '@/config/routes';

interface PageProps {
  params: Promise<{ id: string }>;
}

// user_products stores `price` in the entity's chosen `currency` (NOT price_btc —
// that column doesn't exist). The old code read entity.price_btc, so the Price card
// never rendered and products showed no price. Read price + currency and format in
// that currency. See decision_currency_convention / 20260618000005.
const getPrice = (entity: Record<string, unknown>) => ({
  amount: typeof entity.price === 'number' ? entity.price : Number(entity.price ?? NaN),
  currency: (entity.currency as string) || 'CHF',
});

const config: EntityDetailConfig = {
  entityType: 'product',
  ownerLabel: 'Seller',
  createdLabel: 'Listed',
  descriptionTitle: 'About this product',
  getViewRoute: id => ROUTES.PRODUCTS.VIEW(id),
  getCoverImages: entity => {
    const images = Array.isArray(entity.images) ? (entity.images as string[]) : [];
    return [...images, entity.thumbnail_url as string].filter(Boolean);
  },
  getPrice: entity => {
    const { amount, currency } = getPrice(entity);
    return Number.isFinite(amount) && amount > 0 ? { amount, currency } : null;
  },
  getJsonLdExtra: entity => {
    const { amount, currency } = getPrice(entity);
    return amount > 0
      ? { offers: { '@type': 'Offer', priceCurrency: currency, price: amount } }
      : {};
  },
  renderDetails: entity => {
    const { amount, currency } = getPrice(entity);
    const hasPrice = Number.isFinite(amount) && amount > 0;
    const productType = entity.product_type as string | undefined;
    const inventory = entity.inventory_count as number | null | undefined;
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasPrice && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-fg-secondary">Price</span>
              <PriceDisplay
                amount={amount}
                currency={currency}
                className="text-right text-xl font-bold text-fg-primary"
              />
            </div>
          )}
          {productType && (
            <div className="flex items-center justify-between">
              <span className="text-fg-secondary">Type</span>
              <span className="font-medium capitalize">{productType}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-fg-secondary">Availability</span>
            <span className="font-medium">
              {inventory === null || inventory === undefined
                ? 'In stock'
                : inventory > 0
                  ? `${inventory} available`
                  : 'Sold out'}
            </span>
          </div>
          {hasPrice && (
            // Anchors to the payment section (#pay) — the buyer's "Buy" is paying
            // the seller direct in Bitcoin. Mirrors the service page's Book CTA.
            <a
              href="#pay"
              className="mt-1 flex w-full items-center justify-center rounded-md bg-accent-warm px-4 py-2.5 font-medium text-white transition-colors hover:bg-accent-warm/90"
            >
              Buy now
            </a>
          )}
        </CardContent>
      </Card>
    );
  },
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await fetchEntityForMetadata('product', id);
  if (!product) {
    return {
      title: 'Product Not Found',
      description: 'The product you are looking for does not exist.',
    };
  }
  return generateEntityMetadata({
    type: 'product',
    id,
    title: product.title,
    description: product.description,
  });
}

export default async function PublicProductPage({ params }: PageProps) {
  const { id } = await params;
  return <PublicEntityDetailPage id={id} config={config} />;
}
