import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Messages',
  description: 'Direct messages and conversations on OrangeCat.',
  openGraph: {
    title: 'Messages - OrangeCat',
    description: 'Direct messages and conversations on OrangeCat.',
    type: 'website',
  },
};

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
