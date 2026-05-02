import { motion } from "framer-motion";

export function DJBoothBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden bg-violet-950">
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse at 50% 20%, rgba(250,204,21,0.45), transparent 55%), radial-gradient(circle at 20% 80%, rgba(244,114,182,0.5), transparent 40%), radial-gradient(circle at 80% 75%, rgba(56,189,248,0.45), transparent 45%)",
        }}
      />

      <svg
        className="absolute -left-10 top-12 h-40 w-[120%] rotate-[-4deg] text-yellow-400/40"
        viewBox="0 0 800 120"
        fill="none"
        aria-hidden
      >
        <path
          d="M10 80 Q 120 10 260 70 T 520 60 T 780 90"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
        />
      </svg>

      <div className="absolute bottom-0 left-0 right-0 h-[46%] bg-linear-to-t from-indigo-950 via-fuchsia-900/70 to-transparent" />

      <motion.div
        className="absolute bottom-[-6%] left-[-5%] right-[-5%] h-[38%] skew-y-[-2deg] rounded-t-[40%] bg-linear-to-br from-purple-700 via-pink-600 to-cyan-500 shadow-[0_-20px_60px_rgba(0,0,0,0.6)] ring-8 ring-yellow-400/70"
        animate={{ skewX: [-0.8, 0.8, -0.8] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="absolute left-[8%] top-[12%] h-4 w-[25%] rotate-[-6deg] rounded-full bg-yellow-300/40 blur-md" />
        <div className="absolute right-[10%] top-[20%] h-6 w-[30%] rotate-[8deg] rounded-full bg-cyan-300/35 blur-md" />
        <div className="absolute bottom-[18%] left-1/2 h-3 w-[40%] -translate-x-1/2 rounded-full bg-black/25" />
      </motion.div>

      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] bg-size-[22px_22px] opacity-30 mix-blend-overlay" />

      <div className="absolute inset-0 bg-[radial-gradient(transparent_60%,rgba(0,0,0,0.55))]" />
    </div>
  );
}
