import { getSearchSuggestions } from '@/services/search';

export async function fetchSuggestions(
  searchQuery: string,
  setSuggestions: (s: string[]) => void
): Promise<void> {
  if (!searchQuery || searchQuery.length < 2) {
    setSuggestions([]);
    return;
  }
  try {
    const newSuggestions = await getSearchSuggestions(searchQuery, 5);
    setSuggestions(newSuggestions);
  } catch {
    setSuggestions([]);
  }
}
