'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Eye, PenLine } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { cn } from '@/lib/utils';
import { TIMELINE_SURFACE, TIMELINE_VISIBILITY_OPTIONS } from '@/config/timeline';
import { ARTICLE_COPY, ARTICLE_LIMITS, estimateReadingTime } from '@/config/articles';
import { ROUTES } from '@/config/routes';
import { publishArticle } from '@/services/articles/create';
import type { TimelineVisibility } from '@/types/timeline';
import ArticleMarkdown from '../[slug]/ArticleMarkdown';

export default function ArticleComposer({ user }: { user: { id: string } }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState<TimelineVisibility>('public');
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canPublish = title.trim().length > 0 && body.trim().length > 0 && !publishing;
  const readingTime = body.trim() ? estimateReadingTime(body) : 0;

  async function handlePublish() {
    if (!canPublish) {
      return;
    }
    setPublishing(true);
    setError(null);
    const result = await publishArticle(user, {
      title,
      body,
      excerpt: excerpt || undefined,
      coverImage: coverImage || undefined,
      visibility,
    });
    if (!result.success) {
      setError(result.error);
      setPublishing(false);
      return;
    }
    router.push(ROUTES.ARTICLE(result.slug));
  }

  return (
    <div className="min-h-screen bg-surface-page pt-20 pb-24 text-fg-primary">
      <div className="mx-auto w-full max-w-[720px] px-5">
        <Link
          href={ROUTES.ARTICLES}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-fg-secondary transition-colors hover:text-fg-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {ARTICLE_COPY.reader.back}
        </Link>

        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-display text-fg-primary">
            {ARTICLE_COPY.new.heading}
          </h1>
          <p className="mt-1.5 text-sm text-fg-secondary">{ARTICLE_COPY.new.subheading}</p>
        </header>

        {/* Write / Preview tabs */}
        <div className="mb-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTab('write')}
            className={cn(TIMELINE_SURFACE.chip, tab === 'write' && TIMELINE_SURFACE.chipActive)}
          >
            <PenLine className="h-4 w-4" /> Write
          </button>
          <button
            type="button"
            onClick={() => setTab('preview')}
            className={cn(TIMELINE_SURFACE.chip, tab === 'preview' && TIMELINE_SURFACE.chipActive)}
          >
            <Eye className="h-4 w-4" /> Preview
          </button>
          {readingTime > 0 && (
            <span className="ml-auto text-xs text-fg-tertiary">{readingTime} min read</span>
          )}
        </div>

        {tab === 'write' ? (
          <div className="space-y-4">
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={ARTICLE_COPY.new.titlePlaceholder}
              maxLength={ARTICLE_LIMITS.title}
              aria-label="Article title"
              className="!text-xl !font-semibold"
            />
            <Textarea
              value={excerpt}
              onChange={e => setExcerpt(e.target.value)}
              placeholder={ARTICLE_COPY.new.excerptPlaceholder}
              maxLength={ARTICLE_LIMITS.excerpt}
              rows={2}
              aria-label="Excerpt"
            />
            <Input
              value={coverImage}
              onChange={e => setCoverImage(e.target.value)}
              placeholder={ARTICLE_COPY.new.coverLabel}
              type="url"
              aria-label="Cover image URL"
            />
            <Textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder={ARTICLE_COPY.new.bodyPlaceholder}
              rows={18}
              maxLength={ARTICLE_LIMITS.body}
              aria-label="Article body"
              className="font-mono text-sm leading-6"
            />
          </div>
        ) : (
          <div className="rounded-lg border border-subtle bg-surface-page p-6">
            {coverImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverImage}
                alt=""
                className="mb-8 aspect-[2/1] w-full rounded-xl border border-subtle object-cover"
              />
            )}
            <h1 className="text-3xl font-semibold leading-tight tracking-display text-fg-primary">
              {title || 'Untitled'}
            </h1>
            {excerpt && <p className="mt-3 text-lg text-fg-secondary">{excerpt}</p>}
            <div className="mt-6 [&>*:first-child]:mt-0">
              {body.trim() ? (
                <ArticleMarkdown body={body} />
              ) : (
                <p className="text-fg-tertiary">Nothing to preview yet.</p>
              )}
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-md border border-status-negative/25 bg-status-negative/10 px-3 py-2 text-sm text-status-negative">
            {error}
          </p>
        )}

        {/* Publish bar */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-subtle pt-4">
          <div className="flex items-center gap-2">
            {TIMELINE_VISIBILITY_OPTIONS.map(option => {
              const Icon = option.Icon;
              const active = visibility === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setVisibility(option.key)}
                  disabled={publishing}
                  className={cn(TIMELINE_SURFACE.chip, active && TIMELINE_SURFACE.chipActive)}
                  title={option.description}
                >
                  <Icon className="h-4 w-4" />
                  {option.label}
                </button>
              );
            })}
          </div>
          <Button
            variant="accent"
            onClick={handlePublish}
            disabled={!canPublish}
            isLoading={publishing}
          >
            {publishing ? ARTICLE_COPY.new.publishing : ARTICLE_COPY.new.publish}
          </Button>
        </div>
      </div>
    </div>
  );
}
