// « Game juice » : petits sons synthétisés (Web Audio, aucun fichier) et vibrations.
// Le son se coupe par appareil (localStorage). Tout échoue en silence : le jeu marche sans.
import { useSyncExternalStore } from "react";

const MUTE_KEY = "dlq:muted";

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

let muted = readMuted();
const listeners = new Set<() => void>();

export function setMuted(value: boolean) {
  muted = value;
  try {
    localStorage.setItem(MUTE_KEY, value ? "1" : "0");
  } catch {
    /* stockage indisponible : réglage pour cette session seulement */
  }
  listeners.forEach((l) => l());
}

/** Interrupteur du son, partagé entre tous les composants. */
export function useSound(): [boolean, (on: boolean) => void] {
  const isMuted = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => muted,
  );
  return [!isMuted, (on) => setMuted(!on)];
}

// ---------- Moteur audio ----------

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;

function audio(): AudioContext | null {
  if (muted || typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

// Les navigateurs n'autorisent le son qu'après un geste : on « réveille » l'audio au premier appui.
if (typeof window !== "undefined") {
  const unlock = () => {
    audio();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
}

/** Note simple avec enveloppe courte. */
function tone(freq: number, { at = 0, dur = 0.12, type = "sine" as OscillatorType, vol = 0.5, slide = 0 } = {}) {
  const ac = audio();
  if (!ac || !master) return;
  const t = ac.currentTime + at;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** Souffle de bruit filtré (papier, tampon). */
function hiss({ at = 0, dur = 0.15, freq = 2500, q = 0.8, vol = 0.4, type = "bandpass" as BiquadFilterType } = {}) {
  const ac = audio();
  if (!ac || !master || !noise) return;
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
  src.connect(f).connect(g).connect(master);
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
    tone(392, { dur: 0.42, type: "triangle", vol: 0.35, slide: -230 });
    tone(196, { at: 0.08, dur: 0.38, type: "sine", vol: 0.25, slide: -90 });
  },
  /** Carillon : victoire, 5/5, partenaire arrivé. */
  chime(long = false) {
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
    if (!muted) navigator.vibrate?.(pattern);
  } catch {
    /* non pris en charge */
  }
}
