/**
 * AI Services - Barrel Export
 */

// OpenRouter Service
export {
  OpenRouterService,
  createOpenRouterService,
  createOpenRouterServiceWithByok,
  type OpenRouterMessage,
} from './openrouter';

// Auto Router
export { createAutoRouter } from './auto-router';

// API Key Management (BYOK)
export { ApiKeyService, createApiKeyService } from './api-key-service';

// Groq Service (fast, free inference)
export {
  GroqService,
  GroqAPIError,
  createGroqService,
  createGroqServiceWithByok,
  isGroqAvailable,
  DEFAULT_GROQ_MODEL,
  type GroqMessage,
} from './groq';
