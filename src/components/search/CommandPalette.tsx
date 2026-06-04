'use client';

/**
 * Command palette — Linear/Vercel/Stripe-style ⌘K overlay.
 *
 * Replaces the inline dropdown that EnhancedSearchBar used to render
 * for desktop. Mobile keeps a full-width form below md.
 *
 * Open triggers:
 *   - Click any palette trigger (header search button or mobile search icon)
 *   - Keyboard: ⌘K (Mac) / Ctrl+K (Win/Linux), from anywhere in the app
 *   - "/" while focus isn't already in an input (Slack-style)
 *
 * Inside the palette:
 *   - cmdk handles arrow-key nav + Enter + Esc natively
 *   - Type to filter — the empty state shows quick actions + suggestions
 *   - Once query is non-empty, async suggestions stream in via
 *     useSearchSuggestions; quick actions filter client-side
 *
 * Created: 2026-06-03
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  ArrowRight,
  Bookmark,
  Briefcase,
  Building2,
  Calendar,
  Compass,
  HandHeart,
  Heart,
  Home,
  Lightbulb,
  Mail,
  MessageCircle,
  Package,
  PiggyBank,
  Search,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { ROUTES } from '@/config/routes';
import { useSearchSuggestions } from '@/hooks/useSearchSuggestions';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PaletteItem {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  keywords?: string;
  run: () => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const { suggestions, loading: suggestionsLoading } = useSearchSuggestions(
    query,
    open && query.trim().length > 1
  );

  // Reset query on close so the next ⌘K opens fresh.
  useEffect(() => {
    if (!open) {
      setQuery('');
    }
  }, [open]);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const navigateTo = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router]
  );

  const submitFullSearch = useCallback(
    (term: string) => {
      const trimmed = term.trim();
      if (!trimmed) {
        return;
      }
      close();
      router.push(`${ROUTES.DISCOVER}?q=${encodeURIComponent(trimmed)}`);
    },
    [close, router]
  );

  const quickActions: PaletteItem[] = useMemo(
    () => [
      {
        id: 'create-product',
        label: 'Create a product',
        hint: 'Physical or digital goods',
        icon: Package,
        keywords: 'sell store shop merchandise digital',
        run: () => navigateTo(ROUTES.DASHBOARD.STORE_CREATE),
      },
      {
        id: 'create-service',
        label: 'Create a service',
        hint: 'Offer your time or expertise',
        icon: Briefcase,
        keywords: 'consulting freelance hourly',
        run: () => navigateTo(ROUTES.DASHBOARD.SERVICES_CREATE),
      },
      {
        id: 'create-project',
        label: 'Create a project',
        hint: 'Raise funds with milestones',
        icon: Lightbulb,
        keywords: 'fundraise campaign goal',
        run: () => navigateTo(ROUTES.DASHBOARD.PROJECTS_CREATE),
      },
      {
        id: 'create-cause',
        label: 'Create a cause',
        hint: 'No-strings charitable funding',
        icon: HandHeart,
        keywords: 'donate charity nonprofit',
        run: () => navigateTo(ROUTES.DASHBOARD.CAUSES_CREATE),
      },
      {
        id: 'create-event',
        label: 'Create an event',
        hint: 'Workshops, meetups, hackathons',
        icon: Calendar,
        keywords: 'meetup workshop conference rsvp',
        run: () => navigateTo(ROUTES.DASHBOARD.EVENTS_CREATE),
      },
      {
        id: 'create-group',
        label: 'Create a group',
        hint: 'Organization, collective, or DAO',
        icon: Building2,
        keywords: 'organization team collective dao company',
        run: () => navigateTo(ROUTES.DASHBOARD.GROUPS_CREATE),
      },
      {
        id: 'create-loan',
        label: 'Create a loan request',
        hint: 'Borrow with repayment terms',
        icon: PiggyBank,
        keywords: 'borrow credit interest',
        run: () => navigateTo(ROUTES.DASHBOARD.LOANS_CREATE),
      },
      {
        id: 'create-investment',
        label: 'Create an investment offer',
        hint: 'Raise equity / revenue share',
        icon: TrendingUp,
        keywords: 'equity revenue share raise capital',
        run: () => navigateTo(ROUTES.DASHBOARD.INVESTMENTS_CREATE),
      },
      {
        id: 'create-wishlist',
        label: 'Create a wishlist',
        hint: 'Gift registry',
        icon: Heart,
        keywords: 'gift registry wishlist',
        run: () => navigateTo(ROUTES.DASHBOARD.WISHLISTS),
      },
      {
        id: 'create-asset',
        label: 'Create an asset listing',
        hint: 'Property, equipment, rentals',
        icon: Bookmark,
        keywords: 'rental property equipment',
        run: () => navigateTo(ROUTES.DASHBOARD.ASSETS_CREATE),
      },
    ],
    [navigateTo]
  );

  const pages: PaletteItem[] = useMemo(
    () => [
      {
        id: 'go-cat',
        label: 'My Cat',
        hint: 'Your AI economic agent',
        icon: Sparkles,
        keywords: 'ai agent chat assistant',
        run: () => navigateTo(ROUTES.DASHBOARD.CAT),
      },
      {
        id: 'go-dashboard',
        label: 'Dashboard',
        icon: Home,
        run: () => navigateTo(ROUTES.DASHBOARD.HOME),
      },
      {
        id: 'go-discover',
        label: 'Discover',
        hint: 'Browse everyone',
        icon: Compass,
        keywords: 'explore browse',
        run: () => navigateTo(ROUTES.DISCOVER),
      },
      {
        id: 'go-timeline',
        label: 'Timeline',
        icon: TrendingUp,
        keywords: 'feed updates',
        run: () => navigateTo(ROUTES.TIMELINE),
      },
      {
        id: 'go-messages',
        label: 'Messages',
        icon: MessageCircle,
        run: () => navigateTo(ROUTES.MESSAGES),
      },
      {
        id: 'go-people',
        label: 'People',
        hint: 'Discover users',
        icon: Users,
        keywords: 'profiles users',
        run: () => navigateTo(ROUTES.DASHBOARD.PEOPLE),
      },
      {
        id: 'go-wallets',
        label: 'Wallets',
        icon: Wallet,
        keywords: 'bitcoin lightning balance',
        run: () => navigateTo(ROUTES.DASHBOARD.WALLETS),
      },
      {
        id: 'go-integrations',
        label: 'Integration keys',
        hint: 'API keys for FleetCrown, hirn.li, …',
        icon: Mail,
        keywords: 'api token settings developers',
        run: () => navigateTo(ROUTES.SETTINGS_INTEGRATIONS),
      },
    ],
    [navigateTo]
  );

  if (!open) {
    return null;
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Command palette"
      className={cn(
        'fixed left-1/2 top-[15vh] z-[100] w-[min(640px,calc(100vw-2rem))]',
        '-translate-x-1/2 overflow-hidden rounded-xl',
        'border border-border-subtle bg-background shadow-2xl'
      )}
      overlayClassName="fixed inset-0 z-[99] bg-black/60 backdrop-blur-sm"
    >
      {/* Radix Dialog (underneath cmdk's Command.Dialog) requires a Title
          for screen readers — the `label` prop alone isn't enough and
          logs a runtime error in dev. Visually hide it; cmdk renders the
          Search input below as the user-facing focus. */}
      <VisuallyHidden.Root>
        <DialogPrimitive.Title>Command palette</DialogPrimitive.Title>
      </VisuallyHidden.Root>
      <div className="flex items-center border-b border-border-subtle px-3.5">
        <Search className="h-4 w-4 flex-shrink-0 text-muted-dim" aria-hidden />
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder="Search or jump to…"
          className="w-full bg-transparent px-3 py-3.5 text-sm text-foreground placeholder:text-muted-dim focus:outline-none"
          onKeyDown={e => {
            // Cmd/Ctrl+Enter does a full search rather than picking the
            // focused item. Plain Enter on no-match also falls through.
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submitFullSearch(query);
            }
          }}
        />
        <kbd className="hidden flex-shrink-0 rounded border border-border-subtle bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
          ESC
        </kbd>
      </div>

      <Command.List className="max-h-[60vh] overflow-y-auto p-2">
        <Command.Empty className="px-3 py-8 text-center text-sm text-muted-foreground">
          No matches. Press{' '}
          <kbd className="rounded border border-border-subtle bg-muted/40 px-1.5 py-0.5 text-[10px]">
            ⌘ Enter
          </kbd>{' '}
          to search Discover.
        </Command.Empty>

        {query.trim().length > 0 && (
          <Command.Group
            heading="Search"
            className="text-[10px] uppercase tracking-wider text-muted-dim"
          >
            <PaletteRow
              icon={Search}
              label={`Search Discover for "${query.trim()}"`}
              hint="Press Enter"
              onSelect={() => submitFullSearch(query)}
              value={`search-discover-${query}`}
            />
          </Command.Group>
        )}

        <Command.Group
          heading="Jump to"
          className="mt-1 text-[10px] uppercase tracking-wider text-muted-dim"
        >
          {pages.map(item => (
            <PaletteRow
              key={item.id}
              value={`${item.id} ${item.label} ${item.keywords ?? ''}`}
              icon={item.icon}
              label={item.label}
              hint={item.hint}
              onSelect={item.run}
            />
          ))}
        </Command.Group>

        <Command.Group
          heading="Create"
          className="mt-1 text-[10px] uppercase tracking-wider text-muted-dim"
        >
          {quickActions.map(item => (
            <PaletteRow
              key={item.id}
              value={`${item.id} ${item.label} ${item.keywords ?? ''}`}
              icon={item.icon}
              label={item.label}
              hint={item.hint}
              onSelect={item.run}
            />
          ))}
        </Command.Group>

        {query.trim().length > 1 && suggestions.length > 0 && (
          <Command.Group
            heading="Suggestions"
            className="mt-1 text-[10px] uppercase tracking-wider text-muted-dim"
          >
            {suggestions.map(suggestion => (
              <PaletteRow
                key={`suggestion-${suggestion}`}
                value={`suggestion-${suggestion}`}
                icon={Search}
                label={suggestion}
                onSelect={() => submitFullSearch(suggestion)}
              />
            ))}
          </Command.Group>
        )}

        {suggestionsLoading && <div className="px-3 py-2 text-xs text-muted-dim">Searching…</div>}
      </Command.List>
    </Command.Dialog>
  );
}

interface PaletteRowProps {
  value: string;
  icon: LucideIcon;
  label: string;
  hint?: string;
  onSelect: () => void;
}

function PaletteRow({ value, icon: Icon, label, hint, onSelect }: PaletteRowProps) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-sm',
        'aria-selected:bg-muted/60 aria-selected:text-foreground',
        'text-muted-foreground transition-colors'
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="text-foreground">{label}</span>
      {hint && <span className="text-xs text-muted-dim">{hint}</span>}
      <ArrowRight className="ml-auto h-3.5 w-3.5 flex-shrink-0 opacity-0 group-aria-selected:opacity-100" />
    </Command.Item>
  );
}
