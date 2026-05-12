# Następne kroki — handoff dev'om

> Zanim ktokolwiek dotknie kodu: przeczytaj `rules.md` (księga zasad projektu). Wszystko poniżej musi być zgodne z tymi regułami — w razie konfliktu rules.md ma pierwszeństwo nad tym dokumentem.

## 0. Co mamy na dziś (v0.1, MVP)

| Warstwa             | Stan                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------ |
| Frontend            | React 19 + Vite 7 + Tailwind v4 + Framer Motion 12, 5 ekranów (Start → Rec → Style → Loading → Player) |
| Backend             | Fastify 5 + TS, 3 endpointy (`/health`, `/transcribe`, `/songs`), `dotenv` na env          |
| STT                 | Groq Whisper-large-v3-turbo, free tier, PL                                                 |
| Lyrics              | Groq Llama-3.1-8b-instant (default) + szablon PL jako fallback                              |
| Vibe inference      | Llama zwraca `{vibe: energetic\|playful\|calm\|dreamy}` razem z lyrics                     |
| Music tła           | Procedural Web Audio API, per-styl + vibe (`src/lib/musicGen.ts`) — zero external assets   |
| TTS Bąbla           | `window.speechSynthesis` z polskim głosem systemowym + sync onboundary do karaoke          |
| Karaoke             | Spotify-like vertical scroller, highlight per słowo                                        |
| Debug               | `DebugPanel` w right-bottom, toggle Cmd/Ctrl+\\, auto-log requestów                        |
| Konteneryzacja      | `Dockerfile` (nginx) + `server/Dockerfile` (Node 20 alpine) + `docker-compose.yml`         |
| Mikrofon UX         | Permissions API pre-check + 8s timeout + macOS-specyficzny error                           |

Bundle: 396 KB / 125 KB gzip. Backend image: ~180 MB. Frontend image: ~80 MB.

---

## 1. Lepsze darmowe modele/usługi — szybkie wygrane

### 1.1 TTS — głos Bąbla brzmi "robotycznie"

Aktualnie `window.speechSynthesis` używa głosów systemowych — na macOS Zosia OK, na Windows Paulina średnia, na Linux często brak PL voice w ogóle. To największa wizualno-słuchowa słabość MVP.

| Opcja                       | Free tier                       | Jakość PL | Latencja | Wymaga klucza | Koszt prod   |
| --------------------------- | ------------------------------- | --------- | -------- | ------------- | ------------ |
| **Microsoft Edge TTS**      | **bez limitu, bez klucza** (proxy edge endpoint) | ★★★★☆    | ~800 ms  | ✗             | $0           |
| **ElevenLabs Multilingual** | 10 000 znaków/mies              | ★★★★★    | ~600 ms  | ✓             | $5/mies powyżej |
| **PlayHT 2.0**              | 12 500 znaków, 14 dni           | ★★★★☆    | ~1.2 s   | ✓             | $39/mies     |
| **Web Speech API**          | unlimited                       | ★★☆☆☆    | 0 ms     | ✗             | $0 (current) |
| **Coqui XTTS-v2 self-host** | unlimited (własny GPU)          | ★★★★☆    | ~2 s     | ✗             | infra        |

**Rekomendacja v0.2:** podpinamy **Edge TTS via proxy** w backendzie. Jest darmowy, nieograniczony, ma `pl-PL-MarekNeural` i `pl-PL-ZofiaNeural` — brzmią naturalnie. Dodać endpoint `POST /api/tts` przyjmujący `{text, voice}` i zwracający MP3 stream. Frontend: zastąpić `speechSynthesis.speak` w `lib/speech.ts` HTMLAudio z `audio.onended` zamiast `utterance.onend`.

Karaoke sync zostaje — Edge TTS zwraca też `<bookmark>` events (czas na słowo) jeśli użyjemy SSML.

Implementacja: ~150 linii backendu (1 plik), ~50 linii frontendu (refactor speech.ts). Pakiet: `edge-tts-node` (community wrapper) lub własny WebSocket do speech.platform.bing.com (open protocol).

### 1.2 Lyrics — gdy chcemy lepszej jakości w "story mode"

Obecny default Llama-8b jest dobry dla prostych piosenek. Propozycja: **dwupoziomowy router**:

- "**szybki**" (default): Llama-8b — instant playback dla niecierpliwych dzieciaków
- "**głęboki**" (button "🎨 Lepsza wersja"): Llama-3.3-70b — dla ambitniejszych tematów, latencja 3-5 s

