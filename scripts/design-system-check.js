#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TARGETS = ['src', 'content'];
const EXTENSIONS = new Set(['.css', '.mdx', '.ts', '.tsx']);

const FORBIDDEN = [
  {
    pattern: /\bbg-gradient(?:-[a-z]+)?\b/,
    message: 'Use a semantic surface/accent token instead of page/component gradients.',
  },
  {
    pattern: /linear-gradient\(/,
    message: 'Use solid design-system colors; gradients are not part of the product UI language.',
  },
  {
    pattern: /\b(?:sm:|md:|lg:|xl:)?rounded-(?:xl|2xl|3xl|4xl)\b/,
    message: 'Cards and controls must stay at 8px radius or below.',
  },
  {
    pattern: /\b(?:hover:)?shadow-(?:md|lg|xl|2xl)\b/,
    message: 'Prefer borders over heavy shadows.',
  },
  {
    pattern: /\bbg-white(?:\/\d+)?\b/,
    message: 'Use bg-card or bg-background for dark/light mode consistency.',
  },
  {
    pattern: /\b(?:text|border|divide)-gray-\d+\b/,
    message: 'Use semantic foreground, muted, border, or input tokens.',
  },
  {
    pattern: /\bfocus:(?:ring|border)-(?:orange|tiffany|gray|blue|green|red)-\d+\b/,
    message: 'Use focus:ring-ring, focus:ring-ring/20, focus:border-ring, or destructive tokens.',
  },
];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

const violations = [];

for (const target of TARGETS) {
  for (const file of walk(path.join(ROOT, target))) {
    const relativePath = path.relative(ROOT, file);
    const lines = fs.readFileSync(file, 'utf8').split('\n');

    lines.forEach((line, index) => {
      for (const rule of FORBIDDEN) {
        if (rule.pattern.test(line)) {
          violations.push({
            file: relativePath,
            line: index + 1,
            message: rule.message,
            source: line.trim(),
          });
        }
      }
    });
  }
}

if (violations.length > 0) {
  console.error(`Design system check failed with ${violations.length} violation(s):`);
  for (const violation of violations.slice(0, 80)) {
    console.error(
      `${violation.file}:${violation.line} - ${violation.message}\n  ${violation.source}`
    );
  }
  if (violations.length > 80) {
    console.error(`...and ${violations.length - 80} more.`);
  }
  process.exit(1);
}

console.log('Design system check passed.');
