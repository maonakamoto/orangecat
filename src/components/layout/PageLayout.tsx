import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageLayoutProps {
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl' | '7xl' | 'full';
  className?: string;
  header?: ReactNode;
  footer?: ReactNode;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  className?: string;
  children?: ReactNode;
}

interface PageSectionProps {
  children: ReactNode;
  className?: string;
  background?: 'default' | 'gray' | 'white' | 'tiffany';
}

export function PageLayout({
  children,
  maxWidth = '6xl',
  className,
  header,
  footer,
}: PageLayoutProps) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-full',
  };

  return (
    <div className={cn('oc-page pt-20', className)}>
      <div className={cn('oc-page-container', maxWidthClasses[maxWidth])}>
        {header}
        {children}
        {footer}
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, description, className, children }: PageHeaderProps) {
  return (
    <div className={cn('oc-page-header mb-8', className)}>
      <div>
        <h1 className="oc-page-title">{title}</h1>
        {subtitle && <p className="oc-page-subtitle font-medium">{subtitle}</p>}
        {description && <p className="oc-page-subtitle">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function PageSection({ children, className, background = 'default' }: PageSectionProps) {
  const backgroundClasses = {
    default: '',
    gray: 'oc-surface-muted oc-surface-padding',
    white: 'oc-surface oc-surface-padding',
    tiffany: 'oc-surface-muted oc-surface-padding',
  };

  return (
    <section className={cn('mb-12', backgroundClasses[background], className)}>{children}</section>
  );
}
