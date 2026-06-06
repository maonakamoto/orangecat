import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Getting Started',
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
