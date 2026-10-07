import { useCallback, useEffect, useState } from 'react';
import type { ThemeMode } from '../types';
import { STORAGE_KEYS, local, removeKey, writeJSON } from '../lib/storage';

function readStoredTheme(): ThemeMode | null {
  const storage = local.get();
  if (!storage) return null;
  try {
    const value = storage.getItem(STORAGE_KEYS.theme);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

function systemTheme(): ThemeMode {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: ThemeMode): void {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.setAttribute('data-theme', theme);
  root.style.colorScheme = theme;
}

/**
 * Theme state for the whole app.
 *
 * - Toggles the `dark` class on the <html> document root.
 * - Persists the choice in localStorage so it survives reloads.
 * - Falls back to the OS preference until the user makes an explicit choice.
 */
export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(() => readStoredTheme() ?? systemTheme());
  const [isExplicit, setIsExplicit] = useState<boolean>(() => readStoredTheme() !== null);

  useEffect(() => {
    applyTheme(theme);
    if (isExplicit) {
      writeJSON(local.get(), STORAGE_KEYS.theme, theme);
    }
  }, [theme, isExplicit]);

  // Follow the OS preference only while the user has not chosen a theme themselves.
  useEffect(() => {
    if (isExplicit) return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => setTheme(event.matches ? 'dark' : 'light');
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [isExplicit]);

  const toggleTheme = useCallback(() => {
    setIsExplicit(true);
    setTheme((current) => {
      const next: ThemeMode = current === 'dark' ? 'light' : 'dark';
      writeJSON(local.get(), STORAGE_KEYS.theme, next);
      return next;
    });
  }, []);

  const resetToSystem = useCallback(() => {
    removeKey(local.get(), STORAGE_KEYS.theme);
    setIsExplicit(false);
    setTheme(systemTheme());
  }, []);

  return { theme, isDark: theme === 'dark', isExplicit, toggleTheme, resetToSystem };
}
