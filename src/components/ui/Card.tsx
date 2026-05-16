import React, { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'minimal' | 'gradient';
}

export function Card({ children, className, variant = 'default', ...props }: CardProps) {
  const variants = {
    default:
      'bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-all duration-300',
    elevated: 'bg-card rounded-xl border-0 shadow-md hover:shadow-lg transition-all duration-300',
    minimal:
      'bg-card rounded-xl border border-border hover:border-border/80 transition-all duration-300',
    gradient:
      'bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-all duration-300',
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
  <h3 {...p} className={cn('text-lg font-semibold leading-tight text-foreground', className)} />
);

export const CardDescription = ({
  className,
  ...p
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p {...p} className={cn('text-sm text-muted-foreground leading-relaxed mt-1', className)} />
);

export const CardContent = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div {...p} className={cn('p-6 pt-0', className)} />
);

export const CardFooter = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div {...p} className={cn('p-6 pt-0 flex items-center', className)} />
);

// keep default export so existing imports still work
export default Card;
