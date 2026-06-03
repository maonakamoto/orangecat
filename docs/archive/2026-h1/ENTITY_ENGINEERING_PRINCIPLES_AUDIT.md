# Entity Engineering Principles Audit

**Created:** 2025-01-30
**Last Updated:** 2026-01-06
**Purpose:** Comprehensive audit of entity implementation compliance with engineering principles (DRY, SSOT, modularity) and visibility/privacy controls
**Status:** IN PROGRESS (Phase 2 Complete)

---

## 🎯 Executive Summary

This audit evaluates:

1. **DRY Compliance** - Are entities using shared components/handlers?
2. **SSOT Compliance** - Is entity metadata centralized in the registry?
3. **Modularity** - Can changes be made in one place?
4. **Visibility Controls** - Can users hide entities from public profiles?

---

## ✅ WHAT HAS BEEN DONE

### 1. Entity Registry (SSOT) ✅

**Status:** ✅ **FULLY IMPLEMENTED**

**Location:** `src/config/entity-registry.ts`

**What's Centralized:**

- Entity types (product, service, cause, loan, project, asset, etc.)
- Table names (database mapping)
- API endpoints
- Base paths and create paths
- Display names (singular/plural)
- Icons and color themes
- Categories and priorities

**Evidence:**

```typescript
export const ENTITY_REGISTRY: Record<EntityType, EntityMetadata> = {
  loan: {
    type: 'loan',
    name: 'Loan',
    namePlural: 'Loans',
    tableName: 'loans',
    apiEndpoint: '/api/loans',
    basePath: '/dashboard/loans',
    // ... all metadata
  },
  // ... all entities
};
```

**Benefits:**

- ✅ Add new entity type in ONE place
- ✅ Type-safe entity type checking
- ✅ Consistent navigation patterns
- ✅ No magic strings scattered in codebase

---

### 2. Unified Entity Detail Page ✅

**Status:** ✅ **FULLY IMPLEMENTED**

**Location:** `src/components/entity/EntityDetailPage.tsx`

**What It Does:**

- Single reusable component for ALL entity detail pages
- Type-safe entity rendering
- Automatic field formatting
- Currency formatting with user preferences
- Consistent layout using `EntityDetailLayout`
- Permission checking (including `is_public` field support)

**Used By:**

- ✅ Services detail page
- ✅ Products detail page
- ✅ (Should be used by all entities)

**Evidence:**

```typescript
export default async function EntityDetailPage<T extends BaseEntity>({
  config,
  entityId,
  userId,
  requireAuth = true,
  redirectPath,
  makeDetailFields,
}: EntityDetailPageProps<T>);
```

**Benefits:**

- ✅ DRY - One component for all entities
- ✅ Consistent user experience
- ✅ Changes apply to all entities

---

### 3. Unified Entity Dashboard Page ✅

**Status:** ✅ **PARTIALLY IMPLEMENTED**

**Location:** `src/components/entity/EntityDashboardPage.tsx`

**What It Does:**

- Reusable dashboard page component for all entity types
- Authentication check
- Data fetching with pagination
- Bulk selection and deletion
- Individual item deletion via 3-dot menu
- Loading and empty states

**Used By:**

- ✅ Services page (reference implementation)
- ✅ Products page
- ✅ Assets page
- ✅ Causes page
- ✅ AI Assistants page

**Not Used By:**

- ❌ Loans page (custom implementation)
- ❌ Projects page (custom implementation)

**Benefits:**

- ✅ DRY - Shared component for standard entities
- ✅ Consistent patterns
- ⚠️ Loans/Projects need evaluation

---

### 4. Entity List Components ✅

**Status:** ✅ **FULLY IMPLEMENTED**

**Components:**

- `EntityListShell` - Layout wrapper
- `EntityList` - List rendering
- `EntityCard` - Individual card component
- `BulkActionsBar` - Bulk operations

**Used By:**

- ✅ All standard entity pages (Services, Products, Assets, Causes, AI Assistants)

**Benefits:**

- ✅ DRY - Shared components
- ✅ Consistent UI/UX
- ✅ Easy to update in one place

