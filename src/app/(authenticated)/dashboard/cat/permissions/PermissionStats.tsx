import type { PermissionData } from './types';

interface PermissionStatsProps {
  summary: PermissionData['summary'];
}

export function PermissionStats({ summary }: PermissionStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
      <div className="bg-card rounded-lg border border-border p-3 sm:p-4">
        <div className="text-xl sm:text-2xl font-bold text-foreground">
          {summary.enabledActions}/{summary.totalActions}
        </div>
        <div className="text-xs sm:text-sm text-muted-foreground">Actions enabled</div>
      </div>
      <div className="bg-card rounded-lg border border-border p-3 sm:p-4">
        <div className="text-xl sm:text-2xl font-bold text-foreground">
          {summary.categories.filter(c => c.enabled).length}/{summary.categories.length}
        </div>
        <div className="text-xs sm:text-sm text-muted-foreground">Categories enabled</div>
      </div>
      <div className="col-span-2 sm:col-span-1 bg-card rounded-lg border border-border p-3 sm:p-4">
        <div
          className={`text-xl sm:text-2xl font-bold ${summary.highRiskEnabled ? 'text-amber-600' : 'text-green-600'}`}
        >
          {summary.highRiskEnabled ? 'Yes' : 'No'}
        </div>
        <div className="text-xs sm:text-sm text-muted-foreground">High-risk enabled</div>
      </div>
    </div>
  );
}
