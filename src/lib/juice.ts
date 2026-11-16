// « Game juice » : petits sons synthétisés (Web Audio, aucun fichier), musique d'ambiance générée et vibrations.
// Réglages par appareil (localStorage) : musique et bruitages séparés, chacun avec son volume.
// Tout échoue en silence : le jeu marche sans son.
import { useSyncExternalStore } from "react";

// ---------- Réglages ----------

export interface AudioSettings {
  musicOn: boolean;
  musicVolume: number; // 0 à 1
  sfxOn: boolean;
  sfxVolume: number; // 0 à 1
}

const SETTINGS_KEY = "dlq:audio";
const DEFAULTS: AudioSettings = { musicOn: true, musicVolume: 0.3, sfxOn: true, sfxVolume: 0.7 };

function readSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<AudioSettings>;
      const vol = (v: unknown, d: number) => (typeof v === "number" && v >= 0 && v <= 1 ? v : d);
      return {
        musicOn: typeof p.musicOn === "boolean" ? p.musicOn : DEFAULTS.musicOn,
        musicVolume: vol(p.musicVolume, DEFAULTS.musicVolume),
        sfxOn: typeof p.sfxOn === "boolean" ? p.sfxOn : DEFAULTS.sfxOn,
        sfxVolume: vol(p.sfxVolume, DEFAULTS.sfxVolume),
      };
    }
    // Ancien réglage « son coupé » : on coupe tout.
    if (localStorage.getItem("dlq:muted") === "1") return { ...DEFAULTS, musicOn: false, sfxOn: false };
  } catch {
    /* stockage indisponible */
  }
  return { ...DEFAULTS };
}

let settings = readSettings();
const listeners = new Set<() => void>();

export function updateAudioSettings(patch: Partial<AudioSettings>) {
  settings = { ...settings, ...patch };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* réglage gardé pour cette session seulement */
  }
  applyVolumes();
  if (settings.musicOn) music.start();
  else music.stop();
  listeners.forEach((l) => l());
}

/** Réglages du son, partagés entre tous les composants. */
export function useAudioSettings(): [AudioSettings, (patch: Partial<AudioSettings>) => void] {
  const current = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => settings,
  );
  return [current, updateAudioSettings];
}

// ---------- Moteur audio : deux bus (bruitages, musique) ----------

let ctx: AudioContext | null = null;
let sfxBus: GainNode | null = null;
let musicBus: GainNode | null = null;
let musicDuck: GainNode | null = null;
let noise: AudioBuffer | null = null;

/** Courbe de volume plus naturelle que la linéaire (l'oreille perçoit en logarithme). */
const curve = (v: number) => v * v;

function applyVolumes() {
  if (!ctx || !sfxBus || !musicBus) return;
  const t = ctx.currentTime;
  sfxBus.gain.setTargetAtTime(settings.sfxOn ? curve(settings.sfxVolume) * 0.6 : 0, t, 0.05);
  musicBus.gain.setTargetAtTime(settings.musicOn ? curve(settings.musicVolume) * 0.9 : 0, t, 0.2);
}

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      sfxBus = ctx.createGain();
      sfxBus.connect(ctx.destination);
      musicDuck = ctx.createGain();
      musicDuck.connect(ctx.destination);
      musicBus = ctx.createGain();
      musicBus.connect(musicDuck);
      sfxBus.gain.value = 0;
      musicBus.gain.value = 0;
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      applyVolumes();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Contexte pour un bruitage, ou null si les bruitages sont coupés. */
function audio(): AudioContext | null {
  return settings.sfxOn ? context() : null;
}

/** Baisse brièvement la musique pendant un bruitage fort. */
function duck(seconds = 0.7) {
  if (!ctx || !musicDuck) return;
  const t = ctx.currentTime;
  musicDuck.gain.cancelScheduledValues(t);
  musicDuck.gain.setTargetAtTime(0.3, t, 0.04);
  musicDuck.gain.setTargetAtTime(1, t + seconds, 0.3);
}

// Les navigateurs n'autorisent le son qu'après un geste : on « réveille » l'audio au premier appui.
if (typeof window !== "undefined") {
  const unlock = () => {
    context();
    if (settings.musicOn) music.start();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
  // Onglet caché : la musique s'efface, et revient au retour.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) music.stop();
    else if (settings.musicOn && ctx) music.start();
  });
}

