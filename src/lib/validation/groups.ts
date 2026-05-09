import { z } from 'zod';
import { GROUP_EVENT_TYPES, EVENT_LOCATION_TYPES } from '@/config/events';

// Group event schema — used by CreateEventDialog
// Distinct from the public eventSchema in social.ts (different event_type enum, group context)
export const groupEventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  description: z.string().max(5000, 'Description must be 5000 characters or less').optional(),
  event_type: z
    .enum(GROUP_EVENT_TYPES.map(t => t.value) as [string, ...string[]])
    .default('general'),
  location_type: z
    .enum(EVENT_LOCATION_TYPES.map(t => t.value) as [string, ...string[]])
    .default('online'),
  location_details: z.string().max(500).optional(),
  starts_at: z.string().min(1, 'Start date and time are required'),
  ends_at: z.string().optional(),
  timezone: z.string().max(50).default('UTC'),
  max_attendees: z.number().int().positive().optional(),
  is_public: z.boolean().default(true),
  requires_rsvp: z.boolean().default(false),
});
export type GroupEventFormData = z.input<typeof groupEventSchema>;
