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
} from 'lucide-react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';
import { useRecommendations } from '@/hooks/useRecommendations';
import { SmartQuestionsPanel } from './SmartQuestionsPanel';
import { TASK_DEFINITIONS } from '@/services/recommendations/tasks';
import type { RecommendedTask, TaskPriority } from '@/services/recommendations/types';
import type { LucideIcon } from 'lucide-react';
import { GRADIENTS } from '@/config/gradients';

const TASK_ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  TASK_DEFINITIONS.map(task => [task.id, task.icon])
);

interface TasksSectionProps {
  className?: string;
  maxTasks?: number;
  showQuestions?: boolean;
}

function getPriorityColor(priority: TaskPriority): string {
  switch (priority) {
    case 'critical':
      return 'text-red-700 bg-red-50 border-red-200';
    case 'high':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'medium':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'low':
      return 'text-green-600 bg-green-50 border-green-200';
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
  } = useRecommendations({ limit: maxTasks + 2 });

  if (!user || !profile) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400 dark:text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading recommendations...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return null;
  }

  if (celebration && !celebrationDismissed) {
    return (
      <div className={className}>
        <Card className={`border-green-200 ${GRADIENTS.sectionGreen}`}>
          <CardContent className="p-6 text-center relative">
            <button
              onClick={dismissCelebration}
              className="absolute top-3 right-3 p-1.5 text-gray-400 dark:text-muted-foreground hover:text-gray-600 dark:hover:text-foreground hover:bg-white/60 dark:hover:bg-muted/60 rounded-lg transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-green-600" />
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
    return null;
  }

  const visibleTasks = tasks.slice(0, maxTasks);
  const hiddenCount = tasks.length - maxTasks;

  return (
    <div className={className}>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-tiffany-600" />
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
                  {tasks.length} task{tasks.length !== 1 ? 's' : ''} remaining
                </div>
              </div>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-muted rounded-lg transition-colors"
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

          <div className="w-full bg-gray-200 dark:bg-muted rounded-full h-2 mt-3">
            <div
              className="bg-tiffany-600 h-2 rounded-full transition-all duration-500"
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
        flex items-start gap-4 p-4 border rounded-lg transition-all
        ${isCompleted ? 'border-green-200 bg-green-50 opacity-60' : 'border-border hover:border-tiffany-300 hover:shadow-sm'}
      `}
    >
      <button
        onClick={onComplete}
        className="mt-0.5 text-gray-400 dark:text-muted-foreground hover:text-tiffany-600 transition-colors flex-shrink-0"
        aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
      >
        {isCompleted ? (
          <CheckCircle2 className="w-5 h-5 text-green-600" />
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
                className={`px-2 py-0.5 text-xs rounded-full border ${getPriorityColor(task.priority)}`}
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
                  className="hover:bg-tiffany-50 hover:border-tiffany-300 hover:text-tiffany-700"
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
