/**
 * START — desktop hero, all-in-one (no scroll).
 * Skład ekranu (od góry do dołu):
 *   ┌─────────── [1] BLOK TYTUŁU ───────────┐
 *   │  „DJ BAIBEL" + podtytuł                │
 *   ├─────────── [2] STAGE (środek) ─────────┤
 *   │  WIELKI WINYL = przycisk Start         │
 *   │  Bąbel z dymkiem POWOLI LATA           │
 *   │  pod spodem CHIP „Naciśnij Płytę"      │
 *   ├─────────── [3] PASEK PULSACJI ─────────┤
 *   │  EQ bars u dołu ekranu                 │
 *   └────────────────────────────────────────┘
 *
 * Najczęstsze pokrętła do regulacji są w bloku TUNABLES poniżej —
 * ZMIEŃ JE TUTAJ żeby przesunąć/przeskalować elementy.
 */

import {
  useLayoutEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import {
  motion,
  useReducedMotion,
} from "framer-motion";
import { VinylButton } from "../components/VinylButton";
import { screenStartRoot } from "./screenLayout";

/* ╔════════════════════════════════════════════════════════════╗
   ║  TUNABLES — najczęściej zmieniane wartości ekranu         ║
   ║  (styl CSS w stringach: clamp(min, preferred, max))       ║
   ╚════════════════════════════════════════════════════════════╝ */

/** Odstęp całego BLOKU TYTUŁU od górnej krawędzi ekranu.
 *  Zwiększ żeby OBNIŻYĆ „DJ BAIBEL" + podtytuł. */
const TITLE_TOP_OFFSET = "clamp(3rem, 12dvh, 9rem)";

/** Wysokość pasującego do dołu ekranu PASKA PULSACJI (EQ bars).
 *  Zwiększ żeby pulsacje były WIĘKSZE / sięgały wyżej. */
const EQ_BARS_HEIGHT = "clamp(7rem, 22dvh, 14rem)";

/** Liczba słupków EQ na dole ekranu — mniej = grubsze, więcej = drobniejsze. */
const EQ_BARS_COUNT = 28;

/** Maksymalny rozmiar wielkiego winylu (CTA). */
const VINYL_MAX_PX = 560;

/* ╔════════════════════════════════════════════════════════════╗
   ║  KOMPONENT GŁÓWNY                                         ║
   ╚════════════════════════════════════════════════════════════╝ */

type StartScreenProps = { onPlay: () => void };

export function StartScreen({ onPlay }: StartScreenProps) {
  const prefersReducedMotion = !!useReducedMotion();
  const vinylSize = useStageSize({ vw: 0.32, vh: 0.46, min: 320, max: VINYL_MAX_PX });

  return (
    <motion.div
      key="start"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.45 }}
      className={`${screenStartRoot} flex flex-col`}
    >
      {/* === DEKORACJE TŁA: latające nutki + EQ bars u dołu === */}
      <FloatingNotes reducedMotion={prefersReducedMotion} />
      <EqBars reducedMotion={prefersReducedMotion} />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-[1700px] flex-col items-center">
        {/* ╔════════════════════════════════╗
           ║  [1] BLOK TYTUŁU              ║
           ║  ↓ ZMIEŃ TITLE_TOP_OFFSET ↓   ║
           ╚════════════════════════════════╝ */}
        <motion.div
          className="shrink-0"
          style={{ paddingTop: TITLE_TOP_OFFSET }}
          initial={{ y: -36, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.08 }}
        >
          <MegaTitle />
          <SubTitle />
        </motion.div>

        {/* ╔════════════════════════════════╗
           ║  [2] STAGE: vinyl + Bąbel     ║
           ╚════════════════════════════════╝ */}
        <div
          className="relative flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden"
        >
          {/* CTA — wielki winyl + chip „Naciśnij Płytę" */}
          <div className="relative z-20 flex flex-col items-center gap-[clamp(1rem,2.5dvh,2rem)]">
            <div className="relative">
              <GlowRing size={vinylSize} />
              <VinylButton
                size={vinylSize}
                spinOnHover
                spinning={false}
                onClick={onPlay}
                ariaLabel="Start — naciśnij wielką płytę"
                label="▶"
              />
            </div>
            <PressStartChip />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ╔════════════════════════════════════════════════════════════╗
   ║  HOOK: USTALANIE ROZMIARÓW                                ║
   ╚════════════════════════════════════════════════════════════╝ */

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
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, [vw, vh, min, max]);
  return size;
}

/* ╔════════════════════════════════════════════════════════════╗
   ║  TYTUŁ + PODTYTUŁ                                         ║
   ║  Wielkość fontu — `fontSize` w `style` poniżej.           ║
   ╚════════════════════════════════════════════════════════════╝ */

