import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'Create', template: '%s | OrangeCat' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
