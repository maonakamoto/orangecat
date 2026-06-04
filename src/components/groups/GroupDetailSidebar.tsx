'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Globe, Lock, Eye, Bitcoin, Zap } from 'lucide-react';
import type { Group, GroupMember } from '@/types/group';
import type { GroupLabel } from '@/config/group-labels';
import type { GovernancePreset } from '@/config/governance-presets';
import { GROUP_LABELS } from '@/config/group-labels';
import { GOVERNANCE_PRESETS } from '@/config/governance-presets';
import type { ElementType } from 'react';

interface GroupDetailSidebarProps {
  group: Group;
  members: GroupMember[];
  wallets: unknown[];
  labelConfig: (typeof GROUP_LABELS)[GroupLabel] | null;
  governanceConfig: (typeof GOVERNANCE_PRESETS)[GovernancePreset] | null;
  LabelIcon: ElementType;
}

export function GroupDetailSidebar({
  group,
  members,
  wallets,
  labelConfig,
  governanceConfig,
  LabelIcon,
}: GroupDetailSidebarProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LabelIcon className={`h-5 w-5 ${labelConfig?.iconClass ?? 'text-muted-foreground'}`} />
            Group Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="text-muted-foreground">Label</div>
            <div className="font-medium">
              <Badge variant="secondary">{labelConfig?.name || group.label}</Badge>
            </div>

            {group.tags && group.tags.length > 0 && (
              <>
                <div className="text-muted-foreground">Tags</div>
                <div className="flex flex-wrap gap-1">
                  {group.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </>
            )}

            <div className="text-muted-foreground">Visibility</div>
            <div className="font-medium flex items-center gap-1">
              {group.visibility === 'public' ? (
                <>
                  <Globe className="h-4 w-4" />
                  Public
                </>
              ) : group.visibility === 'members_only' ? (
                <>
                  <Eye className="h-4 w-4" />
                  Members Only
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Private
                </>
              )}
            </div>

            <div className="text-muted-foreground">Listed</div>
            <div className="font-medium">{group.is_public ? 'Yes' : 'No'}</div>

            <div className="text-muted-foreground">Governance</div>
            <div className="font-medium">{governanceConfig?.name || group.governance_preset}</div>

            {group.voting_threshold && (
              <>
                <div className="text-muted-foreground">Voting Threshold</div>
                <div className="font-medium">{group.voting_threshold}%</div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {(group.bitcoin_address || group.lightning_address) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bitcoin className="h-5 w-5 text-bitcoinOrange" />
              Bitcoin
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {group.bitcoin_address && (
              <div>
                <div className="text-sm text-muted-foreground mb-1">On-chain Address</div>
                <div className="font-mono text-xs break-all bg-muted p-2 rounded">
                  {group.bitcoin_address}
                </div>
              </div>
            )}
            {group.lightning_address && (
              <div>
                <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Lightning Address
                </div>
                <div className="font-mono text-xs break-all bg-muted p-2 rounded">
                  {group.lightning_address}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Statistics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{members.length}</div>
              <div className="text-sm text-muted-foreground">Members</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{wallets.length}</div>
              <div className="text-sm text-muted-foreground">Wallets</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
