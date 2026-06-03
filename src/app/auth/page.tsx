'use client';

import Link from 'next/link';
import { AlertCircle, ArrowLeft, CheckCircle2, RefreshCw } from 'lucide-react';
import { ROUTES } from '@/config/routes';
import Button from '@/components/ui/Button';
import Loading from '@/components/Loading';
import { MFAVerify } from '@/components/auth/MFAVerify';
import { AuthHeroPanel } from './AuthHeroPanel';
import { AuthFormBody } from './AuthFormBody';
import { AuthSocialLogin } from './AuthSocialLogin';
import { useAuthForm } from './useAuthForm';
import { APP_NAME } from '@/config/brand';

export default function AuthPage() {
  const {
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
  } = useAuthForm();

  if (session && hydrated) {
    return <Loading fullScreen message="Welcome back! Setting up your dashboard..." />;
  }

  if (showMFAVerify) {
    return (
      <div className="min-h-screen bg-muted/40 dark:bg-background flex items-center justify-center p-8">
        <MFAVerify
          onVerificationComplete={handleMFAVerificationComplete}
          onCancel={handleMFACancelled}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40 dark:bg-background flex flex-col lg:flex-row">
      <AuthHeroPanel />

      <div className="flex-1 flex flex-col justify-center items-center p-8 lg:p-12 bg-muted/40 dark:bg-background">
        {/* Mobile-only back link — the desktop hero panel hosts the same
            link but is hidden below lg. Without this, mobile users have
            no non-browser escape from the form. */}
        <Link
          href={ROUTES.HOME}
          className="mb-6 inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground transition-colors hover:text-foreground lg:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold mb-2 text-foreground">
              {mode === 'login'
                ? 'Welcome back'
                : mode === 'register'
                  ? 'Get started'
                  : 'Reset password'}
            </h2>
            <p className="text-muted-foreground">
              {mode === 'login'
                ? `Sign in to your ${APP_NAME} account`
                : mode === 'register'
                  ? `Create your ${APP_NAME} account`
                  : 'Enter your email to receive reset instructions'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg oc-error-surface">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-destructive mb-3">{error}</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRetry}
                      disabled={loading}
                      className="text-destructive/80 border-red-200 hover:bg-destructive/10"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Try Again
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearError}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <p className="text-sm text-green-800">{success}</p>
              </div>
            </div>
          )}

          <AuthFormBody
            mode={mode}
            setMode={setMode}
            formData={formData}
            setFormData={setFormData}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            showConfirmPassword={showConfirmPassword}
            setShowConfirmPassword={setShowConfirmPassword}
            loading={loading}
            isPasswordFocused={isPasswordFocused}
            setIsPasswordFocused={setIsPasswordFocused}
            captchaEnabled={captchaEnabled}
            turnstileSiteKey={turnstileSiteKey}
            handleCaptchaSuccess={handleCaptchaSuccess}
            handleCaptchaError={handleCaptchaError}
            handleCaptchaExpire={handleCaptchaExpire}
            rememberMe={rememberMe}
            setRememberMe={setRememberMe}
            handleSubmit={handleSubmit}
            handleForgotPassword={handleForgotPassword}
          />

          <AuthSocialLogin
            mode={mode}
            setMode={setMode}
            loading={loading}
            onOAuthSignIn={handleOAuthSignIn}
            onAnonymousSignIn={handleAnonymousSignIn}
          />
        </div>
      </div>
    </div>
  );
}
