/**
 * DEBUG PANEL — szuflada w prawym dolnym rogu pokazująca historię
 * wywołań do backendu (`/api/transcribe`, `/api/songs`).
 *
 * Skład:
 *   ┌─ button "🔬 DEBUG" gdy zwinięte
 *   └─ szuflada gdy rozwinięte:
 *      - header z licznikiem wpisów + Clear + zamknięcie
 *      - lista wpisów (najnowszy na górze) — każdy zwijalny
 *      - dla każdego: prompt, response (lyrics list, transcript), meta JSON
 *
 * Skróty klawiszowe:
 *   - `Ctrl/Cmd+\`  — toggle szuflady
 *   - Esc           — zamknij gdy otwarte
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, X, Trash2, Bug } from "lucide-react";
import {
  clearEntries,
  subscribe,
  type DebugEntry,
} from "../lib/debugLog";

export function DebugPanel() {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<DebugEntry[]>([]);

  useEffect(() => {
    const unsub = subscribe(setEntries);
    return unsub;
  }, []);

  // Skróty klawiszowe.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const isToggle =
        (ev.metaKey || ev.ctrlKey) && ev.key === "\\";
      if (isToggle) {
        ev.preventDefault();
        setOpen((o) => !o);
      } else if (ev.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* ───── FLOATING TOGGLE — gdy zwinięte ───── */}
      <AnimatePresence>
        {!open && (
          <motion.button
            type="button"
            key="toggle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-3 right-3 z-[60] flex items-center gap-2 rounded-full border-[3px] border-black bg-black/85 px-3.5 py-2 font-mono text-xs font-bold text-yellow-300 shadow-[0_4px_0_0_rgba(0,0,0,0.6)] backdrop-blur-sm hover:bg-black"
            aria-label="Otwórz panel debug"
            title="Debug panel (Cmd/Ctrl+\\)"
          >
            <Bug className="size-4" />
            DEBUG
            {entries.length > 0 && (
              <span className="rounded-full bg-pink-500 px-2 py-0.5 text-[10px] text-white">
                {entries.length}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* ───── DRAWER — gdy rozwinięte ───── */}
      <AnimatePresence>
        {open && (
          <motion.aside
            key="drawer"
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 80 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed bottom-3 right-3 top-3 z-[60] flex w-[min(92vw,440px)] flex-col overflow-hidden rounded-xl border-[3px] border-black bg-slate-950/95 text-slate-100 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md"
          >
            <DrawerHeader
              count={entries.length}
              onClear={clearEntries}
              onClose={() => setOpen(false)}
            />
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
              {entries.length === 0 ? (
                <EmptyHint />
              ) : (
                <ul className="flex flex-col gap-2">
                  {entries.map((e) => (
                    <EntryRow key={e.id} entry={e} />
                  ))}
                </ul>
              )}
            </div>
            <DrawerFooter />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

/* ─────────── Header / Footer ─────────── */

function DrawerHeader({
  count,
  onClear,
  onClose,
}: {
  count: number;
  onClear: () => void;
  onClose: () => void;
}) {
  return (
    <header className="flex items-center justify-between gap-2 border-b border-slate-700 bg-slate-900/80 px-3 py-2">
      <div className="flex items-center gap-2 font-mono text-xs font-bold text-yellow-300">
        <Bug className="size-4" />
        DEBUG
        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">
          {count} {count === 1 ? "wpis" : "wpisy"}
        </span>
      </div>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={onClear}
          className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-rose-300"
          aria-label="Wyczyść"
          title="Wyczyść"
        >
          <Trash2 className="size-4" />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          aria-label="Zamknij"
          title="Zamknij (Esc)"
        >
          <X className="size-4" />
        </button>
      </div>
    </header>
  );
}

function DrawerFooter() {
  return (
    <footer className="border-t border-slate-700 bg-slate-900/80 px-3 py-1.5 font-mono text-[10px] text-slate-500">
      Cmd/Ctrl+\\ toggle · Esc zamknij · ostatnie 50 wywołań
    </footer>
  );
}

function EmptyHint() {
  return (
    <p className="px-2 py-6 text-center font-mono text-xs text-slate-500">
      Brak wywołań. Spróbuj nagrać coś lub wygenerować piosenkę.
    </p>
  );
}

/* ─────────── Pojedynczy wpis ─────────── */

function EntryRow({ entry }: { entry: DebugEntry }) {
  const [open, setOpen] = useState(false);
  const isError = !!entry.error;
  const time = new Date(entry.time).toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return (
    <li
      className={[
        "rounded-lg border bg-slate-900/70",
        isError ? "border-rose-500/60" : "border-slate-700",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={[
              "rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase",
              entry.kind === "song"
                ? "bg-fuchsia-500/30 text-fuchsia-200"
                : "bg-cyan-500/30 text-cyan-200",
            ].join(" ")}
          >
            {entry.kind}
          </span>
          <span className="truncate font-mono text-xs text-slate-300">
            {entry.kind === "song"
              ? `"${entry.request.prompt ?? ""}" → ${entry.response?.title ?? "—"}`
              : entry.response?.transcript
                ? `→ "${entry.response.transcript}"`
                : `${entry.request.audioBytes ?? 0} B`}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 font-mono text-[10px] text-slate-400">
          <span>{entry.totalLatencyMs}ms</span>
          <span className="text-slate-600">·</span>
          <span>{time}</span>
          <ChevronDown
            className={`size-3 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>
      {open && (
        <div className="space-y-2 border-t border-slate-700 px-3 py-2 font-mono text-[11px] text-slate-200">
          {isError ? (
            <Block label="ERROR" tone="error">
              {entry.error}
            </Block>
          ) : null}

          <Block label="REQUEST">
            <pre className="whitespace-pre-wrap break-words">
              {JSON.stringify(entry.request, null, 2)}
            </pre>
          </Block>

          {entry.response ? (
            <Block label="RESPONSE">
              <pre className="whitespace-pre-wrap break-words">
                {JSON.stringify(entry.response, null, 2)}
              </pre>
            </Block>
          ) : null}

          {entry.meta ? (
            <Block label="META (server)">
              <pre className="whitespace-pre-wrap break-words">
                {JSON.stringify(entry.meta, null, 2)}
              </pre>
            </Block>
          ) : null}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(JSON.stringify(entry, null, 2));
              }}
              className="rounded bg-slate-800 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-700"
            >
              Copy JSON
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function Block({
  label,
  children,
  tone,
}: {
  label: string;
  children: React.ReactNode;
  tone?: "error";
}) {
  return (
    <div className="rounded border border-slate-700/60 bg-slate-900/60 p-2">
      <div
        className={[
          "mb-1 font-bold uppercase tracking-wider",
          tone === "error" ? "text-rose-300" : "text-slate-400",
        ].join(" ")}
        style={{ fontSize: "10px" }}
      >
        {label}
      </div>
      <div className={tone === "error" ? "text-rose-200" : "text-slate-200"}>
        {children}
      </div>
    </div>
  );
}
