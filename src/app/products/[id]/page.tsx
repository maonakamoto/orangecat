import { Metadata } from 'next';
import { generateEntityMetadata } from '@/lib/seo/metadata';
import PublicEntityDetailPage, {
  fetchEntityForMetadata,
  type EntityDetailConfig,
} from '@/components/public/PublicEntityDetailPage';
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
  // Price is the decision fact — show it under the title, above the fold,
  // not in a card below. (Was a lonely "Price" card lower down.)
  headerFact: entity => {
    const { amount, currency } = getPrice(entity);
    return amount > 0 ? <PriceDisplay amount={amount} currency={currency} /> : null;
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
