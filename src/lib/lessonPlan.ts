import type { LessonChunk, SourceInfo } from '../types';

/* -------------------------------------------------------------------------- */
/* Text utilities                                                             */
/* -------------------------------------------------------------------------- */

const STOPWORDS = new Set(
  `a about above after again against all am an and any are aren't as at be because been before being below
  between both but by can cannot could couldn't did didn't do does doesn't doing don't down during each few for
  from further had hadn't has hasn't have haven't having he her here hers herself him himself his how i if in
  into is isn't it its itself just let's me more most mustn't my myself no nor not of off on once only or other
  ought our ours ourselves out over own same shan't she should shouldn't so some such than that the their theirs
  them themselves then there these they this those through to too under until up very was wasn't we were weren't
  what when where which while who whom why with won't would wouldn't you your yours yourself yourselves also
  really actually basically simply get got make makes made going go want need like one two three four five
  tweet post posts people thing things way ways lot new using use used via read reads`
    .split(/\s+/)
    .filter(Boolean),
);

/** Boilerplate that X injects into copied post text. */
const X_NOISE: Array<[RegExp, string]> = [
  [/https?:\/\/t\.co\/\w+/gi, ' '],
  [/https?:\/\/(?:x|twitter)\.com\/\w+\/status\/\d+(?:\?\S*)?/gi, ' '],
  [/^\s*(?:thread|🧵)\s*:?\s*$/gim, ''],
  [/\bshow this thread\b/gi, ' '],
  [/\bshow more\b/gi, ' '],
  [/\b\d{1,2}\s*\/\s*\d{1,2}\b(?=\s)/g, ' '],
];

export function tidy(raw: string): string {
  let text = raw.replace(/\r\n?/g, '\n');
  for (const [pattern, replacement] of X_NOISE) text = text.replace(pattern, replacement);
  text = text
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2B00}-\u{2BFF}]/gu, ' ')
    .replace(/[ \t]{2,}/g, ' ');
  return text.trim();
}

function capitalise(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function stripLeadingNumbering(line: string): string {
  return line
    .replace(/^\s*(?:\(\d{1,2}\)|\d{1,2}\s*[.)\]:/-]|\d{1,2}\s*\/)\s*/, '')
    .replace(/^\s*[-–—*•▪◦>]+\s*/, '')
    .trim();
}

/** First sentence of a fragment, punctuation included. */
function firstSentence(text: string): string {
  const clean = text.trim().replace(/\s+/g, ' ');
  const match = clean.match(/^.*?[.!?](?=\s|$)/);
  return (match ? match[0] : clean).trim();
}

