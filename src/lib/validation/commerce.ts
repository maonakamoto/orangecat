import { z } from 'zod';
import { CURRENCY_CODES } from '@/config/currencies';
import { CAUSE_CATEGORIES, CAUSE_STATUSES, DISTRIBUTION_RULE_TYPES } from '@/config/causes';
import { PRODUCT_TYPES, PRODUCT_FULFILLMENT_TYPES, PRODUCT_STATUSES } from '@/config/products';
import { SERVICE_LOCATION_TYPES, SERVICE_STATUSES } from '@/config/services';
import { DAYS_OF_WEEK } from '@/config/schedule';
import { lightningAddressSchema, optionalText, optionalUrl } from './base';

// =============================================================================
// REUSABLE SUB-SCHEMAS FOR JSON FIELDS
// =============================================================================

/**
 * Availability schedule for services.
 * Matches AvailabilitySchedule interface in domain/commerce/service.ts.
 * Stored as JSONB in the database.
 *
 * Uses .passthrough() to allow additional fields without breaking existing data.
 */
const availabilityScheduleSchema = z
  .object({
    days: z.array(z.enum(DAYS_OF_WEEK)).optional(),
    hours: z
      .array(
        z.object({
          start: z.string().max(10),
          end: z.string().max(10),
        })
      )
      .optional(),
    timezone: z.string().max(100).optional(),
  })
  .passthrough();

/**
 * Distribution rules for causes.
 * Matches DistributionRules interface in domain/commerce/service.ts.
 * Stored as JSONB in the database.
 *
 * Uses .passthrough() to allow additional fields without breaking existing data.
 */
const distributionRulesSchema = z
  .object({
    type: z.enum(DISTRIBUTION_RULE_TYPES).optional(),
    allocations: z.record(z.string(), z.number()).optional(),
  })
  .passthrough();

/**
 * Beneficiary in a cause.
 * Matches Beneficiary interface in domain/commerce/service.ts.
 * Stored as JSONB array in the database.
 *
 * Uses .passthrough() to allow additional fields without breaking existing data.
 */
const beneficiarySchema = z
  .object({
    id: z.string().optional(),
    name: z.string().max(200).optional(),
    address: z.string().max(500).optional(),
    share: z.number().min(0).max(100).optional(),
  })
  .passthrough();

// Personal Economy validation schemas
export const userProductSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be at most 100 characters'),
  description: optionalText(1000),
  // Price interpretation depends on currency:
  // - SATS: Integer value in satoshis (e.g., 100000 = 100,000 sats)
  // - Fiat: Decimal value in currency units (e.g., 9.99 = $9.99)
  // For best precision with fiat, consider storing in cents and converting for display
  price: z.number().positive('Price must be positive'),
  currency: z.enum(CURRENCY_CODES).optional(),
  product_type: z
    .enum(PRODUCT_TYPES.map(t => t.value) as [string, ...string[]])
    .default('physical'),
  images: z.array(z.string().url()).optional().default([]),
  thumbnail_url: optionalUrl(),
  inventory_count: z.number().int().min(-1).default(-1), // -1 = unlimited
  fulfillment_type: z
    .enum(PRODUCT_FULFILLMENT_TYPES.map(t => t.value) as [string, ...string[]])
    .default('manual'),
  category: optionalText(50),
  tags: z.array(z.string()).optional().default([]),
  status: z.enum(PRODUCT_STATUSES).default('draft'),
  is_featured: z.boolean().default(false),
});

export const userServiceSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(100, 'Title must be at most 100 characters'),
    description: optionalText(1000),
    category: z.string().min(1, 'Category is required').max(50),
    hourly_rate: z.number().positive().optional().nullable(),
    fixed_price: z.number().positive().optional().nullable(),
    currency: z.enum(CURRENCY_CODES).optional(),
    duration_minutes: z.number().positive().optional().nullable(),
    availability_schedule: availabilityScheduleSchema.optional().nullable(),
    service_location_type: z
      .enum(SERVICE_LOCATION_TYPES.map(t => t.value) as [string, ...string[]])
      .default('remote'),
    service_area: optionalText(200),
    images: z.array(z.string().url()).optional().default([]),
    portfolio_links: z.array(z.string().url()).optional().default([]),
    show_on_profile: z.boolean().optional().default(true),
    status: z.enum(SERVICE_STATUSES).default('draft'),
  })
  .refine(data => data.hourly_rate || data.fixed_price, {
    message: 'At least one pricing method (hourly or fixed) is required',
    path: ['hourly_rate'], // This will show the error on hourly_rate field
  });

export const userCauseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be at most 100 characters'),
  description: optionalText(1000),
  cause_category: z.enum(CAUSE_CATEGORIES),
  goal_amount: z.number().positive().optional().nullable(),
  currency: z.enum(CURRENCY_CODES).optional(),
  bitcoin_address: optionalText(),
  lightning_address: lightningAddressSchema,
  distribution_rules: distributionRulesSchema.optional().nullable(),
  beneficiaries: z.array(beneficiarySchema).optional().default([]),
  status: z.enum(CAUSE_STATUSES).default('draft'),
});

// Types
export type UserProductFormData = z.infer<typeof userProductSchema>;
export type UserServiceFormData = z.infer<typeof userServiceSchema>;
export type UserCauseFormData = z.infer<typeof userCauseSchema>;
