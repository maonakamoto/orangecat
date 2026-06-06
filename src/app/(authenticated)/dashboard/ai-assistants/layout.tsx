import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Assistants',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
