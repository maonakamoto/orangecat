import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bitcoin Wallet Guide',
  description:
    'A beginner-friendly guide to Bitcoin wallets — choose the right wallet, set it up safely, and start using Bitcoin on OrangeCat.',
};

export default function BitcoinWalletGuideLayout({ children }: { children: React.ReactNode }) {
  return children;
}
