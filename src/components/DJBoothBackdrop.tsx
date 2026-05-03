/**
 * Disco-stage backdrop — desktop-first, "game UI" estetyka.
 * Warstwy (od dołu):
 *   1. Bazowy gradient
 *   2. Reflektory (cone gradients) latające z góry
 *   3. Disco ball z latającymi błyskami
 *   4. Mood orby
 *   5. Perspektywiczna podłoga sceny (grid receding)
 *   6. Subtelny szum (radial dots)
 *   7. Vignette
 */

import { motion } from "framer-motion";

/* ─────────────────────────────────────────────
   Spotlights (4 cone gradients sweeping)
   ───────────────────────────────────────────── */
function Spotlights() {
  const cones = [
    { left: "12%", color: "rgba(250,204,21,0.22)", duration: 9, angle: -22 },
    { left: "32%", color: "rgba(244,114,182,0.22)", duration: 11, angle: -8 },
    { left: "62%", color: "rgba(56,189,248,0.22)", duration: 10, angle: 10 },
    { left: "82%", color: "rgba(168,85,247,0.22)", duration: 12, angle: 24 },
  ] as const;

  return (
    <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
      {cones.map((c, i) => (
        <motion.div
          key={i}
          className="absolute -top-[8%] origin-top"
          style={{
            left: c.left,
            width: "16vw",
            height: "120vh",
            background: `linear-gradient(180deg, ${c.color} 0%, transparent 70%)`,
            clipPath: "polygon(40% 0, 60% 0, 100% 100%, 0% 100%)",
            filter: "blur(2px)",
            mixBlendMode: "screen",
          }}
          animate={{ rotate: [c.angle - 6, c.angle + 6, c.angle - 6] }}
          transition={{ duration: c.duration, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Disco ball (top center)
   ───────────────────────────────────────────── */
function DiscoBall() {
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-[1.5%] z-[2] -translate-x-1/2 select-none"
      style={{ width: "clamp(80px, 7vw, 140px)" }}
    >
      <div className="relative aspect-square">
        {/* hanging chain */}
        <span className="absolute -top-[60px] left-1/2 h-16 w-1 -translate-x-1/2 bg-linear-to-b from-zinc-700 to-zinc-400/80 shadow" />

        {/* sphere */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 32% 28%, #ffffff 0%, #e5e7eb 18%, #94a3b8 45%, #1e293b 80%, #0f172a 100%), repeating-conic-gradient(from 0deg, rgba(255,255,255,0.18) 0deg 12deg, rgba(0,0,0,0.25) 12deg 24deg)",
            backgroundBlendMode: "overlay",
            boxShadow:
              "0 0 60px rgba(168,85,247,0.55), 0 0 120px rgba(56,189,248,0.35), inset -10px -16px 24px rgba(0,0,0,0.55), inset 10px 12px 20px rgba(255,255,255,0.35)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
        />

        {/* mosaic facets overlay */}
        <motion.div
          className="absolute inset-0 rounded-full opacity-90"
          style={{
            background:
              "repeating-linear-gradient(45deg, rgba(255,255,255,0.15) 0 6px, transparent 6px 12px), repeating-linear-gradient(-45deg, rgba(0,0,0,0.18) 0 6px, transparent 6px 12px)",
            mixBlendMode: "overlay",
          }}
          animate={{ rotate: -360 }}
          transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
        />

        {/* twinkles around the ball */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <motion.span
            key={i}
            className="absolute size-2 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,0.95)]"
            style={{
              left: `${20 + ((i * 13) % 70)}%`,
              top: `${10 + ((i * 17) % 80)}%`,
            }}
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
            transition={{
              duration: 1.6 + i * 0.13,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.18,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Stage floor (perspective grid receding)
   ───────────────────────────────────────────── */
function StageFloor() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[34vh]">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgba(8,4,28,0.55) 35%, rgba(8,4,28,0.95) 100%)",
        }}
      />
      <div
        className="absolute inset-0 origin-bottom"
        style={{
          transform: "perspective(800px) rotateX(62deg)",
          backgroundImage:
            "linear-gradient(rgba(168,85,247,0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.45) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage:
            "linear-gradient(180deg, transparent 0%, black 18%, black 80%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(180deg, transparent 0%, black 18%, black 80%, transparent 100%)",
        }}
      />
      {/* horizon glow */}
      <div
        className="absolute inset-x-[-6%] bottom-[28%] h-[22%] blur-[28px]"
        style={{
          background:
            "linear-gradient(90deg, rgba(244,114,182,0.0), rgba(244,114,182,0.55), rgba(56,189,248,0.55), rgba(250,204,21,0.45), rgba(244,114,182,0.0))",
        }}
      />
    </div>
  );
}

export function DJBoothBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden bg-[#0a0420]">
      {/* base */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% -10%, rgba(168,85,247,0.42), transparent 55%), radial-gradient(95% 60% at 10% 0%, rgba(250,204,21,0.18), transparent 45%), radial-gradient(95% 60% at 90% 0%, rgba(236,72,153,0.22), transparent 48%), radial-gradient(90% 70% at 100% 100%, rgba(34,211,238,0.24), transparent 50%), radial-gradient(90% 70% at 0% 100%, rgba(244,114,182,0.22), transparent 50%), linear-gradient(180deg, #150b3a 0%, #1d1148 42%, #0c0420 100%)",
        }}
      />

      {/* (usunięty wcześniejszy "neonowy pasek" u góry — zostają tylko reflektory) */}

      <Spotlights />
      <DiscoBall />

      {/* big mood orbs */}
      <motion.div
        className="absolute -left-[16%] top-[28%] z-0 h-[68vmin] w-[68vmin] rounded-full bg-fuchsia-500/24 blur-[100px]"
        animate={{ x: [0, 30, -14, 0], y: [0, 18, -10, 0] }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-[12%] bottom-[10%] z-0 h-[62vmin] w-[62vmin] rounded-full bg-cyan-400/20 blur-[95px]"
        animate={{ x: [0, -28, 12, 0], y: [0, -22, 10, 0] }}
        transition={{ duration: 27, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute left-1/2 top-[42%] z-0 h-[52vmin] w-[96vmin] -translate-x-1/2 rounded-full bg-yellow-400/12 blur-[110px]"
        animate={{ opacity: [0.32, 0.55, 0.36], scale: [0.96, 1.06, 0.98] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* dotted texture */}
      <div className="absolute inset-0 z-0 opacity-[0.22] bg-[radial-gradient(circle,rgba(255,255,255,0.85)_1px,transparent_1.5px)] bg-size-[14px_14px]" />

      <StageFloor />

      {/* vignette */}
      <div className="absolute inset-0 z-[2] bg-[radial-gradient(transparent_55%,rgba(0,0,0,0.55))]" />
    </div>
  );
}
