import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'Dashboard', template: '%s | OrangeCat' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
