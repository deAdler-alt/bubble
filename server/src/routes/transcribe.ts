/**
 * POST /api/transcribe — multipart/form-data, pole `audio` (Blob).
 * Wysyła do Groq Whisper-large-v3-turbo, zwraca polski transkrypt.
 */

import type { FastifyPluginAsync } from "fastify";
import { transcribeViaGroq, groqEnabled } from "../lib/groq.js";
import type { TranscribeResponse } from "../types.js";

const MAX_AUDIO_BYTES = 5 * 1024 * 1024; // 5 MB

export const transcribeRoute: FastifyPluginAsync = async (app) => {
  app.post<{ Reply: TranscribeResponse }>("/api/transcribe", async (req, reply) => {
    if (!groqEnabled) {
      return reply.code(503).send({
        statusCode: 503,
        error: "ServiceUnavailable",
        message:
          "Backend nie ma GROQ_API_KEY. Ustaw klucz w server/.env i zrestartuj.",
      } as unknown as TranscribeResponse);
    }

    const file = await req.file({ limits: { fileSize: MAX_AUDIO_BYTES } });
    if (!file) {
      return reply.code(400).send({
        statusCode: 400,
        error: "BadRequest",
        message: "Brak pliku audio w polu 'audio'.",
      } as unknown as TranscribeResponse);
    }

    const buffer = await file.toBuffer();
    const transcript = await transcribeViaGroq(buffer, file.mimetype || "audio/webm");

    if (!transcript) {
      return reply.code(502).send({
        statusCode: 502,
        error: "BadGateway",
        message: "Whisper nie zwrócił wyniku — spróbuj ponownie.",
      } as unknown as TranscribeResponse);
    }

    return { transcript };
  });
};