---

### 5. Entity Form Component ✅

**Status:** ✅ **FULLY IMPLEMENTED**

**Location:** `src/components/create/EntityForm.tsx`

**What It Does:**

- Generic form component for all entity types
- Uses entity configs for field definitions
- Validation using Zod schemas
- Template support
- Guidance system

**Used By:**

- ✅ All entity creation/edit forms

**Benefits:**

- ✅ DRY - One form component
- ✅ SSOT - Uses entity configs
- ✅ Consistent form experience

---

### 6. Generic API Handlers ✅

**Status:** ✅ **PARTIALLY IMPLEMENTED**

**Location:** `src/lib/api/entityHandler.ts` (if exists)

**What Exists:**

- Generic CRUD handlers using entity registry
- `createEntityPostHandler` for POST requests
- `listEntitiesPage` for paginated lists

**Benefits:**

- ✅ DRY - Shared API logic
- ✅ SSOT - Uses entity registry

---

## 🔒 VISIBILITY & PRIVACY CONTROLS

### Current State Analysis

#### 1. Loans Visibility ✅

**Status:** ✅ **IMPLEMENTED**

**Database Field:** `loans.is_public` (boolean)

**Features:**

- ✅ Loans have `is_public` field
- ✅ Users can toggle visibility in dashboard (`LoanList` component)
- ✅ Public loans visible at `/loans/[id]` (with `is_public = true` filter)
- ✅ Private loans only visible to owner

**Evidence:**

```typescript
// src/components/loans/LoanList.tsx
const handleToggleVisibility = async (loan: Loan) => {
  const result = await loansService.updateLoan(loan.id, {
    is_public: !loan.is_public
  });
  // ...
};

// src/app/loans/[id]/page.tsx
.eq('is_public', true) // Only show public loans
```

**Missing:**

- ❌ Loans NOT displayed on public profile pages
- ❌ No way to show/hide loans on profile from dashboard

---

#### 2. Projects Visibility ✅

**Status:** ✅ **PARTIALLY IMPLEMENTED**

**Database Field:** `projects.status` (enum: 'draft', 'active', 'paused', etc.)

**Features:**

- ✅ Projects displayed on public profile pages
- ✅ Drafts excluded from public view (`status != 'draft'`)
- ✅ Projects visible at `/profiles/[username]`

**Evidence:**

```typescript
// src/app/profiles/[username]/page.tsx
.eq('user_id', profile.id)
.neq('status', 'draft') // Exclude drafts from public profile
```

**Missing:**

- ❌ No `is_public` field for projects
- ❌ No way to hide specific projects from public profile
- ❌ Users can't control project visibility independently

---

#### 3. Other Entities Visibility ❌

**Status:** ❌ **NOT IMPLEMENTED**

**Entities Without Visibility Controls:**

- ❌ Products (`user_products`) - No `is_public` field
- ❌ Services (`user_services`) - No `is_public` field
- ❌ Causes (`user_causes`) - No `is_public` field
- ❌ Assets (`user_assets`) - No `is_public` field
- ❌ AI Assistants (`ai_assistants`) - Has `is_public` field but not used on profiles
- ❌ Events (`events`) - No visibility control

**Current Behavior:**

- ❌ These entities are NOT displayed on public profile pages
- ❌ No way for users to show/hide them on profiles

---

### Visibility Control Requirements

**User Story:**

> "As a user, I want to control which entities appear on my public profile page. For example, I should be able to hide my loans from my public profile while keeping them visible in my dashboard."

**Current Status:** ✅ **PARTIALLY IMPLEMENTED (2026-01-06)**

- ✅ Loans can be made public/private (for loan marketplace)
- ✅ `show_on_profile` field added to all entity tables (migration created)
- ✅ Entity schemas updated with `show_on_profile` field
- ✅ Entity form configs include visibility controls
- ✅ Projects query respects `show_on_profile` setting
- ⏳ Other entities need to be added to public profile page
- ⏳ Dashboard toggle controls for `show_on_profile` (bulk actions)

