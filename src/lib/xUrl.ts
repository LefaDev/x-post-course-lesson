import type { SourceInfo, SourceKind } from '../types';

const X_HOSTS = new Set([
  'x.com',
  'www.x.com',
  'mobile.x.com',
  'twitter.com',
  'www.twitter.com',
  'mobile.twitter.com',
  'm.twitter.com',
]);

/** Handles are 1-15 chars of [A-Za-z0-9_] per X's own rules. */
const HANDLE_PATTERN = /^[A-Za-z0-9_]{1,15}$/;

const RESERVED_PATHS = new Set([
  'i',
  'home',
  'explore',
  'search',
  'settings',
  'messages',
  'notifications',
  'compose',
  'intent',
  'hashtag',
]);

export const EMPTY_SOURCE: SourceInfo = {
  raw: '',
  valid: false,
  handle: null,
  postId: null,
  kind: 'thread',
  canonicalUrl: null,
  avatarInitials: null,
  error: null,
};

function normaliseInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed;
  if (/^(www\.|mobile\.|m\.)?(x|twitter)\.com\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

function initialsFor(handle: string): string {
  const cleaned = handle.replace(/[^A-Za-z0-9]/g, '');
  if (!cleaned) return 'X';
  const parts = cleaned.match(/[A-Z][a-z]+|[a-z]+|[0-9]+|[A-Z]+/g) ?? [cleaned];
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return cleaned.slice(0, 2).toUpperCase();
}

/**
 * X appends a `/video/1` segment for uploaded videos. Everything else that resolves
 * to a status id is treated as a thread starter (the common case for course fodder).
 */
function classify(url: URL): SourceKind {
  const path = url.pathname.toLowerCase();
  if (path.includes('/video/') || path.includes('/media/')) return 'video';
  return 'thread';
}

/**
 * Client-side parser for X.com URLs. Extracts the creator handle, the post id and a
 * canonical link for the "Source Verified" badge — no network round trip required.
 */
export function parseSource(rawInput: string): SourceInfo {
  const raw = rawInput.trim();
  if (!raw) return { ...EMPTY_SOURCE };

  const normalised = normaliseInput(raw);

  // Allow a bare "@handle" or "handle" so the tracker still works for quick pastes.
  const bare = normalised.replace(/^@/, '');
  if (!/[/:.\s]/.test(bare) && HANDLE_PATTERN.test(bare)) {
    return {
      raw,
      valid: false,
      handle: bare,
      postId: null,
      kind: 'post',
      canonicalUrl: `https://x.com/${bare}`,
      avatarInitials: initialsFor(bare),
      error: 'That looks like a profile handle. Paste a specific post URL to build a course.',
    };
  }

  let url: URL;
  try {
    url = new URL(normalised);
  } catch {
    return {
      raw,
      valid: false,
      handle: null,
      postId: null,
      kind: 'thread',
      canonicalUrl: null,
      avatarInitials: null,
      error: 'That is not a valid URL. Try https://x.com/username/status/1234567890.',
    };
  }

  const host = url.hostname.toLowerCase();
  if (!X_HOSTS.has(host)) {
    return {
      raw,
      valid: false,
      handle: null,
      postId: null,
      kind: 'thread',
      canonicalUrl: null,
      avatarInitials: null,
      error: `Unsupported host "${url.hostname}". X-Courseify only reads x.com and twitter.com links.`,
    };
  }

  const segments = url.pathname.split('/').filter(Boolean);
  const [first, second, third] = segments;

  const handle =
    first && !RESERVED_PATHS.has(first.toLowerCase()) && HANDLE_PATTERN.test(first) ? first : null;
  const postId = second === 'status' && third && /^\d+$/.test(third) ? third : null;

  if (!handle || !postId) {
    return {
      raw,
      valid: false,
      handle,
      postId: null,
      kind: 'post',
      canonicalUrl: handle ? `https://x.com/${handle}` : null,
      avatarInitials: handle ? initialsFor(handle) : null,
      error: handle
        ? 'Missing post id. Use the full link: https://x.com/username/status/1234567890.'
        : 'Could not read the creator handle from that link.',
    };
  }

  const kind = classify(url);

  return {
    raw,
    valid: true,
    handle,
    postId,
    kind,
    canonicalUrl: `https://x.com/${handle}/status/${postId}`,
    avatarInitials: initialsFor(handle),
    error: null,
  };
}

export function kindLabel(kind: SourceKind): string {
  if (kind === 'video') return 'Video post';
  if (kind === 'thread') return 'Thread';
  return 'Single post';
}

/** Short, stable, human-readable id derived from the source post. */
export function courseIdFor(source: SourceInfo): string {
  const base = `${source.handle ?? 'anon'}-${source.postId ?? Date.now().toString(36)}`;
  return base.toLowerCase().replace(/[^a-z0-9-]/g, '');
}
