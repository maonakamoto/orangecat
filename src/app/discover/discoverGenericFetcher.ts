import { logger } from '@/utils/logger';
import supabase from '@/lib/supabase/browser';
import { getTableName } from '@/config/entity-registry';
import { STATUS } from '@/config/database-constants';
import type { DiscoverTabType } from '@/components/discover/DiscoverTabs';
import type { GenericPublicEntity } from '@/components/entity/variants/GenericPublicCard';

type Setter<T> = (v: T) => void;

interface GenericSetters {
  setGenericLoading: Setter<boolean>;
  setCauses: Setter<GenericPublicEntity[]>;
  setEvents: Setter<GenericPublicEntity[]>;
  setProducts: Setter<GenericPublicEntity[]>;
  setServices: Setter<GenericPublicEntity[]>;
  setGroups: Setter<GenericPublicEntity[]>;
  setWishlists: Setter<GenericPublicEntity[]>;
  setResearch: Setter<GenericPublicEntity[]>;
  setAiAssistants: Setter<GenericPublicEntity[]>;
}

type GroupRow = {
  id: string;
  name: string;
  description?: string | null;
  created_at: string;
  slug?: string | null;
};

type ResearchRow = {
  id: string;
  title: string;
  description?: string | null;
  status?: string | null;
  field?: string | null;
  created_at: string;
};

export async function fetchDiscoverGenericData(
  activeTab: DiscoverTabType,
  searchTerm: string,
  setters: GenericSetters
) {
  const {
    setGenericLoading,
    setCauses,
    setEvents,
    setProducts,
    setServices,
    setGroups,
    setWishlists,
    setResearch,
    setAiAssistants,
  } = setters;

  const limit = 50;
  const escaped = searchTerm ? searchTerm.replace(/[%_]/g, '\\$&') : null;
  const should = (tab: DiscoverTabType) => activeTab === 'all' || activeTab === tab;

  const buildQuery = <T>(
    base: ReturnType<ReturnType<typeof supabase.from>['select']>,
    tab: DiscoverTabType,
    tabLimit: number,
    searchFields = 'title,description'
  ) => {
    let q = base
      .order('created_at', { ascending: false })
      .limit(activeTab === tab ? limit : tabLimit);
    if (escaped) {
      q = q.or(
        searchFields
          .split(',')
          .map(f => `${f}.ilike.%${escaped}%`)
          .join(',')
      );
    }
    return q as unknown as Promise<{ data: T[] | null; error: unknown }>;
  };

  setGenericLoading(true);
  try {
    const [
      causesRes,
      eventsRes,
      productsRes,
      servicesRes,
      groupsRes,
      wishlistsRes,
      researchRes,
      aiRes,
    ] = await Promise.all([
      should('causes')
        ? buildQuery(
            supabase
              .from(getTableName('cause'))
              .select('id, title, description, status, cause_category, created_at')
              .eq('status', 'active'),
            'causes',
            8
          )
        : Promise.resolve({ data: null, error: null }),

      should('events')
        ? buildQuery(
            supabase
              .from(getTableName('event'))
              .select('id, title, description, status, category, created_at')
              .in('status', [STATUS.EVENTS.PUBLISHED, STATUS.EVENTS.OPEN, STATUS.EVENTS.ONGOING]),
            'events',
            8
          )
        : Promise.resolve({ data: null, error: null }),

      should('products')
        ? buildQuery(
            supabase
              .from(getTableName('product'))
              .select('id, title, description, status, category, created_at')
              .eq('status', 'active'),
            'products',
            8
          )
        : Promise.resolve({ data: null, error: null }),

      should('services')
        ? buildQuery(
            supabase
              .from(getTableName('service'))
              .select('id, title, description, status, category, created_at')
              .eq('status', 'active'),
            'services',
            8
          )
        : Promise.resolve({ data: null, error: null }),

      should('groups')
        ? buildQuery(
            supabase
              .from(getTableName('group'))
              .select('id, name, description, is_public, created_at, slug')
              .eq('is_public', true),
            'groups',
            8,
            'name,description'
          )
        : Promise.resolve({ data: null, error: null }),

      should('wishlists')
        ? buildQuery(
            supabase
              .from(getTableName('wishlist'))
              .select('id, title, description, type, created_at')
              .eq('visibility', 'public')
              .eq('is_active', true),
            'wishlists',
            8
          )
        : Promise.resolve({ data: null, error: null }),

      should('research')
        ? buildQuery(
            supabase
              .from(getTableName('research'))
              .select('id, title, description, status, field, created_at')
              .eq('is_public', true)
              .eq('status', 'active'),
            'research',
            8
          )
        : Promise.resolve({ data: null, error: null }),

      should('ai_assistants')
        ? buildQuery(
            supabase
              .from(getTableName('ai_assistant'))
              .select('id, title, description, status, category, created_at')
              .eq('is_public', true)
              .eq('status', 'active'),
            'ai_assistants',
            8
          )
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (should('causes')) {
      setCauses((causesRes.data ?? []) as unknown as GenericPublicEntity[]);
    }
    if (should('events')) {
      setEvents((eventsRes.data ?? []) as unknown as GenericPublicEntity[]);
    }
    if (should('products')) {
      setProducts((productsRes.data ?? []) as unknown as GenericPublicEntity[]);
    }
    if (should('services')) {
      setServices((servicesRes.data ?? []) as unknown as GenericPublicEntity[]);
    }
    if (should('groups')) {
      setGroups(
        ((groupsRes.data ?? []) as unknown as GroupRow[]).map(
          r =>
            ({
              id: r.id,
              title: r.name,
              description: r.description ?? null,
              created_at: r.created_at,
              slug: r.slug ?? null,
            }) satisfies GenericPublicEntity
        )
      );
    }
    if (should('wishlists')) {
      setWishlists((wishlistsRes.data ?? []) as unknown as GenericPublicEntity[]);
    }
    if (should('research')) {
      setResearch(
        ((researchRes.data ?? []) as unknown as ResearchRow[]).map(
          r =>
            ({
              id: r.id,
              title: r.title,
              description: r.description ?? null,
              status: r.status ?? null,
              category: r.field ?? null,
              created_at: r.created_at,
            }) satisfies GenericPublicEntity
        )
      );
    }
    if (should('ai_assistants')) {
      setAiAssistants((aiRes.data ?? []) as unknown as GenericPublicEntity[]);
    }
  } catch (error) {
    logger.error('Error fetching discover entities', error, 'Discover');
  } finally {
    setGenericLoading(false);
  }
}
