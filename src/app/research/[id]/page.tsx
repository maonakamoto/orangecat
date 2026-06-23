import { Metadata } from 'next';
import { generateEntityMetadata } from '@/lib/seo/metadata';
import PublicEntityDetailPage, {
  fetchEntityForMetadata,
  type EntityDetailConfig,
} from '@/components/public/PublicEntityDetailPage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import FundingProgress from '@/components/public/FundingProgress';
import { ROUTES } from '@/config/routes';
import { RESEARCH_FIELDS, METHODOLOGIES, TIMELINES } from '@/config/research';

interface PageProps {
  params: Promise<{ id: string }>;
}

const FIELD_LABELS = Object.fromEntries(RESEARCH_FIELDS.map(f => [f.value, f.label]));
const METHODOLOGY_LABELS = Object.fromEntries(METHODOLOGIES.map(m => [m.value, m.label]));
const TIMELINE_LABELS = Object.fromEntries(TIMELINES.map(t => [t.value, t.label]));

const config: EntityDetailConfig = {
  entityType: 'research',
  ownerLabel: 'Lead Researcher',
  descriptionTitle: 'About this Research',
  metadataSelect: 'title, description',
  getViewRoute: id => ROUTES.RESEARCH.VIEW(id),
  renderHeaderExtra: entity => {
    if (!entity.field) {
      return null;
    }
    return (
      <Badge variant="outline" className="capitalize">
        {FIELD_LABELS[entity.field] || entity.field}
      </Badge>
    );
  },
  renderDetails: entity => {
    const fundingGoal = Number(entity.funding_goal_btc ?? entity.funding_goal ?? 0);
    const fundingRaised = Number(entity.funding_raised_btc ?? 0);

    return (
      <>
        <FundingProgress raised={fundingRaised} goal={fundingGoal} currency="BTC" />

        {/* Research Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Research Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {entity.methodology && (
              <div className="flex justify-between text-sm">
                <span className="text-fg-secondary">Methodology</span>
                <span className="font-medium">
                  {METHODOLOGY_LABELS[entity.methodology] || entity.methodology}
                </span>
              </div>
            )}
            {entity.timeline && (
              <div className="flex justify-between text-sm">
                <span className="text-fg-secondary">Timeline</span>
                <span className="font-medium">
                  {TIMELINE_LABELS[entity.timeline] || entity.timeline}
                </span>
              </div>
            )}
            {entity.lead_researcher && (
              <div className="flex justify-between text-sm">
                <span className="text-fg-secondary">Lead Researcher</span>
                <span className="font-medium">{entity.lead_researcher}</span>
              </div>
            )}
            {entity.expected_outcome && (
              <div className="pt-2 border-t border-subtle">
                <p className="text-sm text-fg-secondary mb-1">Expected Outcome</p>
                <p className="text-sm text-fg-primary">{entity.expected_outcome}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </>
    );
  },
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const entity = await fetchEntityForMetadata('research', id, 'title, description');
  if (!entity) {
    return { title: 'Research Not Found' };
  }
  return generateEntityMetadata({
    type: 'research',
    id,
    title: entity.title,
    description: entity.description,
  });
}

export default async function PublicResearchPage({ params }: PageProps) {
  const { id } = await params;
  return <PublicEntityDetailPage id={id} config={config} />;
}
