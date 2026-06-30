import PublicEntityDetailPage from '@/components/public/PublicEntityDetailPage';
import { assetDetailConfig } from '@/components/public/detail-configs/asset';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Asset detail (owner / dashboard).
 *
 * Renders the SAME layout renters/buyers see (PublicEntityDetailPage) plus the
 * owner manage bar — no separate flat label→value grid. Config shared with the
 * public route via assetDetailConfig (SSOT).
 */
export default async function AssetDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <PublicEntityDetailPage id={id} config={assetDetailConfig} />;
}
