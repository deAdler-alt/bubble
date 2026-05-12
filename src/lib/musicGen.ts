/**
 * Procedural backing-track generator (Web Audio API).
 *
 * Filozofia: zamiast hostować pliki MP3 (CORS-y, 403, dead links, prawne),
 * generujemy muzykę in-browser. Każdy utwór = (style, vibe, seed-from-prompt).
 * Zero external assets, zero kosztów, działa offline w Dockerze, brzmi
 * "kid-friendly" w sam raz.
 *
 * Jak to brzmi:
 *   - rock      → 130 BPM, kick+snare backbeat, power-chord stab, riff
 *   - pop       → 120 BPM, four-on-the-floor, arpeggio piano, bouncing bass
 *   - hiphop    → 90  BPM, boom-bap, sub bass, lo-fi chord stabs
 *   - kolysanka → 60  BPM, soft pad, music-box arpeggio, brak perkusji
 *
 * Vibe transponuje tonację:
 *   - energetic →  +4  (jaśniej / energiczniej)
 *   - playful   →  +0  (default)
 *   - calm      →  -3  (cieplej / spokojniej)
 *   - dreamy    →  -5  (sentymentalnie)
 *
 * API: createBackingTrack({prompt, style, vibe, bpm}) → {start, stop, setVolume, isPlaying}
 */

export type MusicStyle = "rock" | "pop" | "hiphop" | "kolysanka";
export type Vibe = "energetic" | "calm" | "playful" | "dreamy";

export type BackingTrack = {
  /** Tworzy AudioContext (potrzebuje user gesture) i startuje pętlę. */
  start(): Promise<void>;
  /** Zatrzymuje + zamyka context. Po tym handle jest jednorazowy. */
  stop(): void;
  /** 0..1 — głośność master. */
  setVolume(v: number): void;
  isPlaying(): boolean;
};

export type BackingTrackOpts = {
  prompt: string;
  style: MusicStyle;
  vibe?: Vibe;
  /** Override BPM — domyślnie per-style. */
  bpm?: number;
  /** Domyślna głośność master 0..1. Default 0.6. */
  initialVolume?: number;
};

/* ╔═══════════════════════════════════════════════════════════╗
   ║  PUBLIC FACTORY                                            ║
   ╚═══════════════════════════════════════════════════════════╝ */

export function createBackingTrack(opts: BackingTrackOpts): BackingTrack {
  const seed = hashString(`${opts.style}::${opts.prompt}`);
  const baseBpm = opts.bpm ?? defaultBpm(opts.style);
  const transpose = vibeTranspose(opts.vibe);

  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let scheduler: number | null = null;
  let stopped = false;
  let playing = false;
  let nextNoteTime = 0;
  let step = 0;

  /** Schedule lookahead: ile sekund w przód schedulujemy nuty. */
  const SCHEDULE_AHEAD = 0.12;
  /** Jak często sprawdzamy scheduler (ms). */
  const SCHEDULER_INTERVAL_MS = 30;
  /** Step = 1/16 nuty. */
  const stepsPerBeat = 4;
  const secondsPerStep = 60 / baseBpm / stepsPerBeat;

  return {
    async start() {
      if (playing || stopped) return;
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctx) throw new Error("Web Audio API niedostępne.");
      ctx = new Ctx({ latencyHint: "interactive" });
      // Niektóre przeglądarki startują w stanie suspended.
      if (ctx.state === "suspended") await ctx.resume();
      master = ctx.createGain();
      master.gain.value = opts.initialVolume ?? 0.6;
      // Lekki kompresor "klejący" miks żeby nie kuło w uszy.
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.knee.value = 24;
      comp.ratio.value = 6;
      comp.attack.value = 0.005;
      comp.release.value = 0.12;
      master.connect(comp).connect(ctx.destination);

      nextNoteTime = ctx.currentTime + 0.08;
      step = 0;
      playing = true;

      const tick = () => {
        if (!ctx || !master || stopped) return;
        while (nextNoteTime < ctx.currentTime + SCHEDULE_AHEAD) {
          scheduleStep(ctx, master, opts.style, seed, transpose, step, nextNoteTime);
          step = (step + 1) % 64; // 4 takty po 16 stepów
          nextNoteTime += secondsPerStep;
        }
        scheduler = window.setTimeout(tick, SCHEDULER_INTERVAL_MS);
      };
      tick();
    },
    stop() {
      stopped = true;
      playing = false;
      if (scheduler !== null) {
        window.clearTimeout(scheduler);
        scheduler = null;
      }
      if (ctx) {
        const ramp = 0.08;
        const t = ctx.currentTime;
        master?.gain.cancelScheduledValues(t);
        master?.gain.setValueAtTime(master.gain.value, t);
        master?.gain.linearRampToValueAtTime(0, t + ramp);
        const closing = ctx;
        window.setTimeout(() => {
          closing.close().catch(() => {});
        }, 120);
        ctx = null;
        master = null;
      }
    },
    setVolume(v: number) {
      if (!master || !ctx) return;
      const clamped = Math.max(0, Math.min(1, v));
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setTargetAtTime(clamped, t, 0.05);
    },
    isPlaying() {
      return playing && !stopped;
    },
  };
}

