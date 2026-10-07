export const STORAGE_KEYS = {
  theme: 'x-courseify:theme',
  settings: 'x-courseify:settings',
  /** Session-scoped copy of the API key when "remember" is off. */
  sessionKey: 'x-courseify:session-key',
  draft: 'x-courseify:draft',
  course: 'x-courseify:last-course',
  checklist: 'x-courseify:checklist',
} as const;

function safeLocalStorage(): Storage | null {
  try {
    const probe = '__x_courseify_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

function safeSessionStorage(): Storage | null {
  try {
    const probe = '__x_courseify_probe__';
    window.sessionStorage.setItem(probe, '1');
    window.sessionStorage.removeItem(probe);
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function readJSON<T>(storage: Storage | null, key: string): T | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeJSON(storage: Storage | null, key: string, value: unknown): void {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    /* Quota exceeded or storage disabled — the app keeps working in-memory. */
  }
}

export function removeKey(storage: Storage | null, key: string): void {
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    /* no-op */
  }
}

export const local = {
  get: safeLocalStorage,
  session: safeSessionStorage,
};
