'use client';

import { useRouter } from 'next/navigation';
import Loading from '@/components/Loading';
import { cn } from '@/lib/utils';
import { GRADIENTS } from '@/config/gradients';
import { TASK_CATEGORY_LABELS } from '@/config/tasks';
import { Users, Clock, TrendingUp, AlertTriangle, CheckCircle, Award } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { ROUTES } from '@/config/routes';
import { useTaskAnalytics } from './useTaskAnalytics';
import { StatCard } from './StatCard';
import { FairnessIndicator } from './FairnessIndicator';

export default function TaskAnalyticsPage() {
  const { user, authLoading, stats, contributions, fairnessData, loading, error, days, setDays } =
    useTaskAnalytics();
  const router = useRouter();

  if (authLoading || loading) {
    return <Loading fullScreen message="Loading statistics..." />;
  }

  if (!user) {
    return null;
  }

  if (error) {
    return (
      <div className={cn(GRADIENTS.pageBg, 'min-h-screen p-4 sm:p-6 lg:p-8')}>
        <div className="max-w-4xl mx-auto">
          <Breadcrumb
            items={[{ label: 'Tasks', href: ROUTES.DASHBOARD.TASKS }, { label: 'Analytics' }]}
            className="mb-4"
          />
          <div className="bg-card rounded-xl border border-red-200 p-6 text-red-600">{error}</div>
        </div>
      </div>
    );
  }

  const maxCompletions = Math.max(...contributions.map(c => c.totalCompletions), 1);

  return (
    <div className={cn(GRADIENTS.pageBg, 'min-h-screen p-4 sm:p-6 lg:p-8 pb-20 md:pb-8')}>
      <div className="max-w-4xl mx-auto space-y-6">
        <Breadcrumb
          items={[{ label: 'Tasks', href: ROUTES.DASHBOARD.TASKS }, { label: 'Analytics' }]}
        />

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Task Statistics</h1>
          <select
            value={days}
            onChange={e => setDays(parseInt(e.target.value))}
            className="rounded-lg border border-gray-300 dark:border-border bg-card text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tiffany-500"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              icon={CheckCircle}
              label="Completed today"
              value={stats.completedToday}
              color="success"
            />
            <StatCard
              icon={TrendingUp}
              label="This week"
              value={stats.completedThisWeek}
              color="info"
            />
            <StatCard
              icon={AlertTriangle}
              label="Needs attention"
              value={stats.needsAttention}
              color="amber"
            />
            <StatCard
              icon={Clock}
              label="Open requests"
              value={stats.openRequests}
              color="tiffany"
            />
          </div>
        )}

        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Contributions by Person
          </h2>
          {contributions.length === 0 ? (
            <p className="text-muted-foreground text-base text-center py-8">
              No data for the selected period
            </p>
          ) : (
            <div className="space-y-4">
              {contributions.map((contribution, index) => (
                <div key={contribution.user.id} className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-tiffany-100 text-tiffany-700 font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-foreground truncate">
                        {contribution.user.display_name || contribution.user.username}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {contribution.totalCompletions} tasks
                        {contribution.totalMinutes > 0 && (
                          <span className="text-gray-400 dark:text-muted-foreground ml-2">
                            ({Math.round(contribution.totalMinutes / 60)}h)
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-tiffany-500 rounded-full transition-all duration-500"
                        style={{
                          width: `${(contribution.totalCompletions / maxCompletions) * 100}%`,
                        }}
                      />
                    </div>
                    {Object.keys(contribution.byCategory).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Object.entries(contribution.byCategory)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 3)
                          .map(([category, count]) => (
                            <span
                              key={category}
                              className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-muted rounded-full text-muted-foreground"
                            >
                              {TASK_CATEGORY_LABELS[
                                category as keyof typeof TASK_CATEGORY_LABELS
                              ] || category}
                              : {count}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Award className="h-5 w-5" />
            Fairness Overview
          </h2>
          <p className="text-base text-muted-foreground mb-4">
            Shows how evenly recurring tasks are distributed. Low values indicate that a task is
            being completed by only a few people.
          </p>
          {fairnessData.length === 0 ? (
            <p className="text-muted-foreground text-base text-center py-8">
              No recurring tasks with completions
            </p>
          ) : (
            <div className="space-y-3">
              {fairnessData.slice(0, 10).map(item => (
                <div
                  key={item.task.id}
                  className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-muted/50 rounded-lg hover:bg-gray-100 dark:hover:bg-muted transition-colors cursor-pointer"
                  onClick={() => router.push(`/dashboard/tasks/${item.task.id}`)}
                >
                  <FairnessIndicator level={item.fairnessLevel} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground truncate">{item.task.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.totalCompletions} completions by {item.uniqueCompleterCount} person
                      {item.uniqueCompleterCount !== 1 && 's'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-foreground">
                      {item.fairnessScore}%
                    </div>
                    <div className="text-xs text-muted-foreground">Fairness</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