/* ╔═══════════════════════════════════════════════════════════╗
   ║  STEP SCHEDULER — co tworzymy na danym 1/16                ║
   ╚═══════════════════════════════════════════════════════════╝ */

function scheduleStep(
  ctx: AudioContext,
  out: AudioNode,
  style: MusicStyle,
  seed: number,
  transpose: number,
  stepIdx: number,
  when: number,
) {
  const beat = Math.floor(stepIdx / 4) % 16; // 0..15
  const stepInBeat = stepIdx % 4; // 0..3
  const isDownbeat = stepInBeat === 0;
  const chordIdx = Math.floor(stepIdx / 16) % 4; // 0..3 (4 akordy w pętli)
  const progression = chordProgression(style);
  const chord = progression[chordIdx]!.map((n) => n + transpose);
  const root = chord[0]!;

  // Drum pattern per style.
  scheduleDrums(ctx, out, style, stepIdx);

  // Bass: na każdy downbeat + (style-zależna) ósemka
  if (isDownbeat) {
    playBass(ctx, out, midiToFreq(root - 12), when, secondsPerBeatFromCtx(ctx));
  } else if (style === "hiphop" && stepInBeat === 2 && (beat % 2 === 0)) {
    playBass(ctx, out, midiToFreq(root - 12), when, 0.18);
  } else if (style === "rock" && stepInBeat === 2) {
    playBass(ctx, out, midiToFreq(root - 12), when, 0.12);
  }

  // Melody / harmony per style.
  switch (style) {
    case "rock":
      // Power chord stab na downbeat każdego beatu.
      if (isDownbeat) {
        playPowerChord(ctx, out, midiToFreq(root), when, 0.18);
      }
      // Mała melodia 1/16 co 4. takt.
      if (chordIdx === 3 && stepInBeat === 2) {
        playLead(ctx, out, midiToFreq(chord[1]! + 12), when, 0.12);
      }
      break;
    case "pop":
      // Arpeggio piano: root, 3rd, 5th, 3rd
      {
        const arp = [chord[0], chord[1], chord[2], chord[1]];
        const note = arp[stepInBeat]!;
        playPiano(ctx, out, midiToFreq(note), when, 0.22);
      }
      // Sparkle co 8. step
      if (stepIdx % 8 === 7) {
        playSparkle(ctx, out, midiToFreq(chord[2]! + 12), when, seed + stepIdx);
      }
      break;
    case "hiphop":
      // Lo-fi chord stab tylko na 1+3 beat (boom-bap feel)
      if (stepInBeat === 0 && (beat % 2 === 0)) {
        playPad(ctx, out, chord.map((n) => midiToFreq(n)), when, 0.32, 0.12);
      }
      break;
    case "kolysanka":
      // Pad ciągły na każdy chord change (cztery kroki = 4 beats = 1 chord)
      if (stepIdx % 16 === 0) {
        playPad(ctx, out, chord.map((n) => midiToFreq(n)), when, 1.6, 0.18);
      }
      // Music box arpeggio co 1/8 nuty (na parzystych stepach)
      if (stepIdx % 2 === 0) {
        const arp = [chord[0]! + 12, chord[2]! + 12, chord[1]! + 12, chord[2]! + 12];
        const note = arp[Math.floor(stepIdx / 2) % 4]!;
        playMusicBox(ctx, out, midiToFreq(note), when);
      }
      break;
  }
}

function secondsPerBeatFromCtx(_ctx: AudioContext): number {
  // Hack: nie znamy BPM tutaj, ale bass length OK ~0.25s.
  return 0.25;
}

/* ╔═══════════════════════════════════════════════════════════╗
   ║  INSTRUMENTY — proste syntezatory                          ║
   ╚═══════════════════════════════════════════════════════════╝ */

