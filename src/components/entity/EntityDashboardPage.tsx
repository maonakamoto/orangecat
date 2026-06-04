'use client';

import { useState, useMemo, useCallback, useEffect, ReactNode } from 'react';
import { useRequireAuth } from '@/hooks/useAuth';
import { useUserCurrency } from '@/hooks/useUserCurrency';
import Button from '@/components/ui/Button';
import { AlertCircle, Search, X } from 'lucide-react';
import Input from '@/components/ui/Input';
import Loading from '@/components/Loading';
import EntityListShell from '@/components/entity/EntityListShell';
import EntityList from '@/components/entity/EntityList';
import CommercePagination from '@/components/commerce/CommercePagination';
import BulkActionsBar from '@/components/entity/BulkActionsBar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEntityList } from '@/hooks/useEntityList';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import { useBulkDelete } from '@/hooks/useBulkDelete';
import { EntityConfig, BaseEntity } from '@/types/entity';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { API_ROUTES } from '@/config/api-routes';
import type { LucideIcon } from 'lucide-react';

/**
 * EntityDashboardPage — single SSOT shell for every "My X" dashboard route.
 *
 * Add features via props; never fork the file. If a real new shape appears
 * (e.g. lender-vs-borrower split for loans), surface it as a config option,
 * not as a sibling page.
 */

export interface EntityTabConfig {
  id: string;
  label: string;
  icon?: LucideIcon;
  /** Override the default apiEndpoint for this tab (e.g., favorites feed). */
  apiEndpoint?: string;
  /** Override the empty state shown when this tab has no items. */
  emptyState?: EntityConfig<BaseEntity>['emptyState'];
  /** Bulk select toolbar visibility (default true). */
  allowBulkSelect?: boolean;
  /** Hide the status filter on this tab (default false). */
  hideStatusFilter?: boolean;
  /** Hide the search input on this tab (default false). */
  hideSearch?: boolean;
}

export interface StatusFilterOption {
  value: string;
  label: string;
}

export interface StatusFilterConfig<T extends BaseEntity> {
  options: StatusFilterOption[];
  /** Default value (defaults to 'all'). */
  defaultValue?: string;
  /** Custom match — when omitted, item.status === value is used. */
  match?: (item: T, value: string) => boolean;
}

interface EntityDashboardPageProps<T extends BaseEntity> {
  config: EntityConfig<T>;
  title?: string;
  description?: string;
  loadingMessage?: string;
  createButtonLabel?: string;
  limit?: number;
  /** Optional content to render above the list (e.g., info banners). */
  headerContent?: ReactNode;
  /** Optional tabs. When provided, the first tab is the default feed. */
  tabs?: EntityTabConfig[];
  /**
   * Fields to match against the search input. Field values are coerced to
   * string with `String()` and arrays are searched element-wise.
   */
  searchableFields?: Array<keyof T>;
  searchPlaceholder?: string;
  statusFilter?: StatusFilterConfig<T>;
}

