/**
 * TOOL CALL CHIP
 *
 * Visible chip showing what tool Cat used to answer — search_platform,
 * prefill_entity_form, etc. Chronology: chip appears as the tool runs,
 * then settles into completed/no_results/failed state. Click to expand
 * any results so the user can navigate straight to the cited entities.
 *
 * Without this, Cat's tool work is silent and looks like magic — users
 * cannot tell what data informed any given answer.
 */

import { useState } from 'react';
import Link from 'next/link';
import { Search, Check, AlertCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ToolCallEvent } from '../types';

const TOOL_LABELS: Record<string, { running: string; verb: string }> = {
  search_platform: { running: 'Searching', verb: 'Search' },
};

interface ToolCallChipProps {
  event: ToolCallEvent;
}

export function ToolCallChip({ event }: ToolCallChipProps) {
  const [expanded, setExpanded] = useState(false);
  const label = TOOL_LABELS[event.name] ?? { running: 'Running', verb: event.name };

  const query = event.status === 'running' ? (event.args?.query as string | undefined) : undefined;

  const completedResults =
    event.status === 'completed' && event.results.length > 0 ? event.results : null;
  const expandable = completedResults !== null;

  let icon: React.ReactNode;
  let badgeClass: string;
  let text: string;

  switch (event.status) {
    case 'running':
      icon = <Loader2 className="h-3 w-3 flex-shrink-0 animate-spin" />;
      badgeClass = 'border-border-subtle bg-muted text-muted-foreground';
      text = query ? `${label.running} "${query}"…` : `${label.running}…`;
      break;
    case 'completed':
      icon = <Check className="h-3 w-3 flex-shrink-0" />;
      badgeClass = 'border-status-positive/20 bg-status-positive-subtle text-status-positive';
      text = `Found ${event.resultCount} ${event.resultCount === 1 ? 'result' : 'results'}`;
      break;
    case 'no_results':
      icon = <Search className="h-3 w-3 flex-shrink-0" />;
      badgeClass = 'border-border-subtle bg-muted text-muted-foreground';
      text = query ? `No results for "${query}"` : 'No results';
      break;
    case 'failed':
      icon = <AlertCircle className="h-3 w-3 flex-shrink-0" />;
      badgeClass = 'border-destructive/20 bg-destructive/10 text-destructive';
      text = 'Search failed';
      break;
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => expandable && setExpanded(v => !v)}
        disabled={!expandable}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 text-xs',
          badgeClass,
          expandable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
        )}
      >
        {icon}
        <span>{text}</span>
        {expandable && (
          <span aria-hidden>
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </span>
        )}
      </button>

      {expanded && completedResults && (
        <ul className="ml-2 space-y-1 border-l border-border-subtle pl-3 text-xs">
          {completedResults.map(r => (
            <li key={r.url}>
              <Link href={r.url} className="text-foreground underline-offset-2 hover:underline">
                {r.title}
              </Link>
              <span className="ml-2 text-muted-dim">· {r.type}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
