---
created_date: 2025-01-21
last_modified_date: 2025-01-21
last_modified_summary: Documentation for .env.local protection
---

# 🔒 .env.local File Protection

## ⚠️ Important: Never Overwrite .env.local

The `.env.local` file contains your local development environment variables. **Scripts should NEVER overwrite this file completely** - they should only update specific values while preserving all existing content.

## What Happened

The `vercel link` command downloaded environment variables from Vercel and **overwrote** the entire `.env.local` file, removing all existing variables except:

- `SUPABASE_SECRET_KEY`
- `VERCEL_OIDC_TOKEN`

## ✅ Solution

A restore script has been created to merge missing variables back into `.env.local`:

```bash
node scripts/utils/restore-env-local.js
```

This script:

- ✅ Creates a backup before making changes
- ✅ Preserves all existing variables
- ✅ Adds missing required variables
- ✅ Never overwrites the entire file

## 🔧 Updated Scripts

The following scripts have been updated to **preserve existing content**:

### 1. `scripts/auth/vercel-login.js`

- Only updates `VERCEL_TOKEN` or `VERCEL_ACCESS_TOKEN`
- Preserves all other variables
- Creates backup before changes

### 2. `scripts/auth/github-login.js`

- Only updates `GITHUB_TOKEN`
- Preserves all other variables
- Creates backup before changes

### 3. `scripts/utils/env-manager.js`

- `setupInitialEnv()` only runs if `.env.local` doesn't exist
- Always creates backup before any changes

## 📋 Required Variables

The following variables should always be present in `.env.local`:

```bash
# Required
NODE_ENV=development
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME=OrangeCat
NEXT_PUBLIC_SUPABASE_URL=https://supabase.orangecat.ch
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_BITCOIN_ADDRESS=...
NEXT_PUBLIC_LIGHTNING_ADDRESS=...

# Optional (from Vercel)
SUPABASE_SECRET_KEY=...
VERCEL_OIDC_TOKEN=...
VERCEL_TOKEN=... (if using Vercel CLI)
VERCEL_ACCESS_TOKEN=... (if using Vercel CLI)

# Optional (from GitHub)
GITHUB_TOKEN=... (if using GitHub API)
```

## 🚨 Warning: vercel link

The `vercel link` command will **overwrite** `.env.local` with variables from Vercel.

**Before running `vercel link`:**

1. Create a backup: `cp .env.local .env.local.backup`
2. Or use the restore script after: `node scripts/utils/restore-env-local.js`

**Better approach:**

```bash
# Link project without overwriting env
vercel link --yes

# Then restore missing variables
node scripts/utils/restore-env-local.js
```

## 🔄 Restore Process

If your `.env.local` gets overwritten:

1. **Check for backups:**

   ```bash
   ls -la .env*.backup* .env-backups/*.backup
   ```

2. **Restore from backup:**

   ```bash
   cp .env-backups/.env.local.TIMESTAMP.backup .env.local
   ```

3. **Or use restore script:**
   ```bash
   node scripts/utils/restore-env-local.js
   ```

## ✅ Best Practices

1. **Always create backups** before modifying `.env.local`
2. **Only update specific variables**, never overwrite the entire file
3. **Use the restore script** after `vercel link`
4. **Check .env.local** after running any script that might modify it
5. **Keep .env.local in .gitignore** (already configured)

## 📝 Script Development Guidelines

When creating scripts that modify `.env.local`:

1. ✅ **DO**: Create backup first
2. ✅ **DO**: Parse existing file
3. ✅ **DO**: Update only specific variables
4. ✅ **DO**: Preserve comments and structure
5. ❌ **DON'T**: Use `fs.writeFileSync()` with hardcoded content
6. ❌ **DON'T**: Overwrite entire file
7. ❌ **DON'T**: Remove existing variables

Example of **correct** approach:

```javascript
// Parse existing file
const existing = parseEnvFile('.env.local');

// Update only specific variable
existing.VERCEL_TOKEN = newToken;

// Write back preserving structure
writeEnvFile(existing, '.env.local');
```

---

**Last Updated**: 2025-01-21
