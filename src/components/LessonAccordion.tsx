import { useId } from 'react';
import type { LessonChunk } from '../types';
import { CheckIcon, ChevronDownIcon, ClockIcon } from './icons';

interface LessonAccordionProps {
  chunk: LessonChunk;
  index: number;
  open: boolean;
  onToggle: () => void;
  checked: Record<string, boolean>;
  onToggleTakeaway: (key: string) => void;
}

function takeawayKey(chunkId: string, position: number): string {
  return `${chunkId}::${position}`;
}

export function LessonAccordion({
  chunk,
  index,
  open,
  onToggle,
  checked,
  onToggleTakeaway,
}: LessonAccordionProps) {
  const panelId = useId();
  const buttonId = useId();
  const done = chunk.takeaways.filter((_, position) => checked[takeawayKey(chunk.id, position)]).length;
  const total = chunk.takeaways.length;
  const progress = total ? Math.round((done / total) * 100) : 0;

  return (
    <div
      className={`overflow-hidden rounded-2xl border transition-colors duration-300 ${
        open
          ? 'border-blue-600 dark:border-blue-400'
          : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
      } bg-white dark:bg-slate-800`}
    >
      {/* Accordion tab — min-h-11 guarantees a 44px touch target. */}
      <h3>
        <button
          id={buttonId}
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-300 hover:bg-slate-50 sm:px-5 dark:hover:bg-slate-700/40"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-600 text-sm font-bold text-white dark:bg-blue-500">
            {String(index + 1).padStart(2, '0')}
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="pill border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/40 dark:bg-blue-500/15 dark:text-blue-200">
                {chunk.moduleLabel}
              </span>
              <span className="pill">
                <ClockIcon className="h-3.5 w-3.5" />
                {chunk.minutes} min
              </span>
              {total ? (
                <span className="pill">
                  {done}/{total} done
                </span>
              ) : null}
            </span>
            <span className="mt-1.5 block text-base font-bold text-slate-900 sm:text-[17px] dark:text-slate-100">
              {chunk.title}
            </span>
          </span>

          <span
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-600 transition-all duration-300 dark:border-slate-700 dark:text-slate-300 ${
              open ? 'rotate-180 border-blue-600 text-blue-700 dark:border-blue-400 dark:text-blue-300' : ''
            }`}
            aria-hidden="true"
          >
            <ChevronDownIcon className="h-5 w-5" />
          </span>
        </button>
      </h3>

      {total ? (
        <div className="h-1 w-full bg-slate-100 dark:bg-slate-900" aria-hidden="true">
          <div
            className="h-full rounded-r-full bg-emerald-600 transition-[width] duration-300 dark:bg-emerald-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}

      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className="accordion-panel"
        data-open={open}
      >
        <div className="accordion-panel-inner">
          <div className="border-t border-slate-200 px-4 py-5 sm:px-5 dark:border-slate-700">
            <p className="text-base leading-relaxed text-slate-700 dark:text-slate-300">{chunk.summary}</p>

            <h4 className="mt-6 flex items-center gap-2 text-sm font-bold tracking-wide text-slate-900 uppercase dark:text-slate-100">
              <CheckIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Key takeaways
            </h4>

            <ul className="mt-3 grid gap-2">
              {chunk.takeaways.map((takeaway, position) => {
                const key = takeawayKey(chunk.id, position);
                const isChecked = Boolean(checked[key]);
                return (
                  <li key={key}>
                    <label
                      className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors duration-300 ${
                        isChecked
                          ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onToggleTakeaway(key)}
                        className="peer sr-only"
                      />
                      <span
                        aria-hidden="true"
                        className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border transition-colors duration-300 ${
                          isChecked
                            ? 'border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500'
                            : 'border-slate-300 bg-white text-transparent peer-focus-visible:ring-2 peer-focus-visible:ring-blue-600 dark:border-slate-600 dark:bg-slate-800'
                        }`}
                      >
                        <CheckIcon className="h-4 w-4" />
                      </span>
                      <span
                        className={`text-base ${
                          isChecked
                            ? 'text-slate-600 line-through decoration-slate-400 dark:text-slate-400'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {takeaway}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
