'use client';

import { useRouter } from 'next/navigation';
import EntityDetailLayout from '@/components/entity/EntityDetailLayout';
import { Button } from '@/components/ui/Button';
import { Settings } from 'lucide-react';
import Link from 'next/link';
import { useGroupDetail } from './useGroupDetail';
import { GroupDetailSidebar } from './GroupDetailSidebar';
import { GroupDetailTabs } from './GroupDetailTabs';

interface GroupDetailProps {
  groupSlug: string;
}

export function GroupDetail({ groupSlug }: GroupDetailProps) {
  const router = useRouter();
  const {
    user,
    group,
    members,
    wallets,
    loading,
    error,
    activeTab,
    setActiveTab,
    canCreateProposal,
    loadGroupData,
    labelConfig,
    governanceConfig,
    LabelIcon,
    isOwner,
    hasGovernanceFeatures,
  } = useGroupDetail(groupSlug);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-64 bg-gray-200 animate-pulse rounded-lg" />
        <div className="h-32 bg-gray-200 animate-pulse rounded-lg" />
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error || 'Group not found'}</p>
        <Button onClick={() => router.push('/groups')} className="mt-4">
          Back to Groups
        </Button>
      </div>
    );
  }

  const headerActions = isOwner ? (
    <Link href={`/groups/${group.slug}/settings`}>
      <Button variant="outline">
        <Settings className="h-4 w-4 mr-2" />
        Settings
      </Button>
    </Link>
  ) : null;

  return (
    <EntityDetailLayout
      title={group.name}
      subtitle={group.description || undefined}
      headerActions={headerActions}
      left={
        <GroupDetailTabs
          group={group}
          members={members}
          wallets={wallets}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          hasGovernanceFeatures={hasGovernanceFeatures}
          isOwner={isOwner}
          user={user}
          canCreateProposal={canCreateProposal}
          onUpdate={loadGroupData}
          labelConfig={labelConfig}
        />
      }
      right={
        <GroupDetailSidebar
          group={group}
          members={members}
          wallets={wallets}
          labelConfig={labelConfig}
          governanceConfig={governanceConfig}
          LabelIcon={LabelIcon}
        />
      }
    />
  );
}
