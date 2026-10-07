import { useState } from 'react';
import type { Course } from '../types';
import { PROVIDER_LABELS, courseToMarkdown, downloadMarkdown } from '../lib/engine';
import { LessonAccordion } from './LessonAccordion';
import { SourceBadge } from './SourceBadge';
import {
  AlertIcon,
  CheckIcon,
  ClockIcon,
  CopyIcon,
  DownloadIcon,
  InfoIcon,
  LayersIcon,
  ListIcon,
} from './icons';

interface CourseResultProps {
  course: Course;
  checked: Record<string, boolean>;
  onToggleTakeaway: (key: string) => void;
}

export function CourseResult({ course, checked, onToggleTakeaway }: CourseResultProps) {
  const [openChunks, setOpenChunks] = useState<string[]>(() => (course.chunks[0] ? [course.chunks[0].id] : []));
  const [copied, setCopied] = useState(false);

  const allOpen = openChunks.length === course.chunks.length;

  const toggleChunk = (id: string) => {
    setOpenChunks((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  };

  const copyMarkdown = async () => {
    const markdown = courseToMarkdown(course);
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  const totalTakeaways = course.chunks.reduce((total, chunk) => total + chunk.takeaways.length, 0);

  return (
    <section aria-label="Generated course" className="space-y-5">
      <header className="surface overflow-hidden p-5 transition-colors duration-300 sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <span className="pill border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300">
            <CheckIcon className="h-3.5 w-3.5" />
            Course ready
          </span>
          <span className="pill border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/40 dark:bg-blue-500/15 dark:text-blue-200">
            {course.level}
          </span>
          <span className="pill">
            <LayersIcon className="h-3.5 w-3.5" />
            {course.chunks.length} lesson chunks
          </span>
          <span className="pill">
            <ClockIcon className="h-3.5 w-3.5" />
            {course.minutes} min total
          </span>
          <span className="pill">
            <ListIcon className="h-3.5 w-3.5" />
            {totalTakeaways} takeaways
          </span>
        </div>

        <h2 className="mt-4 text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">{course.title}</h2>
        <p className="mt-2 max-w-3xl text-base text-slate-700 dark:text-slate-300">{course.subtitle}</p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SourceBadge source={course.source} />

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setOpenChunks(allOpen ? [] : course.chunks.map((chunk) => chunk.id))}
              className="btn-ghost text-sm"
            >
              <LayersIcon className="h-4 w-4" />
              {allOpen ? 'Collapse all' : 'Expand all'}
            </button>
            <button type="button" onClick={() => downloadMarkdown(course)} className="btn-ghost text-sm">
              <DownloadIcon className="h-4 w-4" />
              .md
            </button>
            <button type="button" onClick={copyMarkdown} className="btn-primary text-sm">
              {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
          <span className="inline-flex items-center gap-1 font-semibold">
            <InfoIcon className="h-3.5 w-3.5" />
            Engine: {PROVIDER_LABELS[course.engine]}
          </span>
          <span aria-hidden="true">•</span>
          <span>
            Generated{' '}
            {new Date(course.createdAt).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </span>
        </p>

        {course.notice ? (
          <p
            role="status"
            className="mt-4 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100"
          >
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            {course.notice}
          </p>
        ) : null}
      </header>

      <div className="space-y-3">
        {course.chunks.map((chunk, index) => (
          <LessonAccordion
            key={chunk.id}
            chunk={chunk}
            index={index}
            open={openChunks.includes(chunk.id)}
            onToggle={() => toggleChunk(chunk.id)}
            checked={checked}
            onToggleTakeaway={onToggleTakeaway}
          />
        ))}
      </div>
    </section>
  );
}
