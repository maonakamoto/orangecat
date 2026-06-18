import { Metadata } from 'next';
import { generateEntityMetadata } from '@/lib/seo/metadata';
import PublicEntityDetailPage, {
  fetchEntityForMetadata,
  type EntityDetailConfig,
} from '@/components/public/PublicEntityDetailPage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ROUTES } from '@/config/routes';
import { formatCurrency } from '@/services/currency';
import { BookEntityButton } from '@/components/bookings/BookEntityButton';

interface PageProps {
  params: Promise<{ id: string }>;
}

// user_services stores its price in `fixed_price` (or `hourly_rate`) in the entity's
// chosen `currency` — NOT price_btc (no such column) and NOT in BTC. The old code read
// price_btc ?? fixed_price and rendered it with displayBTC(), so a 50 CHF service showed
// as "50 BTC". Read the real column + currency and format in that currency.
// See decision_currency_convention.
const getServicePrice = (entity: Record<string, unknown>) => {
  const fixed = entity.fixed_price;
  const hourly = entity.hourly_rate;
  const raw = typeof fixed === 'number' && fixed > 0 ? fixed : hourly;
  const amount = typeof raw === 'number' ? raw : Number(raw ?? NaN);
  return {
    amount: Number.isFinite(amount) ? amount : 0,
    currency: (entity.currency as string) || 'CHF',
    perHour: !(typeof fixed === 'number' && fixed > 0) && typeof hourly === 'number' && hourly > 0,
  };
};

const config: EntityDetailConfig = {
  entityType: 'service',
  ownerLabel: 'Provider',
  createdLabel: 'Listed',
  descriptionTitle: 'About this Service',
  getViewRoute: id => ROUTES.SERVICES.VIEW(id),
  getJsonLdExtra: entity => {
    const { amount, currency } = getServicePrice(entity);
    return {
      ...(amount > 0 && {
        offers: { '@type': 'Offer', priceCurrency: currency, price: amount },
      }),
      ...(entity.duration_minutes && { duration: `PT${entity.duration_minutes}M` }),
    };
  },
  renderDetails: entity => {
    const { amount, currency, perHour } = getServicePrice(entity);
    const durationMinutes = (entity as { duration_minutes?: number }).duration_minutes;
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {amount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-fg-secondary">Price</span>
              <span className="text-xl font-bold text-fg-primary">
                {formatCurrency(amount, currency)}
                {perHour ? ' / hr' : ''}
              </span>
            </div>
          )}
          {durationMinutes && (
            <div className="flex items-center justify-between">
              <span className="text-fg-secondary">Duration</span>
              <span className="font-medium">{durationMinutes} minutes</span>
            </div>
          )}
          <BookEntityButton
            className="w-full"
            bookableType="service"
            bookableId={entity.id as string}
            bookableTitle={(entity.title as string) || 'this service'}
            priceBtc={amount > 0 ? amount : undefined}
            priceCurrency={currency}
            durationMinutes={durationMinutes}
          />
        </CardContent>
      </Card>
    );
  },
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const service = await fetchEntityForMetadata('service', id);
  if (!service) {
    return {
      title: 'Service Not Found',
      description: 'The service you are looking for does not exist.',
    };
  }
  return generateEntityMetadata({
    type: 'service',
    id,
    title: service.title,
    description: service.description,
  });
}

export default async function PublicServicePage({ params }: PageProps) {
  const { id } = await params;
  return <PublicEntityDetailPage id={id} config={config} />;
}