Dodatkowo backup gdy Groq leży: **Google Gemini 2.0 Flash** — free tier 15 RPM, 1M tokens/min, jakość PL bardzo dobra. Wymaga klucza, key z aistudio.google.com.

```ts
// server/src/lib/lyricsRouter.ts (NEW)
export async function generateLyrics(prompt, style, mode: "fast"|"deep") {
  const primary = mode === "deep" ? GROQ_70B : GROQ_8B;
  const fallback = GEMINI_FLASH;
  return tryProviders([primary, fallback], prompt, style);
}
```

### 1.3 STT — zostaje Groq Whisper

Najlepszy free PL na rynku, nie ma sensu zmieniać. Backup gdy Groq pada: **Deepgram Nova-2** ($200 free credit przy rejestracji, PL OK). **AssemblyAI** ma free tier ale gorzej z PL.

### 1.4 Cover art per piosenkę (nowy feature)

Każda wygenerowana piosenka dostaje obrazek-okładkę za zero kosztów:

- **Pollinations.ai** — `https://image.pollinations.ai/prompt/<text>?model=flux` — zwraca PNG, **zero rejestracji, zero klucza**, instant. Quality SDXL+. Idealne na 5-latka.
- Backup: **Stability AI free tier** (25 credits / day) lub **Replicate SDXL** ($0.003/img).

```ts
// server/src/routes/cover.ts (NEW v0.3)
// GET /api/cover?prompt=<title>&style=<style>
// Buduje prompt EN: "children book illustration, [title], [style] mood, cartoon, vibrant colors"
// Proxy do pollinations, zwraca PNG (cache w Redis lub na dysku)
```

Frontend: dodać <img> w StagePanel pod tytułem albo zastąpić winyl. Po skończeniu piosenki "Zapisz okładkę" → download.

### 1.5 Generative music — gdy wyjdziemy z procedural

Patrz `MUSIC.md` w roocie. TL;DR: **Replicate MusicGen** kiedy chcemy "prawdziwych" utworów ($0.005/gen, ~5s, $10 free credit). Architektura już gotowa — backend przełącza `audioMode: "url"` i frontend gra `<audio>`.

### 1.6 Talking head Bąbla (v0.5+)

Aktualnie Bąbel to statyczny mascot. Można go ożywić:

- **D-ID Studio** — free tier 5 video/mies, talking head z naszego rysunku Bąbla + audio z Edge TTS
- **HeyGen free tier** — 1 minuta wideo/mies, podobnie
- DIY: animacja `<svg>` z mouth shapes (viseme) sterowana przez Web Audio analyser

Tańsza i bardziej "kid-friendly" droga: animacja SVG mouth shapes (closed → wide → smile) sync do RMS audio — koszt zero, wygląda "Bee Movie".

---

## 2. Frontend — co realnie poprawić

### 2.1 Onboarding (v0.2 must-have)

Pierwsze wejście dziecka: nie wie co robić. Dorzucić **tutorial overlay** z 3 krokami pokazywanymi przez Bąbla (speech bubble + arrow):

1. „Naciśnij wielki przycisk z mikrofonem" (na StartScreen)
2. „Mów co chcesz w piosence" (na RecordingScreen, animacja krzyczącego dziecka)
3. „Wybierz styl muzyki" (na StyleScreen, pulse na 1. kafelku)

Tutorial trigger: pierwszy launch (localStorage flag `babel_tutorial_done`). Skip button dla rodziców.

### 2.2 Historia piosenek (IndexedDB, v0.2)

Dziecko zaśpiewało coś genialnego → znika po restart. Dodać **"Twoje hity"** screen z listą ostatnich 10 piosenek (lyrics + style + vibe + data). Storage: IndexedDB przez `idb` package (~3KB) lub natywnie. Bez backendu, bez konta.

```ts
// src/lib/songHistory.ts
export async function saveSong(song: GeneratedSong): Promise<void>;
export async function getRecentSongs(limit = 10): Promise<GeneratedSong[]>;
export async function deleteSong(id: string): Promise<void>;
```

Bonus: "Dla rodzica" tab z ostatnimi promptami → kontrola treści.

### 2.3 Share-link (v0.3)

Generowanie URL do udostępnienia: `?prompt=<base64>&style=pop&vibe=playful` → ten URL otwarty od razu odpala karaoke. Rodzic wysyła babci na messengera "zobacz co Janek wyśpiewał".

Implementacja: encode w `App.tsx` na zmianę state, decode przy mount. Bez serwerowej persistence.

