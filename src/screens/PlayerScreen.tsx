/**
 * PLAYER — KARAOKE Z BĄBLEM (procedural music, no external audio).
 *
 * Skład ekranu (od góry, dwie kolumny w środku):
 *   ┌─────────────────────────────────────────────────────────┐
 *   │  [DISCO BALL — w tle DJBoothBackdrop, top center]        │
 *   ├──────────────────────────────────┬──────────────────────┤
 *   │  [1] KARAOKE PANEL  (lewa)       │  [2] STAGE PANEL     │
 *   │      Spotify-like:               │   ┌────────┐         │
 *   │       past lines fade up         │   │ vinyl  │ (pod    │
 *   │       CURRENT line BIG WHITE     │   │  glow  │  kulą   │
 *   │       z highlightem słów         │   └────────┘  disco) │
 *   │       future lines below         │   TYTUŁ PIOSENKI     │
 *   │                                   │   [STYL] chip        │
 *   │                                   │   ▶ play/pause       │
 *   │                                   │   ║║║║║║║║ VU         │
 *   │                                   │   Linia 3 / 8        │
 *   │                                   │   [progress bar]     │
 *   ├──────────────────────────────────┴──────────────────────┤
 *   │  [3] FOOTER — restart CTA                                │
 *   └─────────────────────────────────────────────────────────┘
 *
 * MECHANIKA:
 *   - **Muzyka tła PROCEDURAL** — `lib/musicGen.ts` generuje akompaniament
 *     in-browser (Web Audio API). Per-styl: rock/pop/hiphop/kolysanka.
 *     Vibe (energetic/playful/calm/dreamy) transponuje tonację.
 *     Seedowane prompt-em → ten sam prompt = ten sam utwór.
 *   - **Bąbel śpiewa**: Web Speech API — każda linia osobno.
 *       * onStart → reset highlightu słów
 *       * onWord  → highlight kolejnego słowa
 *       * onEnd   → pauza LINE_GAP_MS, następna linia
 *   - Ducking: muzyka idzie do BACKGROUND_VOLUME gdy Bąbel śpiewa,
 *     do FOREGROUND_VOLUME gdy idle.
 *   - Pause/Stop: `cancel()` na aktywnym handle TTS + `track.stop()`.
 *   - Resume: kontynuujemy od `lineIndex` (state).
 */

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Music, Pause, Play, RotateCcw } from "lucide-react";
import type { GeneratedSong, SongStyle } from "../api/djApi";
import { FlyingNotesOverlay } from "../components/FlyingNotesOverlay";
import {
  createBackingTrack,
  type BackingTrack,
  type MusicStyle,
  type Vibe,
} from "../lib/musicGen";
import { shutUpBabel, speakBabelLine, type SpeakLineHandle } from "../lib/speech";
import { VinylButton } from "../components/VinylButton";
import { screenPlayerRoot } from "./screenLayout";
import {
  PRIMARY_CTA_BORDER,
  PRIMARY_CTA_FOCUS,
  PRIMARY_CTA_GRADIENT,
  PRIMARY_CTA_GRADIENT_ACTIVE,
  PRIMARY_CTA_SHADOW,
  PRIMARY_CTA_TEXT,
} from "../theme/primaryCta";

/* ╔════════════════════════════════════════════════════════════╗
   ║  TUNABLES — pokrętła szybkiej regulacji                   ║
   ╚════════════════════════════════════════════════════════════╝ */

/** Głośność procedural music GDY Bąbel śpiewa (0–1). Niżej = wyraźniejszy głos. */
const BACKGROUND_VOLUME = 0.18;

/** Głośność muzyki gdy Bąbel milczy (idle/po skończeniu). */
const FOREGROUND_VOLUME = 0.55;

/** Pauza między dwoma linijkami karaoke (ms). */
const LINE_GAP_MS = 320;

/** Pitch głosu Bąbla (0.5–2). Wyżej = bardziej dziecięcy/zabawny. */
const BABEL_PITCH = 1.4;

