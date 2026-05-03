/**
 * `speakBabel` — wesoły polski głos Bąbla przez `window.speechSynthesis`.
 * Brak klucza, brak limitów — używa głosów systemowych.
 *
 * Próbuje znaleźć `pl-PL` voice; gdy brak — używa default + `lang="pl-PL"`
 * (większość systemów dobierze coś polskiego).
 *
 * Uwaga: `getVoices()` w Chrome ładuje się ASYNC po `voiceschanged`.
 */

export type SpeakOpts = {
  /** 0.5..2 — wyższe = bardziej dziecięcy. Default 1.35. */
  pitch?: number;
  /** 0.5..2 — szybkość mowy. Default 1.05. */
  rate?: number;
  /** 0..1 — głośność. Default 1. */
  volume?: number;
};

let cachedVoices: SpeechSynthesisVoice[] | null = null;

function loadVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  if (cachedVoices && cachedVoices.length > 0) return cachedVoices;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) cachedVoices = voices;
  return voices;
}

if (typeof window !== "undefined" && window.speechSynthesis) {
  window.speechSynthesis.addEventListener?.("voiceschanged", () => {
    cachedVoices = window.speechSynthesis.getVoices();
  });
}

function pickPolishVoice(): SpeechSynthesisVoice | null {
  const voices = loadVoices();
  if (voices.length === 0) return null;
  // priorytet: 1) lang === pl-PL, 2) lang startsWith "pl"
  const exact = voices.find((v) => v.lang.toLowerCase() === "pl-pl");
  if (exact) return exact;
  const pl = voices.find((v) => v.lang.toLowerCase().startsWith("pl"));
  return pl ?? null;
}

export function isSpeechSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.speechSynthesis !== "undefined" &&
    typeof window.SpeechSynthesisUtterance !== "undefined"
  );
}

export function speakBabel(text: string, opts: SpeakOpts = {}): void {
  if (!isSpeechSupported() || !text.trim()) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    const voice = pickPolishVoice();
    if (voice) u.voice = voice;
    u.lang = "pl-PL";
    u.pitch = clamp(opts.pitch ?? 1.35, 0.5, 2);
    u.rate = clamp(opts.rate ?? 1.05, 0.5, 2);
    u.volume = clamp(opts.volume ?? 1, 0, 1);
    window.speechSynthesis.cancel(); // przerwij poprzednią wypowiedź
    window.speechSynthesis.speak(u);
  } catch (err) {
    console.warn("[speech] speakBabel failed:", err);
  }
}

export function shutUpBabel(): void {
  if (!isSpeechSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* noop */
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
