import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How It Works',
  description:
    'Learn how OrangeCat works — fund projects, lend, invest, trade, and govern with any identity, any currency, powered by your AI economic agent.',
};

export default function HowItWorksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
