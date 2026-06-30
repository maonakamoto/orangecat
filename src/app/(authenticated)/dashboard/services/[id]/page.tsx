import PublicEntityDetailPage from '@/components/public/PublicEntityDetailPage';
import { serviceDetailConfig } from '@/components/public/detail-configs/service';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Service detail (owner / dashboard).
 *
 * Renders the SAME layout buyers see (PublicEntityDetailPage) plus the owner
 * manage bar — no separate flat label→value grid. Config shared with the public
 * route via serviceDetailConfig (SSOT).
 */
export default async function ServiceDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <PublicEntityDetailPage id={id} config={serviceDetailConfig} />;
}
