'use client';

import { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  Target,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Loader2,
  X,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';
import { useRecommendations } from '@/hooks/useRecommendations';
import { SmartQuestionsPanel } from './SmartQuestionsPanel';
import { TASK_DEFINITIONS } from '@/services/recommendations/tasks';
import type { RecommendedTask, TaskPriority } from '@/services/recommendations/types';
import { ROUTES } from '@/config/routes';
import type { LucideIcon } from 'lucide-react';

const TASK_ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  TASK_DEFINITIONS.map(task => [task.id, task.icon])
);

interface TasksSectionProps {
  className?: string;
  maxTasks?: number;
  showQuestions?: boolean;
}

function getPriorityColor(priority: TaskPriority): string {
  // FleetCrown semantic tier (migration 6/N): critical + high get
  // chromatic status tokens; medium + low fade into neutral so the eye
  // is drawn to actual urgency.
  switch (priority) {
    case 'critical':
      return 'border-status-negative/30 bg-status-negative-subtle text-status-negative';
    case 'high':
      return 'border-status-warning/30 bg-status-warning-subtle text-status-warning';
    case 'medium':
      return 'border-border-subtle bg-muted text-fg-secondary';
    case 'low':
      return 'border-border-subtle bg-muted/60 text-fg-tertiary';
  }
}

function getPriorityLabel(priority: TaskPriority): string {
  switch (priority) {
    case 'critical':
      return 'Critical';
    case 'high':
      return 'Important';
    case 'medium':
      return 'Suggested';
    case 'low':
      return 'Optional';
  }
}

