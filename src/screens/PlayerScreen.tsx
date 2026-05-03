/**
 * PLAYER — main stage. Wielki winyl, lyric ticker, sterowanie, restart.
 * Bąbel u góry (App).
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play, RotateCcw } from "lucide-react";
import type { GeneratedSong } from "../api/djApi";
import { shutUpBabel, speakBabel } from "../lib/speech";
import { VinylButton } from "../components/VinylButton";
import { screenPlayerRoot } from "./screenLayout";

type PlayerScreenProps = {
  song: GeneratedSong;
  onRestart: () => void;
};

export function PlayerScreen({ song, onRestart }: PlayerScreenProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [lyricIndex, setLyricIndex] = useState(0);
  const [audioError, setAudioError] = useState(false);
  const vinylPx = useStageSize({ vw: 0.3, vh: 0.4, min: 280, max: 480 });

  const playTrack = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    setAudioError(false);
    void el.play().catch(() => {
      setAudioError(true);
      setPlaying(false);
    });
    setPlaying(true);
  }, []);

  const pauseTrack = useCallback(() => {
    audioRef.current?.pause();
    setPlaying(false);
  }, []);

  const lyricsKey = song.lyrics.join("|");

  // Bąbel mówi raz przy załadowaniu nowej piosenki.
  useEffect(() => {
    setLyricIndex(0);
    setAudioError(false);
    const el = audioRef.current;
    if (el) el.load();
    speakBabel(`Wow, ale hit! ${song.title}`);
    return () => {
      shutUpBabel();
    };
  }, [song.audioUrl, lyricsKey, song.title]);

  // Lyrics ticker
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setLyricIndex((i) => {
        const next = i + 1;
        if (next >= song.lyrics.length) return i;
        return next;
      });
    }, 2200);
    return () => window.clearInterval(id);
  }, [playing, song.lyrics.length]);

  return (
    <motion.div
      key="player"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.42 }}
      className={screenPlayerRoot}
    >
      <audio
        ref={audioRef}
        src={song.audioUrl}
        preload="auto"
        onEnded={() => {
          setPlaying(false);
          speakBabel("Bis? Naciśnij play albo zróbmy nową piosenkę!");
        }}
        onError={() => {
          setAudioError(true);
          setPlaying(false);
        }}
      />

      {audioError ? (
        <div
          className="absolute left-1/2 top-[clamp(7rem,18dvh,10rem)] z-40 -translate-x-1/2 max-w-[42rem] rounded-2xl border-[5px] border-black bg-red-500/95 px-6 py-3 text-center font-black text-white shadow-[0_8px_0_0_black]"
          style={{ fontSize: "clamp(0.9rem, min(1.5vw, 1.8vh), 1.25rem)" }}
          role="alert"
        >
          Nie udało się odtworzyć ścieżki — sprawdź połączenie i spróbuj ponownie.
        </div>
      ) : null}

      <div className="mx-auto grid h-full w-full max-w-[1100px] grid-rows-[auto_auto_minmax(0,1fr)_auto] place-items-center gap-[clamp(1rem,2dvh,2rem)]">
        {/* Title */}
        <motion.div
          className="w-full"
          initial={{ y: -16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <h1
            className="text-center font-black uppercase"
            style={{
              fontFamily:
                "'Bungee',Impact,Haettenschweiler,ui-sans-serif,system-ui,sans-serif",
              fontSize: "clamp(1.75rem, min(5vw, 8vh), 5rem)",
              letterSpacing: "0.12em",
              lineHeight: 0.98,
              backgroundImage:
                "linear-gradient(170deg,#fff,#fde68a 30%,#fb7185 70%,#7e22ce)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              textShadow: "0 10px 0 rgba(0,0,0,0.8), 0 0 60px rgba(244,114,182,0.45)",
            }}
          >
            {song.title}
          </h1>
        </motion.div>

        {/* Vinyl + controls */}
        <div className="flex w-full flex-col items-center gap-[clamp(1rem,2.5dvh,1.75rem)]">
          <div className="relative">
            <SpinningGlow size={vinylPx} active={playing} />
            <VinylButton
              size={vinylPx}
              spinning={playing}
              onClick={() => (playing ? pauseTrack() : playTrack())}
              ariaLabel={playing ? "Pauza na płycie" : "Odtwórz na płycie"}
              label="♪"
            />
          </div>

          <PadButton
            ariaLabel={playing ? "Pauza" : "Odtwórz"}
            onClick={() => (playing ? pauseTrack() : playTrack())}
            className="bg-linear-to-br from-lime-300 via-emerald-500 to-teal-700"
          >
            {playing ? (
              <Pause className="stroke-[3] text-white drop-shadow-[0_4px_0_black]" style={{ width: "60%", height: "60%" }} />
            ) : (
              <Play className="ml-[8%] stroke-[3] text-white drop-shadow-[0_4px_0_black]" style={{ width: "55%", height: "55%" }} />
            )}
          </PadButton>
        </div>

        {/* Lyrics */}
        <div className="flex w-full max-w-[860px] items-center justify-center px-2">
          <motion.div
            className="relative w-full overflow-hidden rounded-[2rem] border-[7px] border-black bg-black/72 px-8 py-7 text-center shadow-[0_14px_0_0_black] ring-4 ring-fuchsia-500/80"
            layout
          >
            <span
              className="pointer-events-none absolute inset-0 opacity-30 mix-blend-screen"
              style={{
                background:
                  "conic-gradient(from 220deg, transparent 0deg, rgba(255,255,255,0.55) 30deg, transparent 90deg, transparent 360deg)",
              }}
            />
            <AnimatePresence mode="wait">
              <motion.p
                key={lyricIndex}
                className="relative z-10 font-black leading-snug text-yellow-200"
                style={{ fontSize: "clamp(1.2rem, 2.6vw, 2.4rem)" }}
                initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
                transition={{ duration: 0.32 }}
              >
                {song.lyrics[lyricIndex] ?? "…"}
              </motion.p>
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Restart CTA */}
        <motion.button
          type="button"
          onClick={() => {
            pauseTrack();
            shutUpBabel();
            onRestart();
          }}
          className="mb-[max(env(safe-area-inset-bottom),24px)] w-[min(96vw,46rem)] rounded-[2.5rem] border-[8px] border-black bg-linear-to-r from-cyan-400 via-fuchsia-500 to-amber-300 px-[clamp(1.5rem,3vw,3rem)] py-[clamp(0.9rem,2dvh,1.4rem)] font-black uppercase tracking-[0.18em] text-black shadow-[0_14px_0_0_black,0_0_50px_rgba(168,85,247,0.55)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-yellow-200"
          style={{ fontSize: "clamp(1rem, 2vw, 1.65rem)" }}
          whileHover={{ scale: 1.04, y: -4 }}
          whileTap={{ scale: 0.96, y: 0 }}
        >
          <span className="inline-flex items-center justify-center gap-3">
            <RotateCcw className="size-[clamp(1.25rem,2vw,1.75rem)] shrink-0 stroke-[3]" />
            Zróbmy nową piosenkę!
          </span>
        </motion.button>
      </div>
    </motion.div>
  );
}

