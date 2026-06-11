'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
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
  isLoading?: boolean;
  onFieldFocus?: (field: string | null) => void;
}

export function AIKeyManager({
  keys,
  onAdd,
  onDelete,
  onSetPrimary,
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

  return (
    <div className="space-y-4">
      {keys.length > 0 && (
        <div className="space-y-3">
          {keys.map(key => (
            <AIKeyCard
              key={key.id}
              apiKey={key}
              isLoading={isLoading}
              onSetPrimary={id => onSetPrimary?.(id)}
              onDelete={setKeyToDelete}
            />
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
