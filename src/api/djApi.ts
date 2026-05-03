/**
 * Klient HTTP do backendu AI DJ Bąbel.
 * Dev: proxy `/api` z vite.config.ts (-> :3001).
 * Prod: ustaw `VITE_API_BASE_URL`.
 *
 * STT i TTS dzieją się w `lib/recording.ts` + `lib/speech.ts` (browser-side
 * MediaRecorder + SpeechSynthesis). Audio dziecka → backend (Groq Whisper).
 */

export type SongStyle = "rock" | "kolysanka" | "pop" | "hiphop";

export const SONG_STYLES: readonly SongStyle[] = [
  "rock",
  "kolysanka",
  "pop",
  "hiphop",
] as const;

export type GeneratedSong = {
  audioUrl: string;
  lyrics: string[];
  title: string;
  style: SongStyle;
  durationMs: number;
};

export type TranscribeResult = {
  transcript: string;
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
   Public API
   ───────────────────────────────────────────── */

/** Wysyła Blob audio na /api/transcribe → Groq Whisper → polski transkrypt. */
export async function transcribeAudio(
  audio: Blob,
  signal?: AbortSignal,
): Promise<TranscribeResult> {
  const ext = pickExt(audio.type);
  const fd = new FormData();
  fd.append("audio", audio, `recording.${ext}`);
  return multipartRequest<TranscribeResult>("/api/transcribe", fd, signal);
}

/** Generuje piosenkę: lyrics (Groq Llama / szablon) + audio URL z sampleBank. */
export async function generateSong(
  prompt: string,
  style: SongStyle,
  signal?: AbortSignal,
): Promise<GeneratedSong> {
  return jsonRequest<GeneratedSong>("/api/songs", {
    method: "POST",
    body: JSON.stringify({ prompt, style }),
    signal,
  });
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