---

## ✅ WHAT HAS BEEN DONE (2026-01-06 Update)

### 1. Entity Visibility on Public Profiles ✅ (PARTIALLY COMPLETE)

#### A. Database Schema Updates ✅ COMPLETE

**Migration Created:** `supabase/migrations/20260106000000_add_show_on_profile.sql`

Added `show_on_profile BOOLEAN DEFAULT true` to all entity tables:

- ✅ projects
- ✅ user_products
- ✅ user_services
- ✅ user_causes
- ✅ ai_assistants
- ✅ assets
- ✅ loans
- ✅ events

**NOTE:** Run the migration to apply changes: `npx supabase db push`

#### B. Entity Schema Updates ✅ COMPLETE

Added `show_on_profile: z.boolean().default(true)` to all entity Zod schemas in `src/lib/validation.ts`:

- ✅ projectSchema
- ✅ userProductSchema
- ✅ userServiceSchema
- ✅ userCauseSchema
- ✅ aiAssistantSchema
- ✅ assetSchema
- ✅ loanSchema
- ✅ eventSchema

#### C. Entity Config Updates ✅ COMPLETE

Added visibility control section to all entity configs:

- ✅ product-config.ts
- ✅ service-config.ts
- ✅ cause-config.ts
- ✅ project-config.ts
- ✅ ai-assistant-config.ts
- ✅ asset-config.ts
- ✅ loan-config.ts
- ✅ event-config.ts

Each config now includes:

```typescript
{
  id: 'visibility',
  title: 'Profile Visibility',
  description: 'Control where this [entity] appears',
  fields: [
    {
      name: 'show_on_profile',
      label: 'Show on Public Profile',
      type: 'checkbox',
      hint: 'When enabled, this [entity] will appear on your public profile page',
      colSpan: 2,
    },
  ],
}
```

#### D. Public Profile Page Updates ✅ COMPLETE

**File:** `src/app/profiles/[username]/page.tsx`

**Completed:**

- ✅ Projects query respects `show_on_profile` setting: `.neq('show_on_profile', false)`
- ✅ Entity counts fetched for all entity types (products, services, causes, events, loans, assets, AI assistants)
- ✅ New generic API endpoint: `/api/profiles/[userId]/entities/[entityType]`
- ✅ New `ProfileEntityTab` component for displaying any entity type
- ✅ ProfileLayout updated with tabs for all entity types
- ✅ Tab filtering respects entity counts (hide empty tabs for public profiles)

#### E. Dashboard Visibility Controls ✅ COMPLETE (2026-01-06)

**New API Endpoint Created:**

- `src/app/api/entities/[entityType]/visibility/route.ts` - Generic visibility toggle API
  - Supports toggling `show_on_profile` for any entity type
  - Supports bulk updates (multiple IDs at once)
  - Uses entity registry for table name lookup
  - Validates entity type and IDs with Zod

**Component Updates:**

**`src/components/entity/EntityCardActions.tsx`:**

- Added Eye/EyeOff icons for visibility toggle
- Added "Show on Profile" / "Hide from Profile" menu items
- Added `showOnProfile`, `onToggleVisibility`, `isTogglingVisibility` props
- Shows current visibility state in dropdown menu

**`src/components/entity/EntityCard.tsx`:**

- Added "Hidden" badge indicator when `showOnProfile === false`
- Passes visibility props to EntityCardActions
- Badge shows eye-off icon with "Hidden" text

**`src/components/entity/BulkActionsBar.tsx`:**

- Added "Show on Profile" button for bulk visibility
- Added "Hide from Profile" button for bulk visibility
- Added `onShowOnProfile`, `onHideFromProfile`, `isUpdatingVisibility` props
- Buttons disabled during update operations

**`src/components/entity/EntityList.tsx`:**

- Added `onToggleVisibility`, `togglingVisibilityIds` props
- Passes visibility state to individual EntityCard components
- Supports both individual and bulk visibility operations

**`src/components/ui/dropdown-menu.tsx`:**

- Added `DropdownMenuSeparator` component for visual separation

