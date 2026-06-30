import PublicEntityDetailPage from '@/components/public/PublicEntityDetailPage';
import { loanDetailConfig } from '@/components/public/detail-configs/loan';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Loan detail (owner / dashboard).
 *
 * Renders the SAME layout buyers/lenders see (PublicEntityDetailPage) plus the
 * owner manage bar — no separate flat label→value grid. Config shared with the
 * public route via loanDetailConfig (SSOT).
 */
export default async function LoanDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <PublicEntityDetailPage id={id} config={loanDetailConfig} />;
}
