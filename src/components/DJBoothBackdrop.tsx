import { motion } from "framer-motion";

function rand(seed: number) {
  const x = Math.sin(seed * 12.9898 + seed * 0.431) * 43758.5453;
  return x - Math.floor(x);
}

/** Konfetti: pełna szerokość od górnej krawędzi, opada ~do połowy ekranu, coraz bardziej przezroczyste. */
function TopConfettiBar() {
  const n = 86;
  return (
    <div className="pointer-events-none absolute left-0 right-0 top-0 z-[1] h-[50dvh] overflow-hidden">
      {[...Array(n)].map((_, i) => {
        const jitter = rand(i + 17) * 3.2 - 1.6;
        const baseX = (i / Math.max(n - 1, 1)) * 100 + jitter;
        const left = `${Math.min(99, Math.max(0, baseX))}%`;
        const w = 4 + rand(i + 99) * 13;
        const h = w * (0.42 + rand(i + 3) * 1.45);
        const dur = 9 + rand(i + 55) * 11;
        const delay = rand(i + 303) * 5;
        const delay2 = rand(i + 707) * 2.2;
        const colors = [
          "bg-fuchsia-400",
          "bg-yellow-300",
          "bg-cyan-400",
          "bg-rose-400",
          "bg-lime-400",
          "bg-white",
          "bg-violet-400",
          "bg-amber-300",
        ];
        const c = colors[Math.floor(rand(i + 909) * colors.length)];
        const rot = rand(i + 444) * 720 - 360;
        const fall = `${36 + rand(i + 66) * 22}vh`;
        const sway = `${(rand(i + 515) - 0.5) * 18}vw`;
        return (
          <motion.span
            key={i}
            className={`absolute top-[-5%] rounded-sm shadow-sm ${c}`}
            style={{
              left,
              width: w,
              height: h,
            }}
            initial={{ y: "-8vh", opacity: 0 }}
            animate={{
              y: ["-4vh", fall],
              x: ["0vw", sway],
              rotate: [0, rot],
              opacity: [0, 0.95, 0.72, 0.25, 0],
            }}
            transition={{
              duration: dur,
              repeat: Infinity,
              ease: "linear",
              delay: delay + delay2,
              times: [0, 0.07, 0.32, 0.68, 1],
              repeatDelay: rand(i + 222) * 1.5,
            }}
          />
        );
      })}
    </div>
  );
}

/** Tło: disco + szeroki gradient i konfetti z górnej krawędzi. */
export function DJBoothBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden bg-[#0b0618]">
      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% -10%, rgba(168,85,247,0.35), transparent 55%), radial-gradient(95% 60% at 10% 0%, rgba(250,204,21,0.15), transparent 45%), radial-gradient(95% 60% at 90% 0%, rgba(236,72,153,0.18), transparent 48%), radial-gradient(90% 70% at 100% 100%, rgba(34,211,238,0.2), transparent 50%), radial-gradient(90% 70% at 0% 100%, rgba(244,114,182,0.18), transparent 50%), linear-gradient(180deg, #140a34 0%, #1b0f3f 42%, #0f0624 100%)",
        }}
      />

      {/* Subtelny pasek „światła” na szerokość u góry */}
      <div
        className="absolute inset-x-0 top-0 z-[1] h-[14px] sm:h-[18px]"
        style={{
          background:
            "linear-gradient(90deg,transparent,rgba(250,232,155,0.55),rgba(233,178,255,0.55),rgba(165,243,252,0.45),transparent)",
          boxShadow:
            "0 10px 45px rgba(250,232,155,0.25), 0 0 80px rgba(168,85,247,0.35)",
        }}
      />

      <TopConfettiBar />

      <motion.div
        className="absolute -left-[18%] top-[28%] z-0 h-[65vmin] w-[65vmin] rounded-full bg-fuchsia-500/22 blur-[88px]"
        animate={{ x: [0, 28, -12, 0], y: [0, 16, -8, 0] }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-[14%] bottom-[6%] z-0 h-[60vmin] w-[60vmin] rounded-full bg-cyan-400/17 blur-[82px]"
        animate={{ x: [0, -28, 10, 0], y: [0, -20, 8, 0] }}
        transition={{ duration: 27, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute left-1/2 top-[42%] z-0 h-[50vmin] w-[92vmin] -translate-x-1/2 rounded-full bg-yellow-400/11 blur-[95px]"
        animate={{ opacity: [0.3, 0.52, 0.36], scale: [0.96, 1.05, 0.98] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="absolute inset-0 z-0 opacity-[0.28] bg-[radial-gradient(circle,rgba(255,255,255,0.88)_1px,transparent_1.5px)] bg-size-[13px_13px]" />

      <div className="absolute inset-x-[-10%] bottom-0 z-0 h-[38%] bg-linear-to-t from-indigo-950/90 via-purple-950/40 to-transparent" />
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_50%_82%,rgba(250,204,21,0.1),transparent_55%)]" />
      <div className="absolute inset-0 z-0 bg-[radial-gradient(transparent_60%,rgba(0,0,0,0.45))]" />
    </div>
  );
}
