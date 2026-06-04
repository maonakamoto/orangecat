'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  History,
  TrendingUp,
  Users,
  Target,
  Clock,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { useSearchSuggestions } from '@/hooks/useSearchSuggestions';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/config/routes';
import { TRENDING_SEARCHES } from './useEnhancedSearch';

interface MobileSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileSearchModal({ isOpen, onClose }: MobileSearchModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const { suggestions, loading } = useSearchSuggestions(query, query.length > 1);

  // Load search history from localStorage
  useEffect(() => {
    if (user) {
      const history = localStorage.getItem(`search-history-${user.id}`);
      if (history) {
        setSearchHistory(JSON.parse(history).slice(0, 5));
      }
    }
  }, [user]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) {
      return;
    }

    // Save to search history
    if (user) {
      const newHistory = [searchQuery, ...searchHistory.filter(h => h !== searchQuery)].slice(0, 5);
      setSearchHistory(newHistory);
      localStorage.setItem(`search-history-${user.id}`, JSON.stringify(newHistory));
    }

    // Navigate to search results
    router.push(`/discover?q=${encodeURIComponent(searchQuery)}`);
    onClose();
    setQuery('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const clearHistory = () => {
    setSearchHistory([]);
    if (user) {
      localStorage.removeItem(`search-history-${user.id}`);
    }
  };

  const quickActions = [
    {
      icon: <Users className="w-5 h-5" />,
      label: 'Find People',
      action: () => {
        router.push(ROUTES.DISCOVER_TYPE('profiles'));
        onClose();
      },
    },
    {
      icon: <Target className="w-5 h-5" />,
      label: 'Browse Projects',
      action: () => {
        router.push(ROUTES.DISCOVER_TYPE('projects'));
        onClose();
      },
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      label: 'Trending',
      action: () => {
        router.push(ROUTES.DISCOVER_TRENDING);
        onClose();
      },
    },
  ];

  const trendingSearches = TRENDING_SEARCHES;

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <button
          onClick={onClose}
          aria-label="Close search"
          className="p-2 -ml-2 text-muted-foreground hover:text-foreground min-h-11 min-w-11 flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>

        <form onSubmit={handleSubmit} className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-dim" />
          <input
            type="text"
            placeholder="Search projects, people, organizations..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
            className="w-full pl-10 pr-4 py-3 text-base border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring bg-muted dark:text-foreground dark:placeholder:text-muted-foreground"
          />
        </form>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Quick Actions */}
        {query.length === 0 && (
          <div className="p-4 border-b border-border-subtle">
            <h4 className="text-sm font-medium text-muted-strong mb-3 uppercase tracking-wide">
              Quick Actions
            </h4>
            <div className="space-y-2">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  className="w-full flex items-center gap-4 px-4 py-3 text-left text-muted-strong hover:bg-muted rounded-lg transition-colors"
                >
                  <div className="text-foreground">{action.icon}</div>
                  <span className="text-base">{action.label}</span>
                  <ArrowUpRight className="w-4 h-4 ml-auto text-muted-dim" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search History */}
        {query.length === 0 && searchHistory.length > 0 && (
          <div className="p-4 border-b border-border-subtle">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-muted-strong uppercase tracking-wide flex items-center gap-2">
                <History className="w-4 h-4" />
                Recent Searches
              </h4>
              <button
                onClick={clearHistory}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            </div>
            <div className="space-y-2">
              {searchHistory.map((historyItem, index) => (
                <button
                  key={index}
                  onClick={() => handleSearch(historyItem)}
                  className="w-full flex items-center gap-4 px-4 py-3 text-left text-muted-strong hover:bg-muted rounded-lg transition-colors"
                >
                  <Clock className="w-4 h-4 text-muted-dim" />
                  <span className="text-base">{historyItem}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Trending Searches */}
        {query.length === 0 && (
          <div className="p-4 border-b border-border-subtle">
            <h4 className="text-sm font-medium text-muted-strong mb-3 uppercase tracking-wide flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Trending
            </h4>
            <div className="space-y-2">
              {trendingSearches.map((trending, index) => (
                <button
                  key={index}
                  onClick={() => handleSearch(trending)}
                  className="w-full flex items-center gap-4 px-4 py-3 text-left text-muted-strong hover:bg-muted rounded-lg transition-colors"
                >
                  <TrendingUp className="w-4 h-4 text-foreground" />
                  <span className="text-base">{trending}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Real-time Suggestions */}
        {query.length > 1 && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-muted-strong uppercase tracking-wide">
                Suggestions
              </h4>

              {loading && (
                <div className="w-4 h-4 border border-border-subtle border-t-foreground rounded-full animate-spin"></div>
              )}
            </div>

            {suggestions.length > 0 ? (
              <div className="space-y-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearch(suggestion)}
                    className="w-full flex items-center gap-4 px-4 py-3 text-left text-muted-strong hover:bg-muted rounded-lg transition-colors"
                  >
                    <Search className="w-4 h-4 text-muted-dim" />
                    <span className="text-base">{suggestion}</span>
                  </button>
                ))}
              </div>
            ) : (
              !loading && (
                <div className="text-muted-foreground px-4 py-3">No suggestions found</div>
              )
            )}

            {/* Search for exact query */}
            <div className="mt-4 pt-4 border-t border-border-subtle">
              <button
                onClick={() => handleSearch(query)}
                className="w-full flex items-center gap-4 px-4 py-3 text-foreground hover:bg-muted/40 rounded-lg transition-colors font-medium"
              >
                <Search className="w-4 h-4" />
                <span className="text-base">Search for "{query}"</span>
                <ArrowUpRight className="w-4 h-4 ml-auto" />
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {query.length === 0 && searchHistory.length === 0 && (
          <div className="p-8 text-center">
            <Search className="w-12 h-12 text-muted-dim dark:text-muted mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">Start typing to search</p>
            <p className="text-muted-dim mt-2">Find projects, people, and organizations</p>
          </div>
        )}
      </div>
    </div>
  );
}