function playBass(
  ctx: AudioContext,
  out: AudioNode,
  freq: number,
  when: number,
  dur: number,
) {
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = freq;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(0.55, when + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.connect(gain).connect(out);
  osc.start(when);
  osc.stop(when + dur + 0.02);
}

function playPowerChord(
  ctx: AudioContext,
  out: AudioNode,
  freq: number,
  when: number,
  dur: number,
) {
  // Root + perfect 5th + octave, square z low-pass i lekkim distortem (waveshaper)
  const dist = ctx.createWaveShaper();
  dist.curve = makeDistCurve(40);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 1800;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(0.32, when + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  [freq, freq * 1.4983, freq * 2].forEach((f) => {
    const o = ctx.createOscillator();
    o.type = "square";
    o.frequency.value = f;
    o.connect(dist);
    o.start(when);
    o.stop(when + dur + 0.02);
  });
  dist.connect(lp).connect(gain).connect(out);
}

function playPiano(
  ctx: AudioContext,
  out: AudioNode,
  freq: number,
  when: number,
  dur: number,
) {
  // Triangle + sine partial, krótki attack, długi release.
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(0.32, when + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  const o1 = ctx.createOscillator();
  o1.type = "triangle";
  o1.frequency.value = freq;
  const o2 = ctx.createOscillator();
  o2.type = "sine";
  o2.frequency.value = freq * 2;
  const o2g = ctx.createGain();
  o2g.gain.value = 0.25;
  o1.connect(gain);
  o2.connect(o2g).connect(gain);
  gain.connect(out);
  o1.start(when);
  o2.start(when);
  o1.stop(when + dur + 0.02);
  o2.stop(when + dur + 0.02);
}

function playLead(
  ctx: AudioContext,
  out: AudioNode,
  freq: number,
  when: number,
  dur: number,
) {
  const o = ctx.createOscillator();
  o.type = "sawtooth";
  o.frequency.value = freq;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 2400;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.18, when + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  o.connect(lp).connect(g).connect(out);
  o.start(when);
  o.stop(when + dur + 0.02);
}

function playPad(
  ctx: AudioContext,
  out: AudioNode,
  freqs: number[],
  when: number,
  dur: number,
  level: number,
) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(level, when + 0.18);
  g.gain.linearRampToValueAtTime(level * 0.6, when + dur * 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 1600;
  freqs.forEach((f) => {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    o.connect(lp);
    o.start(when);
    o.stop(when + dur + 0.05);
    const o2 = ctx.createOscillator();
    o2.type = "triangle";
    o2.frequency.value = f * 1.005; // detune dla "szerokości"
    o2.connect(lp);
    o2.start(when);
    o2.stop(when + dur + 0.05);
  });
  lp.connect(g).connect(out);
}

function playMusicBox(
  ctx: AudioContext,
  out: AudioNode,
  freq: number,
  when: number,
) {
  const dur = 0.4;
  const o = ctx.createOscillator();
  o.type = "sine";
  o.frequency.value = freq * 2;
  const o2 = ctx.createOscillator();
  o2.type = "sine";
  o2.frequency.value = freq * 4;
  const o2g = ctx.createGain();
  o2g.gain.value = 0.18;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.22, when + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  o.connect(g);
  o2.connect(o2g).connect(g);
  g.connect(out);
  o.start(when);
  o2.start(when);
  o.stop(when + dur + 0.02);
  o2.stop(when + dur + 0.02);
}

function playSparkle(
  ctx: AudioContext,
  out: AudioNode,
  freq: number,
  when: number,
  seed: number,
) {
  const dur = 0.25;
  const o = ctx.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(freq, when);
  o.frequency.exponentialRampToValueAtTime(freq * (1 + ((seed % 5) * 0.04)), when + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.16, when + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  o.connect(g).connect(out);
  o.start(when);
  o.stop(when + dur + 0.02);
}

/* ╔═══════════════════════════════════════════════════════════╗
   ║  PERKUSJA — kick / snare / hi-hat                          ║
   ╚═══════════════════════════════════════════════════════════╝ */

function scheduleDrums(
  ctx: AudioContext,
  out: AudioNode,
  style: MusicStyle,
  stepIdx: number,
) {
  const when = ctx.currentTime; // not exact — kicks idą synchroniczne
  const stepInBar = stepIdx % 16;
  switch (style) {
    case "rock": {
      // Kick: 1 i 9 (= 1 i 3 beat)
      if (stepInBar === 0 || stepInBar === 8) playKick(ctx, out, when, 0.85);
      // Snare: 5 i 13 (2 i 4)
      if (stepInBar === 4 || stepInBar === 12) playSnare(ctx, out, when, 0.55);
      // Hi-hat: każda ósemka
      if (stepInBar % 2 === 0) playHat(ctx, out, when, 0.28);
      break;
    }
    case "pop": {
      // Four-on-the-floor kick
      if (stepInBar % 4 === 0) playKick(ctx, out, when, 0.72);
      if (stepInBar === 4 || stepInBar === 12) playSnare(ctx, out, when, 0.42);
      // Hi-hat każdy 1/16 ale ciszej
      playHat(ctx, out, when, stepInBar % 4 === 2 ? 0.28 : 0.18);
      break;
    }
    case "hiphop": {
      // Boom-bap: kick 1, 4-and (= step 6), 9, 13-and (step 14)
      if (stepInBar === 0 || stepInBar === 6 || stepInBar === 8 || stepInBar === 14) {
        playKick(ctx, out, when, 0.9);
      }
      // Snare 5, 13
      if (stepInBar === 4 || stepInBar === 12) playSnare(ctx, out, when, 0.45);
      // Hi-hat 1/8
      if (stepInBar % 2 === 0) playHat(ctx, out, when, 0.22);
      break;
    }
    case "kolysanka":
      // Brak perkusji — kołysanka jest spokojna
      break;
  }
}

function playKick(ctx: AudioContext, out: AudioNode, when: number, level: number) {
  const o = ctx.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(140, when);
  o.frequency.exponentialRampToValueAtTime(40, when + 0.12);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(level, when + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.18);
  o.connect(g).connect(out);
  o.start(when);
  o.stop(when + 0.22);
}

function playSnare(ctx: AudioContext, out: AudioNode, when: number, level: number) {
  // Noise burst → bandpass + tonalny ton
  const buf = ctx.createBuffer(1, 0.25 * ctx.sampleRate, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1800;
  bp.Q.value = 0.9;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.0001, when);
  ng.gain.exponentialRampToValueAtTime(level, when + 0.003);
  ng.gain.exponentialRampToValueAtTime(0.0001, when + 0.16);
  noise.connect(bp).connect(ng).connect(out);
  noise.start(when);
  noise.stop(when + 0.18);

  // Krótki klap tonalny
  const o = ctx.createOscillator();
  o.type = "triangle";
  o.frequency.setValueAtTime(220, when);
  o.frequency.exponentialRampToValueAtTime(110, when + 0.05);
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.0001, when);
  og.gain.exponentialRampToValueAtTime(level * 0.4, when + 0.003);
  og.gain.exponentialRampToValueAtTime(0.0001, when + 0.08);
  o.connect(og).connect(out);
  o.start(when);
  o.stop(when + 0.1);
}

function playHat(ctx: AudioContext, out: AudioNode, when: number, level: number) {
  const buf = ctx.createBuffer(1, 0.05 * ctx.sampleRate, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 7000;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(level, when + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.04);
  noise.connect(hp).connect(g).connect(out);
  noise.start(when);
  noise.stop(when + 0.05);
}

/* ╔═══════════════════════════════════════════════════════════╗
   ║  HARMONIA — progresje akordów (MIDI semitones)            ║
   ║  Bazujemy na C major (60). Vibe transponuje całość.       ║
   ╚═══════════════════════════════════════════════════════════╝ */

/** Każda lista to akord [root, third, fifth] w MIDI relatywnie do C4=60. */
function chordProgression(style: MusicStyle): number[][] {
  switch (style) {
    case "rock":
      // I-V-vi-IV (C-G-Am-F) klasyk pop-rock
      return [
        [60, 64, 67],
        [67, 71, 74],
        [69, 72, 76],
        [65, 69, 72],
      ];
    case "pop":
      // vi-IV-I-V (Am-F-C-G) "happy"
      return [
        [69, 72, 76],
        [65, 69, 72],
        [60, 64, 67],
        [67, 71, 74],
      ];
    case "hiphop":
      // i-VII-VI-VII (Am-G-F-G) "moody"
      return [
        [69, 72, 76],
        [67, 71, 74],
        [65, 69, 72],
        [67, 71, 74],
      ];
    case "kolysanka":
      // I-vi-ii-V (C-Am-Dm-G) "dreamy"
      return [
        [60, 64, 67],
        [69, 72, 76],
        [62, 65, 69],
        [67, 71, 74],
      ];
  }
}

function defaultBpm(style: MusicStyle): number {
  switch (style) {
    case "rock":
      return 130;
    case "pop":
      return 120;
    case "hiphop":
      return 90;
    case "kolysanka":
      return 60;
  }
}

function vibeTranspose(vibe: Vibe | undefined): number {
  switch (vibe) {
    case "energetic":
      return 4;
    case "calm":
      return -3;
    case "dreamy":
      return -5;
    case "playful":
    default:
      return 0;
  }
}

/* ╔═══════════════════════════════════════════════════════════╗
   ║  Util                                                      ║
   ╚═══════════════════════════════════════════════════════════╝ */

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function makeDistCurve(amount: number): Float32Array {
  const k = amount;
  const n = 1024;
  const curve = new Float32Array(n);
  const deg = Math.PI / 180;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

/** Stabilny FNV-1a 32-bit hash. */
function hashString(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}