export default function TasksSection({
  className,
  maxTasks = 4,
  showQuestions = true,
}: TasksSectionProps) {
  const { user, profile } = useAuth();
  const [isExpanded, setIsExpanded] = useState(true);
  const [celebrationDismissed, setCelebrationDismissed] = useState(false);

  useEffect(() => {
    if (user?.id) {
      setCelebrationDismissed(
        localStorage.getItem(`oc_celebration_dismissed_${user.id}`) === 'true'
      );
    }
  }, [user?.id]);

  const dismissCelebration = () => {
    if (user?.id) {
      localStorage.setItem(`oc_celebration_dismissed_${user.id}`, 'true');
    }
    setCelebrationDismissed(true);
  };

  const {
    isLoading,
    error,
    profileCompletion,
    taskCompletion,
    tasks,
    questions,
    celebration,
    markTaskCompleted,
    completedTaskIds,
    refresh,
  } = useRecommendations({ limit: maxTasks + 2 });

  if (!user || !profile) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-dim" />
          <span className="ml-2 text-muted-foreground">Loading recommendations...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <AlertCircle className="w-6 h-6 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Couldn&apos;t load recommendations
              </p>
              <p className="text-xs text-muted-foreground">{error.message}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => refresh()}>
              <RefreshCw className="w-3 h-3 mr-1.5" />
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (celebration && !celebrationDismissed) {
    return (
      <div className={className}>
        <Card className="border-border-subtle bg-background">
          <CardContent className="p-6 text-center relative">
            <button
              onClick={dismissCelebration}
              className="absolute right-3 top-3 rounded-md p-1.5 text-muted-dim transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-md border border-border-subtle bg-muted/40">
              <Sparkles className="w-8 h-8 text-status-positive" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">{celebration.title}</h3>
            <p className="text-muted-foreground mb-4">{celebration.description}</p>
            {showQuestions && questions.length > 0 && (
              <SmartQuestionsPanel questions={questions} className="mt-6 text-left" />
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-md border border-border-subtle bg-muted/40">
              <CheckCircle2 className="w-6 h-6 text-status-positive" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">You&apos;re all caught up</p>
              <p className="text-xs text-muted-foreground">
                Nothing pending. Ask Cat what to do next or explore the platform.
              </p>
            </div>
            <div className="flex gap-2">
              <Link href={ROUTES.DASHBOARD.CAT}>
                <Button size="sm">Ask Cat</Button>
              </Link>
              <Link href={ROUTES.DISCOVER}>
                <Button size="sm" variant="outline">
                  Discover
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // "Tasks remaining" must measure the same scope as the "% Setup" number, which
  // only counts critical + high priority tasks. Counting all tasks here caused
  // "100% Setup" to appear next to "3 tasks remaining" when the only remaining
  // items were optional/suggested polish.
  const setupTasks = tasks.filter(t => t.priority === 'critical' || t.priority === 'high');
  const setupTasksRemaining = setupTasks.length;

  // When setup is fully done, the dropdown should match the header's
  // "Setup complete" claim. Hide medium/low polish tasks instead of
  // promoting them next to a 100% bar — they get their own surface
  // elsewhere (smart questions panel + entity-create CTAs).
  const taskPool = setupTasksRemaining === 0 ? setupTasks : tasks;
  const visibleTasks = taskPool.slice(0, maxTasks);
  const hiddenCount = Math.max(0, taskPool.length - maxTasks);

  return (
    <div className={className}>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-fg-secondary" />
                Recommended Next Steps
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Complete these to get the most out of OrangeCat
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm font-medium text-foreground">{taskCompletion}% Setup</div>
                <div className="text-xs text-muted-foreground">
                  {setupTasksRemaining === 0
                    ? 'Setup complete'
                    : `${setupTasksRemaining} task${setupTasksRemaining !== 1 ? 's' : ''} remaining`}
                </div>
              </div>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="rounded-md p-2 transition-colors hover:bg-muted"
                aria-label={isExpanded ? 'Collapse tasks' : 'Expand tasks'}
              >
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="mt-3 h-2 w-full overflow-hidden rounded-sm bg-muted">
            <div
              className="h-2 rounded-sm bg-foreground transition-all duration-500"
              style={{ width: `${taskCompletion}%` }}
            />
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="pt-0">
            <div className="space-y-3">
              {visibleTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={() => markTaskCompleted(task.id)}
                  isCompleted={completedTaskIds.has(task.id)}
                />
              ))}

              {hiddenCount > 0 && (
                <div className="text-center pt-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsExpanded(true)}>
                    Show {hiddenCount} more task{hiddenCount !== 1 ? 's' : ''}
                  </Button>
                </div>
              )}
            </div>

            {showQuestions && questions.length > 0 && profileCompletion >= 75 && (
              <SmartQuestionsPanel questions={questions} className="mt-6 pt-4 border-t" />
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}

function TaskCard({
  task,
  onComplete,
  isCompleted,
}: {
  task: RecommendedTask;
  onComplete: () => void;
  isCompleted: boolean;
}) {
  const IconComponent = TASK_ICON_MAP[task.id] || Target;

  return (
    <div
      className={`
        flex items-start gap-4 rounded-md border p-4 transition-colors
        ${isCompleted ? 'border-border-subtle bg-muted/50 opacity-70' : 'border-border-subtle hover:border-border-strong hover:bg-muted/30'}
      `}
    >
      <button
        onClick={onComplete}
        className="mt-0.5 flex-shrink-0 text-muted-dim transition-colors hover:text-foreground"
        aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
      >
        {isCompleted ? (
          <CheckCircle2 className="w-5 h-5 text-status-positive" />
        ) : (
          <Circle className="w-5 h-5" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <IconComponent className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <h4
                className={`font-medium ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}
              >
                {task.title}
              </h4>
              <span
                className={`rounded-sm border px-2 py-0.5 text-xs ${getPriorityColor(task.priority)}`}
              >
                {getPriorityLabel(task.priority)}
              </span>
            </div>

            <p className="text-sm text-muted-foreground mb-3">{task.description}</p>

            {!isCompleted && (
              <Link href={task.action.href}>
                <Button
                  size="sm"
                  variant="outline"
                  className="hover:border-border-strong hover:bg-muted hover:text-foreground"
                >
                  {task.action.label}
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export { TaskCard };
