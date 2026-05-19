'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useProfileTheme } from '@/hooks/useProfileTheme';
import { cn } from '@/lib/utils';
import { COMPONENT_STYLES } from '@/config/design-system';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { saveThemePreference } = useProfileTheme();

  // Avoid hydration mismatch — render nothing until mounted on client
  useEffect(() => setMounted(true), []);

  const isDark = mounted ? theme === 'dark' : true;

  const handleToggle = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setTheme(newTheme);
    saveThemePreference(newTheme);
  };

  return (
    <button
      onClick={handleToggle}
      className={cn(
        COMPONENT_STYLES.iconButton.base,
        COMPONENT_STYLES.iconButton.variants.outline,
        className
      )}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      disabled={!mounted}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
