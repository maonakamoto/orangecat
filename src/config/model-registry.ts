/**
 * Compatibility adapter for the legacy chat model selector.
 *
 * The canonical AI model source is `ai-models.ts`. Keep this file as a thin
 * projection so older UI code does not drift into a second pricing/model list.
 */

import { AI_MODEL_REGISTRY, type AIModelMetadata } from '@/config/ai-models';

export interface ModelMetadata {
  id: string;
  name: string;
  provider: string;

  // Economics
  tier: 'free' | 'freemium' | 'paid';
  costPerMessage?: number;
  costPer1MTokens?: number;

  // Capabilities
  contextWindow: number;
  maxOutputTokens: number;
  supportsVision: boolean;
  supportsFunctionCalling: boolean;
  supportsStreaming: boolean;

  // Philosophy
  type: 'open' | 'proprietary';
  license?: string;

  // Deployment
  availability: 'cloud' | 'local' | 'both';
  localRequirements?: {
    minRAM: number;
    minVRAM?: number;
    diskSpace: number;
  };

  // Performance
  speed: 'slow' | 'medium' | 'fast' | 'instant';
  quality: 1 | 2 | 3 | 4 | 5;

  // Access
  apiEndpoint: string;
  requiresApiKey: boolean;
  openRouterCompatible: boolean;
  ollamaCompatible: boolean;

  description?: string;
}

const OPEN_PROVIDERS = new Set(['Meta', 'Mistral', 'NVIDIA', 'DeepSeek', 'Qwen']);
const OPEN_WEIGHT_MODEL_IDS = new Set([
  'openai/gpt-oss-120b',
  'openai/gpt-oss-120b:free',
  'openai/gpt-oss-20b',
  'openai/gpt-oss-20b:free',
]);

function toLegacyTier(model: AIModelMetadata): ModelMetadata['tier'] {
  if (model.isFree || model.tier === 'free') {
    return 'free';
  }
  return model.tier === 'economy' ? 'freemium' : 'paid';
}

function toCostPer1MTokens(model: AIModelMetadata): number {
  return Math.max(model.inputCostPer1M, model.outputCostPer1M);
}

function toSpeed(model: AIModelMetadata): ModelMetadata['speed'] {
  if (model.tier === 'free' || model.tier === 'economy') {
    return 'fast';
  }
  return model.tier === 'premium' ? 'medium' : 'fast';
}

function toQuality(model: AIModelMetadata): ModelMetadata['quality'] {
  if (model.tier === 'premium') {
    return 5;
  }
  if (model.tier === 'standard') {
    return 4;
  }
  return model.contextWindow >= 128000 ? 4 : 3;
}

function toLegacyModel(model: AIModelMetadata): ModelMetadata {
  const costPer1MTokens = toCostPer1MTokens(model);
  return {
    id: model.id,
    name: model.name,
    provider: model.provider,
    tier: toLegacyTier(model),
    costPerMessage: model.isFree ? 0 : undefined,
    costPer1MTokens,
    contextWindow: model.contextWindow,
    maxOutputTokens: model.maxOutputTokens,
    supportsVision: model.capabilities.includes('vision'),
    supportsFunctionCalling: model.capabilities.includes('function_calling'),
    supportsStreaming: model.capabilities.includes('streaming'),
    type:
      OPEN_PROVIDERS.has(model.provider) || OPEN_WEIGHT_MODEL_IDS.has(model.id)
        ? 'open'
        : 'proprietary',
    availability: 'cloud',
    speed: toSpeed(model),
    quality: toQuality(model),
    apiEndpoint: 'https://openrouter.ai/api/v1/chat/completions',
    requiresApiKey: !model.isFree,
    openRouterCompatible: true,
    ollamaCompatible: false,
    description: model.description,
  };
}

export const MODEL_REGISTRY: Record<string, ModelMetadata> = Object.fromEntries(
  Object.values(AI_MODEL_REGISTRY)
    .filter(model => model.isAvailable)
    .map(model => [model.id, toLegacyModel(model)])
);
