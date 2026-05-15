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
      <div className={cn('max-w-md w-full rounded-2xl p-8 text-center', content.bgColor)}>
        <div className="flex justify-center mb-6">
          <div
            className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center',
              content.bgIconClass
            )}
          >
            <IconComponent className={cn('w-8 h-8', content.color)} />
          </div>
        </div>

        <h2 className="text-2xl font-semibold text-gray-900 mb-2">{content.title}</h2>
        <p className="text-gray-600 mb-8">{content.subtitle}</p>

        <div className="space-y-4 text-left">
          {content.actions.map((action, index) => {
            const ActionIcon = action.icon;
            return (
              <div
                key={index}
                className="flex items-start space-x-3 p-3 rounded-lg bg-white/50 backdrop-blur-sm"
              >
                <ActionIcon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', content.color)} />
                <span className="text-sm text-gray-700 leading-relaxed">{action.text}</span>
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

        <p className="text-xs text-gray-500 mt-4">Preparing your personalized experience...</p>
      </div>
    </div>
  );
}
