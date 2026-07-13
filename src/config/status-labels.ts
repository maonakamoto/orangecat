/**
 * STATUS_LABELS — single source of truth for entity-status human labels.
 *
 * The label for each status ("Draft", "Active", "Paused", …) was previously
 * hardcoded independently in status-config.ts, entity-status.ts, and
 * project-statuses.ts — so a rename ("Paused" → "On hold") meant editing three
 * files or they'd silently drift. Those files now derive their `label` from here
 * while keeping their own className / variant / color.
 *
 * Only the labels that were DUPLICATED across those files live here. Status-
 * specific one-offs (e.g. loan "Defaulted" / "Paid Off", product "Sold Out")
 * stay defined where they're used — they aren't a single-source-of-truth risk.
 */
export const STATUS_LABELS = {
  draft: 'Draft',
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
  cancelled: 'Cancelled',
  archived: 'Archived',
  published: 'Published',
  open: 'Open',
  closed: 'Closed',
  full: 'Full',
  funded: 'Funded',
  ongoing: 'Ongoing',
} as const;