### 2.4 Accessibility (a11y)

Kid-app, ale rodzic z problemem wzroku też używa. Brakuje:

- `aria-live="polite"` na current line w `KaraokePanel` → screen reader czyta postęp karaoke
- `prefers-reduced-motion` — wyłączyć animacje (Framer Motion ma `useReducedMotion` hook)
- Focus visible states już są (focus-visible:ring), ale skip-link na początku DOM byłby plus
- Audit Lighthouse a11y — celuj 95+

### 2.5 Animacja Bąbla podczas śpiewania (v0.2)

Statyczny Bąbel jest słaby. Dodać:

- Mascot scale pulse w rytm `wordIndex` z karaoke (każde słowo = mały bounce)
- Mouth open/close — 2 SVG path swap based on `wordIndex % 2`
- Eye blink co 4-6 s
- Reaction chat bubble „Świetnie!" co 2-3 linijki

Plik: `src/components/BabelMascot.tsx` (NEW), używany na PlayerScreen jako overlay przy karaoke.

### 2.6 Performance / bundle

- **Code-split per screen** — `React.lazy` dla 4 nie-startowych ekranów. Initial bundle ~200 KB zamiast 396 KB.
- **Drop unused Lucide icons** — używamy ~10 ikon, importujemy z root (tree-shakable, OK), ale zweryfikować
- **Audit framer-motion** — używamy lekkich features, sprawdzić czy nie ciągnie całego `motion3d`
- **Preload Bungee font** w `index.html` — zapobiega FOUT na Start

Cel: **< 250 KB gzip** initial bundle, < 2 s TTI na 3G fast.

### 2.7 i18n infra (przed dodaniem EN)

Wszystkie copy są dziś rozsiane po komponentach po polsku. Wprowadzić **`src/i18n/`** już teraz:

```ts
// src/i18n/pl.ts
export const t = {
  start: { play: "▶ ZACZNIJ ZABAWĘ", subtitle: "Rośnijmy się muzyką!" },
  recording: { headers: { idle: "POWIEDZ MI O CZYM ŚPIEWAĆ", ... } },
  // ...
};
```

Później dorzucenie `en.ts` to chwila. Bez biblioteki (nie potrzebujemy `i18next` na MVP).

### 2.8 Dropy do usunięcia

- W `App.tsx` martwy komentarz o "App-level Bąbel" (już dawno usunięty)
- Duplikat `useStageSize` w 3 plikach (PlayerScreen, RecordingScreen, StartScreen) — wyjąć do `src/hooks/useStageSize.ts`
- `screenLayout.ts` — przemyśleć czy nie wcielić do globalnego `theme.ts`

---

## 3. Refaktoryzacja kodu — zgodnie z `rules.md`

> **Najważniejsze:** rules.md jest źródłem prawdy. Poniżej lista miejsc gdzie *na pewno* trzeba będzie posprzątać; konkretne reguły aplikuje się dopiero po przeczytaniu księgi.

### 3.1 Pliki za duże — split

| Plik                            | Linii | Plan                                                                                                          |
| ------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------- |
| `src/screens/PlayerScreen.tsx`  | 668   | Wyjąć `KaraokePanel`, `CurrentLine`, `StagePanel`, `VuMeter`, `RestartButton`, `SpinningGlow` do `components/player/` |
| `src/screens/StartScreen.tsx`   | 464   | Wyjąć `MegaTitle`, `FloatingBabel`, `VinylCTA`, `EqBars` do `components/start/`                                |
| `src/lib/musicGen.ts`           | 480+  | Podzielić: `instruments.ts` (synth), `drums.ts`, `progressions.ts`, `musicGen.ts` (orchestracja)              |
| `src/components/DJBoothBackdrop.tsx` | ~190  | Już sensowne, ale można wyjąć `Spotlights`, `DiscoBall`, `StageFloor` do `components/backdrop/`                |

Cel: każdy `.tsx` < 250 linii, każdy `.ts` < 300.

### 3.2 Konstanty centralne

`BABEL_PITCH`, `BACKGROUND_VOLUME`, `LINE_GAP_MS` itd. żyją po komponentach. Centralizować:

```text
src/config/
  audio.ts        # głośności, pitch, rate, line gap
  layout.ts       # breakpointy, font size clamp tokens
  music.ts        # BPM per styl, paterny per styl (przeniesione z musicGen.ts)
  features.ts     # feature flags (TUTORIAL_ON, SHARE_LINK_ON)
```

