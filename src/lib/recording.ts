/**
 * useMediaRecorder — cienki hook nad `navigator.mediaDevices.getUserMedia`
 * + `MediaRecorder`. Trzyma pełną maszynę stanów, dostarcza Blob.
 *
 * Defensywne mechanizmy (po doświadczeniach z macOS Chrome):
 *   - pre-check `Permissions API` → jeśli "denied", od razu zgłaszamy stan
 *     "denied" zamiast czekać na nigdy-nie-pojawiający-się prompt
 *   - 8-sekundowy timeout na `getUserMedia` → jeśli macOS nie dał kropki w
 *     System Settings, prompt nigdy nie wyskoczy; przerywamy i mówimy o tym.
 *
 * Użycie:
 *   const rec = useMediaRecorder();
 *   await rec.start();             // zapyta o pozwolenie
 *   const blob = await rec.stop(); // gotowe audio
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderState =
  | "idle"
  | "requesting-permission"
  | "recording"
  | "stopping"
  | "denied"
  | "blocked-os"
  | "unsupported"
  | "error";

const PREFERRED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
];

const PERMISSION_TIMEOUT_MS = 8000;

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  for (const m of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return "audio/webm";
}

/**
 * Sprawdza czy mikrofon jest "zablokowany" przez wcześniejsze "Block".
 * Zwraca:
 *   - "granted" → masz dostęp, prompt nie wyskoczy
 *   - "denied"  → user zablokował (lub macOS), trzeba odblokować
 *   - "prompt"  → prompt wyskoczy przy getUserMedia
 *   - "unknown" → przeglądarka nie wspiera Permissions API dla mikrofonu
 */
async function probeMicPermission(): Promise<
  "granted" | "denied" | "prompt" | "unknown"
> {
  try {
    if (!navigator.permissions?.query) return "unknown";
    // TS jeszcze nie zna PermissionName "microphone" w lib.dom.d.ts
    const status = await navigator.permissions.query({
      name: "microphone" as PermissionName,
    });
    return status.state as "granted" | "denied" | "prompt";
  } catch {
    return "unknown";
  }
}

export function useMediaRecorder() {
  const isSupported =
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined" &&
    !!navigator?.mediaDevices?.getUserMedia;

  const [state, setState] = useState<RecorderState>(
    isSupported ? "idle" : "unsupported",
  );
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stopResolveRef = useRef<((blob: Blob) => void) | null>(null);
  const stopRejectRef = useRef<((err: Error) => void) | null>(null);

  useEffect(() => {
    return () => {
      stopResolveRef.current = null;
      stopRejectRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      recorderRef.current = null;
    };
  }, []);

  const start = useCallback(async () => {
    if (!isSupported) {
      setState("unsupported");
      throw new Error("MediaRecorder nie jest wspierany w tej przeglądarce.");
    }
    if (recorderRef.current) {
      throw new Error("Nagrywanie już trwa.");
    }
    setError(null);

    // 1) Pre-check — jeśli Permissions API mówi "denied",
    //    nie czekamy 8s, tylko od razu zgłaszamy denied.
    const perm = await probeMicPermission();
    if (perm === "denied") {
      const e = new DOMException(
        "Mikrofon zablokowany w ustawieniach przeglądarki.",
        "NotAllowedError",
      );
      setError(e.message);
      setState("denied");
      throw e;
    }

    setState("requesting-permission");

    // 2) getUserMedia z timeoutem — chroni przed zawieszeniem na macOS
    //    gdy Chrome/Edge nie ma OS-level mic access.
    let stream: MediaStream;
    try {
      stream = await Promise.race([
        navigator.mediaDevices.getUserMedia({ audio: true }),
        new Promise<MediaStream>((_, rej) => {
          window.setTimeout(() => {
            rej(
              new DOMException(
                "Timeout: brak odpowiedzi od mikrofonu (sprawdź System Settings → Privacy → Microphone).",
                "TimeoutError",
              ),
            );
          }, PERMISSION_TIMEOUT_MS);
        }),
      ]);
    } catch (err) {
      const e = err as DOMException;
      if (e.name === "NotAllowedError" || e.name === "SecurityError") {
        setError(e.message || "Brak dostępu do mikrofonu.");
        setState("denied");
      } else if (e.name === "TimeoutError") {
        setError(e.message);
        setState("blocked-os");
      } else {
        setError(e.message || "Błąd mikrofonu.");
        setState("error");
      }
      throw e;
    }

    streamRef.current = stream;
    const mimeType = pickMimeType();
    const rec = new MediaRecorder(stream, { mimeType });
    recorderRef.current = rec;
    chunksRef.current = [];

    rec.addEventListener("dataavailable", (ev) => {
      if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
    });

    rec.addEventListener("stop", () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      recorderRef.current = null;
      chunksRef.current = [];
      setState("idle");
      stopResolveRef.current?.(blob);
      stopResolveRef.current = null;
      stopRejectRef.current = null;
    });

    rec.addEventListener("error", (ev) => {
      const e = (ev as unknown as { error?: Error }).error;
      setError(e?.message ?? "Błąd nagrywania");
      setState("error");
      stopRejectRef.current?.(e ?? new Error("recorder error"));
      stopResolveRef.current = null;
      stopRejectRef.current = null;
    });

    rec.start();
    setState("recording");
  }, [isSupported]);

  const stop = useCallback((): Promise<Blob> => {
    const rec = recorderRef.current;
    if (!rec) {
      return Promise.reject(new Error("Brak aktywnego nagrania."));
    }
    setState("stopping");
    return new Promise<Blob>((resolve, reject) => {
      stopResolveRef.current = resolve;
      stopRejectRef.current = reject;
      try {
        rec.stop();
      } catch (err) {
        reject(err as Error);
      }
    });
  }, []);

  const cancel = useCallback(() => {
    const rec = recorderRef.current;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (rec && rec.state !== "inactive") {
      try {
        rec.stop();
      } catch {
        /* noop */
      }
    }
    recorderRef.current = null;
    chunksRef.current = [];
    stopResolveRef.current = null;
    stopRejectRef.current = null;
    setState("idle");
  }, []);

  return { state, error, isSupported, start, stop, cancel };
}
