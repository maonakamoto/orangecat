'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Breadcrumb, BreadcrumbItem } from '@/components/ui/Breadcrumb';

interface EntityDetailLayoutProps {
  title: string;
  subtitle?: string;
  headerActions?: ReactNode;
  left: ReactNode;
  right?: ReactNode;
  className?: string;
  breadcrumbItems?: BreadcrumbItem[];
}

export default function EntityDetailLayout({
  title,
  subtitle,
  headerActions,
  left,
  right,
  className,
  breadcrumbItems,
}: EntityDetailLayoutProps) {
  return (
    <div className={cn('oc-page', className)}>
      <div className="oc-page-container oc-page-stack">
        {breadcrumbItems && <Breadcrumb items={breadcrumbItems} />}
        <div className="oc-page-header">
          <div>
            <h1 className="oc-page-title">{title}</h1>
            {subtitle && <p className="oc-page-subtitle">{subtitle}</p>}
          </div>
          {headerActions && <div className="oc-page-actions">{headerActions}</div>}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">{left}</div>
          <div>{right}</div>
        </div>
      </div>
    </div>
  );
}
