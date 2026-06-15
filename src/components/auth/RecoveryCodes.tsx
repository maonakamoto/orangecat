'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import {
  Key,
  Copy,
  Check,
  Download,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/Card';

interface RecoveryCodesProps {
  onCodesGenerated?: (codes: string[]) => void;
  onClose?: () => void;
  initialCodes?: string[];
}

function generateRecoveryCodes(count: number = 10): string[] {
  const codes: string[] = [];
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoiding similar chars (0/O, 1/I)

  for (let i = 0; i < count; i++) {
    let code = '';
    const randomBytes = new Uint32Array(8);
    crypto.getRandomValues(randomBytes);
    for (let j = 0; j < 8; j++) {
      if (j === 4) {
        code += '-';
      }
      code += chars[randomBytes[j] % chars.length];
    }
    codes.push(code);
  }

  return codes;
}

export function RecoveryCodes({ onCodesGenerated, onClose, initialCodes }: RecoveryCodesProps) {
  const [codes, setCodes] = useState<string[]>(initialCodes || []);
  const [generating, setGenerating] = useState(false);
  const { copied, copy } = useCopyToClipboard();
  const [acknowledged, setAcknowledged] = useState(false);
  const [regenerateConfirm, setRegenerateConfirm] = useState(false);

  const handleGenerateCodes = useCallback(async () => {
    setGenerating(true);

    await new Promise(resolve => setTimeout(resolve, 500));

    const newCodes = generateRecoveryCodes(10);
    setCodes(newCodes);
    onCodesGenerated?.(newCodes);

    setGenerating(false);
  }, [onCodesGenerated]);

  const handleCopy = useCallback(() => {
    void copy(codes.join('\n'));
  }, [codes, copy]);

  const handleDownload = useCallback(() => {
    const codesText = [
      'OrangeCat Recovery Codes',
      '========================',
      '',
      'These codes can be used to access your account if you lose your authenticator device.',
      'Each code can only be used once.',
      '',
      'Keep these codes in a safe place!',
      '',
      ...codes.map((code, i) => `${i + 1}. ${code}`),
      '',
      `Generated: ${new Date().toISOString()}`,
    ].join('\n');

    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orangecat-recovery-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [codes]);

  const handleRegenerate = useCallback(() => {
    setRegenerateConfirm(true);
  }, []);

  const formattedCodes = useMemo(() => {
    return codes.map((code, index) => ({
      number: index + 1,
      code,
    }));
  }, [codes]);

  if (codes.length === 0) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-status-warning-subtle rounded-full">
              <Key className="h-8 w-8 text-status-warning" />
            </div>
          </div>
          <CardTitle>Recovery Codes</CardTitle>
          <CardDescription>
            Generate backup codes in case you lose access to your authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-status-warning-subtle border border-status-warning/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-status-warning mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-status-warning">Important</p>
                <p className="text-xs text-status-warning/80">
                  Recovery codes are your backup if you lose your authenticator device. Store them
                  securely and never share them with anyone.
                </p>
              </div>
            </div>
          </div>

          <Button onClick={handleGenerateCodes} disabled={generating} className="w-full">
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Key className="h-4 w-4 mr-2" />
                Generate Recovery Codes
              </>
            )}
          </Button>
        </CardContent>
        {onClose && (
          <CardFooter>
            <Button variant="ghost" onClick={onClose} className="w-full">
              Cancel
            </Button>
          </CardFooter>
        )}
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-status-positive-subtle rounded-full">
            <Shield className="h-8 w-8 text-status-positive" />
          </div>
        </div>
        <CardTitle>Your Recovery Codes</CardTitle>
        <CardDescription>Save these codes in a secure location</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 oc-error-surface rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-status-negative mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-status-negative">Save these codes now!</p>
              <p className="text-xs text-status-negative/80">
                You won't be able to see them again. Each code can only be used once.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 p-4 bg-surface-raised border border-default rounded-lg">
          {formattedCodes.map(({ number, code }) => (
            <div
              key={code}
              className="flex items-center gap-2 px-3 py-2 bg-surface-base border border-subtle rounded"
            >
              <span className="text-xs text-fg-tertiary w-4">{number}.</span>
              <code className="text-sm font-mono text-fg-primary">{code}</code>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCopy} className="flex-1">
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2 text-status-positive" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </>
            )}
          </Button>
          <Button variant="outline" onClick={handleDownload} className="flex-1">
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>

        <div className="pt-4 border-t border-default">
          <button
            onClick={handleRegenerate}
            disabled={generating}
            className="flex items-center gap-2 text-sm text-fg-secondary hover:text-fg-primary transition-colors"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Generate new codes
          </button>
          <p className="text-xs text-fg-tertiary mt-1">This will invalidate your current codes</p>
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={e => setAcknowledged(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-strong text-fg-primary focus:ring-ring"
          />
          <span className="text-sm text-fg-primary">
            I have saved my recovery codes in a secure location
          </span>
        </label>
      </CardContent>
      <CardFooter>
        <Button onClick={onClose} disabled={!acknowledged} className="w-full">
          Done
        </Button>
      </CardFooter>
      <ConfirmDialog
        isOpen={regenerateConfirm}
        onClose={() => setRegenerateConfirm(false)}
        onConfirm={async () => {
          setRegenerateConfirm(false);
          await handleGenerateCodes();
        }}
        title="Generate new recovery codes?"
        description="Your old codes will no longer work."
        confirmLabel="Generate New Codes"
      />
    </Card>
  );
}

export default RecoveryCodes;
