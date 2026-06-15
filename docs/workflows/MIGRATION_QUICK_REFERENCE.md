# Supabase Migration Quick Reference

> ⚠️ **RETIRED — managed cloud only.** The `PROJECT_REF` + `api.supabase.com` Management API workflow below targeted the managed Supabase Cloud, retired 2026-06. Schema work now happens against the self-hosted instance (`supabase.orangecat.ch`) via SQL migrations + `psql`. Kept for historical reference.

**Use this for fast lookup. See SUPABASE_MIGRATION_WORKFLOW.md for detailed explanation.**

---

## ⚡ Quick Start (3 Steps)

```bash
# 1. Verify token exists
grep SUPABASE_ACCESS_TOKEN .env.local

# 2. Apply migration
node scripts/db/apply-migration.js supabase/migrations/your-migration.sql

# 3. Verify in Supabase SQL Editor
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

---

## 🔧 Common Fixes

### Fix 1: 401 Unauthorized

```bash
# Get new token from Supabase Dashboard → Settings → API
# Add to .env.local:
SUPABASE_ACCESS_TOKEN=sbp_your_new_token
```

### Fix 2: CREATE INDEX Syntax Error

```sql
-- ❌ Wrong
CREATE INDEX idx ON table(CASE WHEN x THEN y END);

-- ✅ Correct
CREATE INDEX idx ON table((CASE WHEN x THEN y END));
```

### Fix 3: Function Parameter Order Error

```sql
-- ❌ Wrong: Required after optional
CREATE FUNCTION f(a uuid DEFAULT NULL, b text)

-- ✅ Correct: Required first
CREATE FUNCTION f(b text, a uuid DEFAULT NULL)
```

---

## 🐛 Debugging Checklist

- [ ] Token in `.env.local` starts with `sbp_`
- [ ] Migration file exists and path is correct
- [ ] All CREATE INDEX expressions wrapped in parentheses
- [ ] Function params: required before optional
- [ ] Migration uses `IF NOT EXISTS` for idempotency
- [ ] Running from project root directory

---

## 📋 Verification Queries

```sql
-- Check tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'timeline_%';

-- Check functions
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name LIKE '%timeline%';

-- Check indexes
SELECT indexname FROM pg_indexes WHERE tablename LIKE 'timeline_%';
```

---

## 🚨 Error Code Reference

| Code | Meaning           | Action                              |
| ---- | ----------------- | ----------------------------------- |
| 200  | Success ✅        | Migration applied                   |
| 400  | SQL Syntax Error  | Check error message for line number |
| 401  | Unauthorized      | Update token in `.env.local`        |
| 404  | Project Not Found | Check PROJECT_REF in script         |
| 500  | Server Error      | Check Supabase status page          |

---

## 📝 Reusable Script Template

```javascript
// Minimal migration script
const https = require('https');
const fs = require('fs');

const PROJECT_REF = 'ohkueislstxomdjavyhs';
const envContent = fs.readFileSync('.env.local', 'utf8');
const ACCESS_TOKEN = envContent.match(/SUPABASE_ACCESS_TOKEN=(.+)/)[1].trim();

const migrationSQL = fs.readFileSync(process.argv[2], 'utf8');
const data = JSON.stringify({ query: migrationSQL });

https
  .request(
    {
      hostname: 'api.supabase.com',
      path: `/v1/projects/${PROJECT_REF}/database/query`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    },
    res => {
      let responseData = '';
      res.on('data', chunk => (responseData += chunk));
      res.on('end', () => {
        console.log(res.statusCode === 200 ? '✅ Success' : '❌ Failed:', responseData);
      });
    }
  )
  .end(data);
```

**Usage:** `node script.js migration.sql`

---

## 🎯 Migration Best Practices

1. **Always use idempotent operations:**
   - `CREATE TABLE IF NOT EXISTS`
   - `CREATE OR REPLACE FUNCTION`
   - `ON CONFLICT DO NOTHING`

2. **Validate SQL before applying:**
   - Check syntax locally
   - Test in staging first
   - Review error-prone patterns

3. **Keep tokens secure:**
   - Never commit tokens to git
   - Add `.env.local` to `.gitignore`
   - Use environment-specific tokens

4. **Test immediately after migration:**
   - Query database to verify tables
   - Test features in UI
   - Check RLS policies work

---

**For detailed explanation, see:** `SUPABASE_MIGRATION_WORKFLOW.md`
