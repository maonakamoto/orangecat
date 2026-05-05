/**
 * API Validation Utilities
 *
 * Centralized validation helpers for API routes to eliminate duplicate validation logic.
 * Used by all API endpoints to ensure consistent validation and error responses.
 *
 * Week 3 Improvement: Consolidates ~80 lines of duplicated validation across API routes
 */

import { NextResponse } from 'next/server';
import { isValidUUID } from '@/lib/validation';
import { apiBadRequest } from '@/lib/api/standardResponse';

/**
 * Validation result type for API validators
 */
interface ApiValidationResult {
  valid: boolean;
  error?: NextResponse;
}

/**
 * Validate UUID format for IDs
 * @param id - ID to validate
 * @param paramName - Name of the parameter (for error message)
 * @returns Validation result with bad request error if invalid
 */
export function validateUUID(
  id: string | null | undefined,
  paramName: string = 'ID'
): ApiValidationResult {
  if (!id) {
    return {
      valid: false,
      error: apiBadRequest(`${paramName} is required`),
    };
  }

  if (!isValidUUID(id)) {
    return {
      valid: false,
      error: apiBadRequest(`Invalid ${paramName} format`),
    };
  }

  return { valid: true };
}

/**
 * Validate that one of multiple IDs is provided (e.g., profile_id OR project_id)
 * @param ids - Object with ID keys and values
 * @param errorMessage - Custom error message
 * @returns Validation result with the valid ID or error
 */
export function validateOneOfIds(
  ids: Record<string, string | null | undefined>,
  errorMessage?: string
): ApiValidationResult & { id?: string; type?: string } {
  const entries = Object.entries(ids).filter(([_key, value]) => value);

  if (entries.length === 0) {
    return {
      valid: false,
      error: apiBadRequest(errorMessage || `One of ${Object.keys(ids).join(', ')} is required`),
    };
  }

  if (entries.length > 1) {
    return {
      valid: false,
      error: apiBadRequest(`Only one of ${Object.keys(ids).join(', ')} can be specified`),
    };
  }

  const [type, id] = entries[0];

  // Validate UUID format
  const uuidResult = validateUUID(id, type);
  if (!uuidResult.valid) {
    return uuidResult;
  }

  return {
    valid: true,
    id: id!,
    type,
  };
}

/**
 * Helper to check validation result and return error if invalid
 */
export function getValidationError(result: ApiValidationResult): NextResponse | null {
  return result.valid ? null : (result.error ?? null);
}