export default function EntityDashboardPage<T extends BaseEntity>({
  config,
  title,
  description,
  loadingMessage,
  createButtonLabel,
  limit = 12,
  headerContent,
  tabs,
  searchableFields,
  searchPlaceholder,
  statusFilter,
}: EntityDashboardPageProps<T>) {
  const { user, isLoading: authLoading, hydrated } = useRequireAuth();
  const userCurrency = useUserCurrency();
  const { selectedIds, toggleSelect, toggleSelectAll, clearSelection } = useBulkSelection();
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [changingStatusIds, setChangingStatusIds] = useState<Set<string>>(new Set());
  const [showSelection, setShowSelection] = useState(false);

  const firstTab = tabs?.[0];
  const secondTab = tabs?.[1];
  const [activeTabId, setActiveTabId] = useState<string>(firstTab?.id ?? '__default__');

  const activeTab = useMemo(() => tabs?.find(t => t.id === activeTabId), [tabs, activeTabId]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusValue, setStatusValue] = useState<string>(statusFilter?.defaultValue ?? 'all');

  // Primary feed (first tab, or default when there are no tabs).
  const primary = useEntityList<T>({
    apiEndpoint: firstTab?.apiEndpoint ?? config.apiEndpoint,
    userId: user?.id,
    limit,
    enabled: !!user?.id && hydrated && !authLoading && (!tabs || activeTabId === firstTab?.id),
  });

  // Secondary feed (second tab) — only enabled while that tab is active.
  const secondary = useEntityList<T>({
    apiEndpoint: secondTab?.apiEndpoint ?? config.apiEndpoint,
    userId: user?.id,
    limit,
    enabled: !!user?.id && hydrated && !authLoading && !!secondTab && activeTabId === secondTab.id,
  });

  const current = activeTabId === secondTab?.id ? secondary : primary;
  const items = current.items;
  const loading = current.loading;
  const error = current.error;
  const page = current.page;
  const total = current.total;
  const setPage = current.setPage;
  const refresh = current.refresh;

  const {
    isDeleting,
    bulkDeleteConfirm,
    setBulkDeleteConfirm,
    handleBulkDelete,
    executeBulkDelete,
  } = useBulkDelete({
    selectedIds,
    apiEndpoint: config.apiEndpoint,
    entityName: config.name,
    entityNamePlural: config.namePlural,
    clearSelection,
    refresh,
    onSuccess: () => setShowSelection(false),
  });

  // When the active tab changes, drop any in-progress selection — selections
  // don't carry between feeds and showing them on a different tab is confusing.
  useEffect(() => {
    clearSelection();
    setShowSelection(false);
  }, [activeTabId, clearSelection]);

  // Apply search + status filters client-side. Pagination still tracks the
  // full feed total — filtered views are intended to be paginated server-side
  // in the future via `queryParams` to useEntityList.
  const filteredItems = useMemo(() => {
    let list = items;
    const trimmed = searchQuery.trim().toLowerCase();
    if (trimmed && searchableFields && searchableFields.length > 0) {
      list = list.filter(item => {
        for (const field of searchableFields) {
          const value = item[field];
          if (value === null || value === undefined) {
            continue;
          }
          if (Array.isArray(value)) {
            if (value.some(v => typeof v === 'string' && v.toLowerCase().includes(trimmed))) {
              return true;
            }
          } else if (String(value).toLowerCase().includes(trimmed)) {
            return true;
          }
        }
        return false;
      });
    }
    if (statusFilter && statusValue !== 'all' && !activeTab?.hideStatusFilter) {
      const matcher =
        statusFilter.match ??
        ((it: T, v: string) => (it as unknown as { status?: string }).status === v);
      list = list.filter(item => matcher(item, statusValue));
    }
    return list;
  }, [items, searchQuery, searchableFields, statusFilter, statusValue, activeTab]);

  const handleStatusChange = useCallback(
    async (id: string, newStatus: string) => {
      if (!config.entityType) {
        return;
      }
      setChangingStatusIds(prev => new Set(prev).add(id));
      try {
        const response = await fetch(API_ROUTES.ENTITIES.STATUS(config.entityType, id), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to update ${config.name} status`);
        }
        await refresh();
        toast.success(`${config.name} status updated`);
      } catch (err) {
        logger.error(
          `Failed to update ${config.name} status`,
          { error: err, id },
          'EntityDashboardPage'
        );
        toast.error(`Failed to update ${config.name} status. Please try again.`);
      } finally {
        setChangingStatusIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [config.entityType, config.name, refresh]
  );

  const handleDeleteItem = useCallback(
    async (id: string) => {
      setDeletingIds(prev => new Set(prev).add(id));
      try {
        const response = await fetch(`${config.apiEndpoint}/${id}`, { method: 'DELETE' });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to delete ${config.name}`);
        }
        toast.success(`${config.name} deleted successfully`);
        await refresh();
      } catch (err) {
        logger.error(`Failed to delete ${config.name}`, { error: err, id }, 'EntityDashboardPage');
        toast.error(`Failed to delete ${config.name}. Please try again.`);
      } finally {
        setDeletingIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [config.apiEndpoint, config.name, refresh]
  );

  if (!hydrated || authLoading) {
    return (
      <Loading
        fullScreen
        message={loadingMessage || `Loading your ${config.namePlural.toLowerCase()}...`}
      />
    );
  }

  if (!user) {
    return null;
  }

  const allowBulkSelect = activeTab?.allowBulkSelect !== false;
  const showStatusFilter = !!statusFilter && !activeTab?.hideStatusFilter;
  const showSearch = !!searchableFields && searchableFields.length > 0 && !activeTab?.hideSearch;
  const emptyState = activeTab?.emptyState ?? config.emptyState;

  const headerActions = (
    <div className="flex items-center gap-2">
      {allowBulkSelect && filteredItems.length > 0 && (
        <Button onClick={() => setShowSelection(!showSelection)} variant="outline" size="sm">
          {showSelection ? 'Cancel' : 'Select'}
        </Button>
      )}
      <Button href={config.createPath} className="w-full sm:w-auto">
        {createButtonLabel || `Create ${config.name}`}
      </Button>
    </div>
  );

  const filterBar =
    showSearch || showStatusFilter ? (
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
        {showSearch && (
          <div className="relative flex-1 sm:flex-initial">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-dim w-4 h-4"
              aria-hidden="true"
            />
            <Input
              type="text"
              placeholder={searchPlaceholder || `Search ${config.namePlural.toLowerCase()}...`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 w-full sm:w-48 md:w-64"
              aria-label={`Search ${config.namePlural.toLowerCase()}`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-dim hover:text-foreground min-h-11 min-w-11 flex items-center justify-center"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
        {showStatusFilter && (
          <select
            value={statusValue}
            onChange={e => setStatusValue(e.target.value)}
            className="px-3 py-2 border border-border-strong rounded-lg text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring w-full sm:w-auto min-w-[140px]"
            aria-label="Filter by status"
          >
            {statusFilter!.options.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
      </div>
    ) : null;

  return (
    <>
      <EntityListShell
        title={title || config.namePlural}
        description={description}
        headerActions={headerActions}
      >
        {headerContent}

        {tabs && tabs.length > 0 ? (
          <Tabs value={activeTabId} onValueChange={setActiveTabId} className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <TabsList
                className="grid w-full sm:w-auto"
                style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
              >
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger key={tab.id} value={tab.id} className="gap-2">
                      {Icon && <Icon className="h-4 w-4" />}
                      <span>{tab.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              {filterBar}
            </div>
          </Tabs>
        ) : (
          filterBar && <div className="mb-4">{filterBar}</div>
        )}

        {error ? (
          <div className="oc-error-surface flex items-start gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Failed to load</p>
              <p className="mt-1 text-sm text-destructive/80">{error}</p>
              <Button variant="outline" size="sm" onClick={() => refresh()} className="mt-3">
                Try again
              </Button>
            </div>
          </div>
        ) : (
          <>
            {showSelection && filteredItems.length > 0 && allowBulkSelect && (
              <div className="oc-list-row mb-4 flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredItems.length && filteredItems.length > 0}
                    onChange={() => toggleSelectAll(filteredItems.map(item => item.id))}
                    className="h-4 w-4 rounded border-border-strong bg-card text-foreground focus:ring-ring"
                  />
                  <span>Select All</span>
                </label>
              </div>
            )}
            <EntityList
              items={filteredItems}
              isLoading={loading}
              makeHref={config.makeHref}
              makeCardProps={item => config.makeCardProps(item, userCurrency)}
              emptyState={emptyState}
              gridCols={config.gridCols}
              selectedIds={showSelection && allowBulkSelect ? selectedIds : undefined}
              onToggleSelect={showSelection && allowBulkSelect ? toggleSelect : undefined}
              showSelection={showSelection && allowBulkSelect}
              onDeleteItem={handleDeleteItem}
              deletingIds={deletingIds}
              onStatusChange={config.entityType ? handleStatusChange : undefined}
              changingStatusIds={changingStatusIds}
            />
            <CommercePagination page={page} limit={limit} total={total} onPageChange={setPage} />
          </>
        )}
      </EntityListShell>
      <BulkActionsBar
        selectedCount={selectedIds.size}
        onClearSelection={() => {
          clearSelection();
          setShowSelection(false);
        }}
        onDelete={handleBulkDelete}
        isDeleting={isDeleting}
      />
      <ConfirmDialog
        isOpen={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        onConfirm={executeBulkDelete}
        title={`Delete ${selectedIds.size} ${selectedIds.size === 1 ? config.name : config.namePlural}?`}
        description="This action cannot be undone."
        confirmLabel="Delete"
      />
    </>
  );
}
