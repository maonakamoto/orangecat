/**
 * AES-256-GCM cipher for webhook signing secrets at rest.
 *
 * The webhook signing path needs the plaintext secret at fire time
 * (the worker must sign each delivery). Plaintext-at-rest is the
 * PHASE-2 debt I documented in 2755a8a5 when the user picked
 * "plaintext for now, encrypt later". This util lets the service
 * encrypt at insert and decrypt at fire while keeping the secret out
 * of disk dumps + DB backups.
 *
 * Key material: WEBHOOK_SECRET_KEY env var, a 32-byte hex string
 * (64 hex chars). Generate with:
 *
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * Ciphertext layout (stored in webhook_endpoints.secret_encrypted):
 *
 *   [ 12B IV ][ 16B GCM tag ][ N bytes ciphertext ]
 *
 * Authenticated: tampering anywhere in the blob causes decrypt to
 * throw, so a DB compromise can't return a forged secret to the
 * worker — it can only DoS by deleting rows.
 *
 * Created: 2026-06-04
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm' as const;
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;

let cachedKey: Buffer | null = null;

/**
 * Load the master encryption key from WEBHOOK_SECRET_KEY. Throws if
 * the env var is missing OR malformed — we want to fail at startup,
 * not silently store unencrypted-looking blobs.
 *
 * The key is cached after the first read so we don't re-validate on
 * every encrypt/decrypt. Tests can clear with resetCachedKey().
 */
export function loadKey(): Buffer {
  if (cachedKey) {
    return cachedKey;
  }
  const hex = process.env.WEBHOOK_SECRET_KEY;
  if (!hex) {
    throw new Error(
      "WEBHOOK_SECRET_KEY is not set. Generate one with `node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"` and set it in Vercel env."
    );
  }
  if (!/^[0-9a-f]{64}$/i.test(hex)) {
    throw new Error(
      'WEBHOOK_SECRET_KEY must be 64 hex characters (a 32-byte key). Got ' +
        `${hex.length} characters of ${/[^0-9a-f]/i.test(hex) ? 'non-hex' : 'hex'} data.`
    );
  }
  cachedKey = Buffer.from(hex, 'hex');
  if (cachedKey.length !== KEY_BYTES) {
    throw new Error(
      `WEBHOOK_SECRET_KEY decoded to ${cachedKey.length} bytes; expected ${KEY_BYTES}.`
    );
  }
  return cachedKey;
}

/** Test-only helper. Production callers never invalidate the key. */
export function resetCachedKey(): void {
  cachedKey = null;
}

/**
 * Encrypt a plaintext webhook secret. Returns a Buffer suitable for
 * storage in webhook_endpoints.secret_encrypted (BYTEA). Each call
 * generates a fresh 12-byte IV — never reuse IVs with the same key.
 */
export function encryptWebhookSecret(plaintext: string): Buffer {
  const key = loadKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]);
}

/**
 * Decrypt a stored ciphertext blob. Throws on:
 *   - malformed blob (too short for IV + tag)
 *   - tampered ciphertext (GCM auth tag mismatch)
 *   - wrong key
 *
 * Callers never branch on the failure reason — a decrypt failure
 * means the secret is unrecoverable; surface the error so the worker
 * can mark the delivery as a non-retryable failure.
 */
export function decryptWebhookSecret(blob: Buffer): string {
  if (blob.length < IV_BYTES + TAG_BYTES + 1) {
    throw new Error(
      `webhook secret ciphertext too short (got ${blob.length}B, need at least ${IV_BYTES + TAG_BYTES + 1}B)`
    );
  }
  const key = loadKey();
  const iv = blob.subarray(0, IV_BYTES);
  const tag = blob.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = blob.subarray(IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}
