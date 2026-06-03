'use client';

/**
 * Inline deliveries drawer rendered below a webhook endpoint row when
 * the user clicks "Deliveries". Fetches lazily on first open, exposes
 * a manual refresh button, and shows status + attempt count + response
 * status + timestamps so the operator can diagnose without leaving
 * /settings/integrations.
 *
 * Not real-time. Auto-refresh is intentionally out of scope here —
 * webhook delivery is the kind of thing operators reach for during
 * incident response, not steady-state monitoring.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Clock, RefreshCw, XCircle } from 'lucide-react';
import { logger } from '@/utils/logger';

interface DeliveryRow {
  id: string;
  endpoint_id: string;
  event_type: string;
  event_id: string;
  payload: unknown;
  status: 'pending' | 'delivered' | 'failed';
  response_status: number | null;
  response_body: string | null;
  attempt_count: number;
  last_attempt_at: string | null;
  next_attempt_at: string | null;
  created_at: string;
}

interface Props {
  endpointId: string;
}

function formatTimestamp(value: string | null): string {
  if (!value) {
    return '—';
  }
  return new Date(value).toLocaleString();
}

function StatusBadge({ status }: { status: DeliveryRow['status'] }) {
  if (status === 'delivered') {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-800">
        <CheckCircle2 className="h-3 w-3" />
        Delivered
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-destructive">
        <XCircle className="h-3 w-3" />
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
      <Clock className="h-3 w-3" />
      Pending
    </span>
  );
}

export default function WebhookDeliveriesDrawer({ endpointId }: Props) {
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef(false);

  const load = useCallback(async () => {
    cancelRef.current = false;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/webhook-endpoints/${endpointId}/deliveries`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(`Failed to load deliveries (${res.status})`);
      }
      const json = (await res.json()) as { data: { deliveries: DeliveryRow[] } };
      if (!cancelRef.current) {
        setDeliveries(json.data?.deliveries ?? []);
      }
    } catch (err) {
      logger.error('Failed to load webhook deliveries', { err });
      if (!cancelRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load deliveries');
      }
    } finally {
      if (!cancelRef.current) {
        setLoading(false);
      }
    }
  }, [endpointId]);

  useEffect(() => {
    load();
    return () => {
      cancelRef.current = true;
    };
  }, [load]);

  return (
    <div className="mt-3 rounded-md border border-border-subtle bg-muted/20 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-medium text-foreground">Recent deliveries</h4>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-md border border-border-subtle px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted/60 hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-2 rounded border border-destructive/30 bg-destructive/5 px-2 py-1 text-xs text-destructive">
          {error}
        </div>
      )}

      {loading && deliveries.length === 0 ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : deliveries.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No deliveries yet. The next entity create on this actor will fire here.
        </p>
      ) : (
        <ul className="divide-y divide-border-subtle">
          {deliveries.map(d => (
            <li
              key={d.id}
              className="flex flex-wrap items-start justify-between gap-2 py-2 text-xs"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={d.status} />
                  <code className="rounded bg-muted px-1 text-[10px]">{d.event_type}</code>
                  {d.response_status !== null && (
                    <span className="text-muted-foreground">HTTP {d.response_status}</span>
                  )}
                  {d.attempt_count > 1 && (
                    <span className="text-muted-foreground">attempt {d.attempt_count}</span>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                  <span>Enqueued {formatTimestamp(d.created_at)}</span>
                  <span>Last attempt {formatTimestamp(d.last_attempt_at)}</span>
                  {d.status === 'pending' && d.next_attempt_at && (
                    <span>Next retry {formatTimestamp(d.next_attempt_at)}</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
