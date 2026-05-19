'use client';

import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getContextualContent } from './contextual-loader-config';

interface ContextualLoaderProps {
  className?: string;
  pathname?: string;
}

export function ContextualLoader({ className, pathname: propPathname }: ContextualLoaderProps) {
  const hookPathname = usePathname();
  const pathname = propPathname || hookPathname || '/';
  const content = getContextualContent(pathname);
  const IconComponent = content.icon;

  return (
    <div className={cn('flex items-center justify-center min-h-[400px] p-8', className)}>
      <div className="oc-surface max-w-md w-full p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="oc-icon-tile h-16 w-16">
            <IconComponent className={cn('w-8 h-8', content.color)} />
          </div>
        </div>

        <h2 className="text-2xl font-semibold text-foreground mb-2">{content.title}</h2>
        <p className="text-muted-foreground mb-8">{content.subtitle}</p>

        <div className="space-y-4 text-left">
          {content.actions.map((action, index) => {
            const ActionIcon = action.icon;
            return (
              <div key={index} className="oc-list-row flex items-start space-x-3">
                <ActionIcon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', content.color)} />
                <span className="text-sm text-foreground leading-relaxed">{action.text}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex justify-center">
          <div className="flex space-x-1">
            <div
              className="w-2 h-2 bg-current rounded-full animate-bounce"
              style={{ animationDelay: '0ms' }}
            />
            <div
              className="w-2 h-2 bg-current rounded-full animate-bounce"
              style={{ animationDelay: '150ms' }}
            />
            <div
              className="w-2 h-2 bg-current rounded-full animate-bounce"
              style={{ animationDelay: '300ms' }}
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          Preparing your personalized experience...
        </p>
      </div>
    </div>
  );
}
