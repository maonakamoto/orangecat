/**
 * Owner-only bars atop the public entity detail page: the manage/preview
 * banner (with Edit) and the optional per-entity funding-visibility toggle.
 * Extracted from PublicEntityDetailPage.tsx to keep it under 300 lines.
 * Rendered only when the viewer owns the entity.
 */
import Link from 'next/link';
import { Pencil } from 'lucide-react';
import Button from '@/components/ui/Button';
import { WalletVisibilityToggle } from '@/components/wallets/WalletVisibilityToggle';
import { type WalletVisibility } from '@/config/wallet-visibility';
import type { EntityType } from '@/config/entity-registry';

export function PublicEntityOwnerBar({
  isOwnerPreview,
  entityName,
  entityStatus,
  editHref,
  fundingLink,
  entityType,
  entityId,
}: {
  isOwnerPreview: boolean;
  /** Human label for the entity type, e.g. meta.name ("Product"). */
  entityName: string;
  entityStatus?: string;
  editHref: string;
  fundingLink: { walletId: string; visibility: WalletVisibility } | null;
  entityType: EntityType;
  entityId: string;
}) {
  return (
    <>
      <div className="border-b border-default bg-surface-raised">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 px-4 py-2.5 sm:px-6 lg:px-8">
          <span className="text-sm text-fg-secondary">
            {isOwnerPreview ? (
              <>
                Preview — this {entityName.toLowerCase()} is{' '}
                <span className="font-medium capitalize text-fg-primary">{entityStatus}</span> and
                only visible to you. Publish it to go live.
              </>
            ) : (
              <>This is your live {entityName.toLowerCase()} as buyers see it.</>
            )}
          </span>
          <Link href={editHref}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          </Link>
        </div>
      </div>
      {fundingLink && (
        <div className="border-b border-default bg-surface-raised">
          <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
            <WalletVisibilityToggle
              walletId={fundingLink.walletId}
              entityType={entityType}
              entityId={entityId}
              initialVisibility={fundingLink.visibility}
            />
          </div>
        </div>
      )}
    </>
  );
}
