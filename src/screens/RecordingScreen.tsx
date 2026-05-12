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
import { motion, useReducedMotion } from "framer-motion";
import { Mic, MicOff } from "lucide-react";
import { transcribeAudio, ApiError } from "../api/djApi";
import { FlyingNotesOverlay } from "../components/FlyingNotesOverlay";
import { useMediaRecorder, type RecorderState } from "../lib/recording";
import {
  MIC_RECORDING_BOX_SHADOW_KEYFRAMES,
  PRIMARY_CTA_BORDER,
  PRIMARY_CTA_BOX_SHADOW_KEYFRAMES,
  PRIMARY_CTA_FOCUS,
  PRIMARY_CTA_GRADIENT,
  PRIMARY_CTA_GRADIENT_ACTIVE,
  PRIMARY_CTA_GRADIENT_BUSY,
  PRIMARY_CTA_MIC_IDLE,
  PRIMARY_CTA_SHADOW,
  PRIMARY_CTA_TEXT,
} from "../theme/primaryCta";
import { screenFlowRoot } from "./screenLayout";

/* ╔════════════════════════════════════════════════════════════╗
   ║  TUNABLES                                                 ║
   ╚════════════════════════════════════════════════════════════╝ */

/**
 * Jedna wartość padding-top dla nagłówka — przez `HEADER_TOP_OFFSET_BY_PHASE`
 * ustawiona identycznie dla każdej fazy (możesz nadpisać pojedynczy klucz).
 */
const HEADER_TOP_OFFSET = "clamp(12.5rem, 14dvh, 10rem)";

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

/** Padding-top nagłówka per faza — domyślnie wszystkie = HEADER_TOP_OFFSET. */
const HEADER_TOP_OFFSET_BY_PHASE: Record<Phase, string> = {
  idle: HEADER_TOP_OFFSET,
  "asking-permission": HEADER_TOP_OFFSET,
  recording: HEADER_TOP_OFFSET,
  uploading: HEADER_TOP_OFFSET,
  "permission-denied": HEADER_TOP_OFFSET,
  "blocked-os": HEADER_TOP_OFFSET,
  unsupported: HEADER_TOP_OFFSET,
  error: HEADER_TOP_OFFSET,
};

const IS_MAC =
  typeof navigator !== "undefined" &&
  /mac/i.test(navigator.platform || navigator.userAgent || "");

/**
 * Główny ekran nagrywania głosu.
 *
 * Jak modyfikować:
 * - Układ siatki: `className` na `motion.div` (wiersze: nagłówek / akcja / stopka błędu).
 * - Wejście/wyjście animacji tego kontenera: `initial`, `animate`, `exit`, `transition`.
 * - Logika mikrofonu i faz: funkcja `handleMicPress`; stany z `recorder` z hooka `useMediaRecorder`.
 * - Dekoracja nutek: wyłącz przez usunięcie `<FlyingNotesOverlay />` lub przekaż `reducedMotion` z przeglądarki (już ustawione).
 */
export function RecordingScreen({ onRecordingDone }: RecordingScreenProps) {
  const recorder = useMediaRecorder();
  const prefersReducedMotion = !!useReducedMotion();
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
      {/* Dekoracja: latające nutki (współdzielony overlay). Jak wyłączyć: usuń ten wiersz. */}
      <FlyingNotesOverlay reducedMotion={prefersReducedMotion} />

      {/* [1] Nagłówek — offset: HEADER_TOP_OFFSET_BY_PHASE (domyślnie = HEADER_TOP_OFFSET). */}
      <Header phase={phase} />

      {/* [2] Strefa środkowa: placeholder/fala + mikrofon + chip statusu.
          Odstępy między elementami: `gap-[...]`; padding boczny: `px-4`. */}
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

      {/* [3] Stopka: komunikat błędu (ErrorBox). Wysokość/pozycja: klasy kontenera poniżej. */}
      <div className="flex min-h-0 shrink-0 items-end justify-center px-4 pb-2">
        {errorMsg ? <ErrorBox message={errorMsg} /> : <span aria-hidden />}
      </div>
    </motion.div>
  );
}

/* ╔════════════════════════════════════════════════════════════╗
   ║  NAGŁÓWEK GÓRNY                                            ║
   ╚════════════════════════════════════════════════════════════╝ */

/** Teksty nagłówka per faza — edytuj stringi; nie zmieniaj kluczy `Phase`. */
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

/** Cień pod białe nagłówki we wszystkich fazach (kontrast na ciemnym tle). */
const HEADER_TEXT_SHADOW =
  "0 10px 0 rgba(0,0,0,0.75), 0 2px 0 rgba(0,0,0,0.9), 0 0 48px rgba(168,85,247,0.38)";

