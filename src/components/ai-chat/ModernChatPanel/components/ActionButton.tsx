/**
 * ACTION BUTTON COMPONENT
 * Button for suggested entity creation and wallet creation actions
 *
 * Uses ENTITY_REGISTRY as SSOT for entity metadata including icons.
 */

import { cn } from '@/lib/utils';
import { ENTITY_REGISTRY } from '@/config/entity-registry';
import { Plus } from 'lucide-react';
import type { CatAction } from '../types';

interface ActionButtonProps {
  action: CatAction;
  onClick: () => void;
}

export function ActionButton({ action, onClick }: ActionButtonProps) {
  if (action.type === 'suggest_wallet') {
    const WalletIcon = ENTITY_REGISTRY.wallet.icon;
    return (
      <button
        onClick={onClick}
        className={cn(
          'flex items-center gap-2 rounded-md px-4 py-2.5',
          'bg-fg-primary text-sm font-medium text-fg-inverted hover:bg-fg-primary/90',
          'transition-colors'
        )}
      >
        <Plus className="h-4 w-4" />
        <WalletIcon className="h-4 w-4" />
        <span>Create Wallet: {action.prefill.label}</span>
      </button>
    );
  }

  // exec_action blocks run server-side; they don't render a button here
  if (action.type === 'exec_action') {
    return null;
  }

  // Entity actions (create, update, publish)
  const entityMeta = ENTITY_REGISTRY[action.entityType];
  const Icon = entityMeta?.icon || Plus;
  const entityName = entityMeta?.name || action.entityType;

  let label: string;
  if (action.type === 'create_entity') {
    label = `Create ${entityName}: ${action.prefill.title}`;
  } else if (action.type === 'update_entity') {
    label = `Update ${entityName}`;
  } else {
    label = `Publish ${entityName}`;
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-md px-4 py-2.5',
        action.type === 'publish_entity'
          ? 'bg-status-positive hover:bg-status-positive/90'
          : action.type === 'update_entity'
            ? 'bg-muted-strong hover:bg-muted-strong/90'
            : 'bg-fg-primary hover:bg-fg-primary/90',
        'text-sm font-medium text-fg-inverted',
        'transition-colors'
      )}
    >
      <Plus className="h-4 w-4" />
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}
