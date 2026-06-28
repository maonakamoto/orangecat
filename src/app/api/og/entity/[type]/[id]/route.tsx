/**
 * GET /api/og/entity/[type]/[id] — universal share card for any entity.
 *
 * Returns a 1200×630 PNG for WhatsApp / Slack / Telegram / X / LinkedIn link
 * previews. Every shared entity link is a top-of-funnel impression: the card
 * must answer "what is this and why care" before the recipient clicks — cover
 * image (or type mark), title, type, and the ONE key fact (price / funding goal
 * / date / rate). Replaces the bare generic fallback that 9 of the entity types
 * were unfurling with.
 *
 * Public + unauthenticated (previewers aren't logged in), edge runtime, cached
 * 1h so social scrapers can hammer it at share-time without hitting the DB hard.
 */

import { ImageResponse } from 'next/og';
import { createServerClient } from '@/lib/supabase/server';
import {
  ENTITY_REGISTRY,
  ENTITY_TYPES,
  getTableName,
  type EntityType,
} from '@/config/entity-registry';
import { APP_NAME, APP_KICKER } from '@/config/brand';
import { OG_SIZE, OG_COLOR, BrandFooter, StatPill, BrandMarkSvg } from '@/lib/og/branding';

export const runtime = 'edge';
export const contentType = 'image/png';

interface RouteContext {
  params: Promise<{ type: string; id: string }>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

/** Tiny money formatter — the edge card can't pull the full currency service. */
function money(amount: unknown, currency?: string | null): string | null {
  const n = typeof amount === 'number' ? amount : Number(amount);
  if (!isFinite(n) || n <= 0) {
    return null;
  }
  const cur = (currency || 'BTC').toUpperCase();
  if (cur === 'BTC') {
    // Satori's system font has no ₿ (U+20BF) glyph — it renders as tofu.
    // Use the ASCII ticker so the share card stays legible.
    return `${parseFloat(n.toFixed(8))} BTC`;
  }
  if (cur === 'SATS') {
    return `${Math.round(n).toLocaleString('en-US')} sat`;
  }
  const formatted = n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return cur === 'USD' ? `$${formatted}` : `${cur} ${formatted}`;
}

/** First usable image URL on the row, across the per-type column names. */
function pickImage(row: Row): string | null {
  return (
    row.cover_image_url ||
    row.thumbnail_url ||
    row.banner_url ||
    row.avatar_url ||
    (Array.isArray(row.images) ? row.images[0] : null) ||
    null
  );
}

/** The single key fact to headline, per entity type. Returns {label,value} or null. */
function keyFact(type: EntityType, row: Row): { label: string; value: string } | null {
  switch (type) {
    case 'product': {
      const v = money(row.price, row.currency);
      return v ? { label: 'Price', value: v } : null;
    }
    case 'service': {
      const fixed = money(row.fixed_price, row.currency);
      const hourly = money(row.hourly_rate, row.currency);
      if (fixed) {
        return { label: 'Price', value: fixed };
      }
      if (hourly) {
        return { label: 'Per hour', value: hourly };
      }
      return null;
    }
    case 'project':
    case 'cause': {
      const goal = money(row.goal_amount, row.currency);
      return goal ? { label: 'Goal', value: goal } : null;
    }
    case 'research': {
      const goal = money(row.funding_goal_btc ?? row.funding_goal, 'BTC');
      return goal ? { label: 'Funding goal', value: goal } : null;
    }
    case 'investment': {
      const target = money(row.target_amount, row.currency);
      return target ? { label: 'Target', value: target } : null;
    }
    case 'loan': {
      const bal = money(row.remaining_balance ?? row.original_amount, row.currency);
      if (row.interest_rate !== null && row.interest_rate !== undefined) {
        return { label: bal ? `${bal} · APR` : 'APR', value: `${row.interest_rate}%` };
      }
      return bal ? { label: 'Amount', value: bal } : null;
    }
    case 'asset': {
      const price = money(row.sale_price_btc, 'BTC') ?? money(row.estimated_value, row.currency);
      return price ? { label: 'Value', value: price } : null;
    }
    case 'event': {
      if (!row.start_date) {
        return null;
      }
      try {
        const d = new Date(row.start_date);
        return {
          label: 'When',
          value: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        };
      } catch {
        return null;
      }
    }
    case 'ai_assistant': {
      if (row.pricing_model === 'free') {
        return { label: 'Pricing', value: 'Free' };
      }
      const v =
        money(row.price_per_message, 'BTC') ||
        money(row.subscription_price, 'BTC') ||
        money(row.price_per_1k_tokens, 'BTC');
      return v ? { label: 'Pricing', value: v } : null;
    }
    default:
      return null;
  }
}

function brandedCard(children: React.ReactNode) {
  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        padding: 64,
        background: OG_COLOR.surface,
        fontFamily: 'system-ui, sans-serif',
        color: OG_COLOR.text,
      }}
    >
      {children}
    </div>,
    { ...OG_SIZE, headers: { 'cache-control': 'public, max-age=3600, s-maxage=3600' } }
  );
}

