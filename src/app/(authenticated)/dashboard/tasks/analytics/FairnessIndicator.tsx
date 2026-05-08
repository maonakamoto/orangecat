import { CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { BADGE_COLORS } from '@/config/badge-colors';

const config = {
  good: { color: BADGE_COLORS.success, icon: CheckCircle },
  moderate: { color: BADGE_COLORS.amber, icon: Clock },
  needs_attention: { color: BADGE_COLORS.error, icon: AlertTriangle },
} as const;

interface FairnessIndicatorProps {
  level: keyof typeof config;
}

export function FairnessIndicator({ level }: FairnessIndicatorProps) {
  const { color, icon: Icon } = config[level];
  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${color}`}>
      <Icon className="h-5 w-5" />
    </div>
  );
}
