import PublicEntityDetailPage from '@/components/public/PublicEntityDetailPage';
import { productDetailConfig } from '@/components/public/detail-configs/product';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Product detail (owner / dashboard).
 *
 * Renders the SAME layout buyers see (PublicEntityDetailPage) — the owner just
 * additionally gets the manage bar (Edit + status). Replaces the old flat
 * label→value grid: owners shouldn't be shown their listing as a database row.
 * SSOT config shared with the public route via productDetailConfig.
 */
export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <PublicEntityDetailPage id={id} config={productDetailConfig} />;
}
