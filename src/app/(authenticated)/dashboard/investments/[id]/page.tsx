import PublicEntityDetailPage from '@/components/public/PublicEntityDetailPage';
import { investmentDetailConfig } from '@/components/public/detail-configs/investment';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Investment detail (owner / dashboard).
 *
 * Renders the SAME layout investors see (PublicEntityDetailPage) plus the owner
 * manage bar — no separate flat label→value grid. Config shared with the public
 * route via investmentDetailConfig (SSOT).
 */
export default async function InvestmentDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <PublicEntityDetailPage id={id} config={investmentDetailConfig} />;
}
