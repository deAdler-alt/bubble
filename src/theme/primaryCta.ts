/**
 * Wspólny motyw przycisków CTA (pomarańczowy gradient jak ▶ START na StyleScreen).
 * Edytuj tutaj — zmiany obejmą StartScreen (chip), StyleScreen (START), RecordingScreen (mikrofon).
 */

/** Gradient tła — poziomy pas pasujący do pill i do radialnego mikrofonu. */
export const PRIMARY_CTA_GRADIENT =
  "bg-linear-to-r from-red-500 via-orange-500 to-yellow-400";

/** Wariant „aktywny” / nagrywanie — cieplejszy, nadal w rodzinie pomarańczy. */
export const PRIMARY_CTA_GRADIENT_ACTIVE =
  "bg-linear-to-br from-orange-600 via-red-500 to-amber-400";

/** Chip „czekaj / przetwarzanie” — jaśniejszy bursztyn, odróżnia się od idle. */
export const PRIMARY_CTA_GRADIENT_BUSY =
  "bg-linear-to-r from-amber-300 via-orange-500 to-yellow-300";

export const PRIMARY_CTA_BORDER = "border-[8px] border-black";

export const PRIMARY_CTA_TEXT =
  "font-black uppercase tracking-[0.18em] text-black";

/** Cień spójny ze StyleScreen START. */
export const PRIMARY_CTA_SHADOW =
  "shadow-[0_14px_0_0_black,0_0_50px_rgba(239,68,68,0.7)]";

export const PRIMARY_CTA_FOCUS =
  "outline-none focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-yellow-200";

/** Animacja pulsacji cienia (Framer `animate.boxShadow`). */
export const PRIMARY_CTA_BOX_SHADOW_KEYFRAMES = [
  "0 14px 0 0 #000, 0 0 38px rgba(239,68,68,0.85)",
  "0 14px 0 0 #000, 0 0 60px rgba(250,204,21,0.95)",
  "0 14px 0 0 #000, 0 0 38px rgba(239,68,68,0.85)",
] as const;

/** Mikrofon: ten sam gradient co CTA, zapisany jako linear-br żeby pasował do koła. */
export const PRIMARY_CTA_MIC_IDLE =
  "bg-linear-to-br from-red-500 via-orange-500 to-yellow-400";

/** Cienie pulsacji przy nagrywaniu (mocniejszy czerwono-pomarańczowy glow). */
export const MIC_RECORDING_BOX_SHADOW_KEYFRAMES = [
  "0 14px 0 0 #000, 0 0 44px rgba(239,68,68,0.95)",
  "0 14px 0 0 #000, 0 0 72px rgba(251,146,60,0.9)",
  "0 14px 0 0 #000, 0 0 44px rgba(239,68,68,0.95)",
] as const;
