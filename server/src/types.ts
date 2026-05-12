export type SongStyle = "rock" | "kolysanka" | "pop" | "hiphop";

export const SONG_STYLES: readonly SongStyle[] = [
  "rock",
  "kolysanka",
  "pop",
  "hiphop",
] as const;

export type Vibe = "energetic" | "calm" | "playful" | "dreamy";

export const VIBES: readonly Vibe[] = [
  "energetic",
  "calm",
  "playful",
  "dreamy",
] as const;

export type AudioMode = "procedural" | "url";

/** Metadane diagnostyczne — backend zwraca przy każdej odpowiedzi.
 *  Frontend wyświetla w DebugPanel. */
export type ApiMeta = {
  /** ms — pełny czas obsługi requestu po stronie backendu */
  latencyMs: number;
  /** "groq" | "template" — który provider faktycznie użyty */
  lyricsProvider?: "groq" | "template";
  /** model name jeśli używamy LLM */
  lyricsModel?: string;
  /** ms — sam czas LLM call (bez overhead Fastify itp.) */
  lyricsLatencyMs?: number;
  /** Whisper model + latencja, dla /transcribe */
  sttModel?: string;
  sttLatencyMs?: number;
};

export type TranscribeResponse = {
  transcript: string;
  meta: ApiMeta;
};

export type GenerateSongBody = {
  prompt: string;
  style: SongStyle;
};

export type GeneratedSong = {
  /** Tytuł utworu (z LLM lub szablonu). */
  title: string;
  /** 6-12 linii lyrics. */
  lyrics: string[];
  /** Wybrany styl. */
  style: SongStyle;
  /** Vibe — frontend transponuje muzykę procedural. */
  vibe: Vibe;
  /** "procedural" → frontend generuje muzykę z `lib/musicGen.ts`.
   *  "url" → frontend gra `audioUrl` (legacy / external sample). */
  audioMode: AudioMode;
  /** Tylko gdy audioMode === "url". */
  audioUrl: string | null;
  /** Szacowany czas trwania w ms (informacyjnie, do progress UI). */
  durationMs: number;
  meta: ApiMeta;
};

export type HealthResponse = {
  status: "ok";
  uptimeMs: number;
  startedAt: string;
};
