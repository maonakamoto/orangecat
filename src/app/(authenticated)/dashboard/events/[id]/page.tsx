import PublicEntityDetailPage from '@/components/public/PublicEntityDetailPage';
import { eventDetailConfig } from '@/components/public/detail-configs/event';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Event detail (owner / dashboard).
 *
 * Renders the SAME layout attendees see (PublicEntityDetailPage) plus the owner
 * manage bar. Config shared with the public route via eventDetailConfig (SSOT).
 */
export default async function EventDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <PublicEntityDetailPage id={id} config={eventDetailConfig} />;
}
