import { Metadata } from 'next';
import { generateEntityMetadata } from '@/lib/seo/metadata';
import PublicEntityDetailPage, {
  fetchEntityForMetadata,
} from '@/components/public/PublicEntityDetailPage';
import { serviceDetailConfig } from '@/components/public/detail-configs/service';

interface PageProps {
  params: Promise<{ id: string }>;
}

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
  return <PublicEntityDetailPage id={id} config={serviceDetailConfig} />;
}
