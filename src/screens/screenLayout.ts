/**
 * Wspólna rama widoków — desktop-first, brak scrolla, safe area.
 * NIE rezerwujemy już miejsca pod „App-level Bąbla" (został usunięty).
 */

export const SCREEN_OUTER =
  "relative h-[100dvh] w-full min-h-0 overflow-hidden";

export const SCREEN_PAD_X =
  "pl-[max(env(safe-area-inset-left),24px)] pr-[max(env(safe-area-inset-right),24px)]";

/** Zapas pod safe-area na dole (telefony z notchem etc). */
export const SCREEN_PAD_B =
  "pb-[max(env(safe-area-inset-bottom),20px)]";

/** START — bez Bąbla App-level (wcześniej miało osobny tryb). */
export const screenStartRoot = `${SCREEN_OUTER} ${SCREEN_PAD_X}`;

/** RECORDING / STYL / ŁADOWANIE — pełny ekran. */
export const screenFlowRoot = `${SCREEN_OUTER} ${SCREEN_PAD_X} ${SCREEN_PAD_B}`;

/** PLAYER — pełny ekran. */
export const screenPlayerRoot = `${SCREEN_OUTER} ${SCREEN_PAD_X} ${SCREEN_PAD_B}`;
