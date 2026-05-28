import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'OrangeCat Terms of Service — the rules for using the platform for economic participation, funding, lending, investing, and governance.',
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
