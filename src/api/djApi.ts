/**
 * Klient HTTP do backendu AI DJ Bąbel.
 * Dev: proxy `/api` z vite.config.ts (-> :3001).
 * Prod: ustaw `VITE_API_BASE_URL`.
 *
 * Wszystkie wywołania automatycznie zapisują się do `debugLog` —
 * dzięki temu `DebugPanel` widzi prompt + response każdego requestu.
 */

import { logEntry } from "../lib/debugLog";

export type SongStyle = "rock" | "kolysanka" | "pop" | "hiphop";

export const SONG_STYLES: readonly SongStyle[] = [
  "rock",
  "kolysanka",
  "pop",
  "hiphop",
] as const;

export type Vibe = "energetic" | "calm" | "playful" | "dreamy";

export type AudioMode = "procedural" | "url";

export type ApiMeta = {
  latencyMs: number;
  lyricsProvider?: "groq" | "template";
  lyricsModel?: string;
  lyricsLatencyMs?: number;
  sttModel?: string;
  sttLatencyMs?: number;
};

export type GeneratedSong = {
  title: string;
  lyrics: string[];
  style: SongStyle;
  vibe: Vibe;
  audioMode: AudioMode;
  audioUrl: string | null;
  durationMs: number;
  meta: ApiMeta;
};

export type TranscribeResult = {
  transcript: string;
  meta: ApiMeta;
};

const BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;
  payload?: unknown;
  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
    this.name = "ApiError";
  }
}

async function jsonRequest<T>(
  path: string,
  init?: RequestInit & { signal?: AbortSignal },
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const payload = await safeJson(res);
    throw new ApiError(
      apiMessage(payload, `API ${path} -> ${res.status}`),
      res.status,
      payload,
    );
  }
  return (await res.json()) as T;
}

async function multipartRequest<T>(
  path: string,
  formData: FormData,
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    body: formData,
    signal,
  });
  if (!res.ok) {
    const payload = await safeJson(res);
    throw new ApiError(
      apiMessage(payload, `API ${path} -> ${res.status}`),
      res.status,
      payload,
    );
  }
  return (await res.json()) as T;
}

/* ─────────────────────────────────────────────
   Public API — z auto-debug-log
   ───────────────────────────────────────────── */

/** Wysyła Blob audio na /api/transcribe → Groq Whisper → polski transkrypt. */
export async function transcribeAudio(
  audio: Blob,
  signal?: AbortSignal,
): Promise<TranscribeResult> {
  const ext = pickExt(audio.type);
  const fd = new FormData();
  fd.append("audio", audio, `recording.${ext}`);
  const start = performance.now();
  try {
    const result = await multipartRequest<TranscribeResult>(
      "/api/transcribe",
      fd,
      signal,
    );
    logEntry({
      kind: "transcribe",
      time: Date.now(),
      request: { audioBytes: audio.size },
      response: { transcript: result.transcript },
      meta: result.meta as unknown as Record<string, unknown>,
      totalLatencyMs: Math.round(performance.now() - start),
    });
    return result;
  } catch (err) {
    logEntry({
      kind: "transcribe",
      time: Date.now(),
      request: { audioBytes: audio.size },
      totalLatencyMs: Math.round(performance.now() - start),
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/** Generuje piosenkę: lyrics+vibe (Groq Llama / szablon) + audioMode "procedural". */
export async function generateSong(
  prompt: string,
  style: SongStyle,
  signal?: AbortSignal,
): Promise<GeneratedSong> {
  const start = performance.now();
  try {
    const result = await jsonRequest<GeneratedSong>("/api/songs", {
      method: "POST",
      body: JSON.stringify({ prompt, style }),
      signal,
    });
    logEntry({
      kind: "song",
      time: Date.now(),
      request: { prompt, style },
      response: {
        title: result.title,
        lyrics: result.lyrics,
        vibe: result.vibe,
        audioMode: result.audioMode,
        audioUrl: result.audioUrl,
        durationMs: result.durationMs,
      },
      meta: result.meta as unknown as Record<string, unknown>,
      totalLatencyMs: Math.round(performance.now() - start),
    });
    return result;
  } catch (err) {
    logEntry({
      kind: "song",
      time: Date.now(),
      request: { prompt, style },
      totalLatencyMs: Math.round(performance.now() - start),
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

export async function pingApi(): Promise<{
  status: "ok";
  uptimeMs: number;
  startedAt: string;
}> {
  return jsonRequest("/api/health");
}

/* ─────────────────────────────────────────────
   helpers
   ───────────────────────────────────────────── */

function pickExt(mimeType: string): string {
  const m = mimeType.toLowerCase();
  if (m.includes("webm")) return "webm";
  if (m.includes("ogg")) return "ogg";
  if (m.includes("mp4") || m.includes("m4a")) return "m4a";
  if (m.includes("mpeg") || m.includes("mp3")) return "mp3";
  if (m.includes("wav")) return "wav";
  return "webm";
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return undefined;
  }
}

function apiMessage(payload: unknown, fallback: string): string {
  if (
    payload &&
    typeof payload === "object" &&
    "message" in payload &&
    typeof (payload as { message: unknown }).message === "string"
  ) {
    return (payload as { message: string }).message;
  }
  return fallback;
}
