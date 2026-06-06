import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'New AI Assistant', template: '%s | OrangeCat' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
