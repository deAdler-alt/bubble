/**
 * Groq SDK wrapper — Whisper (STT) + Llama (lyrics).
 * Wszystkie funkcje zwracają `null` gdy:
 *   - brak `GROQ_API_KEY` w env
 *   - request się nie powiódł
 * Wywołujący ma czysty fallback (szablon).
 */

import Groq from "groq-sdk";
import type { SongStyle } from "../types.js";

const apiKey = process.env.GROQ_API_KEY?.trim() || "";
const provider = process.env.LYRICS_PROVIDER?.trim() || "groq";

const client = apiKey ? new Groq({ apiKey }) : null;

export const groqEnabled = client !== null;
export const lyricsViaGroqEnabled = groqEnabled && provider === "groq";

const WHISPER_MODEL =
  process.env.GROQ_WHISPER_MODEL?.trim() || "whisper-large-v3-turbo";
const LLAMA_MODEL =
  process.env.GROQ_LLAMA_MODEL?.trim() || "llama-3.3-70b-versatile";

/* ──────────────────────────────────────────────
   STT: audio Buffer → polski transkrypt
   ────────────────────────────────────────────── */

export async function transcribeViaGroq(
  audio: Buffer,
  mimeType: string,
): Promise<string | null> {
  if (!client) return null;
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
    return transcript || null;
  } catch (err) {
    console.error("[groq] transcribe failed:", (err as Error).message);
    return null;
  }
}

/* ──────────────────────────────────────────────
   Lyrics: prompt + style → 8 linii + tytuł
   ────────────────────────────────────────────── */

export type LyricsResult = {
  lyrics: string[];
  title: string;
};

const LYRICS_SYSTEM_PROMPT = `Jesteś dziecięcym DJ-em o imieniu Bąbel. Tworzysz krótkie, wesołe piosenki dla 5-letnich dzieci po polsku.
Zasady:
- Dokładnie 8 linii tekstu (intro, zwrotka, refren, zwrotka, refren, outro)
- Każda linia 4-10 słów, prosta, melodyjna, pozytywna
- Słownictwo dla dziecka, bez przemocy/strachu/dorosłych tematów
- Refren powtarza się 2-3 razy, zapadający w pamięć
- Trzymaj się stylu muzycznego (rock = energetycznie, kołysanka = spokojnie itd.)
- Tytuł 2-5 słów, też po polsku
Zwróć WYŁĄCZNIE JSON: {"title": "...", "lyrics": ["...", "...", ...]}`;

export async function generateLyricsViaGroq(
  prompt: string,
  style: SongStyle,
): Promise<LyricsResult | null> {
  if (!lyricsViaGroqEnabled || !client) return null;
  try {
    const completion = await client.chat.completions.create({
      model: LLAMA_MODEL,
      temperature: 0.9,
      max_tokens: 500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: LYRICS_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Temat piosenki: ${prompt}\nStyl muzyczny: ${style}`,
        },
      ],
    });
    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LyricsResult>;
    if (!parsed.title || !Array.isArray(parsed.lyrics) || parsed.lyrics.length < 4) {
      return null;
    }
    return {
      title: String(parsed.title).slice(0, 80),
      lyrics: parsed.lyrics
        .filter((l): l is string => typeof l === "string" && l.trim().length > 0)
        .map((l) => l.trim().slice(0, 120))
        .slice(0, 12),
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
