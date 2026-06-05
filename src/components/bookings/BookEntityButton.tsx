'use client';

/**
 * BookEntityButton
 *
 * Thin client wrapper around BookEntityDialog so a server-rendered detail
 * page (e.g. /services/[id]) can drop a "Book this" CTA without itself
 * becoming a client component.
 *
 * The button is variant="accent" — top-of-funnel conversion per the
 * design system migration. For Bitcoin-specific surfaces, use the
 * variant override.
 */

import { useState } from 'react';
import { Calendar } from 'lucide-react';
import Button from '@/components/ui/Button';
import { BookEntityDialog, type BookEntityDialogProps } from './BookEntityDialog';

type Props = Omit<BookEntityDialogProps, 'isOpen' | 'onClose'> & {
  label?: string;
  className?: string;
};

export function BookEntityButton({ label = 'Book this', className, ...dialogProps }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="accent"
        onClick={() => setIsOpen(true)}
        className={className}
        aria-label={`Book ${dialogProps.bookableTitle}`}
      >
        <Calendar className="mr-2 h-4 w-4" aria-hidden="true" />
        {label}
      </Button>
      <BookEntityDialog {...dialogProps} isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
