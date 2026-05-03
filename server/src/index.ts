/**
 * AI DJ Bąbel — backend (Fastify + TS).
 * Endpointy:
 *   GET  /api/health
 *   POST /api/transcribe   (multipart audio → transcript via Groq Whisper)
 *   POST /api/songs        ({prompt, style} → {audioUrl, lyrics, title, ...})
 */

import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { healthRoute } from "./routes/health.js";
import { transcribeRoute } from "./routes/transcribe.js";
import { songsRoute } from "./routes/songs.js";
import { groqEnabled, lyricsViaGroqEnabled } from "./lib/groq.js";

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? "0.0.0.0";

async function main() {
  const startedAt = new Date();
  const usePretty = process.env.LOG_PRETTY === "1";
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
      ...(usePretty && {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            singleLine: true,
            translateTime: "HH:MM:ss",
          },
        },
      }),
    },
  });

  await app.register(cors, {
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
  });

  await app.register(multipart, {
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  });

  await app.register(healthRoute, { startedAt });
  await app.register(transcribeRoute);
  await app.register(songsRoute);

  try {
    const addr = await app.listen({ port: PORT, host: HOST });
    app.log.info(
      {
        groqEnabled,
        lyricsProvider: lyricsViaGroqEnabled ? "groq" : "template",
      },
      `AI DJ Bąbel API ready at ${addr}`,
    );
    if (!groqEnabled) {
      app.log.warn(
        "GROQ_API_KEY nieustawiony — /api/transcribe zwróci 503, lyrics użyje szablonu.",
      );
    }
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
