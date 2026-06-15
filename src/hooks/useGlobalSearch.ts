import { useEffect, useRef, useState } from 'react';
import { getGlobalSearchResults, type GlobalSearchHit } from '@/services/search';

interface UseGlobalSearchResult {
  results: GlobalSearchHit[];
  loading: boolean;
}

/**
 * Debounced, ranked, cross-entity search for instant-jump surfaces (⌘K palette).
 * Backed by the global_search RPC (typo-tolerant, accent-insensitive). A
 * monotonic request id ensures a slow earlier query can't overwrite a newer one.
 */
export function useGlobalSearch(
  query: string,
  enabled: boolean = true,
  limit: number = 8,
  debounceMs: number = 250
): UseGlobalSearchResult {
  const [results, setResults] = useState<GlobalSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!enabled || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const hits = await getGlobalSearchResults(query, limit);
        if (requestId === requestIdRef.current) {
          setResults(hits);
        }
      } catch {
        if (requestId === requestIdRef.current) {
          setResults([]);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, enabled, limit, debounceMs]);

  return { results, loading };
}
