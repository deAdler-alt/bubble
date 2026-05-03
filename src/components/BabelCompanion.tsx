/**
 * Bąbel jako "in-game companion" — maskotka PNG + dymek mowy.
 * Opcje:
 *   - `mode`: "default" (chill float) | "singing" (wibracja w rytm)
 *   - `placement`: "stack" (bubble nad postacią) | "side" (bubble po prawej)
 *   - `size`: piksele postaci (domyślnie 220)
 */

import { motion } from "framer-motion";

type BabelCompanionProps = {
  message: string;
  mode?: "default" | "singing";
  placement?: "stack" | "side";
  size?: number;
  className?: string;
  layoutId?: string;
};

export function BabelCompanion({
  message,
  mode = "default",
  placement = "stack",
  size = 220,
  className = "",
  layoutId = "babel",
}: BabelCompanionProps) {
  const singing = mode === "singing";
  const isSide = placement === "side";

  return (
    <motion.div
      layoutId={layoutId}
      layout
      className={[
        "relative flex items-center",
        isSide ? "flex-row gap-5" : "flex-col gap-3",
        className,
      ].join(" ")}
      animate={
        singing
          ? { y: [0, -16, 0], scale: [1, 1.06, 1] }
          : { y: [0, -10, 0] }
      }
      transition={
        singing
          ? { duration: 0.85, repeat: Infinity, ease: "easeInOut" }
          : { duration: 2.8, repeat: Infinity, ease: "easeInOut" }
      }
    >
      {/* Bubble */}
      <div
        className={[
          "relative max-w-[26rem]",
          isSide ? "order-2" : "order-1",
        ].join(" ")}
      >
        <div
          className={[
            "relative rounded-[2rem] border-[6px] border-black bg-linear-to-br from-yellow-300 via-orange-300 to-pink-400 px-7 py-5 text-center text-2xl font-black leading-snug tracking-wide text-black shadow-[0_14px_0_0_black] sm:text-3xl",
            singing ? "ring-4 ring-fuchsia-500 shadow-[0_14px_0_0_black,0_0_50px_rgba(236,72,153,0.85)]" : "",
          ].join(" ")}
        >
          <span
            className={[
              "absolute size-7 rotate-45 border-[6px] border-black bg-orange-300",
              isSide ? "left-[-22px] top-1/2 -translate-y-1/2" : "-bottom-5 left-1/2 -translate-x-1/2",
            ].join(" ")}
          />
          <p className="relative z-10">{message}</p>
        </div>
      </div>

      {/* Mascot */}
      <motion.div
        className={[
          "relative shrink-0 select-none",
          isSide ? "order-1" : "order-2",
        ].join(" ")}
        style={{ width: size }}
        animate={singing ? { rotate: [-4, 4, -4] } : { rotate: 0 }}
        transition={
          singing
            ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" }
            : undefined
        }
      >
        {/* Aura */}
        <motion.div
          className={[
            "absolute inset-[-14%] rounded-full blur-2xl",
            singing ? "bg-fuchsia-500/65" : "bg-violet-500/35",
          ].join(" ")}
          animate={{ scale: [1, 1.1, 1], opacity: [0.6, 0.95, 0.6] }}
          transition={{
            duration: singing ? 1.1 : 2.4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <img
          src="/babel-mascot.png"
          alt="Bąbel"
          draggable={false}
          className="relative z-[1] block h-auto w-full drop-shadow-[0_18px_0_rgba(0,0,0,0.55)]"
        />
      </motion.div>
    </motion.div>
  );
}
