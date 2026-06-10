/**
 * PREFILLED FORM CARD
 *
 * Renders a structured draft of an entity (product, service, project, etc.)
 * that the Cat produced via prefill_entity_form. The user reviews the fields
 * and clicks "Open in form" to land on the entity create page with everything
 * already populated — they can edit and submit on their terms.
 *
 * Designed so the Cat never auto-creates an entity from chat. The user always
 * has a chance to review the structured fields before committing.
 */

'use client';

import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight } from 'lucide-react';
import { STORAGE_KEYS } from '@/config/storage-keys';
import { ENTITY_REGISTRY, isValidEntityType, type EntityType } from '@/config/entity-registry';
import type { PrefillProposal } from '../types';

const PREVIEW_LABELS: Record<string, string> = {
  title: 'Title',
  name: 'Name',
  description: 'Description',
  short_description: 'Short description',
  price_btc: 'Price',
  price: 'Price',
  category: 'Category',
  tags: 'Tags',
  location: 'Location',
  duration_minutes: 'Duration',
  target_btc: 'Goal',
  start_date: 'Starts',
  end_date: 'Ends',
};

interface PrefilledFormCardProps {
  proposal: PrefillProposal;
}

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : '—';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  const str = String(value);
  // Truncate long descriptions for the inline preview — the form will show full.
  if (key === 'description' && str.length > 220) {
    return str.slice(0, 220) + '…';
  }
  return str;
}

export function PrefilledFormCard({ proposal }: PrefilledFormCardProps) {
  const router = useRouter();
  const { entityType, sourceDescription, data } = proposal;

  if (!isValidEntityType(entityType)) {
    return null;
  }
  const meta = ENTITY_REGISTRY[entityType as EntityType];
  const createPath = meta.createPath;

  const populatedFields = Object.entries(data).filter(([, v]) => {
    if (v === null || v === undefined || v === '') {
      return false;
    }
    if (Array.isArray(v) && v.length === 0) {
      return false;
    }
    return true;
  });

  const handleOpenInForm = () => {
    if (typeof window !== 'undefined') {
      try {
        const key = STORAGE_KEYS.ENTITY_PREFILL(entityType as EntityType);
        window.localStorage.setItem(key, JSON.stringify(data));
      } catch {
        /* localStorage unavailable; the form will start empty */
      }
    }
    router.push(createPath);
  };

  return (
    <div className="mt-3 rounded-md border border-border-subtle bg-muted/30 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-foreground" />
        <span className="text-sm font-semibold text-foreground">
          Drafted a {meta.name.toLowerCase()}
        </span>
      </div>
      {sourceDescription && (
        <p className="mb-3 text-xs italic text-muted-foreground">
          From: &ldquo;
          {sourceDescription.length > 180
            ? sourceDescription.slice(0, 180) + '…'
            : sourceDescription}
          &rdquo;
        </p>
      )}
      <dl className="space-y-1.5 text-sm">
        {populatedFields.slice(0, 8).map(([key, value]) => (
          <div key={key} className="flex gap-2">
            <dt className="w-32 flex-shrink-0 text-xs uppercase tracking-wide text-muted-dim">
              {PREVIEW_LABELS[key] ?? key.replace(/_/g, ' ')}
            </dt>
            <dd className="flex-1 text-foreground">{formatValue(key, value)}</dd>
          </div>
        ))}
        {populatedFields.length > 8 && (
          <p className="text-xs text-muted-dim">+ {populatedFields.length - 8} more fields</p>
        )}
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleOpenInForm}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
        >
          Open in form
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
