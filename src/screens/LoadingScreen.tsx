/**
 * LADOWANIE — wielkie zębatki, mini-winylki w orbicie + animowany progress.
 */

import { useEffect, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { Cog, Music, Sparkles } from "lucide-react";
import { generateSong } from "../api/djApi";
import type { GeneratedSong, SongStyle } from "../api/djApi";
import { FlyingNotesOverlay } from "../components/FlyingNotesOverlay";
import { screenFlowRoot } from "./screenLayout";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type LoadingScreenProps = {
  prompt: string;
  style: SongStyle;
  minimumMs?: number;
  onComplete: (song: GeneratedSong) => void;
};

const STATUSES = [
  "Czytam Twój pomysł...",
  "Mieszam dźwięki w garnku...",
  "Strojenie gitar i bębnów...",
  "Polerowanie refrenu...",
  "Już prawie gotowe!",
];

export function LoadingScreen({
  prompt,
  style,
  minimumMs = 3000,
  onComplete,
}: LoadingScreenProps) {
  const [statusIdx, setStatusIdx] = useState(0);
  const prefersReducedMotion = !!useReducedMotion();

  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();

    void (async () => {
      try {
        const [song] = await Promise.all([
          generateSong(prompt, style, ctrl.signal),
          delay(minimumMs),
        ]);
        if (!cancelled) onComplete(song);
      } catch (err) {
        if (!cancelled) console.error("generateSong failed", err);
      }
    })();

    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [prompt, style, minimumMs, onComplete]);

  useEffect(() => {
    const id = setInterval(
      () => setStatusIdx((i) => (i + 1) % STATUSES.length),
      900,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      key="loading"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className={`${screenFlowRoot} relative grid grid-rows-[auto_minmax(0,1fr)_auto]`}
    >
      <FlyingNotesOverlay reducedMotion={prefersReducedMotion} />
      <Header />

      <div className="relative flex min-h-0 flex-col items-center justify-center gap-[clamp(1.5rem,4dvh,3rem)] px-4">
        <ChaosBg />
        <FlyingGlyphs />

        <div className="relative z-[2] flex items-center justify-center gap-[clamp(1rem,2.5vw,2.5rem)]">
          {[0, 1, 2].map((i) => (
            <MiniVinyl key={i} delay={i * 0.3} />
          ))}
        </div>

        <div className="relative z-[2] flex items-center gap-[clamp(2rem,4vw,5rem)]">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "linear" }}
          >
            <Cog
              className="text-yellow-300 drop-shadow-[0_4px_0_black]"
              style={{ width: "clamp(4rem,10vw,9rem)", height: "clamp(4rem,10vw,9rem)" }}
              strokeWidth={2.6}
            />
          </motion.div>
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
          >
            <Cog
              className="text-pink-400 drop-shadow-[0_4px_0_black]"
              style={{ width: "clamp(5rem,12vw,11rem)", height: "clamp(5rem,12vw,11rem)" }}
              strokeWidth={2.6}
            />
          </motion.div>
        </div>

        <motion.p
          key={statusIdx}
          className="relative z-[2] rounded-full border-[5px] border-black bg-black/72 px-7 py-3 font-black uppercase tracking-[0.18em] text-yellow-200 shadow-[0_8px_0_0_black]"
          style={{ fontSize: "clamp(0.95rem, 1.6vw, 1.4rem)" }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32 }}
        >
          {STATUSES[statusIdx]}
        </motion.p>

        <ProgressBar />
      </div>

      <div className="min-h-0 shrink-0" aria-hidden />
    </motion.div>
  );
}

function Header() {
  return (
    <div className="pt-[clamp(1.25rem,5dvh,4rem)]">
      <h1
        className="text-center font-black uppercase"
        style={{
          fontFamily:
            "'Bungee',Impact,Haettenschweiler,ui-sans-serif,system-ui,sans-serif",
          fontSize: "clamp(2.5rem, min(8vw, 12vh), 8rem)",
          letterSpacing: "0.12em",
          lineHeight: 0.98,
          backgroundImage:
            "linear-gradient(170deg,#fff,#fde68a 30%,#a78bfa 70%,#7e22ce)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          textShadow: "0 12px 0 rgba(0,0,0,0.85), 0 0 80px rgba(250,204,21,0.45)",
        }}
      >
        Miksuję Twoje Studio
      </h1>
    </div>
  );
}

