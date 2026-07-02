'use client';

import { Badge } from '@/components/ui/badge';
import { useDisplayCurrency } from '@/hooks/useDisplayCurrency';

/**
 * Compact price chip for the assistant header: "Free to chat" or the
 * per-message price in the user's display currency (BTC is the stored unit).
 */
export function AssistantPriceChip({
  isFree,
  amountBtc,
  suffix,
}: {
  isFree: boolean;
  amountBtc: number;
  suffix: string;
}) {
  const { formatAmountBtc } = useDisplayCurrency();
  if (isFree) {
    return <Badge variant="secondary">Free to chat</Badge>;
  }
  return (
    <Badge variant="outline">
      {formatAmountBtc(amountBtc)}
      {suffix}
    </Badge>
  );
}
