import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, useRedirectIfAuthenticated } from '@/hooks/useAuth';
import { signInAnonymously } from '@/services/supabase/auth';
import { getReadableError } from '@/utils/getReadableError';
import supabase from '@/lib/supabase/browser';
import { useAuthSubmission } from './useAuthSubmission';

export type OAuthProvider = 'google' | 'github' | 'apple' | 'x' | 'facebook';

export type AuthMode = 'login' | 'register' | 'forgot';

export interface AuthFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

export function useAuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, signUp, isLoading: authLoading, hydrated, session, profile, clear } = useAuth();
  const { isLoading: redirectLoading } = useRedirectIfAuthenticated();

  const [mode, setMode] = useState<AuthMode>('login');

  useEffect(() => {
    const modeParam = searchParams?.get('mode');
    if (modeParam === 'login' || modeParam === 'register') {
      setMode(modeParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (hydrated && !session && !profile) {
      clear();
    }
  }, [hydrated, session, profile, clear]);

  const [formData, setFormData] = useState<AuthFormData>({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [showMFAVerify, setShowMFAVerify] = useState(false);

  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const captchaEnabled = !!turnstileSiteKey;

  const handleCaptchaSuccess = useCallback((token: string) => {
    setCaptchaToken(token);
  }, []);

  const handleCaptchaError = useCallback((_err: string) => {
    setCaptchaToken(null);
  }, []);

  const handleCaptchaExpire = useCallback(() => {
    setCaptchaToken(null);
  }, []);

  const {
    localLoading,
    error,
    success,
    retryCount,
    handleSubmit,
    handleForgotPassword,
    handleRetry,
    handleClearError,
  } = useAuthSubmission({
    formData,
    mode,
    captchaEnabled,
    captchaToken,
    setCaptchaToken,
    setMode,
    setShowMFAVerify,
    rememberMe,
    signIn,
    signUp,
  });

  const loading = localLoading || authLoading;
  const _isCurrentlyLoading = loading || redirectLoading;

  useEffect(() => {
    if (session?.user && hydrated) {
      const redirectUrl = searchParams?.get('from') || '/dashboard';
      router.replace(redirectUrl);
    }
  }, [session, hydrated, router, searchParams]);

  const handleMFAVerificationComplete = () => {
    setShowMFAVerify(false);
  };

  const handleMFACancelled = () => {
    setShowMFAVerify(false);
    clear();
  };

  const handleOAuthSignIn = async (provider: OAuthProvider) => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        throw error;
      }
    } catch (err) {
      getReadableError(err, `Failed to sign in with ${provider}`);
    }
  };

  const handleAnonymousSignIn = async () => {
    try {
      const result = await signInAnonymously();
      if (result.error) {
        throw new Error(getReadableError(result.error, 'Anonymous sign-in failed'));
      }
      const redirectUrl = searchParams?.get('from') || '/dashboard';
      router.replace(redirectUrl);
    } catch (err) {
      getReadableError(err, 'Anonymous sign-in failed');
    }
  };

  return {
    mode,
    setMode,
    formData,
    setFormData,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    loading,
    error,
    success,
    rememberMe,
    setRememberMe,
    isPasswordFocused,
    setIsPasswordFocused,
    showMFAVerify,
    session,
    hydrated,
    captchaToken,
    captchaEnabled,
    turnstileSiteKey,
    handleCaptchaSuccess,
    handleCaptchaError,
    handleCaptchaExpire,
    handleSubmit,
    handleForgotPassword,
    handleRetry,
    handleClearError,
    handleMFAVerificationComplete,
    handleMFACancelled,
    handleOAuthSignIn,
    handleAnonymousSignIn,
    _isCurrentlyLoading,
    retryCount,
  };
}
