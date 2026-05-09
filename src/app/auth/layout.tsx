import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In',
  description:
    'Sign in or create your OrangeCat account to start funding, lending, investing, and trading with your AI economic agent.',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