/** Rounded-square cover (entities read better as squares than profile circles). */
function Cover({ src, fallbackLabel }: { src: string | null; fallbackLabel: string }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={240}
        height={240}
        style={{
          width: 240,
          height: 240,
          borderRadius: 24,
          objectFit: 'cover',
          border: `2px solid ${OG_COLOR.border}`,
        }}
      />
    );
  }
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 240,
        height: 240,
        borderRadius: 24,
        background: OG_COLOR.glass,
        border: `2px solid ${OG_COLOR.border}`,
        fontSize: 96,
        fontWeight: 700,
        color: OG_COLOR.text,
      }}
    >
      {fallbackLabel.slice(0, 1).toUpperCase()}
    </div>
  );
}

export async function GET(_req: Request, { params }: RouteContext) {
  const { type, id } = await params;

  // Unknown type → branded fallback (never 500 a social scraper).
  if (!ENTITY_TYPES.includes(type as EntityType)) {
    return brandedCard(
      <div style={{ display: 'flex', flex: 1, alignItems: 'center' }}>
        <BrandMarkSvg size={72} />
      </div>
    );
  }
  const entityType = type as EntityType;
  const meta = ENTITY_REGISTRY[entityType];

  let row: Row | null = null;
  try {
    const supabase = await createServerClient();
    const { data } = await supabase
      .from(getTableName(entityType))
      .select('*')
      .eq('id', id)
      .single();
    row = (data as unknown as Row) ?? null;
  } catch {
    row = null;
  }

  const title = (row?.title || row?.name || meta.name) as string;
  const typeLabel = meta.name;
  const description = ((row?.description as string) ?? '').trim().slice(0, 150);
  const image = row ? pickImage(row) : null;
  const fact = row ? keyFact(entityType, row) : null;

  return brandedCard(
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 48, flex: 1 }}>
        <Cover src={image} fallbackLabel={title} />
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 14 }}>
          <span
            style={{
              display: 'flex',
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: 3,
              textTransform: 'uppercase',
              color: OG_COLOR.accent,
            }}
          >
            {typeLabel}
          </span>
          <span
            style={{
              display: 'flex',
              fontSize: title.length > 40 ? 48 : 60,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
            }}
          >
            {title.slice(0, 80)}
          </span>
          {description && (
            <span
              style={{
                display: 'flex',
                fontSize: 24,
                color: OG_COLOR.textMuted,
                lineHeight: 1.4,
              }}
            >
              {description}
            </span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 16 }}>
          {fact && <StatPill label={fact.label} value={fact.value} />}
        </div>
        <BrandFooter wordmark={APP_NAME} tagline={APP_KICKER} />
      </div>
    </>
  );
}
