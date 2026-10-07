import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Course, CourseSettings, ProviderId } from './types';
import { useTheme } from './hooks/useTheme';
import { parseSource } from './lib/xUrl';
import { BUILD_STAGES, DEFAULT_MODELS, PROVIDER_LABELS, buildCourse } from './lib/engine';
import { EXAMPLE_THREAD, EXAMPLE_URL } from './lib/example';
import { STORAGE_KEYS, local, readJSON, removeKey, writeJSON } from './lib/storage';
import { CourseResult } from './components/CourseResult';
import { CourseSkeleton } from './components/CourseSkeleton';
import { SettingsDialog } from './components/SettingsDialog';
import { SourceBadge } from './components/SourceBadge';
import { ThemeToggle } from './components/ThemeToggle';
import {
  AlertIcon,
  CheckIcon,
  GearIcon,
  InfoIcon,
  KeyIcon,
  LayersIcon,
  ListIcon,
  SparkIcon,
  TrashIcon,
  XLogoIcon,
} from './components/icons';

function loadSettings(): CourseSettings {
  const stored = readJSON<Partial<CourseSettings>>(local.get(), STORAGE_KEYS.settings) ?? {};
  const provider: ProviderId =
    stored.provider === 'openai' || stored.provider === 'gemini' ? stored.provider : 'local';
  const rememberKey = stored.rememberKey !== false;
  const apiKey = rememberKey
    ? (stored.apiKey ?? '')
    : (local.session()?.getItem(STORAGE_KEYS.sessionKey) ?? '');

  return {
    provider,
    apiKey,
    rememberKey,
    model: stored.model?.trim() || DEFAULT_MODELS[provider],
  };
}

function persistSettings(next: CourseSettings): void {
  writeJSON(local.get(), STORAGE_KEYS.settings, {
    provider: next.provider,
    rememberKey: next.rememberKey,
    model: next.model.trim() || DEFAULT_MODELS[next.provider],
    // The key only ever lands in localStorage when the user opts in.
    apiKey: next.rememberKey ? next.apiKey : '',
  });

  if (!next.rememberKey && next.apiKey) {
    local.session()?.setItem(STORAGE_KEYS.sessionKey, next.apiKey);
  } else {
    removeKey(local.session(), STORAGE_KEYS.sessionKey);
  }
}

