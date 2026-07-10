export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/**
 * Resolve a `{ page, pageSize }` request into a Supabase `.range(from, to)`
 * window, clamping the page size to [1, MAX_PAGE_SIZE]. Single source of truth
 * for pagination math so query functions don't each re-derive the offset.
 */
export function paginationRange(pagination?: { page?: number; pageSize?: number }): {
  from: number;
  to: number;
} {
  const pageSize = Math.min(pagination?.pageSize || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const page = pagination?.page || 1;
  const offset = (page - 1) * pageSize;
  return { from: offset, to: offset + pageSize - 1 };
}
