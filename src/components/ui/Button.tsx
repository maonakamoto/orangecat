import { ButtonHTMLAttributes, forwardRef } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { COMPONENT_STYLES } from '@/config/design-system';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'gradient';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  href?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {
    const buttonContent = isLoading ? (
      <div className="flex items-center">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-3" />
        <span>Loading...</span>
      </div>
    ) : (
      children
    );

    if (props.href) {
      return (
        <Link
          href={props.href}
          className={cn(
            COMPONENT_STYLES.button.base,
            COMPONENT_STYLES.button.variants[variant],
            COMPONENT_STYLES.button.sizes[size],
            className
          )}
        >
          {buttonContent}
        </Link>
      );
    }

    return (
      <button
        ref={ref}
        className={cn(
          COMPONENT_STYLES.button.base,
          COMPONENT_STYLES.button.variants[variant],
          COMPONENT_STYLES.button.sizes[size],
          className
        )}
        disabled={isLoading}
        {...props}
      >
        {buttonContent}
      </button>
    );
  }
);

Button.displayName = 'Button';

// Export both named and default exports to handle different import patterns
export { Button };
export default Button;
