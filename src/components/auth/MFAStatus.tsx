'use client';

import React, { useState } from 'react';
import { Shield, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { getMFAFactors, unenrollMFA } from '@/services/supabase/auth';
import { formatDate } from '@/utils/dates';

export function MFAStatus({
  onEnableClick,
  onDisableComplete,
}: {
  onEnableClick?: () => void;
  onDisableComplete?: () => void;
}) {
  const [factors, setFactors] = useState<{ id: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [disabling, setDisabling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const loadFactors = async () => {
      try {
        const { verifiedFactors, error: factorsError } = await getMFAFactors();
        if (cancelled) {
          return;
        }
        if (!factorsError && verifiedFactors) {
          setFactors(verifiedFactors);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load MFA status');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    loadFactors();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDisable = async (factorId: string) => {
    setDisabling(true);
    setError(null);
    try {
      const { success, error: disableError } = await unenrollMFA(factorId);
      if (disableError || !success) {
        setError(disableError?.message || 'Failed to disable MFA');
        return;
      }
      setFactors(prev => prev.filter(f => f.id !== factorId));
      onDisableComplete?.();
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setDisabling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-dim" />
      </div>
    );
  }

  const hasMFA = factors.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${hasMFA ? 'bg-status-positive-subtle' : 'bg-muted'}`}>
            <Shield
              className={`h-5 w-5 ${hasMFA ? 'text-status-positive' : 'text-muted-foreground'}`}
            />
          </div>
          <div>
            <p className="font-medium text-foreground">Two-Factor Authentication</p>
            <p className="text-sm text-muted-foreground">{hasMFA ? 'Enabled' : 'Not enabled'}</p>
          </div>
        </div>
        {hasMFA ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDisable(factors[0].id)}
            disabled={disabling}
            className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
          >
            {disabling ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Disable'}
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={onEnableClick}>
            Enable
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 oc-error-surface rounded-lg">
          <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive/80">{error}</p>
        </div>
      )}

      {hasMFA && (
        <p className="text-xs text-muted-foreground">
          Added on {formatDate(factors[0].created_at)}
        </p>
      )}
    </div>
  );
}
