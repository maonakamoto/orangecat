import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'Cat', template: '%s | OrangeCat' },
};

export default function CatLayout({ children }: { children: React.ReactNode }) {
  return children;
}
