import EntityDetailPage from '@/components/entity/EntityDetailPage';
import { researchEntityConfig } from '@/config/entities/research';
import { ResearchEntity } from '@/types/research';
import { capitalize } from '@/utils/string';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ResearchDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <EntityDetailPage<ResearchEntity>
      config={researchEntityConfig}
      entityId={id}
      requireAuth={true}
      redirectPath="/auth?mode=login&from=/dashboard/research"
      makeDetailFields={entity => {
        const left = [
          { label: 'Status', value: capitalize(String(entity.status || 'draft')) },
          {
            label: 'Field',
            value: entity.field ? String(entity.field).replace(/_/g, ' ') : '—',
          },
          {
            label: 'Methodology',
            value: entity.methodology ? String(entity.methodology).replace(/_/g, ' ') : '—',
          },
          {
            label: 'Timeline',
            value: entity.timeline ? String(entity.timeline).replace(/_/g, ' ') : '—',
          },
          { label: 'Lead Researcher', value: entity.lead_researcher || '—' },
        ];

        const right = [];

        if (entity.funding_goal) {
          right.push({
            label: 'Funding Goal',
            value: `${Number(entity.funding_goal).toLocaleString()} ${entity.funding_goal_currency || 'CHF'}`,
          });
        }

        right.push({
          label: 'Funding Raised',
          value: entity.funding_raised_btc
            ? `${Number(entity.funding_raised_btc).toFixed(8)} BTC`
            : '0 BTC',
        });

        right.push({
          label: 'Contributors',
          value: `${entity.total_contributors ?? 0}`,
        });

        if (entity.completion_percentage !== null && entity.completion_percentage !== undefined) {
          right.push({
            label: 'Completion',
            value: `${Math.round(Number(entity.completion_percentage))}%`,
          });
        }

        if (entity.next_deadline) {
          right.push({
            label: 'Next Deadline',
            value: new Date(entity.next_deadline).toLocaleDateString(),
          });
        }

        return { left, right };
      }}
    />
  );
}
