/**
 * START — desktop hero, all-in-one (no scroll).
 * Skład ekranu (od góry do dołu):
 *   ┌─────────── [1] BLOK TYTUŁU ───────────┐
 *   │  „DJ BOMBEL" + podtytuł                │
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
import { FlyingNotesOverlay } from "../components/FlyingNotesOverlay";
import { VinylButton } from "../components/VinylButton";
import {
  PRIMARY_CTA_BORDER,
  PRIMARY_CTA_BOX_SHADOW_KEYFRAMES,
  PRIMARY_CTA_FOCUS,
  PRIMARY_CTA_GRADIENT,
  PRIMARY_CTA_SHADOW,
  PRIMARY_CTA_TEXT,
} from "../theme/primaryCta";
import { screenStartRoot } from "./screenLayout";

/* ╔════════════════════════════════════════════════════════════╗
   ║  TUNABLES — najczęściej zmieniane wartości ekranu         ║
   ║  (styl CSS w stringach: clamp(min, preferred, max))       ║
   ╚════════════════════════════════════════════════════════════╝ */

/** Odstęp całego BLOKU TYTUŁU od górnej krawędzi ekranu.
 *  Zwiększ żeby OBNIŻYĆ „DJ BOMBEL" + podtytuł. */
const TITLE_TOP_OFFSET = "clamp(3rem, 12dvh, 9rem)";

/** Wysokość pasującego do dołu ekranu PASKA PULSACJI (EQ bars).
 *  Zwiększ żeby pulsacje były WIĘKSZE / sięgały wyżej. */
const EQ_BARS_HEIGHT = "clamp(7rem, 22dvh, 14rem)";

/** Liczba słupków EQ na dole ekranu — mniej = grubsze, więcej = drobniejsze. */
const EQ_BARS_COUNT = 28;

/** Maksymalny rozmiar wielkiego winylu (CTA). */
const VINYL_MAX_PX = 560;

const SHOW_EQ_BARS = false;

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
      <FlyingNotesOverlay reducedMotion={prefersReducedMotion} />
      {/* Tymczasowo wyłączone: zostawiamy kod EqBars, ale nie renderujemy. */}
      {SHOW_EQ_BARS ? <EqBars reducedMotion={prefersReducedMotion} /> : null}

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
          <SpeakerRig reducedMotion={prefersReducedMotion} />

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
    // ↓ ZMIEŃ tutaj rozmiar napisu „DJ BOMBEL"
    fontSize: "clamp(3.5rem, min(13vw, 24vh), 13rem)",
    letterSpacing: "0.13em",
    lineHeight: 1.55,
    textTransform: "uppercase",
    color: "#ffffff",
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
      DJ&nbsp;BOMBEL
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
      className={[
        "rounded-[3rem] px-[clamp(1.5rem,2.4vw,2.5rem)] py-[clamp(0.6rem,1.2dvh,1rem)]",
        PRIMARY_CTA_BORDER,
        PRIMARY_CTA_GRADIENT,
        PRIMARY_CTA_TEXT,
        PRIMARY_CTA_SHADOW,
        PRIMARY_CTA_FOCUS,
      ].join(" ")}
      style={{ fontSize: "clamp(1rem, min(1.7vw, 2vh), 1.5rem)" }}
      animate={{
        scale: [1, 1.06, 1],
        boxShadow: [...PRIMARY_CTA_BOX_SHADOW_KEYFRAMES],
      }}
      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
    >
      ▶ Naciśnij Płytę ◀
    </motion.div>
  );
}

// ─── Stałe konfiguracyjne ──────────────────────────────────────────────────
const SPEAKER_EDGE_OFFSET = "max(0.4rem, 0.8vw)";
const SPEAKER_ANGLE_DEG = 18;
const SPEAKER_BAR_COUNTS: [number, number] = [6, 6];

/**
 * Skalowanie głośnika opiera się na jednej zmiennej CSS --spk (clamp px),
 * a wszystkie wymiary wewnętrzne są jej wielokrotnościami.
 * Zmień tylko min/preferred/max w clamp() poniżej, żeby przeskalować całość.
 */
const SPEAKER_CSS_VAR = "clamp(7rem, 10vw, 11rem)"; // ← jeden suwak do skalowania

// ─── Rig ────────────────────────────────────────────────────────────────────
function SpeakerRig({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <div className="absolute top-1/2 -translate-y-1/2" style={{ left: SPEAKER_EDGE_OFFSET }}>
        <Speaker3D side="left" bars={SPEAKER_BAR_COUNTS[0]} reducedMotion={reducedMotion} />
      </div>
      <div className="absolute top-1/2 -translate-y-1/2" style={{ right: SPEAKER_EDGE_OFFSET }}>
        <Speaker3D side="right" bars={SPEAKER_BAR_COUNTS[1]} reducedMotion={reducedMotion} />
      </div>
    </div>
  );
}

