import { ArrowUpRightIcon, ListIcon, ShieldCheckIcon, XLogoIcon } from './icons';
import { kindLabel } from '../lib/xUrl';
import type { SourceInfo } from '../types';

interface SourceBadgeProps {
  source: SourceInfo;
  compact?: boolean;
}

/**
 * "Source Verified" badge — rendered from the client-side URL parse, linking back
 * to the original post on X.
 */
export function SourceBadge({ source, compact = false }: SourceBadgeProps) {
  if (!source.handle) return null;

  const href = source.canonicalUrl ?? `https://x.com/${source.handle}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className={`group inline-flex items-center gap-3 rounded-xl border px-3 py-2 transition-colors duration-300 ${
        source.valid
          ? 'border-emerald-300 bg-emerald-50 hover:border-emerald-400 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:hover:border-emerald-400'
          : 'border-amber-300 bg-amber-50 hover:border-amber-400 dark:border-amber-500/40 dark:bg-amber-500/10 dark:hover:border-amber-400'
      } ${compact ? '' : 'sm:px-4'}`}
      aria-label={`Open the original post by @${source.handle} on X`}
    >
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold text-white ${
          source.valid ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-amber-600 dark:bg-amber-500'
        }`}
        aria-hidden="true"
      >
        {source.avatarInitials ?? source.handle.slice(0, 2).toUpperCase()}
      </span>

      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
            @{source.handle}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase ${
              source.valid
                ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                : 'bg-amber-600 text-white dark:bg-amber-500'
            }`}
          >
            <ShieldCheckIcon className="h-3.5 w-3.5" />
            {source.valid ? 'Source Verified' : 'Needs a full post URL'}
          </span>
        </span>

        <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-600 dark:text-slate-300">
          <span className="inline-flex items-center gap-1">
            <ListIcon className="h-3.5 w-3.5" />
            {kindLabel(source.kind)}
          </span>
          {source.postId ? (
            <span className="inline-flex items-center gap-1 font-mono text-[11px] opacity-80">
              <XLogoIcon className="h-3 w-3" />
              {source.postId}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1 font-semibold opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
            Open on X
            <ArrowUpRightIcon className="h-3.5 w-3.5" />
          </span>
        </span>
      </span>
    </a>
  );
}
