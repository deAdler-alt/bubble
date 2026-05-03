/**
 * useMediaRecorder — cienki hook nad `navigator.mediaDevices.getUserMedia`
 * + `MediaRecorder`. Trzyma pełną maszynę stanów oraz produkuje finalny Blob.
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
  | "unsupported"
  | "error";

const PREFERRED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
];

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  for (const m of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return "audio/webm";
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

  /** Sprzątnij strumień gdy komponent znika lub błąd. */
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
    setState("requesting-permission");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const e = err as DOMException;
      const denied =
        e.name === "NotAllowedError" || e.name === "SecurityError";
      setError(e.message || "Brak dostępu do mikrofonu.");
      setState(denied ? "denied" : "error");
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

  /** Awaryjne anulowanie bez czekania na Blob. */
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
