/**
 * STYL — duże karty 2x2, każda z kolorową grafiką, plus mega CTA "START".
 */

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { SongStyle } from "../api/djApi";
import { FlyingNotesOverlay } from "../components/FlyingNotesOverlay";
import {
  PRIMARY_CTA_BORDER,
  PRIMARY_CTA_FOCUS,
  PRIMARY_CTA_GRADIENT,
  PRIMARY_CTA_SHADOW,
  PRIMARY_CTA_TEXT,
} from "../theme/primaryCta";
import { screenFlowRoot } from "./screenLayout";

/** Większy padding-top = nagłówek niżej na ekranie. */
const STYLE_HEADER_TOP_OFFSET = "clamp(3.25rem, 10dvh, 8rem)";

/**
 * Skalowanie kafli stylów — gdzie ruszać:
 * 1) Kontener siatki: `w-full` + opcjonalny `max-w-*` — ile szerokości zajmuje cała siatka 2×2.
 * 2) `GenreTile`: `w-full min-w-0` (kafel wypełnia komórkę); bez osobnego `max-w`, żeby nie zostawały puste marginesy.
 * 3) `aspect-[5/4]` — proporcje karty.
 * 4) `fontSize` (emoji / label) — najlepiej `vmin`, żeby sensownie wyglądało na wąskich i szerokich ekranach.
 */
const GENRE_GRID_CLASS =
  "mx-auto grid w-full max-w-[min(100%,94vw,48rem)] grid-cols-2 gap-[clamp(0.65rem,2vw,1.35rem)]";

type GenreCard = {
  style: SongStyle;
  label: string;
  emoji: string;
  bgFrom: string;
  bgVia: string;
  bgTo: string;
};

const GENRES: GenreCard[] = [
  {
    style: "rock",
    label: "Rock",
    emoji: "🎸",
    bgFrom: "from-red-500",
    bgVia: "via-orange-500",
    bgTo: "to-yellow-300",
  },
  {
    style: "kolysanka",
    label: "Kołysanka",
    emoji: "🌙",
    bgFrom: "from-indigo-500",
    bgVia: "via-violet-600",
    bgTo: "to-sky-400",
  },
  {
    style: "pop",
    label: "Pop",
    emoji: "🎤",
    bgFrom: "from-pink-400",
    bgVia: "via-fuchsia-500",
    bgTo: "to-amber-300",
  },
  {
    style: "hiphop",
    label: "Hip-Hop",
    emoji: "🎧",
    bgFrom: "from-emerald-500",
    bgVia: "via-teal-500",
    bgTo: "to-cyan-400",
  },
];

type StyleScreenProps = {
  initialStyle?: SongStyle;
  onConfirm: (style: SongStyle) => void;
};

export function StyleScreen({ initialStyle = "pop", onConfirm }: StyleScreenProps) {
  const [selected, setSelected] = useState<SongStyle>(initialStyle);
  const prefersReducedMotion = !!useReducedMotion();

  return (
    <motion.div
      key="styl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.42 }}
      className={`${screenFlowRoot} grid grid-rows-[auto_minmax(0,1fr)_auto]`}
    >
      <FlyingNotesOverlay reducedMotion={prefersReducedMotion} />
      <Header />

      <div className="flex min-h-0 items-center justify-center px-3 py-1 sm:px-4 sm:py-2">
        <div className={GENRE_GRID_CLASS}>
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
          className={[
            "rounded-[3rem] px-[clamp(2.5rem,6vw,5.5rem)] py-[clamp(1rem,2dvh,1.6rem)]",
            PRIMARY_CTA_BORDER,
            PRIMARY_CTA_GRADIENT,
            PRIMARY_CTA_TEXT,
            PRIMARY_CTA_SHADOW,
            PRIMARY_CTA_FOCUS,
          ].join(" ")}
          style={{ fontSize: "clamp(1.2rem, 2.5vw, 2.25rem)" }}
          initial={false}
          whileHover={{
            scale: 1.06,
            boxShadow:
              "0 14px 0 0 #000, 0 0 52px rgba(250,204,21,0.85), 0 0 88px rgba(251,146,60,0.55)",
          }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: "spring", stiffness: 420, damping: 22 }}
        >
            ▶ START ◀
        </motion.button>
      </div>
    </motion.div>
  );
}

function Header() {
  return (
    <div
      className="pb-[clamp(0.5rem,1.2dvh,1rem)]"
      style={{ paddingTop: STYLE_HEADER_TOP_OFFSET }}
    >
      <h1
        className="text-center font-black uppercase text-white"
        style={{
          fontFamily:
            "'Bungee',Impact,Haettenschweiler,ui-sans-serif,system-ui,sans-serif",
          fontSize: "clamp(2.5rem, min(6.5vw, 12vh), 12rem)",
          letterSpacing: "0.12em",
          lineHeight: 1.6,
          textShadow:
            "0 10px 0 rgba(0,0,0,0.75), 0 3px 0 rgba(0,0,0,0.5), 0 0 48px rgba(168,85,247,0.35)",
        }}
      >
        Wybierz Styl
      </h1>
      <p
        className="mt-3 text-center font-black uppercase tracking-[0.4em] text-cyan-200/85 drop-shadow-[0_3px_0_rgba(0,0,0,0.7)]"
        style={{ fontSize: "clamp(0.65rem, min(1.7vw, 2vh), 3.45rem)" }}
      >
        ★ Bombel zmiksuje to po Twojemu ★
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
  /** Puls i delikatny glow tylko dla wybranej karty (po kliknięciu). */
  const activePulse = active
    ? {
        scale: [1, 1.035, 1],
        boxShadow: [
          "0 12px 0 0 #000, 0 0 28px rgba(250,204,21,0.45)",
          "0 12px 0 0 #000, 0 0 52px rgba(250,204,21,0.72)",
          "0 12px 0 0 #000, 0 0 28px rgba(250,204,21,0.45)",
        ],
      }
    : undefined;

  return (
    <motion.button
      type="button"
      aria-label={card.label}
      aria-pressed={active}
      onClick={onSelect}
      className={[
        "relative flex h-auto w-full min-w-0 flex-col items-center justify-center gap-[clamp(0.35rem,1.2vmin,0.75rem)] overflow-hidden rounded-[clamp(1rem,2.5vmin,2rem)] border-[clamp(5px,1vmin,10px)] border-black outline-none focus-visible:ring-[4px] focus-visible:ring-yellow-300 sm:border-[10px]",
        "aspect-[5/4] bg-linear-to-br",
        card.bgFrom,
        card.bgVia,
        card.bgTo,
        active
          ? "ring-[5px] ring-yellow-300"
          : "shadow-[0_10px_0_0_rgba(0,0,0,0.82)]",
      ].join(" ")}
      initial={false}
      whileHover={
        active ? undefined : { scale: 1.03 }
      }
      whileTap={{ scale: 0.97 }}
      animate={activePulse}
      transition={
        active
          ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
          : { duration: 0.2 }
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
        className="text-white drop-shadow-[0_3px_0_rgba(0,0,0,0.7)]"
        style={{
          fontSize: "clamp(2.25rem, 11vmin, 5.25rem)",
        }}
        aria-hidden
      >
        {card.emoji}
      </span>
      <span
        className="font-black uppercase tracking-[0.18em] text-black"
        style={{
          fontSize: "clamp(0.8rem, 3.4vmin, 1.65rem)",
        }}
      >
        {card.label}
      </span>
    </motion.button>
  );
}
