/**
 * RECORDING — pełnoekranowy ekran nagrywania.
 * Skład ekranu (od góry do dołu):
 *   ┌─────────── [1] BLOK NAGŁÓWKA ───────────┐
 *   │  „POWIEDZ MI O CZYM ŚPIEWAĆ" / inne     │
 *   ├─────────── [2] STREFA AKCJI ─────────────┤
 *   │  Fala dźwięku (gdy nagrywa) / placeholder│
 *   │  WIELKI MIKROFON (przycisk)              │
 *   │  CHIP statusu (np. „Nagrywam…")          │
 *   ├─────────── [3] BŁĄD/INFO ────────────────┤
 *   │  Komunikaty błędów (permission etc.)     │
 *   └──────────────────────────────────────────┘
 *
 * Flow: MediaRecorder w przeglądarce → Blob → POST /api/transcribe (Groq Whisper) → transcript.
 */

import { useLayoutEffect, useState } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff } from "lucide-react";
import { transcribeAudio, ApiError } from "../api/djApi";
import { useMediaRecorder, type RecorderState } from "../lib/recording";
import { screenFlowRoot } from "./screenLayout";

/* ╔════════════════════════════════════════════════════════════╗
   ║  TUNABLES                                                 ║
   ╚════════════════════════════════════════════════════════════╝ */

/** Odstęp BLOKU NAGŁÓWKA od górnej krawędzi ekranu.
 *  Zwiększ żeby OBNIŻYĆ napis nagłówka. */
const HEADER_TOP_OFFSET = "clamp(3rem, 12dvh, 9rem)";

/** Maksymalny rozmiar mikrofonu (przycisku centralnego). */
const MIC_MAX_PX = 540;

/* ╔════════════════════════════════════════════════════════════╗
   ║  KOMPONENT GŁÓWNY                                         ║
   ╚════════════════════════════════════════════════════════════╝ */

type RecordingScreenProps = {
  onRecordingDone: (transcript: string) => void;
};

type Phase =
  | "idle"
  | "asking-permission"
  | "recording"
  | "uploading"
  | "permission-denied"
  | "blocked-os"
  | "unsupported"
  | "error";

const IS_MAC =
  typeof navigator !== "undefined" &&
  /mac/i.test(navigator.platform || navigator.userAgent || "");

export function RecordingScreen({ onRecordingDone }: RecordingScreenProps) {
  const recorder = useMediaRecorder();
  const [phase, setPhase] = useState<Phase>(
    recorder.state === "unsupported" ? "unsupported" : "idle",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const micSize = useStageSize({ vw: 0.36, vh: 0.5, min: 320, max: MIC_MAX_PX });

  async function handleMicPress() {
    if (phase === "uploading" || phase === "asking-permission") return;

    if (
      phase === "idle" ||
      phase === "error" ||
      phase === "permission-denied" ||
      phase === "blocked-os"
    ) {
      setErrorMsg(null);
      setPhase("asking-permission");
      try {
        await recorder.start();
        setPhase("recording");
      } catch (err) {
        const e = err as DOMException;
        if (e.name === "TimeoutError") {
          setPhase("blocked-os");
          setErrorMsg(
            IS_MAC
              ? "macOS blokuje mikrofon. Otwórz: Ustawienia systemowe → Prywatność i bezpieczeństwo → Mikrofon → włącz dostęp dla swojej przeglądarki, potem zrestartuj przeglądarkę."
              : "System blokuje mikrofon. Sprawdź ustawienia prywatności systemu i odblokuj dostęp przeglądarce.",
          );
        } else if (e.name === "NotAllowedError" || e.name === "SecurityError") {
          setPhase("permission-denied");
          setErrorMsg(
            "Mikrofon zablokowany. Kliknij ikonę kłódki/kamery w pasku adresu (po lewej od URL) → Mikrofon → Zezwól, potem odśwież stronę.",
          );
        } else {
          setPhase("error");
          setErrorMsg(e.message || "Nie udało się włączyć mikrofonu.");
        }
      }
      return;
    }

    if (phase === "recording") {
      setPhase("uploading");
      let blob: Blob;
      try {
        blob = await recorder.stop();
      } catch (err) {
        setPhase("error");
        setErrorMsg((err as Error).message || "Błąd nagrywania.");
        return;
      }
      try {
        const { transcript } = await transcribeAudio(blob);
        onRecordingDone(transcript);
      } catch (err) {
        setPhase("error");
        const msg =
          err instanceof ApiError
            ? err.message
            : "Nie udało się rozpoznać mowy. Spróbuj jeszcze raz.";
        setErrorMsg(msg);
      }
    }
  }

  const recording = phase === "recording";
  const busy = phase === "uploading" || phase === "asking-permission";

  return (
    <motion.div
      key="rec"
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.42 }}
      className={`${screenFlowRoot} grid grid-rows-[auto_minmax(0,1fr)_auto]`}
    >
      {/* ╔═══ [1] BLOK NAGŁÓWKA — ZMIEŃ HEADER_TOP_OFFSET ═══╗ */}
      <Header phase={phase} />

      {/* ╔═══ [2] STREFA AKCJI ═══╗ */}
      <div className="relative flex min-h-0 flex-col items-center justify-center gap-[clamp(1rem,3dvh,2.5rem)] px-4">
        {recording ? <AudioWaves /> : <SilenceHint />}

        <MicButton
          micSize={micSize}
          recording={recording}
          busy={busy || phase === "unsupported"}
          onPress={() => void handleMicPress()}
        />

        <PhaseLabel phase={phase} />
      </div>

      {/* ╔═══ [3] BŁĄD/INFO ═══╗ */}
      <div className="flex min-h-0 shrink-0 items-end justify-center px-4 pb-2">
        {errorMsg ? <ErrorBox message={errorMsg} /> : <span aria-hidden />}
      </div>
    </motion.div>
  );
}

