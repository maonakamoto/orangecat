import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'OrangeCat Privacy Policy — how we handle your data with respect for your identity and economic privacy.',
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
