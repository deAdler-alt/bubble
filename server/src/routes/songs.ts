/**
 * POST /api/songs
 *   body: { prompt: string, style: SongStyle }
 *   returns: { audioUrl, lyrics, title, style, durationMs }
 *
 * Pipeline:
 *   1. Lyrics: Groq Llama-3.3 (gdy LYRICS_PROVIDER=groq + GROQ_API_KEY).
 *      Fallback → szablon z data/lyrics.ts (zawsze działa).
 *   2. Audio:  pickSample() — deterministyczny wybór z sampleBank na bazie hash(prompt+style).
 */

import type { FastifyPluginAsync } from "fastify";
import {
  approxDurationMs,
  buildLyrics,
  buildTitle,
} from "../data/lyrics.js";
import { pickSample } from "../data/sampleBank.js";
import { generateLyricsViaGroq, lyricsViaGroqEnabled } from "../lib/groq.js";
import { SONG_STYLES, type GeneratedSong, type GenerateSongBody } from "../types.js";

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

      // 1) Lyrics
      let lyrics: string[];
      let title: string;
      const groqResult = lyricsViaGroqEnabled
        ? await generateLyricsViaGroq(prompt, style)
        : null;
      if (groqResult) {
        req.log.info({ provider: "groq", style }, "lyrics generated");
        lyrics = groqResult.lyrics;
        title = groqResult.title;
      } else {
        req.log.info({ provider: "template", style }, "lyrics fallback");
        lyrics = buildLyrics(prompt, style);
        title = buildTitle(prompt, style);
      }

      // 2) Audio sample
      const sample = pickSample(prompt, style);
      req.log.info(
        { sample: sample.title, credit: sample.credit, style },
        "sample picked",
      );

      return {
        audioUrl: sample.url,
        lyrics,
        title,
        style,
        durationMs: approxDurationMs(lyrics),
      } satisfies GeneratedSong;
    },
  );
};
