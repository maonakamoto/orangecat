# Proposal-to-Project Flow: Infrastructure Analysis

**Created:** 2025-12-30  
**Question:** Can an individual member propose a project, have the group vote, and if it passes, create a project owned by the group?

---

## 🎯 The Flow You Described

```
Individual Member (of group)
  ↓
Wants to create a project
  ↓
Instead of directly creating project, creates PROPOSAL
  ↓
Proposal Type: "Create Project"
  ↓
Group votes on proposal
  ↓
If passes → Project created (owned by group)
If fails → No project created
```

**Key Insight:** This is a **two-step process**:

1. **Proposal** (voting phase)
2. **Project** (execution phase, only if proposal passes)

---

## ✅ Infrastructure Check

### 1. Database Schema

#### ✅ Proposals Table Exists

```sql
CREATE TABLE group_proposals (
  id uuid PRIMARY KEY,
  group_id uuid REFERENCES groups(id),
  proposer_id uuid REFERENCES auth.users(id),
  title text NOT NULL,
  description text,
  proposal_type text DEFAULT 'general',
  status text DEFAULT 'draft',
  action_type text,  -- ← Can be "create_project"
  action_data jsonb DEFAULT '{}',  -- ← Can store project data
  ...
);
```

**Status:** ✅ **EXISTS** - Has `action_type` and `action_data` fields

#### ✅ Votes Table Exists

```sql
CREATE TABLE group_votes (
  id uuid PRIMARY KEY,
  proposal_id uuid REFERENCES group_proposals(id),
  voter_id uuid REFERENCES auth.users(id),
  vote text CHECK (vote IN ('yes', 'no', 'abstain')),
  ...
);
```

**Status:** ✅ **EXISTS** - Ready for voting

#### ✅ Projects Table Has Group Ownership

```sql
-- From migration 20251229000000_create_groups_system.sql
ALTER TABLE projects ADD COLUMN group_id uuid REFERENCES groups(id);
ALTER TABLE projects ADD COLUMN actor_id uuid REFERENCES actors(id);
```

**Status:** ✅ **EXISTS** - Projects can be owned by groups via:

- `group_id` (direct reference)
- `actor_id` (unified actor model)

---

### 2. Service Layer

#### ❌ Proposals Service Missing

- No `mutations/proposals.ts`
- No `queries/proposals.ts`

**Status:** ❌ **MISSING** - Need to implement

#### ❌ Votes Service Missing

- No `mutations/votes.ts`
- No `queries/votes.ts`

**Status:** ❌ **MISSING** - Need to implement

#### ✅ Projects Service Exists

- `src/domain/projects/service.ts` exists
- But doesn't support `actor_id` or `group_id` yet

**Status:** ⚠️ **PARTIAL** - Exists but needs group ownership support

---

### 3. API Routes

#### ❌ Proposals API Missing

- No `/api/groups/[slug]/proposals/route.ts`

**Status:** ❌ **MISSING** - Need to implement

#### ❌ Votes API Missing

- No `/api/groups/[slug]/proposals/[id]/vote/route.ts`

**Status:** ❌ **MISSING** - Need to implement

#### ✅ Projects API Exists

- `/api/projects/route.ts` exists
- But doesn't support group ownership yet

**Status:** ⚠️ **PARTIAL** - Exists but needs group ownership support

---

### 4. UI Components

#### ❌ Proposal Components Missing

- No `CreateProposalDialog`
- No `ProposalList`
- No `ProposalDetail`

**Status:** ❌ **MISSING** - Need to implement

#### ❌ Voting Components Missing

- No `VoteButton`
- No `VoteResults`

**Status:** ❌ **MISSING** - Need to implement

---

## 📊 Infrastructure Status Summary

| Component             | Status | What Exists                 | What's Missing    |
| --------------------- | ------ | --------------------------- | ----------------- |
| **Database Schema**   | ✅ 90% | Tables exist, columns exist | Nothing           |
| **Service Layer**     | ❌ 0%  | Nothing                     | Everything        |
| **API Routes**        | ❌ 0%  | Nothing                     | Everything        |
| **UI Components**     | ❌ 0%  | Nothing                     | Everything        |
| **Project Ownership** | ⚠️ 50% | Schema supports it          | Service/API don't |

