/**
 * Publish an article. Reuses the timeline post-creation pipeline
 * (`createEventWithVisibility`) verbatim — an article is a long-form post — and
 * carries its long-form payload in `metadata.article`. No new table, no new RPC.
 */

import { timelineService } from '@/services/timeline';
import { logger } from '@/utils/logger';
import {
  ARTICLE_EVENT_TYPE,
  ARTICLE_LIMITS,
  buildArticleSlug,
  deriveExcerpt,
  estimateReadingTime,
  shortToken,
} from '@/config/articles';
import type { CreateArticleInput } from './types';

interface PublishArticleUser {
  id: string;
}

type PublishArticleResult = { success: true; slug: string } | { success: false; error: string };

export async function publishArticle(
  user: PublishArticleUser,
  input: CreateArticleInput
): Promise<PublishArticleResult> {
  const title = input.title.trim();
  const body = input.body.trim();

  if (!title) {
    return { success: false, error: 'Give your article a title.' };
  }
  if (title.length > ARTICLE_LIMITS.title) {
    return { success: false, error: `Title must be ${ARTICLE_LIMITS.title} characters or fewer.` };
  }
  if (body.length < ARTICLE_LIMITS.bodyMin) {
    return { success: false, error: 'Write something before publishing.' };
  }
  if (body.length > ARTICLE_LIMITS.body) {
    return { success: false, error: 'This article is too long to publish.' };
  }

  const excerpt = (input.excerpt?.trim() || deriveExcerpt(body)).slice(0, ARTICLE_LIMITS.excerpt);
  const slug = buildArticleSlug(title, shortToken());
  const coverImage = input.coverImage?.trim() || undefined;

  // Owner (profile) timeline + community feed when public — mirrors the short-post
  // distribution contexts so articles surface everywhere posts do.
  const timelineContexts: Array<{
    timeline_type: 'profile' | 'project' | 'community';
    timeline_owner_id: string | null;
  }> = [{ timeline_type: 'profile', timeline_owner_id: user.id }];
  if (input.visibility === 'public') {
    timelineContexts.push({ timeline_type: 'community', timeline_owner_id: null });
  }

  const result = await timelineService.createEventWithVisibility({
    eventType: ARTICLE_EVENT_TYPE,
    actorId: user.id,
    subjectType: 'profile',
    subjectId: user.id,
    title,
    description: excerpt,
    visibility: input.visibility,
    metadata: {
      is_user_post: true,
      is_article: true,
      article: {
        slug,
        cover_image: coverImage,
        reading_time: estimateReadingTime(body),
        body,
      },
    },
    timelineContexts,
  });

  if (!result.success) {
    logger.error('Failed to publish article', { error: result.error }, 'Articles');
    return { success: false, error: result.error || 'Failed to publish article.' };
  }

  return { success: true, slug };
}
