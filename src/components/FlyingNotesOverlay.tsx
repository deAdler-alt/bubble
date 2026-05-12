import { memo, useMemo } from "react";
import { motion } from "framer-motion";

function srand(seed: number) {
  const x = Math.sin(seed * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const NOTE_GLYPHS = ["\u266A", "\u266B", "\u266C", "\u2605", "\u2726", "\u2669"];

function FlyingNotesOverlayImpl({
  reducedMotion,
  className = "",
}: {
  reducedMotion: boolean;
  className?: string;
}) {
  const notes = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => {
        const char = NOTE_GLYPHS[Math.floor(srand(i + 3) * NOTE_GLYPHS.length)];
        return {
          i,
          char,
          left: `${srand(i + 17) * 92 + 3}%`,
          size: 20 + srand(i + 31) * 30,
          dur: 4.5 + srand(i + 47) * 4.2,
          delay: srand(i + 61) * 1.8,
          sway: `${(srand(i + 79) - 0.5) * 80}px`,
          color: [
            "text-yellow-300/45",
            "text-pink-400/45",
            "text-cyan-300/45",
            "text-purple-400/42",
            "text-white/35",
          ][Math.floor(srand(i + 99) * 5)],
        };
      }),
    [],
  );

  if (reducedMotion) return null;

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-[1] overflow-hidden ${className}`}
      style={{ contain: "layout paint" }}
      aria-hidden
    >
      {notes.map((note) => (
        <motion.span
          key={note.i}
          className={`absolute select-none ${note.color}`}
          style={{
            left: note.left,
            bottom: "-8%",
            fontSize: note.size,
            willChange: "transform, opacity",
          }}
          animate={{
            y: ["0vh", "-120vh"],
            x: ["0px", note.sway],
            rotate: [0, srand(note.i + 111) * 320 - 160],
            opacity: [0, 0.8, 0.55, 0],
          }}
          transition={{
            duration: note.dur,
            repeat: Infinity,
            ease: "linear",
            delay: note.delay,
            times: [0, 0.08, 0.78, 1],
          }}
        >
          {note.char}
        </motion.span>
      ))}
    </div>
  );
}

export const FlyingNotesOverlay = memo(FlyingNotesOverlayImpl);
