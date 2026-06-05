'use client';

/**
 * BookEntityDialog
 *
 * Opens a date/time picker over a service or asset detail page and POSTs
 * to /api/bookings to create a pending booking. The provider then sees
 * the booking under /dashboard/bookings → Incoming and can confirm or
 * reject via the existing PUT endpoint.
 *
 * Scope notes:
 * - For services with a `duration_minutes`, `ends_at` is computed from
 *   `starts_at + duration`. The user only picks a start time.
 * - For services without a duration (or for assets — wired in a follow-up
 *   commit), the user picks both start and end. End must be > start; the
 *   server enforces this too.
 * - All times are sent to the server as ISO strings in UTC. The native
 *   `datetime-local` input gives local-wall-clock; we convert via Date.
 * - On success we toast + close. We deliberately do NOT redirect to
 *   /dashboard/bookings — the user is browsing a listing, not managing.
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { Calendar, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useDisplayCurrency } from '@/hooks/useDisplayCurrency';

export interface BookEntityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bookableType: 'service' | 'asset';
  bookableId: string;
  bookableTitle: string;
  /** BTC price (NUMERIC) the booking will be created at. Display only — the
   *  server re-reads the bookable's current price authoritatively. */
  priceBtc?: number;
  /** When set, dialog renders a single start input and derives ends_at. */
  durationMinutes?: number;
}

function toIsoUtc(localValue: string): string {
  // `datetime-local` returns "YYYY-MM-DDTHH:mm" without timezone. Treat as
  // the user's local wall clock and convert to UTC ISO for the server.
  return new Date(localValue).toISOString();
}

function addMinutesIso(localValue: string, minutes: number): string {
  const d = new Date(localValue);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

export function BookEntityDialog({
  isOpen,
  onClose,
  bookableType,
  bookableId,
  bookableTitle,
  priceBtc,
  durationMinutes,
}: BookEntityDialogProps) {
  const { formatSats } = useDisplayCurrency();
  const [startsAtLocal, setStartsAtLocal] = useState('');
  const [endsAtLocal, setEndsAtLocal] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const hasDuration = Boolean(durationMinutes && durationMinutes > 0);

  const reset = () => {
    setStartsAtLocal('');
    setEndsAtLocal('');
    setNotes('');
    setSubmitting(false);
  };

  const handleClose = () => {
    if (submitting) {
      return;
    }
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!startsAtLocal) {
      toast.error('Pick a start time');
      return;
    }
    if (!hasDuration && !endsAtLocal) {
      toast.error('Pick an end time');
      return;
    }

    const starts_at = toIsoUtc(startsAtLocal);
    const ends_at = hasDuration
      ? addMinutesIso(startsAtLocal, durationMinutes!)
      : toIsoUtc(endsAtLocal);

    if (new Date(ends_at) <= new Date(starts_at)) {
      toast.error('End time must be after start time');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookable_type: bookableType,
          bookable_id: bookableId,
          starts_at,
          ends_at,
          customer_notes: notes || undefined,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error || `Failed to book (${res.status})`);
        return;
      }
      toast.success('Booking request sent — provider will confirm or reject.');
      reset();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-foreground" />
            Book {bookableTitle}
          </DialogTitle>
          <DialogDescription>
            Send a booking request to the provider. They&apos;ll confirm or reject.
            {typeof priceBtc === 'number' && priceBtc > 0 && (
              <span className="mt-1 block text-sm">
                Price: <span className="font-medium text-foreground">{formatSats(priceBtc)}</span>
                {hasDuration && ` · ${durationMinutes} min`}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label
              className="mb-1 block text-sm font-medium text-foreground"
              htmlFor="booking-start"
            >
              Start time
            </label>
            <Input
              id="booking-start"
              type="datetime-local"
              value={startsAtLocal}
              onChange={e => setStartsAtLocal(e.target.value)}
              disabled={submitting}
            />
          </div>

          {!hasDuration && (
            <div>
              <label
                className="mb-1 block text-sm font-medium text-foreground"
                htmlFor="booking-end"
              >
                End time
              </label>
              <Input
                id="booking-end"
                type="datetime-local"
                value={endsAtLocal}
                onChange={e => setEndsAtLocal(e.target.value)}
                disabled={submitting}
              />
            </div>
          )}

          <div>
            <label
              className="mb-1 block text-sm font-medium text-foreground"
              htmlFor="booking-notes"
            >
              Notes (optional)
            </label>
            <textarea
              id="booking-notes"
              value={notes}
              onChange={e => setNotes(e.target.value.slice(0, 1000))}
              disabled={submitting}
              rows={3}
              maxLength={1000}
              placeholder="Anything the provider should know"
              className="w-full rounded-md border border-border-strong bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-dim focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !startsAtLocal}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send booking request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