**Overall:** ~35% complete (database only)

---

## 🔧 What Needs to Be Built

### Phase 1: Project Ownership Support (2-3 hours)

**Update Projects Service to Support Groups:**

```typescript
// src/domain/projects/service.ts
export async function createProject(
  userId: string,
  payload: any,
  groupId?: string // NEW: Optional group ownership
) {
  const supabase = await createServerClient();

  // Get actor_id if group
  let actorId = null;
  if (groupId) {
    const groupActor = await getActorByGroup(groupId);
    actorId = groupActor?.id || null;
  }

  const insertPayload = {
    user_id: userId, // Creator (individual who proposed)
    group_id: groupId || null, // Owner (group)
    actor_id: actorId, // Unified ownership
    title: payload.title,
    description: payload.description,
    // ... rest of fields
  };

  // ... insert logic
}
```

**Update Projects API:**

```typescript
// src/app/api/projects/route.ts
export const POST = async (request: NextRequest) => {
  const body = await request.json();

  // Support group_id from proposal execution
  const project = await createProject(
    user.id,
    body,
    body.group_id // NEW: Group ownership
  );

  return NextResponse.json({ data: project });
};
```

### Phase 2: Proposals & Voting (12-16 hours)

**As designed in `PROPOSALS_VOTING_DESIGN.md`**

---

## 🎬 Complete Flow Implementation

### Step 1: Individual Creates Proposal

```typescript
// User wants to create "Building Fountain" project
const proposal = await createProposal({
  group_id: buildingGroup.id,
  title: 'Build Fountain Near Apartment Building',
  description: 'Install a beautiful fountain in the courtyard',
  proposal_type: 'treasury', // Or "general"
  action_type: 'create_project', // ← Key: This creates a project
  action_data: {
    title: 'Building Fountain',
    description: 'Install fountain in courtyard',
    goal_amount: 10000,
    currency: 'CHF',
    category: 'infrastructure',
  },
});
```

**What Happens:**

- Proposal created with status `draft`
- Stored in `group_proposals` table
- `action_type = "create_project"`
- `action_data` contains project details

### Step 2: Activate Proposal

```typescript
await activateProposal(proposal.id, {
  voting_starts_at: new Date(),
  voting_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
});
```

**What Happens:**

- Status changes to `active`
- Voting period starts
- Members can now vote

### Step 3: Group Votes

```typescript
// Resident 1 votes
await castVote(proposal.id, 'yes');

// Resident 2 votes
await castVote(proposal.id, 'yes');

// ... more votes
```

**What Happens:**

- Votes stored in `group_votes` table
- System automatically checks if threshold met
- If threshold met → status changes to `passed`

### Step 4: Automatic Execution

```typescript
// System automatically executes when proposal passes
async function executeProposalAction(proposalId: string) {
  const proposal = await getProposal(proposalId);

  if (proposal.action_type === 'create_project') {
    // Get group's actor_id
    const groupActor = await getActorByGroup(proposal.group_id);

    // Create project owned by group
    const project = await createProject(
      proposal.proposer_id, // Creator (individual who proposed)
      {
        ...proposal.action_data,
        group_id: proposal.group_id, // Owner (group)
        actor_id: groupActor.id, // Unified ownership
      }
    );

    // Link proposal to created project
    await updateProposal(proposalId, {
      executed_at: new Date(),
      status: 'executed',
      action_data: {
        ...proposal.action_data,
        project_id: project.id, // Link created project
      },
    });

    return { success: true, project };
  }
}
```

**What Happens:**

- Project created in `projects` table
- `group_id` set to building group
- `actor_id` set to group's actor
- `user_id` set to proposer (who created the proposal)
- Proposal status → `executed`
- Proposal's `action_data` updated with `project_id`

---

## 🎯 Key Design Decisions

### 1. Two-Step Process