function MegaTitle() {
  const style: CSSProperties = {
    fontFamily:
      "'Bungee',Impact,Haettenschweiler,ui-sans-serif,system-ui,sans-serif",
    // ↓ ZMIEŃ tutaj rozmiar napisu „DJ BAIBEL"
    fontSize: "clamp(3.5rem, min(13vw, 24vh), 13rem)",
    letterSpacing: "0.13em",
    lineHeight: 1.55,
    textTransform: "uppercase",
    backgroundImage:
      "linear-gradient(175deg,#fff8c9 0%,#fde68a 16%,#f9a8d4 38%,#d8b4fe 62%,#7e22ce 92%)",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
    textShadow:
      "0 14px 0 #0b0118, 0 28px 0 rgba(0,0,0,0.45), 0 0 80px rgba(168,85,247,0.85), 0 0 130px rgba(250,204,21,0.32)",
  };

  return (
    <motion.h1
      className="px-2 text-center font-black [-webkit-font-smoothing:antialiased]"
      style={style}
      animate={{ scale: [1, 1.018, 1] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    >
      DJ&nbsp;BAIBEL
    </motion.h1>
  );
}

function SubTitle() {
  return (
    <p
      className="mt-3 text-center font-black uppercase tracking-[0.42em] text-cyan-200/85 drop-shadow-[0_3px_0_rgba(0,0,0,0.7)]"
      // ↓ ZMIEŃ tutaj rozmiar napisu podtytułu
      style={{ fontSize: "clamp(1rem, min(2vw, 2.4vh), 1.65rem)" }}
    >
      ★ Twoje pierwsze studio nagrań ★
    </p>
  );
}

/* ╔════════════════════════════════════════════════════════════╗
   ║  CTA: glow ring + chip „Naciśnij Płytę"                   ║
   ╚════════════════════════════════════════════════════════════╝ */

function GlowRing({ size }: { size: number }) {
  const d = size + 80;
  return (
    <motion.div
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
      style={{
        width: d,
        height: d,
        background:
          "radial-gradient(circle, rgba(250,204,21,0.42) 0%, rgba(168,85,247,0.32) 45%, transparent 72%)",
      }}
      animate={{ scale: [1, 1.16, 1], opacity: [0.55, 0.95, 0.55] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

function PressStartChip() {
  return (
    <motion.div
      className="rounded-full border-[6px] border-black bg-linear-to-r from-fuchsia-500 via-yellow-400 to-cyan-400 px-[clamp(1.5rem,2.4vw,2.5rem)] py-[clamp(0.6rem,1.2dvh,1rem)] font-black uppercase tracking-[0.3em] text-black shadow-[0_10px_0_0_black]"
      style={{ fontSize: "clamp(1rem, min(1.7vw, 2vh), 1.5rem)" }}
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
    >
      ► Naciśnij Płytę ◄
    </motion.div>
  );
}

/* ╔════════════════════════════════════════════════════════════╗
   ║  DEKORACJE: latające nutki + PASEK PULSACJI (EQ bars)    ║
   ║  → wysokość paska zmień w `EQ_BARS_HEIGHT` u góry pliku.  ║
   ╚════════════════════════════════════════════════════════════╝ */

function srand(seed: number) {
  const x = Math.sin(seed * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const NOTE_GLYPHS = ["\u266A", "\u266B", "\u266C", "\u2605", "\u2726", "\u2669"];

function FloatingNotes({ reducedMotion }: { reducedMotion: boolean }) {
  const notes = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const char =
          NOTE_GLYPHS[Math.floor(srand(i + 3) * NOTE_GLYPHS.length)];
        return {
          i,
          char,
          left: `${srand(i + 17) * 92 + 3}%`,
          size: 18 + srand(i + 31) * 26,
          dur: 11 + srand(i + 47) * 14,
          delay: srand(i + 61) * 9,
          sway: `${(srand(i + 79) - 0.5) * 60}px`,
          color: [
            "text-yellow-300/45",
            "text-pink-400/40",
            "text-cyan-300/45",
            "text-purple-400/40",
            "text-white/30",
          ][Math.floor(srand(i + 99) * 5)],
        };
      }),
    [],
  );
  if (reducedMotion) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
      {notes.map((note) => (
        <motion.span
          key={note.i}
          className={`absolute select-none ${note.color}`}
          style={{ left: note.left, bottom: "-6%", fontSize: note.size }}
          animate={{
            y: ["0vh", "-115vh"],
            x: ["0px", note.sway],
            rotate: [0, srand(note.i + 111) * 320 - 160],
            opacity: [0, 0.75, 0.55, 0],
          }}
          transition={{
            duration: note.dur,
            repeat: Infinity,
            ease: "linear",
            delay: note.delay,
            times: [0, 0.08, 0.75, 1],
          }}
        >
          {note.char}
        </motion.span>
      ))}
    </div>
  );
}

function EqBars({ reducedMotion }: { reducedMotion: boolean }) {
  const count = reducedMotion ? Math.max(8, Math.floor(EQ_BARS_COUNT / 2)) : EQ_BARS_COUNT;
  const bars = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        i,
        height: `${30 + srand(i + 200) * 70}%`,
        duration: 0.5 + srand(i + 250) * 0.9,
        delay: srand(i + 300) * 1.4,
      })),
    [count],
  );
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] flex items-end justify-center gap-[clamp(3px,0.7vw,8px)] px-4 opacity-55"
      style={{ height: EQ_BARS_HEIGHT }}
    >
      {bars.map((bar) => (
        <motion.span
          key={bar.i}
          className="flex-1 rounded-t-md bg-linear-to-t from-purple-700 via-pink-500 to-yellow-300 ring-2 ring-black/40 shadow-[0_-6px_24px_rgba(168,85,247,0.45)]"
          style={{ height: bar.height }}
          animate={reducedMotion ? { scaleY: 0.55 } : { scaleY: [0.3, 1, 0.3] }}
          transition={{
            duration: bar.duration,
            repeat: reducedMotion ? 0 : Infinity,
            ease: "easeInOut",
            delay: bar.delay,
          }}
        />
      ))}
    </div>
  );
}
