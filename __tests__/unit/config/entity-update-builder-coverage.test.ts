/**
 * GUARD (F1): every user-editable field must round-trip through the entity's
 * update-payload builder. The generic PUT handler only writes fields the
 * builder lists (`createUpdatePayloadBuilder([{ from: '…' }, …])`), so a field
 * that's in the form AND the Zod schema but MISSING from the builder is silently
 * dropped on edit — exactly the `show_on_profile` bug (fixed 2026-07-13).
 *
 * Complements the form↔schema guard (entity-form-schema-drift.test.ts): that one
 * catches "form field absent from schema"; this one catches "editable field
 * absent from the update builder".
 *
 * Editable field := a name that is BOTH a form field (config.fieldGroups) AND a
 * key in the entity's Zod schema. Such a field must appear in the update builder
 * or in EXCEPTIONS below (fields persisted by a separate mechanism).
 */
import * as fs from 'fs';
import * as path from 'path';
import { getEntityConfig } from '@/config/entity-configs/get-config';
import { ENTITY_REGISTRY, ENTITY_TYPES, type EntityType } from '@/config/entity-registry';

/**
 * Editable fields intentionally NOT in the standard update-payload builder,
 * because a dedicated code path persists them. Each entry is a deliberate
 * decision, not an oversight — add here only with a reason.
 */
const EXCEPTIONS: Partial<Record<EntityType, string[]>> = {
  loan: ['collateral'], // persisted via LoanCollateralField / collateral tables, not the row builder
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function unwrap(s: any): any {
  const seen = new Set();
  while (s?._def && !seen.has(s)) {
    seen.add(s);
    const tn = s._def.typeName;
    if (tn === 'ZodEffects') s = s._def.schema;
    else if (tn === 'ZodDefault' || tn === 'ZodOptional' || tn === 'ZodNullable')
      s = s._def.innerType;
    else break;
  }
  return s;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function schemaKeys(schema: any): Set<string> {
  const s = unwrap(schema);
  if (s?._def?.typeName !== 'ZodObject') return new Set();
  const shape = typeof s.shape === 'function' ? s.shape() : s.shape;
  return new Set(Object.keys(shape ?? {}));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formFields(config: any): string[] {
  const out: string[] = [];
  for (const g of config.fieldGroups ?? []) {
    for (const f of g.fields ?? []) {
      if (f && typeof f.name === 'string') out.push(f.name);
    }
  }
  return out;
}

/** Extract the field names a `createUpdatePayloadBuilder([...])` covers. */
function builderFields(source: string): Set<string> {
  const fields = new Set<string>();
  // { from: 'x' }
  for (const m of source.matchAll(/from:\s*['"]([a-z0-9_]+)['"]/gi)) fields.add(m[1]);
  // commonFieldMappings.uuidField('x') / dateField / arrayField / urlField(...)
  for (const m of source.matchAll(/commonFieldMappings\.\w+\(\s*['"]([a-z0-9_]+)['"]/gi))
    fields.add(m[1]);
  return fields;
}

describe('GUARD: editable field ↔ update-builder coverage', () => {
  const offenders: Record<string, string[]> = {};

  it('every editable field is covered by the entity update builder', () => {
    const report: string[] = [];
    for (const type of ENTITY_TYPES as readonly EntityType[]) {
      const config = getEntityConfig(type);
      if (!config) continue;
      const endpoint = ENTITY_REGISTRY[type]?.apiEndpoint; // e.g. /api/products
      if (!endpoint) continue;
      const dir = endpoint.replace('/api/', '');
      const routeFile = path.join(process.cwd(), 'src/app/api', dir, '[id]/route.ts');
      if (!fs.existsSync(routeFile)) continue;
      const source = fs.readFileSync(routeFile, 'utf8');
      if (!source.includes('createUpdatePayloadBuilder')) continue; // non-standard update path

      const keys = schemaKeys(config.validationSchema);
      const editable = formFields(config).filter(n => keys.has(n));
      const covered = builderFields(source);
      const allowed = new Set(EXCEPTIONS[type] ?? []);
      const missing = editable.filter(n => !covered.has(n) && !allowed.has(n));

      report.push(
        `[${type}] editable=${editable.length} builder-covered=${covered.size}` +
          (missing.length ? ` ❌ MISSING: ${missing.join(', ')}` : ' ✅')
      );
      if (missing.length) offenders[type] = missing;
    }
    // eslint-disable-next-line no-console
    console.log('\n=== UPDATE-BUILDER COVERAGE ===\n' + report.join('\n') + '\n');
    expect(offenders).toEqual({});
  });
});
