import { useCallback, useState } from "react";
import { AnimatePresence, LayoutGroup } from "framer-motion";
import type { GeneratedSong, SongStyle } from "./api/djApi";
import { BabelCompanion } from "./components/BabelCompanion";
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

const BABEL_COPY: Record<AppScreen, string> = {
  START:
    "Cześć! Jestem Bąbel! Zróbmy razem super piosenkę! Naciśnij wielką płytę!",
  NAGRYWANIE:
    "O czym będzie piosenka? Naciśnij mikrofon i powiedz mi!",
  STYL: "Super pomysł! Wybierz teraz obrazek z muzyką!",
  LADOWANIE: "Czary mary, miksuję dźwięki! Poczekaj chwilkę...",
  ODTWARZACZ:
    "Wow, ale hit! Jesteś prawdziwym DJ-em! Posłuchajmy!",
};

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

  const babelDock =
    screen === "ODTWARZACZ"
      ? "fixed left-1/2 top-[min(14vh,112px)] z-30 w-[min(96vw,28rem)] -translate-x-1/2 px-4"
      : "fixed bottom-[max(env(safe-area-inset-bottom),20px)] left-[max(env(safe-area-inset-left),18px)] z-30 max-w-[min(96vw,24rem)] sm:bottom-10 sm:left-10";

  return (
    <LayoutGroup id="dj-layout">
      <div className="relative min-h-[100dvh] font-display text-black">
        <DJBoothBackdrop />

        <div className="relative z-[2] mx-auto flex min-h-[100dvh] max-w-6xl flex-col">
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

          {screen !== "START" ? (
            <BabelCompanion
              layoutId="babel-shell"
              className={babelDock}
              message={BABEL_COPY[screen]}
              mode={screen === "ODTWARZACZ" ? "singing" : "default"}
            />
          ) : null}
        </div>
      </div>
    </LayoutGroup>
  );
}
