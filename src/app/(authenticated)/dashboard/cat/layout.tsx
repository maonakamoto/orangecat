import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cat',
};

export default function CatLayout({ children }: { children: React.ReactNode }) {
  return children;
}