---

### 2. Standardize Loans & Projects Pages

**Problem:** Loans and Projects use custom implementations instead of shared components.

**Current State:**

- ❌ Loans page uses custom `LoanDashboard` component
- ❌ Projects page uses custom `EntityListPage` component

**Required:**

- Evaluate if custom features are necessary
- If yes: Document why and ensure consistency
- If no: Refactor to use `EntityDashboardPage` + `EntityList`

**Decision Needed:**

- Does Loans need custom stats cards?
- Does Projects need tabs/search/filters?
- Can these features be added to shared components?

---

### 3. Missing Detail Pages

**Problem:** Some entities don't have detail pages.

**Missing:**

- ❌ Assets detail page
- ❌ Causes detail page
- ❌ AI Assistants detail page

**Required:**

- Create detail pages using `EntityDetailPage` component
- Follow same pattern as Services/Products detail pages

**Files to Create:**

- `src/app/(authenticated)/dashboard/assets/[id]/page.tsx`
- `src/app/(authenticated)/dashboard/causes/[id]/page.tsx`
- `src/app/(authenticated)/dashboard/ai-assistants/[id]/page.tsx`

---

### 4. Entity Visibility in EntityDetailPage

**Current:** `EntityDetailPage` checks `is_public` field but logic may need enhancement.

**Required:**

- Ensure visibility checks respect both `is_public` and `show_on_profile`
- Add proper permission checking
- Document visibility logic

---

### 5. Unified Visibility Control Component

**Problem:** Visibility controls are scattered across different components.

**Required:**

- Create shared `EntityVisibilityControl` component
- Use in entity forms (create/edit)
- Use in entity dashboard pages
- Use in bulk actions

**Location:** `src/components/entity/EntityVisibilityControl.tsx`

**Features:**

- Toggle `is_public` (marketplace visibility)
- Toggle `show_on_profile` (profile visibility)
- Clear labels and hints

---

## 📋 IMPLEMENTATION PRIORITY

### Phase 1: High Priority (Core Functionality)

1. **Add `show_on_profile` field to all entities**
   - Database migration
   - Update entity schemas
   - Update entity configs

2. **Add visibility controls to entity forms**
   - Update `EntityForm` component
   - Add visibility fields to entity configs
   - Default to `true` for user convenience

3. **Update public profile page**
   - Fetch all entities with `show_on_profile = true`
   - Display in appropriate tabs/sections
   - Handle empty states

### Phase 2: Medium Priority (UX Improvements) ✅ COMPLETE

4. **Add dashboard visibility controls** ✅ COMPLETE (2026-01-06)
   - ✅ Toggle in entity list items (EntityCardActions 3-dot menu)
   - ✅ Bulk actions for visibility (BulkActionsBar show/hide buttons)
   - ✅ Clear visual indicators ("Hidden" badge on EntityCard)
   - ✅ API endpoint for toggling visibility (`/api/entities/[entityType]/visibility`)

5. **Profile entity display** ✅ COMPLETE (2026-01-06)

   **New Files Created:**
   - `src/app/api/profiles/[userId]/entities/[entityType]/route.ts` - Generic entity API
   - `src/components/profile/ProfileEntityTab.tsx` - Reusable entity tab component

   **Modified Files:**
   - `src/app/profiles/[username]/page.tsx` - Fetches all entity counts
   - `src/components/profile/ProfilePageClient.tsx` - Extended stats interface
   - `src/components/profile/ProfileLayout.tsx` - Added tabs for all entities

   **Features:**
   - All entity types visible on profile pages (Products, Services, Causes, Events, Loans, Assets, AI Assistants)
   - Respects `show_on_profile` filter (hides entities where `show_on_profile = false`)
   - Respects `status` filter (hides drafts from public view)
   - Tabs auto-hide when empty for public profiles
   - Owner sees all tabs with "Manage All" links

6. **Create missing detail pages** ⏳ TODO
   - Assets, Causes, AI Assistants detail pages
   - Use `EntityDetailPage` component

