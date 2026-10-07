import { useEffect, useId, useRef, useState } from 'react';
import type { CourseSettings, ProviderId } from '../types';
import { DEFAULT_MODELS, PROVIDER_LABELS } from '../lib/engine';
import { CloseIcon, CpuIcon, EyeIcon, EyeOffIcon, GearIcon, InfoIcon, KeyIcon, TrashIcon } from './icons';

interface SettingsDialogProps {
  open: boolean;
  settings: CourseSettings;
  onClose: () => void;
  onSave: (settings: CourseSettings) => void;
}

const PROVIDERS: ProviderId[] = ['local', 'openai', 'gemini'];

const PROVIDER_HINTS: Record<ProviderId, string> = {
  local: 'No key required. Fully offline curriculum builder that runs in this tab.',
  openai:
    'Calls api.openai.com/v1/chat/completions (JSON mode) straight from your browser with your key.',
  gemini:
    'Calls generativelanguage.googleapis.com (v1beta generateContent) straight from your browser with your key.',
  // Both remote providers run browser-direct. If a network or provider blocks the
  // request (CORS, quota, bad key) the build degrades to the built-in engine.
};

export function SettingsDialog({ open, settings, onClose, onSave }: SettingsDialogProps) {
  const [draft, setDraft] = useState<CourseSettings>(settings);
  const [revealKey, setRevealKey] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (open) setDraft(settings);
  }, [open, settings]);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;

      // Keep focus inside the dialog while it is open.
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const focusTimer = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>('select, input, button')?.focus();
    }, 30);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(focusTimer);
      document.body.style.overflow = '';
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const needsKey = draft.provider !== 'local';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-slate-900/60 backdrop-blur-sm"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="surface relative z-10 max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-b-none rounded-t-2xl p-5 transition-colors duration-300 sm:rounded-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-600 text-white">
              <GearIcon className="h-5.5 w-5.5" />
            </span>
            <div>
              <h2 id={titleId} className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Engine settings
              </h2>
              <p id={descId} className="text-sm text-slate-700 dark:text-slate-300">
                Bring your own key, or stay on the built-in engine.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="touch-target h-11 w-11 shrink-0 rounded-xl border border-slate-200 text-slate-600 transition-colors duration-300 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
          >
            <CloseIcon className="h-4.5 w-4.5" />
          </button>
        </div>

        <form
          className="mt-6 space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            onSave(draft);
            onClose();
          }}
        >
          <fieldset className="space-y-3">
            <legend className="field-label">Course engine</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {PROVIDERS.map((provider) => {
                const active = draft.provider === provider;
                return (
                  <label
                    key={provider}
                    className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors duration-300 ${
                      active
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-500/15 dark:text-blue-200'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="provider"
                      value={provider}
                      checked={active}
                      onChange={() => {
                        const next = provider;
                        setDraft((current) => ({
                          ...current,
                          provider: next,
                          model:
                            current.model && PROVIDERS.some((id) => DEFAULT_MODELS[id] === current.model)
                              ? DEFAULT_MODELS[next]
                              : current.model,
                        }));
                      }}
                      className="h-4 w-4 shrink-0 accent-blue-600"
                    />
                    <span className="truncate">
                      {provider === 'local' ? 'Built-in' : PROVIDER_LABELS[provider]}
                    </span>
                  </label>
                );
              })}
            </div>
            <p className="flex items-start gap-2 rounded-lg bg-slate-100 p-3 text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-300">
              <InfoIcon className="mt-0.5 h-4 w-4 shrink-0" />
              {PROVIDER_HINTS[draft.provider]}
            </p>
          </fieldset>

          <div>
            <label className="field-label" htmlFor="api-key">
              <KeyIcon className="h-4 w-4" />
              OpenAI/Gemini API Key
              {!needsKey ? <span className="font-normal text-slate-500 dark:text-slate-400">(optional)</span> : null}
            </label>
            <div className="relative">
              <input
                id="api-key"
                type={revealKey ? 'text' : 'password'}
                value={draft.apiKey}
                onChange={(event) => setDraft((current) => ({ ...current, apiKey: event.target.value }))}
                placeholder={draft.provider === 'gemini' ? 'AIza…' : 'sk-…'}
                autoComplete="off"
                spellCheck={false}
                aria-describedby="api-key-help"
                className="field pr-14 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setRevealKey((value) => !value)}
                aria-label={revealKey ? 'Hide API key' : 'Show API key'}
                aria-pressed={revealKey}
                className="touch-target absolute inset-y-0 right-0 h-11 w-11 rounded-xl text-slate-500 transition-colors duration-300 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                {revealKey ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
              </button>
            </div>
            <p id="api-key-help" className="mt-2 text-xs text-slate-600 dark:text-slate-400">
              Stored in this browser only — {draft.rememberKey ? 'localStorage' : 'sessionStorage'} — and sent
              directly to the provider you pick. X-Courseify has no backend and never proxies your key.
            </p>
          </div>

          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Remember key on this device
              <span className="mt-0.5 block text-xs font-normal text-slate-600 dark:text-slate-400">
                Off keeps the key for this tab session only.
              </span>
            </span>
            <span className="relative inline-flex shrink-0">
              <input
                type="checkbox"
                checked={draft.rememberKey}
                onChange={(event) => setDraft((current) => ({ ...current, rememberKey: event.target.checked }))}
                className="peer h-6 w-11 cursor-pointer appearance-none rounded-full bg-slate-300 transition-colors duration-300 checked:bg-blue-600 dark:bg-slate-600 dark:checked:bg-blue-500"
              />
              <span className="pointer-events-none absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300 peer-checked:translate-x-5" />
            </span>
          </label>

          <div>
            <label className="field-label" htmlFor="model">
              <CpuIcon className="h-4 w-4" />
              Model
            </label>
            <input
              id="model"
              type="text"
              value={draft.model}
              onChange={(event) => setDraft((current) => ({ ...current, model: event.target.value }))}
              placeholder={DEFAULT_MODELS[draft.provider]}
              spellCheck={false}
              className="field font-mono text-sm"
            />
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
              Default for {PROVIDER_LABELS[draft.provider]}:{' '}
              <span className="font-mono">{DEFAULT_MODELS[draft.provider]}</span>
            </p>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => setDraft((current) => ({ ...current, apiKey: '' }))}
              className="touch-target gap-2 self-start rounded-xl px-3 text-sm font-semibold text-red-600 transition-colors duration-300 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              <TrashIcon className="h-4 w-4" />
              Clear key
            </button>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={onClose} className="btn-ghost justify-center text-sm">
                Cancel
              </button>
              <button type="submit" className="btn-primary justify-center text-sm">
                Save settings
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
