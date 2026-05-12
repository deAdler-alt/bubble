# Muzyka — dlaczego procedural, a nie Suno

Pytanie: skoro koncept aplikacji to "Suno-like dla dzieciaków", to czemu nie podpinamy modelu generatywnego (Suno, MusicGen, Riffusion)?

## TL;DR

| Opcja                          | Latencja  | Koszt    | Niezawodność | Per-prompt unique | Wybrana? |
| ------------------------------ | --------- | -------- | ------------ | ----------------- | -------- |
| **Suno API**                   | 30-60 s   | $-$$     | Średnia      | Tak               | ✗ (no free tier, payment wall) |
| **MusicGen via HuggingFace**   | 30-90 s   | Free*    | Niska (queue)| Tak               | ✗ (zbyt wolne dla 5-latka) |
| **MusicGen self-hosted (GPU)** | ~5-15 s   | $$$ (GPU)| Wysoka       | Tak               | ✗ (wymaga GPU runtime) |
| **Sample bank (Pixabay)**      | Instant   | Free     | **DEAD**     | Nie (pre-built)   | ✗ (próbowaliśmy: 11/12 URL = 403) |
| **Procedural Web Audio API**   | Instant   | Free     | 100%         | Tak (seed=hash)   | ✓ **AKTUALNE** |

\* HuggingFace Inference API ma rate limits ~10 req/h dla free, plus 30-90s w kolejce.

## Co dostajemy z procedural

Plik [`src/lib/musicGen.ts`](src/lib/musicGen.ts) generuje akompaniament in-browser na bazie:

- **`style`** — rock / pop / hiphop / kolysanka — definiuje BPM, paterny perkusji, instrumenty.
- **`vibe`** — energetic / playful / calm / dreamy — transponuje tonację (±semitonowe shift), dobrane przez Groq Llama z tematu piosenki.
- **`prompt`** — hashowany do seedu → ten sam prompt zawsze daje ten sam aranż (deterministyczne dla testów).

| Style    | BPM | Drums            | Akordy (default C major) | Instrumenty         |
| -------- | --- | ---------------- | ------------------------ | ------------------- |
| rock     | 130 | kick+snare 4/4   | I-V-vi-IV (C-G-Am-F)     | power chord, bass, lead |
| pop      | 120 | four-on-the-floor| vi-IV-I-V (Am-F-C-G)     | piano arp, sparkle  |
| hiphop   | 90  | boom-bap         | i-VII-VI-VII (Am-G-F-G)  | sub bass, lo-fi pad |
| kolysanka| 60  | brak             | I-vi-ii-V (C-Am-Dm-G)    | pad, music-box      |

Engine: ~60 linii Web Audio API (oscillators, gain envelopes, biquad filtry, lekki kompresor master). Drumy: kick = sine z pitch envelope, snare = noise+bandpass+ton, hi-hat = noise+highpass.

## Wady — bądź uczciwy

1. **Nie brzmi jak Suno** — to oczywiste, syntezujemy z gołych oscylatorów.
2. **Brak wokalu w samej muzyce** — wokal robi Bąbel przez Web Speech API (TTS).
3. **Brak miksu studyjnego** — żadnego masteringu, reverbu, sidechain compression.

Dla 5-latka i MVP to **akceptowalne** — dzieciak ma przede wszystkim usłyszeć że jego prompt zamienił się w piosenkę z konkretną melodią i że Bąbel ją "śpiewa". Wartość edukacyjna i frajda są tam.

## Roadmapa: gdy będziemy chcieli "prawdziwą" muzykę

Najlżejsza ścieżka to **MusicGen via Replicate** ($0.005 per generation, ~5s):

```ts
// bubble/server/src/lib/musicgen.ts (przyszły plik)
import Replicate from "replicate";
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

export async function generateMusicTrack(promptDesc: string): Promise<string> {
  const output = await replicate.run("meta/musicgen:671ac645...", {
    input: {
      prompt: promptDesc,        // np. "happy upbeat children pop, 120bpm, piano"
      duration: 30,
      output_format: "mp3",
    },
  });
  return output as string; // mp3 URL
}
```

Backend zmienia `audioMode` na `"url"` + zwraca `audioUrl`. Frontend już to obsługuje (`PlayerScreen` ma fallback na `<audio>` jak `audioMode === "url"` — szkielet jest, dziś po prostu zawsze procedural).

Pre-cache na poziomie LLM: zamiast trzymać `prompt` luzem, Llama może generować dodatkowe pole `musicPrompt: "happy 120bpm children pop with piano and light drums"` które idzie do MusicGen. Backend trzyma cache `hash(musicPrompt) → mp3 URL` (Redis / lokalny dysk) — kolejne generacje tego samego mood'u są instant.

Koszt orientacyjnie: 1000 piosenek/dzień × $0.005 = $5/dzień = **~$150/miesiąc**. Replicate ma $10 wolnych kredytów do testów.

## Hostowanie własnych sampli (alternatywa nieautomatyczna)

Jeśli chcesz drogę "Spotify-jak-Spotify" bez API:

1. Kupić licencję na ~50 stockowych instrumentaliów dla dzieci (np. AudioJungle, ~$2-15/track).
2. Przekonwertować do mp3 ~30s każdy (loopable).
3. Wrzucić do `bubble/public/music/`, otagować `{style, vibe, bpm}` w JSON.
4. Backend wybiera deterministycznie po `hash(prompt + style + vibe)`.

Plus: 100% reliability (lokalne pliki), brzmią profesjonalnie. Minus: jednorazowy koszt, brak per-prompt uniqueness, w Dockerze obrazek puchnie o ~50-200 MB.

Procedural jest dla MVP zwycięskim kompromisem — możemy zawsze dorzucić tę warstwę później.
