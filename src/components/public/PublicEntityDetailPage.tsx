/**
 * Generic Public Entity Detail Page
 *
 * Renders any entity's public detail page using ENTITY_REGISTRY metadata.
 * Eliminates 95%+ duplication across products/[id], services/[id], causes/[id], events/[id].
 *
 * Each entity page becomes a thin wrapper that passes entityType + optional custom sections.
 */

import { notFound } from 'next/navigation';
import { Tag } from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';
import { getTableName, getEntityMetadata, type EntityType } from '@/config/entity-registry';
import { STATUS } from '@/config/database-constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { generateEntityJsonLd, JsonLdScript } from '@/lib/seo/structured-data';
import EntityShare from '@/components/sharing/EntityShare';
import PublicEntityOwnerCard from '@/components/public/PublicEntityOwnerCard';
import PublicEntityTimestamps from '@/components/public/PublicEntityTimestamps';
import { PublicEntityPaymentSection } from '@/components/payment';
import { fetchEntityOwner } from '@/lib/entities/fetchEntityOwner';
import { ROUTES } from '@/config/routes';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import type { ReactNode } from 'react';

// Color theme → semantic class mapping. The four colorTheme values in
// ENTITY_REGISTRY now all resolve to the same neutral chrome — the
// rebrand commits to monochromatic surfaces, status colors only for
// actual status. Anything that wants a chromatic accent should opt in
// via renderHeaderIcon, not the global icon-box theme.
const NEUTRAL_THEME = { bg: 'bg-muted', icon: 'text-foreground', text: 'text-foreground' };

const THEME_CLASSES: Record<string, { bg: string; icon: string; text: string }> = {
  tiffany: NEUTRAL_THEME,
  rose: NEUTRAL_THEME,
  orange: NEUTRAL_THEME,
  green: NEUTRAL_THEME,
};

