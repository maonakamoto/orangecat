import type { Metadata } from 'next';

export const metadata: Metadata = {
  // Was 'Sign In' — but this layout serves /auth?mode=login AND
  // /auth?mode=register from the same page module, so the browser tab
  // title lied half the time. 'Account' covers both modes honestly.
  title: 'Account',
  description:
    'Sign in or create your OrangeCat account to start funding, lending, investing, and trading with your AI economic agent.',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
