#!/usr/bin/env node
// Flags contract-phase (destructive) DDL in the migration files passed as args.
//
// Why: the self-host deploy applies migrations BEFORE the atomic swap, and the
// auto-rollback reverts the CODE but NOT an already-applied migration. So a
// migration that DROPs/RENAMEs something the previous release still references
// turns "rollback" into "old code against a schema it can't use". The safe shape
// is expand/contract: add the new thing, ship code that uses it, and only drop
// the old thing in a LATER migration once no running code needs it.
//
// This check does not forbid contract steps — it makes them explicit. Acknowledge
// an intentional one by adding a line to the migration:
//     -- migration-safety: contract-ok <short reason>
//
// Usage: node scripts/db/check-migration-safety.mjs <file.sql> [<file.sql> ...]
// Exits non-zero if any passed file has unacknowledged contract-phase DDL.

import { readFileSync } from 'node:fs';

const files = process.argv.slice(2).filter(Boolean);

const PATTERNS = [
  [/\bDROP\s+TABLE\b/i, 'DROP TABLE'],
  [/\bDROP\s+COLUMN\b/i, 'DROP COLUMN'],
  [/\bTRUNCATE\b/i, 'TRUNCATE'],
  [/\bRENAME\s+COLUMN\b/i, 'RENAME COLUMN'],
  [/\bALTER\s+COLUMN\b.+\bTYPE\b/i, 'ALTER COLUMN ... TYPE'],
  [/\bDROP\s+(NOT\s+NULL|CONSTRAINT|DEFAULT)\b/i, 'DROP constraint/default/not-null'],
];

let violations = 0;

for (const file of files) {
  let sql;
  try {
    sql = readFileSync(file, 'utf8');
  } catch {
    continue; // deleted/renamed file — nothing to scan
  }
  // Whole-file acknowledgement marker → skip (author has justified the contract).
  if (/--\s*migration-safety:\s*contract-ok/i.test(sql)) continue;

  sql.split('\n').forEach((line, idx) => {
    const code = line.replace(/--.*$/, ''); // ignore trailing comments
    for (const [re, label] of PATTERNS) {
      if (re.test(code)) {
        console.log(
          `::warning file=${file},line=${idx + 1}::Contract-phase DDL (${label}). ` +
            `Prefer expand/contract; if intentional, add "-- migration-safety: contract-ok <reason>".`
        );
        violations++;
      }
    }
  });
}

if (violations > 0) {
  console.error(
    `\n✗ ${violations} unacknowledged contract-phase statement(s) in changed migrations.\n` +
      `  Deploy applies migrations before the swap and auto-rollback reverts only code —\n` +
      `  a DROP/RENAME the previous release still uses breaks rollback. Make it\n` +
      `  expand/contract, or add "-- migration-safety: contract-ok <reason>" to acknowledge.`
  );
  process.exit(1);
}

console.log(`✓ migration-safety: ${files.length} file(s) checked, no unacknowledged contract-phase DDL.`);