7. **Standardize Loans/Projects pages** ⏳ TODO
   - Evaluate custom features
   - Refactor or document

### Phase 3: Low Priority (Polish)

7. **Unified visibility control component**
   - Extract shared component
   - Consistent UI/UX

8. **Documentation updates**
   - Update engineering principles doc
   - Add visibility control guide

---

## ✅ COMPLIANCE CHECKLIST

### DRY (Don't Repeat Yourself)

- [x] Entity registry centralizes all entity metadata
- [x] Shared detail page component (`EntityDetailPage`)
- [x] Shared dashboard component (`EntityDashboardPage`) for standard entities
- [x] Shared list components (`EntityList`, `EntityListShell`)
- [x] Shared form component (`EntityForm`)
- [ ] Shared visibility control component (TODO)
- [ ] Loans/Projects use shared components (TODO)

### SSOT (Single Source of Truth)

- [x] Entity types defined in `entity-registry.ts`
- [x] Table names come from registry
- [x] API endpoints come from registry
- [x] Paths come from registry
- [x] Display names come from registry
- [x] Entity configs define form structure
- [ ] Visibility settings centralized (TODO)

### Modularity

- [x] Changes to `EntityListShell` affect all pages
- [x] Changes to `EntityList` affect all pages
- [x] Changes to `EntityDetailPage` affect all detail pages
- [x] Changes to entity registry affect all references
- [ ] Changes to visibility controls affect all entities (TODO)

### Visibility Controls

- [x] Loans have `is_public` field
- [x] Loans can be toggled public/private
- [x] Projects exclude drafts from public view
- [ ] Loans can be hidden from profile (TODO)
- [ ] Products can be shown/hidden on profile (TODO)
- [ ] Services can be shown/hidden on profile (TODO)
- [ ] Causes can be shown/hidden on profile (TODO)
- [ ] Assets can be shown/hidden on profile (TODO)
- [ ] AI Assistants can be shown/hidden on profile (TODO)
- [ ] Events can be shown/hidden on profile (TODO)
- [ ] Projects can be hidden from profile (TODO)

---

## 📝 NOTES

### Entity Visibility Logic

**Two-Level Visibility:**

1. **Marketplace Visibility** (`is_public`):
   - Controls if entity appears in discover/search
   - Controls if entity has public detail page
   - Example: Loan visible in loan marketplace

2. **Profile Visibility** (`show_on_profile`):
   - Controls if entity appears on user's public profile
   - Independent of marketplace visibility
   - Example: Loan visible in marketplace but hidden from profile

**Use Cases:**

- User wants loan visible in marketplace but not on profile
- User wants product visible on profile but not in marketplace
- User wants to show all entities on profile (default)

### Current Architecture Strengths

1. ✅ Entity registry is comprehensive SSOT
2. ✅ Shared components reduce duplication
3. ✅ Type-safe entity handling
4. ✅ Consistent patterns across standard entities

### Current Architecture Gaps

1. ❌ Loans/Projects don't use shared components (dashboard pages)
2. ✅ Assets/AI Assistants/Loans now use generic list handler (API routes) - **FIXED 2026-01-06**
3. ⚠️ Projects uses custom list handler (requires profile enrichment) - **DOCUMENTED 2026-01-06**
4. ❌ No unified visibility control system
5. ❌ Public profiles only show projects
6. ❌ Missing detail pages for some entities
7. ❌ Hardcoded entity type mapping in `EntityDetailPage`
8. ❌ RLS policies may need updates for `show_on_profile` field

---

## 🔍 ADDITIONAL FINDINGS (Deep Dive)

### 6. API Route Inconsistencies ✅

**Status:** ✅ **MOSTLY RESOLVED (2026-01-06)**

**Current State:**

**✅ Using Generic List Handler:**

