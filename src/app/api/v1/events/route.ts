/**
 * Public API — POST + GET /api/v1/events
 *
 * See /api/v1/README.md for the v1 contract. This file currently
 * re-exports the internal handlers; replace with an adapter when an
 * internal handler needs a breaking change.
 *
 * - POST: create an entity (auth: integration key OR session)
 * - GET:  list entities, scoped to the bound actor for integration keys
 */

export { POST, GET } from '@/app/api/events/route';
