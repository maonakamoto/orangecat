import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Post',
  description: 'Thread view on OrangeCat.',
};

export default function PostLayout({ children }: { children: React.ReactNode }) {
  return children;
}
