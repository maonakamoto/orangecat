import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'Integrations', template: '%s | OrangeCat' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
