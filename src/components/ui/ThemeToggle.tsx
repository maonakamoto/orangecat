'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useProfileTheme } from '@/hooks/useProfileTheme';

const OPTIONS = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'system', icon: Monitor, label: 'System' },
  { value: 'dark', icon: Moon, label: 'Dark' },
] as const;

/**
 * Theme switcher — an elegant 3-way segmented control (Light / System / Dark).
 * "System" follows the OS preference (enableSystem in ThemeProvider). Built entirely
 * on semantic tokens so it adapts correctly in both modes.
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { saveThemePreference } = useProfileTheme();

  // Avoid hydration mismatch — the active state isn't known until mounted on client.
  useEffect(() => setMounted(true), []);
  const current = mounted ? (theme ?? 'system') : undefined;

  const select = (value: string) => {
    setTheme(value);
    saveThemePreference(value);
  };

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={`inline-flex items-center gap-0.5 rounded-full border border-default bg-surface-raised/60 p-0.5 ${className}`}
    >
      {OPTIONS.map(({ value, icon: Icon, label }) => {
        const active = current === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${label} theme`}
            title={`${label} theme`}
            onClick={() => select(value)}
            disabled={!mounted}
            className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
              active
                ? 'bg-surface-overlay text-fg-primary shadow-sm'
                : 'text-fg-tertiary hover:text-fg-primary'
            }`}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