/**
 * Nagłówek z komunikatem zależnym od `phase`.
 *
 * Jak modyfikować:
 * - Teksty: HEADER_TEXTS.
 * - Offset pionowy: HEADER_TOP_OFFSET_BY_PHASE[phase] (albo pojedyncza stała HEADER_TOP_OFFSET).
 * - Kolor nagłówka: zawsze biały — `HEADER_TEXT_SHADOW` dla odczytności.
 */
function Header({ phase }: { phase: Phase }) {
  const txt = HEADER_TEXTS[phase];

  return (
    <motion.div
      key={txt}
      style={{ paddingTop: HEADER_TOP_OFFSET_BY_PHASE[phase] }}
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.36 }}
    >
      <h1
        className="text-center font-black uppercase"
        style={{
          fontFamily:
            "'Bungee',Impact,Haettenschweiler,ui-sans-serif,system-ui,sans-serif",
          fontSize: "clamp(2.5rem, min(8vw, 12vh), 8rem)",
          letterSpacing: "0.1em",
          lineHeight: 0.98,
          color: "#ffffff",
          textShadow: HEADER_TEXT_SHADOW,
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

/**
 * Duży przycisk mikrofonu (start/stop nagrywania).
 *
 * Jak modyfikować:
 * - Rozmiar: sterowany przez `micSize` (patrz MIC_MAX_PX i useStageSize w rodzicu).
 * - Kolory CTA: `../theme/primaryCta` (pomarańczowy motyw jak StyleScreen).
 * - Pulsowanie: `animate` i `transition` (szybciej/wolniej przez `duration`, `repeat`).
 * - Ikona: proporcje `micSize * 0.45` — zmień mnożnik dla większej/mniejszej ikony.
 */
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
        "relative flex shrink-0 items-center justify-center rounded-[44%_56%_50%_50%] disabled:opacity-75",
        PRIMARY_CTA_BORDER,
        PRIMARY_CTA_FOCUS,
        PRIMARY_CTA_SHADOW,
        recording
          ? `${PRIMARY_CTA_GRADIENT_ACTIVE} ring-4 ring-red-500/45 ring-offset-2 ring-offset-transparent`
          : `${PRIMARY_CTA_MIC_IDLE}`,
      ].join(" ")}
      style={{ width: micSize, height: micSize }}
      animate={
        recording
          ? {
              scale: [1, 1.09, 1],
              boxShadow: [...MIC_RECORDING_BOX_SHADOW_KEYFRAMES],
            }
          : {
              scale: [1, 1.05, 1],
              boxShadow: [...PRIMARY_CTA_BOX_SHADOW_KEYFRAMES],
            }
      }
      transition={
        recording
          ? { duration: 0.55, repeat: Infinity, ease: "easeInOut" }
          : { duration: 1.15, repeat: Infinity, ease: "easeInOut" }
      }
      whileHover={busy ? undefined : { scale: 1.05 }}
      whileTap={busy ? undefined : { scale: 0.95 }}
    >
      {recording ? (
        <MicOff
          className="stroke-[3] text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.85)]"
          style={{ width: micSize * 0.45, height: micSize * 0.45 }}
        />
      ) : (
        <Mic
          className="stroke-[3] text-black drop-shadow-[0_2px_0_rgba(255,255,255,0.35)]"
          style={{ width: micSize * 0.45, height: micSize * 0.45 }}
        />
      )}
      {/* poświata pod mikrofonem */}
      <span className="pointer-events-none absolute -bottom-3 left-1/2 h-6 w-[72%] -translate-x-1/2 rounded-full bg-orange-400/60 blur-2xl" />
    </motion.button>
  );
}

/* ╔════════════════════════════════════════════════════════════╗
   ║  CHIP STATUSU                                              ║
   ╚════════════════════════════════════════════════════════════╝ */

/** Który wizualny wariant chipa (gradient CTA vs odcień vs błąd). */
function phaseLabelVariant(
  phase: Phase,
): "cta" | "busy" | "recording" | "danger" {
  if (
    phase === "permission-denied" ||
    phase === "blocked-os" ||
    phase === "unsupported" ||
    phase === "error"
  ) {
    return "danger";
  }
  if (phase === "recording") return "recording";
  if (phase === "asking-permission" || phase === "uploading") return "busy";
  return "cta";
}

