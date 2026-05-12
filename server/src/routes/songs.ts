/**
 * POST /api/songs
 *   body: { prompt: string, style: SongStyle }
 *   returns: GeneratedSong { title, lyrics, style, vibe, audioMode, audioUrl, durationMs, meta }
 *
 * Pipeline:
 *   1. Lyrics + vibe: Groq Llama (gdy LYRICS_PROVIDER=groq + GROQ_API_KEY).
 *      Fallback → szablon z data/lyrics.ts (zawsze działa).
 *   2. Audio: zawsze "procedural" — frontend generuje muzykę in-browser
 *      (`src/lib/musicGen.ts`). Vibe steruje transpozycją.
 *      Brak external URL = brak CORS, brak 403, działa offline.
 */

import type { FastifyPluginAsync } from "fastify";
import {
  approxDurationMs,
  buildLyrics,
  buildTitle,
  pickVibe,
} from "../data/lyrics.js";
import { generateLyricsViaGroq, lyricsViaGroqEnabled } from "../lib/groq.js";
import {
  SONG_STYLES,
  type ApiMeta,
  type GeneratedSong,
  type GenerateSongBody,
} from "../types.js";

const SCHEMA = {
  body: {
    type: "object",
    required: ["prompt", "style"],
    additionalProperties: false,
    properties: {
      prompt: { type: "string", minLength: 1, maxLength: 600 },
      style: { type: "string", enum: SONG_STYLES as unknown as string[] },
    },
  },
} as const;

export const songsRoute: FastifyPluginAsync = async (app) => {
  app.post<{ Body: GenerateSongBody; Reply: GeneratedSong }>(
    "/api/songs",
    { schema: SCHEMA },
    async (req) => {
      const { prompt, style } = req.body;
      const requestStart = performance.now();

      // 1) Lyrics + vibe
      const groqResult = lyricsViaGroqEnabled
        ? await generateLyricsViaGroq(prompt, style)
        : null;

      const meta: ApiMeta = {
        latencyMs: 0, // wypełniamy na końcu
      };

      let title: string;
      let lyrics: string[];
      let vibe;
      if (groqResult) {
        title = groqResult.title;
        lyrics = groqResult.lyrics;
        vibe = groqResult.vibe;
        meta.lyricsProvider = "groq";
        meta.lyricsModel = groqResult.model;
        meta.lyricsLatencyMs = groqResult.latencyMs;
        req.log.info(
          {
            provider: "groq",
            style,
            vibe,
            latencyMs: groqResult.latencyMs,
            model: groqResult.model,
          },
          "lyrics generated",
        );
      } else {
        title = buildTitle(prompt, style);
        lyrics = buildLyrics(prompt, style);
        vibe = pickVibe(style);
        meta.lyricsProvider = "template";
        req.log.info({ provider: "template", style, vibe }, "lyrics fallback");
      }

      meta.latencyMs = Math.round(performance.now() - requestStart);

      return {
        title,
        lyrics,
        style,
        vibe,
        audioMode: "procedural",
        audioUrl: null,
        durationMs: approxDurationMs(lyrics),
        meta,
      } satisfies GeneratedSong;
    },
  );
};
