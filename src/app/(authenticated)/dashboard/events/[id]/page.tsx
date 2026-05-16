import EntityDetailPage from '@/components/entity/EntityDetailPage';
import { eventEntityConfig, type Event } from '@/config/entities/events';
import { capitalize } from '@/utils/string';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EventDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <EntityDetailPage<Event>
      config={eventEntityConfig}
      entityId={id}
      requireAuth={true}
      redirectPath="/auth?mode=login&from=/dashboard/events"
      makeDetailFields={event => {
        const left = [
          { label: 'Status', value: capitalize(event.status || 'draft') },
          { label: 'Type', value: capitalize(event.event_type || '—') },
          { label: 'Category', value: event.category || '—' },
          {
            label: 'Date',
            value: event.start_date ? new Date(event.start_date).toLocaleString() : '—',
          },
        ];

        if (event.end_date) {
          left.push({
            label: 'End Date',
            value: new Date(event.end_date).toLocaleString(),
          });
        }

        if (event.max_attendees) {
          left.push({
            label: 'Capacity',
            value: `${event.current_attendees ?? 0} / ${event.max_attendees} attendees`,
          });
        }

        const right = [];

        if (event.is_online) {
          right.push({ label: 'Format', value: 'Online' });
          if (event.online_url) {
            right.push({ label: 'URL', value: event.online_url });
          }
        } else {
          const locationParts = [
            event.venue_name,
            event.venue_address,
            event.venue_city,
            event.venue_country,
          ].filter(Boolean);
          if (locationParts.length > 0) {
            right.push({ label: 'Location', value: locationParts.join(', ') });
          }
        }

        if (event.is_free) {
          right.push({ label: 'Ticket Price', value: 'Free' });
        } else if (event.ticket_price) {
          right.push({
            label: 'Ticket Price',
            value: `${event.ticket_price} ${event.currency || 'CHF'}`,
          });
        }

        if (event.bitcoin_address) {
          right.push({ label: 'Bitcoin Address', value: event.bitcoin_address });
        }
        if (event.lightning_address) {
          right.push({ label: 'Lightning Address', value: event.lightning_address });
        }

        return { left, right };
      }}
    />
  );
}
