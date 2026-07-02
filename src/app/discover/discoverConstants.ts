import type { DiscoverTabType } from '@/components/discover/DiscoverTabs';

export const VALID_TAB_TYPES: DiscoverTabType[] = [
  'all',
  'projects',
  'profiles',
  'loans',
  'investments',
  'assets',
  'causes',
  'events',
  'products',
  'services',
  'groups',
  'wishlists',
  'research',
  'ai_assistants',
];

/** Which sidebar filter blocks apply per tab. */
export interface DiscoverTabFilterConfig {
  projectStatus: boolean;
  projectCategories: boolean;
}

// The status chips (active/paused/completed/cancelled) and category chips feed
// the project search only (useSearch); the per-entity tabs (loans, events,
// ai_assistants, …) ignore them entirely — so showing them there was noise.
const PROJECT_SEARCH_TABS = new Set<DiscoverTabType>(['all', 'projects']);

/** Config map: which filter blocks the sidebar shows for each tab (SSOT). */
export const DISCOVER_TAB_FILTERS: Record<DiscoverTabType, DiscoverTabFilterConfig> =
  Object.fromEntries(
    VALID_TAB_TYPES.map(tab => [
      tab,
      {
        projectStatus: PROJECT_SEARCH_TABS.has(tab),
        projectCategories: PROJECT_SEARCH_TABS.has(tab),
      },
    ])
  ) as Record<DiscoverTabType, DiscoverTabFilterConfig>;
