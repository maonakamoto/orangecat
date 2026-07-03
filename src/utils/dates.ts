/**
 * Shared date formatting utilities — SSOT for display-layer date/time formatting.
 * Eliminates duplicate formatDate/formatTime/formatRelativeTime definitions
 * scattered across components. Uses date-fns (already installed).
 */
import { format, formatDistanceToNow } from 'date-fns';

export function formatDate(date: string | Date): string {
  return format(typeof date === 'string' ? new Date(date) : date, 'MMM d, yyyy');
}

export function formatTime(date: string | Date): string {
  return format(typeof date === 'string' ? new Date(date) : date, 'h:mm a');
}

export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(typeof date === 'string' ? new Date(date) : date, {
    addSuffix: true,
  });
}

export function formatShortTime(date: string | Date): string {
  return format(typeof date === 'string' ? new Date(date) : date, 'HH:mm');
}

/**
 * Human-readable duration from minutes: 45 → "45 min", 180 → "3 h",
 * 90 → "1 h 30 min". Returns '' for non-positive/invalid input so callers
 * can conditionally render.
 */
export function formatDurationMinutes(minutes: number | null | undefined): string {
  if (!minutes || !Number.isFinite(minutes) || minutes <= 0) {
    return '';
  }
  const whole = Math.round(minutes);
  const hours = Math.floor(whole / 60);
  const mins = whole % 60;
  if (hours === 0) {
    return `${mins} min`;
  }
  return mins === 0 ? `${hours} h` : `${hours} h ${mins} min`;
}

export function formatRelativeTimeCompact(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const days = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) {
    return 'Today';
  }
  if (days === 1) {
    return 'Yesterday';
  }
  if (days < 7) {
    return `${days}d ago`;
  }
  if (days < 30) {
    return `${Math.floor(days / 7)}w ago`;
  }
  return formatDate(d);
}
