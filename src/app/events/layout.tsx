import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Events',
  description:
    'Organize and attend events with Bitcoin ticketing on OrangeCat — RSVP management, global reach, and zero platform fees.',
};

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
