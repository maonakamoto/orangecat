'use client';

import { ArrowRight } from 'lucide-react';
import Button from '@/components/ui/Button';

interface ResultsSectionProps {
  title: string;
  count: number;
  icon?: React.ReactNode;
  onViewAll?: () => void;
  viewAllLabel?: string;
  children: React.ReactNode;
  showViewAll?: boolean;
}

export default function ResultsSection({
  title,
  count,
  icon,
  onViewAll,
  viewAllLabel = 'View All',
  children,
  showViewAll = true,
}: ResultsSectionProps) {
  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon && <span className="text-fg-secondary">{icon}</span>}
          <h3 className="text-lg font-semibold text-fg-primary">
            {title}
            <span className="ml-2 text-base font-normal text-fg-secondary">({count})</span>
          </h3>
        </div>

        {showViewAll && onViewAll && count > 0 && (
          <Button
            onClick={onViewAll}
            variant="ghost"
            size="sm"
            className="text-fg-primary hover:text-fg-primary"
          >
            {viewAllLabel}
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>

      {/* Section Content */}
      <div>{children}</div>
    </section>
  );
}
