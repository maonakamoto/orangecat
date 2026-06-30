import PublicEntityDetailPage from '@/components/public/PublicEntityDetailPage';
import { researchDetailConfig } from '@/components/public/detail-configs/research';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Research detail (owner / dashboard).
 *
 * Renders the SAME layout funders see (PublicEntityDetailPage) plus the owner
 * manage bar. Config shared with the public route via researchDetailConfig (SSOT).
 */
export default async function ResearchDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <PublicEntityDetailPage id={id} config={researchDetailConfig} />;
}
