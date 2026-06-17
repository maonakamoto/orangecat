/**
 * External publish bus — inbound contract SSOT.
 *
 * OrangeCat is the platform's collaboration + economy backbone; FleetCrown (and
 * future clients) ASYNC-publish publish-worthy build events onto a project's
 * OrangeCat wall. This file is the single source of truth for what that inbound
 * payload may contain — the allow-lists below are the *ceiling*, so a client can
 * never inject an arbitrary event type, subject type, or unknown source onto the
 * wall. The PROMOTE step (which build events are worth publishing, and how they
 * map onto these types) lives on the FleetCrown side, by design.
 *
 * See docs/architecture/PLATFORM_AND_COLLABORATION.md ("Async publish + read-only
 * surfacing") and src/services/timeline/externalPublish.ts.
 */
import { z } from 'zod';
import type { TimelineEventType, TimelineSubjectType } from '@/types/timeline';

/** Recognised publishing clients (the `metadata.source` namespace for dedup). */
export const EXTERNAL_PUBLISH_SOURCES = ['fleetcrown'] as const;
export type ExternalPublishSource = (typeof EXTERNAL_PUBLISH_SOURCES)[number];

/**
 * Event types an external client may publish. Deliberately a SUBSET of the
 * existing TimelineEventType taxonomy (not new strings) so the wall's formatters,
 * icons, and feeds render them with zero extra work — FleetCrown maps its build
 * events onto these on its side.
 */
export const EXTERNAL_PUBLISHABLE_EVENT_TYPES = [
  'project_updated', // changelog entry / general build update
  'project_milestone', // a milestone was completed
  'project_completed', // the project shipped
  'project_goal_reached', // a funding/build goal was hit
  'project_published', // went live / public
] as const satisfies readonly TimelineEventType[];
export type ExternalPublishableEventType = (typeof EXTERNAL_PUBLISHABLE_EVENT_TYPES)[number];

/** Subjects an external client may attach an update to. Projects only, for now. */
export const EXTERNAL_PUBLISHABLE_SUBJECT_TYPES = [
  'project',
] as const satisfies readonly TimelineSubjectType[];

/** Metadata keys the bus writes. Kept here so the service + dedup index agree. */
export const EXTERNAL_PUBLISH_META = {
  source: 'source',
  externalId: 'external_id',
  sourceUrl: 'source_url', // deep-link back into the originating client
  isExternal: 'is_external_publish',
} as const;

/**
 * Inbound payload schema. snake_case to match the wire/API convention and the
 * DB columns; the route validates against this before the service ever runs.
 */
export const externalPublishSchema = z.object({
  /** Originating client — namespaces external_id and pins the deep-link origin. */
  source: z.enum(EXTERNAL_PUBLISH_SOURCES),
  /** Stable id from the source's own event spine — the idempotency key. */
  external_id: z.string().min(1).max(200),
  event_type: z.enum(EXTERNAL_PUBLISHABLE_EVENT_TYPES),
  subject_type: z.enum(EXTERNAL_PUBLISHABLE_SUBJECT_TYPES).default('project'),
  /** The OrangeCat entity this update is about (must be owned by the caller). */
  subject_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  /** Deep-link back to the source surface (e.g. the FleetCrown changelog entry). */
  url: z.string().url().optional(),
  /** Structured payload preserved verbatim under timeline_events.content. */
  content: z.record(z.unknown()).optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
  /** When the event happened at the source (defaults to now on the OC side). */
  event_timestamp: z.string().datetime().optional(),
  visibility: z.enum(['public', 'followers', 'private']).default('public'),
});

export type ExternalPublishInput = z.infer<typeof externalPublishSchema>;
