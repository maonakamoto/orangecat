/**
 * Common Types
 *
 * Shared types used across the codebase.
 * Keep this file lean — only add what is actually imported by multiple modules.
 */

/**
 * Standard service-layer result for operations that return success/failure.
 * For operations that also return data, extend inline:
 *   Promise<ServiceResult & { data: MyType }>
 */
export type ServiceResult = { success: boolean; error?: string };

/** Asset verification status levels */
export type VerificationStatus = 'unverified' | 'user_provided' | 'third_party_verified';

// ==================== UTILITY FUNCTIONS ====================

function isError(value: unknown): value is Error {
  return value instanceof Error;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasMessage(error: unknown): error is { message: string } {
  return isObject(error) && 'message' in error && isString(error.message);
}

/** Extract a human-readable message from any thrown value. */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  if (isString(error)) {
    return error;
  }
  if (hasMessage(error)) {
    return error.message;
  }
  return 'Unknown error occurred';
}