/** Tempo wypowiedzi Bąbla (0.5–2). 1.0 = normalne. */
const BABEL_RATE = 0.95;

/** Ile linijek POPRZEDNICH widać w karaoke. */
const VISIBLE_PAST = 3;

/** Ile linijek NASTĘPNYCH widać w karaoke. */
const VISIBLE_FUTURE = 4;

/** Wysokość pojedynczej linijki w pikselach (responsywnie skalowana niżej). */
const LINE_HEIGHT_MIN = 56;
const LINE_HEIGHT_MAX = 96;
const LINE_HEIGHT_VH = 0.085;

/* ╔════════════════════════════════════════════════════════════╗
   ║  KOMPONENT GŁÓWNY                                         ║
   ╚════════════════════════════════════════════════════════════╝ */

type PlayerScreenProps = {
  song: GeneratedSong;
  onRestart: () => void;
};

export function PlayerScreen({ song, onRestart }: PlayerScreenProps) {
  const trackRef = useRef<BackingTrack | null>(null);
  const [playing, setPlaying] = useState(false);
  const [lineIndex, setLineIndex] = useState(0);
  const [wordIndex, setWordIndex] = useState(0);
  const lineIndexRef = useRef(0);
  const vinylPx = useStageSize({ vw: 0.16, vh: 0.28, min: 180, max: 280 });
  const lineH = useResponsiveLineHeight();
  const prefersReducedMotion = !!useReducedMotion();

  useEffect(() => {
    lineIndexRef.current = lineIndex;
  }, [lineIndex]);

  // Cleanup TTS i muzyki na unmount.
  useEffect(() => {
    return () => {
      shutUpBabel();
      trackRef.current?.stop();
      trackRef.current = null;
    };
  }, []);

  // RESET przy zmianie utworu.
  useEffect(() => {
    setPlaying(false);
    setLineIndex(0);
    setWordIndex(0);
    lineIndexRef.current = 0;
    shutUpBabel();
    trackRef.current?.stop();
    trackRef.current = null;
  }, [song.title, song.lyrics]);

  /* ── KARAOKE LOOP ── */
  useEffect(() => {
    if (!playing) return;
    let cancelled = false;
    let activeHandle: SpeakLineHandle | null = null;

    trackRef.current?.setVolume(BACKGROUND_VOLUME);

    async function loop() {
      for (let i = lineIndexRef.current; i < song.lyrics.length; i++) {
        if (cancelled) return;
        setLineIndex(i);
        setWordIndex(0);
        const line = (song.lyrics[i] ?? "").trim();
        if (!line) continue;

        const handle = speakBabelLine(line, {
          pitch: BABEL_PITCH,
          rate: BABEL_RATE,
          onStart: () => setWordIndex(0),
          onWord: ({ wordIndex: w }) => setWordIndex(w + 1),
        });
        activeHandle = handle;
        try {
          await handle.done;
        } catch {
          /* ignore, continue */
        }
        if (cancelled) return;
        await new Promise((r) => window.setTimeout(r, LINE_GAP_MS));
      }
      // Karaoke skończone naturalnie → idle.
      if (!cancelled) {
        setPlaying(false);
        trackRef.current?.setVolume(FOREGROUND_VOLUME);
      }
    }

    void loop();

    return () => {
      cancelled = true;
      activeHandle?.cancel();
      trackRef.current?.setVolume(FOREGROUND_VOLUME);
    };
  }, [playing, song.lyrics]);

  const playTrack = useCallback(async () => {
    setPlaying(true);
    if (!trackRef.current) {
      trackRef.current = createBackingTrack({
        prompt: song.title + " " + song.lyrics.join(" "),
        style: song.style as MusicStyle,
        vibe: song.vibe as Vibe,
        initialVolume: BACKGROUND_VOLUME,
      });
    }
    try {
      await trackRef.current.start();
      trackRef.current.setVolume(BACKGROUND_VOLUME);
    } catch (err) {
      console.warn("[player] backing track failed:", err);
    }
  }, [song.title, song.lyrics, song.style, song.vibe]);

  const pauseTrack = useCallback(() => {
    setPlaying(false);
    shutUpBabel();
    trackRef.current?.stop();
    trackRef.current = null;
  }, []);

  /**
   * Stabilne handlery dla `StagePanel` i `RestartButton` — bez tego inline arrow
   * tworzony przy każdym renderze przebija `memo()` na dzieciach.
   */
  const playingRef = useRef(playing);
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);
  const onToggle = useCallback(() => {
    if (playingRef.current) pauseTrack();
    else void playTrack();
  }, [playTrack, pauseTrack]);
  const onRestartHandler = useCallback(() => {
    pauseTrack();
    onRestart();
  }, [pauseTrack, onRestart]);

  return (
    <motion.div
      key="player"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.42 }}
      className={screenPlayerRoot}
    >
      <FlyingNotesOverlay reducedMotion={prefersReducedMotion} />
      {/* GRID ekranu: [karaoke | stage] / footer.
          Header zniknął — tytuł żyje teraz w StagePanel POD winylem,
          który stoi POD kulą disco z DJBoothBackdrop.
          Skalowanie: kontener jak StyleScreen — `min(100%,94vw,90rem)`. */}
      <div className="mx-auto grid h-full w-full max-w-[min(100%,94vw,90rem)] grid-rows-[minmax(0,1fr)_auto] gap-[clamp(0.6rem,1.4dvh,1.6rem)] px-[clamp(0.75rem,2vw,2.25rem)] pt-[clamp(7rem,14dvh,10rem)] pb-[max(env(safe-area-inset-bottom),12px)]">
        {/* ═══ [1]+[2] MAIN ═══ */}
        <div className="grid min-h-0 grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-[clamp(1rem,2.4vw,2.75rem)]">
          <KaraokePanel
            lyrics={song.lyrics}
            lineIndex={lineIndex}
            wordIndex={wordIndex}
            playing={playing}
            lineH={lineH}
          />
          <StagePanel
            vinylPx={vinylPx}
            playing={playing}
            onToggle={onToggle}
            title={song.title}
            style={song.style}
            vibe={song.vibe}
            lineCount={song.lyrics.length}
            currentLine={lineIndex}
          />
        </div>

        {/* ═══ [3] FOOTER — RESTART ═══ */}
        <RestartButton onRestart={onRestartHandler} />
      </div>
    </motion.div>
  );
}

