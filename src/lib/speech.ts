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

/* ──────────────────────────────────────────────────────────
   speakBabelLine — wersja "karaoke":
     - zwraca { done: Promise, cancel: fn }
     - emituje onStart przy realnym starcie wypowiedzi
     - emituje onWord przy każdym word-boundary (Web Speech API)
   Gdy TTS niedostępny (lub voices się jeszcze nie załadowały
   i Chrome odrzuca utterance) — fallback "wirtualny" tyka
   timerem mniej więcej tak długo jak trwałaby mowa,
   żeby karaoke nadal się przewijało.
   ────────────────────────────────────────────────────────── */

export type SpeakLineOpts = SpeakOpts & {
  onStart?: () => void;
  /** wordIndex (0-based) słowa, charIndex w stringu utterance. */
  onWord?: (info: { wordIndex: number; charIndex: number }) => void;
};

export type SpeakLineHandle = {
  /** Resolves on natural end LUB po cancel. Reject tylko przy hard error. */
  done: Promise<void>;
  cancel: () => void;
};

export function speakBabelLine(
  text: string,
  opts: SpeakLineOpts = {},
): SpeakLineHandle {
  const trimmed = text.trim();
  if (!trimmed) {
    return { done: Promise.resolve(), cancel: () => {} };
  }

  if (!isSpeechSupported()) {
    return fallbackTimedSpeech(trimmed, opts);
  }

  let cancelled = false;
  let settled = false;
  let resolveDone!: () => void;
  let rejectDone!: (err: Error) => void;
  const done = new Promise<void>((res, rej) => {
    resolveDone = res;
    rejectDone = rej;
  });

  const u = new SpeechSynthesisUtterance(trimmed);
  const voice = pickPolishVoice();
  if (voice) u.voice = voice;
  u.lang = "pl-PL";
  u.pitch = clamp(opts.pitch ?? 1.35, 0.5, 2);
  u.rate = clamp(opts.rate ?? 1.0, 0.5, 2);
  u.volume = clamp(opts.volume ?? 1, 0, 1);

  let wordCounter = 0;
  u.onstart = () => {
    if (settled) return;
    opts.onStart?.();
  };
  u.onboundary = (ev) => {
    if (settled) return;
    if (ev.name === "word") {
      opts.onWord?.({ wordIndex: wordCounter, charIndex: ev.charIndex });
      wordCounter++;
    }
  };
  u.onend = () => {
    if (settled) return;
    settled = true;
    resolveDone();
  };
  u.onerror = (ev) => {
    if (settled) return;
    settled = true;
    if (cancelled) {
      resolveDone();
      return;
    }
    rejectDone(
      new Error(
        (ev as SpeechSynthesisErrorEvent).error || "speech synthesis error",
      ),
    );
  };

  try {
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch (err) {
    if (!settled) {
      settled = true;
      rejectDone(err as Error);
    }
  }

  return {
    done,
    cancel: () => {
      cancelled = true;
      try {
        window.speechSynthesis.cancel();
      } catch {
        /* noop */
      }
      if (!settled) {
        settled = true;
        resolveDone();
      }
    },
  };
}

/**
 * Fallback dla braku Web Speech: imituje timing wypowiedzi
 * tikając onWord tak jakby Bąbel mówił ~3 słowa/sekundę.
 * Pozwala karaoke wyglądać OK nawet bez TTS.
 */
function fallbackTimedSpeech(text: string, opts: SpeakLineOpts): SpeakLineHandle {
  const words = text.split(/\s+/);
  const wordMs = 380;
  let cancelled = false;
  let timer: number | undefined;
  const done = new Promise<void>((resolve) => {
    opts.onStart?.();
    let i = 0;
    const tick = () => {
      if (cancelled) return resolve();
      if (i >= words.length) return resolve();
      opts.onWord?.({ wordIndex: i, charIndex: 0 });
      i++;
      timer = window.setTimeout(tick, wordMs);
    };
    timer = window.setTimeout(tick, 100);
  });
  return {
    done,
    cancel: () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    },
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