export default function App() {
  const { theme, isDark, toggleTheme } = useTheme();

  const [settings, setSettings] = useState<CourseSettings>(loadSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [urlInput, setUrlInput] = useState('');
  const [postText, setPostText] = useState('');

  const [building, setBuilding] = useState(false);
  const [stage, setStage] = useState(0);
  const [course, setCourse] = useState<Course | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const resultRef = useRef<HTMLDivElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);

  /* ----------------------------- persistence ----------------------------- */

  // Restore the last session (draft input, generated course, checklist ticks).
  useEffect(() => {
    const draft = readJSON<{ url?: string; text?: string }>(local.get(), STORAGE_KEYS.draft);
    if (draft?.url) setUrlInput(draft.url);
    if (draft?.text) setPostText(draft.text);

    const saved = readJSON<Course>(local.get(), STORAGE_KEYS.course);
    if (saved?.chunks?.length === 3) setCourse(saved);
    const savedChecks = readJSON<Record<string, boolean>>(local.get(), STORAGE_KEYS.checklist);
    if (savedChecks) setChecked(savedChecks);
  }, []);

  useEffect(() => {
    writeJSON(local.get(), STORAGE_KEYS.draft, { url: urlInput, text: postText });
  }, [urlInput, postText]);

  useEffect(() => {
    writeJSON(local.get(), STORAGE_KEYS.checklist, checked);
  }, [checked]);

  /* ------------------------------- derived ------------------------------- */

  const source = useMemo(() => parseSource(urlInput), [urlInput]);
  const needsKey = settings.provider !== 'local' && settings.apiKey.trim().length <= 8;
  const canBuild = urlInput.trim().length > 0 && !building;

  /* ------------------------------- actions ------------------------------- */

  const handleBuild = useCallback(async () => {
    if (!urlInput.trim()) {
      setError('Paste an X.com thread or video URL first.');
      urlRef.current?.focus();
      return;
    }
    if (!source.valid) {
      setError(source.error ?? 'That URL could not be parsed. Use https://x.com/username/status/1234567890.');
      urlRef.current?.focus();
      return;
    }

    setError(null);
    setBuilding(true);
    setStage(0);
    setCourse(null);

    try {
      const built = await buildCourse({ source, postText, settings }, (index) => setStage(index));
      setCourse(built);
      setChecked({});
      removeKey(local.get(), STORAGE_KEYS.checklist);
      writeJSON(local.get(), STORAGE_KEYS.course, built);
    } catch (buildError) {
      setError(buildError instanceof Error ? buildError.message : 'Something went wrong while building the course.');
    } finally {
      setBuilding(false);
      setStage(0);
    }
  }, [urlInput, source, postText, settings]);

  // Bring the freshly generated curriculum into view.
  useEffect(() => {
    if (!course || building) return;
    const timer = window.setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [course, building]);

  const handleSaveSettings = useCallback((next: CourseSettings) => {
    const normalised: CourseSettings = {
      ...next,
      apiKey: next.apiKey.trim(),
      model: next.model.trim() || DEFAULT_MODELS[next.provider],
    };
    setSettings(normalised);
    persistSettings(normalised);
  }, []);

  const handleClearKey = useCallback(() => {
    const next: CourseSettings = { ...settings, apiKey: '', provider: 'local', model: DEFAULT_MODELS.local };
    setSettings(next);
    persistSettings(next);
  }, [settings]);

  const handleUseExample = useCallback(() => {
    setUrlInput(EXAMPLE_URL);
    setPostText(EXAMPLE_THREAD);
    setError(null);
    urlRef.current?.focus();
  }, []);

  const handleReset = useCallback(() => {
    setUrlInput('');
    setPostText('');
    setCourse(null);
    setChecked({});
    setError(null);
    removeKey(local.get(), STORAGE_KEYS.course);
    removeKey(local.get(), STORAGE_KEYS.draft);
    removeKey(local.get(), STORAGE_KEYS.checklist);
    urlRef.current?.focus();
  }, []);

  const toggleTakeaway = useCallback((key: string) => {
    setChecked((current) => ({ ...current, [key]: !current[key] }));
  }, []);

  const wordCount = postText.trim() ? postText.trim().split(/\s+/).length : 0;

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-700 transition-colors duration-300 dark:bg-slate-900 dark:text-slate-300">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:bg-blue-600 focus:px-4 focus:py-3 focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      {/* ------------------------------ header ------------------------------ */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-slate-50/85 backdrop-blur-md transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900/85">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-600 text-white shadow-sm dark:bg-blue-500">
              <SparkIcon className="h-5.5 w-5.5" />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <span className="truncate text-lg font-bold text-slate-900 dark:text-slate-100">
                  X-Courseify
                </span>
                <span className="hidden rounded-full bg-blue-600/10 px-2 py-0.5 text-[11px] font-bold tracking-wide text-blue-700 uppercase sm:inline dark:bg-blue-400/15 dark:text-blue-300">
                  micro-SaaS
                </span>
              </span>
              <span className="hidden truncate text-xs text-slate-600 sm:block dark:text-slate-400">
                Threads and videos in, structured mini-courses out.
              </span>
            </span>
          </div>

          {/* Theme toggle: always the top-right control. */}
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 lg:inline-flex dark:border-slate-700 dark:text-slate-300">
              <KeyIcon className="h-3.5 w-3.5" />
              {settings.provider === 'local'
                ? 'Built-in engine'
                : `${PROVIDER_LABELS[settings.provider]}${needsKey ? ' · no key' : ' · key set'}`}
            </span>
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl px-4 pt-8 pb-24 sm:px-6 lg:px-8">
        {/* ------------------------------- hero ------------------------------ */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 transition-colors duration-300 sm:p-10 dark:border-slate-700 dark:bg-slate-800">
          <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
          <div className="relative">
            <span className="pill">
              <ListIcon className="h-3.5 w-3.5" />
              Works entirely in your browser
            </span>
            <h1 className="mt-4 max-w-3xl text-3xl leading-tight font-bold text-slate-900 sm:text-4xl lg:text-5xl dark:text-slate-100">
              Turn one X post into a{' '}
              <span className="text-gradient">structured mini-course</span>.
            </h1>
            <p className="mt-4 max-w-2xl text-base text-slate-700 dark:text-slate-300">
              Drop in a thread or video link and X-Courseify verifies the source, chunks the ideas into
              modules, writes three-sentence summaries and hands you a takeaway checklist you can actually
              finish.
            </p>

            <dl className="mt-7 grid gap-3 sm:grid-cols-3">
              {[
                { term: '3 lesson chunks', detail: 'Foundations, application, systems & scale.', icon: LayersIcon },
                { term: 'Source verified', detail: 'Handle and post id parsed client-side.', icon: XLogoIcon },
                { term: 'Your key, your tab', detail: 'Bring your own OpenAI or Gemini key.', icon: KeyIcon },
              ].map(({ term, detail, icon: Icon }) => (
                <div
                  key={term}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900"
                >
                  <dt className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                    <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    {term}
                  </dt>
                  <dd className="mt-1 text-sm text-slate-700 dark:text-slate-300">{detail}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ------------------------------ inputs ----------------------------- */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] lg:items-start">
          <section className="surface p-5 transition-colors duration-300 sm:p-7" aria-labelledby="source-heading">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="source-heading" className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Source material
                </h2>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                  One link, optional transcript. Nothing is uploaded anywhere until you click Build Course.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                aria-label="Open engine settings"
                aria-haspopup="dialog"
                className="touch-target h-11 w-11 shrink-0 rounded-xl border border-slate-200 text-slate-700 transition-colors duration-300 hover:border-blue-600 hover:text-blue-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-blue-400 dark:hover:text-blue-300"
                title="Engine settings"
              >
                <GearIcon className="h-5 w-5" />
              </button>
            </div>

            <form
              className="mt-6 space-y-6"
              onSubmit={(event) => {
                event.preventDefault();
                void handleBuild();
              }}
            >
              <div>
                <label htmlFor="thread-url" className="field-label">
                  <XLogoIcon className="h-4 w-4" />
                  Paste <span className="font-mono">://</span>x.com Thread or Video URL
                </label>
                <div className="relative">
                  <span
                    className="pointer-events-none absolute inset-y-0 left-0 grid w-12 place-items-center text-slate-400 dark:text-slate-500"
                    aria-hidden="true"
                  >
                    <XLogoIcon className="h-4 w-4" />
                  </span>
                  <input
                    ref={urlRef}
                    id="thread-url"
                    type="url"
                    inputMode="url"
                    value={urlInput}
                    onChange={(event) => {
                      setUrlInput(event.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="https://x.com/username/status/1813945622077313059"
                    autoComplete="off"
                    spellCheck={false}
                    aria-invalid={Boolean(urlInput.trim()) && !source.valid}
                    aria-describedby="thread-url-help"
                    className="field pl-12"
                  />
                </div>
                <p id="thread-url-help" className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                  Supports <span className="font-mono">x.com</span>,{' '}
                  <span className="font-mono">twitter.com</span> and <span className="font-mono">/video/</span>{' '}
                  links. The creator handle is extracted instantly, no API call.
                </p>
              </div>

              <div>
                <label htmlFor="post-text" className="field-label">
                  <ListIcon className="h-4 w-4" />
                  Paste Post Text (Optional)
                  <span className="font-normal text-slate-500 dark:text-slate-400">— sharpens the modules</span>
                </label>
                <textarea
                  id="post-text"
                  value={postText}
                  onChange={(event) => setPostText(event.target.value)}
                  rows={7}
                  placeholder={'1/ Copy the thread text here…\n\n2/ One numbered post per line works best.\n\n3/ X-Courseify turns each line into a teachable point.'}
                  className="field resize-y leading-relaxed"
                />
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                  <span>{wordCount} words</span>
                  <span aria-hidden="true">•</span>
                  <span>Bullets, “1/” numbering and plain paragraphs are all understood.</span>
                </p>
              </div>

              {error ? (
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300"
                >
                  <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </p>
              ) : null}

              {needsKey ? (
                <p className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  <InfoIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    No {PROVIDER_LABELS[settings.provider]} key saved yet — the built-in engine will handle this
                    build.{' '}
                    <button
                      type="button"
                      onClick={() => setSettingsOpen(true)}
                      className="font-semibold text-blue-700 underline decoration-blue-400 underline-offset-2 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
                    >
                      Add a key
                    </button>
                    .
                  </span>
                </p>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <button type="submit" disabled={!canBuild} className="btn-primary w-full text-base sm:w-auto">
                  <SparkIcon className="h-5 w-5" />
                  {building ? 'Building…' : 'Build Course'}
                </button>
                <button type="button" onClick={handleUseExample} className="btn-ghost justify-center text-sm">
                  <ListIcon className="h-4 w-4" />
                  Try example thread
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="touch-target justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-600 transition-colors duration-300 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  <TrashIcon className="h-4 w-4" />
                  Reset
                </button>
              </div>
            </form>
          </section>

          {/* ------------------------------ sidebar ---------------------------- */}
          <aside className="space-y-6">
            <section className="surface p-5 transition-colors duration-300" aria-labelledby="tracker-heading">
              <h2 id="tracker-heading" className="flex items-center gap-2 text-base font-bold">
                <XLogoIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Source tracker
              </h2>

              <div className="mt-4">
                {urlInput.trim() ? (
                  <div className="space-y-3">
                    <SourceBadge source={source} compact />
                    {!source.valid && source.error ? (
                      <p className="flex items-start gap-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
                        <AlertIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {source.error}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Handle, post id and format were parsed locally. Course ids stay stable, so re-running the
                        same link overwrites instead of duplicating.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600 dark:border-slate-600 dark:text-slate-400">
                    Paste a link above and the creator is verified instantly — no sign-in, no API call.
                  </p>
                )}
              </div>
            </section>

            <section className="surface p-5 transition-colors duration-300" aria-labelledby="engine-heading">
              <h2 id="engine-heading" className="flex items-center gap-2 text-base font-bold">
                <GearIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Engine
              </h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-600 dark:text-slate-400">Provider</dt>
                  <dd className="font-semibold text-slate-900 dark:text-slate-100">
                    {PROVIDER_LABELS[settings.provider]}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-600 dark:text-slate-400">Model</dt>
                  <dd className="truncate font-mono text-xs text-slate-900 dark:text-slate-100">
                    {settings.model || DEFAULT_MODELS[settings.provider]}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-600 dark:text-slate-400">API key</dt>
                  <dd
                    className={`font-semibold ${
                      needsKey ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'
                    }`}
                  >
                    {settings.apiKey ? 'Stored locally' : 'Not set'}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-600 dark:text-slate-400">Storage</dt>
                  <dd className="font-semibold text-slate-900 dark:text-slate-100">
                    {settings.rememberKey ? 'localStorage' : 'sessionStorage'}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => setSettingsOpen(true)} className="btn-ghost text-sm">
                  <GearIcon className="h-4 w-4" />
                  Edit settings
                </button>
                {settings.apiKey ? (
                  <button
                    type="button"
                    onClick={handleClearKey}
                    className="touch-target gap-2 rounded-xl px-3 text-sm font-semibold text-red-600 transition-colors duration-300 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                  >
                    <TrashIcon className="h-4 w-4" />
                    Forget key
                  </button>
                ) : null}
              </div>

              <p className="mt-4 flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                Keys live in this browser only and are sent straight to the provider you choose.
              </p>
            </section>

            <section className="surface p-5 transition-colors duration-300" aria-labelledby="steps-heading">
              <h2 id="steps-heading" className="text-base font-bold">
                How a build runs
              </h2>
              <ol className="mt-4 space-y-3">
                {BUILD_STAGES.map((stageItem, index) => (
                  <li key={stageItem.label} className="flex gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      {index + 1}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {stageItem.label}
                      </span>
                      <span className="block text-xs text-slate-600 dark:text-slate-400">{stageItem.detail}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          </aside>
        </div>

        {/* ------------------------------ results ---------------------------- */}
        <div ref={resultRef} className="mt-10 scroll-mt-24">
          {building ? <CourseSkeleton activeStage={stage} /> : null}

          {!building && course ? <CourseResult course={course} checked={checked} onToggleTakeaway={toggleTakeaway} /> : null}

          {!building && !course ? (
            <section className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-8 text-center transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800/50">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-600/10 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300">
                <LayersIcon className="h-6 w-6" />
              </span>
              <h2 className="mt-4 text-lg font-bold">No curriculum yet</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-slate-700 dark:text-slate-300">
                Paste a thread link — or load the example — and hit <strong>Build Course</strong>. You will get
                three lesson chunks with summaries, takeaways and a progress checklist that persists.
              </p>
            </section>
          ) : null}
        </div>
      </main>

      {/* ------------------------------ footer ------------------------------- */}
      <footer className="border-t border-slate-200 bg-white/60 transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8 dark:text-slate-400">
          <p className="flex flex-wrap items-center gap-2">
            <SparkIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="font-semibold text-slate-900 dark:text-slate-100">X-Courseify</span>
            <span aria-hidden="true">•</span>
            <span>Client-side course builder for X.com threads and videos.</span>
          </p>
          <p className="flex flex-wrap items-center gap-2">
            <span>
              Theme: <strong className="text-slate-900 dark:text-slate-100">{isDark ? 'Dark' : 'Light'}</strong>
            </span>
            <span aria-hidden="true">•</span>
            <button
              type="button"
              onClick={toggleTheme}
              className="font-semibold text-blue-700 underline decoration-blue-400 underline-offset-2 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
            >
              Switch theme
            </button>
          </p>
        </div>
      </footer>

      <SettingsDialog
        open={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSaveSettings}
      />
    </div>
  );
}
