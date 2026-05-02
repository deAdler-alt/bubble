import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { Cog, Music, Sparkles } from "lucide-react";
import { generateSong } from "../api/djApi";
import type { GeneratedSong, SongStyle } from "../api/djApi";
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

export function LoadingScreen({
  prompt,
  style,
  minimumMs = 3000,
  onComplete,
}: LoadingScreenProps) {
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const [songResult] = await Promise.all([
        generateSong(prompt, style),
        delay(minimumMs),
      ]);
      if (!cancelled) onComplete(songResult);
    })();

    return () => {
      cancelled = true;
    };
  }, [prompt, style, minimumMs, onComplete]);

  return (
    <motion.div
      key="ladowanie"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`${screenFlowRoot} grid grid-rows-[minmax(0,1fr)_auto_minmax(0,1fr)]`}
    >
      <div className="min-h-0" />

      <div className="relative z-[2] mx-auto flex w-full max-w-2xl min-h-0 flex-col items-center justify-center gap-10 px-4">
        <div className="flex flex-wrap items-center justify-center gap-8">
          {[0, 1, 2].map((i) => (
            <MiniVinyl key={i} delay={i * 0.3} />
          ))}
        </div>

        <div className="flex gap-12 sm:gap-14">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "linear" }}
          >
            <Cog className="size-[min(22vw,5.5rem)] text-yellow-300 sm:size-24" strokeWidth={2.8} />
          </motion.div>
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
          >
            <Cog className="size-[min(26vw,6.5rem)] text-pink-400 sm:size-28" strokeWidth={2.8} />
          </motion.div>
        </div>
      </div>

      <ChaosBg />
      <FlyingGlyphs />

      <div className="min-h-0" />
    </motion.div>
  );
}

function MiniVinyl({ delay: d }: { delay: number }) {
  return (
    <motion.div
      className="relative aspect-square w-[min(28vw,6.75rem)] max-w-[8rem] rounded-full border-[5px] border-black bg-linear-to-br from-fuchsia-500 via-violet-600 to-sky-400 shadow-[0_10px_0_0_black] ring-4 ring-yellow-400/70 sm:w-28"
      style={{ rotate: d * 40 }}
      animate={{ rotate: 360 }}
      transition={{ duration: 1.6, repeat: Infinity, ease: "linear", delay: d }}
    >
      <div className="absolute inset-[18%] rounded-full border-[3px] border-black bg-zinc-900" />
      <div className="absolute left-1/2 top-1/2 size-[22%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white ring-4 ring-yellow-400" />
    </motion.div>
  );
}

function ChaosBg() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {[...Array(14)].map((_, i) => (
        <motion.span
          key={i}
          className="absolute size-[min(4vw,1.75rem)] rounded-full border-[3px] border-yellow-400/55 bg-orange-400/35"
          style={{
            left: `${5 + ((i * 23) % 88)}%`,
            top: `${6 + ((i * 31) % 72)}%`,
          }}
          animate={{
            y: [0, -22, 0],
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
    { Icon: Music, top: "42%", left: "4%" },
    { Icon: Sparkles, top: "52%", right: "5%" },
    { Icon: Music, bottom: "24%", left: "14%" },
    { Icon: Sparkles, bottom: "28%", right: "12%" },
  ] as const;

  return (
    <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
      {items.map(({ Icon, ...pos }, i) => (
        <motion.div
          key={i}
          className="absolute text-cyan-200"
          style={{ ...pos, x: driftX }}
          animate={{
            y: [0, -26, 0],
            rotate: [-12, 12, -12],
            scale: [0.85, 1.15, 0.85],
          }}
          transition={{ duration: 2.4 + i * 0.12, repeat: Infinity, ease: "easeInOut" }}
        >
          <Icon
            className="size-[min(11vw,3.75rem)] drop-shadow-[0_4px_0_black] sm:size-16"
            strokeWidth={2.6}
          />
        </motion.div>
      ))}
    </div>
  );
}
