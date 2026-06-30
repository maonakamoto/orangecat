import PublicEntityDetailPage from '@/components/public/PublicEntityDetailPage';
import { causeDetailConfig } from '@/components/public/detail-configs/cause';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Cause detail (owner / dashboard).
 *
 * Renders the SAME layout supporters see (PublicEntityDetailPage) plus the owner
 * manage bar. Config shared with the public route via causeDetailConfig (SSOT).
 */
export default async function CauseDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <PublicEntityDetailPage id={id} config={causeDetailConfig} />;
}