/* ╔════════════════════════════════════════════════════════════╗
   ║  NAGŁÓWEK GÓRNY                                            ║
   ╚════════════════════════════════════════════════════════════╝ */

const HEADER_TEXTS: Record<Phase, string> = {
  idle: "POWIEDZ MI O CZYM ŚPIEWAĆ",
  "asking-permission": "POZWÓL NA MIKROFON",
  recording: "SŁUCHAM CIĘ!",
  uploading: "WYSYŁAM DO STUDIA…",
  "permission-denied": "BRAK DOSTĘPU",
  "blocked-os": "MIKROFON ZABLOKOWANY",
  unsupported: "TWOJA PRZEGLĄDARKA NIE WSPIERA",
  error: "OPS! SPRÓBUJ JESZCZE RAZ",
};

function Header({ phase }: { phase: Phase }) {
  const txt = HEADER_TEXTS[phase];
  const recording = phase === "recording";
  return (
    <motion.div
      key={txt}
      style={{ paddingTop: HEADER_TOP_OFFSET }}
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.36 }}
    >
      <h1
        className="text-center font-black uppercase"
        style={{
          fontFamily:
            "'Bungee',Impact,Haettenschweiler,ui-sans-serif,system-ui,sans-serif",
          // ↓ ZMIEŃ tutaj rozmiar napisu nagłówka
          fontSize: "clamp(2.5rem, min(8vw, 12vh), 8rem)",
          letterSpacing: "0.1em",
          lineHeight: 0.98,
          backgroundImage: recording
            ? "linear-gradient(170deg,#fff,#fbbf24 30%,#ec4899 70%,#a855f7)"
            : "linear-gradient(170deg,#fff,#a5f3fc 30%,#a78bfa 70%,#7e22ce)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          textShadow: "0 12px 0 rgba(0,0,0,0.85), 0 0 80px rgba(168,85,247,0.5)",
        }}
      >
        {txt}
      </h1>
    </motion.div>
  );
}

/* ╔════════════════════════════════════════════════════════════╗
   ║  PRZYCISK MIKROFONU                                        ║
   ╚════════════════════════════════════════════════════════════╝ */

type MicButtonProps = {
  micSize: number;
  busy: boolean;
  recording: boolean;
  onPress: () => void;
};

