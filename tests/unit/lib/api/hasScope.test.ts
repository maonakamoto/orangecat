/**
 * hasScope — least-privilege auth contract.
 *
 * This is the gate between an integration key and a forbidden operation.
 * A silent regression here would either lock out legitimate callers
 * (wildcard stops matching) or fail open (a narrowed key suddenly has
 * full authority). Both are bad enough to test directly.
 *
 * Created: 2026-06-04
 */

import { hasScope } from '@/lib/api/resolveRequestAuth';

describe('hasScope', () => {
  it("wildcard ['*'] passes any required scope", () => {
    expect(hasScope(['*'], 'products.write')).toBe(true);
    expect(hasScope(['*'], 'services.read')).toBe(true);
    expect(hasScope(['*'], 'anything.anything')).toBe(true);
  });

  it('exact match passes', () => {
    expect(hasScope(['products.write'], 'products.write')).toBe(true);
    expect(hasScope(['services.read', 'products.write'], 'products.write')).toBe(true);
  });

  it('non-listed scope is denied (no prefix expansion)', () => {
    expect(hasScope(['products.read'], 'products.write')).toBe(false);
    expect(hasScope(['products.write'], 'services.write')).toBe(false);
  });

  it('empty allowlist denies everything', () => {
    expect(hasScope([], 'products.write')).toBe(false);
  });

  it('does NOT expand `products.*` style wildcards (kept trivially auditable)', () => {
    // If we ever add prefix wildcards this test will need updating; for
    // now we want narrowed keys to mean exactly what they say.
    expect(hasScope(['products.*'], 'products.write')).toBe(false);
  });

  it('wildcard works when mixed with other tokens', () => {
    // A nonsense state but defensible — any explicit '*' grants all.
    expect(hasScope(['products.read', '*'], 'projects.write')).toBe(true);
  });
});