// ─── Speaker3D ──────────────────────────────────────────────────────────────
function Speaker3D({
  side,
  bars,
  reducedMotion,
}: {
  side: "left" | "right";
  bars: number;
  reducedMotion: boolean;
}) {
  const angle = side === "left" ? SPEAKER_ANGLE_DEG : -SPEAKER_ANGLE_DEG;
  const barSeeds = useMemo(() => Array.from({ length: bars }, (_, i) => i), [bars]);

  /**
   * --spk   = bazowa jednostka (szerokość obudowy)
   * Wszystkie podwymiary to calc(var(--spk) * współczynnik)
   *
   *  obudowa (cabinet):   1.00 × --spk  (szerokość)
   *  woofer:              0.72 × --spk
   *  tweeter:             0.22 × --spk
   *  port (szerokość):    0.58 × --spk
   *  szyjka (szerokość):  0.22 × --spk
   *  szyjka (wysokość):   0.28 × --spk
   *  podstawa:            1.12 × --spk
   *  podstawa (h):        0.28 × --spk
   *  pasek VU (szerokość):0.07 × --spk
   */
  const cssVars = {
    "--spk": SPEAKER_CSS_VAR,
  } as React.CSSProperties;

  return (
    <motion.div
      className="flex flex-col items-center justify-end"
      style={{
        ...cssVars,
        transform: `perspective(900px) rotateY(${angle}deg)`,
        height: "72dvh",
      }}
      animate={reducedMotion ? undefined : { y: [0, -2, 0] }}
      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* ── Obudowa ─────────────────────────────────────────────── */}
      <motion.div
        className="rounded-[10px] border-[3px] border-black bg-linear-to-b from-violet-700 to-indigo-950 px-[calc(var(--spk)*0.1)] py-[calc(var(--spk)*0.1)] shadow-[4px_4px_0_rgba(0,0,0,0.55)] shadow-[0_0_40px_rgba(224,64,251,0.45)]"
        style={{
          width: "calc(var(--spk) * 1)",
          height: "58dvh",
        }}
        animate={reducedMotion ? undefined : { scale: [1, 1.03, 1] }}
        transition={{ duration: 0.5, repeat: Infinity, ease: "easeOut" }}
      >
        {/* Tweeter */}
        <div
          className="mx-auto mb-[calc(var(--spk)*0.08)] rounded-full border-[3px] border-black bg-radial-[circle_at_35%_35%] from-violet-200 to-violet-800"
          style={{
            width:  "calc(var(--spk) * 0.22)",
            height: "calc(var(--spk) * 0.22)",
          }}
        />

        {/* Woofer */}
        <div
          className="relative mx-auto mb-[calc(var(--spk)*0.08)] rounded-full border-[3px] border-black bg-radial-[circle_at_35%_35%] from-violet-500 via-indigo-900 to-black"
          style={{
            width:  "calc(var(--spk) * 0.72)",
            height: "calc(var(--spk) * 0.72)",
          }}
        >
          {/* Pierścień stożka */}
          <div className="absolute inset-[20%] rounded-full border border-white/20" />
          {/* Dust cap */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black bg-violet-300"
            style={{
              width:  "calc(var(--spk) * 0.18)",
              height: "calc(var(--spk) * 0.18)",
            }}
          />
        </div>

        {/* Port */}
        <div
          className="mx-auto h-4 rounded-full border-2 border-black bg-zinc-950"
          style={{ width: "calc(var(--spk) * 0.58)" }}
        />

        {/* Paski VU */}
        <div className="mt-[calc(var(--spk)*0.1)] flex justify-center gap-[calc(var(--spk)*0.04)]">
          {barSeeds.map((seed) => (
            <motion.span
              key={seed}
              className="rounded-t-sm border border-black/50 bg-linear-to-t from-fuchsia-500 to-cyan-300"
              style={{
                width:  "calc(var(--spk) * 0.07)",
                height: `${16 + (seed % 3) * 12}px`,
              }}
              animate={reducedMotion ? undefined : { scaleY: [0.45, 1, 0.45] }}
              transition={{
                duration: 0.45 + (seed % 4) * 0.08,
                repeat: Infinity,
                ease: "easeInOut",
                delay: seed * 0.06,
              }}
            />
          ))}
        </div>
      </motion.div>

      {/* ── Szyjka ──────────────────────────────────────────────── */}
      <div
        className="border-x-[3px] border-black bg-linear-to-r from-indigo-950 via-violet-700 to-indigo-950"
        style={{
          width:  "calc(var(--spk) * 0.22)",
          height: "calc(var(--spk) * 0.28)",
        }}
      />

      {/* ── Podstawa ────────────────────────────────────────────── */}
      <div
        className="rounded-[8px] border-[3px] border-black bg-linear-to-b from-violet-800 to-indigo-950 shadow-[3px_3px_0_rgba(0,0,0,0.5)]"
        style={{
          width:  "calc(var(--spk) * 1.12)",
          height: "calc(var(--spk) * 0.28)",
        }}
      />
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