### 3.3 Współdzielone typy (client ↔ server)

Aktualnie typy są zduplikowane w `bubble/server/src/types.ts` i `bubble/src/api/djApi.ts`. Bug-bait gdy kontrakt ewoluuje. Opcje:

- **A — najprostsze:** trzymać duplikaty, ale dodać runtime walidację Zod w backendzie + frontendzie. Fix-mismatch w runtime.
- **B — solidniejsze:** workspace `bubble/shared/` z typami (`@baibel/shared`). Wymaga konfiguracji TS path aliasów.
- **C — pragmatyczne:** OpenAPI/zod-to-openapi z auto-gen klienta TS. Przy 3 endpointach overkill, ale skaluje się.

Rekomendacja: **B** dla v0.2 (typy + zod schemas), **C** gdy >10 endpointów.

### 3.4 Naming convention — PL/EN mix

Kod miesza PL i EN — typy po EN (`SongStyle`), komentarze często po PL, copy po PL, niektóre vary po EN (`lineIndex`), niektóre po PL (`fonceuje` itd.).

**Propozycja konwencji:**

- Kod (warianty, funkcje, typy, pliki) — **EN, camelCase / PascalCase**
- Komentarze — **PL** (zespół PL, czytelniej)
- User-facing copy — **PL** w `i18n/pl.ts`
- Logi backendu — **EN** (łatwiej grepować, narzędzia operacyjne)
- Commit messages — **EN imperative** (`feat: add karaoke`, `fix: mic timeout`)

### 3.5 Hooki i narzędzia → `src/hooks/`

Dziś są inline w komponentach:

- `useStageSize` (3 kopie) → `src/hooks/useStageSize.ts`
- `useResponsiveLineHeight` → `src/hooks/useResponsiveLineHeight.ts`
- `useMediaRecorder` (już jest w `lib/recording.ts`) → przenieść do `hooks/`
- Future: `useSongHistory`, `useDebounce`, `useSpeechSynthesis`

### 3.6 Error boundaries

App nie ma React Error Boundary. Bug w komponencie = blank screen. Dodać `src/components/ErrorBoundary.tsx` w roocie `App.tsx`, z retry button i Sentry hook.

### 3.7 Logger zamiast `console.warn`

Rozsiane `console.warn / console.error` → `src/lib/logger.ts` z poziomami (`debug`, `info`, `warn`, `error`) który w prod silentowi `debug` i pluje `error` do Sentry.

### 3.8 `src/lib/speech.ts` — drobny memory leak

Globalny listener `voiceschanged` nigdy nie jest usuwany — w hot-reload narasta. Refactor: lazy-init przy pierwszym `loadVoices()` + WeakRef cleanup na page unload. Albo prościej: idempotent `addOnce`.

---

## 4. Bezpieczeństwo i compliance — MUST-HAVE przed publicznym launchem

### 4.1 RODO/GDPR

- **Nagrania głosów dzieci** → przekazywane do Groq (US). RODO wymaga **DPA** + klauzul transferowych (SCC). Groq publikuje DPA na żądanie — pobrać i podpisać.
- **Polityka prywatności** musi powiedzieć: co zbieramy (audio + transcript), gdzie wysyłamy (Groq US), jak długo trzymamy (rekomendacja: **nigdy**, audio bufor in-memory, transcript tylko w bieżącej sesji), prawo do usunięcia.
- **Parental consent** (GDPR-K, dziecko < 16 lat w PL): UI dla rodzica przed pierwszym użyciem. Checkbox + adres email rodzica? Albo MUST-HAVE konto rodzica.
- W prod: **NIE LOGOWAĆ TRANSKRYPTÓW** w pino — dziecko może powiedzieć imię, adres, wszystko. Wycenzurować w `transcribe.ts` przed `req.log.info`.

### 4.2 Content safety

Llama może wygenerować coś dziwnego. Pre-filter promptu (input) i post-filter lyrics (output):

- **OpenAI Moderation API** — free, ~50 ms, multi-language including PL. Sprawdza hate/sexual/violence/self-harm.
- Albo prościej: lokalny lista zakazanych słów PL + check w `routes/songs.ts` przed return.

```ts
const moderation = await openai.moderations.create({ input: lyrics.join(" ") });
if (moderation.results[0].flagged) {
  return reply.code(422).send({ error: "Content blocked" });
}
```

### 4.3 Rate limiting

Backend nie ma żadnej obrony. Atak: ktoś robi 10000 req/min na `/api/songs` → spali Twój budżet Groq + Bin.

