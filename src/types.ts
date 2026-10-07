export type ThemeMode = 'light' | 'dark';

export type ProviderId = 'local' | 'openai' | 'gemini';

export interface CourseSettings {
  provider: ProviderId;
  /** Bring-your-own-key value. Never leaves the browser except to the chosen provider. */
  apiKey: string;
  /** Keep the key in localStorage (true) or sessionStorage only (false). */
  rememberKey: boolean;
  model: string;
}

export type SourceKind = 'thread' | 'video' | 'post';

export interface SourceInfo {
  /** Raw string the user pasted. */
  raw: string;
  valid: boolean;
  /** Creator handle without the leading "@". */
  handle: string | null;
  postId: string | null;
  kind: SourceKind;
  /** Normalised https://x.com/... link used by the "Source Verified" badge. */
  canonicalUrl: string | null;
  avatarInitials: string | null;
  /** Human readable explanation when the URL could not be parsed. */
  error: string | null;
}

export interface LessonChunk {
  id: string;
  /** "Module 1" … */
  moduleLabel: string;
  title: string;
  /** Curriculum copy. Always exactly three sentences. */
  summary: string;
  takeaways: string[];
  minutes: number;
}

export type EngineId = 'local' | 'openai' | 'gemini';

export interface Course {
  id: string;
  title: string;
  subtitle: string;
  level: 'Starter' | 'Intermediate' | 'Advanced';
  minutes: number;
  createdAt: number;
  source: SourceInfo;
  chunks: LessonChunk[];
  engine: EngineId;
  /** Set when a remote provider failed and the local engine took over. */
  notice: string | null;
}

export interface BuildStage {
  label: string;
  detail: string;
}

export interface BuildInput {
  source: SourceInfo;
  postText: string;
  settings: CourseSettings;
}
