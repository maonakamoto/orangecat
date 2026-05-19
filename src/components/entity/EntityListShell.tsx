'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

interface EntityListShellProps {
  title: string;
  description?: string;
  headerActions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function EntityListShell({
  title,
  description,
  headerActions,
  children,
  className,
}: EntityListShellProps) {
  return (
    <div className={cn('oc-page pb-20 md:pb-8', className)}>
      <div className="oc-page-container oc-page-stack">
        <Breadcrumb items={[{ label: title }]} />
        <div className="oc-page-header">
          <div className="flex-1 min-w-0">
            <h1 className="oc-page-title break-words">{title}</h1>
            {description && <p className="oc-page-subtitle break-words">{description}</p>}
          </div>
          {headerActions && (
            <div className="w-full flex-shrink-0 sm:w-auto">
              <div className="oc-page-actions">{headerActions}</div>
            </div>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
