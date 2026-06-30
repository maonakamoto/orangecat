import { notFound, redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { getOrCreateUserActor } from '@/services/actors/getOrCreateUserActor';
import EntityDetailLayout from '@/components/entity/EntityDetailLayout';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { getTableName, getEntityMetadata, type EntityType } from '@/config/entity-registry';
import type { EntityConfig, BaseEntity } from '@/types/entity';
import { PLATFORM_DEFAULT_CURRENCY, isSupportedCurrency } from '@/config/currencies';
import { DATABASE_TABLES } from '@/config/database-tables';
import type { Currency } from '@/types/settings';
import type { ReactNode } from 'react';
import { capitalize, capitalizeWords } from '@/utils/string';

export interface DetailField {
  label: string;
  value: string | ReactNode;
}

interface EntityDetailPageProps<T extends BaseEntity> {
  config: EntityConfig<T>;
  entityId: string;
  userId?: string; // If provided, only show entities owned by this user
  requireAuth?: boolean; // If true, redirect to auth if not logged in
  redirectPath?: string; // Where to redirect if auth required but not logged in
  makeDetailFields?: (
    entity: T,
    userCurrency?: string
  ) => {
    left?: DetailField[];
    right?: DetailField[];
  };
}

function formatFieldValue(value: unknown, fieldName: string): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '—';
    }
    return value.join(', ');
  }

  if (fieldName.includes('_at') || fieldName.includes('date') || fieldName.includes('Date')) {
    try {
      const date = new Date(value as string | number | Date);
      if (!isNaN(date.getTime())) {
        return date.toLocaleString();
      }
    } catch {
      // Not a valid date, continue
    }
  }

  if (
    fieldName.includes('price') ||
    fieldName.includes('amount') ||
    fieldName.includes('rate') ||
    fieldName.includes('goal')
  ) {
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  return String(value);
}

function makeDefaultDetailFields<T extends BaseEntity>(
  entity: T
): {
  left: DetailField[];
  right: DetailField[];
} {
  const left: DetailField[] = [];
  const right: DetailField[] = [];

  const leftFields = [
    'status',
    'category',
    'type',
    'product_type',
    'service_location_type',
    'pricing',
    'price',
    'inventory_count',
    'fulfillment_type',
    'duration_minutes',
  ];

  if (entity.status) {
    left.push({
      label: 'Status',
      value: capitalize(String(entity.status)),
    });
  }

  Object.entries(entity).forEach(([key, value]) => {
    if (
      [
        'id',
        'user_id',
        'actor_id',
        'title',
        'description',
        'thumbnail_url',
        'created_at',
        'updated_at',
      ].includes(key)
    ) {
      return;
    }

    if (value === null || value === undefined) {
      return;
    }

    const label = capitalizeWords(key.replace(/([A-Z])/g, ' $1'));

    const formattedValue = formatFieldValue(value, key);

    if (leftFields.some(field => key.includes(field))) {
      left.push({ label, value: formattedValue });
    }
  });

  // Intentionally NO created_at/updated_at: raw timestamps are noise on a detail
  // page — they answer no question a viewer (or the owner) actually has.
  return { left, right };
}

export default async function EntityDetailPage<T extends BaseEntity>({
  config,
  entityId,
  userId,
  requireAuth = true,
  redirectPath,
  makeDetailFields,
}: EntityDetailPageProps<T>) {
  const supabase = await createServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;

  if (requireAuth && !user) {
    redirect(redirectPath || '/auth?mode=login');
  }

  let userCurrency: Currency = PLATFORM_DEFAULT_CURRENCY;
  if (user) {
    const { data: profile } = await (supabase.from(DATABASE_TABLES.PROFILES) as any)
      .select('currency')
      .eq('id', user.id)
      .single();

    if (profile?.currency && isSupportedCurrency(profile.currency)) {
      userCurrency = profile.currency as Currency;
    }
  }

  if (!config.entityType) {
    throw new Error(`EntityDetailPage requires config.entityType for ${config.name}`);
  }
  const entityType = config.entityType as EntityType;
  const tableName = getTableName(entityType);

  let actorId: string | null = null;
  if (user) {
    const actor = await getOrCreateUserActor(user.id);
    actorId = actor.id;
  }

  let query = (supabase.from(tableName) as any).select('*').eq('id', entityId);

  // Filter by actor_id to enforce ownership (actor_id is NOT NULL on all entity tables)
  if (userId || (actorId && requireAuth)) {
    // userId prop is a legacy auth.users UUID; resolve it to actor_id if provided
    const filterActorId = userId ? (await getOrCreateUserActor(userId)).id : actorId!;
    query = query.eq('actor_id', filterActorId);
  }

  const { data: entity, error } = await query.single();

  if (error || !entity) {
    notFound();
  }

  if ('is_public' in entity && !entity.is_public && actorId && entity.actor_id !== actorId) {
    notFound();
  }

  const rawFields = makeDetailFields
    ? makeDetailFields(entity as T, userCurrency)
    : makeDefaultDetailFields(entity as T);
  const fields = {
    left: rawFields.left ?? [],
    right: rawFields.right ?? [],
  };

  // The owner's listing as buyers see it is the source of truth — give them a
  // direct path to it (and to editing). No raw timestamps.
  const publicHref = `${getEntityMetadata(entityType).publicBasePath}/${entityId}`;
  const headerActions = (
    <div className="flex items-center gap-2">
      <Link href={publicHref}>
        <Button variant="outline">View public page</Button>
      </Link>
      <Link href={config.editPath(entityId)}>
        <Button>Edit</Button>
      </Link>
    </div>
  );

  // Breadcrumb ends at the entity type — the page title is already the h1, so
  // repeating it as the last crumb just doubles the heading.
  const breadcrumbItems = [{ label: config.namePlural, href: config.listPath }];

  return (
    <EntityDetailLayout
      title={entity.title || 'Untitled'}
      subtitle={entity.description || undefined}
      headerActions={headerActions}
      breadcrumbItems={breadcrumbItems}
      left={
        <div className="space-y-4">
          {(fields.left ?? []).length > 0 ? (
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              {(fields.left ?? []).map((field, idx) => (
                <div key={idx}>
                  <div className="text-fg-secondary">{field.label}</div>
                  <div className="font-medium mt-1">{field.value}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-fg-secondary text-sm">No additional details available.</div>
          )}
        </div>
      }
      right={
        (fields.right ?? []).length > 0 ? (
          <div className="space-y-3 text-sm">
            {(fields.right ?? []).map((field, idx) => (
              <div key={idx}>
                <div className="text-fg-secondary">{field.label}</div>
                <div className="font-medium mt-1">{field.value}</div>
              </div>
            ))}
          </div>
        ) : undefined
      }
    />
  );
}
