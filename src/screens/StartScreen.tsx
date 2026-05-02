import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { motion } from "framer-motion";
import { VinylButton } from "../components/VinylButton";

const DIALOGUE_LINES = [
  "Cześć! Jestem Bąbel!",
  "Zróbmy razem super piosenkę!",
  "Naciśnij wielką płytę!",
] as const;

/** Bufor (px): losowanie pozycji, żeby maskotka nie wychodziła poza viewport. */
const MASCOT_BOUNDS_W = 260;
const MASCOT_BOUNDS_H = 340;

function useResponsiveVinylSize() {
  const [size, setSize] = useState(280);
  useLayoutEffect(() => {
    const clamp = () => {
      const m = Math.min(window.innerWidth, window.innerHeight);
      setSize(Math.min(Math.round(m * 0.5), 440));
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

const speakerShellClass =
  "z-[2] max-h-[min(72dvh,560px)] w-[min(33vw,max(9rem,20rem))] min-w-[7rem] -translate-y-1/2";

export function StartScreen({ onPlay }: StartScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const vinylSize = useResponsiveVinylSize();

  return (
    <motion.div
      key="start"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.03 }}
      className="relative h-[100dvh] w-full overflow-hidden bg-transparent"
      ref={containerRef}
    >
      <div className="relative h-full w-full">
        <div
          className={`absolute left-[max(env(safe-area-inset-left),12px)] top-1/2 ${speakerShellClass}`}
        >
          <GiantSpeakerArt />
        </div>
        <div
          className={`absolute right-[max(env(safe-area-inset-right),12px)] top-1/2 ${speakerShellClass}`}
        >
          <div className="h-full scale-x-[-1]">
            <GiantSpeakerArt />
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 z-[15] flex items-center justify-center">
          <div className="pointer-events-auto">
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

        <StartFloatingBabel containerRef={containerRef} />
      </div>
    </motion.div>
  );
}

function GiantSpeakerArt() {
  return (
    <div className="flex h-full w-full flex-col" aria-hidden>
      <div className="relative mx-auto aspect-[7/11] max-h-full w-full rounded-[2rem] border-[clamp(6px,1.2vmin,14px)] border-black bg-linear-to-b from-fuchsia-500 via-violet-600 to-cyan-400 shadow-[0_clamp(10px,2vmin,22px)_0_0_rgba(0,0,0,0.8)]">
        <div className="absolute inset-[10%] rounded-2xl bg-black/58" />
        <div className="absolute left-1/2 top-[42%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-full border-[clamp(5px,0.9vmin,10px)] border-yellow-300 bg-zinc-900 pb-[62%] shadow-inner ring-4 ring-yellow-400/55" />
        <div className="absolute bottom-[7%] left-1/2 h-[clamp(12px,2.2vmin,20px)] w-[72%] -translate-x-1/2 rounded-full bg-yellow-300/82" />
      </div>
      <div className="mx-auto mt-[clamp(8px,1.8vmin,16px)] h-[clamp(12px,2vmin,22px)] w-[78%] rounded-full border-[clamp(5px,0.8vmin,10px)] border-black bg-zinc-800 shadow-[inset_0_4px_0_rgba(255,255,255,0.08)]" />
    </div>
  );
}

type StartFloatingBabelProps = {
  containerRef: RefObject<HTMLDivElement | null>;
};

function StartFloatingBabel({ containerRef }: StartFloatingBabelProps) {
  const [coords, setCoords] = useState({ x: 16, y: 16 });
  const [dialogueIndex, setDialogueIndex] = useState(0);

  const pickRandomPosition = useCallback(() => {
    const root = containerRef.current;
    if (!root) return;
    const { width: cw, height: ch } = root.getBoundingClientRect();
    const pad = 12;
    const w = Math.min(MASCOT_BOUNDS_W, cw - pad * 2);
    const h = Math.min(MASCOT_BOUNDS_H, ch - pad * 2);
    const maxLeft = Math.max(pad, cw - w - pad);
    const maxTop = Math.max(pad, ch - h - pad);
    if (maxLeft < pad || maxTop < pad) return;
    setCoords({
      x: pad + Math.random() * (maxLeft - pad),
      y: pad + Math.random() * (maxTop - pad),
    });
  }, [containerRef]);

  useLayoutEffect(() => {
    pickRandomPosition();
  }, [pickRandomPosition]);

  useEffect(() => {
    const intervalId = window.setInterval(pickRandomPosition, 8000);
    return () => window.clearInterval(intervalId);
  }, [pickRandomPosition]);

  useEffect(() => {
    const lineId = window.setInterval(() => {
      setDialogueIndex((i) => (i + 1) % DIALOGUE_LINES.length);
    }, 10000);
    return () => window.clearInterval(lineId);
  }, []);

  return (
    <motion.div
      className="pointer-events-none absolute left-0 top-0 z-50 flex w-[min(85vw,17rem)] max-w-[17rem] flex-col items-center sm:max-w-[18rem]"
      initial={false}
      animate={{ x: coords.x, y: coords.y }}
      transition={{
        x: { duration: 6.75, ease: [0.22, 1, 0.36, 1] },
        y: { duration: 6.75, ease: [0.22, 1, 0.36, 1] },
      }}
    >
      <div className="relative z-[2] mb-[-4px] w-full rounded-[2rem] border-[6px] border-black bg-linear-to-br from-yellow-300 via-orange-300 to-pink-400 px-5 py-3 text-center shadow-[0_14px_0_0_black] ring-4 ring-yellow-400/95">
        <p className="text-[clamp(0.98rem,3.8vmin,1.35rem)] font-bold leading-snug tracking-wide text-black">
          {DIALOGUE_LINES[dialogueIndex]}
        </p>
        <span
          className="absolute -bottom-3 left-[18%] size-8 rotate-45 bg-orange-300 ring-4 ring-black"
          aria-hidden
        />
      </div>
      <img
        src="/babel-mascot.png"
        alt="Bąbel"
        draggable={false}
        className="relative z-[1] w-[min(38vmin,14rem)] max-w-[88%] select-none drop-shadow-[0_18px_0_rgba(0,0,0,0.55)] sm:w-[min(34vmin,16rem)]"
      />
    </motion.div>
  );
}