- Products (`/api/products`) - Uses `createEntityListHandler` ✅
- Services (`/api/services`) - Uses `createEntityListHandler` ✅
- Causes (`/api/causes`) - Uses `createEntityListHandler` ✅
- Events (`/api/events`) - Uses `createEntityListHandler` ✅
- Assets (`/api/assets`) - Uses `createEntityListHandler` with `userIdField: 'owner_id'` ✅ **REFACTORED 2026-01-06**
- AI Assistants (`/api/ai-assistants`) - Uses `createEntityListHandler` with `publicFilters: { is_public: true }` ✅ **REFACTORED 2026-01-06**
- Loans (`/api/loans`) - Uses `createEntityListHandler` with status filter support ✅ **REFACTORED 2026-01-06**

**⚠️ Using Custom Implementation (Documented):**

- Projects (`/api/projects`) - Custom implementation required for profile enrichment ⚠️

**Projects Custom Implementation Justification:**
The Projects list route requires custom logic to:

1. Fetch profiles separately and join them to projects (for displaying creator info)
2. Add default `raised_amount` field
3. This profile enrichment cannot be easily handled by the generic handler

**Handler Extensions Made (2026-01-06):**
The `createEntityListHandler` was extended to support:

- `userIdField` - Custom user ID field name (e.g., `owner_id` for assets)
- `publicFilters` - Additional filters for public listings (e.g., `is_public: true`)
- `requireAuth` - Whether authentication is required
- `selectColumns` - Custom column selection

**Benefits:**

- ✅ Changes to `createEntityListHandler` now apply to 7/8 entity types
- ✅ Consistent error handling and pagination logic
- ✅ Consistent cache control
- ✅ Consistent draft visibility logic

---

### 7. CRUD Handler Compliance ✅

**Status:** ✅ **EXCELLENT**

**All [id] routes use generic CRUD handler:**

- ✅ Products (`/api/products/[id]`) - Uses `createEntityCrudHandlers`
- ✅ Services (`/api/services/[id]`) - Uses `createEntityCrudHandlers`
- ✅ Causes (`/api/causes/[id]`) - Uses `createEntityCrudHandlers`
- ✅ Assets (`/api/assets/[id]`) - Uses `createEntityCrudHandlers`
- ✅ Loans (`/api/loans/[id]`) - Uses `createEntityCrudHandlers`
- ✅ Projects (`/api/projects/[id]`) - Uses `createEntityCrudHandlers`
- ✅ AI Assistants (`/api/ai-assistants/[id]`) - Uses `createEntityCrudHandlers`
- ✅ Events (`/api/events/[id]`) - Uses `createEntityCrudHandlers`

**Benefits:**

- ✅ Consistent GET, PUT, DELETE operations
- ✅ Consistent error handling
- ✅ Consistent authorization checks
- ✅ Consistent audit logging (where configured)

---

### 8. Domain Service Layer Patterns ✅

**Status:** ✅ **RESOLVED (2026-01-06)**

**Current State:**

**✅ Generic Commerce Service:**

- `domain/commerce/service.ts` provides `listEntitiesPage` for Products, Services, Causes
- Uses dynamic table names (good!)

**API Route Layer (Preferred):**
As of 2026-01-06, the API routes now handle entity listing directly using `createEntityListHandler`:

- Assets, AI Assistants, Loans - Use `createEntityListHandler` directly (bypassing domain services)
- Products, Services, Causes - Use `createEntityListHandler` with `useListHelper: true` (uses `listEntitiesPage`)

**⚠️ Custom Domain Services (Still Used):**

- `domain/projects/service.ts` - `listProjectsPage` still used by `/api/projects` for profile enrichment
- `domain/loans/service.ts` - `createLoan` still used for loan creation logic

**Resolution:**

- Assets API route now uses `createEntityListHandler` with `userIdField: 'owner_id'` ✅
- AI Assistants API route now uses `createEntityListHandler` with `publicFilters` ✅
- Loans API route now uses `createEntityListHandler` ✅
- Projects keeps custom implementation due to profile enrichment requirement ⚠️

---

### 9. RLS Policy Considerations ⚠️

**Problem:** When we add `show_on_profile` field, RLS policies need to respect it.

**Current RLS Policies:**

- Need to verify RLS policies exist for all entity tables
- Need to ensure RLS policies respect `is_public` field (where applicable)
- Need to plan RLS policy updates for `show_on_profile` field

