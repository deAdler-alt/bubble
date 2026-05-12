# AI DJ Bąbel — backend

Fastify (TypeScript) z trzema endpointami:

| Method | Path             | Co robi                                                                       |
| ------ | ---------------- | ----------------------------------------------------------------------------- |
| GET    | `/api/health`    | `{ status, uptimeMs, startedAt }`                                             |
| POST   | `/api/transcribe`| multipart `audio` → Groq Whisper → `{ transcript, meta }` (PL)                 |
| POST   | `/api/songs`     | `{ prompt, style }` → Groq Llama → `{ title, lyrics, vibe, audioMode, meta }` |

## Architektura: muzyka

**Backend NIE generuje audio i NIE hostuje plików.**
Zwraca jedynie `audioMode: "procedural"` + `vibe`. Frontend buduje akompaniament
in-browser (Web Audio API) — patrz `bubble/MUSIC.md` w roocie repo.

Dlaczego: Pixabay/SoundCloud zwracają 403 dla bezpośrednich linków (referer-check),
hostowanie własnych mp3 to prawne pole minowe, a generatywne modele typu MusicGen
z HuggingFace są wolne (30-60s na utwór) i wpadają w kolejki. Procedural daje:
zerowe zależności, instant playback, działa offline w Dockerze, per-prompt unique.

## Konfiguracja (`.env`)

```bash
cp .env.example .env
nano .env   # GROQ_API_KEY=gsk_...
```

Klucz Groq z [console.groq.com/keys](https://console.groq.com/keys) — 1 min, **bez karty**:

| Limit         | Whisper-large-v3-turbo | Llama-3.1-8b-instant (default) | Llama-3.3-70b-versatile (opt) |
| ------------- | ---------------------- | ------------------------------ | ----------------------------- |
| Reqs / minute | 20                     | 30                             | 14                            |
| Tokens / min  | —                      | 30 000                         | 14 400                        |
| Latency p50   | ~600 ms                | ~500-900 ms                    | ~3-6 s                        |

Dla zabawy z appką te limity są nieosiągalne — wystarczają na setki użytkowników/h.

## Meta na response

Każda odpowiedź zawiera `meta` z diagnostyką (frontend pokazuje w DebugPanel):

```json
{
  "title": "...",
  "lyrics": [...],
  "vibe": "playful",
  "audioMode": "procedural",
  "meta": {
    "latencyMs": 743,
    "lyricsProvider": "groq",
    "lyricsModel": "llama-3.1-8b-instant",
    "lyricsLatencyMs": 612
  }
}
```

## Skrypty

```bash
npm run dev         # tsx watch (port 3001)
npm run build       # tsc -> dist/
npm start           # node dist/index.js
npm run typecheck
```

## Co się dzieje gdy brak klucza?

| Endpoint              | Bez `GROQ_API_KEY`                                                  |
| --------------------- | ------------------------------------------------------------------- |
| `GET /api/health`     | OK                                                                  |
| `POST /api/transcribe`| **503** (frontend pokazuje komunikat z instrukcją)                  |
| `POST /api/songs`     | OK — lyrics z szablonu, vibe per-styl default, audioMode procedural |

## Pretty logs

```bash
LOG_PRETTY=1 npm run dev
```

`pino-pretty` jest w `devDependencies`.
