import type { CSSProperties } from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Pause, Play, RotateCcw } from "lucide-react";
import { getBabelVoice } from "../api/djApi";
import type { GeneratedSong } from "../api/djApi";
import { VinylButton } from "../components/VinylButton";
import { SCREEN_PAD_X } from "./screenLayout";

type PlayerScreenProps = {
  song: GeneratedSong;
  onRestart: () => void;
};

/** Środek: Bąbel na górze w App — mniejszy dolny zapas niż przy bottom-docku. */
const playerShell = `relative h-[100dvh] w-full min-h-0 overflow-hidden ${SCREEN_PAD_X} pt-[max(env(safe-area-inset-top),10px)] pb-[max(env(safe-area-inset-bottom),20px)]`;

const playerGridStyle: CSSProperties = {
  display: "grid",
  height: "100%",
  width: "100%",
  minHeight: 0,
  gridTemplateRows: "auto auto minmax(0, 1fr) auto",
  gridTemplateColumns: "minmax(0, 1fr)",
  rowGap: "clamp(0.75rem, 3vh, 1.75rem)",
  justifyItems: "center",
};

export function PlayerScreen({ song, onRestart }: PlayerScreenProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [lyricIndex, setLyricIndex] = useState(0);

  const playTrack = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    void el.play().catch(() => {});
    setPlaying(true);
  }, []);

  const pauseTrack = useCallback(() => {
    audioRef.current?.pause();
    setPlaying(false);
  }, []);

  const lyricsKey = song.lyrics.join("|");

  useEffect(() => {
    setLyricIndex(0);
    const el = audioRef.current;
    if (!el) return;
    el.load();
    void getBabelVoice("Wow, ale hit!");
  }, [song.audioUrl, lyricsKey]);

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

  const [vinylPx, setVinylPx] = useState(240);
  useLayoutEffect(() => {
    const apply = () => {
      const m = Math.min(window.innerWidth, window.innerHeight);
      setVinylPx(Math.min(300, Math.max(184, Math.round(m * 0.34))));
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  return (
    <motion.div
      key="player"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      className={playerShell}
    >
      <audio
        ref={audioRef}
        src={song.audioUrl}
        preload="auto"
        onEnded={() => setPlaying(false)}
      />

      <div style={playerGridStyle} className="mx-auto max-w-xl">
        <div className="flex w-full flex-col items-center gap-6" style={{ gridRow: 1 }}>
          <VinylButton
            size={vinylPx}
            spinning={playing}
            onClick={() => (playing ? pauseTrack() : playTrack())}
            ariaLabel={playing ? "Pauza na płycie" : "Odtwórz na płycie"}
            label="♪"
          />
          <div className="flex flex-wrap items-center justify-center gap-6">
            <PadButton
              ariaLabel={playing ? "Pauza" : "Odtwórz"}
              onClick={() => (playing ? pauseTrack() : playTrack())}
              className="bg-linear-to-br from-lime-300 via-emerald-500 to-teal-700"
            >
              {playing ? (
                <Pause className="size-[min(12vw,3.75rem)] stroke-[3] text-white drop-shadow-[0_3px_0_black] sm:size-14" />
              ) : (
                <Play className="ml-1 size-[min(12vw,3.75rem)] stroke-[3] text-white drop-shadow-[0_3px_0_black] sm:ml-2 sm:size-14" />
              )}
            </PadButton>
          </div>
        </div>

        <motion.div
          style={{ gridRow: 2 }}
          className="w-full max-w-xl rounded-[2rem] border-[6px] border-black bg-black/72 px-4 py-5 text-center text-xl font-bold leading-tight text-yellow-200 shadow-[0_12px_0_0_rgba(0,0,0,0.75)] ring-4 ring-fuchsia-500/80 sm:px-6 sm:text-2xl"
          layout
        >
          <p className="min-h-[3rem]">{song.lyrics[lyricIndex] ?? "…"}</p>
        </motion.div>

        <div className="min-h-0 w-full" style={{ gridRow: 3 }} aria-hidden />

        <motion.button
          type="button"
          style={{ gridRow: 4 }}
          onClick={() => {
            pauseTrack();
            onRestart();
          }}
          className="w-full max-w-xl rounded-[2.25rem] border-[6px] border-black bg-linear-to-r from-cyan-400 via-fuchsia-500 to-amber-300 px-6 py-4 text-base font-black text-black shadow-[0_12px_0_0_black] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-yellow-200 sm:px-10 sm:text-lg"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
        >
          <span className="inline-flex items-center justify-center gap-3">
            <RotateCcw className="size-7 shrink-0 stroke-[3] sm:size-8" />
            Zróbmy nową piosenkę!
          </span>
        </motion.button>
      </div>
    </motion.div>
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
        "flex size-[min(28vw,8rem)] shrink-0 items-center justify-center rounded-[40%_60%_45%_55%] border-[6px] border-black shadow-[0_12px_0_0_rgba(0,0,0,0.85)] outline-none focus-visible:ring-4 focus-visible:ring-yellow-300 sm:size-32",
        className,
      ].join(" ")}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.9 }}
    >
      {children}
    </motion.button>
  );
}
