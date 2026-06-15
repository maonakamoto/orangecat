import { Globe, Lock, Users, type LucideIcon } from 'lucide-react';
import type { TimelineVisibility } from '@/types/timeline';

export const TIMELINE_CONTENT_LIMITS = {
  post: 500,
  editPost: 5000,
  quote: 500,
  title: 120,
  titleTruncateAt: 117,
  warningAt: 400,
  dangerAt: 450,
} as const;

export const TIMELINE_COPY = {
  composePlaceholder: "What's happening?",
  communityPlaceholder: 'Share something with the community...',
  crossPostLabel: 'Cross-post to projects',
  postButton: 'Post',
  shareUpdateButton: 'Share Update',
  postingButton: 'Posting...',
  savingButton: 'Saving...',
  savedPost: 'Post shared',
  addImageUnavailable: 'Image upload is not available yet',
  loadingProjects: 'Loading projects',
} as const;

export type TimelineVisibilityOption = {
  key: TimelineVisibility;
  label: string;
  compactLabel: string;
  description: string;
  Icon: LucideIcon;
};

export const TIMELINE_VISIBILITY_OPTIONS = [
  {
    key: 'public',
    label: 'Public',
    compactLabel: 'Public',
    description: 'Visible to everyone',
    Icon: Globe,
  },
  {
    key: 'followers',
    label: 'Followers',
    compactLabel: 'Followers',
    description: 'Visible to people who follow you',
    Icon: Users,
  },
  {
    key: 'private',
    label: 'Only me',
    compactLabel: 'Private',
    description: 'Visible only to you',
    Icon: Lock,
  },
] as const satisfies readonly TimelineVisibilityOption[];

export function getTimelineVisibilityOption(
  visibility: TimelineVisibility
): TimelineVisibilityOption {
  return (
    TIMELINE_VISIBILITY_OPTIONS.find(option => option.key === visibility) ??
    TIMELINE_VISIBILITY_OPTIONS[0]
  );
}

export const TIMELINE_SURFACE = {
  page: 'min-h-screen bg-surface-page text-fg-primary',
  rail: 'mx-auto flex w-full max-w-6xl justify-center px-0 sm:px-4 lg:px-8',
  feed: 'w-full max-w-2xl border-x border-subtle bg-surface-page',
  header:
    'sticky top-0 z-20 flex items-center justify-between border-b border-subtle bg-surface-page/90 px-4 py-3 backdrop-blur-xl sm:px-5',
  composer: 'border-b border-subtle bg-surface-page px-4 py-4 sm:px-5',
  post: 'border-b border-subtle bg-surface-page px-4 py-3 transition-colors hover:bg-surface-raised/35',
  selectedPost: 'bg-surface-raised/60 hover:bg-surface-raised/70',
  buttonPrimary:
    'rounded-md bg-fg-primary px-5 py-2 text-sm font-semibold text-fg-inverted transition-colors hover:bg-fg-primary/90 disabled:bg-surface-raised disabled:text-fg-secondary',
  iconButton:
    'flex min-h-10 min-w-10 items-center justify-center rounded-md text-fg-secondary transition-colors hover:bg-surface-raised hover:text-fg-primary disabled:cursor-not-allowed disabled:opacity-50',
  chip: 'inline-flex items-center gap-1.5 rounded-md border border-subtle bg-surface-page px-2.5 py-1 text-xs font-medium text-fg-secondary transition-colors hover:border-default hover:text-fg-primary',
  chipActive:
    'border-fg-primary bg-fg-primary text-fg-inverted hover:border-fg-primary hover:text-fg-inverted',
  panel: 'rounded-md border border-subtle bg-surface-raised/25',
  menu: 'rounded-md border border-subtle bg-surface-modal shadow-sm',
} as const;