/** Hard character cap used for meta descriptions. */
export function clamp(text: string, max: number): string {
  const clean = text.trim().replace(/\s+/g, ' ');
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.5 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\s]+$/, '')}…`;
}

/**
 * Trims copy at a natural clause or word boundary. Unlike `clamp` it never adds an
 * ellipsis, so the result can be reused inside a larger sentence.
 */
function trimAtClause(text: string, max: number): string {
  const clean = text.trim().replace(/\s+/g, ' ');
  if (clean.length <= max) return clean;

  const window = clean.slice(0, max);
  const breaks = [' — ', ' – ', '; ', ': ', ', ', ' and ', ' or ', ' that ', ' which ', ' so ', ' but '];
  let best = -1;
  for (const marker of breaks) {
    const at = window.lastIndexOf(marker);
    if (at > best) best = at;
  }
  const fallback = window.lastIndexOf(' ');
  const index = best > max * 0.45 ? best : fallback;
  return clean.slice(0, index > 0 ? index : max).replace(/[\s,;:.—–-]+$/, '');
}

/** Lowercases the opening word so a fragment can follow a colon inside a sentence. */
export function asSentenceFragment(text: string): string {
  const clean = trimAtClause(firstSentence(text), 150).replace(/[.!?]+$/, '').trim();
  if (!clean) return clean;
  return clean.charAt(0).toLowerCase() + clean.slice(1);
}

export function sentences(text: string): string[] {
  return tidy(text)
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.split(/\s+/).length >= 4);
}

/**
 * Break a pasted thread into atomic "points": numbered lines, bullets, and — for
 * dense paragraphs — individual sentences.
 */
export function extractPoints(text: string): string[] {
  const cleaned = tidy(text);
  if (!cleaned) return [];

  const points: string[] = [];
  for (const rawLine of cleaned.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    const hadMarker = /^\s*(?:\(\d{1,2}\)|\d{1,2}\s*[.)\]:/-]|[•▪◦*\-–—>])/.test(line);
    const body = stripLeadingNumbering(line);
    if (!body) continue;

    const wordCount = body.split(/\s+/).length;
    if (hadMarker || wordCount <= 26) {
      points.push(body);
    } else {
      const parts = body
        .split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])/)
        .map((part) => part.trim())
        .filter(Boolean);
      points.push(...(parts.length > 1 ? parts : [body]));
    }
  }

  // De-duplicate near-identical points while preserving order.
  const seen = new Set<string>();
  return points.filter((point) => {
    const key = point.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 48);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return point.split(/\s+/).length >= 3;
  });
}

export function keywords(text: string, limit = 6): string[] {
  const counts = new Map<string, number>();
  for (const token of tidy(text).toLowerCase().match(/[a-z][a-z'-]{2,}/g) ?? []) {
    const dePossessed = token.replace(/'s$/, '');
    // Crude singularisation: "metrics" -> "metric", but never "business" -> "busines".
    const word =
      dePossessed.length > 4 &&
      dePossessed.endsWith('s') &&
      !/(?:ss|us|is|as|os)$/.test(dePossessed)
        ? dePossessed.slice(0, -1)
        : dePossessed;
    if (word.length < 4 || STOPWORDS.has(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, limit)
    .map(([word]) => word);
}

/** Words that describe the course scaffolding rather than the subject matter. */
const TAG_STOPWORDS = new Set([
  'module',
  'lesson',
  'course',
  'chunk',
  'source',
  'point',
  'part',
  'step',
  'section',
  'slide',
]);

/** "Promise & Deliverable" — a short, human-readable topic tag for a bucket of points. */
function topicTag(source: string, fallback: string): string {
  const found = keywords(source, 8)
    .filter((word) => !TAG_STOPWORDS.has(word))
    .slice(0, 2)
    .map(capitalise);
  if (found.length >= 2) return `${found[0]} & ${found[1]}`;
  return found[0] ?? fallback;
}

/** A lesson title built from the strongest line in the bucket. */
function titleFromPoint(point: string, fallback: string): string {
  const candidate = trimAtClause(firstSentence(stripLeadingNumbering(point)), 62)
    .replace(/^["'“”]|["'“”]$/g, '')
    .replace(/[.:;,!?]+$/, '')
    .trim();
  const words = candidate.split(/\s+/).filter(Boolean);
  // A lesson title needs enough shape to stand alone; otherwise the tagged
  // "{Framing} of {topic}" fallback reads better than a clipped sentence.
  if (words.length < 5 || words.length > 11 || candidate.length < 22) return fallback;
  return capitalise(candidate);
}

/** Turns a source point into one tight, checkable takeaway. */
function takeawayFrom(point: string): string {
  const base = firstSentence(stripLeadingNumbering(point));
  const imperative = base
    .replace(/^(?:i|we|you)\s+(?:should|must|need to|have to|can|will|may)\s+/i, '')
    .replace(/^(?:so|and|but|because|then|also)\s+/i, '')
    .replace(/^(?:the|this|it)\s+(?:is|was|are|were)\s+/i, '')
    .trim();
  const body = trimAtClause(imperative, 112).replace(/[.:;,!?]+$/, '');
  if (!body) return '';
  return `${capitalise(body)}.`;
}

function fallbackTakeaways(topic: string, moduleIndex: number): string[] {
  const bank = [
    [
      `Write a one-line definition of ${topic} in your own words.`,
      'List the three claims you would need to verify before repeating them.',
      'Note the term you had to re-read, then look up its precise meaning.',
    ],
    [
      `Pick the single idea from ${topic} you can test within 48 hours.`,
      'Define the first measurable signal that tells you it is working.',
      'Set a stop condition, so a failed experiment stays cheap.',
    ],
    [
      'Turn your experiment into a weekly routine with a fixed slot.',
      `Track one metric for ${topic} and review it every Friday.`,
      'Document the process so someone else could run it without you.',
    ],
  ];
  return bank[moduleIndex] ?? bank[0];
}

/* -------------------------------------------------------------------------- */
/* Curriculum construction                                                    */
/* -------------------------------------------------------------------------- */

const STAGE_META = [
  {
    label: 'Module 1',
    framing: 'Foundations',
    minutes: 9,
    action: 'explain the main idea to someone else in under a minute',
    why: 'Everything later in the course leans on this vocabulary, so it is worth reading twice.',
  },
  {
    label: 'Module 2',
    framing: 'Application',
    minutes: 12,
    action: 'run one small, reversible experiment this week',
    why: 'This is where the idea stops being theory and starts costing you a real experiment.',
  },
  {
    label: 'Module 3',
    framing: 'Systems & Scale',
    minutes: 11,
    action: 'turn the experiment into a repeatable routine',
    why: 'The returns here compound, which means sloppy systems quietly erase the earlier work.',
  },
] as const;

function chunkId(label: string, title: string): string {
  return `${label}-${title}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Guarantees the contractual "exactly three sentences" summary. */
