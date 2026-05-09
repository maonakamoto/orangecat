import { Metadata } from 'next';
import { generateEntityMetadata } from '@/lib/seo/metadata';
import PublicEntityDetailPage, {
  fetchEntityForMetadata,
  type EntityDetailConfig,
} from '@/components/public/PublicEntityDetailPage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { ROUTES } from '@/config/routes';
import { displayBTC } from '@/services/currency';
import {
  ASSET_TYPE_LABELS,
  ASSET_VERIFICATION_COLORS,
  ASSET_VERIFICATION_LABELS,
  ASSET_RENTAL_PERIOD_LABELS,
} from '@/config/assets';

interface PageProps {
  params: Promise<{ id: string }>;
}

const config: EntityDetailConfig = {
  entityType: 'asset',
  ownerLabel: 'Listed By',
  descriptionTitle: 'About this Asset',
  metadataSelect: 'title, description',
  showPaymentSection: false,
  getViewRoute: id => ROUTES.ASSETS.VIEW(id),
  renderHeaderExtra: entity => {
    const verificationStatus = entity.verification_status as string | undefined;
    if (!verificationStatus) {
      return null;
    }
    return (
      <span
        className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
          ASSET_VERIFICATION_COLORS[verificationStatus] ?? 'bg-gray-100 text-gray-800'
        }`}
      >
        {ASSET_VERIFICATION_LABELS[verificationStatus] ?? verificationStatus}
      </span>
    );
  },
  getJsonLdExtra: entity => ({
    ...(entity.estimated_value && {
      value: {
        '@type': 'MonetaryAmount',
        value: entity.estimated_value,
        currency: entity.currency || 'CHF',
      },
    }),
    ...(entity.location && { address: entity.location }),
  }),
  renderDetails: entity => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Asset Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {entity.type && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Type</span>
              <Badge variant="secondary">
                {ASSET_TYPE_LABELS[entity.type as string] ?? String(entity.type)}
              </Badge>
            </div>
          )}
          {entity.location && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Location</span>
              <span className="font-medium text-sm">{String(entity.location)}</span>
            </div>
          )}
          {entity.estimated_value !== null && entity.estimated_value !== undefined && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Estimated Value</span>
              <span className="font-semibold">
                {Number(entity.estimated_value).toLocaleString()} {String(entity.currency || 'CHF')}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {(entity.is_for_sale || entity.is_for_rent) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Availability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {entity.is_for_sale && (
              <div className="p-3 bg-green-50 rounded-lg space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-green-800">For Sale</span>
                </div>
                {entity.sale_price_btc !== null && entity.sale_price_btc !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Sale Price</span>
                    <span className="font-bold text-green-700">
                      {displayBTC(Number(entity.sale_price_btc))}
                    </span>
                  </div>
                )}
              </div>
            )}
            {entity.is_for_rent && (
              <div className="p-3 bg-blue-50 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-blue-800">For Rent</span>
                </div>
                {entity.rental_price_btc !== null && entity.rental_price_btc !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Rental Price</span>
                    <span className="font-bold text-blue-700">
                      {displayBTC(Number(entity.rental_price_btc))} /{' '}
                      {ASSET_RENTAL_PERIOD_LABELS[entity.rental_period_type as string] ?? 'period'}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Minimum Period</span>
                  <span className="font-medium">
                    {entity.min_rental_period}{' '}
                    {ASSET_RENTAL_PERIOD_LABELS[entity.rental_period_type as string] ?? 'period'}
                    {Number(entity.min_rental_period) !== 1 ? 's' : ''}
                  </span>
                </div>
                {entity.max_rental_period !== null && entity.max_rental_period !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Maximum Period</span>
                    <span className="font-medium">
                      {entity.max_rental_period}{' '}
                      {ASSET_RENTAL_PERIOD_LABELS[entity.rental_period_type as string] ?? 'period'}
                      {Number(entity.max_rental_period) !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            )}
            {entity.requires_deposit &&
              entity.deposit_amount_btc !== null &&
              entity.deposit_amount_btc !== undefined && (
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="text-sm text-gray-500">Security Deposit</span>
                  <span className="font-semibold">
                    {displayBTC(Number(entity.deposit_amount_btc))}
                  </span>
                </div>
              )}
          </CardContent>
        </Card>
      )}
    </div>
  ),
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const asset = await fetchEntityForMetadata('asset', id, 'title, description');
  if (!asset) {
    return {
      title: 'Asset Not Found',
      description: 'The asset you are looking for does not exist.',
    };
  }
  return generateEntityMetadata({
    type: 'asset',
    id,
    title: asset.title,
    description: asset.description,
  });
}

export default async function PublicAssetPage({ params }: PageProps) {
  const { id } = await params;
  return <PublicEntityDetailPage id={id} config={config} />;
}
