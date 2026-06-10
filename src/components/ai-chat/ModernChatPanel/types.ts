/**
 * MODERN CHAT PANEL TYPES
 * Shared types for the chat panel components
 */

// SSOT shared types from @/types/cat
import type {
  SuggestedAction,
  SuggestedWalletAction,
  CatAction,
  ExecActionResult,
} from '@/types/cat';
export type { SuggestedAction, SuggestedWalletAction, CatAction, ExecActionResult };

/**
 * One entity surfaced by a Cat tool call (search_platform, etc.).
 * Carries the route URL + type so the UI can link directly to the entity page.
 */
export interface ToolCallResultRef {
  url: string;
  type: string;
  title: string;
}

/**
 * A tool the Cat invoked during this response. Shown to the user as a chip
 * above the message so the work the Cat did is never invisible.
 *
 * Discriminated by `status` so consumers get proper narrowing — `results` only
 * exists on the 'completed' variant, not on every state.
 */
export type ToolCallEvent =
  | {
      id: string;
      name: string;
      status: 'running';
      args?: Record<string, unknown>;
    }
  | {
      id: string;
      name: string;
      status: 'completed';
      resultCount: number;
      results: ToolCallResultRef[];
    }
  | {
      id: string;
      name: string;
      status: 'no_results';
    }
  | {
      id: string;
      name: string;
      status: 'failed';
      error?: string;
    };

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  modelUsed?: string;
  /** LLM provider this response came from ('groq' | 'openrouter'). */
  provider?: string;
  actions?: CatAction[];
  execResults?: ExecActionResult[];
  /** Tool calls the Cat made during this response. Rendered as chips above content. */
  toolCalls?: ToolCallEvent[];
}

export interface UserStatus {
  hasByok: boolean;
  freeMessagesPerDay: number;
  freeMessagesRemaining: number;
}

export interface PendingAction {
  id: string;
  actionId: string;
  category: string;
  parameters: Record<string, unknown>;
  description: string;
  expiresAt: string;
}
