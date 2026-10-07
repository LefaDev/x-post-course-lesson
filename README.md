# X-Courseify

A micro-SaaS front-end that turns a single **X.com (Twitter) thread or video** into a
structured, three-module mini-course — with a seamless dark/light theme toggle.

Built with Vite + React 19 + TypeScript + Tailwind CSS v4. No backend, no sign-up,
no key required to get a result.

---

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production bundle into dist/
npm run preview  # serve the production bundle
```

## What it does

| Step | Behaviour |
| --- | --- |
| **1. Paste a link** | `Paste ://x.com Thread or Video URL` — `x.com`, `twitter.com`, `mobile.*` and `/video/` links are all understood. |
| **2. Optional context** | `Paste Post Text (Optional)` — numbered posts, bullets and plain paragraphs are parsed into atomic points. |
| **3. Source tracker** | The URL is parsed client-side: creator handle, post id and format are extracted and shown in a **Source Verified** badge that links back to the original post. No API call. |
| **4. Build Course** | A pulsing skeleton shows four real build stages while the curriculum is generated. |
| **5. Curriculum** | Three expandable **Lesson Chunks** (Module 1–3), each with a title, a **3-sentence summary**, and a **key takeaway checklist** that persists per module. |

Extras: markdown copy/export, "Expand all", per-takeaway progress bars, example thread,
and a sticky header that restores your last course on reload.

## The engines

X-Courseify ships with two ways to build a curriculum:

1. **Built-in engine (default, no key).** A deterministic, fully offline curriculum
   builder in [`src/lib/lessonPlan.ts`](src/lib/lessonPlan.ts). It extracts points,
   balances them across three modules, derives topic tags, writes the three-sentence
   summaries and converts source lines into checkable takeaways. Zero network, zero limits.
2. **Bring your own key.** Add an OpenAI or Gemini key via the settings gear and the
   build is routed to `api.openai.com` (JSON mode) or
   `generativelanguage.googleapis.com`. Responses are validated and normalised — if the
   provider fails, the local engine silently takes over and the UI explains why in a
   non-blocking notice.

### API key handling

- The key is stored **in your browser only** — `localStorage` when "Remember key on this
  device" is on, `sessionStorage` (tab-scoped) when it is off. There is no server to leak it to.
- When a build runs, the key is sent directly to the provider you picked for that request.
- "Clear key" / "Forget key" remove it from both storages.
- The key field is a masked password input with a reveal toggle, and it is never logged.

## Specification notes

- **Theme toggle** lives in the top-right corner, toggles the `dark` class on the
  `<html>` document root, persists to `localStorage` (`x-courseify:theme`) and is
  rehydrated before first paint by an inline bootstrap script, so there is no flash.
  Until the user makes an explicit choice, the OS `prefers-color-scheme` is followed.
- **Styling contract** — page `bg-slate-50` / `dark:bg-slate-900`, cards `bg-white` +
  `border-slate-200` / `dark:bg-slate-800` + `dark:border-slate-700`, titles
  `text-slate-900` / `dark:text-slate-100`, body `text-slate-700` / `dark:text-slate-300`,
  primary buttons `bg-blue-600` with white text. The main wrapper carries
  `transition-colors duration-300` so theme changes animate.
- **Typography** — Inter Variable, 16px body copy at a 1.5 line height, bold headings.
- **Touch targets** — the build button, theme toggle, gear, accordion tabs and icon
  buttons are all at least 44×44px (`.touch-target` / `min-h-11`).
- **Focus** — visible blue focus rings: `ring-2 ring-blue-600` in light mode,
  `ring-2 ring-blue-400` in dark mode; inputs switch their ring to blue on focus.
- **Icons** — hand-written inline SVGs only (sun/moon, chevrons, checkmarks, gear, …).
  No emoji anywhere in the UI.
- **Contrast** — every text/background pair in the theme clears WCAG AA (≥ 4.5:1);
  the lowest measured pair is 4.77:1 (danger text in light mode).
- **Accessibility** — semantic landmarks, `aria-expanded` accordion tabs,
  `aria-live` build status, focus-trapped modal with Escape-to-close, a skip link,
  labelled controls, and `prefers-reduced-motion` support.

## Project structure

```
index.html               # shell + no-flash theme bootstrap
src/
  App.tsx                # layout, state, build orchestration
  main.tsx               # React entry
  index.css              # Tailwind v4 theme, component classes, animations
  types.ts               # shared domain types
  hooks/useTheme.ts      # dark/light state + localStorage persistence
  lib/
    xUrl.ts              # client-side X.com URL parser (handle, post id, format)
    lessonPlan.ts        # offline curriculum builder (points → 3 modules)
    engine.ts            # build pipeline, OpenAI/Gemini calls, markdown export
    storage.ts           # guarded localStorage/sessionStorage helpers
    example.ts           # sample thread used by "Try example thread"
  components/
    ThemeToggle.tsx      # sun/moon toggle (top-right)
    SettingsDialog.tsx   # API key + provider settings modal
    SourceBadge.tsx      # "Source Verified" badge
    CourseSkeleton.tsx   # pulsing loading state
    LessonAccordion.tsx  # expandable lesson chunk
    CourseResult.tsx     # course header, export actions, chunk list
    icons.tsx            # inline SVG icon set
```

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server (binds `0.0.0.0`, allows proxied hosts) |
| `npm run build` | `tsc --noEmit` then a production build |
| `npm run preview` | Preview the production bundle |
| `npm run typecheck` | Types only |

## Roadmap ideas

- Server-side X API ingestion (transcripts for video posts, replies for threads).
- Anchored citations from each takeaway back to the source post.
- Spaced-repetition scheduling and per-module quizzes.
- Shareable course links.

## License

MIT
