import { Metadata } from 'next';
import { generateEntityMetadata } from '@/lib/seo/metadata';
import PublicEntityDetailPage, {
  fetchEntityForMetadata,
  type EntityDetailConfig,
} from '@/components/public/PublicEntityDetailPage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ROUTES } from '@/config/routes';
import { formatCurrency } from '@/services/currency';

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
  getJsonLdExtra: entity => {
    const { amount, currency } = getPrice(entity);
    return amount > 0
      ? { offers: { '@type': 'Offer', priceCurrency: currency, price: amount } }
      : {};
  },
  renderDetails: entity => {
    const { amount, currency } = getPrice(entity);
    return amount > 0 ? (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Price</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-fg-primary">{formatCurrency(amount, currency)}</p>
        </CardContent>
      </Card>
    ) : null;
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
