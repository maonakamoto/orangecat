/**
 * Typed errors thrown by @orangecat/sdk.
 *
 * Branch on `error.code` (stable, machine-readable) — never on
 * `error.message` (human-readable, may be translated).
 *
 * Codes mirror docs/api/CONVENTIONS.md §3 in the OrangeCat repo.
 */

export type OrangeCatErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'validation_error'
  | 'not_found'
  | 'conflict'
  | 'rate_limited'
  | 'internal_error'
  | 'network_error'
  | 'timeout'
  | 'unknown';

/**
 * Every failure (HTTP non-2xx, network, timeout) surfaces as this. Catch
 * once at the boundary; branch on `code`.
 */
export class OrangeCatError extends Error {
  readonly code: OrangeCatErrorCode;
  /** HTTP status when applicable (network/timeout errors leave undefined). */
  readonly status?: number;
  /** Server-supplied extra context — Zod issues, etc. */
  readonly details?: unknown;
  /** Retry-After in seconds, when present on a 429. */
  readonly retryAfter?: number;
  /** Original cause (network errors, AbortError, JSON parse failure). */
  readonly cause?: unknown;

  constructor(params: {
    code: OrangeCatErrorCode;
    message: string;
    status?: number;
    details?: unknown;
    retryAfter?: number;
    cause?: unknown;
  }) {
    super(params.message);
    this.name = 'OrangeCatError';
    this.code = params.code;
    this.status = params.status;
    this.details = params.details;
    this.retryAfter = params.retryAfter;
    this.cause = params.cause;
  }

  /** True when an automatic retry is reasonable. */
  get isRetryable(): boolean {
    if (this.code === 'network_error' || this.code === 'timeout') {
      return true;
    }
    if (this.code === 'rate_limited') {
      return true;
    }
    if (this.status && this.status >= 500 && this.status < 600) {
      return true;
    }
    return false;
  }
}

const CODE_BY_STATUS: Record<number, OrangeCatErrorCode> = {
  400: 'validation_error',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  429: 'rate_limited',
};

export function codeForStatus(status: number): OrangeCatErrorCode {
  return CODE_BY_STATUS[status] ?? (status >= 500 ? 'internal_error' : 'unknown');
}
