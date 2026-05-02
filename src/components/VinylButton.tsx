import { motion } from "framer-motion";

type VinylButtonProps = {
  onClick?: () => void;
  size?: number;
  /** Continuous spin (e.g. player). Mutually exclusive with `spinOnHover`. */
  spinning?: boolean;
  /** Grooves spin only while hovered (long smooth rotation). */
  spinOnHover?: boolean;
  className?: string;
  label?: string;
  children?: React.ReactNode;
  ariaLabel?: string;
  disabled?: boolean;
};

const spring = { type: "spring" as const, stiffness: 400, damping: 18 };

const grooveHoverVariants = {
  rest: { rotate: 0 },
  hover: {
    rotate: 360,
    transition: { repeat: Infinity, duration: 6, ease: "linear" as const },
  },
};

const buttonScaleVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.06 },
  tap: { scale: 0.94 },
};

export function VinylButton({
  onClick,
  size = 200,
  spinning = false,
  spinOnHover = false,
  className = "",
  label,
  children,
  ariaLabel,
  disabled = false,
}: VinylButtonProps) {
  const variantHoverGrooves = spinOnHover && !spinning && !disabled;

  return (
    <motion.button
      type="button"
      disabled={disabled}
      aria-label={ariaLabel}
      onClick={onClick}
      className={[
        "relative shrink-0 cursor-pointer rounded-full border-[6px] border-black bg-zinc-900 p-0 shadow-[0_12px_0_0_rgba(0,0,0,0.85)] outline-none focus-visible:ring-4 focus-visible:ring-yellow-300 disabled:pointer-events-none disabled:opacity-50",
        className,
      ].join(" ")}
      style={{ width: size, height: size }}
      initial="rest"
      whileHover={disabled ? undefined : "hover"}
      whileTap={disabled ? undefined : "tap"}
      variants={disabled ? undefined : buttonScaleVariants}
      transition={spring}
    >
      <motion.span
        className="pointer-events-none absolute inset-2 rounded-full"
        style={{
          background:
            "repeating-conic-gradient(from 0deg, #18181b 0deg 4deg, #27272a 4deg 8deg)",
        }}
        variants={variantHoverGrooves ? grooveHoverVariants : undefined}
        animate={
          spinning
            ? { rotate: 360 }
            : variantHoverGrooves
              ? undefined
              : { rotate: 0 }
        }
        transition={
          spinning
            ? { repeat: Infinity, duration: 4, ease: "linear" }
            : undefined
        }
      />
      <span
        className="pointer-events-none absolute inset-[18%] rounded-full border-4 border-black/60"
        style={{
          background:
            "conic-gradient(from 180deg, #f472b6, #a78bfa, #38bdf8, #fbbf24, #f472b6)",
        }}
      />
      <span className="pointer-events-none absolute left-1/2 top-1/2 flex size-[28%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-black bg-white text-3xl shadow-inner">
        {children ??
          (label ? (
            <span className="text-lg font-black text-black">{label}</span>
          ) : null)}
      </span>
    </motion.button>
  );
}
