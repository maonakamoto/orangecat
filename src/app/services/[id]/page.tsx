import { Metadata } from 'next';
import { generateEntityMetadata } from '@/lib/seo/metadata';
import PublicEntityDetailPage, {
  fetchEntityForMetadata,
  type EntityDetailConfig,
} from '@/components/public/PublicEntityDetailPage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ROUTES } from '@/config/routes';
import { displayBTC } from '@/services/currency';
import { BookEntityButton } from '@/components/bookings/BookEntityButton';

interface PageProps {
  params: Promise<{ id: string }>;
}

const config: EntityDetailConfig = {
  entityType: 'service',
  ownerLabel: 'Provider',
  createdLabel: 'Listed',
  descriptionTitle: 'About this Service',
  getViewRoute: id => ROUTES.SERVICES.VIEW(id),
  getJsonLdExtra: entity => ({
    ...(entity.price_btc && {
      offers: { '@type': 'Offer', priceCurrency: 'BTC', price: entity.price_btc },
    }),
    ...(entity.duration_minutes && { duration: `PT${entity.duration_minutes}M` }),
  }),
  renderDetails: entity => {
    // The service-detail Booking interface uses `price_btc`, but the
    // user_services table stores the column as `fixed_price`. Read
    // whichever is populated so the price + booking CTA work either way
    // until that mismatch is consolidated.
    const priceBtc =
      (entity as { price_btc?: number; fixed_price?: number }).price_btc ??
      (entity as { fixed_price?: number }).fixed_price;
    const durationMinutes = (entity as { duration_minutes?: number }).duration_minutes;
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {typeof priceBtc === 'number' && priceBtc > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Price</span>
              <span className="text-xl font-bold text-foreground">{displayBTC(priceBtc)}</span>
            </div>
          )}
          {durationMinutes && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-medium">{durationMinutes} minutes</span>
            </div>
          )}
          <BookEntityButton
            className="w-full"
            bookableType="service"
            bookableId={entity.id as string}
            bookableTitle={(entity.title as string) || 'this service'}
            priceBtc={priceBtc}
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
