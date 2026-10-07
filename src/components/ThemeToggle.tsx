import type { ThemeMode } from '../types';
import { MoonIcon, SunIcon } from './icons';

interface ThemeToggleProps {
  theme: ThemeMode;
  onToggle: () => void;
}

/**
 * Top-right theme switch. Toggles the `dark` class on <html> (handled by useTheme)
 * and persists the preference to localStorage.
 */
export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isDark}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className="touch-target group relative h-11 w-11 rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors duration-300 hover:border-blue-600 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-blue-400 dark:hover:text-blue-400"
    >
      <span className="relative block h-5 w-5">
        <SunIcon
          className={`absolute inset-0 h-5 w-5 transition-all duration-300 ${
            isDark ? 'scale-50 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'
          }`}
        />
        <MoonIcon
          className={`absolute inset-0 h-5 w-5 transition-all duration-300 ${
            isDark ? 'scale-100 rotate-0 opacity-100' : 'scale-50 -rotate-90 opacity-0'
          }`}
        />
      </span>
      <span className="sr-only">{isDark ? 'Dark mode is on' : 'Light mode is on'}</span>
    </button>
  );
}
