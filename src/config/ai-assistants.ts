/**
 * AI Assistant Entity Configuration - Single Source of Truth
 *
 * Option arrays for compute provider types and pricing models.
 * Shared between entity-config field definitions and Zod validation schemas.
 */

// ==================== COMPUTE PROVIDERS ====================

export const AI_COMPUTE_PROVIDER_TYPES = [
  { value: 'api', label: 'API Provider - Use OpenAI, Anthropic, etc.' },
  { value: 'self_hosted', label: 'Self-Hosted - Your own hardware' },
  { value: 'community', label: 'Community - Shared community compute' },
] as const;

export type AIComputeProviderType = (typeof AI_COMPUTE_PROVIDER_TYPES)[number]['value'];

// ==================== PRICING MODELS ====================

export const AI_PRICING_MODELS = [
  { value: 'free', label: 'Free - No charge' },
  { value: 'per_message', label: 'Per Message - Charge per message' },
  { value: 'per_token', label: 'Per Token - Charge based on token usage' },
  { value: 'subscription', label: 'Subscription - Monthly subscription' },
] as const;

export type AIPricingModel = (typeof AI_PRICING_MODELS)[number]['value'];

// ==================== STATUS ====================

export const AI_ASSISTANT_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'archived', label: 'Archived' },
] as const;

export type AIAssistantStatus = (typeof AI_ASSISTANT_STATUSES)[number]['value'];
