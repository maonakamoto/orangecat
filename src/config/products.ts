/**
 * Product Entity Configuration - Single Source of Truth
 *
 * Option arrays for product types and fulfillment types.
 * Shared between entity-config field definitions and Zod validation schemas.
 */

// ==================== PRODUCT TYPES ====================

export const PRODUCT_TYPES = [
  { value: 'physical', label: 'Physical Product' },
  { value: 'digital', label: 'Digital Product' },
  { value: 'service', label: 'Service' },
] as const;

export type ProductType = (typeof PRODUCT_TYPES)[number]['value'];

// ==================== FULFILLMENT TYPES ====================

export const PRODUCT_FULFILLMENT_TYPES = [
  { value: 'manual', label: 'Manual' },
  { value: 'automatic', label: 'Automatic' },
  { value: 'digital', label: 'Digital Delivery' },
] as const;

export type ProductFulfillmentType = (typeof PRODUCT_FULFILLMENT_TYPES)[number]['value'];