/* ╔════════════════════════════════════════════════════════════╗
   ║  [1] KARAOKE PANEL — Spotify-like scroller (LEWA)         ║
   ╚════════════════════════════════════════════════════════════╝ */

const KaraokePanel = memo(function KaraokePanel({
  lyrics,
  lineIndex,
  wordIndex,
  playing,
  lineH,
}: {
  lyrics: string[];
  lineIndex: number;
  wordIndex: number;
  playing: boolean;
  lineH: number;
}) {
  /**
   * Wytnij okno widocznych linii raz na zmianę `lineIndex`/`lyrics` — nie iterujemy
   * po całych lyrics przy każdym wordIndex (który tyka per słowo TTS).
   */
  const visible = useMemo(() => {
    const out: {
      idx: number;
      line: string;
      offset: number;
      key: string;
    }[] = [];
    const start = Math.max(0, lineIndex - VISIBLE_PAST);
    const end = Math.min(lyrics.length - 1, lineIndex + VISIBLE_FUTURE);
    for (let idx = start; idx <= end; idx++) {
      const line = lyrics[idx] ?? "";
      out.push({
        idx,
        line,
        offset: idx - lineIndex,
        key: `${idx}-${line.slice(0, 12)}`,
      });
    }
    return out;
  }, [lyrics, lineIndex]);

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[2rem] border-[7px] border-black bg-linear-to-b from-fuchsia-950/80 via-purple-950/75 to-slate-950/85 p-[clamp(0.75rem,1.5vw,1.5rem)] shadow-[0_14px_0_0_black] ring-4 ring-fuchsia-500/60">
      {/* ── Pasek górny: badge KARAOKE + status ── */}
      <div className="mb-[clamp(0.5rem,1.2dvh,1rem)] flex items-center justify-between gap-2">
        <span
          className="rounded-full border-[4px] border-black bg-yellow-300 px-3 py-1 font-black uppercase tracking-widest text-black shadow-[0_4px_0_0_black]"
          style={{ fontSize: "clamp(0.7rem, 1.05vw, 0.95rem)" }}
        >
          ♪ KARAOKE
        </span>
        <span
          className={[
            "rounded-full border-[4px] border-black px-3 py-1 font-black uppercase tracking-widest text-black shadow-[0_4px_0_0_black]",
            playing
              ? `${PRIMARY_CTA_GRADIENT_ACTIVE} text-white animate-pulse`
              : PRIMARY_CTA_GRADIENT,
          ].join(" ")}
          style={{ fontSize: "clamp(0.7rem, 1.05vw, 0.95rem)" }}
        >
          {playing ? "● BĄBEL ŚPIEWA" : "▶ NACIŚNIJ PLAY"}
        </span>
      </div>

      {/* ── Wskaźnik centrum ── */}
      <div className="pointer-events-none absolute left-0 right-0 top-1/2 z-0 h-px -translate-y-1/2 bg-linear-to-r from-transparent via-yellow-300/40 to-transparent" />

      {/* ── Stream linijek ── */}
      <div className="relative flex-1 overflow-hidden">
        {/* Maska fadeująca góra + dół */}
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background:
              "linear-gradient(to bottom, rgba(20,10,40,1) 0%, rgba(20,10,40,0) 16%, rgba(20,10,40,0) 84%, rgba(20,10,40,1) 100%)",
          }}
        />

        {visible.map(({ key, line, offset }) => {
          const isCurrent = offset === 0;
          if (isCurrent) {
            return (
              <CurrentLineRow
                key={key}
                line={line}
                wordIndex={wordIndex}
                lineH={lineH}
              />
            );
          }
          return <OtherLineRow key={key} line={line} offset={offset} lineH={lineH} />;
        })}
      </div>
    </div>
  );
});

