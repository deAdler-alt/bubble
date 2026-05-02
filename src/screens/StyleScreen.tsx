import { useState } from "react";
import { motion } from "framer-motion";
import type { SongStyle } from "../api/djApi";
import { screenFlowRoot } from "./screenLayout";

const GENRES: { style: SongStyle; emoji: string; ariaLabel: string }[] = [
  { style: "rock", emoji: "🎸", ariaLabel: "Rock" },
  { style: "kolysanka", emoji: "🌙", ariaLabel: "Kołysanka" },
  { style: "pop", emoji: "👑", ariaLabel: "Pop" },
  { style: "hiphop", emoji: "🧢", ariaLabel: "Hip-Hop" },
];

type StyleScreenProps = {
  initialStyle?: SongStyle;
  onConfirm: (style: SongStyle) => void;
};

export function StyleScreen({ initialStyle = "pop", onConfirm }: StyleScreenProps) {
  return (
    <motion.div
      key="styl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className={`${screenFlowRoot} flex items-center justify-center px-4`}
    >
      <div className="w-full max-w-lg min-w-0">
        <StyleDeck initialStyle={initialStyle} onConfirm={onConfirm} />
      </div>
    </motion.div>
  );
}

function StyleDeck({
  initialStyle,
  onConfirm,
}: {
  initialStyle: SongStyle;
  onConfirm: (style: SongStyle) => void;
}) {
  const [selected, setSelected] = useState<SongStyle>(initialStyle);

  return (
    <div className="relative w-full rounded-[2.5rem] border-[8px] border-black bg-linear-to-br from-zinc-800 via-purple-950 to-black p-6 shadow-[0_24px_0_0_rgba(0,0,0,0.55)] ring-4 ring-yellow-400/70 sm:p-10">
      <div className="absolute -top-6 left-8 flex gap-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-5 rounded-full border-4 border-black bg-linear-to-br from-pink-500 to-orange-400"
          />
        ))}
      </div>

      <div className="mb-8 mt-8 grid grid-cols-2 gap-4 sm:mb-10 sm:gap-5">
        {GENRES.map((g) => {
          const active = selected === g.style;
          return (
            <motion.button
              key={g.style}
              type="button"
              aria-label={g.ariaLabel}
              aria-pressed={active}
              onClick={() => setSelected(g.style)}
              className={[
                "flex aspect-square flex-col items-center justify-center rounded-[30%_70%_40%_60%] border-[6px] border-black text-5xl shadow-[0_10px_0_0_rgba(0,0,0,0.75)] outline-none focus-visible:ring-4 focus-visible:ring-yellow-300 sm:text-7xl",
                active
                  ? "bg-linear-to-br from-yellow-300 via-orange-400 to-pink-500 shadow-[0_0_42px_rgba(250,204,21,0.95)]"
                  : "bg-linear-to-br from-sky-500 via-indigo-600 to-purple-900",
              ].join(" ")}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.92 }}
            >
              <span aria-hidden>{g.emoji}</span>
            </motion.button>
          );
        })}
      </div>

      <div className="flex justify-center">
        <motion.button
          type="button"
          className="rounded-[3rem] border-[8px] border-black bg-linear-to-r from-red-500 via-orange-500 to-yellow-400 px-12 py-5 text-lg font-black uppercase tracking-wide text-black shadow-[0_0_40px_rgba(239,68,68,0.95)] ring-4 ring-red-950/80 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-yellow-200 sm:px-14 sm:py-6 sm:text-xl"
          animate={{
            scale: [1, 1.06, 1],
            boxShadow: [
              "0 0 38px rgba(239,68,68,0.85)",
              "0 0 56px rgba(250,204,21,0.95)",
              "0 0 38px rgba(239,68,68,0.85)",
            ],
          }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.93 }}
          onClick={() => onConfirm(selected)}
        >
          START
        </motion.button>
      </div>

      <div className="mt-6 grid grid-cols-6 gap-1 opacity-55 sm:mt-8">
        {Array.from({ length: 24 }).map((_, i) => (
          <span key={i} className="h-4 rounded-md bg-zinc-600" />
        ))}
      </div>
    </div>
  );
}
