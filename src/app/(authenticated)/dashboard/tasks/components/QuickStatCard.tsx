import type { LucideIcon } from 'lucide-react';
import { STAT_COLORS, type StatColorKey } from '@/config/badge-colors';

interface QuickStatCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  color: StatColorKey;
}

export default function QuickStatCard({ icon: Icon, label, value, color }: QuickStatCardProps) {
  return (
    <div className={`rounded-xl border p-3 ${STAT_COLORS[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium truncate">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
