import { useState } from "react";
import { motion } from "framer-motion";
import { Mic } from "lucide-react";
import { startRecordingSTT, stopRecordingSTT } from "../api/djApi";

type RecordingScreenProps = {
  onRecordingDone: (transcript: string) => void;
};

type Phase = "idle" | "starting" | "recording" | "stopping";

export function RecordingScreen({ onRecordingDone }: RecordingScreenProps) {
  const [phase, setPhase] = useState<Phase>("idle");

  async function handleMicPress() {
    if (phase === "idle" || phase === "starting") {
      setPhase("starting");
      await startRecordingSTT();
      setPhase("recording");
      return;
    }
    if (phase === "recording") {
      setPhase("stopping");
      const { transcript } = await stopRecordingSTT(null);
      onRecordingDone(transcript);
    }
  }

  const busy = phase === "starting" || phase === "stopping";

  return (
    <motion.div
      key="nagrywanie"
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      className="flex min-h-[100dvh] flex-col items-center justify-center gap-12 px-4 pb-36 pt-[8vh]"
    >
      <div className="relative flex flex-col items-center gap-10">
        {phase === "recording" ? <AudioWaves /> : null}

        <motion.button
          type="button"
          aria-label={
            phase === "recording"
              ? "Zatrzymaj nagrywanie"
              : "Naciśnij mikrofon i powiedz, o czym jest piosenka"
          }
          disabled={busy}
          onClick={() => void handleMicPress()}
          className={[
            "relative flex size-52 items-center justify-center rounded-[45%_55%_50%_50%] border-[8px] border-black text-white shadow-[0_16px_0_0_rgba(0,0,0,0.82)] outline-none transition focus-visible:ring-4 focus-visible:ring-yellow-300 disabled:opacity-75 sm:size-64",
            phase === "recording"
              ? "bg-linear-to-br from-pink-500 via-red-500 to-yellow-400 shadow-[0_0_50px_rgba(244,114,182,1),0_16px_0_0_rgba(0,0,0,0.82)]"
              : "bg-linear-to-br from-cyan-400 via-blue-600 to-purple-700",
          ].join(" ")}
          animate={
            phase === "recording"
              ? {
                  scale: [1, 1.06, 1],
                }
              : { scale: [1, 1.03, 1] }
          }
          transition={
            phase === "recording"
              ? { duration: 0.8, repeat: Infinity, ease: "easeInOut" }
              : { duration: 2.8, repeat: Infinity, ease: "easeInOut" }
          }
          whileHover={busy ? undefined : { scale: 1.05 }}
          whileTap={busy ? undefined : { scale: 0.94 }}
        >
          <Mic className="size-24 stroke-[3] sm:size-28" />
          <span className="absolute -bottom-3 left-1/2 h-5 w-[70%] -translate-x-1/2 rounded-full bg-yellow-400/60 blur-xl" />
        </motion.button>
      </div>
    </motion.div>
  );
}

function AudioWaves() {
  const heights = ["40%", "75%", "55%", "95%", "50%", "82%", "45%"];
  return (
    <div className="flex h-32 items-end justify-center gap-2 sm:h-36 sm:gap-3">
      {heights.map((h, i) => (
        <motion.span
          key={i}
          className="w-4 rounded-full bg-linear-to-t from-purple-700 via-pink-500 to-yellow-300 ring-2 ring-black sm:w-5"
          style={{ height: h }}
          animate={{ scaleY: [0.65, 1.25, 0.65], opacity: [0.75, 1, 0.75] }}
          transition={{
            duration: 0.45 + i * 0.05,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.08,
          }}
        />
      ))}
    </div>
  );
}
