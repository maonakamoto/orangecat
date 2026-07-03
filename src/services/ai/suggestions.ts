/**
 * My Cat suggestion generation — pure functions, no DB dependencies.
 */

import { CAT_QUICKSTARTS, selectQuickstarts } from '@/config/cat-quickstarts';
import type { DocumentContext, FullUserContext } from './document-context';

function truncate(str: string, maxLen: number): string {
  return str.length <= maxLen ? str : str.substring(0, maxLen - 3) + '...';
}

const DOCUMENT_TYPE_SUGGESTIONS: Record<string, (doc: DocumentContext) => string[]> = {
  goals: doc => {
    const s = [
      `Help me make progress on my goal: "${truncate(doc.title, 40)}"`,
      `What's a good first step for achieving "${truncate(doc.title, 35)}"?`,
    ];
    if (doc.content.toLowerCase().includes('bitcoin')) {
      s.push('How can I accelerate my Bitcoin journey?');
    }
    if (doc.content.toLowerCase().includes('learn')) {
      s.push('Create a learning plan based on my goals');
    }
    return s;
  },
  skills: doc => {
    const s = [
      `How can I monetize my ${truncate(doc.title, 30)} skills on OrangeCat?`,
      `What products could I create with my skills?`,
    ];
    const lc = doc.content.toLowerCase();
    if (lc.includes('development') || lc.includes('coding')) {
      s.push('What digital products should a developer sell?');
    }
    if (lc.includes('design')) {
      s.push('How can I sell design services on OrangeCat?');
    }
    return s;
  },
  background: _doc => [
    `How can my background help me succeed on OrangeCat?`,
    `What unique value can I offer based on my experience?`,
  ],
  preferences: _doc => [
    `Recommend products to create based on my preferences`,
    `What kind of projects align with my values?`,
  ],
  plans: doc => [
    `Help me refine my plan: "${truncate(doc.title, 35)}"`,
    `What's the next milestone for "${truncate(doc.title, 30)}"?`,
    `How should I price my planned offerings?`,
  ],
  notes: doc => [
    `Help me develop this idea: "${truncate(doc.title, 35)}"`,
    `Turn my notes into an actionable plan`,
  ],
  other: _doc => [`Give me advice based on my context`, `What opportunities should I consider?`],
};

// Shown to anonymous visitors, on fetch errors, and to signed-in users with
// zero context — all of whom have 0 entities, so the noEntities quick-start
// tier is exactly right. SSOT: src/config/cat-quickstarts.ts.
export const DEFAULT_SUGGESTIONS: string[] = [...CAT_QUICKSTARTS.noEntities];

const CONTEXT_AWARE_GENERIC = [
  'What should I create next based on my context?',
  'How can I grow my presence on OrangeCat?',
  'Analyze my goals and suggest a strategy',
  'What Bitcoin opportunities align with my skills?',
];

/**
 * Returns true when the user has enough context for the Cat to give personalised advice.
 * Includes profile info, entities, documents, tasks, and wallets — not just documents.
 */
export function hasRichContext(context: FullUserContext): boolean {
  return (
    !!(context.profile?.name || context.profile?.bio || context.profile?.background) ||
    context.entities.length > 0 ||
    context.documents.length > 0 ||
    context.tasks.length > 0 ||
    context.wallets.length > 0
  );
}

/**
 * Generate context-aware suggestions from the full user context.
 * Prioritises entity-based gaps, then document-based suggestions, then generic.
 */
export function generateSuggestionsFromContext(context: FullUserContext): string[] {
  if (!hasRichContext(context)) {
    return DEFAULT_SUGGESTIONS;
  }

  const suggestions: string[] = [];
  const used = new Set<string>();

  function add(s: string) {
    if (!used.has(s) && suggestions.length < 6) {
      suggestions.push(s);
      used.add(s);
    }
  }

  // 1. Quick-start tier — the economically useful next step for this user's
  //    state (no entities → get set up; entities w/o wallet → get paid;
  //    both → grow). SSOT + rules: src/config/cat-quickstarts.ts.
  for (const s of selectQuickstarts({
    entityCount: context.entities.length,
    hasWallet: context.wallets.length > 0,
  })) {
    add(s);
  }

  // 2. One named-entity suggestion — the most personal chip we can offer
  const firstProduct = context.entities.find(e => e.type === 'product');
  const firstService = context.entities.find(e => e.type === 'service');
  const firstProject = context.entities.find(e => e.type === 'project');
  const firstCause = context.entities.find(e => e.type === 'cause');

  if (firstProduct) {
    add(`Help me write a better description for "${truncate(firstProduct.title, 35)}"`);
  } else if (firstService) {
    add(`How can I attract more clients for "${truncate(firstService.title, 35)}"?`);
  } else if (firstProject) {
    add(`What should the next milestone be for "${truncate(firstProject.title, 35)}"?`);
  } else if (firstCause) {
    add(`How do I grow support for "${truncate(firstCause.title, 35)}"?`);
  }

  // 2b. Light nudges from non-entity context (mostly reachable for users
  //     without entities, where the tier leaves a free slot)
  if (context.tasks.length > 0) {
    add('Help me prioritize my current tasks');
  }

  // 3. Document-based suggestions
  for (const doc of context.documents) {
    const generator =
      DOCUMENT_TYPE_SUGGESTIONS[doc.document_type || 'other'] || DOCUMENT_TYPE_SUGGESTIONS.other;
    for (const s of generator(doc)) {
      add(s);
    }
  }

  // 4. Generic fallbacks
  for (const s of CONTEXT_AWARE_GENERIC) {
    add(s);
  }

  return suggestions.slice(0, 4);
}
