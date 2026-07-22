/**
 * Browser client for the AI writing endpoints. Thin fetch wrappers that return
 * typed drafts/topics, or throw a friendly Error the composer can surface.
 */

import type {
  ArticleDraft,
  PostDraft,
  ProposedTopic,
  WritingKind,
} from '@/services/cat/writing-types';

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new Error(json?.error || 'The AI writer is unavailable right now. Please try again.');
  }
  return json.data as T;
}

export function fetchWritingTopics(opts: {
  kind?: WritingKind | 'any';
  count?: number;
  focus?: string;
}): Promise<ProposedTopic[]> {
  return postJson<{ topics: ProposedTopic[] }>('/api/ai/writing/topics', opts).then(d => d.topics);
}

export function fetchArticleDraft(opts: { topic?: string; focus?: string }): Promise<ArticleDraft> {
  return postJson<{ draft: ArticleDraft }>('/api/ai/writing/draft', {
    mode: 'article',
    ...opts,
  }).then(d => d.draft);
}

export function fetchPostDraft(opts: { topic?: string; focus?: string }): Promise<PostDraft> {
  return postJson<{ draft: PostDraft }>('/api/ai/writing/draft', { mode: 'post', ...opts }).then(
    d => d.draft
  );
}
