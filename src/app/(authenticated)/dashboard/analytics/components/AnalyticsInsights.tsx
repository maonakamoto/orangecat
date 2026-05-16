import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { BarChart3, PieChart, Activity, TrendingUp, Target, Users } from 'lucide-react';
import { ROUTES } from '@/config/routes';
import type { Project } from '@/stores/projectStore';

interface AnalyticsInsightsProps {
  projects: Project[];
}

function deriveInsights(projects: Project[]) {
  if (projects.length === 0) {
    return [];
  }

  const insights: { icon: React.ElementType; title: string; body: string; color: string }[] = [];

  const bestProject = projects.reduce((best, p) =>
    (p.total_funding || 0) > (best.total_funding || 0) ? p : best
  );

  if (bestProject.total_funding > 0) {
    insights.push({
      icon: TrendingUp,
      title: 'Top-performing project',
      body: `"${bestProject.title}" has raised the most across your selected projects.`,
      color: 'tiffany',
    });
  }

  const goalsReached = projects.filter(
    p => p.goal_amount && (p.total_funding || 0) >= p.goal_amount
  );
  const successRate = Math.round((goalsReached.length / projects.length) * 100);
  insights.push({
    icon: Target,
    title: `${successRate}% goal completion rate`,
    body:
      goalsReached.length === projects.length
        ? 'All selected projects have reached their funding goal.'
        : `${goalsReached.length} of ${projects.length} selected projects reached their goal.`,
    color: 'green',
  });

  const totalSupporters = projects.reduce((sum, p) => sum + (p.contributor_count || 0), 0);
  const avgSupporters = projects.length > 0 ? Math.round(totalSupporters / projects.length) : 0;
  if (avgSupporters > 0) {
    insights.push({
      icon: Users,
      title: `${avgSupporters} average supporters per project`,
      body: `Across your selected ${projects.length} project${projects.length !== 1 ? 's' : ''}, you average ${avgSupporters} supporter${avgSupporters !== 1 ? 's' : ''} each.`,
      color: 'orange',
    });
  }

  return insights;
}

const COLOR_CLASSES: Record<
  string,
  { bg: string; border: string; title: string; body: string; icon: string }
> = {
  tiffany: {
    bg: 'bg-tiffany-50',
    border: 'border-tiffany-200',
    title: 'text-tiffany-900',
    body: 'text-tiffany-700',
    icon: 'text-tiffany-600',
  },
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    title: 'text-green-900',
    body: 'text-green-700',
    icon: 'text-green-600',
  },
  orange: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    title: 'text-orange-900',
    body: 'text-orange-700',
    icon: 'text-orange-600',
  },
};

export default function AnalyticsInsights({ projects }: AnalyticsInsightsProps) {
  const insights = deriveInsights(projects);

  return (
    <>
      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Funding Over Time
            </CardTitle>
            <CardDescription>Track your fundraising progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-muted-foreground" />
                <p className="text-muted-foreground">Time-series funding chart coming soon</p>
                <p className="text-sm">Real-time funding visualization</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Supporter Insights
            </CardTitle>
            <CardDescription>Understand your audience</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <PieChart className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-muted-foreground" />
                <p className="text-muted-foreground">Supporter breakdown chart coming soon</p>
                <p className="text-sm">Supporter behavior insights</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Project Insights
          </CardTitle>
          <CardDescription>Derived from your selected projects</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {insights.length > 0 ? (
              insights.map((insight, i) => {
                const c = COLOR_CLASSES[insight.color];
                const Icon = insight.icon;
                return (
                  <div key={i} className={`p-4 ${c.bg} border ${c.border} rounded-lg`}>
                    <div className="flex items-start gap-3">
                      <Icon className={`w-5 h-5 ${c.icon} mt-0.5`} />
                      <div>
                        <h4 className={`font-medium ${c.title}`}>{insight.title}</h4>
                        <p className={`${c.body} text-sm mt-1`}>{insight.body}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-muted-foreground" />
                <p>Create your first project to see insights</p>
                <Button href={ROUTES.PROJECTS.CREATE} className="mt-4">
                  Create Project
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
