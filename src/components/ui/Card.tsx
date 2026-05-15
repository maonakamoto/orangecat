import React, { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'minimal' | 'gradient';
}

export function Card({ children, className, variant = 'default', ...props }: CardProps) {
  const variants = {
    default:
      'bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-border shadow-sm hover:shadow-lg transition-all duration-300',
    elevated:
      'bg-white dark:bg-card rounded-2xl border-0 shadow-lg hover:shadow-xl transition-all duration-300',
    minimal:
      'bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-border hover:border-gray-200 dark:hover:border-border transition-all duration-300',
    gradient:
      'bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-card dark:via-card dark:to-muted rounded-2xl border border-gray-200 dark:border-border shadow-md hover:shadow-lg transition-all duration-300',
  };

  return (
    <div className={cn(variants[variant], className)} {...props}>
      {children}
    </div>
  );
}

export const CardHeader = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div {...p} className={cn('p-6', className)} />
);

export const CardTitle = ({ className, ...p }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3
    {...p}
    className={cn(
      'text-lg font-semibold leading-tight text-gray-900 dark:text-foreground',
      className
    )}
  />
);

export const CardDescription = ({
  className,
  ...p
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p
    {...p}
    className={cn(
      'text-sm text-gray-600 dark:text-muted-foreground leading-relaxed mt-1',
      className
    )}
  />
);

export const CardContent = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div {...p} className={cn('p-6 pt-0', className)} />
);

export const CardFooter = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div {...p} className={cn('p-6 pt-0 flex items-center', className)} />
);

// keep default export so existing imports still work
export default Card;
