import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'Getting Started', template: '%s | OrangeCat' },
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
