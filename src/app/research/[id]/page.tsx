import { Metadata } from 'next';
import { generateEntityMetadata } from '@/lib/seo/metadata';
import PublicEntityDetailPage, {
  fetchEntityForMetadata,
  type EntityDetailConfig,
} from '@/components/public/PublicEntityDetailPage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ROUTES } from '@/config/routes';
import { displayBTC } from '@/services/currency';
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
    const progress = fundingGoal > 0 ? Math.round((fundingRaised / fundingGoal) * 100) : 0;

    return (
      <>
        {/* Funding Progress */}
        {fundingGoal > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Funding Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {displayBTC(fundingRaised)} raised
                </span>
                <span className="font-bold text-lg text-foreground">
                  {displayBTC(fundingGoal)} goal
                </span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground">{progress}% funded</p>
            </CardContent>
          </Card>
        )}

        {/* Research Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Research Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {entity.methodology && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Methodology</span>
                <span className="font-medium">
                  {METHODOLOGY_LABELS[entity.methodology] || entity.methodology}
                </span>
              </div>
            )}
            {entity.timeline && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Timeline</span>
                <span className="font-medium">
                  {TIMELINE_LABELS[entity.timeline] || entity.timeline}
                </span>
              </div>
            )}
            {entity.lead_researcher && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Lead Researcher</span>
                <span className="font-medium">{entity.lead_researcher}</span>
              </div>
            )}
            {entity.expected_outcome && (
              <div className="pt-2 border-t border-border-subtle">
                <p className="text-sm text-muted-foreground mb-1">Expected Outcome</p>
                <p className="text-sm text-muted-strong">{entity.expected_outcome}</p>
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
