/**
 * "Big-button game UI" winyl — ciężka rama, wytarte rowki, kolorowa naklejka,
 * środek-spindle. `spinning` (player) lub `spinOnHover` (CTA).
 */

import { motion } from "framer-motion";

type VinylButtonProps = {
  onClick?: () => void;
  size?: number;
  /** Continuous spin (np. player). Wyklucza się z `spinOnHover`. */
  spinning?: boolean;
  /** Rowki kręcą się tylko przy hoverze. */
  spinOnHover?: boolean;
  className?: string;
  label?: string;
  children?: React.ReactNode;
  ariaLabel?: string;
  disabled?: boolean;
};

const spring = { type: "spring" as const, stiffness: 380, damping: 22 };

const grooveHover = {
  rest: { rotate: 0 },
  hover: {
    rotate: 360,
    transition: { repeat: Infinity, duration: 6, ease: "linear" as const },
  },
};

const buttonScale = {
  rest: { scale: 1 },
  hover: { scale: 1.05, y: -4 },
  tap: { scale: 0.94, y: 0 },
};

export function VinylButton({
  onClick,
  size = 240,
  spinning = false,
  spinOnHover = false,
  className = "",
  label,
  children,
  ariaLabel,
  disabled = false,
}: VinylButtonProps) {
  const grooveOnHoverActive = spinOnHover && !spinning && !disabled;
  const ringWidth = Math.max(8, Math.round(size * 0.04));

  return (
    <motion.button
      type="button"
      disabled={disabled}
      aria-label={ariaLabel}
      onClick={onClick}
      className={[
        "relative shrink-0 cursor-pointer rounded-full p-0 outline-none focus-visible:ring-[6px] focus-visible:ring-yellow-300 disabled:pointer-events-none disabled:opacity-50",
        className,
      ].join(" ")}
      style={{ width: size, height: size }}
      initial="rest"
      whileHover={disabled ? undefined : "hover"}
      whileTap={disabled ? undefined : "tap"}
      variants={disabled ? undefined : buttonScale}
      transition={spring}
    >
      {/* outer rim — chunky bevel */}
      <span
        className="absolute inset-0 rounded-full bg-zinc-950"
        style={{
          boxShadow:
            "0 18px 0 0 rgba(0,0,0,0.85), inset 0 -8px 16px rgba(0,0,0,0.7), inset 0 6px 14px rgba(255,255,255,0.18), 0 0 60px rgba(168,85,247,0.45)",
          border: `${ringWidth}px solid #000`,
        }}
      />

      {/* grooves */}
      <motion.span
        className="pointer-events-none absolute rounded-full"
        style={{
          inset: ringWidth + 6,
          background:
            "repeating-conic-gradient(from 0deg, #18181b 0deg 4deg, #2a2a31 4deg 8deg)",
          boxShadow:
            "inset 0 0 30px rgba(0,0,0,0.6), inset 0 0 8px rgba(255,255,255,0.08)",
        }}
        variants={grooveOnHoverActive ? grooveHover : undefined}
        animate={
          spinning
            ? { rotate: 360 }
            : grooveOnHoverActive
              ? undefined
              : { rotate: 0 }
        }
        transition={
          spinning
            ? { repeat: Infinity, duration: 4, ease: "linear" }
            : undefined
        }
      />

      {/* highlight sweep on top half */}
      <span
        className="pointer-events-none absolute rounded-full opacity-60 mix-blend-screen"
        style={{
          inset: ringWidth + 4,
          background:
            "conic-gradient(from 220deg, transparent 0deg, rgba(255,255,255,0.16) 30deg, transparent 90deg, transparent 360deg)",
        }}
      />

      {/* label sticker */}
      <span
        className="pointer-events-none absolute rounded-full border-[5px] border-black"
        style={{
          inset: "22%",
          background:
            "conic-gradient(from 200deg, #f472b6, #fbbf24, #38bdf8, #a78bfa, #f472b6)",
          boxShadow:
            "inset 0 -6px 14px rgba(0,0,0,0.45), inset 0 4px 10px rgba(255,255,255,0.35), 0 0 22px rgba(168,85,247,0.45)",
        }}
      />

      {/* spindle hole + glyph */}
      <span
        className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[5px] border-black bg-white shadow-[inset_0_3px_8px_rgba(0,0,0,0.35)]"
        style={{ width: "28%", height: "28%", fontSize: Math.round(size * 0.18) }}
      >
        {children ?? (label ? <span className="font-black text-black drop-shadow-[0_2px_0_rgba(0,0,0,0.25)]">{label}</span> : null)}
      </span>
    </motion.button>
  );
}