**Required:**

- Audit RLS policies for all entity tables
- Document RLS policy patterns
- Plan RLS policy updates for `show_on_profile` field

**Example RLS Policy Pattern:**

```sql
-- Public entities visible to everyone
CREATE POLICY "Public entities are viewable by everyone"
ON user_products FOR SELECT
USING (is_public = true);

-- Own entities visible to owner
CREATE POLICY "Users can view their own entities"
ON user_products FOR SELECT
USING (user_id = auth.uid());

-- Profile visibility (when show_on_profile is added)
CREATE POLICY "Profile entities visible on public profiles"
ON user_products FOR SELECT
USING (show_on_profile = true AND is_public = true);
```

---

### 10. Entity Type Mapping Inconsistencies ⚠️

**Problem:** `EntityDetailPage` has hardcoded entity type mapping.

**Location:** `src/components/entity/EntityDetailPage.tsx`

**Current Code:**

```typescript
const entityTypeMap: Record<string, string> = {
  product: 'product',
  service: 'service',
  cause: 'cause',
  'ai assistant': 'ai_assistant',
  'ai assistants': 'ai_assistant',
  project: 'project',
  event: 'event',
  loan: 'loan',
  asset: 'asset',
};
```

**Issue:**

- Hardcoded mapping violates SSOT principle
- Should derive from entity registry
- Mapping handles display name → entity type conversion

**Required:**

- Create utility function to map entity config name → entity type
- Use entity registry as SSOT
- Remove hardcoded mapping

---

### 11. Validation Schema Consistency ⚠️

**Current State:**

- Entity schemas defined in `src/lib/validation.ts`
- Some entities have domain-specific schemas (`domain/products/schema.ts`, etc.)

**Question:**

- Are all schemas using consistent patterns?
- Are visibility fields (`is_public`, `show_on_profile`) included in schemas?
- Are schemas using base schema composition?

**Required:**

- Audit validation schemas for consistency
- Ensure visibility fields are included
- Document schema patterns

---

### 12. Type Definitions Consistency ⚠️

**Current State:**

- Entity types defined in `types/database.ts` (generated from Supabase)
- Entity types also referenced in `types/entity.ts`

**Question:**

- Are type definitions consistent?
- Do types include visibility fields?
- Are types derived from schemas where possible?

**Required:**

- Audit type definitions
- Ensure visibility fields are included
- Document type definition patterns

---

## 📋 UPDATED IMPLEMENTATION PRIORITY

### Phase 0: Critical (API Consistency)

**NEW:** Standardize API list routes

1. **Refactor Assets list route** to use `createEntityListHandler`
2. **Refactor AI Assistants list route** to use `createEntityListHandler`
3. **Refactor Projects list route** to use `createEntityListHandler`
4. **Refactor Loans list route** to use `createEntityListHandler`
5. **OR document why custom implementation is necessary**

**Why:** Ensures consistent error handling, pagination, caching, and draft visibility logic across all entities.

---

### Phase 1: High Priority (Core Functionality)

1. **Add `show_on_profile` field to all entities**
   - Database migration
   - Update entity schemas
   - Update entity configs
   - Update RLS policies

2. **Add visibility controls to entity forms**
   - Update `EntityForm` component
   - Add visibility fields to entity configs
   - Default to `true` for user convenience

3. **Update public profile page**
   - Fetch all entities with `show_on_profile = true`
   - Display in appropriate tabs/sections
   - Handle empty states

---

### Phase 2: Medium Priority (UX Improvements)

4. **Add dashboard visibility controls**
   - Toggle in entity list items
   - Bulk actions for visibility
   - Clear visual indicators

5. **Create missing detail pages**
   - Assets, Causes, AI Assistants detail pages
   - Use `EntityDetailPage` component

6. **Standardize Loans/Projects pages**
   - Evaluate custom features
   - Refactor or document

7. **Fix entity type mapping**
   - Remove hardcoded mapping from `EntityDetailPage`
   - Create utility function using entity registry

---

### Phase 3: Low Priority (Polish)