// ---------- Musique d'ambiance générative ----------
// Boîte à musique sur quatre accords lents (fa majeur), nappe douce et basse ronde. Rien n'est enregistré :
// les notes sont tirées au hasard dans l'accord en cours, donc la musique ne se répète jamais exactement.

const BPM = 64;
const BEAT = 60 / BPM;
const midi = (n: number) => 440 * 2 ** ((n - 69) / 12);
// Fa maj7, Ré m7, Si♭ maj7, Do (sus) : notes MIDI de la nappe, et notes de mélodie (octave 5-6)
const CHORDS = [
  { root: 41, pad: [53, 57, 60, 64], melody: [72, 74, 76, 77, 79, 81, 84] },
  { root: 38, pad: [50, 53, 57, 60], melody: [69, 72, 74, 76, 77, 81] },
  { root: 46, pad: [50, 53, 57, 58], melody: [70, 72, 74, 77, 79, 82] },
  { root: 36, pad: [48, 52, 55, 60], melody: [67, 69, 72, 74, 76, 79] },
];
const BEATS_PER_CHORD = 4;

let timer: number | null = null;
let nextTime = 0; // horloge audio de la prochaine croche
let step = 0; // croches depuis le début
let musicFade: GainNode | null = null;
let echo: { input: GainNode } | null = null;

function musicOut(): AudioNode | null {
  if (!ctx || !musicBus) return null;
  if (!musicFade) {
    musicFade = ctx.createGain();
    musicFade.gain.value = 0;
    // Écho léger : donne l'air d'une boîte à musique dans une pièce.
    const input = ctx.createGain();
    const delay = ctx.createDelay(1);
    delay.delayTime.value = BEAT * 0.75;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.28;
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 2400;
    input.connect(musicFade);
    input.connect(delay);
    delay.connect(tone).connect(feedback).connect(delay);
    tone.connect(wet).connect(musicFade);
    musicFade.connect(musicBus);
    echo = { input };
  }
  return echo!.input;
}

function musicNote(freq: number, t: number, { dur = 1.4, vol = 0.12, type = "triangle" as OscillatorType, attack = 0.005 } = {}) {
  const out = musicOut();
  if (!ctx || !out) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function padChord(notes: number[], t: number, length: number) {
  const out = musicOut();
  if (!ctx || !out) return;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 900;
  filter.connect(out);
  for (const n of notes) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = midi(n);
    osc.detune.value = (Math.random() - 0.5) * 8;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.035, t + 1.4);
    g.gain.setValueAtTime(0.035, t + length - 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + length + 1.2);
    osc.connect(g).connect(filter);
    osc.start(t);
    osc.stop(t + length + 1.3);
  }
}

function scheduleMusic() {
  if (!ctx) return;
  const eighth = BEAT / 2;
  const perChord = BEATS_PER_CHORD * 2;
  while (nextTime < ctx.currentTime + 0.8) {
    const chord = CHORDS[Math.floor(step / perChord) % CHORDS.length];
    const inChord = step % perChord;
    if (inChord === 0) {
      padChord(chord.pad, nextTime, BEAT * BEATS_PER_CHORD);
      musicNote(midi(chord.root), nextTime, { dur: BEAT * 3, vol: 0.09, type: "sine", attack: 0.03 });
    }
    // Mélodie clairsemée : plus probable sur les temps forts, silences fréquents.
    const p = inChord % 2 === 0 ? 0.5 : 0.22;
    if (Math.random() < p) {
      const n = chord.melody[Math.floor(Math.random() * chord.melody.length)];
      musicNote(midi(n), nextTime, { dur: 1.6, vol: 0.07 });
      musicNote(midi(n) * 2, nextTime, { dur: 0.5, vol: 0.015, type: "sine" }); // petit tintement
    }
    nextTime += eighth;
    step++;
  }
}

