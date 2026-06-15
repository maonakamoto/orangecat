'use client';

import { Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { OAUTH_PROVIDERS } from './OAuthIcons';
import { useEnabledOAuthProviders } from './oauthProviders';
import type { AuthMode, OAuthProvider } from './useAuthForm';

interface AuthSocialLoginProps {
  mode: AuthMode;
  setMode: (mode: AuthMode) => void;
  loading: boolean;
  onOAuthSignIn: (provider: OAuthProvider) => void;
  onAnonymousSignIn: () => void;
}

export function AuthSocialLogin({
  mode,
  setMode,
  loading,
  onOAuthSignIn,
  onAnonymousSignIn,
}: AuthSocialLoginProps) {
  // Only show providers the server actually has enabled — never a button that fails.
  const { enabled } = useEnabledOAuthProviders();
  const providers = OAUTH_PROVIDERS.filter(p => enabled.has(p.id));

  if (mode === 'forgot') {
    return (
      <div className="mt-6 text-center">
        <p className="text-fg-secondary text-sm">Remember your password?</p>
        <button
          onClick={() => setMode('login')}
          disabled={loading}
          className="mt-1 font-semibold text-fg-primary hover:text-fg-primary"
        >
          Sign in instead
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Single divider — was two stacked dividers ("or continue with" then
          "or") which looked broken. One divider, OAuth grid below, an
          anonymous-sign-in TEXT LINK below that (no second full-width
          button competing for attention with the OAuth options). */}
      <div className="mt-6">
        {/* Social providers — only rendered for providers the server has
            enabled (see useEnabledOAuthProviders). When none are enabled the
            whole "Or continue with" block is omitted so users only ever see
            working options (email + anonymous). */}
        {providers.length > 0 && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-default" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-wider">
                <span className="bg-surface-raised/40 dark:bg-surface-page px-3 text-fg-tertiary">
                  Or continue with
                </span>
              </div>
            </div>

            <div
              className={
                providers.length >= 3
                  ? 'mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4'
                  : 'mt-4 grid grid-cols-2 gap-3'
              }
            >
              {providers.map(({ id, name, icon: Icon }) => (
                <Button
                  key={id}
                  type="button"
                  variant="outline"
                  disabled={loading}
                  onClick={() => onOAuthSignIn(id)}
                  className="h-11 w-full border-subtle hover:border-default hover:bg-surface-raised/60"
                  aria-label={`Sign in with ${name}`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="ml-2 text-sm font-medium sm:hidden">{name}</span>
                </Button>
              ))}
            </div>
          </>
        )}

        {/* Anonymous sign-in — secondary text link, not a heavyweight button.
            Privacy-conscious users will find it; default users won't be
            distracted by it. */}
        <div className="mt-5 text-center">
          <button
            type="button"
            disabled={loading}
            onClick={onAnonymousSignIn}
            className="inline-flex items-center gap-1 text-sm text-fg-secondary hover:text-fg-primary disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Continuing…</span>
              </>
            ) : (
              <>
                Try it anonymously
                <span className="text-fg-tertiary">— upgrade anytime</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-fg-secondary text-sm">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
        </p>
        <button
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          disabled={loading}
          className="mt-1 font-semibold text-fg-primary hover:text-fg-primary"
        >
          {mode === 'login' ? 'Create an account' : 'Sign in instead'}
        </button>
      </div>
    </>
  );
}