function MiniVinyl({ delay: d }: { delay: number }) {
  return (
    <motion.div
      className="relative aspect-square rounded-full border-[6px] border-black bg-linear-to-br from-fuchsia-500 via-violet-600 to-sky-400 shadow-[0_12px_0_0_black] ring-4 ring-yellow-400/70"
      style={{
        rotate: d * 40,
        width: "clamp(5rem, 11vw, 10rem)",
      }}
      animate={{ rotate: 360 }}
      transition={{ duration: 1.6, repeat: Infinity, ease: "linear", delay: d }}
    >
      <div className="absolute inset-[20%] rounded-full border-[3px] border-black bg-zinc-900" />
      <div className="absolute left-1/2 top-1/2 size-[24%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white ring-4 ring-yellow-400" />
    </motion.div>
  );
}

function ProgressBar() {
  return (
    <div
      className="relative z-[2] w-[clamp(20rem,40vw,32rem)] overflow-hidden rounded-full border-[5px] border-black bg-black/60 shadow-[0_8px_0_0_black]"
      style={{ height: "clamp(1rem, 1.6vw, 1.5rem)" }}
    >
      <motion.div
        className="h-full w-full origin-left rounded-full bg-linear-to-r from-cyan-400 via-fuchsia-500 to-yellow-300"
        animate={{
          scaleX: [0.05, 1, 0.05],
          x: ["-25%", "0%", "25%"],
        }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

function ChaosBg() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {[...Array(18)].map((_, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full border-[3px] border-yellow-400/55 bg-orange-400/35"
          style={{
            left: `${5 + ((i * 23) % 88)}%`,
            top: `${6 + ((i * 31) % 72)}%`,
            width: "clamp(0.75rem, 2vw, 2rem)",
            height: "clamp(0.75rem, 2vw, 2rem)",
          }}
          animate={{
            y: [0, -28, 0],
            rotate: [0, 360],
            opacity: [0.2, 0.92, 0.25],
          }}
          transition={{
            duration: 2 + (i % 5) * 0.35,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.1,
          }}
        />
      ))}
    </div>
  );
}

function FlyingGlyphs() {
  const x = useMotionValue(0);
  const driftX = useTransform(x, (v) => Math.sin(v / 50) * 36);

  useEffect(() => {
    const controls = animate(x, 1000, {
      duration: 25,
      repeat: Infinity,
      ease: "linear",
    });
    return () => controls.stop();
  }, [x]);

  const items = [
    { Icon: Music, top: "12%", left: "6%" },
    { Icon: Sparkles, top: "16%", right: "8%" },
    { Icon: Music, top: "44%", left: "4%" },
    { Icon: Sparkles, top: "54%", right: "5%" },
    { Icon: Music, bottom: "28%", left: "14%" },
    { Icon: Sparkles, bottom: "32%", right: "12%" },
  ] as const;

  return (
    <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
      {items.map(({ Icon, ...pos }, i) => (
        <motion.div
          key={i}
          className="absolute text-cyan-200"
          style={{ ...pos, x: driftX }}
          animate={{
            y: [0, -28, 0],
            rotate: [-12, 12, -12],
            scale: [0.85, 1.18, 0.85],
          }}
          transition={{ duration: 2.4 + i * 0.12, repeat: Infinity, ease: "easeInOut" }}
        >
          <Icon
            className="drop-shadow-[0_4px_0_black]"
            style={{ width: "clamp(2.5rem,5vw,4.5rem)", height: "clamp(2.5rem,5vw,4.5rem)" }}
            strokeWidth={2.6}
          />
        </motion.div>
      ))}
    </div>
  );
}
