'use client';

/**
 * FormattedAmount Component
 *
 * A client component for displaying amounts in the user's preferred currency.
 * Use this in server components where hooks aren't available.
 *
 * Created: 2026-01-28
 * Last Modified: 2026-01-28
 * Last Modified Summary: Created for server component currency display
 */

import { useDisplayCurrency } from '@/hooks/useDisplayCurrency';

interface FormattedAmountProps {
  /** Amount in BTC. The canonical unit on this platform — never pass sats here. */
  btc: number;
  className?: string;
}

export function FormattedAmount({ btc, className }: FormattedAmountProps) {
  const { formatAmountBtc } = useDisplayCurrency();

  return <span className={className}>{formatAmountBtc(btc)}</span>;
}

export default FormattedAmount;