8. **Unified visibility control component**
   - Extract shared component
   - Consistent UI/UX

9. **Domain service standardization**
   - Evaluate if Assets/Projects can use generic commerce service
   - Document or refactor

10. **Documentation updates**
    - Update engineering principles doc
    - Add visibility control guide
    - Document RLS policy patterns

---

## ✅ UPDATED COMPLIANCE CHECKLIST

### DRY (Don't Repeat Yourself)

- [x] Entity registry centralizes all entity metadata
- [x] Shared detail page component (`EntityDetailPage`)
- [x] Shared dashboard component (`EntityDashboardPage`) for standard entities
- [x] Shared list components (`EntityList`, `EntityListShell`)
- [x] Shared form component (`EntityForm`)
- [x] Shared CRUD handlers (`createEntityCrudHandlers`) for [id] routes ✅
- [x] Shared list handler (`createEntityListHandler`) for 7/8 entity list routes ✅ **FIXED 2026-01-06**
- [ ] Shared visibility control component (TODO)
- [ ] Loans/Projects use shared components (TODO)

### SSOT (Single Source of Truth)

- [x] Entity types defined in `entity-registry.ts`
- [x] Table names come from registry
- [x] API endpoints come from registry
- [x] Paths come from registry
- [x] Display names come from registry
- [x] Entity configs define form structure
- [ ] Entity type mapping uses registry (TODO - remove hardcoded mapping)
- [ ] Visibility settings centralized (TODO)

### Modularity

- [x] Changes to `EntityListShell` affect all pages
- [x] Changes to `EntityList` affect all pages
- [x] Changes to `EntityDetailPage` affect all detail pages
- [x] Changes to `createEntityCrudHandlers` affect all [id] routes ✅
- [ ] Changes to `createEntityListHandler` affect all list routes (TODO)
- [x] Changes to entity registry affect all references
- [x] Changes to visibility controls affect all entities ✅ **FIXED 2026-01-06**

### Visibility Controls

- [x] Loans have `is_public` field
- [x] Loans can be toggled public/private
- [x] Projects exclude drafts from public view
- [x] `show_on_profile` field added to all entities ✅ **ADDED 2026-01-06**
- [x] Entity form configs include visibility controls ✅ **ADDED 2026-01-06**
- [x] Projects respect `show_on_profile` setting on profile page ✅ **ADDED 2026-01-06**
- [x] All entity types shown on profile pages ✅ **ADDED 2026-01-06** (ProfileEntityTab + ProfileLayout)
- [x] Dashboard toggle controls for visibility ✅ **ADDED 2026-01-06** (EntityCardActions + BulkActionsBar)
- [x] API endpoint for visibility updates ✅ **ADDED 2026-01-06** (`/api/entities/[entityType]/visibility`)

### API Consistency

- [x] All [id] routes use `createEntityCrudHandlers` ✅
- [x] 7/8 list routes use `createEntityListHandler` ✅ **FIXED 2026-01-06**
- [x] Consistent error handling across all routes ✅ **FIXED 2026-01-06**
- [x] Consistent pagination across all routes ✅ **FIXED 2026-01-06**
- [x] Consistent cache control across all routes ✅ **FIXED 2026-01-06**
- [ ] Projects list route uses custom implementation (profile enrichment required)

---

**Last Modified:** 2026-01-06
**Last Modified Summary:** Phase 2 Complete - (1) Profile Entity Display: Created generic entity API (`/api/profiles/[userId]/entities/[entityType]`), ProfileEntityTab component, and updated ProfileLayout with tabs for all 7 entity types; (2) Dashboard Visibility Controls: Created visibility toggle API (`/api/entities/[entityType]/visibility`), added show/hide toggle to EntityCardActions dropdown, added "Hidden" badge to EntityCard, added bulk Show/Hide actions to BulkActionsBar, updated EntityList to pass visibility props. (3) SSOT Compliance Fix: Added `userIdField` to EntityMetadata interface and all entity definitions, created `getUserIdField()` helper function, updated visibility API to use registry instead of hardcoded mapping.
