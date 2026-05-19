import { MessageSquare, FolderOpen, Settings, Brain, ShieldCheck, KeyRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type CatHubTab = 'chat' | 'context' | 'settings';

interface CatHubTabConfig {
  id: CatHubTab;
  label: string;
  description: string;
  icon: LucideIcon;
}

interface CatHubStatusItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const CAT_HUB_COPY = {
  title: 'Cat',
  eyebrow: 'AI economic agent',
  description: 'Plan, create, manage context, and approve actions from one focused workspace.',
  contextTitle: 'Context',
  contextDescription: 'Documents and facts your Cat can use for better answers.',
  settingsTitle: 'Controls',
  settingsDescription: 'Model, keys, and permissions for autonomous actions.',
} as const;

export const CAT_HUB_TABS: CatHubTabConfig[] = [
  {
    id: 'chat',
    label: 'Chat',
    description: 'Ask, plan, and create',
    icon: MessageSquare,
  },
  {
    id: 'context',
    label: 'Context',
    description: 'What Cat knows',
    icon: FolderOpen,
  },
  {
    id: 'settings',
    label: 'Controls',
    description: 'Keys and permissions',
    icon: Settings,
  },
];

export const CAT_HUB_STATUS_ITEMS: CatHubStatusItem[] = [
  {
    id: 'context',
    label: 'Context',
    icon: Brain,
  },
  {
    id: 'keys',
    label: 'Keys',
    icon: KeyRound,
  },
  {
    id: 'permissions',
    label: 'Permissions',
    icon: ShieldCheck,
  },
];

export function isCatHubTab(value: string | null): value is CatHubTab {
  return value === 'chat' || value === 'context' || value === 'settings';
}
