/**
 * Wyłączona warstwa API — symulacja sieci przez setTimeout.
 * Backend podmienia implementacje; UI importuje wyłącznie stąd.
 */

export type SongStyle = "rock" | "kolysanka" | "pop" | "hiphop";

/** Publiczny próbnik MP3 (MDN) — działa w przeglądarce dla odtwarzacza mock. */
export const MOCK_SONG_AUDIO_URL =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3";

/** Drugi adres na mock ElevenLabs (ten sam lub krótki sample). */
export const MOCK_BABEL_VOICE_AUDIO_URL =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Symulacja włączenia mikrofonu. */
export function startRecordingSTT(): Promise<void> {
  return delay(520);
}

export type StopRecordingResult = {
  transcript: string;
};

/** Symulacja STT po zatrzymaniu nagrania — zwraca polski tekst. */
export async function stopRecordingSTT(
  _audioBlob?: Blob | null,
): Promise<StopRecordingResult> {
  await delay(720);
  return {
    transcript: "Piosenka o wielkim kocie",
  };
}

export type GeneratedSong = {
  audioUrl: string;
  lyrics: string[];
  title?: string;
};

const styleTitles: Record<SongStyle, string> = {
  rock: "Rockowy koci hit",
  kolysanka: "Słodka kołysanka",
  pop: "Popowy błysk",
  hiphop: "Hip-hopowy żarcik",
};

const baseLyrics: string[] = [
  "Oo-oo!",
  "Wielki kot idzie spacerkiem!",
  "Bąś i ja — na parkiecie!",
  "Śmiechy, skoki, sto punktów!",
  "Znów ten hit — gramy jeszcze raz!",
];

function lyricsFor(prompt: string, style: SongStyle): string[] {
  const hint = prompt.trim().slice(0, 32) || "Nasz kot";
  return [
    `(${styleTitles[style]})`,
    hint + "!",
    ...baseLyrics,
  ];
}

/** Symulacja generowania piosenki przez AI. */
export async function generateSong(
  prompt: string,
  style: SongStyle,
): Promise<GeneratedSong> {
  await delay(3100);
  return {
    audioUrl: MOCK_SONG_AUDIO_URL,
    lyrics: lyricsFor(prompt, style),
    title: styleTitles[style],
  };
}

/** Symulacja ElevenLabs — zwraca adres audio dla podanego tekstu. */
export async function getBabelVoice(text: string): Promise<{ audioUrl: string }> {
  void text;
  await delay(320);
  return { audioUrl: MOCK_BABEL_VOICE_AUDIO_URL };
}
