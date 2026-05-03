# AI DJ Bąbel — backend

Fastify (TypeScript) z trzema endpointami:

| Method | Path             | Co robi                                                                   |
| ------ | ---------------- | ------------------------------------------------------------------------- |
| GET    | `/api/health`    | `{ status, uptimeMs, startedAt }`                                         |
| POST   | `/api/transcribe`| multipart `audio` → Groq Whisper → `{ transcript }` (PL)                   |
| POST   | `/api/songs`     | `{ prompt, style }` → Groq Llama lyrics + sample bank → `{ audioUrl, lyrics, title, style, durationMs }` |

## Konfiguracja (`.env`)

Skopiuj `.env.example` do `.env` i uzupełnij:

```bash
cp .env.example .env
```

Klucz Groq zakładasz na [console.groq.com/keys](https://console.groq.com/keys) — 1 minuta, **bez karty**, free tier:

| Limit          | Whisper-large-v3-turbo | Llama-3.3-70b |
| -------------- | ---------------------- | ------------- |
| Reqs / minute  | 20                     | 30            |
| Audio / hour   | 7200 sekund            | —             |
| Tokens / min   | —                      | 14400         |

Dla zabawy z aplikacją te limity są nieosiągalne — wystarczają na setki użytkowników/godz.

## Skrypty

```bash
npm run dev         # tsx watch (port 3001)
npm run build       # tsc -> dist/
npm start           # node dist/index.js
npm run typecheck
```

## Co się dzieje gdy brak klucza?

| Endpoint           | Bez `GROQ_API_KEY`                             |
| ------------------ | ---------------------------------------------- |
| `GET /api/health`  | OK                                             |
| `POST /api/transcribe` | **503** (frontend pokazuje "Brak Groq")     |
| `POST /api/songs`  | OK — lyrics z szablonu, audio z sampleBank      |

## Sample bank

Lista CC0 utworów z Pixabay Music: zobacz [`src/data/sampleBank.ts`](src/data/sampleBank.ts). Pixabay Content License = de facto CC0 (bez atrybucji wymaganej, użycie komercyjne OK). Aby zmienić utwory — instrukcje w komentarzu na górze tego pliku.

## Pretty logs

```bash
LOG_PRETTY=1 npm run dev
```

Wymaga zainstalowanego `pino-pretty` w `devDependencies` (jest).
