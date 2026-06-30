/**
 * Entity detail-page configs (SSOT).
 *
 * Each entity's PublicEntityDetailPage config is defined ONCE here and imported by
 * both its public route (/{type}/[id]) and its owner dashboard route
 * (/dashboard/{base}/[id]) — same layout for buyers and owners, owner additionally
 * gets the manage bar. DETAIL_CONFIGS maps entityType → config for generic lookups.
 */
import type { EntityType } from '@/config/entity-registry';
import type { EntityDetailConfig } from '@/components/public/PublicEntityDetailPage';
import { productDetailConfig } from './product';
import { serviceDetailConfig } from './service';
import { causeDetailConfig } from './cause';
import { researchDetailConfig } from './research';
import { eventDetailConfig } from './event';
import { aiAssistantDetailConfig } from './ai-assistant';
import { loanDetailConfig } from './loan';
import { investmentDetailConfig } from './investment';
import { assetDetailConfig } from './asset';
import { circleDetailConfig } from './circle';

export {
  productDetailConfig,
  serviceDetailConfig,
  causeDetailConfig,
  researchDetailConfig,
  eventDetailConfig,
  aiAssistantDetailConfig,
  loanDetailConfig,
  investmentDetailConfig,
  assetDetailConfig,
  circleDetailConfig,
};

export const DETAIL_CONFIGS: Partial<Record<EntityType, EntityDetailConfig>> = {
  product: productDetailConfig,
  service: serviceDetailConfig,
  cause: causeDetailConfig,
  research: researchDetailConfig,
  event: eventDetailConfig,
  ai_assistant: aiAssistantDetailConfig,
  loan: loanDetailConfig,
  investment: investmentDetailConfig,
  asset: assetDetailConfig,
  circle: circleDetailConfig,
};
