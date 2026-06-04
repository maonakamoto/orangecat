/**
 * webhookSecretCipher — round-trip + tampering tests.
 *
 * AES-256-GCM, randomized IV. The contract:
 *   - encrypt → decrypt round-trips exactly
 *   - each encrypt of the same plaintext produces a different blob
 *     (because IV is random)
 *   - tampering anywhere in the blob causes decrypt to throw
 *   - malformed env (missing / wrong length / non-hex) fails at load
 *   - wrong key fails decrypt
 *
 * Created: 2026-06-04
 */

import {
  encryptWebhookSecret,
  decryptWebhookSecret,
  loadKey,
  resetCachedKey,
} from '@/lib/crypto/webhookSecretCipher';

const VALID_KEY = 'a'.repeat(64); // 64 hex chars = 32 bytes

beforeEach(() => {
  resetCachedKey();
  process.env.WEBHOOK_SECRET_KEY = VALID_KEY;
});

afterAll(() => {
  resetCachedKey();
  delete process.env.WEBHOOK_SECRET_KEY;
});

describe('loadKey', () => {
  it('caches the parsed key across calls', () => {
    const k1 = loadKey();
    const k2 = loadKey();
    expect(k1).toBe(k2);
  });

  it.each([undefined, ''])('throws when WEBHOOK_SECRET_KEY is %p', value => {
    resetCachedKey();
    if (value === undefined) {
      delete process.env.WEBHOOK_SECRET_KEY;
    } else {
      process.env.WEBHOOK_SECRET_KEY = value;
    }
    expect(() => loadKey()).toThrow(/WEBHOOK_SECRET_KEY/);
  });

  it('throws on non-hex characters', () => {
    resetCachedKey();
    process.env.WEBHOOK_SECRET_KEY = 'x'.repeat(64);
    expect(() => loadKey()).toThrow(/64 hex characters/);
  });

  it('throws on wrong length', () => {
    resetCachedKey();
    process.env.WEBHOOK_SECRET_KEY = 'a'.repeat(32);
    expect(() => loadKey()).toThrow(/64 hex characters/);
  });
});

describe('encrypt/decrypt round-trip', () => {
  it('decrypts to the exact original plaintext', () => {
    const plaintext = 'ock_whk_abcdef0123456789abcdef0123456789abcdef0123456789';
    const blob = encryptWebhookSecret(plaintext);
    expect(decryptWebhookSecret(blob)).toBe(plaintext);
  });

  it('round-trips empty-ish but valid strings', () => {
    // length-1 plaintext is the minimum the layout (IV+tag+ct) accepts.
    expect(decryptWebhookSecret(encryptWebhookSecret('a'))).toBe('a');
  });

  it('round-trips long strings', () => {
    const long = 'x'.repeat(4096);
    expect(decryptWebhookSecret(encryptWebhookSecret(long))).toBe(long);
  });

  it('round-trips unicode', () => {
    const unicode = 'secrét‐𝓌ith‐unicodé‐𠮷';
    expect(decryptWebhookSecret(encryptWebhookSecret(unicode))).toBe(unicode);
  });

  it('produces different blobs for the same plaintext (random IV)', () => {
    const plaintext = 'same-input';
    const a = encryptWebhookSecret(plaintext);
    const b = encryptWebhookSecret(plaintext);
    expect(a.equals(b)).toBe(false);
    // Both still decrypt to the same value.
    expect(decryptWebhookSecret(a)).toBe(plaintext);
    expect(decryptWebhookSecret(b)).toBe(plaintext);
  });

  it('produces blobs with the expected layout (IV+tag+ct)', () => {
    const blob = encryptWebhookSecret('hello');
    expect(blob.length).toBe(12 + 16 + 5); // IV + tag + len('hello')
  });
});

describe('tampering detection', () => {
  it('throws on flipped ciphertext byte', () => {
    const blob = encryptWebhookSecret('ock_whk_real');
    const flipped = Buffer.from(blob);
    // Flip the last byte of the ciphertext.
    flipped[flipped.length - 1] = flipped[flipped.length - 1] ^ 0x01;
    expect(() => decryptWebhookSecret(flipped)).toThrow();
  });

  it('throws on flipped IV byte', () => {
    const blob = encryptWebhookSecret('ock_whk_real');
    const flipped = Buffer.from(blob);
    flipped[0] = flipped[0] ^ 0x01;
    expect(() => decryptWebhookSecret(flipped)).toThrow();
  });

  it('throws on flipped tag byte', () => {
    const blob = encryptWebhookSecret('ock_whk_real');
    const flipped = Buffer.from(blob);
    flipped[12] = flipped[12] ^ 0x01; // first byte of tag
    expect(() => decryptWebhookSecret(flipped)).toThrow();
  });

  it('throws on truncated blob', () => {
    const blob = encryptWebhookSecret('ock_whk_real');
    expect(() => decryptWebhookSecret(blob.subarray(0, 10))).toThrow(/too short/);
  });

  it('throws when decrypted with the wrong key', () => {
    const blob = encryptWebhookSecret('ock_whk_real');
    resetCachedKey();
    process.env.WEBHOOK_SECRET_KEY = 'b'.repeat(64);
    expect(() => decryptWebhookSecret(blob)).toThrow();
  });
});