/**
 * Wiersz „NIE aktualnie śpiewana linia”. Memoizujemy — przy zmianie wordIndex
 * te linie nie wchodzą w rekoncyliację (props się nie zmieniają).
 */
const OtherLineRow = memo(function OtherLineRow({
  line,
  offset,
  lineH,
}: {
  line: string;
  offset: number;
  lineH: number;
}) {
  const opacity = Math.max(0.18, 1 - Math.abs(offset) * 0.22);
  const tint = offset < 0 ? "text-white/55" : "text-yellow-100/55";
  return (
    <motion.div
      className="absolute left-0 right-0 top-1/2 px-3 text-center"
      initial={false}
      animate={{ y: offset * lineH - lineH / 2, opacity, scale: 0.78 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      style={{
        fontFamily:
          "'Bungee',Impact,Haettenschweiler,ui-sans-serif,system-ui,sans-serif",
        fontSize: "clamp(0.95rem, 2.35vmin, 1.75rem)",
        lineHeight: 1.12,
        letterSpacing: "0.04em",
        willChange: "transform, opacity",
      }}
    >
      <span className={tint}>{line}</span>
    </motion.div>
  );
});

/** Aktualnie śpiewana linia (kontener animacji slide + highlight słów). */
function CurrentLineRow({
  line,
  wordIndex,
  lineH,
}: {
  line: string;
  wordIndex: number;
  lineH: number;
}) {
  return (
    <motion.div
      className="absolute left-0 right-0 top-1/2 px-3 text-center"
      initial={false}
      animate={{ y: -lineH / 2, opacity: 1, scale: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      style={{
        fontFamily:
          "'Bungee',Impact,Haettenschweiler,ui-sans-serif,system-ui,sans-serif",
        fontSize: "clamp(1.45rem, 3.6vmin, 2.85rem)",
        lineHeight: 1.12,
        letterSpacing: "0.04em",
        willChange: "transform",
      }}
    >
      <CurrentLine line={line} wordIndex={wordIndex} />
    </motion.div>
  );
}

/** Aktualnie śpiewana linia z highlightem słów. */
const CurrentLine = memo(function CurrentLine({
  line,
  wordIndex,
}: {
  line: string;
  wordIndex: number;
}) {
  const parts = useMemo(() => line.split(/(\s+)/), [line]);
  let renderedWordIdx = 0;
  return (
    <span className="font-black drop-shadow-[0_4px_0_rgba(0,0,0,0.85)]">
      {parts.map((part, i) => {
        if (/^\s+$/.test(part)) return <span key={i}>{part}</span>;
        const myIdx = renderedWordIdx++;
        const sung = myIdx < wordIndex;
        const current = myIdx === wordIndex;
        const colorClass = sung
          ? "text-white"
          : current
            ? "text-yellow-300"
            : "text-white/45";
        return (
          <motion.span
            key={i}
            className={colorClass}
            animate={
              current
                ? {
                    scale: 1.06,
                    textShadow: "0 0 18px rgba(255,255,255,0.85)",
                  }
                : { scale: 1, textShadow: "0 0 0 rgba(255,255,255,0)" }
            }
            transition={{ duration: 0.18 }}
          >
            {part}
          </motion.span>
        );
      })}
    </span>
  );
});

/* ╔════════════════════════════════════════════════════════════╗
   ║  [2] STAGE PANEL — winyl (POD kulą disco) + tytuł + ster. ║
   ║  Tytuł utworu siedzi BEZPOŚREDNIO pod winylem.            ║
   ╚════════════════════════════════════════════════════════════╝ */

const STYLE_LABELS: Record<SongStyle, string> = {
  rock: "ROCK",
  pop: "POP",
  hiphop: "HIP-HOP",
  kolysanka: "KOŁYSANKA",
};

const VIBE_LABELS: Record<Vibe, string> = {
  energetic: "ENERGETIC",
  playful: "PLAYFUL",
  calm: "CALM",
  dreamy: "DREAMY",
};

const StagePanel = memo(function StagePanel({
  vinylPx,
  playing,
  onToggle,
  title,
  style,
  vibe,
  lineCount,
  currentLine,
}: {
  vinylPx: number;
  playing: boolean;
  onToggle: () => void;
  title: string;
  style: SongStyle;
  vibe: Vibe;
  lineCount: number;
  currentLine: number;
}) {
  const progress =
    lineCount > 0 ? Math.min(100, ((currentLine + 1) / lineCount) * 100) : 0;
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-start gap-[clamp(0.6rem,1.4dvh,1.4rem)] rounded-[2rem] border-[7px] border-black bg-linear-to-b from-amber-300/15 via-transparent to-fuchsia-500/15 p-[clamp(0.75rem,1.5vw,1.5rem)] shadow-[0_14px_0_0_rgba(0,0,0,0.55)]">
      {/* ── Winyl (POD kulą disco z backdropu) ── */}
      <div className="relative shrink-0">
        <SpinningGlow size={vinylPx} active={playing} />
        <VinylButton
          size={vinylPx}
          spinning={playing}
          onClick={onToggle}
          ariaLabel={playing ? "Pauza na płycie" : "Odtwórz na płycie"}
          label="♪"
        />
      </div>

      {/* ── TYTUŁ PIOSENKI (pod winylem) ── */}
      <h1
        className="text-center font-black uppercase"
        style={{
          fontFamily:
            "'Bungee',Impact,Haettenschweiler,ui-sans-serif,system-ui,sans-serif",
          fontSize: "clamp(1.1rem, min(2.2vw, 3.2dvh), 2rem)",
          letterSpacing: "0.08em",
          lineHeight: 1.05,
          backgroundImage:
            "linear-gradient(170deg,#fff,#fde68a 30%,#fb7185 70%,#7e22ce)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          textShadow:
            "0 6px 0 rgba(0,0,0,0.85), 0 0 32px rgba(244,114,182,0.4)",
        }}
      >
        {title}
      </h1>

      {/* ── Chip stylu + vibe ── */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-full border-[4px] border-black bg-black/85 px-3 py-1 font-black uppercase tracking-[0.18em] text-yellow-300 shadow-[0_4px_0_0_black]"
          style={{ fontSize: "clamp(0.65rem, 1vw, 0.85rem)" }}
        >
          <Music className="size-3 stroke-[3]" />
          {STYLE_LABELS[style]}
        </span>
        <span
          className="rounded-full border-[4px] border-black bg-fuchsia-500 px-3 py-1 font-black uppercase tracking-[0.18em] text-white shadow-[0_4px_0_0_black]"
          style={{ fontSize: "clamp(0.65rem, 1vw, 0.85rem)" }}
        >
          {VIBE_LABELS[vibe]}
        </span>
      </div>

      {/* ── Główny play/pause pad ── */}
      <PadButton
        ariaLabel={playing ? "Pauza" : "Odtwórz"}
        onClick={onToggle}
        className={playing ? PRIMARY_CTA_GRADIENT_ACTIVE : PRIMARY_CTA_GRADIENT}
      >
        {playing ? (
          <Pause
            className="stroke-[3] text-black drop-shadow-[0_4px_0_rgba(255,255,255,0.4)]"
            style={{ width: "60%", height: "60%" }}
          />
        ) : (
          <Play
            className="ml-[8%] stroke-[3] text-black drop-shadow-[0_4px_0_rgba(255,255,255,0.4)]"
            style={{ width: "55%", height: "55%" }}
          />
        )}
      </PadButton>

      {/* ── VU meter (animowane słupki) ── */}
      <VuMeter active={playing} />

      {/* ── Progress: linia X z N ── */}
      <div className="flex w-full flex-col items-center gap-1">
        <div
          className="text-center font-black uppercase tracking-[0.18em] text-yellow-200"
          style={{ fontSize: "clamp(0.65rem, 0.95vw, 0.9rem)" }}
        >
          Linia {Math.min(currentLine + 1, lineCount)} / {lineCount}
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full border-2 border-black bg-black/60">
          <motion.div
            className="h-full bg-linear-to-r from-cyan-400 via-fuchsia-500 to-yellow-300"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
});

/** Animowane słupki VU. */
const VU_BAR_COUNT = 11;
const VU_BARS = Array.from({ length: VU_BAR_COUNT }, (_, i) => i);
const VuMeter = memo(function VuMeter({ active }: { active: boolean }) {
  return (
    <div className="flex items-end gap-[3px]" aria-hidden>
      {VU_BARS.map((i) => (
        <motion.span
          key={i}
          className="w-[clamp(0.35rem,0.8vw,0.65rem)] rounded-sm bg-linear-to-t from-fuchsia-500 via-amber-300 to-cyan-300 ring-2 ring-black"
          style={{
            height: "clamp(1.1rem, 3dvh, 2.2rem)",
            transformOrigin: "bottom",
            willChange: "transform",
          }}
          animate={
            active
              ? { scaleY: [0.3, 0.55 + ((i * 37) % 45) / 100, 0.3] }
              : { scaleY: 0.3 }
          }
          transition={{
            duration: 0.45 + (i % 4) * 0.08,
            repeat: active ? Infinity : 0,
            ease: "easeInOut",
            delay: i * 0.05,
          }}
        />
      ))}
    </div>
  );
});

/* ╔════════════════════════════════════════════════════════════╗
   ║  [3] RESTART — kolorowy CTA na dole                        ║
   ╚════════════════════════════════════════════════════════════╝ */

const RestartButton = memo(function RestartButton({
  onRestart,
}: {
  onRestart: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onRestart}
      className={[
        "mx-auto w-[min(96vw,46rem)] rounded-[2.5rem] px-[clamp(1.5rem,3vw,3rem)] py-[clamp(0.75rem,1.6dvh,1.2rem)]",
        PRIMARY_CTA_BORDER,
        PRIMARY_CTA_GRADIENT,
        PRIMARY_CTA_TEXT,
        PRIMARY_CTA_SHADOW,
        PRIMARY_CTA_FOCUS,
      ].join(" ")}
      style={{ fontSize: "clamp(1rem, 1.8vw, 1.5rem)" }}
      whileHover={{
        scale: 1.04,
        y: -4,
        boxShadow:
          "0 14px 0 0 #000, 0 0 52px rgba(250,204,21,0.85), 0 0 88px rgba(251,146,60,0.55)",
      }}
      whileTap={{ scale: 0.96, y: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 22 }}
    >
      <span className="inline-flex items-center justify-center gap-3">
        <RotateCcw className="size-[clamp(1.1rem,1.8vw,1.5rem)] shrink-0 stroke-[3]" />
        Zróbmy nową piosenkę!
      </span>
    </motion.button>
  );
});

/* ╔════════════════════════════════════════════════════════════╗
   ║  Pomocnicze komponenty + hooki                            ║
   ╚════════════════════════════════════════════════════════════╝ */

const SpinningGlow = memo(function SpinningGlow({
  size,
  active,
}: {
  size: number;
  active: boolean;
}) {
  const d = size + 60;
  return (
    <motion.div
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
      style={{
        width: d,
        height: d,
        background:
          "conic-gradient(from 0deg, rgba(244,114,182,0.45), rgba(56,189,248,0.45), rgba(250,204,21,0.45), rgba(244,114,182,0.45))",
        filter: "blur(24px)",
        willChange: "transform, opacity",
      }}
      animate={
        active
          ? { rotate: 360, opacity: [0.7, 1, 0.7] }
          : { rotate: 0, opacity: 0.4 }
      }
      transition={
        active
          ? {
              rotate: { duration: 8, repeat: Infinity, ease: "linear" },
              opacity: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
            }
          : undefined
      }
    />
  );
});

const PadButton = memo(function PadButton({
  children,
  onClick,
  className,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  className: string;
  ariaLabel: string;
}) {
  return (
    <motion.button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={[
        "flex shrink-0 items-center justify-center rounded-[40%_60%_45%_55%] border-[7px] border-black shadow-[0_12px_0_0_rgba(0,0,0,0.85)] outline-none focus-visible:ring-[6px] focus-visible:ring-yellow-300",
        className,
      ].join(" ")}
      style={{
        width: "clamp(3.75rem, 6.5vw, 5.5rem)",
        height: "clamp(3.75rem, 6.5vw, 5.5rem)",
        willChange: "transform",
      }}
      whileHover={{ scale: 1.08, y: -4 }}
      whileTap={{ scale: 0.92, y: 0 }}
    >
      {children}
    </motion.button>
  );
});

/** Responsywna wysokość linii w karaoke — listener z `passive: true`. */
function useResponsiveLineHeight(): number {
  const [h, setH] = useState(72);
  useLayoutEffect(() => {
    const calc = () => {
      const px = Math.round(window.innerHeight * LINE_HEIGHT_VH);
      setH(Math.min(LINE_HEIGHT_MAX, Math.max(LINE_HEIGHT_MIN, px)));
    };
    calc();
    window.addEventListener("resize", calc, { passive: true });
    return () => window.removeEventListener("resize", calc);
  }, []);
  return h;
}

function useStageSize({
  vw,
  vh,
  min,
  max,
}: {
  vw: number;
  vh: number;
  min: number;
  max: number;
}) {
  const [size, setSize] = useState(Math.round((min + max) / 2));
  useLayoutEffect(() => {
    const calc = () => {
      const s = Math.min(window.innerWidth * vw, window.innerHeight * vh);
      setSize(Math.min(max, Math.max(min, Math.round(s))));
    };
    calc();
    window.addEventListener("resize", calc, { passive: true });
    return () => window.removeEventListener("resize", calc);
  }, [vw, vh, min, max]);
  return size;
}
