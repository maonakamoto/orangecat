/**
 * Webhook signing — contract tests.
 *
 * The signing functions are the foundation customers verify against.
 * Any silent regression here ships unverifiable deliveries, which is
 * worse than no webhooks — integrations would *think* they're
 * authenticating and act on attacker-controlled payloads.
 *
 * Created: 2026-06-03
 */

import { signWebhookPayload, verifyWebhookSignature } from '@/services/webhooks/signing';

const SECRET = 'ock_whk_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';
const BODY = JSON.stringify({ event_type: 'product.created', data: { id: 'p-1' } });

describe('signWebhookPayload', () => {
  it('produces a Stripe-style header with t= and v1=', () => {
    const header = signWebhookPayload(BODY, SECRET, new Date(1_700_000_000_000));
    expect(header).toMatch(/^t=1700000000,v1=[a-f0-9]{64}$/);
  });

  it('is deterministic for the same (body, secret, timestamp)', () => {
    const now = new Date(1_700_000_000_000);
    expect(signWebhookPayload(BODY, SECRET, now)).toBe(signWebhookPayload(BODY, SECRET, now));
  });

  it('changes when the body changes', () => {
    const now = new Date(1_700_000_000_000);
    expect(signWebhookPayload(BODY, SECRET, now)).not.toBe(
      signWebhookPayload(BODY + ' ', SECRET, now)
    );
  });

  it('changes when the secret changes', () => {
    const now = new Date(1_700_000_000_000);
    expect(signWebhookPayload(BODY, SECRET, now)).not.toBe(
      signWebhookPayload(BODY, SECRET + 'x', now)
    );
  });

  it('changes when the timestamp changes (replay protection)', () => {
    const t1 = new Date(1_700_000_000_000);
    const t2 = new Date(1_700_000_001_000);
    expect(signWebhookPayload(BODY, SECRET, t1)).not.toBe(signWebhookPayload(BODY, SECRET, t2));
  });
});

describe('verifyWebhookSignature', () => {
  const NOW = new Date(1_700_000_000_000);

  function freshHeader() {
    return signWebhookPayload(BODY, SECRET, NOW);
  }

  describe('happy path', () => {
    it('accepts a signature produced by signWebhookPayload', () => {
      const header = freshHeader();
      expect(verifyWebhookSignature(BODY, SECRET, header, { now: NOW })).toEqual({ valid: true });
    });

    it('accepts within tolerance window (default 300s)', () => {
      const header = signWebhookPayload(BODY, SECRET, NOW);
      const later = new Date(NOW.getTime() + 299_000);
      expect(verifyWebhookSignature(BODY, SECRET, header, { now: later })).toEqual({ valid: true });
    });

    it('honours a custom tolerance window', () => {
      const header = signWebhookPayload(BODY, SECRET, NOW);
      const later = new Date(NOW.getTime() + 600_000);
      // 600s elapsed, tolerance 700s → still valid
      expect(
        verifyWebhookSignature(BODY, SECRET, header, { now: later, toleranceSeconds: 700 })
      ).toEqual({ valid: true });
    });
  });

  describe('tampering detection', () => {
    it('rejects a tampered body', () => {
      const header = freshHeader();
      const tampered = BODY.replace('p-1', 'p-2');
      const result = verifyWebhookSignature(tampered, SECRET, header, { now: NOW });
      expect(result).toEqual({ valid: false, reason: 'signature_mismatch' });
    });

    it('rejects a tampered signature hex digit', () => {
      const header = freshHeader();
      // Flip the last hex character
      const tampered = header.replace(/.$/, c => (c === '0' ? '1' : '0'));
      const result = verifyWebhookSignature(BODY, SECRET, tampered, { now: NOW });
      expect(result).toEqual({ valid: false, reason: 'signature_mismatch' });
    });

    it('rejects the wrong secret', () => {
      const header = freshHeader();
      const result = verifyWebhookSignature(BODY, SECRET + 'x', header, { now: NOW });
      expect(result).toEqual({ valid: false, reason: 'signature_mismatch' });
    });
  });

  describe('replay protection', () => {
    it('rejects a signature older than tolerance', () => {
      const header = signWebhookPayload(BODY, SECRET, NOW);
      const muchLater = new Date(NOW.getTime() + 301_000); // 1s past default 300s tolerance
      const result = verifyWebhookSignature(BODY, SECRET, header, { now: muchLater });
      expect(result).toEqual({ valid: false, reason: 'timestamp_outside_tolerance' });
    });

    it('rejects a signature from the future beyond tolerance', () => {
      const header = signWebhookPayload(BODY, SECRET, new Date(NOW.getTime() + 400_000));
      const result = verifyWebhookSignature(BODY, SECRET, header, { now: NOW });
      expect(result).toEqual({ valid: false, reason: 'timestamp_outside_tolerance' });
    });
  });

  describe('malformed input', () => {
    it.each([null, undefined, '', '   '])('rejects missing/empty header (%p)', value => {
      const result = verifyWebhookSignature(BODY, SECRET, value as string | null, { now: NOW });
      expect(result.valid).toBe(false);
    });

    it('rejects header with no timestamp', () => {
      const result = verifyWebhookSignature(BODY, SECRET, 'v1=abc', { now: NOW });
      expect(result).toEqual({ valid: false, reason: 'malformed_header' });
    });

    it('rejects header with no signature (unknown scheme)', () => {
      const result = verifyWebhookSignature(BODY, SECRET, 't=1700000000,v9=abc', { now: NOW });
      expect(result).toEqual({ valid: false, reason: 'unknown_scheme' });
    });

    it('rejects header with non-numeric timestamp', () => {
      const result = verifyWebhookSignature(BODY, SECRET, 't=notanumber,v1=abc', { now: NOW });
      expect(result).toEqual({ valid: false, reason: 'malformed_header' });
    });

    it('rejects header with non-positive timestamp', () => {
      const result = verifyWebhookSignature(BODY, SECRET, 't=0,v1=abc', { now: NOW });
      expect(result).toEqual({ valid: false, reason: 'malformed_header' });
    });
  });

  describe('key rotation', () => {
    it('accepts when ANY v1= value matches (multi-value header for rotation)', () => {
      const real = freshHeader();
      const realSig = real.split(',v1=')[1];
      const withFake = `t=1700000000,v1=deadbeef${'0'.repeat(56)},v1=${realSig}`;
      expect(verifyWebhookSignature(BODY, SECRET, withFake, { now: NOW })).toEqual({ valid: true });
    });

    it('rejects when all v1= values fail', () => {
      const withFakes = `t=1700000000,v1=deadbeef${'0'.repeat(56)},v1=cafebabe${'0'.repeat(56)}`;
      const result = verifyWebhookSignature(BODY, SECRET, withFakes, { now: NOW });
      expect(result).toEqual({ valid: false, reason: 'signature_mismatch' });
    });
  });

  describe('timing-safe comparison', () => {
    it('rejects shorter signatures without throwing on Buffer length mismatch', () => {
      const result = verifyWebhookSignature(BODY, SECRET, 't=1700000000,v1=abc', { now: NOW });
      expect(result.valid).toBe(false);
    });

    it('rejects non-hex signatures without throwing', () => {
      const nonHex = 'g'.repeat(64);
      const result = verifyWebhookSignature(BODY, SECRET, `t=1700000000,v1=${nonHex}`, {
        now: NOW,
      });
      expect(result.valid).toBe(false);
    });
  });
});
