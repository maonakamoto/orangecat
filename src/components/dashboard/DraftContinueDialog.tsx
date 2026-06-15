'use client';

import { FileText, Plus, Clock, AlertTriangle, CheckCircle, ArrowRight, Edit3 } from 'lucide-react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useProjectStore } from '@/stores/projectStore';
import { formatRelativeTime } from '@/utils/dates';
import { ROUTES } from '@/config/routes';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface DraftContinueDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onContinueDraft: () => void;
  onStartFresh: () => void;
}

export default function DraftContinueDialog({
  isOpen,
  onClose,
  onContinueDraft,
  onStartFresh,
}: DraftContinueDialogProps) {
  const { drafts } = useProjectStore();

  const hasAnyDraft = drafts.length > 0;
  const primaryDraft = hasAnyDraft ? drafts[0] : null;

  if (!isOpen || !hasAnyDraft || !primaryDraft) {
    return null;
  }

  const isLocalDraft = primaryDraft.isDraft;
  const totalDrafts = drafts.length;

  const formatLastUpdated = (date: Date | null) => {
    if (!date) {
      return 'recently';
    }
    try {
      return formatRelativeTime(date);
    } catch {
      return 'recently';
    }
  };

  const getCompletionPercentage = () => {
    // Simple completion percentage based on filled fields
    let completed = 0;
    const total = 6;

    if (primaryDraft.title) {
      completed++;
    }
    if (primaryDraft.description) {
      completed++;
    }
    if (primaryDraft.goal_amount) {
      completed++;
    }
    if (primaryDraft.category) {
      completed++;
    }
    if (primaryDraft.bitcoin_address) {
      completed++;
    }
    if (primaryDraft.website_url) {
      completed++;
    }

    return Math.round((completed / total) * 100);
  };

  const completionPercentage = getCompletionPercentage();

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-2xl p-0">
        <DialogTitle className="sr-only">You Have Unfinished Work</DialogTitle>
        <Card className="w-full border-0 bg-surface-page shadow-none">
          <CardContent className="p-0">
            {/* Header */}
            <div className="border-b border-subtle bg-surface-raised/30 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md border border-subtle bg-surface-page">
                  <FileText className="h-6 w-6 text-fg-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-fg-primary mb-1">
                    You Have Unfinished Work
                  </h2>
                  <p className="text-fg-secondary">
                    What would you like to do with your{' '}
                    {totalDrafts > 1 ? 'draft projects' : 'draft project'}?
                  </p>
                </div>
              </div>
            </div>

            {/* Draft Summary */}
            <div className="border-b border-subtle bg-surface-raised/40 p-6">
              <div className="flex items-center gap-3 mb-3">
                {isLocalDraft && (
                  <div className="animate-pulse rounded-sm border border-status-negative/20 bg-status-negative/10 px-2 py-1 text-xs font-medium text-status-negative">
                    UNSAVED
                  </div>
                )}
                <div className="rounded-sm border border-subtle bg-surface-page px-2 py-1 text-xs font-medium text-fg-primary">
                  {completionPercentage}% Complete
                </div>
                {totalDrafts > 1 && (
                  <div className="rounded-sm border border-subtle bg-surface-raised px-2 py-1 text-xs font-medium text-fg-secondary">
                    +{totalDrafts - 1} More {totalDrafts > 2 ? 'Drafts' : 'Draft'}
                  </div>
                )}
              </div>

              <h3 className="font-semibold text-fg-primary mb-2">
                &ldquo;{primaryDraft.title}&rdquo;
              </h3>

              <div className="flex items-center gap-4 text-sm text-fg-secondary">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>Last saved {formatLastUpdated(new Date(primaryDraft.updated_at))}</span>
                </div>
                {isLocalDraft && (
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    <span>Draft in progress</span>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-fg-secondary mb-1">
                  <span>Project Progress</span>
                  <span>{completionPercentage}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-sm bg-surface-page">
                  <div
                    className="h-2 rounded-sm bg-fg-primary transition-all duration-300"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Action Options */}
            <div className="p-6 space-y-4">
              {/* Continue Draft - Primary Action */}
              <div className="rounded-md border border-strong bg-surface-raised/40 p-4 transition-colors hover:bg-surface-raised">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-fg-primary">
                      <Edit3 className="h-5 w-5 text-fg-inverted" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-fg-primary">Continue Where You Left Off</h4>
                      <p className="text-base text-fg-secondary">
                        {isLocalDraft
                          ? 'Resume your unsaved progress and complete your project'
                          : 'Complete your draft project and publish it'}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-fg-primary">Recommended</div>
                </div>

                <Button
                  onClick={onContinueDraft}
                  className="w-full bg-fg-primary text-fg-inverted hover:bg-fg-primary/90"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Continue Editing
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              {/* Start Fresh - Secondary Action */}
              <div className="rounded-md border border-subtle p-4 transition-colors hover:bg-surface-raised/50">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-surface-raised">
                      <Plus className="w-5 h-5 text-fg-secondary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-fg-primary">Start a New Project</h4>
                      <p className="text-base text-fg-secondary">
                        Create a completely new project from scratch
                      </p>
                    </div>
                  </div>
                </div>

                {isLocalDraft && (
                  <div className="mb-3 rounded-md border border-status-warning/30 bg-status-warning-subtle p-2">
                    <div className="flex items-center gap-2 text-sm text-status-warning">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Your unsaved progress will be kept for later</span>
                    </div>
                  </div>
                )}

                <Button
                  onClick={onStartFresh}
                  variant="outline"
                  className="w-full border-strong hover:bg-surface-raised"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Start Fresh
                </Button>
              </div>

              {/* Additional Options */}
              {totalDrafts > 1 && (
                <div className="pt-4 border-t border-default">
                  <Link href={ROUTES.DASHBOARD.PROJECTS}>
                    <Button
                      variant="ghost"
                      className="w-full text-fg-secondary hover:text-fg-primary"
                    >
                      View All {totalDrafts} Draft Projects
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
