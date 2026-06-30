import PublicEntityDetailPage from '@/components/public/PublicEntityDetailPage';
import { circleDetailConfig } from '@/components/public/detail-configs/circle';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Circle detail (owner / dashboard).
 *
 * Renders the SAME layout members see (PublicEntityDetailPage) plus the owner
 * manage bar — no separate flat label→value grid. Config shared with the public
 * route via circleDetailConfig (SSOT).
 */
export default async function CircleDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <PublicEntityDetailPage id={id} config={circleDetailConfig} />;
}
