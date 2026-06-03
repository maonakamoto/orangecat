# Database Compliance Audit

**Created:** 2026-01-05  
**Last Modified:** 2026-01-05  
**Last Modified Summary:** Comprehensive audit of database, backend, and frontend alignment

## Purpose

Verify that database schema, backend API handlers, and frontend validation schemas are perfectly aligned with engineering principles (DRY, SSOT) and the new currency architecture.

## Architecture Summary

**New Architecture:**

- Amounts stored in user's currency (numeric) - NOT satoshis
- Field names: `ticket_price`, `funding_goal`, `price`, `hourly_rate`, `fixed_price`, `goal_amount`
- Old field names (to be removed): `ticket_price_sats`, `funding_goal_sats`, `price_sats`, `hourly_rate_sats`, `fixed_price_sats`, `goal_sats`, `amount_sats`

## Migration Status

### Migration File: `20260105000001_remove_sats_terminology.sql`

**Status:** ✅ Created  
**Applied:** ❓ Unknown (needs verification)

**What it does:**

- Renames `ticket_price_sats` → `ticket_price` (events)
- Renames `funding_goal_sats` → `funding_goal` (events)
- Renames `price_sats` → `price` (products)
- Renames `hourly_rate_sats` → `hourly_rate` (services)
- Renames `fixed_price_sats` → `fixed_price` (services)
- Renames `goal_sats` → `goal_amount` (causes)
- Changes column types from `bigint` to `numeric(20, 8)`

## Compliance Check

### ✅ Frontend Validation Schemas (`src/lib/validation.ts`)

| Entity        | Field                 | Status     | Notes    |
| ------------- | --------------------- | ---------- | -------- |
| Events        | `ticket_price`        | ✅ Updated | Line 506 |
| Events        | `funding_goal`        | ✅ Updated | Line 509 |
| Products      | `price`               | ✅ Updated | Line 262 |
| Services      | `hourly_rate`         | ✅ Updated | Line 310 |
| Services      | `fixed_price`         | ✅ Updated | Line 311 |
| Causes        | `goal_amount`         | ✅ Updated | Line 332 |
| AI Assistants | `price_per_message`   | ✅ Updated | Line 374 |
| AI Assistants | `price_per_1k_tokens` | ✅ Updated | Line 375 |
| AI Assistants | `subscription_price`  | ✅ Updated | Line 376 |

**Status:** ✅ COMPLIANT

### ✅ Backend API Handlers

| Handler                       | Field                 | Status     | Notes   |
| ----------------------------- | --------------------- | ---------- | ------- |
| `events/[id]/route.ts`        | `ticket_price`        | ✅ Updated | Line 43 |
| `events/[id]/route.ts`        | `funding_goal`        | ✅ Updated | Line 47 |
| `products/[id]/route.ts`      | `price`               | ✅ Updated | Line 19 |
| `services/[id]/route.ts`      | `hourly_rate`         | ✅ Updated | Line 20 |
| `services/[id]/route.ts`      | `fixed_price`         | ✅ Updated | Line 21 |
| `causes/[id]/route.ts`        | `goal_amount`         | ✅ Updated | Line 19 |
| `ai-assistants/[id]/route.ts` | `price_per_message`   | ✅ Updated | Line 39 |
| `ai-assistants/[id]/route.ts` | `price_per_1k_tokens` | ✅ Updated | Line 40 |
| `ai-assistants/[id]/route.ts` | `subscription_price`  | ✅ Updated | Line 41 |

**Status:** ✅ COMPLIANT

### ⚠️ Remaining References to Old Field Names

**Files with old `_sats` references (52 files found):**

These files likely contain:

1. Type definitions (database types)
2. Legacy code that needs updating
3. Display/formatting logic
4. Entity configs

**Priority Files to Update:**

- `src/types/database.ts` - Database type definitions
- `src/config/entity-configs/*.ts` - Entity form configs
- `src/config/entities/*.tsx` - Entity display configs
- `src/config/database-columns.ts` - Column mappings

## Action Items

### 1. Apply Migration (CRITICAL)

```bash
# Apply the migration to update database schema
node scripts/db/apply-migration.js supabase/migrations/20260105000001_remove_sats_terminology.sql
```

### 2. Update Type Definitions

**File:** `src/types/database.ts`

Update all type definitions to use new field names:

- `ticket_price_sats` → `ticket_price`
- `funding_goal_sats` → `funding_goal`
- `price_sats` → `price`
- `hourly_rate_sats` → `hourly_rate`
- `fixed_price_sats` → `fixed_price`
- `goal_sats` → `goal_amount`

### 3. Update Entity Configs

**Files:**

- `src/config/entity-configs/product-config.ts`
- `src/config/entity-configs/service-config.ts`
- `src/config/entity-configs/cause-config.ts`
- `src/config/entity-configs/ai-assistant-config.ts`

Update field names in form configurations.

### 4. Update Entity Display Configs

**Files:**

- `src/config/entities/products.tsx`
- `src/config/entities/services.tsx`
- `src/config/entities/causes.tsx`
- `src/config/entities/ai-assistants.tsx`

Update display logic to use new field names.

### 5. Update Database Column Mappings

**File:** `src/config/database-columns.ts`

Update column name mappings to reflect new schema.

## Engineering Principles Compliance

### ✅ DRY (Don't Repeat Yourself)

**Status:** ✅ COMPLIANT

- Generic API handlers (`entityCrudHandler.ts`) used by all entities
- Single validation schema per entity
- Shared update payload builder

### ✅ SSOT (Single Source of Truth)

**Status:** ✅ COMPLIANT

- Currency codes: `src/config/currencies.ts`
- Entity metadata: `src/config/entity-registry.ts`
- Validation schemas: `src/lib/validation.ts`

**⚠️ Issue:** Database schema defined in migrations, but types may be out of sync

### ✅ Type Safety

**Status:** ⚠️ NEEDS ATTENTION

- Frontend schemas updated ✅
- Backend handlers updated ✅
- Database types need updating ⚠️

## Testing Checklist

After applying migration and updating types:

- [ ] Create event with `ticket_price` in USD
- [ ] Create product with `price` in CHF
- [ ] Create service with `hourly_rate` in EUR
- [ ] Create cause with `goal_amount` in BTC
- [ ] Update event with new `funding_goal`
- [ ] Verify database columns match API expectations
- [ ] Verify frontend forms submit correct field names
- [ ] Verify display components show correct values

## Next Steps

1. **Apply migration** - Update database schema
2. **Update types** - Sync TypeScript types with database
3. **Update configs** - Update entity configs and display logic
4. **Test** - Verify end-to-end functionality
5. **Document** - Update any remaining documentation

## Summary

| Layer                   | Status          | Action Required      |
| ----------------------- | --------------- | -------------------- |
| **Database Migration**  | ✅ Created      | Apply migration      |
| **Frontend Validation** | ✅ Updated      | None                 |
| **Backend Handlers**    | ✅ Updated      | None                 |
| **Type Definitions**    | ⚠️ Needs Update | Update `database.ts` |
| **Entity Configs**      | ⚠️ Needs Update | Update config files  |
| **Display Logic**       | ⚠️ Needs Update | Update entity files  |

**Overall Status:** 🟡 **MOSTLY COMPLIANT** - Migration and types need attention
