/**
 * SUPABASE TYPES - COMPREHENSIVE TYPE DEFINITIONS
 *
 * This file provides type safety for all Supabase operations,
 * replacing dangerous 'any' types with proper interfaces.
 *
 * Created: 2025-06-08
 * Last Modified: 2025-06-08
 * Last Modified Summary: Initial creation with auth, profile, and project types
 */

import { Session, User } from '@supabase/supabase-js';
import type { Profile } from '@/types/profile';

// Re-export canonical Profile type from SSOT
export type { Profile } from '@/types/profile';

// ==================== AUTH TYPES ====================

export interface AuthResponse {
  data: {
    user: User | null;
    session: Session | null;
  };
  error: Error | null;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignUpRequest {
  email: string;
  password: string;
  emailRedirectTo?: string;
}

export interface AuthError extends Error {
  message: string;
  status?: number;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordUpdateRequest {
  newPassword: string;
}

// ==================== PROFILE TYPES ====================

// Profile is re-exported from @/types/profile above (SSOT)

export interface ProfileUpdateData {
  username?: string | null;
  name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  bitcoin_address?: string | null;
  lightning_address?: string | null;
  updated_at?: string;
}

export interface ProfileResponse {
  data: Profile | null;
  error: Error | null;
}

export interface ProfileUpdateResponse {
  data: Profile | null;
  error: Error | null;
  status?: string | number;
}

// ==================== TYPE GUARDS ====================

export function isAuthError(error: unknown): error is AuthError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as AuthError).message === 'string'
  );
}

export function isValidProfile(data: unknown): data is Profile {
  return (
    data !== null &&
    typeof data === 'object' &&
    'id' in data &&
    typeof (data as Profile).id === 'string' &&
    'created_at' in data &&
    typeof (data as Profile).created_at === 'string' &&
    'updated_at' in data &&
    typeof (data as Profile).updated_at === 'string'
  );
}
