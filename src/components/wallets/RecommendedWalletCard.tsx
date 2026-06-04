'use client';

import { Smartphone, Monitor, Zap, Shield, ExternalLink } from 'lucide-react';
import Card from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface RecommendedWallet {
  name: string;
  description: string;
  platform: 'mobile' | 'desktop';
  level: 'beginner' | 'advanced';
  lightning: boolean;
  custodial: boolean;
  downloadLinks?: {
    ios?: string;
    android?: string;
  };
  website: string;
  recommended: boolean;
}

interface RecommendedWalletCardProps {
  wallet: RecommendedWallet;
}

export function RecommendedWalletCard({ wallet }: RecommendedWalletCardProps) {
  return (
    <Card
      className={cn(
        'p-6 relative overflow-hidden transition-all duration-300',
        wallet.recommended && 'ring-2 ring-bitcoinOrange/40 border-border-strong'
      )}
    >
      {wallet.recommended && (
        <div className="absolute top-0 right-0 bg-bitcoinOrange text-white text-xs font-semibold px-3 py-1 rounded-bl-lg">
          Recommended
        </div>
      )}

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">{wallet.name}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{wallet.description}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge
            variant="outline"
            className={cn(
              'text-xs',
              wallet.platform === 'mobile'
                ? 'bg-muted text-foreground border-border-subtle'
                : 'bg-muted text-foreground border-border-subtle'
            )}
          >
            {wallet.platform === 'mobile' ? (
              <Smartphone className="w-3 h-3 mr-1" />
            ) : (
              <Monitor className="w-3 h-3 mr-1" />
            )}
            {wallet.platform === 'mobile' ? 'Mobile' : 'Desktop'}
          </Badge>

          <Badge
            variant="outline"
            className={cn(
              'text-xs',
              wallet.level === 'beginner'
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            )}
          >
            {wallet.level === 'beginner' ? 'Beginner' : 'Advanced'}
          </Badge>

          {wallet.lightning && (
            <Badge
              variant="outline"
              className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200"
            >
              <Zap className="w-3 h-3 mr-1" />
              Lightning
            </Badge>
          )}

          <Badge variant="outline" className="text-xs bg-muted text-foreground border-border">
            <Shield className="w-3 h-3 mr-1" />
            Non-custodial
          </Badge>
        </div>

        {wallet.downloadLinks && (wallet.downloadLinks.ios || wallet.downloadLinks.android) && (
          <div className="flex flex-col gap-2">
            {wallet.downloadLinks.ios && (
              <a
                href={wallet.downloadLinks.ios}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
              >
                <Smartphone className="w-4 h-4" />
                iOS App Store
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {wallet.downloadLinks.android && (
              <a
                href={wallet.downloadLinks.android}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                <Smartphone className="w-4 h-4" />
                Google Play
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        <a
          href={wallet.website}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-bitcoinOrange hover:text-bitcoinOrange font-medium transition-colors"
        >
          Visit website
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </Card>
  );
}
