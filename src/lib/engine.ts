import type { BuildInput, BuildStage, Course, EngineId, LessonChunk } from '../types';
import { courseIdFor } from './xUrl';
import {
  asSentenceFragment,
  buildLocalChunks,
  clamp,
  courseTitleFor,
  levelFor,
  threeSentences,
} from './lessonPlan';

export const BUILD_STAGES: BuildStage[] = [
  { label: 'Reading the source', detail: 'Parsing the X.com URL and resolving the creator handle…' },
  { label: 'Extracting key claims', detail: 'Splitting the post copy into atomic, teachable points…' },
  { label: 'Clustering lesson chunks', detail: 'Grouping points into Module 1, Module 2 and Module 3…' },
  { label: 'Writing summaries & takeaways', detail: 'Condensing every chunk into three sentences…' },
];

export const DEFAULT_MODELS: Record<EngineId, string> = {
  local: 'x-courseify-local-engine',
  openai: 'gpt-4o-mini',
  gemini: 'gemini-2.0-flash',
};

export const PROVIDER_LABELS: Record<EngineId, string> = {
  local: 'Built-in engine',
  openai: 'OpenAI',
  gemini: 'Google Gemini',
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function finaliseChunks(chunks: LessonChunk[]): LessonChunk[] {
  return chunks.slice(0, 3).map((chunk, index) => ({
    id: chunk.id || `module-${index + 1}`,
    moduleLabel: chunk.moduleLabel || `Module ${index + 1}`,
    title: clamp(chunk.title || `Lesson chunk ${index + 1}`, 90),
    summary: chunk.summary,
    takeaways: chunk.takeaways.length ? chunk.takeaways.slice(0, 5) : [`Restate the core idea of ${chunk.title} in one sentence.`],
    minutes: Number.isFinite(chunk.minutes) ? Math.min(Math.max(Math.round(chunk.minutes), 3), 45) : 10 + index,
  }));
}

function localCourse(input: BuildInput, notice: string | null, engine: EngineId): Course {
  const chunks = buildLocalChunks(input.source, input.postText);
  const { title, subtitle } = courseTitleFor(input.source, input.postText);
  return {
    id: courseIdFor(input.source),
    title: clamp(title, 96),
    subtitle,
    level: levelFor(input.postText, chunks),
    minutes: chunks.reduce((total, chunk) => total + chunk.minutes, 0),
    createdAt: Date.now(),
    source: input.source,
    chunks: finaliseChunks(chunks),
    engine,
    notice,
  };
}

/* -------------------------------------------------------------------------- */
/* Remote providers (bring-your-own-key)                                      */
/* -------------------------------------------------------------------------- */

interface RemoteChunk {
  moduleLabel?: string;
  title?: string;
  summary?: string;
  takeaways?: string[];
  minutes?: number;
}

interface RemoteCourse {
  title?: string;
  subtitle?: string;
  level?: string;
  chunks?: RemoteChunk[];
}

function buildPrompt(input: BuildInput): string {
  const { source, postText } = input;
  const body = postText.trim() || '(No post text was supplied — infer the curriculum from the URL and state your assumptions in the summaries.)';
  return [
    'You are a curriculum designer. Turn the following X.com post into a three-chunk mini-course.',
    `Source URL: ${source.canonicalUrl ?? 'unknown'}`,
    `Creator: ${source.handle ? `@${source.handle}` : 'unknown'}`,
    `Format: ${source.kind}`,
    '',
    'Post content:',
    '"""',
    body.slice(0, 12_000),
    '"""',
    '',
    'Return only JSON matching this shape:',
    '{"title": string (max 70 chars), "subtitle": string, "level": "Starter"|"Intermediate"|"Advanced",',
    ' "chunks": [{"moduleLabel": "Module 1", "title": string, "summary": string with EXACTLY three sentences,',
    ' "takeaways": string[] (3-4 imperative checklist items), "minutes": number}]}',
    'Provide exactly three chunks labelled "Module 1", "Module 2", "Module 3".',
    'Never use emojis. Never invent statistics that are not in the post.',
  ].join('\n');
}

function parseJSONLoose(raw: string): RemoteCourse {
  const text = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Provider did not return JSON.');
  return JSON.parse(text.slice(start, end + 1)) as RemoteCourse;
}

function sentenceCount(text: string): number {
  const matches = text.trim().match(/[^.!?]+[.!?]+(\s|$)/g);
  return matches ? matches.length : text.trim() ? 1 : 0;
}

function normaliseRemote(remote: RemoteCourse, input: BuildInput, engine: EngineId): Course {
  const fallback = buildLocalChunks(input.source, input.postText);
  const incoming = Array.isArray(remote.chunks) ? remote.chunks : [];

  const chunks: LessonChunk[] = [0, 1, 2].map((index) => {
    const draft = incoming[index] ?? {};
    const base = fallback[index];
    const summaryRaw = (draft.summary ?? '').toString().trim();
    const summary =
      sentenceCount(summaryRaw) === 3
        ? summaryRaw
        : threeSentences(
            summaryRaw
              .split(/(?<=[.!?])\s+/)
              .map((sentence) => asSentenceFragment(sentence))
              .concat(base.summary.split(/(?<=[.!?])\s+/).map(asSentenceFragment)),
          );

    const rawTakeaways = (Array.isArray(draft.takeaways) ? draft.takeaways : [])
      .map((item) => clamp(String(item), 120).replace(/[.\s]+$/, ''))
      .filter((item) => item.length > 8)
      .map((item) => `${item}.`);

    return {
      id: base.id,
      moduleLabel: `Module ${index + 1}`,
      title: (draft.title ?? base.title).toString(),
      summary,
      takeaways: rawTakeaways.length >= 3 ? rawTakeaways.slice(0, 4) : base.takeaways,
      minutes: typeof draft.minutes === 'number' ? draft.minutes : base.minutes,
    };
  });

  const level =
    remote.level === 'Starter' || remote.level === 'Intermediate' || remote.level === 'Advanced'
      ? remote.level
      : levelFor(input.postText, chunks);

  const localTitles = courseTitleFor(input.source, input.postText);

  return {
    id: courseIdFor(input.source),
    title: clamp((remote.title ?? localTitles.title).toString(), 96),
    subtitle: clamp((remote.subtitle ?? localTitles.subtitle).toString(), 220),
    level,
    minutes: chunks.reduce((total, chunk) => total + chunk.minutes, 0),
    createdAt: Date.now(),
    source: input.source,
    chunks: finaliseChunks(chunks),
    engine,
    notice: null,
  };
}

async function fetchWithTimeout(url: string, init: RequestInit, ms = 45_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function callOpenAI(input: BuildInput): Promise<RemoteCourse> {
  const model = input.settings.model || DEFAULT_MODELS.openai;
  const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${input.settings.apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You design tight, practical mini-courses and reply with JSON only.' },
        { role: 'user', content: buildPrompt(input) },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`OpenAI ${response.status}: ${detail.slice(0, 180) || response.statusText}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI returned an empty completion.');
  return parseJSONLoose(content);
}

async function callGemini(input: BuildInput): Promise<RemoteCourse> {
  const model = input.settings.model || DEFAULT_MODELS.gemini;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent`;

  const response = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': input.settings.apiKey,
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: 'You design tight, practical mini-courses and reply with JSON only.' }],
      },
      contents: [{ role: 'user', parts: [{ text: buildPrompt(input) }] }],
      generationConfig: { temperature: 0.4, responseMimeType: 'application/json' },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Gemini ${response.status}: ${detail.slice(0, 180) || response.statusText}`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const content = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('');
  if (!content) throw new Error('Gemini returned an empty completion.');
  return parseJSONLoose(content);
}

/* -------------------------------------------------------------------------- */
/* Orchestration                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Runs the course pipeline, emitting progress stages for the skeleton UI.
 * Remote providers are optional: any failure degrades to the built-in engine
 * with a transparent notice instead of a dead end.
 */
export async function buildCourse(
  input: BuildInput,
  onStage: (index: number, stage: BuildStage) => void,
): Promise<Course> {
  const wantsRemote = input.settings.provider !== 'local';
  const useRemote = wantsRemote && input.settings.apiKey.trim().length > 8;

  const work: Promise<{ course: Course | null; error: string | null }> = !useRemote
    ? Promise.resolve({ course: null, error: null })
    : (async () => {
        try {
          const provider = input.settings.provider;
          const remote = provider === 'openai' ? await callOpenAI(input) : await callGemini(input);
          return { course: normaliseRemote(remote, input, provider), error: null };
        } catch (error) {
          return {
            course: null,
            error: error instanceof Error ? error.message : 'Unknown provider error',
          };
        }
      })();

  // Minimum per-stage dwell time keeps the pulsing skeleton meaningful (and hides
  // provider latency) instead of flashing for one frame.
  for (let index = 0; index < BUILD_STAGES.length; index += 1) {
    onStage(index, BUILD_STAGES[index]);
    await delay(index === 0 ? 420 : 520);
  }

  const remote = await work;

  if (!remote.course) {
    const label = PROVIDER_LABELS[input.settings.provider];
    const notice = remote.error
      ? `Falling back to the built-in engine — ${label} said: ${clamp(remote.error, 200)}`
      : wantsRemote
        ? `No ${label} API key found, so the built-in engine handled this build. Add a key in settings to route through ${label}.`
        : null;
    return localCourse(input, notice, 'local');
  }

  return remote.course;
}

/** Markdown export so learners can keep the course outside the browser. */
export function courseToMarkdown(course: Course): string {
  const lines: string[] = [
    `# ${course.title}`,
    '',
    `> ${course.subtitle}`,
    '',
    `- **Source:** ${course.source.canonicalUrl ?? 'n/a'}`,
    `- **Creator:** ${course.source.handle ? `@${course.source.handle}` : 'unknown'}`,
    `- **Level:** ${course.level}`,
    `- **Modules:** ${course.chunks.length}`,
    `- **Estimated time:** ${course.minutes} minutes`,
    `- **Engine:** ${PROVIDER_LABELS[course.engine]}`,
    '',
  ];

  for (const chunk of course.chunks) {
    lines.push(`## ${chunk.moduleLabel} — ${chunk.title}`, '', chunk.summary, '', '**Key takeaways**', '');
    for (const takeaway of chunk.takeaways) lines.push(`- [ ] ${takeaway}`);
    lines.push('');
  }

  lines.push('---', '', 'Generated with X-Courseify.');
  return lines.join('\n');
}

export function downloadMarkdown(course: Course): void {
  const blob = new Blob([courseToMarkdown(course)], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${course.id || 'x-courseify'}.md`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