export function threeSentences(candidates: string[]): string {
  const pool = candidates
    .map((sentence) => sentence.trim().replace(/\s+/g, ' '))
    .filter((sentence) => sentence.length > 12)
    .map((sentence) => `${sentence.replace(/[.\s]+$/, '')}.`);

  while (pool.length < 3) {
    pool.push('Treat the gaps as open questions to resolve with your own data.');
  }
  return pool.slice(0, 3).join(' ');
}

/**
 * Deterministic offline curriculum builder. It turns a thread's raw points into three
 * lesson chunks — no API key, no network, no rate limits — so the product is always usable.
 */
export function buildLocalChunks(source: SourceInfo, postText: string): LessonChunk[] {
  const points = extractPoints(postText);
  const media = source.kind === 'video' ? 'video' : 'thread';
  const author = source.handle ? `@${source.handle}` : 'the author';
  const byline = source.handle ? `${author}'s ${media}` : `the original ${media}`;
  // Balance the thread across the three chunks (10 points -> 4 / 3 / 3), keeping order.
  const baseSize = Math.floor(points.length / 3);
  const remainder = points.length % 3;
  const sizes = [0, 1, 2].map((index) => baseSize + (index < remainder ? 1 : 0));
  const offsets = sizes.map((_, index) =>
    sizes.slice(0, index).reduce((total, size) => total + size, 0),
  );
  const globalTopic = points.length ? topicTag(points.slice(0, 6).join(' '), 'The Core Idea') : null;

  return STAGE_META.map((stage, index) => {
    // Spread the thread's points across the three chunks, always keeping order.
    const start = Math.min(offsets[index], Math.max(points.length - 1, 0));
    const bucket = points.slice(start, start + Math.max(sizes[index], 1));
    const tag = bucket.length ? topicTag(bucket.join(' '), globalTopic ?? 'The Core Idea') : globalTopic;

    const title = bucket.length
      ? titleFromPoint(bucket[0], `${stage.framing} of ${tag ?? 'the idea'}`)
      : `${stage.framing} — ${source.kind === 'video' ? 'Video' : 'Thread'} Walkthrough`;

    const opening = bucket.length
      ? `${stage.label} distils ${bucket.length} source ${bucket.length === 1 ? 'point' : 'points'} from ${byline} into ${tag}`
      : `${stage.label} is scaffolded from the ${media} link itself, because no post text was supplied`;

    const summary = threeSentences([
      opening,
      stage.why,
      `By the end of it you can ${stage.action} without re-opening the ${media}`,
    ]);

    const fromSource = bucket
      .map(takeawayFrom)
      .filter((item) => item.length > 24 && item.length <= 130);

    const takeaways = [...fromSource, ...fallbackTakeaways(tag ?? 'the core idea', index)]
      .filter((item, position, all) => all.indexOf(item) === position)
      .slice(0, index === 0 ? 4 : 3);

    return {
      id: chunkId(stage.label, title),
      moduleLabel: stage.label,
      title,
      summary,
      takeaways,
      minutes: stage.minutes + Math.min(bucket.length, 4),
    } satisfies LessonChunk;
  });
}

export function levelFor(postText: string, chunks: LessonChunk[]): 'Starter' | 'Intermediate' | 'Advanced' {
  const words = tidy(postText).split(/\s+/).filter(Boolean).length;
  const advancedSignals =
    /\b(architect|scal(?:e|ing)|revenue|pricing|retention|arbitrage|system|strategy|compound|funnel|metric)\w*\b/i.test(
      postText,
    );
  if (words > 380 || (advancedSignals && words > 150)) return 'Advanced';
  if (words > 130 || chunks.some((chunk) => chunk.takeaways.length > 3)) return 'Intermediate';
  return 'Starter';
}

export function courseTitleFor(source: SourceInfo, postText: string): { title: string; subtitle: string } {
  const points = extractPoints(postText);
  const by = source.handle ? `@${source.handle}` : 'an X creator';
  const media = source.kind === 'video' ? 'video' : 'thread';
  const globalTopic = points.length ? topicTag(points.slice(0, 6).join(' '), 'The Core Idea') : null;

  if (points.length) {
    const hook = firstSentence(stripLeadingNumbering(points[0])).replace(/[.:;,!?]+$/, '');
    const title = hook.length <= 74 && hook.split(/\s+/).length >= 3 ? capitalise(hook) : `A Mini-Course on ${globalTopic}`;
    return {
      title,
      subtitle: `Three lesson chunks distilled from ${by}'s ${media}, rebuilt as a curriculum you can actually work through.`,
    };
  }

  return {
    title: `A Mini-Course on ${globalTopic ?? `${capitalise(media)} Comprehension`}`,
    subtitle: `Paste the post text for sharper modules — until then this is a rigorous reading scaffold for ${by}'s ${media}.`,
  };
}
