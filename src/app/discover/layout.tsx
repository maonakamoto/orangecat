import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Discover',
  description:
    'Explore projects, causes, products, services, and more on OrangeCat — the open platform for economic participation with any identity, any currency.',
};

export default function DiscoverLayout({ children }: { children: React.ReactNode }) {
  return children;
}
