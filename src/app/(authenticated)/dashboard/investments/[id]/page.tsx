import EntityDetailPage from '@/components/entity/EntityDetailPage';
import { investmentEntityConfig } from '@/config/entities/investments';
import { Investment } from '@/types/investments';
import { capitalize } from '@/utils/string';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function InvestmentDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <EntityDetailPage<Investment>
      config={investmentEntityConfig}
      entityId={id}
      requireAuth={true}
      redirectPath="/auth?mode=login&from=/dashboard/investments"
      makeDetailFields={investment => {
        const currency = investment.currency || 'CHF';

        const left = [
          { label: 'Status', value: capitalize(investment.status || 'draft') },
          {
            label: 'Type',
            value: investment.investment_type ? investment.investment_type.replace('_', ' ') : '—',
          },
          {
            label: 'Target Amount',
            value: investment.target_amount
              ? `${investment.target_amount.toLocaleString()} ${currency}`
              : '—',
          },
          {
            label: 'Total Raised',
            value: `${(investment.total_raised || 0).toLocaleString()} ${currency}`,
          },
          {
            label: 'Minimum Investment',
            value: investment.minimum_investment
              ? `${investment.minimum_investment.toLocaleString()} ${currency}`
              : '—',
          },
        ];

        if (investment.maximum_investment) {
          left.push({
            label: 'Maximum Investment',
            value: `${investment.maximum_investment.toLocaleString()} ${currency}`,
          });
        }

        const right = [];

        if (investment.risk_level) {
          right.push({ label: 'Risk Level', value: capitalize(investment.risk_level) });
        }

        if (investment.expected_return_rate) {
          right.push({
            label: 'Expected Return',
            value: `${investment.expected_return_rate}%`,
          });
        }

        if (investment.return_frequency) {
          right.push({
            label: 'Return Frequency',
            value: capitalize(investment.return_frequency.replace('_', ' ')),
          });
        }

        if (investment.term_months) {
          right.push({ label: 'Term', value: `${investment.term_months} months` });
        }

        right.push({
          label: 'Investors',
          value: `${investment.investor_count || 0}`,
        });

        if (investment.bitcoin_address) {
          right.push({ label: 'Bitcoin Address', value: investment.bitcoin_address });
        }
        if (investment.lightning_address) {
          right.push({ label: 'Lightning Address', value: investment.lightning_address });
        }

        return { left, right };
      }}
    />
  );
}
