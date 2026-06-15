'use client';

import { useState } from 'react';
import { Plus, ChevronUp, ChevronDown } from 'lucide-react';
import Button from '@/components/ui/Button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AIKeyCard } from './AIKeyCard';
import { AIKeyAddForm } from './AIKeyAddForm';

export interface UserApiKey {
  id: string;
  user_id: string;
  provider: string;
  key_name: string;
  key_hint: string;
  is_valid: boolean;
  is_primary: boolean;
  sort_order: number;
  last_validated_at: string | null;
  last_used_at: string | null;
  total_requests: number;
  total_tokens_used: number;
  created_at: string;
  updated_at: string;
}

interface AIKeyManagerProps {
  keys: UserApiKey[];
  onAdd?: (data: { provider: string; apiKey: string; keyName: string }) => Promise<void>;
  onDelete?: (keyId: string) => Promise<void>;
  onSetPrimary?: (keyId: string) => Promise<void>;
  /** Persist a new fallback order (key ids, first = tried earliest). */
  onReorder?: (orderedIds: string[]) => Promise<void>;
  isLoading?: boolean;
  onFieldFocus?: (field: string | null) => void;
}

export function AIKeyManager({
  keys,
  onAdd,
  onDelete,
  onSetPrimary,
  onReorder,
  isLoading = false,
  onFieldFocus,
}: AIKeyManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<UserApiKey | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!keyToDelete || !onDelete) {
      return;
    }
    try {
      await onDelete(keyToDelete.id);
      setKeyToDelete(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete key');
    }
  };

  const handleAddSuccess = async (data: { provider: string; apiKey: string; keyName: string }) => {
    await onAdd?.(data);
    // The form owns its own success state — show the "Connected to X"
    // confirmation card instead of silently closing. The user dismisses
    // via "Add another key" or navigates away via "Start chatting."
  };

  const move = async (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (!onReorder || next < 0 || next >= keys.length) {
      return;
    }
    const ids = keys.map(k => k.id);
    [ids[index], ids[next]] = [ids[next], ids[index]];
    await onReorder(ids);
  };

  const canReorder = !!onReorder && keys.length > 1;

  return (
    <div className="space-y-4">
      {keys.length > 0 && (
        <div className="space-y-3">
          {canReorder && (
            <p className="text-xs text-muted-foreground">
              Cat tries your keys top to bottom, skipping any that fail or rate-limit, then falls
              back to the free OrangeCat default. Reorder with the arrows.
            </p>
          )}
          {keys.map((key, index) => (
            <div key={key.id} className="flex items-start gap-2">
              {canReorder && (
                <div className="flex flex-col gap-1 pt-3">
                  <button
                    type="button"
                    aria-label="Move up"
                    disabled={index === 0 || isLoading}
                    onClick={() => move(index, -1)}
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    disabled={index === keys.length - 1 || isLoading}
                    onClick={() => move(index, 1)}
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              )}
              <div className="flex-1">
                <AIKeyCard
                  apiKey={key}
                  isLoading={isLoading}
                  onSetPrimary={id => onSetPrimary?.(id)}
                  onDelete={setKeyToDelete}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {isAdding ? (
        <AIKeyAddForm
          onAdd={handleAddSuccess}
          onCancel={() => setIsAdding(false)}
          onFieldFocus={onFieldFocus}
        />
      ) : (
        <Button
          variant="outline"
          onClick={() => setIsAdding(true)}
          className="w-full justify-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add API Key
        </Button>
      )}

      <AlertDialog open={!!keyToDelete} onOpenChange={() => setKeyToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{keyToDelete?.key_name}&rdquo;? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <p className="text-sm text-destructive px-6">{deleteError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default AIKeyManager;