/** Teksty chipa statusu — edytuj jak HEADER_TEXTS. */
const PHASE_LABELS: Record<Phase, string> = {
  idle: "▶ Naciśnij Mikrofon ◀",
  "asking-permission": "Czekam na pozwolenie…",
  recording: "● Nagrywam — naciśnij ponownie aby zakończyć",
  uploading: "Wysyłam do Bombla",
  "permission-denied": "✕ Kliknij i spróbuj jeszcze raz",
  "blocked-os": "✕ Sprawdź System Settings",
  unsupported: "✕ Włącz w Chrome lub Edge",
  error: "✕ Błąd — naciśnij mikrofon żeby spróbować",
};

/**
 * Chip statusu pod mikrofonem — ten sam pomarańczowy motyw co START / „Naciśnij płytę”,
 * z różnymi gradientami wg fazy (`phaseLabelVariant`). Fazy błędu = czerwień.
 *
 * Jak modyfikować: PHASE_LABELS + kolory w `toneClasses` poniżej.
 */
function PhaseLabel({ phase }: { phase: Phase }) {
  const tone = phaseLabelVariant(phase);

  const toneClasses: Record<typeof tone, string> = {
    cta: [PRIMARY_CTA_GRADIENT, PRIMARY_CTA_TEXT].join(" "),
    busy: [PRIMARY_CTA_GRADIENT_BUSY, PRIMARY_CTA_TEXT].join(" "),
    recording: [PRIMARY_CTA_GRADIENT_ACTIVE, PRIMARY_CTA_TEXT].join(" "),
    danger:
      "bg-linear-to-r from-red-700 via-red-600 to-orange-800 font-black uppercase tracking-[0.14em] text-white",
  };

  return (
    <motion.p
      className={[
        "rounded-[3rem] border-[6px] border-black px-[clamp(1.5rem,2.4vw,2.5rem)] py-[clamp(0.55rem,1.2dvh,1rem)] drop-shadow-[0_2px_0_rgba(0,0,0,0.45)]",
        PRIMARY_CTA_SHADOW,
        PRIMARY_CTA_FOCUS,
        toneClasses[tone],
      ].join(" ")}
      style={{ fontSize: "clamp(1rem, min(1.7vw, 2vh), 1.5rem)" }}
      animate={
        tone === "danger"
          ? {}
          : tone === "recording"
            ? {
                scale: [1, 1.05, 1],
                boxShadow: [...MIC_RECORDING_BOX_SHADOW_KEYFRAMES],
              }
            : {
                scale: [1, 1.04, 1],
                boxShadow: [...PRIMARY_CTA_BOX_SHADOW_KEYFRAMES],
              }
      }
      transition={
        tone === "danger"
          ? {}
          : { duration: tone === "recording" ? 0.65 : 1.15, repeat: Infinity, ease: "easeInOut" }
      }
    >
      {PHASE_LABELS[phase]}
    </motion.p>
  );
}

/* ╔════════════════════════════════════════════════════════════╗
   ║  BŁĄD                                                      ║
   ╚════════════════════════════════════════════════════════════╝ */

/**
 * Alert z komunikatem błędu (np. brak dostępu do mikrofonu).
 *
 * Jak modyfikować:
 * - Kolory/obramowanie: klasy Tailwind (`bg-red-500/95`, `border-[5px]`).
 * - Szerokość: `max-w-[42rem]`.
 * - Rozmiar tekstu: `style.fontSize`.
 */
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

/**
 * Niewidoczny rezerwat wysokości nad mikrofonem gdy nie nagrywasz — żeby layout nie „skakał”.
 *
 * Jak modyfikować:
 * - Wysokość: `style.height` (clamp). Zmniejsz jeśli chcesz ciaśniejszy układ przy idle.
 */
function SilenceHint() {
  return (
    <div
      className="opacity-50"
      style={{ height: "clamp(4rem, 12dvh, 9rem)" }}
      aria-hidden
    />
  );
}

/**
 * Animowane słupki symulujące poziom przy nagrywaniu.
 *
 * Jak modyfikować:
 * - Lista wysokości: tablica `heights` (% wysokości kontenera).
 * - Liczba słupków: długość `heights`.
 * - Szerokość paska i odstępy: klasy na `motion.span` i na wrapperze (`gap-2`).
 * - Tempo animacji: `duration`, `delay` w `transition`.
 */
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

/**
 * Oblicza responsywny rozmiar w px na podstawie okna (min/max + vw/vh).
 * Używane do średnicy przycisku mikrofonu.
 *
 * Jak modyfikować: w wywołaniu w RecordingScreen zmień `vw`, `vh`, `min`, `max`.
 */
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
