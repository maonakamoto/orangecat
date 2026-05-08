import EntityDetailPage from '@/components/entity/EntityDetailPage';
import { causeEntityConfig } from '@/config/entities/causes';
import type { UserCause } from '@/types/database';
import { capitalize } from '@/utils/string';

interface CauseDetailPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Cause Detail Page
 *
 * Unified detail page using EntityDetailPage component.
 *
 * Created: 2025-01-27
 * Last Modified: 2026-01-03
 * Last Modified Summary: Refactored to use unified EntityDetailPage component
 */
export default async function CauseDetailPage({ params }: CauseDetailPageProps) {
  const { id } = await params;

  return (
    <EntityDetailPage<UserCause>
      config={causeEntityConfig}
      entityId={id}
      requireAuth={false}
      makeDetailFields={cause => {
        const left = [
          { label: 'Category', value: cause.cause_category || '—' },
          {
            label: 'Status',
            value: capitalize(cause.status || 'draft'),
          },
          {
            label: 'Goal Amount',
            value: cause.target_amount
              ? `${cause.target_amount.toLocaleString()} ${cause.currency || 'CHF'}`
              : 'Open-ended',
          },
          {
            label: 'Current Amount',
            value: `${(cause.current_amount || 0).toLocaleString()} ${cause.currency || 'CHF'}`,
          },
        ];

        const right: Array<{ label: string; value: string }> = [];

        if (cause.bitcoin_address) {
          right.push({ label: 'Bitcoin Address', value: cause.bitcoin_address });
        }
        if (cause.lightning_address) {
          right.push({ label: 'Lightning Address', value: cause.lightning_address });
        }

        return { left, right };
      }}
    />
  );
}
