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

export function formatDateTime(date: string | Date): string {
  return format(typeof date === 'string' ? new Date(date) : date, 'MMM d, yyyy h:mm a');
}

export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(typeof date === 'string' ? new Date(date) : date, {
    addSuffix: true,
  });
}

export function formatShortTime(date: string | Date): string {
  return format(typeof date === 'string' ? new Date(date) : date, 'HH:mm');
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