**Decision:** Proposals are separate from projects.

**Why:**

- ✅ Voting happens before project exists
- ✅ Failed proposals don't create projects
- ✅ Clear separation of concerns
- ✅ Proposal history is preserved

### 2. Project Ownership

**Decision:** Project owned by group, but `user_id` tracks proposer.

**Schema:**

```sql
projects (
  user_id uuid,      -- Creator (individual who proposed)
  group_id uuid,     -- Owner (group)
  actor_id uuid,     -- Unified ownership (group's actor)
  ...
)
```

**Why:**

- ✅ Group owns the project (can manage it)
- ✅ Proposer tracked (who had the idea)
- ✅ Supports both individual and group projects

### 3. Action Execution

**Decision:** Automatic execution when proposal passes.

**Why:**

- ✅ Trustless (no manual steps)
- ✅ Immediate (project created right away)
- ✅ Transparent (audit trail)

---

## 🔍 Systems Design Analysis

### Current Architecture Support

**✅ Database Layer: 90% Ready**

- Proposals table has `action_type` and `action_data`
- Votes table exists
- Projects table has `group_id` and `actor_id`
- All relationships defined

**❌ Service Layer: 0% Ready**

- No proposal mutations/queries
- No vote mutations/queries
- Project service doesn't support groups yet

**❌ API Layer: 0% Ready**

- No proposal endpoints
- No vote endpoints
- Project API doesn't support groups yet

**❌ UI Layer: 0% Ready**

- No proposal components
- No voting components

### What This Means

**The infrastructure EXISTS at the database level**, but:

- **Service layer needs to be built** (following established patterns)
- **API routes need to be built** (following established patterns)
- **UI components need to be built** (following established patterns)

**Good News:**

- Database schema is well-designed
- Follows the same pattern as events/invitations
- Can reuse established service layer pattern
- Estimated time: 12-16 hours (as per design doc)

---

## 🚀 Implementation Priority

### Critical Path

1. **Update Project Service** (2-3 hours)
   - Add `group_id` and `actor_id` support
   - Update `createProject()` function

2. **Proposals Service Layer** (4-6 hours)
   - Mutations: create, update, activate
   - Queries: get, list, calculate status

3. **Voting Service Layer** (3-4 hours)
   - Mutations: cast, update, remove vote
   - Queries: get votes, calculate results

4. **Action Execution** (2-3 hours)
   - `executeCreateProject()` handler
   - Integration with project service

5. **API Routes** (2-3 hours)
   - Proposals endpoints
   - Votes endpoints

6. **UI Components** (4-6 hours)
   - Proposal creation
   - Voting interface
   - Results display

**Total:** ~18-25 hours

---

## 💡 Alternative: Simpler Flow

**If we want to simplify initially:**

Instead of proposals → projects, we could have:

**Direct Project Creation with Approval:**

1. Individual creates project (status: `pending_approval`)
2. Group votes on project
3. If approved → status: `active`
4. If rejected → status: `rejected`

**Pros:**

- Simpler (one entity instead of two)
- Faster to implement

**Cons:**

- Less flexible (can't propose other actions)
- No proposal history
- Doesn't match your described flow

**Recommendation:** Stick with proposals → projects flow (more flexible, matches your vision)

---

## ✅ Summary

### Infrastructure Status

**Database:** ✅ **READY** (90%)

- All tables exist
- All relationships defined
- Supports the flow

**Service/API/UI:** ❌ **NOT READY** (0%)

- Need to be built
- But can follow established patterns
- Estimated: 18-25 hours

### The Flow Works

**Your described flow is architecturally sound:**

1. ✅ Individual creates proposal (database supports it)
2. ✅ Group votes (database supports it)
3. ✅ If passes, project created (database supports it)
4. ✅ Project owned by group (database supports it)

**What's needed:**

- Build service layer (following patterns)
- Build API routes (following patterns)
- Build UI components (following patterns)

**The design document (`PROPOSALS_VOTING_DESIGN.md`) covers all of this.**

---

**Last Updated:** 2025-12-30
