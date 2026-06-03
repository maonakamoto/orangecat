'use client';

import { Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { OAUTH_PROVIDERS } from './OAuthIcons';
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
  if (mode === 'forgot') {
    return (
      <div className="mt-6 text-center">
        <p className="text-muted-foreground text-sm">Remember your password?</p>
        <button
          onClick={() => setMode('login')}
          disabled={loading}
          className="mt-1 font-semibold text-foreground hover:text-muted-strong"
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
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-wider">
            <span className="bg-muted/40 dark:bg-background px-3 text-muted-dim">
              Or continue with
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {OAUTH_PROVIDERS.map(({ id, name, icon: Icon }) => (
            <Button
              key={id}
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => onOAuthSignIn(id)}
              className="h-11 w-full border-border-subtle hover:border-border hover:bg-muted/60"
              aria-label={`Sign in with ${name}`}
            >
              <Icon className="h-5 w-5" />
              <span className="ml-2 text-sm font-medium sm:hidden">{name}</span>
            </Button>
          ))}
        </div>

        {/* Anonymous sign-in — secondary text link, not a heavyweight button.
            Privacy-conscious users will find it; default users won't be
            distracted by it. */}
        <div className="mt-5 text-center">
          <button
            type="button"
            disabled={loading}
            onClick={onAnonymousSignIn}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Continuing…</span>
              </>
            ) : (
              <>
                Try it anonymously
                <span className="text-muted-dim">— upgrade anytime</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-muted-foreground text-sm">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
        </p>
        <button
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          disabled={loading}
          className="mt-1 font-semibold text-foreground hover:text-muted-strong"
        >
          {mode === 'login' ? 'Create an account' : 'Sign in instead'}
        </button>
      </div>
    </>
  );
}
