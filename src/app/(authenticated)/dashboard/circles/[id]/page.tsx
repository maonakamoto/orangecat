import EntityDetailPage from '@/components/entity/EntityDetailPage';
import { circleEntityConfig, type CircleListItem } from '@/config/entities/circles';
import { capitalize } from '@/utils/string';

interface CircleDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CircleDetailPage({ params }: CircleDetailPageProps) {
  const { id } = await params;

  return (
    <EntityDetailPage<CircleListItem>
      config={circleEntityConfig}
      entityId={id}
      requireAuth={false}
      makeDetailFields={circle => ({
        left: [
          { label: 'Category', value: circle.category || '—' },
          { label: 'Visibility', value: capitalize(circle.visibility || 'public') },
          { label: 'Members', value: String(circle.member_count ?? 0) },
        ],
        right: [],
      })}
    />
  );
}
