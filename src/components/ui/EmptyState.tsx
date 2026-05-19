import React from 'react';
import { type LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

interface ProjectsEmptyStateProps {
  onCreateProject?: () => void;
  onDiscoverProjects?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 text-center ${className ?? ''}`}
    >
      <div className="oc-icon-tile mb-4 h-12 w-12">
        <Icon className="w-6 h-6 text-muted-dim" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      {description && <p className="text-muted-foreground mb-6 max-w-md">{description}</p>}
      {action}
    </div>
  );
}

// Projects-specific empty state component
export function ProjectsEmptyState({
  onCreateProject,
  onDiscoverProjects,
  size = 'lg',
}: ProjectsEmptyStateProps) {
  const sizeClasses = {
    sm: 'py-6',
    md: 'py-8',
    lg: 'py-12',
  };

  return (
    <div className={`flex flex-col items-center justify-center ${sizeClasses[size]} text-center`}>
      <div className="oc-accent-tile mb-6 h-16 w-16">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-3">No projects found</h3>
      <p className="text-muted-foreground mb-8 max-w-md">
        {onDiscoverProjects
          ? 'Start exploring amazing projects or create your own to get started.'
          : 'Create your first project to showcase your work and connect with contributors.'}
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        {onCreateProject && (
          <button
            onClick={onCreateProject}
            className="inline-flex items-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-muted-strong focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Create Project
          </button>
        )}
        {onDiscoverProjects && (
          <button
            onClick={onDiscoverProjects}
            className="inline-flex items-center rounded-md border border-border-strong bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            Discover Projects
          </button>
        )}
      </div>
    </div>
  );
}
