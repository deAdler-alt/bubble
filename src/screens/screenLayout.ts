/**
 * Wspólna rama widoków — pełny viewport, brak scrolla, safe area.
 * Na ekranach z fixed Bąblem (wszystko poza START) użyj też `SCREEN_BABEL_RESERVE`.
 */

export const SCREEN_OUTER =
  "relative h-[100dvh] w-full min-h-0 overflow-hidden";

export const SCREEN_PAD_X =
  "pl-[max(env(safe-area-inset-left),14px)] pr-[max(env(safe-area-inset-right),14px)]";

/** Zapas pod fixed `BabelCompanion` w rogu / na dołu. */
export const SCREEN_BABEL_RESERVE =
  "pb-[clamp(6.5rem,26dvh,12.5rem)]";

/** START: brak towarzysza App-level. */
export const screenStartRoot = `${SCREEN_OUTER} ${SCREEN_PAD_X}`;

/** Pozostałe kroki przepływu. */
export const screenFlowRoot = `${SCREEN_OUTER} ${SCREEN_PAD_X} ${SCREEN_BABEL_RESERVE}`;
