import type { Metadata } from 'next';
import Link from 'next/link';
import { Clock, PenLine } from 'lucide-react';
import { listPublishedArticles } from '@/services/articles/get-article';
import { ARTICLE_COPY } from '@/config/articles';
import { ROUTES } from '@/config/routes';

// Reads the viewer's session cookies (via the server Supabase client), so this
// route is inherently dynamic — declare it to skip the static-prerender attempt.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Articles',
  description: 'Long-form thinking from the OrangeCat community — Bitcoin-native, free to read.',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default async function ArticlesIndexPage() {
  const articles = await listPublishedArticles();

  return (
    <div className="min-h-screen bg-surface-page pt-20 pb-24 text-fg-primary">
      <div className="mx-auto w-full max-w-2xl px-5">
        <header className="mb-10 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-display text-fg-primary">
              {ARTICLE_COPY.index.heading}
            </h1>
            <p className="mt-2 text-fg-secondary">{ARTICLE_COPY.index.subheading}</p>
          </div>
          <Link
            href={ROUTES.ARTICLES_NEW}
            className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-md bg-accent-warm px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-warm-hover"
          >
            <PenLine className="h-4 w-4" />
            <span className="hidden sm:inline">{ARTICLE_COPY.index.write}</span>
          </Link>
        </header>

        {articles.length === 0 ? (
          <div className="rounded-lg border border-subtle bg-surface-raised/30 px-6 py-16 text-center">
            <p className="text-fg-secondary">{ARTICLE_COPY.index.empty}</p>
            <Link
              href={ROUTES.ARTICLES_NEW}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-warm hover:underline"
            >
              <PenLine className="h-4 w-4" />
              {ARTICLE_COPY.index.write}
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-subtle">
            {articles.map(article => (
              <li key={article.id}>
                <Link
                  href={ROUTES.ARTICLE(article.slug)}
                  className="group flex gap-4 py-6 transition-opacity hover:opacity-90"
                >
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-semibold leading-snug text-fg-primary group-hover:text-accent-warm">
                      {article.title}
                    </h2>
                    {article.excerpt && (
                      <p className="mt-1.5 line-clamp-2 text-fg-secondary">{article.excerpt}</p>
                    )}
                    <div className="mt-3 flex items-center gap-3 text-sm text-fg-tertiary">
                      <span className="font-medium text-fg-secondary">{article.author.name}</span>
                      <span aria-hidden>·</span>
                      <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {article.readingTime} min
                      </span>
                    </div>
                  </div>
                  {article.coverImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={article.coverImage}
                      alt=""
                      className="h-20 w-28 flex-shrink-0 rounded-lg border border-subtle object-cover"
                    />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
