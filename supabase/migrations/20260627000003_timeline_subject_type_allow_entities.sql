-- Let any registry entity type be a timeline_events.subject — so Cat's
-- post_to_timeline can actually LINK the entity it promotes (project, product,
-- cause, event, …) instead of discarding entity_id. The old CHECK only allowed
-- {project, profile, organization, transaction, comment, event, achievement,
-- system}, which silently blocked linking products/causes/services/etc.
-- Idempotent: drop + recreate the named constraint.

ALTER TABLE timeline_events DROP CONSTRAINT IF EXISTS timeline_events_subject_type_check;

ALTER TABLE timeline_events ADD CONSTRAINT timeline_events_subject_type_check
  CHECK (subject_type = ANY (ARRAY[
    -- non-entity subjects (kept from the original constraint)
    'profile', 'organization', 'transaction', 'comment', 'achievement', 'system',
    -- all registry entity types (src/config/entity-registry.ts ENTITY_TYPES)
    'wallet', 'project', 'product', 'service', 'cause', 'ai_assistant', 'group',
    'asset', 'loan', 'investment', 'event', 'research', 'wishlist', 'document'
  ]::text[]));