const PAGE_SURFACE_CLASSES: Record<string, string> = {
  tiffany: 'bg-background',
  rose: 'bg-background',
  orange: 'bg-background',
  green: 'bg-background',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EntityData = Record<string, any>;

export interface EntityDetailConfig {
  entityType: EntityType;
  /** Label for the owner card (e.g., "Seller", "Provider", "Organizer") */
  ownerLabel?: string;
  /** Label for the timestamps card (e.g., "Listed") */
  createdLabel?: string;
  /** Description card title (e.g., "About this Service") */
  descriptionTitle?: string;
  /** Back link text override */
  backText?: string;
  /** Back link href override */
  backHref?: string;
  /** Extra JSON-LD properties derived from entity data */
  getJsonLdExtra?: (entity: EntityData) => Record<string, unknown>;
  /** Override the themed icon box in the header (e.g., a cover image) */
  renderHeaderIcon?: (entity: EntityData) => ReactNode;
  /** Header badges/extra info (e.g., date for events, category for products) */
  renderHeaderExtra?: (entity: EntityData) => ReactNode;
  /** Entity-specific detail cards below description */
  renderDetails?: (entity: EntityData) => ReactNode;
  /** Extra sidebar cards rendered after EntityShare (e.g., Quick Stats, CTAs) */
  renderSidebarExtra?: (entity: EntityData) => ReactNode;
  /** Select columns for metadata query (defaults to 'title, description, price_btc') */
  metadataSelect?: string;
  /** View route for sign-in redirect */
  getViewRoute?: (id: string) => string;
  /** Override default visibility filter. Defaults to `status = active`. */
  visibilityFilter?: { column: string; value: string | boolean };
  /** Whether to show the payment section in the sidebar (default: true) */
  showPaymentSection?: boolean;
  /**
   * Mobile-only sticky bottom CTA. On <md the page renders a fixed
   * bottom bar so the primary visitor action is one tap from any scroll
   * position. When omitted: defaults to a "Support" button anchored to
   * the payment section (suppressed when showPaymentSection is false).
   * Pass an entity-aware getter for actions that depend on entity data
   * (e.g. loans → /auth?from=/loans/:id). Returning null suppresses
   * the bar entirely.
   */
  mobileStickyCTA?:
    | { label: string; href: string }
    | ((entity: EntityData) => { label: string; href: string } | null)
    | null;
}

/**
 * Fetch entity data for metadata generation
 */
export async function fetchEntityForMetadata(
  entityType: EntityType,
  id: string,
  select?: string,
  visibilityFilter?: { column: string; value: string | boolean }
) {
  const supabase = await createServerClient();
  const filterCol = visibilityFilter?.column ?? 'status';
  const filterVal = visibilityFilter?.value ?? STATUS.PRODUCTS.ACTIVE;
  const { data } = await supabase
    .from(getTableName(entityType))
    .select(select || 'title, description, price_btc')
    .eq('id', id)
    .eq(filterCol, filterVal)
    .single();
  return data as EntityData | null;
}

/**
 * Main generic entity detail page component
 */
export default async function PublicEntityDetailPage({
  id,
  config,
}: {
  id: string;
  config: EntityDetailConfig;
}) {
  const meta = getEntityMetadata(config.entityType);
  const theme = THEME_CLASSES[meta.colorTheme] || THEME_CLASSES.tiffany;
  const pageSurface = PAGE_SURFACE_CLASSES[meta.colorTheme] || PAGE_SURFACE_CLASSES.tiffany;
  const Icon = meta.icon;

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from(getTableName(config.entityType))
    .select('*')
    .eq('id', id)
    .eq(
      config.visibilityFilter?.column ?? 'status',
      config.visibilityFilter?.value ?? STATUS.PRODUCTS.ACTIVE
    )
    .single();

  const entity = data as EntityData | null;
  if (error || !entity) {
    notFound();
  }

  const owner = await fetchEntityOwner(supabase, entity);

  const jsonLd = generateEntityJsonLd({
    type: config.entityType,
    id,
    title: entity.title,
    description: entity.description,
    extra: config.getJsonLdExtra?.(entity) || {},
  });

  const viewRoute = config.getViewRoute ? config.getViewRoute(id) : `${meta.publicBasePath}/${id}`;

  return (
    <>
      <JsonLdScript data={jsonLd} />
      <div className={`min-h-screen pb-36 md:pb-0 ${pageSurface}`}>
        <div className="bg-card border-b border-border">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Breadcrumb
              items={[
                { label: meta.namePlural, href: meta.publicBasePath || ROUTES.DISCOVER },
                { label: entity.title },
              ]}
              className="mb-4"
            />
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {config.renderHeaderIcon?.(entity) ?? (
                  <div
                    className={`w-16 h-16 ${theme.bg} rounded-lg flex items-center justify-center`}
                  >
                    <Icon className={`w-8 h-8 ${theme.icon}`} />
                  </div>
                )}
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{entity.title}</h1>
                  <div className="flex items-center gap-3 mt-2">
                    {entity.status && (
                      <Badge variant="default" className="capitalize">
                        {entity.status}
                      </Badge>
                    )}
                    {entity.category && (
                      <Badge variant="secondary">
                        <Tag className="w-3 h-3 mr-1" />
                        {entity.category}
                      </Badge>
                    )}
                    {config.renderHeaderExtra?.(entity)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {entity.description && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {config.descriptionTitle || 'Description'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-strong whitespace-pre-wrap">{entity.description}</p>
                  </CardContent>
                </Card>
              )}

              {config.renderDetails?.(entity)}
            </div>

            <div className="space-y-6">
              {owner && (
                <PublicEntityOwnerCard owner={owner} label={config.ownerLabel || 'Owner'} />
              )}

              <EntityShare
                entityType={config.entityType}
                entityId={id}
                title={entity.title}
                description={entity.description}
              />

              {config.renderSidebarExtra?.(entity)}

              {config.showPaymentSection !== false && (
                <div id="pay">
                  <PublicEntityPaymentSection
                    entityType={config.entityType}
                    entityId={id}
                    entityTitle={entity.title}
                    priceBtc={entity.price_btc ? Number(entity.price_btc) : undefined}
                    sellerProfileId={owner?.id ?? null}
                    sellerUserId={owner?.user_id ?? null}
                    signInRedirect={viewRoute}
                  />
                </div>
              )}

              <PublicEntityTimestamps
                createdAt={entity.created_at}
                updatedAt={entity.updated_at}
                createdLabel={config.createdLabel}
              />
            </div>
          </div>
        </div>

        {/* Mobile sticky bottom CTA — keeps the primary action one tap
            away from any scroll position. Hidden on >=md where the
            sidebar payment section is naturally visible. */}
        <MobileStickyCTA config={config} entity={entity} />
      </div>
    </>
  );
}

function MobileStickyCTA({ config, entity }: { config: EntityDetailConfig; entity: EntityData }) {
  // Explicit override: entity opted out (null) → no bar.
  if (config.mobileStickyCTA === null) {
    return null;
  }
  if (typeof config.mobileStickyCTA === 'function') {
    const resolved = config.mobileStickyCTA(entity);
    if (!resolved) {
      return null;
    }
    return <StickyBar href={resolved.href} label={resolved.label} />;
  }
  if (config.mobileStickyCTA) {
    return <StickyBar href={config.mobileStickyCTA.href} label={config.mobileStickyCTA.label} />;
  }
  // Default: anchor to the payment section. Suppressed when there
  // isn't one and the entity hasn't provided its own.
  if (config.showPaymentSection === false) {
    return null;
  }
  return <StickyBar href="#pay" label="Support" />;
}

function StickyBar({ href, label }: { href: string; label: string }) {
  // Sits above MobileBottomNav (z-45 + ~56-64px tall). z-46 keeps the
  // CTA in front of the nav; bottom-14 (56px) clears it. The nav itself
  // adds safe-area-inset-bottom, so this bar inherits matching safe-area
  // via the wrapper container we render in.
  return (
    <div className="md:hidden fixed bottom-14 inset-x-0 z-[46] border-t border-border-subtle bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 px-4 py-3 shadow-lg">
      <a
        href={href}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-foreground px-4 py-3 text-sm font-semibold text-background hover:bg-foreground/90 transition-colors min-h-12"
      >
        {label}
      </a>
    </div>
  );
}
