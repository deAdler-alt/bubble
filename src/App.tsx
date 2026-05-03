/**
 * AI DJ Bąbel — root.
 *  ┌─────────────────────────────────────────┐
 *  │  DJBoothBackdrop (tło sceny)            │
 *  │  AnimatePresence -> bieżący ekran:      │
 *  │     START / NAGRYWANIE / STYL /          │
 *  │     LADOWANIE / ODTWARZACZ              │
 *  └─────────────────────────────────────────┘
 *
 *  Uwaga: wcześniej tu siedział "App-level Bąbel" w lewym dolnym rogu.
 *  Został usunięty — Bąbel z dymkiem żyje teraz tylko na StartScreen.
 */

import { useCallback, useState } from "react";
import { AnimatePresence, LayoutGroup } from "framer-motion";
import type { GeneratedSong, SongStyle } from "./api/djApi";
import { DJBoothBackdrop } from "./components/DJBoothBackdrop";
import { LoadingScreen } from "./screens/LoadingScreen";
import { PlayerScreen } from "./screens/PlayerScreen";
import { RecordingScreen } from "./screens/RecordingScreen";
import { StartScreen } from "./screens/StartScreen";
import { StyleScreen } from "./screens/StyleScreen";

type AppScreen =
  | "START"
  | "NAGRYWANIE"
  | "STYL"
  | "LADOWANIE"
  | "ODTWARZACZ";

export default function App() {
  const [screen, setScreen] = useState<AppScreen>("START");
  const [transcript, setTranscript] = useState("");
  const [styleChoice, setStyleChoice] = useState<SongStyle>("pop");
  const [song, setSong] = useState<GeneratedSong | null>(null);

  const handleLoadingComplete = useCallback((nextSong: GeneratedSong) => {
    setSong(nextSong);
    setScreen("ODTWARZACZ");
  }, []);

  const restart = useCallback(() => {
    setTranscript("");
    setStyleChoice("pop");
    setSong(null);
    setScreen("START");
  }, []);

  return (
    <LayoutGroup id="dj-layout">
      <div className="relative h-[100dvh] w-full font-sans text-black">
        {/* TŁO SCENY (gradient + reflektory + disco-ball + podłoga) */}
        <DJBoothBackdrop />

        {/* WARSTWA EKRANÓW */}
        <div className="relative z-[2] flex h-full w-full min-w-0 flex-col">
          <AnimatePresence mode="wait">
            {screen === "START" ? (
              <StartScreen key="ev-start" onPlay={() => setScreen("NAGRYWANIE")} />
            ) : null}

            {screen === "NAGRYWANIE" ? (
              <RecordingScreen
                key="ev-rec"
                onRecordingDone={(t) => {
                  setTranscript(t);
                  setScreen("STYL");
                }}
              />
            ) : null}

            {screen === "STYL" ? (
              <StyleScreen
                key="ev-style"
                initialStyle={styleChoice}
                onConfirm={(picked) => {
                  setStyleChoice(picked);
                  setScreen("LADOWANIE");
                }}
              />
            ) : null}

            {screen === "LADOWANIE" && transcript ? (
              <LoadingScreen
                key="ev-load"
                prompt={transcript}
                style={styleChoice}
                onComplete={handleLoadingComplete}
              />
            ) : null}

            {screen === "ODTWARZACZ" && song ? (
              <PlayerScreen key="ev-play" song={song} onRestart={restart} />
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </LayoutGroup>
  );
}
