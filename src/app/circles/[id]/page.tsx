import { Metadata } from 'next';
import { generateEntityMetadata } from '@/lib/seo/metadata';
import PublicEntityDetailPage, {
  fetchEntityForMetadata,
  type EntityDetailConfig,
} from '@/components/public/PublicEntityDetailPage';
import { Badge } from '@/components/ui/badge';
import { ROUTES } from '@/config/routes';

interface PageProps {
  params: Promise<{ id: string }>;
}

const config: EntityDetailConfig = {
  entityType: 'circle',
  ownerLabel: 'Created by',
  descriptionTitle: 'About this Circle',
  metadataSelect: 'title, description',
  getViewRoute: id => ROUTES.CIRCLES.VIEW(id),
  renderHeaderExtra: entity =>
    entity.category ? (
      <Badge variant="outline" className="capitalize">
        {entity.category as string}
      </Badge>
    ) : null,
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const entity = await fetchEntityForMetadata('circle', id, 'title, description');
  if (!entity) {
    return { title: 'Circle Not Found' };
  }
  return generateEntityMetadata({
    type: 'circle',
    id,
    title: entity.title,
    description: entity.description,
  });
}

export default async function PublicCirclePage({ params }: PageProps) {
  const { id } = await params;
  return <PublicEntityDetailPage id={id} config={config} />;
}
