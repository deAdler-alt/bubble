import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { Cog, Music, Sparkles } from "lucide-react";
import { generateSong } from "../api/djApi";
import type { GeneratedSong, SongStyle } from "../api/djApi";

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
      className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-4 pb-44 pt-[8vh]"
    >
      <ChaosBg />

      <div className="relative z-[1] flex flex-wrap items-center justify-center gap-8">
        {[0, 1, 2].map((i) => (
          <MiniVinyl key={i} delay={i * 0.3} />
        ))}
      </div>

      <div className="relative z-[1] mt-14 flex gap-14">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "linear" }}
        >
          <Cog className="size-20 text-yellow-300 sm:size-24" strokeWidth={2.8} />
        </motion.div>
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
        >
          <Cog className="size-24 text-pink-400 sm:size-28" strokeWidth={2.8} />
        </motion.div>
      </div>

      <FlyingGlyphs />
    </motion.div>
  );
}

function MiniVinyl({ delay: d }: { delay: number }) {
  return (
    <motion.div
      className="relative size-24 rounded-full border-[5px] border-black bg-linear-to-br from-fuchsia-500 via-violet-600 to-sky-400 shadow-[0_10px_0_0_black] ring-4 ring-yellow-400/70 sm:size-28"
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
    <>
      {[...Array(18)].map((_, i) => (
        <motion.span
          key={i}
          className="pointer-events-none absolute size-6 rounded-full border-4 border-yellow-400/55 bg-orange-400/35"
          style={{
            left: `${5 + ((i * 17) % 90)}%`,
            top: `${8 + ((i * 23) % 70)}%`,
          }}
          animate={{
            y: [0, -26, 0],
            rotate: [0, 360],
            opacity: [0.25, 0.95, 0.25],
          }}
          transition={{
            duration: 2 + (i % 5) * 0.35,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.1,
          }}
        />
      ))}
    </>
  );
}

function FlyingGlyphs() {
  const x = useMotionValue(0);
  const driftX = useTransform(x, (v) => Math.sin(v / 50) * 40);

  useEffect(() => {
    const controls = animate(x, 1000, {
      duration: 25,
      repeat: Infinity,
      ease: "linear",
    });
    return () => controls.stop();
  }, [x]);

  const items = [
    { Icon: Music, top: "12%", left: "8%" },
    { Icon: Sparkles, top: "18%", right: "10%" },
    { Icon: Music, top: "48%", left: "4%" },
    { Icon: Sparkles, top: "58%", right: "6%" },
    { Icon: Music, bottom: "14%", left: "18%" },
    { Icon: Sparkles, bottom: "20%", right: "14%" },
  ] as const;

  return (
    <>
      {items.map(({ Icon, ...pos }, i) => (
        <motion.div
          key={i}
          className="pointer-events-none absolute text-cyan-200"
          style={{ ...pos, x: driftX }}
          animate={{ y: [0, -30, 0], rotate: [-12, 12, -12], scale: [0.85, 1.2, 0.85] }}
          transition={{ duration: 2.4 + i * 0.12, repeat: Infinity, ease: "easeInOut" }}
        >
          <Icon className="size-14 drop-shadow-[0_4px_0_black] sm:size-16" strokeWidth={2.6} />
        </motion.div>
      ))}
    </>
  );
}
