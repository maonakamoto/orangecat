# Entity Cards DRY Unification Plan

**Created:** 2025-01-30  
**Purpose:** Unify all entity cards to use DRY, modular pattern following dev guide

---

## 🎯 Problem Statement

**Current State (Inconsistent):**

- ✅ Products/Services: Use `EntityCard` via `EntityList` (GOOD - modular)
- ❌ Projects: Use `ModernProjectCard` (custom, not DRY)
- ❌ Dashboard Projects: Use `DashboardProjectCard` (duplicate)
- ❌ Organizations: Probably custom cards (need to verify)
- ❌ Circles: Custom cards (will be unified with groups)
- ❓ CommerceCard: Exists but unused (dead code?)

**Violations:**

- ❌ DRY: Multiple card components doing similar things
- ❌ SSOT: EntityCard should be the single card component
- ❌ Modularity: Custom cards instead of extending base

---

## ✅ Solution: Extensible EntityCard Pattern

### Architecture

```
src/components/entity/
  EntityCard.tsx              - Base card (extendable with slots)
  variants/
    ProjectCard.tsx          - Extends EntityCard, adds funding progress
    GroupCard.tsx            - Extends EntityCard, adds type badge
    OrganizationCard.tsx     - Extends EntityCard, adds governance badge
  EntityList.tsx              - Generic list (already good)
```

### Design: Extensible Slots Pattern

**Enhance EntityCard** to support entity-specific content via slots:

```typescript
interface EntityCardProps {
  // Core (all entities)
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  href: string;
  badge?: string;

  // Extensible slots (for entity-specific content)
  headerSlot?: ReactNode; // Custom header (e.g., governance badge)
  progressSlot?: ReactNode; // Progress bar (projects)
  metricsSlot?: ReactNode; // Metrics/stats (projects, orgs)
  footerSlot?: ReactNode; // Custom footer (actions, etc.)

  // Existing props
  metadata?: ReactNode;
  actions?: ReactNode;
  // ... rest
}
```

### Entity-Specific Variants

**ProjectCard** (extends EntityCard):

```typescript
export function ProjectCard({ project, ...props }) {
  return (
    <EntityCard
      {...baseProps}
      progressSlot={<FundingProgressBar project={project} />}
      metricsSlot={<ProjectMetrics project={project} />}
      footerSlot={<ProjectActions project={project} />}
    />
  );
}
```

**GroupCard** (extends EntityCard):

```typescript
export function GroupCard({ group, ...props }) {
  const isCircle = group.type === 'circle';
  return (
    <EntityCard
      {...baseProps}
      headerSlot={<GroupTypeBadge group={group} />}
      metricsSlot={<GroupMetrics group={group} />}
    />
  );
}
```

---

## 📋 Implementation Plan

### Phase 1: Enhance EntityCard (1-2 hours)

**Tasks:**

1. Add extensibility slots to EntityCard:
   - `headerSlot` - Renders above image/title
   - `progressSlot` - Renders progress bar (projects)
   - `metricsSlot` - Renders metrics/stats
   - `footerSlot` - Renders custom footer
2. Ensure backward compatibility (existing usage still works)

3. Update EntityCard to support:
   - Different layouts (grid/list) - already supported
   - Entity-specific content via slots
   - Consistent styling across all entities

**File:** `src/components/entity/EntityCard.tsx`

---

### Phase 2: Create ProjectCard Variant (1-2 hours)

**Tasks:**

1. Create `src/components/entity/variants/ProjectCard.tsx`
2. Extract funding progress logic from ModernProjectCard
3. Extract metrics logic from ModernProjectCard
4. Use EntityCard with slots for project-specific content
5. Support both grid and list view modes

**Result:** ProjectCard extends EntityCard, adds project-specific features

---

### Phase 3: Create GroupCard Variant (1 hour)

**Tasks:**

1. Create `src/components/entity/variants/GroupCard.tsx`
2. Add group type badge (circle/organization)
3. Add member count, governance badge
4. Use EntityCard with slots

**Result:** GroupCard extends EntityCard, adds group-specific features

---

### Phase 4: Replace Custom Cards (2-3 hours)

**Tasks:**

1. Find all `ModernProjectCard` usage → replace with `ProjectCard`
2. Find all `DashboardProjectCard` usage → replace with `ProjectCard` (variant prop)
3. Find all custom organization cards → replace with `OrganizationCard`
4. Find all custom circle cards → replace with `GroupCard`
5. Remove dead code: `CommerceCard` (if unused)
6. Remove `ModernProjectCard.tsx` and `DashboardProjectCard.tsx`

**Files to update:**

- `src/app/projects/page.tsx`
- `src/app/(authenticated)/dashboard/projects/page.tsx`
- `src/components/discover/DiscoverResults.tsx`
- `src/components/profile/ProfileProjectsTab.tsx`
- `src/components/featured/FeaturedCampaigns.tsx`
- Any other project card usage

---

### Phase 5: Verify Consistency (30 min)

**Tasks:**

1. Verify all entities use EntityCard or variants
2. Verify all lists use EntityList
3. Check visual consistency
4. Run linter, fix errors

---

## 🎯 Success Criteria

### Technical

- ✅ Single EntityCard component (extensible)
- ✅ Entity-specific variants extend EntityCard
- ✅ No duplicate card components
- ✅ All entities use EntityCard or variants
- ✅ EntityList used everywhere

### Code Quality

- ✅ DRY: No duplicate card logic
- ✅ SSOT: EntityCard is single source
- ✅ Modular: Variants extend base
- ✅ Consistent: All cards look similar but support differences

### Visual

- ✅ Products/Services/Projects/Organizations/Groups all have consistent look
- ✅ Entity-specific differences (progress, badges) via slots
- ✅ Responsive, accessible, performant

---

## 📊 Current vs Target

### Current (Inconsistent)

```
Products: EntityCard ✅ (good)
Services: EntityCard ✅ (good)
Projects: ModernProjectCard ❌ (custom)
Organizations: ??? ❌ (probably custom)
Circles: Custom cards ❌
```

### Target (DRY & Modular)

```
All Entities: EntityCard (base)
  ├─ Products: EntityCard (base, no extensions)
  ├─ Services: EntityCard (base, no extensions)
  ├─ Projects: ProjectCard (extends EntityCard, adds progress)
  ├─ Organizations: OrganizationCard (extends EntityCard, adds governance)
  └─ Groups: GroupCard (extends EntityCard, adds type badge)
```

---

## 🚨 Priority

**HIGH PRIORITY** - Violates core dev guide principles (DRY, SSOT, Modularity)

**Timing:**

- After Groups Unification Phase 3 (so groups use unified cards)
- Before other refactorings (ensures consistency)

**Estimated Total:** 6-10 hours

---

**Status:** ✅ **PLAN READY**

This will ensure all entity cards are DRY, modular, and consistent while supporting entity-specific differences through extensible slots.
