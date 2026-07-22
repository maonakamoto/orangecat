'use client';

import { useCallback, type RefObject } from 'react';

/**
 * Selection-aware markdown editing for a controlled <textarea>. Each action
 * computes the new value + caret range, pushes the value through the parent's
 * onChange, then restores the selection on the next frame (the textarea DOM node
 * is stable via the ref, so the caret survives React's re-render).
 */
export interface MarkdownActions {
  /** Wrap the selection with `before`/`after` (e.g. ** ** ); inserts `placeholder` if empty. */
  wrap: (before: string, after?: string, placeholder?: string) => void;
  /** Prefix each selected line (e.g. "## ", "- ", "> "). Toggles the prefix off if already present. */
  prefixLines: (prefix: string) => void;
  /** Insert a markdown link around the selection. */
  insertLink: () => void;
}

export function useMarkdownTextarea(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string,
  onChange: (next: string) => void
): MarkdownActions {
  const apply = useCallback(
    (next: string, selStart: number, selEnd: number) => {
      onChange(next);
      requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) {
          return;
        }
        el.focus();
        el.setSelectionRange(selStart, selEnd);
      });
    },
    [onChange, ref]
  );

  const wrap = useCallback(
    (before: string, after = before, placeholder = 'text') => {
      const el = ref.current;
      if (!el) {
        return;
      }
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const selected = value.slice(start, end) || placeholder;
      const next = value.slice(0, start) + before + selected + after + value.slice(end);
      apply(next, start + before.length, start + before.length + selected.length);
    },
    [apply, ref, value]
  );

  const prefixLines = useCallback(
    (prefix: string) => {
      const el = ref.current;
      if (!el) {
        return;
      }
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const block = value.slice(lineStart, end);
      const allPrefixed = block.split('\n').every(l => l.startsWith(prefix));
      const transformed = block
        .split('\n')
        .map(l => (allPrefixed ? l.slice(prefix.length) : prefix + l))
        .join('\n');
      const next = value.slice(0, lineStart) + transformed + value.slice(end);
      const delta = transformed.length - block.length;
      apply(next, lineStart, end + delta);
    },
    [apply, ref, value]
  );

  const insertLink = useCallback(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const label = value.slice(start, end) || 'link text';
    const snippet = `[${label}](url)`;
    const next = value.slice(0, start) + snippet + value.slice(end);
    // Select the "url" placeholder so the user can type it immediately.
    const urlStart = start + label.length + 3;
    apply(next, urlStart, urlStart + 3);
  }, [apply, ref, value]);

  return { wrap, prefixLines, insertLink };
}
