'use client';

import EntityDashboardPage from '@/components/entity/EntityDashboardPage';
import { investmentEntityConfig } from '@/config/entities/investments';
import { type Investment } from '@/types/investments';
import { TrendingUp, Search } from 'lucide-react';
import { ENTITY_REGISTRY } from '@/config/entity-registry';

export default function InvestmentsPage() {
  return (
    <EntityDashboardPage<Investment>
      config={investmentEntityConfig}
      title="Investments"
      description="Create investment opportunities and manage structured deals"
      createButtonLabel="Create Investment"
      tabs={[
        { id: 'my-investments', label: 'My Investments', icon: TrendingUp },
        {
          id: 'open',
          label: 'Open Opportunities',
          icon: Search,
          apiEndpoint: `${ENTITY_REGISTRY['investment'].apiEndpoint}?public=true`,
          allowBulkSelect: false,
          emptyState: {
            title: 'No open opportunities',
            description: 'Check back later for investment opportunities from the community',
          },
        },
      ]}
    />
  );
}
