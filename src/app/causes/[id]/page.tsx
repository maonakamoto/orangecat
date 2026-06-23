import { Metadata } from 'next';
import { generateEntityMetadata } from '@/lib/seo/metadata';
import PublicEntityDetailPage, {
  fetchEntityForMetadata,
  type EntityDetailConfig,
} from '@/components/public/PublicEntityDetailPage';
import FundingProgress from '@/components/public/FundingProgress';
import { ROUTES } from '@/config/routes';

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
    // Always render — a cause with no goal set must still show an inviting
    // funding state, never a blank page. FundingProgress owns that decision.
    return <FundingProgress raised={raised} goal={goal} currency={currency} />;
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
