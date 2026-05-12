/**
 * Groq SDK wrapper — Whisper (STT) + Llama (lyrics).
 * Wszystkie funkcje zwracają `null` gdy:
 *   - brak `GROQ_API_KEY` w env
 *   - request się nie powiódł
 * Wywołujący ma czysty fallback (szablon).
 */

import Groq from "groq-sdk";
import type { SongStyle, Vibe } from "../types.js";

const apiKey = process.env.GROQ_API_KEY?.trim() || "";
const provider = process.env.LYRICS_PROVIDER?.trim() || "groq";

const client = apiKey
  ? new Groq({
      apiKey,
      // Wymuszamy 20s — domyślne 60s + 2 retry = możliwe ~3 minuty czekania
      // gdy Groq ma korek. Frontend ma własny abort, ale lepiej kończyć czysto.
      timeout: 20_000,
      maxRetries: 1,
    })
  : null;

export const groqEnabled = client !== null;
export const lyricsViaGroqEnabled = groqEnabled && provider === "groq";

const WHISPER_MODEL =
  process.env.GROQ_WHISPER_MODEL?.trim() || "whisper-large-v3-turbo";
// Default 8B-instant: piosenki dla 5-latka są krótkie i proste, model 70B
// dawał czas oczekiwania 3-6 sekund, 8B robi to w ~600ms i ma WIELOKROTNIE
// wyższy rate limit (30 req/min vs 14 dla 70B). Dla bardziej "literackich"
// tekstów ustaw GROQ_LLAMA_MODEL=llama-3.3-70b-versatile w .env.
const LLAMA_MODEL =
  process.env.GROQ_LLAMA_MODEL?.trim() || "llama-3.1-8b-instant";

/* ──────────────────────────────────────────────
   STT: audio Buffer → polski transkrypt
   Zwraca też nazwę modelu i latencję dla /api/transcribe meta.
   ────────────────────────────────────────────── */

export type TranscribeResult = {
  transcript: string;
  model: string;
  latencyMs: number;
};

export async function transcribeViaGroq(
  audio: Buffer,
  mimeType: string,
): Promise<TranscribeResult | null> {
  if (!client) return null;
  const startedAt = performance.now();
  try {
    const ext = pickExt(mimeType);
    const file = new File([audio], `recording.${ext}`, { type: mimeType });
    const res = await client.audio.transcriptions.create({
      file,
      model: WHISPER_MODEL,
      language: "pl",
      response_format: "json",
      temperature: 0,
    });
    const transcript = (res as { text?: string }).text?.trim() ?? "";
    if (!transcript) return null;
    return {
      transcript,
      model: WHISPER_MODEL,
      latencyMs: Math.round(performance.now() - startedAt),
    };
  } catch (err) {
    console.error("[groq] transcribe failed:", (err as Error).message);
    return null;
  }
}

/* ──────────────────────────────────────────────
   Lyrics: prompt + style → 8 linii + tytuł
   ────────────────────────────────────────────── */

export type LyricsResult = {
  title: string;
  lyrics: string[];
  /** Vibe steruje transpozycją muzyki procedural na froncie. */
  vibe: Vibe;
  /** Diagnostyka: model + latencja LLM call. */
  model: string;
  latencyMs: number;
  /** Surowa odpowiedź modelu (string) — dla DebugPanel. */
  rawResponse: string;
  /** Pełny prompt wysłany do modelu — dla DebugPanel. */
  prompt: string;
};

const LYRICS_SYSTEM_PROMPT = `Jesteś dziecięcym DJ-em o imieniu Bąbel. Tworzysz krótkie, wesołe piosenki dla 5-letnich dzieci po polsku.

ZASADY TEKSTU:
- Dokładnie 8 linii (intro, zwrotka, refren, zwrotka, refren, outro)
- Każda linia 4-10 słów, prosta, melodyjna, pozytywna
- Słownictwo dla dziecka, bez przemocy/strachu/dorosłych tematów
- Refren (linia 3, 5, 7) powtarza się — zapadający w pamięć
- Tytuł 2-5 słów, po polsku, BEZ cudzysłowów

ZASADY VIBE (dobierz JEDEN do tematu + stylu):
- "energetic" → temat: szybko, akcja, sport, impreza, kosmos, super-bohaterowie
- "playful"   → temat: zabawne zwierzęta, jedzenie, śmieszne sytuacje (DEFAULT)
- "calm"      → temat: przyroda, deszcz, spokojny dzień, mama/tata
- "dreamy"    → temat: sen, gwiazdy, księżyc, fantazja, przed snem

Trzymaj się stylu muzycznego (rock = energicznie, kołysanka = spokojnie).

ZWRÓĆ DOKŁADNIE TAKI JSON (i nic więcej):
{"title": "...", "vibe": "energetic" | "playful" | "calm" | "dreamy", "lyrics": ["linia 1", ..., "linia 8"]}`;

const VALID_VIBES = new Set<Vibe>(["energetic", "calm", "playful", "dreamy"]);

export async function generateLyricsViaGroq(
  prompt: string,
  style: SongStyle,
): Promise<LyricsResult | null> {
  if (!lyricsViaGroqEnabled || !client) return null;
  const userPrompt = `Temat piosenki: ${prompt}\nStyl muzyczny: ${style}`;
  const startedAt = performance.now();
  try {
    const completion = await client.chat.completions.create({
      model: LLAMA_MODEL,
      temperature: 0.9,
      max_tokens: 500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: LYRICS_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });
    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<{
      title: string;
      vibe: string;
      lyrics: string[];
    }>;
    if (!parsed.title || !Array.isArray(parsed.lyrics) || parsed.lyrics.length < 4) {
      return null;
    }
    const vibe: Vibe = VALID_VIBES.has(parsed.vibe as Vibe)
      ? (parsed.vibe as Vibe)
      : "playful";
    return {
      title: String(parsed.title).slice(0, 80),
      lyrics: parsed.lyrics
        .filter((l): l is string => typeof l === "string" && l.trim().length > 0)
        .map((l) => l.trim().slice(0, 120))
        .slice(0, 12),
      vibe,
      model: LLAMA_MODEL,
      latencyMs: Math.round(performance.now() - startedAt),
      rawResponse: raw,
      prompt: userPrompt,
    };
  } catch (err) {
    console.error("[groq] generateLyrics failed:", (err as Error).message);
    return null;
  }
}

function pickExt(mimeType: string): string {
  const m = mimeType.toLowerCase();
  if (m.includes("webm")) return "webm";
  if (m.includes("ogg")) return "ogg";
  if (m.includes("mp4") || m.includes("m4a")) return "m4a";
  if (m.includes("mpeg") || m.includes("mp3")) return "mp3";
  if (m.includes("wav")) return "wav";
  return "webm";
}
