import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'Documents', template: '%s | OrangeCat' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
