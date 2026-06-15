'use client';

import { Bot, Key, Zap, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/config/routes';

interface AISettingsStatusProps {
  hasByok: boolean;
  byokProvider?: string;
  dailyUsage?: {
    used: number;
    limit: number;
  };
  onSetupClick?: () => void;
  compact?: boolean;
}

/**
 * AISettingsStatus - Shows BYOK Active vs Free Tier status
 *
 * Displays:
 * - BYOK Active: Shows provider, green status badge
 * - Free Tier: Shows usage bar, upgrade prompt
 */
export function AISettingsStatus({
  hasByok,
  byokProvider,
  dailyUsage = { used: 0, limit: 10 },
  onSetupClick,
  compact = false,
}: AISettingsStatusProps) {
  const usagePercent = Math.min((dailyUsage.used / dailyUsage.limit) * 100, 100);
  const isNearLimit = usagePercent >= 80;

  if (hasByok) {
    return (
      <Card
        className={cn('border-status-positive/20 bg-status-positive-subtle/40', compact && 'p-4')}
      >
        {!compact && (
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-status-positive-subtle flex items-center justify-center">
                  <Key className="w-5 h-5 text-status-positive" />
                </div>
                <div>
                  <CardTitle className="text-status-positive">BYOK Active</CardTitle>
                  <CardDescription className="text-status-positive/80">
                    Your own API key is configured
                  </CardDescription>
                </div>
              </div>
              <Badge className="bg-status-positive-subtle text-status-positive border-status-positive/20">
                <CheckCircle className="w-3 h-3 mr-1" />
                Active
              </Badge>
            </div>
          </CardHeader>
        )}
        <CardContent className={cn(compact && 'p-0')}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {compact && <Key className="w-4 h-4 text-status-positive" />}
              <span className="text-sm text-status-positive">
                {compact ? 'BYOK Active' : `Provider: ${byokProvider || 'OpenRouter'}`}
              </span>
            </div>
            <Link href={ROUTES.SETTINGS_AI}>
              <Button
                variant="ghost"
                size="sm"
                className="text-status-positive hover:text-status-positive/80"
              >
                Manage
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Free Tier Status
  return (
    <Card className={cn('border-status-warning/20 bg-status-warning-subtle/40', compact && 'p-4')}>
      {!compact && (
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-status-warning-subtle flex items-center justify-center">
                <Bot className="w-5 h-5 text-status-warning" />
              </div>
              <div>
                <CardTitle className="text-status-warning">Free Tier</CardTitle>
                <CardDescription className="text-status-warning/80">
                  {dailyUsage.limit} messages per day
                </CardDescription>
              </div>
            </div>
            <Badge className="bg-status-warning-subtle text-status-warning border-status-warning/20">
              <Zap className="w-3 h-3 mr-1" />
              Free
            </Badge>
          </div>
        </CardHeader>
      )}
      <CardContent className={cn(compact && 'p-0')}>
        <div className="space-y-3">
          {/* Usage Bar */}
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span
                className={cn(
                  'font-medium',
                  isNearLimit ? 'text-status-negative' : 'text-status-warning'
                )}
              >
                {dailyUsage.used} / {dailyUsage.limit} messages today
              </span>
              <span className="text-status-warning/80">{Math.round(usagePercent)}%</span>
            </div>
            <Progress
              value={usagePercent}
              className={cn(
                'h-2',
                isNearLimit ? '[&>div]:bg-status-negative' : '[&>div]:bg-status-warning'
              )}
            />
          </div>

          {/* Near Limit Warning */}
          {isNearLimit && !compact && (
            <div className="oc-error-surface flex items-start gap-2 p-2">
              <AlertCircle className="w-4 h-4 text-status-negative mt-0.5 flex-shrink-0" />
              <p className="text-xs text-status-negative/80">
                You are running low on free messages. Add your own API key for unlimited usage.
              </p>
            </div>
          )}

          {/* Upgrade CTA */}
          <div className="flex items-center justify-between pt-1">
            {compact ? (
              <>
                <span className="text-sm text-status-warning">
                  {dailyUsage.used}/{dailyUsage.limit} today
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-status-warning hover:text-status-warning/80"
                  onClick={onSetupClick}
                >
                  Add Key
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </>
            ) : (
              <Button variant="accent" size="sm" className="w-full" onClick={onSetupClick}>
                <Key className="w-4 h-4 mr-2" />
                Add Your API Key for Unlimited Usage
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default AISettingsStatus;