export const music = {
  start() {
    if (timer !== null || !settings.musicOn) return;
    const ac = context();
    if (!ac || ac.state !== "running") {
      // Pas encore de geste de l'utilisateur : on réessaiera au premier appui.
      if (ac) void ac.resume().then(() => settings.musicOn && ac.state === "running" && music.start());
      return;
    }
    musicOut();
    nextTime = ac.currentTime + 0.1;
    musicFade!.gain.cancelScheduledValues(ac.currentTime);
    musicFade!.gain.setTargetAtTime(1, ac.currentTime, 0.8);
    scheduleMusic();
    timer = window.setInterval(scheduleMusic, 250);
  },
  stop() {
    if (timer === null) return;
    window.clearInterval(timer);
    timer = null;
    if (ctx && musicFade) {
      musicFade.gain.cancelScheduledValues(ctx.currentTime);
      musicFade.gain.setTargetAtTime(0, ctx.currentTime, 0.35);
    }
  },
};

/** Note simple avec enveloppe courte. */
function tone(freq: number, { at = 0, dur = 0.12, type = "sine" as OscillatorType, vol = 0.5, slide = 0 } = {}) {
  const ac = audio();
  if (!ac || !sfxBus) return;
  const t = ac.currentTime + at;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(sfxBus);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** Souffle de bruit filtré (papier, tampon). */
function hiss({ at = 0, dur = 0.15, freq = 2500, q = 0.8, vol = 0.4, type = "bandpass" as BiquadFilterType } = {}) {
  const ac = audio();
  if (!ac || !sfxBus || !noise) return;
  const t = ac.currentTime + at;
  const src = ac.createBufferSource();
  src.buffer = noise;
  const f = ac.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(sfxBus);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.02);
}

export const sfx = {
  /** Froissement de papier : bouton, lettre envoyée. */
  paper() {
    hiss({ dur: 0.09, freq: 3200, q: 0.6, vol: 0.22 });
    hiss({ at: 0.05, dur: 0.12, freq: 1800, q: 0.7, vol: 0.18 });
  },
  /** Coup de tampon : grave sourd + claquement. */
  stamp() {
    duck(0.5);
    tone(140, { dur: 0.16, type: "sine", vol: 0.7, slide: -70 });
    hiss({ dur: 0.07, freq: 900, q: 1.2, vol: 0.35, type: "lowpass" });
  },
  /** Cliquetis de la roue, d'une étoile qui se pose, d'un emoji choisi. */
  tick() {
    tone(1500 + Math.random() * 200, { dur: 0.03, type: "triangle", vol: 0.18 });
  },
  /** Pas du pion sur le plateau. */
  step() {
    tone(420 + Math.random() * 60, { dur: 0.07, type: "triangle", vol: 0.22, slide: 120 });
  },
  /** Petit « pop » du coup de cœur. */
  pop() {
    tone(520, { dur: 0.12, type: "sine", vol: 0.45, slide: 500 });
    tone(1040, { at: 0.06, dur: 0.12, type: "sine", vol: 0.25 });
  },
  /** Chance, tremplin : montée joyeuse. */
  rise() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, { at: i * 0.07, dur: 0.16, type: "triangle", vol: 0.28 }));
  },
  /** Piège, malchance : descente penaude. */
  fall() {
    duck(0.9);
    tone(392, { dur: 0.42, type: "triangle", vol: 0.35, slide: -230 });
    tone(196, { at: 0.08, dur: 0.38, type: "sine", vol: 0.25, slide: -90 });
  },
  /** Carillon : victoire, 5/5, partenaire arrivé. */
  chime(long = false) {
    duck(long ? 1.6 : 0.8);
    const notes = long ? [523, 659, 784, 1047, 1319] : [784, 1047];
    notes.forEach((f, i) => {
      tone(f, { at: i * 0.11, dur: 0.6, type: "sine", vol: 0.32 });
      tone(f * 2, { at: i * 0.11, dur: 0.3, type: "sine", vol: 0.06 });
    });
  },
  /** Erreur douce. */
  soft() {
    tone(300, { dur: 0.12, type: "triangle", vol: 0.25 });
    tone(250, { at: 0.1, dur: 0.16, type: "triangle", vol: 0.22 });
  },
};

/** Vibration courte sur téléphone (ignorée ailleurs). */
export function buzz(pattern: number | number[] = 18) {
  try {
    // Le navigateur refuse (avec un avertissement) toute vibration avant un premier geste de l'utilisateur.
    const active = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive ?? true;
    if (settings.sfxOn && active) navigator.vibrate?.(pattern);
  } catch {
    /* non pris en charge */
  }
}
