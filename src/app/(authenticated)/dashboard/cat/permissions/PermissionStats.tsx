import type { PermissionData } from './types';

interface PermissionStatsProps {
  summary: PermissionData['summary'];
}

export function PermissionStats({ summary }: PermissionStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
      <div className="bg-surface-base rounded-lg border border-default p-3 sm:p-4">
        <div className="text-xl sm:text-2xl font-bold text-fg-primary">
          {summary.enabledActions}/{summary.totalActions}
        </div>
        <div className="text-xs sm:text-sm text-fg-secondary">Actions enabled</div>
      </div>
      <div className="bg-surface-base rounded-lg border border-default p-3 sm:p-4">
        <div className="text-xl sm:text-2xl font-bold text-fg-primary">
          {summary.categories.filter(c => c.enabled).length}/{summary.categories.length}
        </div>
        <div className="text-xs sm:text-sm text-fg-secondary">Categories enabled</div>
      </div>
      <div className="col-span-2 sm:col-span-1 bg-surface-base rounded-lg border border-default p-3 sm:p-4">
        <div
          className={`text-xl sm:text-2xl font-bold ${summary.highRiskEnabled ? 'text-status-warning' : 'text-status-positive'}`}
        >
          {summary.highRiskEnabled ? 'Yes' : 'No'}
        </div>
        <div className="text-xs sm:text-sm text-fg-secondary">High-risk enabled</div>
      </div>
    </div>
  );
}