function SpinningGlow({ size, active }: { size: number; active: boolean }) {
  const d = size + 80;
  return (
    <motion.div
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
      style={{
        width: d,
        height: d,
        background:
          "conic-gradient(from 0deg, rgba(244,114,182,0.45), rgba(56,189,248,0.45), rgba(250,204,21,0.45), rgba(244,114,182,0.45))",
        filter: "blur(28px)",
      }}
      animate={
        active
          ? { rotate: 360, opacity: [0.7, 1, 0.7] }
          : { rotate: 0, opacity: 0.45 }
      }
      transition={
        active
          ? { rotate: { duration: 8, repeat: Infinity, ease: "linear" }, opacity: { duration: 2.4, repeat: Infinity, ease: "easeInOut" } }
          : undefined
      }
    />
  );
}

function PadButton({
  children,
  onClick,
  className,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  className: string;
  ariaLabel: string;
}) {
  return (
    <motion.button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={[
        "flex shrink-0 items-center justify-center rounded-[40%_60%_45%_55%] border-[7px] border-black shadow-[0_12px_0_0_rgba(0,0,0,0.85)] outline-none focus-visible:ring-[6px] focus-visible:ring-yellow-300",
        className,
      ].join(" ")}
      style={{
        width: "clamp(5rem, 9vw, 8.5rem)",
        height: "clamp(5rem, 9vw, 8.5rem)",
      }}
      whileHover={{ scale: 1.08, y: -4 }}
      whileTap={{ scale: 0.92, y: 0 }}
    >
      {children}
    </motion.button>
  );
}

function useStageSize({
  vw,
  vh,
  min,
  max,
}: {
  vw: number;
  vh: number;
  min: number;
  max: number;
}) {
  const [size, setSize] = useState(Math.round((min + max) / 2));
  useLayoutEffect(() => {
    const calc = () => {
      const s = Math.min(window.innerWidth * vw, window.innerHeight * vh);
      setSize(Math.min(max, Math.max(min, Math.round(s))));
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, [vw, vh, min, max]);
  return size;
}
