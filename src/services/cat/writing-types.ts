/**
 * Shared writing-engine types — client-safe (no server imports), so both the
 * server engine and the browser composer import them from one place.
 */

export type WritingKind = 'post' | 'article';

export interface ProposedTopic {
  kind: WritingKind;
  /** The headline / topic itself. */
  title: string;
  /** One line on the angle — why it's worth writing, in their voice. */
  angle: string;
}

export interface ArticleDraft {
  title: string;
  excerpt: string;
  body: string;
}

export interface PostDraft {
  text: string;
}
