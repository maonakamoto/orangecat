/**
 * Cat Context Tab - Documents list for the Cat hub
 *
 * Inline context management within the Cat page.
 * Users can view, add, and manage their context documents.
 *
 * Created: 2026-01-22
 */

'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useEntityList } from '@/hooks/useEntityList';
import { useCatContext } from '@/hooks/useCatContext';
import {
  documentEntityConfig,
  DOCUMENT_TYPE_LABELS,
  type DocumentListItem,
} from '@/config/entities/documents';
import {
  Plus,
  FileText,
  Target,
  Zap,
  Wallet,
  Briefcase,
  Folder,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ROUTES } from '@/config/routes';
import { ENTITY_REGISTRY } from '@/config/entity-registry';

const TYPE_ICONS: Record<string, React.ElementType> = {
  goals: Target,
  skills: Zap,
  finances: Wallet,
  business_plan: Briefcase,
  notes: FileText,
  other: Folder,
};

export function CatContextTab() {
  const { user } = useAuth();
  const { summary, isLoading: summaryLoading } = useCatContext();

  const { items: documents, loading: documentsLoading } = useEntityList<DocumentListItem>({
    apiEndpoint: documentEntityConfig.apiEndpoint,
    userId: user?.id,
    limit: 50,
    enabled: !!user?.id,
  });

  const getCompletenessLabel = (score: number) => {
    if (score >= 70) {
      return 'Great context!';
    }
    if (score >= 40) {
      return 'Getting there';
    }
    return 'Just started';
  };

  const getCompletenessColor = (score: number) => {
    if (score >= 70) {
      return 'text-green-700 dark:text-green-300';
    }
    if (score >= 40) {
      return 'text-amber-700 dark:text-amber-300';
    }
    return 'text-muted-foreground';
  };

  // Group documents by type
  const documentsByType = documents.reduce(
    (acc, doc) => {
      const type = doc.document_type || 'notes';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(doc);
      return acc;
    },
    {} as Record<string, DocumentListItem[]>
  );

  return (
    <div className="space-y-6">
      {/* Completeness meter */}
      {!summaryLoading && summary && (
        <div className="rounded-md border border-border-subtle bg-background p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground">Context Completeness</h3>
            <span className={`text-sm font-medium ${getCompletenessColor(summary.completeness)}`}>
              {summary.completeness}%
            </span>
          </div>
          <Progress value={summary.completeness} className="h-2 mb-2" />
          <p className="text-xs text-muted-foreground">
            {getCompletenessLabel(summary.completeness)}
          </p>

          {/* Tips */}
          {summary.tips.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border-subtle">
              <p className="text-xs font-medium text-muted-strong mb-2">Tips to improve:</p>
              <ul className="space-y-1">
                {summary.tips.map((tip, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <Plus className="h-3 w-3 text-muted-dim flex-shrink-0 mt-0.5" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Add context button */}
      <div className="flex items-center justify-between gap-3 rounded-md border border-border-subtle bg-muted/30 p-4">
        <div>
          <h3 className="text-sm font-medium text-foreground">Improve Cat’s answers</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Add goals, constraints, finances, skills, and plans as private context.
          </p>
        </div>
        <Link
          href={ROUTES.DASHBOARD.DOCUMENTS_CREATE}
          className="inline-flex min-h-11 flex-shrink-0 items-center justify-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
        >
          <Plus className="h-4 w-4" />
          Add
        </Link>
      </div>

      {/* Documents list */}
      {documentsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-dim" />
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12 px-4">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-muted">
            <FileText className="h-6 w-6 text-muted-dim" />
          </div>
          <h3 className="font-semibold text-foreground mb-2">No context yet</h3>
          <p className="text-base text-muted-foreground mb-4">
            Add documents about your goals, skills, and situation to get personalized advice.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(documentsByType).map(([type, docs]) => {
            const Icon = TYPE_ICONS[type] || FileText;
            const label = (DOCUMENT_TYPE_LABELS as Record<string, string>)[type] || type;
            return (
              <div
                key={type}
                className="overflow-hidden rounded-md border border-border-subtle bg-background"
              >
                <div className="flex items-center gap-2 border-b border-border-subtle bg-muted/50 px-4 py-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{label}</span>
                  <span className="text-xs text-muted-dim ml-auto">{docs.length}</span>
                </div>
                <div className="divide-y divide-border">
                  {docs.map(doc => (
                    <Link
                      key={doc.id}
                      href={`${ENTITY_REGISTRY['document'].basePath}/${doc.id}`}
                      className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-medium text-foreground truncate">
                          {doc.title}
                        </p>
                        {doc.content && (
                          <p className="text-sm text-muted-foreground truncate mt-0.5">
                            {doc.content.substring(0, 60)}...
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-dim flex-shrink-0 ml-2" />
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CatContextTab;
