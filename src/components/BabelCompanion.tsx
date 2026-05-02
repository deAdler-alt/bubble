import { motion } from "framer-motion";

type BabelCompanionProps = {
  message: string;
  mode?: "default" | "singing";
  className?: string;
  layoutId?: string;
};

export function BabelCompanion({
  message,
  mode = "default",
  className = "",
  layoutId = "babel",
}: BabelCompanionProps) {
  const singing = mode === "singing";

  return (
    <motion.div
      layoutId={layoutId}
      layout
      className={`relative flex flex-col items-center gap-2 ${className}`}
      animate={
        singing
          ? {
              y: [0, -14, 0],
              scale: [1, 1.08, 1],
            }
          : { y: [0, -10, 0] }
      }
      transition={
        singing
          ? {
              duration: 0.85,
              repeat: Infinity,
              ease: "easeInOut",
            }
          : {
              duration: 2.8,
              repeat: Infinity,
              ease: "easeInOut",
            }
      }
    >
      <div
        className={[
          "relative rounded-[2rem] px-6 py-4 text-center text-xl font-bold leading-snug tracking-wide text-black shadow-xl ring-4 ring-black sm:text-2xl",
          "bg-linear-to-br from-yellow-300 via-orange-300 to-pink-400",
          singing ? "ring-fuchsia-500 shadow-[0_0_40px_rgba(236,72,153,0.85)]" : "",
        ].join(" ")}
      >
        <span className="absolute -bottom-4 left-1/2 size-8 -translate-x-1/2 rotate-45 bg-orange-300 ring-4 ring-black" />
        <p className="relative z-10">{message}</p>
      </div>

      <motion.div
        className={[
          "relative mt-6 flex size-28 items-center justify-center rounded-[40%_60%_55%_45%] shadow-2xl ring-4 ring-black sm:size-36",
          "bg-linear-to-br from-cyan-300 via-violet-400 to-fuchsia-500",
          singing
            ? "shadow-[0_0_48px_rgba(168,85,247,0.95)] outline outline-8 outline-yellow-300/90"
            : "",
        ].join(" ")}
        animate={singing ? { rotate: [-3, 3, -3] } : {}}
        transition={
          singing
            ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" }
            : undefined
        }
      >
        <div className="absolute inset-[18%] rounded-[45%_55%_48%_52%] bg-white/35 blur-sm" />
        <div className="relative flex size-[58%] items-center justify-center rounded-full bg-white/80 text-4xl shadow-inner sm:text-5xl">
          <span aria-hidden>•ᴗ•</span>
        </div>
        <span className="absolute -right-2 top-4 size-5 rounded-full bg-white ring-2 ring-black" />
        <span className="absolute -left-1 bottom-6 size-4 rounded-full bg-white ring-2 ring-black" />
      </motion.div>
    </motion.div>
  );
}
