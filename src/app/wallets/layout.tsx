import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'Get a Bitcoin Wallet', template: '%s | OrangeCat' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