`@fastify/rate-limit`:

```ts
await app.register(rateLimit, {
  max: 30,
  timeWindow: "1 minute",
  keyGenerator: (req) => req.ip,
});
```

Dla prod publicznego: dodać Cloudflare przed nginxem (free, anti-DDoS, bot detection).

### 4.4 CORS

W `src/index.ts` mamy `origin: true` — pozwala każdemu. W prod ustawić whitelist domen.

### 4.5 Sekrety

`server/.env` jest w `.gitignore`, OK dev. Prod: użyj **Docker secrets** lub **Vault** lub **AWS Secrets Manager**. NIE wrzucać klucza Groq do `docker-compose.yml` jako `environment:`.

### 4.6 HTTPS w prod

`getUserMedia` wymaga secure context. Localhost OK, domain OK z certem. Caddy w `docker-compose.prod.yml` z auto-Let's Encrypt — pól godziny roboty.

---

## 5. Observability + ops

| Obszar      | Free tool                        | Co dorzucić                                                     |
| ----------- | -------------------------------- | --------------------------------------------------------------- |
| Frontend errors | **Sentry** free 5k events/mies | `@sentry/react` w main.tsx + ErrorBoundary fallback              |
| Backend errors  | **Sentry Node** lub **Better Stack** free | wrap Fastify error handler                                |
| Logi structured | Pino już mamy → Loki/Datadog free tier | docker logging driver                                |
| Metrics     | Prometheus + Grafana Cloud free | `fastify-metrics` plugin (`/metrics` endpoint)                  |
| Uptime      | **UptimeRobot** free            | ping na `/api/health` co 5 min                                  |
| Real user monitoring | **Cloudflare Web Analytics** free | snippet w index.html                                  |

---

## 6. CI/CD + DX

### 6.1 GitHub Actions (v0.2 must)

`.github/workflows/ci.yml`:

```yaml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run build
      # - run: npm run test  (jak dodamy)
      # - run: npx playwright test  (jak dodamy E2E)
```

Plus branch protection na `main` — wymóg passing CI + 1 review.

### 6.2 Pre-commit hooks (`lefthook` lub `husky`)

```yaml
# lefthook.yml
pre-commit:
  commands:
    typecheck: { run: npm run typecheck }
    lint: { run: npx eslint --fix {staged_files} }
    format: { run: npx prettier --write {staged_files} }
```

Brakuje też: **ESLint config** + **Prettier config**. Jest gołe `tsc` ale nie ma reguł stylu. To pierwsza rzecz wg `rules.md` najpewniej.

### 6.3 VSCode shared settings

`.vscode/settings.json` + `.vscode/extensions.json` z rekomendacjami (ESLint, Prettier, Tailwind, Error Lens). Każdy nowy dev klika "Install all" raz.

### 6.4 Dokumentacja dla nowego dev

`CONTRIBUTING.md` w roocie:

- Setup w 3 krokach (`git clone`, `npm i`, `npm run dev:all`)
- Branch naming (`feat/`, `fix/`, `chore/`)
- Commit format (Conventional Commits)
- PR template (`.github/PULL_REQUEST_TEMPLATE.md`)

---

## 7. Testowanie

Aktualnie **brak testów**. Akceptowalne na MVP, blocker na v1.0.

### 7.1 Unit (Vitest, vite-native)

