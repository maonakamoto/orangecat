#!/usr/bin/env node
/*
  docs-frontmatter-check.js

  Validates frontmatter on docs that have OPTED IN. A doc opts in by
  starting with `---` (a frontmatter block). Once opted in, the
  required fields are enforced.

  Why opt-in instead of "every doc must have frontmatter": 60% of
  docs/ pre-dates the convention (343 files total, 136 with
  frontmatter at the time this scoping was introduced). Making
  frontmatter mandatory across the corpus would block CI on 207
  legacy files that nobody plans to retrofit. Opt-in lets new/canonical
  docs enforce the convention without churning historical content.

  To make a doc enforce frontmatter, add the block. To exempt a doc,
  just don't add `---` at the top.
*/

const { glob } = require('glob');
const fs = require('fs');

function parseFrontmatter(text) {
  if (!text.startsWith('---')) return null;
  const end = text.indexOf('\n---', 3);
  if (end === -1) return null;
  const fm = text.slice(3, end).trim();
  const body = text.slice(end + 4);
  const obj = {};
  fm.split(/\r?\n/).forEach(line => {
    const m = line.match(/^([a-zA-Z0-9_\-]+):\s*(.*)$/);
    if (m) obj[m[1]] = m[2];
  });
  return { data: obj, body };
}

async function main() {
  const files = await glob('docs/**/*.md', { ignore: ['**/node_modules/**'] });

  const required = ['created_date', 'last_modified_date', 'last_modified_summary'];
  const failures = [];
  let checked = 0;
  let skipped = 0;

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const fm = parseFrontmatter(text);
    if (!fm) {
      skipped++;
      continue;
    }
    checked++;
    for (const key of required) {
      if (!fm.data[key]) {
        failures.push({ file, reason: `Missing field: ${key}` });
      }
    }
  }

  if (failures.length) {
    console.log('Frontmatter field issues detected (on docs that opted in):');
    failures.slice(0, 100).forEach(f => console.log(`- ${f.file}: ${f.reason}`));
    console.log(`\nChecked ${checked} docs with frontmatter, skipped ${skipped} without.`);
    process.exitCode = 1;
  } else {
    console.log(
      `All ${checked} opted-in docs have required frontmatter (${skipped} docs without frontmatter were skipped).`
    );
  }
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
