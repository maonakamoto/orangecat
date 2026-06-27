import { cn } from '@/lib/utils';

interface PageHeadingProps {
  children: React.ReactNode;
  /** Extra classes for the heading (e.g. text alignment). Never override the responsive scale. */
  className?: string;
}

/**
 * Canonical page H1 — SSOT for the top-level heading scale, font, and tracking.
 * Mobile-first by construction (`text-2xl` → `sm:text-3xl` → `md:text-4xl`) so every
 * page that uses it looks right on small screens. Public/marketing and detail pages should
 * use this instead of hand-rolling `text-4xl` headings (which don't scale down on phones).
 */
export function PageHeading({ children, className }: PageHeadingProps) {
  return (
    <h1
      className={cn(
        'font-heading tracking-display text-2xl sm:text-3xl md:text-4xl font-bold text-fg-primary break-words',
        className
      )}
    >
      {children}
    </h1>
  );
}
