import { Metadata } from 'next';
import { Percent, TrendingUp, User, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatRelativeTime } from '@/utils/dates';
import { formatCurrency } from '@/services/currency';
import { PLATFORM_DEFAULT_CURRENCY } from '@/config/currencies';
import { generateEntityMetadata } from '@/lib/seo/metadata';
import PublicEntityCTA from '@/components/public/PublicEntityCTA';
import { ROUTES } from '@/config/routes';
import PublicEntityDetailPage, {
  fetchEntityForMetadata,
  type EntityDetailConfig,
  type EntityData,
} from '@/components/public/PublicEntityDetailPage';
import { calculateProgress } from '@/components/loans/useLoanList';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const loan = await fetchEntityForMetadata(
    'loan',
    id,
    'title, description, original_amount, currency',
    { column: 'is_public', value: true }
  );

  if (!loan) {
    return {
      title: 'Loan Not Found',
      description: 'The loan you are looking for does not exist.',
    };
  }

  const description = loan.description || `${loan.title} - Peer-to-peer Bitcoin loan on OrangeCat.`;
  return generateEntityMetadata({ type: 'loan', id, title: loan.title, description });
}

const loanConfig: EntityDetailConfig = {
  entityType: 'loan',
  ownerLabel: 'Listed By',
  descriptionTitle: 'About this Loan',
  visibilityFilter: { column: 'is_public', value: true },
  getViewRoute: id => ROUTES.LOANS.VIEW(id),
  showPaymentSection: false,
  mobileStickyCTA: (entity: EntityData) => ({
    label: 'Contact lister',
    href: `${ROUTES.AUTH}?mode=login&from=${ROUTES.LOANS.VIEW(entity.id)}`,
  }),
  getJsonLdExtra: (entity: EntityData) => ({
    amount: {
      '@type': 'MonetaryAmount',
      value: entity.original_amount,
      currency: entity.currency || 'BTC',
    },
    ...(entity.interest_rate !== null &&
      entity.interest_rate !== undefined && { annualPercentageRate: entity.interest_rate }),
  }),
  renderHeaderExtra: (entity: EntityData) => (
    <span className="text-muted-foreground text-sm">
      Listed {formatRelativeTime(entity.created_at)}
    </span>
  ),
  renderDetails: (entity: EntityData) => {
    const progress = calculateProgress(entity.original_amount, entity.remaining_balance);
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Financial Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Remaining Balance</span>
                <span className="font-bold text-xl text-foreground">
                  {formatCurrency(
                    entity.remaining_balance,
                    entity.currency ?? PLATFORM_DEFAULT_CURRENCY
                  )}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progress.toFixed(1)}% funded</span>
                <span>
                  Original:{' '}
                  {formatCurrency(
                    entity.original_amount,
                    entity.currency ?? PLATFORM_DEFAULT_CURRENCY
                  )}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {entity.interest_rate !== null && entity.interest_rate !== undefined && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Percent className="w-4 h-4" />
                    Interest Rate
                  </div>
                  <div className="font-semibold text-lg">{entity.interest_rate}% APR</div>
                </div>
              )}
              {entity.monthly_payment && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <TrendingUp className="w-4 h-4" />
                    Monthly Payment
                  </div>
                  <div className="font-semibold text-lg">
                    {formatCurrency(
                      entity.monthly_payment,
                      entity.currency ?? PLATFORM_DEFAULT_CURRENCY
                    )}
                  </div>
                </div>
              )}
            </div>

            {entity.lender_name && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground border-t dark:border-border pt-4">
                <User className="w-4 h-4" />
                <span>Current Lender: {entity.lender_name}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {entity.preferred_terms && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Preferred Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground whitespace-pre-wrap">{entity.preferred_terms}</p>
            </CardContent>
          </Card>
        )}
      </>
    );
  },
  renderSidebarExtra: (entity: EntityData) => (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Loan Type</span>
            <Badge variant="secondary" className="capitalize">
              {entity.loan_category_id || 'General'}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Negotiable</span>
            <span className="font-medium">{entity.is_negotiable ? 'Yes' : 'No'}</span>
          </div>
          {entity.minimum_offer_amount && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Min Offer</span>
              <span className="font-medium">
                {formatCurrency(
                  entity.minimum_offer_amount,
                  entity.currency ?? PLATFORM_DEFAULT_CURRENCY
                )}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Contact Method</span>
            <span className="font-medium capitalize">{entity.contact_method || 'Platform'}</span>
          </div>
        </CardContent>
      </Card>

      <PublicEntityCTA
        href={`${ROUTES.AUTH}?mode=login&from=${ROUTES.LOANS.VIEW(entity.id)}`}
        icon={MessageSquare}
        label="Contact Lister"
        description="Sign in to contact the loan lister or make an offer"
      />
    </>
  ),
};

export default async function PublicLoanDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <PublicEntityDetailPage id={id} config={loanConfig} />;
}
