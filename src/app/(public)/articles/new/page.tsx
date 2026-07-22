'use client';

import Link from 'next/link';
import { useRequireAuth } from '@/hooks/useAuthRedirects';
import { ROUTES } from '@/config/routes';
import Button from '@/components/ui/Button';
import ArticleComposer from './ArticleComposer';

export default function NewArticlePage() {
  const { user, isLoading } = useRequireAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-page">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-subtle border-t-accent-warm" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-page px-6 text-center">
        <p className="text-fg-secondary">Sign in to write an article.</p>
        <Link href={`${ROUTES.AUTH}?mode=login`}>
          <Button variant="accent">Sign in</Button>
        </Link>
      </div>
    );
  }

  return <ArticleComposer user={{ id: user.id }} />;
}
