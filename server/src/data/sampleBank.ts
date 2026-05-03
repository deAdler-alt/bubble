/**
 * Sample bank — kuratorowane CC0 utwory hostowane przez Pixabay Music CDN.
 * Wszystkie pozycje to muzyka instrumentalna bez wokalu, "kid-friendly".
 *
 * Pixabay Content License = de facto CC0: bez atrybucji, użycie komercyjne OK.
 * Linki bezpośrednie do plików MP3 — odporne na refer-check.
 *
 * Aby podmienić utwór:
 *   1. Wejdź na https://pixabay.com/music/
 *   2. Kliknij utwór → "Download" → skopiuj URL z `cdn.pixabay.com/audio/...`
 *   3. Wstaw poniżej zachowując shape `SampleEntry`.
 */

import type { SongStyle } from "../types.js";

export type SampleEntry = {
  url: string;
  title: string;
  /** Tylko dla logów / READMD; Pixabay nie wymaga atrybucji. */
  credit: string;
};

export const SAMPLE_BANK: Record<SongStyle, SampleEntry[]> = {
  rock: [
    {
      url: "https://cdn.pixabay.com/audio/2022/03/15/audio_e3b1b06c79.mp3",
      title: "Powerful Beat",
      credit: "Pixabay (CC0) — QubeSounds",
    },
    {
      url: "https://cdn.pixabay.com/audio/2024/05/24/audio_15e6ee8141.mp3",
      title: "Energetic Rock",
      credit: "Pixabay (CC0) — Music Unlimited",
    },
    {
      url: "https://cdn.pixabay.com/audio/2022/10/30/audio_6585cfd7c8.mp3",
      title: "Action Sport",
      credit: "Pixabay (CC0) — Lexin Music",
    },
  ],
  pop: [
    {
      url: "https://cdn.pixabay.com/audio/2023/09/15/audio_6dafe45c5b.mp3",
      title: "Happy Pop",
      credit: "Pixabay (CC0) — Music Unlimited",
    },
    {
      url: "https://cdn.pixabay.com/audio/2024/02/22/audio_ed5fbf68e5.mp3",
      title: "Upbeat Summer",
      credit: "Pixabay (CC0) — Daddy_s_Music",
    },
    {
      url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3",
      title: "Funky",
      credit: "Pixabay (CC0) — QubeSounds",
    },
  ],
  hiphop: [
    {
      url: "https://cdn.pixabay.com/audio/2024/04/12/audio_4d8d9c2bf6.mp3",
      title: "Lo-Fi Beat",
      credit: "Pixabay (CC0) — Daddy_s_Music",
    },
    {
      url: "https://cdn.pixabay.com/audio/2023/06/13/audio_56d0a7df30.mp3",
      title: "Chill Hip Hop",
      credit: "Pixabay (CC0) — Coma-Media",
    },
    {
      url: "https://cdn.pixabay.com/audio/2022/08/02/audio_2dde668d05.mp3",
      title: "Cool Beat",
      credit: "Pixabay (CC0) — penguinmusic",
    },
  ],
  kolysanka: [
    {
      url: "https://cdn.pixabay.com/audio/2024/02/05/audio_e9d5b4e8b7.mp3",
      title: "Sleepy Lullaby",
      credit: "Pixabay (CC0) — SoulProdMusic",
    },
    {
      url: "https://cdn.pixabay.com/audio/2023/01/30/audio_d0c6ff1bcd.mp3",
      title: "Soft Piano",
      credit: "Pixabay (CC0) — Lexin Music",
    },
    {
      url: "https://cdn.pixabay.com/audio/2022/03/24/audio_d0e4ad42b6.mp3",
      title: "Calm Music Box",
      credit: "Pixabay (CC0) — penguinmusic",
    },
  ],
};

/** Stabilny FNV-1a 32-bit hash. */
function hashString(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

/**
 * Wybiera utwór deterministycznie na bazie (prompt + style).
 * Ten sam input zawsze daje ten sam utwór — przewidywalne dla testów.
 */
export function pickSample(prompt: string, style: SongStyle): SampleEntry {
  const list = SAMPLE_BANK[style];
  if (!list || list.length === 0) {
    throw new Error(`Sample bank empty for style "${style}"`);
  }
  const idx = hashString(`${style}::${prompt}`) % list.length;
  return list[idx]!;
}
