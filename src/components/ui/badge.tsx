import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';
import { COMPONENT_STYLES } from '@/config/design-system';

const badgeVariants = cva(COMPONENT_STYLES.badge.base, {
  variants: {
    variant: {
      default: 'border-transparent bg-fg-primary text-fg-inverted hover:bg-muted-strong',
      secondary: 'border-transparent bg-surface-raised text-fg-secondary hover:bg-surface-raised',
      destructive:
        'border-transparent bg-status-negative text-fg-inverted hover:bg-status-negative/90',
      outline: 'border-default text-fg-primary',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
