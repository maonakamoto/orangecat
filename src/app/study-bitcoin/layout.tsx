import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Study Bitcoin',
  description:
    'Learn Bitcoin from the ground up — wallets, Lightning Network, self-custody, and how to use Bitcoin on OrangeCat.',
};

export default function StudyBitcoinLayout({ children }: { children: React.ReactNode }) {
  return children;
}
