/**
 * Wallets Mobile Guidance
 *
 * Mobile guidance modal and floating help button.
 *
 * Created: 2025-01-30
 * Last Modified: 2025-01-30
 */

'use client';

import { HelpCircle } from 'lucide-react';
import { DynamicSidebar } from '@/components/create/DynamicSidebar';
import {
  walletGuidanceContent,
  walletDefaultContent,
  type WalletFieldType,
} from '@/lib/wallet-guidance';

interface WalletsMobileGuidanceProps {
  focusedField: WalletFieldType;
  showMobileGuidance: boolean;
  onShowMobileGuidance: (show: boolean) => void;
}

export function WalletsMobileGuidance({
  focusedField,
  showMobileGuidance,
  onShowMobileGuidance,
}: WalletsMobileGuidanceProps) {
  if (!focusedField) {
    return null;
  }

  return (
    <>
      {/* Floating Help Button */}
      <button
        onClick={() => onShowMobileGuidance(true)}
        className="fixed bottom-6 right-6 z-50 rounded-full bg-fg-primary hover:bg-fg-primary/90 p-4 text-fg-inverted transition-colors duration-200 lg:hidden"
        aria-label="Get help with this field"
      >
        <HelpCircle className="w-6 h-6" />
      </button>

      {/* Guidance Modal */}
      {showMobileGuidance && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end"
          onClick={() => onShowMobileGuidance(false)}
        >
          <div
            className="w-full bg-surface-base rounded-t-lg shadow-sm max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-surface-base border-b border-default px-4 py-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-fg-primary">Wallet Help & Guidance</h3>
              <button
                onClick={() => onShowMobileGuidance(false)}
                className="p-2 hover:bg-surface-raised rounded-lg transition-colors"
              >
                <svg
                  className="w-5 h-5 text-fg-secondary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <DynamicSidebar<NonNullable<WalletFieldType>>
                activeField={focusedField}
                guidanceContent={walletGuidanceContent}
                defaultContent={walletDefaultContent}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
