/**
 * debugLog — minimalistyczny in-memory store dla podglądu wywołań API.
 * Używany przez `api/djApi.ts` (auto-record) i przez `DebugPanel`
 * (subskrypcja + render).
 *
 * Nie wymaga zewnętrznych bibliotek (Zustand, jotai itd.) — vanilla TS.
 *
 * Maks. 50 wpisów (najstarsze wypadają), żeby nie rosło bez końca.
 */

export type DebugKind = "transcribe" | "song";

export type DebugEntry = {
  id: string;
  kind: DebugKind;
  /** ms epoch */
  time: number;
  /** Co poszło na backend (skrót dla UI). */
  request: {
    /** Dla "song": prompt. Dla "transcribe": rozmiar audio bajtów. */
    prompt?: string;
    style?: string;
    audioBytes?: number;
  };
  /** Co wróciło. */
  response?: {
    transcript?: string;
    title?: string;
    lyrics?: string[];
    vibe?: string;
    audioMode?: string;
    audioUrl?: string | null;
    durationMs?: number;
  };
  /** Diagnostyka backendu (provider/model/latency). */
  meta?: Record<string, unknown>;
  /** ms — round-trip widziany z frontu (cały fetch). */
  totalLatencyMs: number;
  error?: string;
};

const MAX_ENTRIES = 50;
let entries: DebugEntry[] = [];
const subscribers = new Set<(entries: DebugEntry[]) => void>();

export function logEntry(entry: Omit<DebugEntry, "id">): DebugEntry {
  const stored: DebugEntry = {
    ...entry,
    id: `${entry.time}-${Math.random().toString(36).slice(2, 8)}`,
  };
  entries = [stored, ...entries].slice(0, MAX_ENTRIES);
  emit();
  return stored;
}

export function getEntries(): DebugEntry[] {
  return entries;
}

export function clearEntries(): void {
  entries = [];
  emit();
}

export function subscribe(fn: (entries: DebugEntry[]) => void): () => void {
  subscribers.add(fn);
  fn(entries);
  return () => {
    subscribers.delete(fn);
  };
}

function emit() {
  for (const fn of subscribers) fn(entries);
}
