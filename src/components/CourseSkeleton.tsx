import { BUILD_STAGES } from '../lib/engine';
import { CheckIcon, SpinnerIcon } from './icons';

interface CourseSkeletonProps {
  /** Index of the stage currently running. */
  activeStage: number;
}

/** Pulsing loading state shown while the Course Breakdown Engine runs. */
export function CourseSkeleton({ activeStage }: CourseSkeletonProps) {
  return (
    <section
      aria-live="polite"
      aria-busy="true"
      aria-label="Building your course"
      className="surface animate-pulse p-5 transition-colors duration-300 sm:p-7"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-600/90 text-white">
          <SpinnerIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-bold">Building your course…</h2>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {BUILD_STAGES[activeStage]?.detail ?? 'Wrapping up the curriculum…'}
          </p>
        </div>
      </div>

      <ol className="mt-5 grid gap-2 sm:grid-cols-2">
        {BUILD_STAGES.map((stage, index) => {
          const done = index < activeStage;
          const running = index === activeStage;
          return (
            <li
              key={stage.label}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-sm transition-colors duration-300 ${
                running
                  ? 'border-blue-600 bg-blue-50 text-blue-800 dark:border-blue-400 dark:bg-blue-500/15 dark:text-blue-100'
                  : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
              }`}
            >
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                  done
                    ? 'border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500'
                    : running
                      ? 'border-blue-600 text-blue-700 dark:border-blue-400 dark:text-blue-200'
                      : 'border-slate-300 text-transparent dark:border-slate-600'
                }`}
              >
                {done ? <CheckIcon className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
              </span>
              <span className="truncate font-semibold">{stage.label}</span>
            </li>
          );
        })}
      </ol>

      <div className="mt-7 space-y-6">
        <div className="space-y-3">
          <div className="skeleton h-4 w-32" />
          <div className="skeleton h-7 w-3/4 max-w-lg" />
          <div className="skeleton h-4 w-full max-w-2xl" />
          <div className="skeleton h-4 w-5/6 max-w-xl" />
        </div>

        {[0, 1, 2].map((index) => (
          <div key={index} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="skeleton h-8 w-24 rounded-full" />
              <div className="skeleton h-5 flex-1 max-w-sm" />
            </div>
            <div className="mt-4 space-y-2">
              <div className="skeleton h-3.5 w-full" />
              <div className="skeleton h-3.5 w-11/12" />
              <div className="skeleton h-3.5 w-9/12" />
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {[0, 1, 2, 3].map((row) => (
                <div key={row} className="flex items-center gap-2">
                  <div className="skeleton h-4 w-4 rounded" />
                  <div className="skeleton h-3.5 flex-1" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
