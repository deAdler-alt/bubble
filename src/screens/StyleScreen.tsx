/**
 * STYL — duże karty 2x2, każda z kolorową grafiką, plus mega CTA "START".
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Drum, Guitar, Mic2, Moon } from "lucide-react";
import type { SongStyle } from "../api/djApi";
import { screenFlowRoot } from "./screenLayout";

type GenreCard = {
  style: SongStyle;
  label: string;
  emoji: string;
  bgFrom: string;
  bgVia: string;
  bgTo: string;
  Icon: typeof Drum;
};

const GENRES: GenreCard[] = [
  {
    style: "rock",
    label: "Rock",
    emoji: "🎸",
    bgFrom: "from-red-500",
    bgVia: "via-orange-500",
    bgTo: "to-yellow-300",
    Icon: Guitar,
  },
  {
    style: "kolysanka",
    label: "Kołysanka",
    emoji: "🌙",
    bgFrom: "from-indigo-500",
    bgVia: "via-violet-600",
    bgTo: "to-sky-400",
    Icon: Moon,
  },
  {
    style: "pop",
    label: "Pop",
    emoji: "👑",
    bgFrom: "from-pink-400",
    bgVia: "via-fuchsia-500",
    bgTo: "to-amber-300",
    Icon: Mic2,
  },
  {
    style: "hiphop",
    label: "Hip-Hop",
    emoji: "🎧",
    bgFrom: "from-emerald-500",
    bgVia: "via-teal-500",
    bgTo: "to-cyan-400",
    Icon: Drum,
  },
];

type StyleScreenProps = {
  initialStyle?: SongStyle;
  onConfirm: (style: SongStyle) => void;
};

export function StyleScreen({ initialStyle = "pop", onConfirm }: StyleScreenProps) {
  const [selected, setSelected] = useState<SongStyle>(initialStyle);

  return (
    <motion.div
      key="styl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.42 }}
      className={`${screenFlowRoot} grid grid-rows-[auto_minmax(0,1fr)_auto]`}
    >
      <Header />

      <div className="flex min-h-0 items-center justify-center px-4">
        <div className="grid w-full max-w-[1100px] grid-cols-2 gap-[clamp(1rem,2.5vw,2.5rem)]">
          {GENRES.map((g) => (
            <GenreTile
              key={g.style}
              card={g}
              active={selected === g.style}
              onSelect={() => setSelected(g.style)}
            />
          ))}
        </div>
      </div>

      <div className="flex shrink-0 justify-center pb-[clamp(1rem,2dvh,2rem)] pt-2">
        <motion.button
          type="button"
          onClick={() => onConfirm(selected)}
          className="rounded-[3rem] border-[8px] border-black bg-linear-to-r from-red-500 via-orange-500 to-yellow-400 px-[clamp(2.5rem,6vw,5.5rem)] py-[clamp(1rem,2dvh,1.6rem)] font-black uppercase tracking-[0.18em] text-black shadow-[0_14px_0_0_black,0_0_50px_rgba(239,68,68,0.7)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-yellow-200"
          style={{ fontSize: "clamp(1.2rem, 2.5vw, 2.25rem)" }}
          animate={{
            scale: [1, 1.06, 1],
            boxShadow: [
              "0 14px 0 0 #000, 0 0 38px rgba(239,68,68,0.85)",
              "0 14px 0 0 #000, 0 0 60px rgba(250,204,21,0.95)",
              "0 14px 0 0 #000, 0 0 38px rgba(239,68,68,0.85)",
            ],
          }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
        >
          ► START ◄
        </motion.button>
      </div>
    </motion.div>
  );
}

function Header() {
  return (
    <div className="pt-[clamp(1.25rem,5dvh,4rem)] pb-[clamp(0.5rem,1.2dvh,1.25rem)]">
      <h1
        className="text-center font-black uppercase"
        style={{
          fontFamily:
            "'Bungee',Impact,Haettenschweiler,ui-sans-serif,system-ui,sans-serif",
          fontSize: "clamp(2.5rem, min(8vw, 12vh), 8rem)",
          letterSpacing: "0.12em",
          lineHeight: 0.98,
          backgroundImage:
            "linear-gradient(170deg,#fff,#fde68a 30%,#f472b6 70%,#7e22ce)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          textShadow: "0 12px 0 rgba(0,0,0,0.85), 0 0 80px rgba(244,114,182,0.45)",
        }}
      >
        Wybierz Styl
      </h1>
      <p
        className="mt-3 text-center font-black uppercase tracking-[0.4em] text-cyan-200/85 drop-shadow-[0_3px_0_rgba(0,0,0,0.7)]"
        style={{ fontSize: "clamp(0.95rem, min(1.7vw, 2vh), 1.45rem)" }}
      >
        ★ Bąbel zmiksuje to po Twojemu ★
      </p>
    </div>
  );
}

function GenreTile({
  card,
  active,
  onSelect,
}: {
  card: GenreCard;
  active: boolean;
  onSelect: () => void;
}) {
  const { Icon } = card;
  return (
    <motion.button
      type="button"
      aria-label={card.label}
      aria-pressed={active}
      onClick={onSelect}
      className={[
        "relative flex aspect-[5/4] flex-col items-center justify-center gap-3 overflow-hidden rounded-[clamp(1.5rem,2.5vw,2.5rem)] border-[8px] border-black outline-none focus-visible:ring-[6px] focus-visible:ring-yellow-300",
        "bg-linear-to-br",
        card.bgFrom,
        card.bgVia,
        card.bgTo,
        active
          ? "shadow-[0_14px_0_0_black,0_0_60px_rgba(250,204,21,0.85)] ring-[6px] ring-yellow-300"
          : "shadow-[0_10px_0_0_rgba(0,0,0,0.85)]",
      ].join(" ")}
      whileHover={{ scale: 1.04, y: -6 }}
      whileTap={{ scale: 0.96 }}
      animate={active ? { y: [0, -6, 0] } : { y: 0 }}
      transition={
        active
          ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
          : { type: "spring", stiffness: 320, damping: 22 }
      }
    >
      {/* shine */}
      <span
        className="pointer-events-none absolute inset-0 opacity-30 mix-blend-screen"
        style={{
          background:
            "conic-gradient(from 220deg, transparent 0deg, rgba(255,255,255,0.55) 30deg, transparent 90deg, transparent 360deg)",
        }}
      />
      <span
        className="text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.75)]"
        style={{ fontSize: "clamp(3rem, 8vw, 6rem)" }}
        aria-hidden
      >
        {card.emoji}
      </span>
      <span
        className="flex items-center gap-3 font-black uppercase tracking-[0.2em] text-black"
        style={{ fontSize: "clamp(1rem, 1.8vw, 1.65rem)" }}
      >
        <Icon className="size-[clamp(1.25rem,2vw,1.75rem)] stroke-[3]" />
        {card.label}
      </span>
    </motion.button>
  );
}