```bash
npm i -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Pierwsze testy do napisania:

- `lib/musicGen.ts` — `createBackingTrack().start()` produkuje audio (assert AudioContext.state === 'running')
- `lib/recording.ts` — `useMediaRecorder` happy path + permission denied path (mock `navigator.mediaDevices`)
- `lib/speech.ts` — `speakBabelLine` resolves on `onend`, cancels on `cancel()`
- `data/lyrics.ts` (server) — deterministyczność dla tego samego seeda
- `lib/groq.ts` — JSON parse fallback gdy Llama zwróci śmiecia

### 7.2 E2E (Playwright)

Główny user flow:

```ts
test('child creates a song', async ({ page }) => {
  await page.goto('/');
  await page.click('button:has-text("ZACZNIJ ZABAWĘ")');
  // mock mic — Playwright permissions API
  await page.context().grantPermissions(['microphone']);
  await page.click('[aria-label*="mikrofon"]');
  await page.waitForTimeout(1000);
  await page.click('[aria-label*="mikrofon"]'); // stop
  await page.click('text=POP');
  await page.waitForSelector('text=KARAOKE');
  await page.click('[aria-label*="Odtwórz"]');
  // assert karaoke advances
});
```

### 7.3 Manual QA checklist

`docs/QA_CHECKLIST.md` — lista do odhaczania przed releasem (testowanie na 1366×768, mikrofon w 3 przeglądarkach, TTS jakość, karaoke sync).

---

## 8. Roadmapa wersji

| v       | Co                                                                                  | Effort |
| ------- | ----------------------------------------------------------------------------------- | ------ |
| **v0.1** (today) | Karaoke + procedural music + debug panel + Docker                          | DONE   |
| **v0.2** | Edge TTS, IndexedDB historia, tutorial overlay, Sentry, GitHub Actions CI, ESLint/Prettier, BabelMascot animowany | 2 tyg  |
| **v0.3** | i18n (PL+EN), share-link, cover art via Pollinations, share-modal, code-split        | 1 tydz |
| **v0.4** | Parental dashboard (kontrola treści, lista piosenek dziecka), content moderation, RODO consent flow | 2 tyg  |
| **v0.5** | E2E testy + Playwright w CI, accessibility audit (Lighthouse 95+), prefers-reduced-motion | 1 tydz |
| **v1.0** | Replicate MusicGen integration jako "Premium" feature, auth (Clerk free tier), domain + HTTPS via Caddy, public launch | 3 tyg  |

---

## 9. Ryzyka i znane bugi

| Ryzyko                                            | Severity | Mitigation                                     |
| ------------------------------------------------- | -------- | ---------------------------------------------- |
| TTS PL na Linux praktycznie niedostępne (espeak)  | High     | v0.2 → Edge TTS (server-side)                  |
| `SpeechSynthesis.onboundary` nieregularny per voice | Medium  | Edge TTS ma `<bookmark>` events — solid sync   |
| Procedural music brzmi "syntowo" — opinia rodzica | Medium   | v1.0 → Replicate MusicGen jako feature flag    |
| Web Audio na iOS Safari wymaga user gesture       | Low      | Już działa (kliknięcie play), test na iPad     |
| Brak rate limit → spalisz budżet Groq             | High     | v0.2 → `@fastify/rate-limit` + Cloudflare     |
| Llama generuje czasem nieadekwatny content        | Medium   | v0.4 → OpenAI Moderation API pre/post           |
| Bundle 396 KB, 3G slow zła UX                     | Low      | v0.3 → code-split per route                    |
| RODO compliance w prod jeśli EU launch            | High     | v0.4 → consent flow + DPA z Groq               |
| Brak fallbacku gdy Groq pada                      | Medium   | v0.2 → Gemini Flash backup w lyricsRouter      |
| Brak testów = każdy refactor ryzykiem regresji    | Medium   | v0.5 → Vitest minimum 60% coverage              |

---

## 10. Wskazówki dla zespołu zaczynającego

1. **Najpierw przeczytaj `rules.md` od deski do deski.** W razie konfliktu z tym dokumentem rules.md ma rację.
2. **Środowisko w 3 minuty:** `git clone && cd bubble && cp server/.env.example server/.env && nano server/.env && npm install && npm run dev:all`. Klucz Groq z [console.groq.com/keys](https://console.groq.com/keys) — bez karty.
3. **Architekturę masz w `MUSIC.md` i `DOCKER.md`** — jak chcesz zrozumieć dlaczego procedural i jak deployować.
4. **Debug panel (Cmd/Ctrl+\\)** to twój przyjaciel — widzisz każdy request do backendu, każdy prompt, każdy response.
5. **Nie commituj `.env`, `.DS_Store`, `dist/`, `node_modules/`.** `.gitignore` powinien wystarczyć, ale weryfikuj `git status` przed `git add .`.
6. **Komentarze w kodzie są PL** — autor (Kamil) preferuje czytelność dla zespołu PL. Jeśli rules.md mówi inaczej, idź wg rules.md.
7. **PR-y małe** — 1 feature = 1 PR. Refactor wielkich plików (np. PlayerScreen split) → osobny PR od logiki.
8. **Przed publicznym launchem MUSI być:** rate limiting, RODO consent, content moderation, HTTPS, Sentry. Nie skracaj.
9. **Najsłabsze miejsce dziś:** głos Bąbla (browser TTS). Drugie: brak persistencji. Trzecie: brak testów. Atakuj w tej kolejności.
10. **Zostaw kod lepszym niż znalazłeś.** Każdy plik który dotykasz ma wyjść z PR-a chociaż odrobinę bardziej zgodny z `rules.md`.
