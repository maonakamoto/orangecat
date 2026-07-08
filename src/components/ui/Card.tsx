import React, { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { COMPONENT_STYLES } from '@/config/design-system';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'minimal' | 'gradient';
}

export function Card({ children, className, variant = 'default', ...props }: CardProps) {
  return (
    <div
      className={cn(COMPONENT_STYLES.card.base, COMPONENT_STYLES.card.variants[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
}

export const CardHeader = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div {...p} className={cn('p-6', className)} />
);

export const CardTitle = ({ className, ...p }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 {...p} className={cn('text-lg font-semibold leading-tight text-fg-primary', className)} />
);

export const CardDescription = ({
  className,
  ...p
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p {...p} className={cn('mt-1 text-sm leading-6 text-fg-secondary', className)} />
);

export const CardContent = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div {...p} className={cn('p-6 pt-0', className)} />
);

export const CardFooter = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div {...p} className={cn('p-6 pt-0 flex items-center', className)} />
);

// keep default export so existing imports still work
export default Card;