function MicButton({ micSize, busy, recording, onPress }: MicButtonProps) {
  return (
    <motion.button
      type="button"
      aria-label={
        recording
          ? "Zatrzymaj nagrywanie"
          : "Naciśnij mikrofon i powiedz, o czym jest piosenka"
      }
      disabled={busy}
      onClick={onPress}
      className={[
        "relative flex shrink-0 items-center justify-center rounded-[44%_56%_50%_50%] border-[10px] border-black text-white outline-none focus-visible:ring-[6px] focus-visible:ring-yellow-300 disabled:opacity-75",
        recording
          ? "bg-linear-to-br from-pink-500 via-red-500 to-yellow-400 shadow-[0_18px_0_0_rgba(0,0,0,0.85),0_0_80px_rgba(244,114,182,0.95)]"
          : "bg-linear-to-br from-cyan-400 via-blue-600 to-purple-700 shadow-[0_18px_0_0_rgba(0,0,0,0.85),0_0_60px_rgba(99,102,241,0.6)]",
      ].join(" ")}
      style={{ width: micSize, height: micSize }}
      animate={
        recording
          ? { scale: [1, 1.07, 1] }
          : { scale: [1, 1.03, 1] }
      }
      transition={
        recording
          ? { duration: 0.85, repeat: Infinity, ease: "easeInOut" }
          : { duration: 2.6, repeat: Infinity, ease: "easeInOut" }
      }
      whileHover={busy ? undefined : { scale: 1.05 }}
      whileTap={busy ? undefined : { scale: 0.95 }}
    >
      {recording ? (
        <MicOff
          className="stroke-[3] text-white drop-shadow-[0_4px_0_black]"
          style={{ width: micSize * 0.45, height: micSize * 0.45 }}
        />
      ) : (
        <Mic
          className="stroke-[3] text-white drop-shadow-[0_4px_0_black]"
          style={{ width: micSize * 0.45, height: micSize * 0.45 }}
        />
      )}
      {/* poświata pod mikrofonem */}
      <span className="pointer-events-none absolute -bottom-3 left-1/2 h-6 w-[72%] -translate-x-1/2 rounded-full bg-yellow-400/55 blur-2xl" />
    </motion.button>
  );
}

/* ╔════════════════════════════════════════════════════════════╗
   ║  CHIP STATUSU                                              ║
   ╚════════════════════════════════════════════════════════════╝ */

const PHASE_LABELS: Record<Phase, string> = {
  idle: "▶  Naciśnij mikrofon",
  "asking-permission": "Czekam na pozwolenie…",
  recording: "● Nagrywam — naciśnij ponownie aby zakończyć",
  uploading: "Wysyłam do Bąbla…",
  "permission-denied": "✕ Kliknij i spróbuj jeszcze raz",
  "blocked-os": "✕ Sprawdź System Settings",
  unsupported: "✕ Włącz w Chrome lub Edge",
  error: "✕ Błąd — naciśnij mikrofon żeby spróbować",
};

function PhaseLabel({ phase }: { phase: Phase }) {
  return (
    <p
      className="rounded-full border-[6px] border-black bg-black/70 px-[clamp(1.5rem,2.4vw,2.5rem)] py-[clamp(0.55rem,1.2dvh,1rem)] font-black uppercase tracking-[0.2em] text-yellow-200 shadow-[0_10px_0_0_black]"
      style={{ fontSize: "clamp(1rem, min(1.7vw, 2vh), 1.5rem)" }}
    >
      {PHASE_LABELS[phase]}
    </p>
  );
}

/* ╔════════════════════════════════════════════════════════════╗
   ║  BŁĄD                                                      ║
   ╚════════════════════════════════════════════════════════════╝ */

function ErrorBox({ message }: { message: string }) {
  return (
    <div
      className="max-w-[42rem] rounded-2xl border-[5px] border-black bg-red-500/95 px-6 py-3 text-center font-black text-white shadow-[0_8px_0_0_black]"
      style={{ fontSize: "clamp(0.9rem, min(1.5vw, 1.8vh), 1.25rem)" }}
      role="alert"
    >
      {message}
    </div>
  );
}

/* ╔════════════════════════════════════════════════════════════╗
   ║  FALA + placeholder                                        ║
   ╚════════════════════════════════════════════════════════════╝ */

function SilenceHint() {
  return (
    <div
      className="opacity-50"
      style={{ height: "clamp(4rem, 12dvh, 9rem)" }}
      aria-hidden
    />
  );
}

function AudioWaves() {
  const heights = ["35%", "70%", "50%", "92%", "44%", "78%", "40%", "85%", "48%"];
  return (
    <div
      className="flex w-[clamp(20rem,40vw,32rem)] items-end justify-center gap-2 sm:gap-3"
      style={{ height: "clamp(4rem, 12dvh, 9rem)" }}
    >
      {heights.map((h, i) => (
        <motion.span
          key={i}
          className="w-[clamp(0.5rem,1.2vw,1.25rem)] rounded-full bg-linear-to-t from-purple-700 via-pink-500 to-yellow-300 ring-2 ring-black"
          style={{ height: h }}
          animate={{ scaleY: [0.55, 1.3, 0.55], opacity: [0.7, 1, 0.7] }}
          transition={{
            duration: 0.45 + i * 0.05,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.07,
          }}
        />
      ))}
    </div>
  );
}

/* ╔════════════════════════════════════════════════════════════╗
   ║  HOOK: USTALANIE ROZMIARÓW                                ║
   ╚════════════════════════════════════════════════════════════╝ */

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

// --- INTERNAL: re-export RecorderState for clarity (unused outside but documents API) ---
export type { RecorderState };
