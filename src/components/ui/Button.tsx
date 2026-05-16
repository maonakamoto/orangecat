import { ButtonHTMLAttributes, forwardRef } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { GRADIENTS } from '@/config/gradients';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'gradient';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  href?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 ease-ios focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-98 transform touch-manipulation select-none';

    const variants = {
      primary:
        'bg-tiffany-600 text-white hover:bg-tiffany-700 focus-visible:ring-tiffany-500 shadow-button hover:shadow-button-hover active:shadow-sm border-0',
      secondary:
        'bg-muted text-foreground hover:bg-gray-200 dark:hover:bg-muted/80 focus-visible:ring-gray-500 shadow-button hover:shadow-button-hover active:shadow-sm border border-border',
      ghost:
        'hover:bg-gray-100 dark:hover:bg-muted hover:text-gray-900 dark:hover:text-foreground focus-visible:ring-gray-500 shadow-none hover:shadow-sm text-gray-700 dark:text-muted-foreground',
      danger:
        'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 shadow-button hover:shadow-button-hover active:shadow-sm border-0',
      outline:
        'border-2 border-gray-300 dark:border-border bg-transparent hover:bg-gray-50 dark:hover:bg-muted hover:border-gray-400 focus-visible:ring-gray-500 shadow-sm hover:shadow-button active:shadow-sm text-gray-700 dark:text-foreground',
      gradient: `${GRADIENTS.btnPrimary} text-white shadow-button hover:shadow-button-hover active:shadow-sm border-0 focus-visible:ring-tiffany-500`,
    };

    const sizes = {
      sm: 'h-11 min-h-11 px-4 text-sm min-w-20 font-medium', // Mobile touch target: 44px minimum
      md: 'h-11 min-h-11 px-6 text-base min-w-[100px] font-semibold',
      lg: 'h-12 min-h-12 px-8 text-lg min-w-[120px] font-semibold',
      xl: 'h-14 min-h-14 px-10 text-xl min-w-[140px] font-bold',
    };

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
          className={cn(baseStyles, variants[variant], sizes[size], className)}
        >
          {buttonContent}
        </Link>
      );
    }

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
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
