'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useProfileTheme } from '@/hooks/useProfileTheme';
import { useDropdown } from '@/hooks/useDropdown';
import { HeaderIconButton } from '@/components/layout/HeaderIconButton';
import { cn } from '@/lib/utils';

const OPTIONS = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'system', icon: Monitor, label: 'System' },
  { value: 'dark', icon: Moon, label: 'Dark' },
] as const;

/**
 * Theme switcher — a single header-rail button that opens a Light / System / Dark
 * menu. It occupies one slot like every other header action (it used to be a
 * 3-icon segmented control that ate three slots and broke the rail rhythm). The
 * trigger icon reflects the current choice, so the active mode reads at a glance.
 * "System" follows the OS preference (enableSystem in ThemeProvider). Built on
 * semantic tokens so it adapts correctly in both modes.
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { saveThemePreference } = useProfileTheme();
  const { isOpen, dropdownRef, buttonRef, toggle, close } = useDropdown();

  // Avoid hydration mismatch — the active choice isn't known until mounted on client.
  useEffect(() => setMounted(true), []);
  const current = mounted ? (theme ?? 'system') : 'system';
  const TriggerIcon = OPTIONS.find(o => o.value === current)?.icon ?? Monitor;

  const select = (value: string) => {
    setTheme(value);
    saveThemePreference(value);
    close();
  };

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      <HeaderIconButton
        ref={buttonRef}
        icon={TriggerIcon}
        label="Theme"
        onClick={toggle}
        active={isOpen}
        disabled={!mounted}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      />

      {isOpen && (
        <div
          role="menu"
          aria-label="Theme"
          className="absolute right-0 mt-2 w-40 rounded-lg border border-default bg-surface-overlay p-1 shadow-lg z-50 animate-in fade-in-0 zoom-in-95"
        >
          {OPTIONS.map(({ value, icon: Icon, label }) => {
            const active = current === value;
            return (
              <button
                key={value}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => select(value)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
                  active
                    ? 'bg-surface-raised text-fg-primary'
                    : 'text-fg-secondary hover:bg-surface-raised hover:text-fg-primary'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">{label}</span>
                {active && <Check className="h-4 w-4 shrink-0 text-accent-warm" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
