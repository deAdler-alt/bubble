/**
 * START — jedna kolumna na gridzie: tytuł / scena (Bąbel) / płyta. Bez bocznych ramek.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { motion, useAnimationFrame, useMotionValue } from "framer-motion";
import { VinylButton } from "../components/VinylButton";
import { screenStartRoot } from "./screenLayout";

const DIALOGUE_LINES = [
  "Cześć! Jestem Bąbel!",
  "Zróbmy razem super piosenkę!",
  "Naciśnij wielką płytę!",
] as const;

const LINES_ROTATE_MS = 10_000;

const MASCOT_BOUNDS_W = 268;
const MASCOT_BOUNDS_H = 352;

const DRIFT_AX = 0.42;
const DRIFT_AY = 0.36;
const DRIFT_SECONDARY = 0.18;
const JITTER_AX = 6.5;

const mainGridStyle: CSSProperties = {
  display: "grid",
  width: "100%",
  height: "100%",
  minHeight: 0,
  gridTemplateColumns: "minmax(0, 1fr)",
  gridTemplateRows: "auto minmax(0, 1fr) auto",
  rowGap: 0,
};

function useResponsiveVinylSize() {
  const [size, setSize] = useState(260);
  useLayoutEffect(() => {
    const clamp = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const next = Math.round(Math.min(vw * 0.42, vh * 0.3));
      setSize(Math.min(420, Math.max(200, next)));
    };
    clamp();
    window.addEventListener("resize", clamp);
    return () => window.removeEventListener("resize", clamp);
  }, []);
  return size;
}

type StartScreenProps = {
  onPlay: () => void;
};

function DjMenuMegaTitle() {
  const font =
    "'Bungee',Impact,Haettenschweiler,ui-sans-serif,system-ui,sans-serif";
  const unified = {
    fontFamily: font,
    fontSize: "clamp(2rem, min(11vw, 10dvh), 6.25rem)",
    letterSpacing: "0.14em",
    lineHeight: 1.02,
    textTransform: "uppercase" as const,
    backgroundImage:
      "linear-gradient(175deg,#fff8c9 0%,#fde68a 18%,#d8b4fe 52%,#6b21a8 92%)",
    WebkitBackgroundClip: "text" as const,
    backgroundClip: "text" as const,
    color: "transparent",
    textShadow:
      "0 12px 0 #0b0118,0 22px 0 rgba(0,0,0,0.55),0 0 38px rgba(168,85,247,0.85),0 0 80px rgba(250,204,21,0.35)",
    paddingBottom: "0.08em",
  };

  return (
    <div className="flex w-full items-center justify-center px-2 pt-[max(env(safe-area-inset-top),12px)] pb-2 [-webkit-font-smoothing:antialiased]">
      <motion.h1
        className="text-center font-black"
        style={unified}
        initial={{ scale: 0.88, y: -10, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 18 }}
      >
        DJ&nbsp;BAIBEL
      </motion.h1>
    </div>
  );
}

export function StartScreen({ onPlay }: StartScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const vinylSize = useResponsiveVinylSize();

  return (
    <motion.div
      key="start"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      className={screenStartRoot}
    >
      <div className="h-full min-h-0 w-full" style={mainGridStyle}>
        <div style={{ gridRow: 1, gridColumn: 1 }}>
          <DjMenuMegaTitle />
        </div>

        <div
          ref={containerRef}
          className="relative z-10 min-h-0 overflow-hidden"
          style={{ gridRow: 2, gridColumn: 1 }}
        >
          <StartFloatingBabel containerRef={containerRef} />
        </div>

        <div
          className="flex min-h-0 items-end justify-center px-2 pb-[max(env(safe-area-inset-bottom),22px)] pt-4"
          style={{ gridRow: 3, gridColumn: 1 }}
        >
          <VinylButton
            size={vinylSize}
            spinOnHover
            spinning={false}
            onClick={onPlay}
            ariaLabel="Start — naciśnij wielką płytę"
            label="▶"
          />
        </div>
      </div>
    </motion.div>
  );
}

type StartFloatingBabelProps = {
  containerRef: RefObject<HTMLDivElement | null>;
};

function StartFloatingBabel({ containerRef }: StartFloatingBabelProps) {
  const x = useMotionValue(12);
  const y = useMotionValue(12);
  const layout = useRef({ pad: 10, cw: 400, ch: 800 });

  const [dialogueIndex, setDialogueIndex] = useState(0);

  useLayoutEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const update = () => {
      const r = root.getBoundingClientRect();
      layout.current.cw = r.width;
      layout.current.ch = r.height;
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(root);
    return () => ro.disconnect();
  }, [containerRef]);

  useAnimationFrame((time) => {
    const { pad, cw, ch } = layout.current;
    const w = Math.min(MASCOT_BOUNDS_W, cw - pad * 2);
    const h = Math.min(MASCOT_BOUNDS_H, ch - pad * 2);
    const maxX = Math.max(pad, cw - w - pad);
    const maxY = Math.max(pad, ch - h - pad);
    if (maxX <= pad || maxY <= pad) return;

    const u = time * 0.001;

    const normX =
      0.5 +
      0.48 * Math.sin(u * DRIFT_AX) * Math.cos(u * (DRIFT_AX * 0.28)) +
      0.08 * Math.sin(u * DRIFT_SECONDARY);
    const normY =
      0.5 +
      0.48 * Math.cos(u * DRIFT_AY + 1.15) * Math.sin(u * (DRIFT_AY * 0.22)) +
      0.08 * Math.sin(u * (DRIFT_SECONDARY * 1.2) + 0.5);

    const nx = pad + (maxX - pad) * normX + JITTER_AX * Math.sin(u * 3.05);
    const ny = pad + (maxY - pad) * normY + JITTER_AX * Math.sin(u * 3.55 + 0.9);

    x.set(Math.min(maxX, Math.max(pad, nx)));
    y.set(Math.min(maxY, Math.max(pad, ny)));
  });

  const bumpLine = useCallback(() => {
    setDialogueIndex((i) => (i + 1) % DIALOGUE_LINES.length);
  }, []);

  useEffect(() => {
    const id = window.setInterval(bumpLine, LINES_ROTATE_MS);
    return () => window.clearInterval(id);
  }, [bumpLine]);

  return (
    <motion.div
      className="pointer-events-none absolute left-0 top-0 z-50 flex w-[min(88vw,18rem)] max-w-[18rem] flex-col items-center sm:max-w-[19rem]"
      style={{ x, y }}
    >
      <ThoughtCloud key={dialogueIndex} line={DIALOGUE_LINES[dialogueIndex]} />
      <img
        src="/babel-mascot.png"
        alt="Bąbel"
        draggable={false}
        className="relative z-[1] mt-[6px] w-[min(38vmin,15rem)] max-w-[90%] select-none drop-shadow-[0_18px_0_rgba(0,0,0,0.55)] sm:w-[min(36vmin,17rem)]"
      />
    </motion.div>
  );
}

function ThoughtCloud({ line }: { line: string }) {
  return (
    <motion.div
      className="relative z-[2] w-full"
      layout
      initial={{ scale: 0.62, opacity: 0, y: 26 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 26, mass: 0.55 }}
    >
      <div className="relative rounded-[2.25rem] border-[6px] border-black bg-linear-to-br from-sky-100 via-white to-amber-100 px-5 py-4 text-center shadow-[0_14px_0_0_black] ring-4 ring-cyan-400/80">
        <motion.p
          className="min-h-[2.5rem] text-balance font-sans text-[clamp(1.02rem,3.9vmin,1.48rem)] font-extrabold leading-snug tracking-wide text-zinc-900"
          initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ type: "spring", stiffness: 380, damping: 22, delay: 0.05 }}
        >
          {line}
        </motion.p>
      </div>
    </motion.div>
  );
}
