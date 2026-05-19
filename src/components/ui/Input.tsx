import { InputHTMLAttributes, forwardRef, useId } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COMPONENT_STYLES } from '@/config/design-system';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  icon?: LucideIcon;
}

// Helper function to get icon test ID based on icon name
const getIconTestId = (Icon: LucideIcon): string => {
  const iconName = Icon.displayName || Icon.name || 'icon';
  // Map common Lucide icon names to test IDs
  const iconMap: Record<string, string> = {
    Mail: 'mail',
    Lock: 'lock',
    Bitcoin: 'bitcoin',
    User: 'user',
    Search: 'search',
    Key: 'key',
    Eye: 'eye',
    EyeOff: 'eye-off',
  };
  return iconMap[iconName] || iconName.toLowerCase();
};

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, description, error, required, icon: Icon, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const descriptionId = `${inputId}-description`;

    return (
      <div className="space-y-2">
        {label && (
          <label htmlFor={inputId} className={COMPONENT_STYLES.field.label}>
            {label}
            {required && <span className={COMPONENT_STYLES.field.required}>*</span>}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon
                className="h-5 w-5 text-muted-dim"
                data-testid={`icon-${getIconTestId(Icon)}`}
              />
            </div>
          )}
          <input
            id={inputId}
            required={required}
            className={cn(
              COMPONENT_STYLES.field.control,
              'block h-10 px-3 text-sm',
              error && COMPONENT_STYLES.field.errorControl,
              Icon && 'pl-10',
              className
            )}
            aria-describedby={cn(error && errorId, description && descriptionId)}
            aria-invalid={error ? 'true' : 'false'}
            ref={ref}
            {...props}
          />
        </div>
        {description && !error && (
          <p id={descriptionId} className={COMPONENT_STYLES.field.description}>
            {description}
          </p>
        )}
        {error && (
          <p id={errorId} className={COMPONENT_STYLES.field.errorText} role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
export default Input;
