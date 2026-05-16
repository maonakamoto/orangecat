'use client';

import React from 'react';
import Link from 'next/link';
import { TimelineDisplayEvent } from '@/types/timeline';
import { renderMarkdownToReact } from '@/utils/markdown';

interface PostContentProps {
  event: TimelineDisplayEvent;
}

export function PostContent({ event }: PostContentProps) {
  // Handle repost display
  const isRepost = event.metadata?.is_repost;
  const isQuoteRepost = event.metadata?.is_quote_repost;

  // Original post details for reposts
  const originalAuthor = {
    name: event.metadata?.original_actor_name || event.actor.name || 'Original author',
    username: event.metadata?.original_actor_username || event.actor.username || '',
    avatar: event.metadata?.original_actor_avatar || event.actor.avatar || '/default-avatar.svg',
  };
  const originalDescription = event.metadata?.original_description || '';
  const originalEventId = event.metadata?.original_event_id;

  // Get the content to display
  const getDisplayContent = () => {
    if (isQuoteRepost) {
      return event.description || ''; // Quote text
    }
    if (isRepost && !isQuoteRepost) {
      return event.metadata?.original_description || '';
    }
    return event.description || '';
  };

  const displayContent = getDisplayContent();

  // Threads-like: never show separate titles; keep posts conversational
  const _shouldShowTitle = false;

  return (
    <div className="space-y-2">
      {/* Thread affordance: one-level parent preview + view conversation link */}
      {event.parentEventId && !isRepost && (
        <div className="-mt-1 mb-1 text-xs text-muted-foreground">
          Replying in a thread ·{' '}
          <button
            className="text-tiffany-600 hover:underline"
            onClick={() => {
              try {
                const url = new URL(window.location.href);
                url.searchParams.set('focus', event.parentEventId!);
                window.history.replaceState({}, '', url.toString());
                const el = document.querySelector(`[data-event-id="${event.parentEventId}"]`);
                if (el) {
                  (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              } catch {}
            }}
          >
            View conversation
          </button>
        </div>
      )}
      {/* Titles removed for fluid, threads-like design */}

      {/* Event Description/Content */}
      {displayContent && (!isRepost || isQuoteRepost) && (
        <div className="text-foreground text-[15px] leading-relaxed whitespace-pre-line break-words">
          {renderMarkdownToReact(displayContent)}
        </div>
      )}

      {/* Subject/Target Links */}
      {(event.subject || event.target) && event.metadata?.is_user_post !== true && (
        <div className="flex gap-2">
          {event.subject && event.subject.url && (
            <Link
              href={event.subject.url}
              className="text-tiffany-600 hover:text-tiffany-800 text-sm font-medium"
            >
              {event.subject.name}
            </Link>
          )}
          {event.target && <span className="text-gray-400 dark:text-muted-foreground">→</span>}
          {event.target && event.target.url && (
            <Link
              href={event.target.url}
              className="text-tiffany-600 hover:text-tiffany-800 text-sm font-medium"
            >
              {event.target.name}
            </Link>
          )}
        </div>
      )}

      {/* Quoted Original Post (for quote reposts) */}
      {isQuoteRepost && originalEventId && (
        <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card hover:bg-gray-50 dark:hover:bg-muted transition-colors">
          <div className="p-3 sm:p-4 space-y-2">
            <div className="flex items-start gap-3">
              <Link href={`/profiles/${originalAuthor.username}`} className="flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element -- Dynamic user avatar */}
                <img
                  src={originalAuthor.avatar}
                  alt={originalAuthor.name}
                  className="w-9 h-9 rounded-full"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 flex-wrap">
                  <Link
                    href={`/profiles/${originalAuthor.username}`}
                    className="font-semibold text-foreground hover:underline"
                  >
                    {originalAuthor.name}
                  </Link>
                  {originalAuthor.username && (
                    <span className="text-muted-foreground text-sm">
                      @{originalAuthor.username}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {originalDescription ? (
              <div className="text-foreground text-sm leading-relaxed whitespace-pre-line break-words">
                {renderMarkdownToReact(originalDescription)}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Original post
                <Link
                  href={`?focus=${originalEventId}`}
                  className="ml-2 text-tiffany-600 hover:text-tiffany-800 font-medium"
                >
                  View
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Simple Repost: show original post inside a quoted card for consistency */}
      {isRepost && !isQuoteRepost && event.metadata?.original_event_id && (
        <div className="mt-2 overflow-hidden rounded-2xl border border-border bg-card hover:bg-gray-50 dark:hover:bg-muted transition-colors">
          <div className="p-3 sm:p-4 space-y-2">
            <div className="flex items-start gap-3">
              <Link href={`/profiles/${originalAuthor.username}`} className="flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element -- Dynamic user avatar */}
                <img
                  src={originalAuthor.avatar}
                  alt={originalAuthor.name}
                  className="w-9 h-9 rounded-full"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 flex-wrap">
                  <Link
                    href={`/profiles/${originalAuthor.username}`}
                    className="font-semibold text-foreground hover:underline"
                  >
                    {originalAuthor.name}
                  </Link>
                  {originalAuthor.username && (
                    <span className="text-muted-foreground text-sm">
                      @{originalAuthor.username}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {originalDescription && (
              <div className="text-foreground text-sm leading-relaxed whitespace-pre-line break-words">
                {renderMarkdownToReact(originalDescription)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FUTURE: Add media rendering (images, videos, embeds) — requires media upload pipeline and storage bucket setup before attachments can be displayed */}
      {(() => {
        const attachments =
          (event.metadata?.attachments as Array<{ type: string; filename: string }>) || [];
        return attachments.length > 0 ? (
          <div className="mt-3 space-y-2">
            {attachments.map((attachment: { type: string; filename: string }, index: number) => (
              <div key={index} className="bg-gray-100 dark:bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Media attachment: {attachment.type} - {attachment.filename}
                </p>
              </div>
            ))}
          </div>
        ) : null;
      })()}
    </div>
  );
}
