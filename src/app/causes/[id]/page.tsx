import { Metadata } from 'next';
import { generateEntityMetadata } from '@/lib/seo/metadata';
import PublicEntityDetailPage, {
  fetchEntityForMetadata,
  type EntityDetailConfig,
} from '@/components/public/PublicEntityDetailPage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Progress } from '@/components/ui/progress';
import { ROUTES } from '@/config/routes';
import { formatCurrency } from '@/services/currency';

interface PageProps {
  params: Promise<{ id: string }>;
}

// user_causes stores goal_amount in its chosen `currency` (causes can be BTC OR CHF),
// and the raised total is column `total_raised` — NOT `raised_amount` (that column
// doesn't exist, so "raised" was always blank). The old code also rendered the goal
// with displayBTC(), showing a CHF goal as BTC. Read total_raised + currency, format
// with formatCurrency. See decision_currency_convention.
const causeFunding = (entity: Record<string, unknown>) => ({
  goal: Number(entity.goal_amount ?? 0),
  raised: Number(entity.total_raised ?? 0),
  currency: (entity.currency as string) || 'BTC',
});

const config: EntityDetailConfig = {
  entityType: 'cause',
  ownerLabel: 'Organized By',
  descriptionTitle: 'About this Cause',
  metadataSelect: 'title, description',
  getViewRoute: id => ROUTES.CAUSES.VIEW(id),
  getJsonLdExtra: entity => {
    const { goal, currency } = causeFunding(entity);
    return goal > 0
      ? {
          funding: {
            '@type': 'MonetaryGrant',
            amount: { '@type': 'MonetaryAmount', value: goal, currency },
          },
        }
      : {};
  },
  renderDetails: entity => {
    const { goal, raised, currency } = causeFunding(entity);
    if (goal <= 0) {
      return null;
    }
    const progress = Math.round((raised / goal) * 100);
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Funding Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-fg-secondary">
              {formatCurrency(raised, currency)} raised
            </span>
            <span className="font-bold text-lg text-fg-primary">
              {formatCurrency(goal, currency)} goal
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-fg-secondary">{progress}% funded</p>
        </CardContent>
      </Card>
    );
  },
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const cause = await fetchEntityForMetadata('cause', id, 'title, description');
  if (!cause) {
    return {
      title: 'Cause Not Found',
      description: 'The cause you are looking for does not exist.',
    };
  }
  return generateEntityMetadata({
    type: 'cause',
    id,
    title: cause.title,
    description: cause.description,
  });
}

export default async function PublicCausePage({ params }: PageProps) {
  const { id } = await params;
  return <PublicEntityDetailPage id={id} config={config} />;
}
