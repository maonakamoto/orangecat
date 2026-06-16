#!/usr/bin/env node
/**
 * Schema-drift auditor.
 *
 * Most of the codebase uses an untyped Supabase client (AnySupabaseClient =
 * SupabaseClient<any>), so selecting/filtering a column the live DB doesn't have
 * COMPILES but fails (often silently) at runtime — this has repeatedly broken
 * real features (profile context, search, matchmaking). This script statically
 * compares every resolvable `.from(table).select(...)` / filter against a
 * snapshot of the LIVE schema and reports columns that don't exist.
 *
 * Snapshot: scripts/db/live-schema.json (refresh from the box with:
 *   psql ... -c "select table_name, string_agg(column_name,',' order by ordinal_position)
 *               from information_schema.columns where table_schema='public' group by 1")
 *
 * Heuristic (best-effort, low false-positive): skips dynamic table names,
 * unknown tables/views, '*', JSON paths, casts, and nested join selects.
 * Exit code 1 if drift is found (so it can gate CI/deploys).
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const schema = JSON.parse(fs.readFileSync('scripts/db/live-schema.json', 'utf8'));
const tableCols = Object.fromEntries(Object.entries(schema).map(([t, c]) => [t, new Set(c)]));

// DATABASE_TABLES.CONST -> 'table_name'
const dt = fs.readFileSync('src/config/database-tables.ts', 'utf8');
const constMap = {};
for (const m of dt.matchAll(/([A-Z0-9_]+):\s*['"]([a-z0-9_]+)['"]/g)) constMap[m[1]] = m[2];

// References the heuristic flags but that should NOT fail the guard:
//  (a) false positives — PostgREST embedded relations the parser can't resolve;
//  (b) KNOWN DRIFT — triaged for a careful / product-decision fix (tracked here
//      so it's visible, not hidden). Fix these and remove the entry.
const ALLOW = new Set([
  // (a) false positives
  'group_events.group_event_rsvps', // embedded relation, not a column
  'actors.is_active', // misattributed (a wishlist extraWhere filter, not actors)
  // (b) KNOWN DRIFT — needs fix (triaged 2026-06-16):
  'wishlist_feedback.user_id', // table keys on actor_id; needs actor resolution
  'wishlist_fulfillment_proofs.user_id', // proofs have no owner column — product decision
  'groups.type', // groups schema has no `type`
  'groups.governance_model', // → likely `governance_preset` (verify intent)
  'groups.category', // groups schema has no `category`
  'groups.member_count', // no column — needs a computed count
  'group_proposals.is_public', // proposals have no public flag
]);

const FILTER_OPS = new Set([
  'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in', 'contains',
  'order', 'not', 'overlaps', 'match',
]);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!/node_modules|\.next|__tests__|\.test\./.test(p)) walk(p, out);
    } else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.|\.spec\./.test(e.name)) {
      out.push(p);
    }
  }
  return out;
}

function resolveTable(expr) {
  expr = expr.trim();
  let m;
  if ((m = expr.match(/^['"]([a-z0-9_]+)['"]$/))) return m[1];
  if ((m = expr.match(/^DATABASE_TABLES\.([A-Z0-9_]+)$/))) return constMap[m[1]] ?? null;
  return null; // variable / dynamic / computed — can't verify
}

function selectCols(str) {
  let s = str;
  let prev;
  do {
    prev = s;
    // strip embedded relations `name(...)` / `alias:name(...)` (name + parens),
    // then any leftover parens — iteratively for nested embeds.
    s = s.replace(/[A-Za-z_][\w]*\s*\([^()]*\)/g, '').replace(/\([^()]*\)/g, '');
  } while (s !== prev);
  return s
    .split(',')
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => {
      if (p.includes(':')) p = p.split(':').pop().trim(); // alias:col -> col
      p = p.split('->')[0].split('::')[0].trim(); // json path / cast
      return p;
    })
    .filter(c => c && c !== '*' && /^[a-z_][a-z0-9_]*$/i.test(c));
}

function lineOf(text, idx) {
  return text.slice(0, idx).split('\n').length;
}

const findings = [];

for (const file of walk(path.join(ROOT, 'src'))) {
  const text = fs.readFileSync(file, 'utf8');
  const fromRe = /\.from\(\s*([^)]+?)\s*\)/g;
  let fm;
  const froms = [];
  while ((fm = fromRe.exec(text))) froms.push({ idx: fm.index, arg: fm[1], end: fromRe.lastIndex });
  for (let i = 0; i < froms.length; i++) {
    const table = resolveTable(froms[i].arg);
    if (!table || !tableCols[table]) continue; // unknown/dynamic/view → skip
    const cols = tableCols[table];
    const windowEnd = i + 1 < froms.length ? froms[i + 1].idx : Math.min(text.length, froms[i].end + 1200);
    const win = text.slice(froms[i].end, windowEnd);

    const refs = [];
    // .select('...') | .select("...") | .select(`...`)
    for (const sm of win.matchAll(/\.select\(\s*(['"`])([\s\S]*?)\1/g)) {
      for (const c of selectCols(sm[2])) refs.push({ col: c, off: sm.index });
    }
    // filter ops: .eq('col', ...), .order('col'), .not('col', ...)
    for (const om of win.matchAll(/\.([a-z]+)\(\s*['"]([a-z_][a-z0-9_]*)['"]/g)) {
      if (FILTER_OPS.has(om[1])) refs.push({ col: om[2], off: om.index });
    }

    for (const r of refs) {
      if (!cols.has(r.col) && !ALLOW.has(`${table}.${r.col}`)) {
        findings.push({
          file: path.relative(ROOT, file),
          line: lineOf(text, froms[i].end + r.off),
          table,
          col: r.col,
        });
      }
    }
  }
}

if (findings.length === 0) {
  console.log('✅ No schema drift found (resolvable .from().select()/filter usages match live schema).');
  process.exit(0);
}

console.log(`❌ ${findings.length} possible schema-drift reference(s) — column not in live schema:\n`);
const byFile = {};
for (const f of findings) (byFile[f.file] ??= []).push(f);
for (const [file, fs2] of Object.entries(byFile)) {
  console.log(file);
  for (const f of fs2) console.log(`  L${f.line}  ${f.table}.${f.col}`);
}
process.exit(1);
