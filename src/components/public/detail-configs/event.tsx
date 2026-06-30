import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import type { EntityDetailConfig } from '@/components/public/PublicEntityDetailPage';
import { ROUTES } from '@/config/routes';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, MapPin, Users } from 'lucide-react';

/** SSOT for the event detail page — shared by the public + owner dashboard routes. */
export const eventDetailConfig: EntityDetailConfig = {
  entityType: 'event',
  ownerLabel: 'Organizer',
  descriptionTitle: 'About this Event',
  backText: 'Back to Events',
  backHref: '/events',
  metadataSelect: 'title, description, start_date, location',
  getViewRoute: id => ROUTES.EVENTS.VIEW(id),
  getCoverImages: entity => {
    const images = Array.isArray(entity.images) ? (entity.images as string[]) : [];
    return [entity.banner_url as string, entity.thumbnail_url as string, ...images].filter(Boolean);
  },
  getJsonLdExtra: entity => ({
    ...(entity.start_date && { startDate: entity.start_date }),
    ...(entity.end_date && { endDate: entity.end_date }),
    ...(entity.location && { location: { '@type': 'Place', name: entity.location } }),
    ...(entity.max_attendees && { maximumAttendeeCapacity: entity.max_attendees }),
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  }),
  renderHeaderExtra: entity =>
    entity.start_date ? (
      <span className="text-fg-secondary text-sm">
        {format(new Date(entity.start_date as string), 'EEEE, MMMM d, yyyy')}
      </span>
    ) : null,
  renderDetails: entity => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Event Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {entity.start_date && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-surface-raised/40 rounded-lg flex items-center justify-center">
              <CalendarIcon className="w-5 h-5 text-fg-primary" />
            </div>
            <div>
              <div className="font-medium">
                {format(new Date(entity.start_date as string), 'EEEE, MMMM d, yyyy')}
              </div>
              <div className="text-sm text-fg-secondary">
                {format(new Date(entity.start_date as string), 'h:mm a')}
                {entity.end_date && ` - ${format(new Date(entity.end_date as string), 'h:mm a')}`}
              </div>
            </div>
          </div>
        )}
        {entity.location && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-surface-raised/40 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-fg-primary" />
            </div>
            <div>
              <div className="font-medium">{entity.location as string}</div>
            </div>
          </div>
        )}
        {entity.max_attendees && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-surface-raised/40 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-fg-primary" />
            </div>
            <div>
              <div className="font-medium">Max {entity.max_attendees as number} attendees</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  ),
};
