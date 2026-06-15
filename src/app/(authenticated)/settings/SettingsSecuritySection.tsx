'use client';

import { Shield, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { MFAStatus } from '@/components/auth/MFASetup';
import { NostrConnectionCard } from '@/components/nostr/NostrConnectionCard';

interface Props {
  mfaStatusKey: number;
  onEnableMFA: () => void;
  onViewRecoveryCodes: () => void;
  onMFADisableComplete: () => void;
}

export function SettingsSecuritySection({
  mfaStatusKey,
  onEnableMFA,
  onViewRecoveryCodes,
  onMFADisableComplete,
}: Props) {
  return (
    <>
      <div className="border-t border-subtle pt-10">
        <h3 className="text-lg font-semibold text-fg-primary mb-4 flex items-center">
          <Shield className="w-6 h-6 mr-2 text-fg-secondary" />
          Two-Factor Authentication
        </h3>
        <p className="text-fg-secondary mb-6">
          Add an extra layer of security to your account by requiring a code from your authenticator
          app when signing in.
        </p>
        <div className="bg-surface-raised border border-default rounded-lg p-6 max-w-md">
          <MFAStatus
            key={mfaStatusKey}
            onEnableClick={onEnableMFA}
            onDisableComplete={() => {
              toast.success('Two-factor authentication has been disabled');
              onMFADisableComplete();
            }}
          />
          <div className="mt-4 pt-4 border-t border-default">
            <button
              type="button"
              onClick={onViewRecoveryCodes}
              className="text-sm text-fg-primary hover:text-fg-primary font-medium underline-offset-4 hover:underline"
            >
              View Recovery Codes
            </button>
            <p className="text-xs text-fg-secondary mt-1">
              Backup codes for when you lose access to your authenticator
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-subtle pt-10">
        <h3 className="text-lg font-semibold text-fg-primary mb-4 flex items-center">
          <Link2 className="w-6 h-6 mr-2 text-fg-secondary" />
          Connected Accounts
        </h3>
        <p className="text-fg-secondary mb-6">
          Connect external services for enhanced features like Lightning payments.
        </p>
        <div className="max-w-md">
          <NostrConnectionCard />
        </div>
      </div>
    </>
  );
}
