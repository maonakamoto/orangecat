/**
 * verifyCronSecret — fail-closed contract.
 *
 * Regression guard for the 2026-06-13 finding: the old per-route check
 * (`authHeader === \`Bearer ${process.env.CRON_SECRET}\``) accepted the
 * literal string "Bearer undefined" whenever CRON_SECRET was unset.
 */

import { verifyCronSecret } from '@/lib/api/cronAuth';

// The jest env has no global web Request; verifyCronSecret only reads
// headers.get('authorization'), so a minimal stub keeps this test env-free.
function requestWithAuth(header?: string): Request {
  return {
    headers: {
      get: (name: string) => (name.toLowerCase() === 'authorization' ? (header ?? null) : null),
    },
  } as unknown as Request;
}

describe('verifyCronSecret', () => {
  const originalSecret = process.env.CRON_SECRET;

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalSecret;
    }
  });

  describe('with CRON_SECRET set', () => {
    beforeEach(() => {
      process.env.CRON_SECRET = 'test-secret-value';
    });

    it('accepts the correct bearer token', () => {
      expect(verifyCronSecret(requestWithAuth('Bearer test-secret-value'))).toBe(true);
    });

    it('rejects a wrong token', () => {
      expect(verifyCronSecret(requestWithAuth('Bearer wrong'))).toBe(false);
    });

    it('rejects a same-length wrong token', () => {
      expect(verifyCronSecret(requestWithAuth('Bearer test-secret-valuX'))).toBe(false);
    });

    it('rejects a missing authorization header', () => {
      expect(verifyCronSecret(requestWithAuth())).toBe(false);
    });

    it('rejects the bare secret without the Bearer prefix', () => {
      expect(verifyCronSecret(requestWithAuth('test-secret-value'))).toBe(false);
    });
  });

  describe('with CRON_SECRET unset (fail closed)', () => {
    beforeEach(() => {
      delete process.env.CRON_SECRET;
    });

    it('rejects the literal "Bearer undefined" that the old check accepted', () => {
      expect(verifyCronSecret(requestWithAuth('Bearer undefined'))).toBe(false);
    });

    it('rejects everything else too', () => {
      expect(verifyCronSecret(requestWithAuth('Bearer anything'))).toBe(false);
      expect(verifyCronSecret(requestWithAuth())).toBe(false);
    });
  });

  describe('with CRON_SECRET empty string (fail closed)', () => {
    beforeEach(() => {
      process.env.CRON_SECRET = '';
    });

    it('rejects "Bearer " with the empty secret', () => {
      expect(verifyCronSecret(requestWithAuth('Bearer '))).toBe(false);
    });
  });
});
