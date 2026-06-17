'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useProfileTheme } from '@/hooks/useProfileTheme';
import { HeaderIconButton } from '@/components/layout/HeaderIconButton';

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
    <HeaderIconButton
      icon={isDark ? Sun : Moon}
      label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={handleToggle}
      disabled={!mounted}
      className={className}
    />
  );
}
