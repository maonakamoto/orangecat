'use client';

import EntityDashboardPage from '@/components/entity/EntityDashboardPage';
import { circleEntityConfig, type CircleListItem } from '@/config/entities/circles';

/**
 * Circles Dashboard Page — create and manage lightweight communities.
 */
export default function CirclesPage() {
  return (
    <EntityDashboardPage<CircleListItem>
      config={circleEntityConfig}
      title="My Circles"
      description="Create and manage lightweight communities for people who share an interest"
      createButtonLabel="Start a Circle"
    />
  );
}
