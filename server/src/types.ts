export type SongStyle = "rock" | "kolysanka" | "pop" | "hiphop";

export const SONG_STYLES: readonly SongStyle[] = [
  "rock",
  "kolysanka",
  "pop",
  "hiphop",
] as const;

export type TranscribeResponse = {
  transcript: string;
};

export type GenerateSongBody = {
  prompt: string;
  style: SongStyle;
};

export type GeneratedSong = {
  audioUrl: string;
  lyrics: string[];
  title: string;
  style: SongStyle;
  durationMs: number;
};

export type HealthResponse = {
  status: "ok";
  uptimeMs: number;
  startedAt: string;
};
