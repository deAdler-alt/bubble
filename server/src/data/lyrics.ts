/**
 * Generator tekstów piosenek (FALLBACK gdy brak Groq).
 * Deterministyczny przy tym samym (prompt, style) — szkielety per styl
 * + bezpieczna inkorporacja promptu użytkownika.
 *
 * Bonus: `pickVibe(style)` zwraca rozsądny default vibe dla stylu,
 * używany gdy LLM padnie i lecimy z szablonu.
 */

import type { SongStyle, Vibe } from "../types.js";

const INTROS: Record<SongStyle, string[]> = {
  rock: [
    "Roooock! Hej hej, gitary grają!",
    "Pełna moc! Wzmacniacze do dechy!",
    "Wielki riff się rozpoczyna, brzmi jak burza!",
  ],
  kolysanka: [
    "Lu-li-la, lu-li-lu, śpij już słodko, mały Ty...",
    "Cicho, cicho, gwiazdy świecą...",
    "Księżyc gra na harfie srebrnej...",
  ],
  pop: [
    "Ty-dy-dy, Ty-dy-da! Disco świeci aż się skrzy!",
    "Świat się kręci, my tańczymy, błyski lecą zewsząd!",
    "Cukierkowa moc dziś gra, każdy dzisiaj gwiazdą jest!",
  ],
  hiphop: [
    "Yo yo yo! Bąbel w domu, ekipa wbija na bit!",
    "Mikrofon w dłoni, rytm w sercu, flow leci aż do gwiazd!",
    "Beatbox kręci, bas się trzęsie, ekipa pompa moc!",
  ],
};

const HOOKS: Record<SongStyle, string[]> = {
  rock: [
    "I tak ROCK się gra! Hej, krzycz razem ze mną!",
    "Gitara, perkusja, szaleństwo w każdym skoku!",
    "Wielki riff, wielki głos, niech zadrży dach!",
  ],
  kolysanka: [
    "Śpij już słodko, śpij...",
    "Zamknij oczka, dobranoc, snów moc Cię otuli...",
    "Mama jest tuż obok, śpij spokojnie do rana...",
  ],
  pop: [
    "Tańcz, tańcz, tańcz! Świat to wielka scena!",
    "Błyszcz jak gwiazda dnia, śpiewaj razem z nami!",
    "La-la-la, dziś świętujemy każdą minutę!",
  ],
  hiphop: [
    "I tak po prostu jest! Bąbel rządzi rapem dziś!",
    "Flow, flow, mikrofon mój, ekipa pompa razem!",
    "Bąbel w sercu, beat w głowie, każdy klaszcze w rytm!",
  ],
};

const OUTROS: Record<SongStyle, string[]> = {
  rock: [
    "Aaa-aa, jeszcze raz! Solo na finał, słyszysz?",
    "Encore, encore, gramy jeszcze raz!",
  ],
  kolysanka: [
    "Już śpisz słodko, dobranoc...",
    "Dobranoc, do rana, śnij kolorowo...",
  ],
  pop: [
    "Hit! Hit! Hit! Numer jeden dzisiaj!",
    "Tańczymy całą noc, nikt nas nie zatrzyma!",
  ],
  hiphop: [
    "Peace, ekipa! Bąbel out, mikrofon w dół!",
    "Yo, do następnego razu, trzymajcie się!",
  ],
};

const TITLE_PATTERN: Record<SongStyle, (subject: string) => string> = {
  rock: (s) => `${capitalize(s)} – rockowa moc`,
  kolysanka: (s) => `Słodka kołysanka o ${lowercase(s)}`,
  pop: (s) => `${capitalize(s)} (pop hit)`,
  hiphop: (s) => `${capitalize(s)} – freestyle Bąbla`,
};

function capitalize(s: string): string {
  if (!s) return "";
  return s.charAt(0).toLocaleUpperCase("pl-PL") + s.slice(1);
}

function lowercase(s: string): string {
  return s.toLocaleLowerCase("pl-PL");
}

/** Stabilny hash 32-bit (FNV-1a + djb2 mix) — żeby ten sam prompt dawał ten sam wybór. */
function seedFor(prompt: string, style: SongStyle): number {
  let h = 2166136261 >>> 0;
  const text = `${style}::${prompt}`;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

function pick<T>(arr: readonly T[], seed: number): T {
  return arr[seed % arr.length]!;
}

function sanitizeSubject(prompt: string): string {
  const trimmed = prompt.trim();
  if (!trimmed) return "nasza wesoła historia";
  const truncated = trimmed.length > 80 ? trimmed.slice(0, 80).trimEnd() + "…" : trimmed;
  return truncated;
}

export function buildLyrics(prompt: string, style: SongStyle): string[] {
  const subject = sanitizeSubject(prompt);
  const seed = seedFor(prompt, style);

  const intro = pick(INTROS[style], seed);
  const hook = pick(HOOKS[style], seed >>> 5);
  const outro = pick(OUTROS[style], seed >>> 11);

  return [
    intro,
    "Słuchaj, opowiem Ci dziś coś:",
    `${capitalize(subject)}!`,
    hook,
    "Bąbel miksuje, Ty się baw!",
    `${capitalize(subject)} – nasz ulubiony hit!`,
    hook,
    outro,
  ];
}

export function buildTitle(prompt: string, style: SongStyle): string {
  const subject = sanitizeSubject(prompt);
  return TITLE_PATTERN[style](subject);
}

export function approxDurationMs(lyrics: string[]): number {
  const perLine = 2200;
  return lyrics.length * perLine;
}

/** Default vibe dla stylu — używane gdy lecimy z szablonu (brak LLM). */
export function pickVibe(style: SongStyle): Vibe {
  switch (style) {
    case "rock":
      return "energetic";
    case "pop":
      return "playful";
    case "hiphop":
      return "energetic";
    case "kolysanka":
      return "dreamy";
  }
}
