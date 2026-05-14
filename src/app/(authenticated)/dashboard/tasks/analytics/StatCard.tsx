import { BarChart3 } from 'lucide-react';
import { STAT_COLORS, type StatColorKey } from '@/config/badge-colors';

interface StatCardProps {
  icon: typeof BarChart3;
  label: string;
  value: number;
  color: StatColorKey;
}

export function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  return (
    <div className={`rounded-xl border p-4 ${STAT_COLORS[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm opacity-80">{label}</div>
    </div>
  );
}
