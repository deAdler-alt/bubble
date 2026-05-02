import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Pause, Play, RotateCcw } from "lucide-react";
import { getBabelVoice } from "../api/djApi";
import type { GeneratedSong } from "../api/djApi";
import { VinylButton } from "../components/VinylButton";

type PlayerScreenProps = {
  song: GeneratedSong;
  onRestart: () => void;
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

  return (
    <motion.div
      key="player"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      className="flex min-h-[100dvh] flex-col items-center gap-10 px-4 pb-10 pt-[28vh] sm:pt-[32vh]"
    >
      <audio
        ref={audioRef}
        src={song.audioUrl}
        preload="auto"
        onEnded={() => setPlaying(false)}
      />

      <div className="flex flex-col items-center gap-10">
        <VinylButton
          size={240}
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
              <Pause className="size-14 stroke-[3] text-white drop-shadow-[0_3px_0_black]" />
            ) : (
              <Play className="ml-2 size-14 stroke-[3] text-white drop-shadow-[0_3px_0_black]" />
            )}
          </PadButton>
        </div>
      </div>

      <motion.div
        className="w-full max-w-xl rounded-[2rem] border-[6px] border-black bg-black/70 px-6 py-6 text-center text-2xl font-bold text-yellow-200 shadow-[0_12px_0_0_rgba(0,0,0,0.75)] ring-4 ring-fuchsia-500/80 sm:text-3xl"
        layout
      >
        <p className="min-h-[3.5rem] leading-tight">
          {song.lyrics[lyricIndex] ?? "…"}
        </p>
      </motion.div>

      <motion.button
        type="button"
        onClick={() => {
          pauseTrack();
          onRestart();
        }}
        className="rounded-[2.5rem] border-[6px] border-black bg-linear-to-r from-cyan-400 via-fuchsia-500 to-amber-300 px-8 py-5 text-lg font-black text-black shadow-[0_12px_0_0_black] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-yellow-200 sm:px-12 sm:text-xl"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.94 }}
      >
        <span className="inline-flex items-center gap-3">
          <RotateCcw className="size-8 stroke-[3]" />
          Zróbmy nową piosenkę!
        </span>
      </motion.button>
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
        "flex size-28 items-center justify-center rounded-[40%_60%_45%_55%] border-[6px] border-black shadow-[0_12px_0_0_rgba(0,0,0,0.85)] outline-none focus-visible:ring-4 focus-visible:ring-yellow-300 sm:size-32",
        className,
      ].join(" ")}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.9 }}
    >
      {children}
    </motion.button>
  );
}
