import { APP_NAME } from '@/config/brand';

/**
 * One honest line under payment CTAs: payments settle directly between
 * wallets and the platform takes nothing. Rendered ONLY when the seller
 * actually has a wallet connected — never as marketing on a dead CTA.
 */
export function PaymentExpectationNote({ className = '' }: { className?: string }) {
  return (
    <p className={`text-xs text-fg-secondary text-center ${className}`.trim()}>
      Pays wallet-to-wallet via Lightning/Bitcoin — {APP_NAME} takes 0%
    </p>
  );
}
