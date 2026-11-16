// Règles pures du jeu « Devine la question ».
// Aucun import, aucun appel réseau : ce fichier est partagé entre les Edge Functions (Deno)
// et le front (Vite), et testé avec Vitest (rules.test.ts).

// ---------- Types ----------

export type Media = "mot" | "nombre" | "emojis" | "dessin" | "photo" | "musique" | "gif";
export type SpecialCase = "piege" | "tremplin" | "chance" | "malchance";
export type CaseType = "depart" | "arrivee" | Media | SpecialCase;

export interface BoardCase {
  index: number;
  type: CaseType;
}
export interface Board {
  cases: BoardCase[];
}

export interface Question {
  id: string;
  media: Media;
  theme: string;
  text: string;
  /** Joker « mot-clé » : un mot qui met sur la piste. */
  keyword: string;
  /** Joker « thème » : le sujet précis de la question. */
  topic: string;
}

export type Phase =
  | "lobby"
  | "answering"
  | "guessing"
  | "judging"
  | "reveal"
  | "appeal"
  | "spin"
  | "moving"
  | "finished";

export type Outcome = "win" | "lose" | null;

// ---------- Constantes ----------

export const FINISH = 63;
export const MAX_TURNS = 24;
export const GUESS_MAX_LENGTH = 250;
export const WORD_MAX_LENGTH = 30;
export const MAX_EMOJIS = 3;
export const DRAWING_SECONDS = 60;
export const MAX_UPLOAD_BYTES = 1024 * 1024;

export const ALL_MEDIA: readonly Media[] = ["mot", "nombre", "emojis", "dessin", "photo", "musique", "gif"];
/** Médias dont la réponse est un fichier envoyé dans le bucket `answers`. */
export const FILE_MEDIA: readonly Media[] = ["dessin", "photo"];

/** Parts de la roue par niveau (0 à 3). */
export const WHEEL_SEGMENTS: readonly (readonly number[])[] = [
  [1, 1, 2, 2, 3],
  [1, 2, 2, 3, 3, 4],
  [2, 3, 3, 4, 4, 5],
  [3, 4, 4, 5, 5, 6],
];

/** Pions proposés en salle d'attente (un pion commun aux deux joueurs), dessinés à l'encre côté front. */
export const PAWNS: readonly string[] = [
  "oie",
  "tortue",
  "renard",
  "chat",
  "escargot",
  "enveloppe",
  "avion",
  "montgolfiere",
  "bateau",
  "velo",
  "coeur",
  "etoile",
];
export const DEFAULT_PAWN = PAWNS[0];

export function isValidPawn(p: unknown): p is string {
  return typeof p === "string" && PAWNS.includes(p);
}

// ---------- Plateau et médias ----------

export function isMedia(t: CaseType): t is Media {
  return (ALL_MEDIA as readonly string[]).includes(t);
}

/**
 * Média imposé pour un tour dont le pion est sur `index`.
 * Départ → mot. Case spéciale → média de la case média la plus proche en arrière.
 */
export function mediaForCase(board: Board, index: number): Media {
  for (let i = Math.min(index, board.cases.length - 1); i >= 0; i--) {
    const t = board.cases[i].type;
    if (isMedia(t)) return t;
  }
  return "mot";
}

export function validateBoard(board: Board): string[] {
  const errors: string[] = [];
  if (board.cases.length !== FINISH + 1) errors.push(`le plateau doit avoir ${FINISH + 1} cases`);
  board.cases.forEach((c, i) => {
    if (c.index !== i) errors.push(`case ${i} : index ${c.index}`);
  });
  if (board.cases[0]?.type !== "depart") errors.push("la case 0 doit être le départ");
  if (board.cases[FINISH]?.type !== "arrivee") errors.push(`la case ${FINISH} doit être l'arrivée`);
  // Pas d'effet en chaîne : un effet qui atterrit sur un timbre ne ferait rien, ce qui semble cassé.
  board.cases.forEach((c, i) => {
    for (const t of effectTargets(board, i)) {
      if (isSpecial(board.cases[t]?.type)) errors.push(`case ${i} (${c.type}) : l'effet peut atterrir sur le timbre ${t}`);
    }
  });
  return errors;
}

// ---------- Cases spéciales ----------

export interface CaseEffect {
  type: SpecialCase;
  label: string;
  delta: number;
}

export const SPECIAL_CASES: readonly SpecialCase[] = ["piege", "tremplin", "chance", "malchance"];

export function isSpecial(t: CaseType | undefined): t is SpecialCase {
  return t !== undefined && (SPECIAL_CASES as readonly string[]).includes(t);
}

export const TRAP_DELTA = -3;
export const SPRINGBOARD_DELTA = 2;

export const CHANCE_CARDS: readonly { label: string; delta: number }[] = [
  { label: "Petit pas en avant", delta: 1 },
  { label: "Vent favorable", delta: 2 },
  { label: "Raccourci secret", delta: 3 },
];

export const MALCHANCE_CARDS: readonly { label: string; delta: number }[] = [
  { label: "Lacet défait", delta: -1 },
  { label: "Détour imprévu", delta: -2 },
  { label: "Demi-tour !", delta: -3 },
];

/** Toutes les cases que l'effet de la case `index` peut atteindre (vide pour une case sans effet). */
export function effectTargets(board: Board, index: number): number[] {
  const type = board.cases[index]?.type;
  const deltas =
    type === "piege"
      ? [TRAP_DELTA]
      : type === "tremplin"
        ? [SPRINGBOARD_DELTA]
        : type === "chance"
          ? CHANCE_CARDS.map((c) => c.delta)
          : type === "malchance"
            ? MALCHANCE_CARDS.map((c) => c.delta)
            : [];
  return deltas.map((d) => Math.max(0, Math.min(FINISH, index + d)));
}

function pick<T>(list: readonly T[], rng: () => number): T {
  return list[Math.floor(rng() * list.length) % list.length];
}

/**
 * Effet de la case où le pion vient d'arriver. Pas d'effet en chaîne :
 * la case atteinte après l'effet ne déclenche rien.
 */
export function applyCaseEffect(
  board: Board,
  landed: number,
  rng: () => number = Math.random,
): { effect: CaseEffect | null; to: number } {
  const type = board.cases[landed]?.type;
  let effect: CaseEffect | null = null;
  switch (type) {
    case "piege":
      effect = { type, label: "Piège !", delta: TRAP_DELTA };
      break;
    case "tremplin":
      effect = { type, label: "Tremplin !", delta: SPRINGBOARD_DELTA };
      break;
    case "chance":
      effect = { type, ...pick(CHANCE_CARDS, rng) };
      break;
    case "malchance":
      effect = { type, ...pick(MALCHANCE_CARDS, rng) };
      break;
  }
  if (!effect) return { effect: null, to: landed };
  return { effect, to: Math.max(0, Math.min(FINISH, landed + effect.delta)) };
}

// ---------- Questions ----------

/** Tire une question du média, en évitant celles déjà jouées dans la partie. */
export function drawQuestion(
  questions: readonly Question[],
  media: Media,
  usedIds: readonly string[],
  rng: () => number = Math.random,
): Question {
  const pool = questions.filter((q) => q.media === media);
  if (pool.length === 0) throw new Error(`aucune question pour le média ${media}`);
  const fresh = pool.filter((q) => !usedIds.includes(q.id));
  return pick(fresh.length > 0 ? fresh : pool, rng); // paquet épuisé : on recycle
}

// ---------- Jokers ----------

/** Trois jokers communs aux deux joueurs, un de chaque, utilisables une fois par partie par le devineur. */
export const JOKERS = ["mot_cle", "theme", "choix"] as const;
export type Joker = (typeof JOKERS)[number];
export const INITIAL_JOKERS: readonly Joker[] = [...JOKERS];
export const CHOICE_COUNT = 3;

export function isJoker(j: unknown): j is Joker {
  return typeof j === "string" && (JOKERS as readonly string[]).includes(j);
}

/** Inventaire lu en base (jsonb) : on ne garde que les jokers connus, sans doublon. */
export function parseInventory(raw: unknown): Joker[] {
  if (!Array.isArray(raw)) return [];
  return JOKERS.filter((j) => raw.includes(j));
}

/**
 * Joker « choix » : la vraie question et deux leurres du même média, mélangés.
 * Les leurres viennent d'un autre thème quand c'est possible, pour que le choix reste jouable.
 */
export function buildChoices(
  question: Question,
  questions: readonly Question[],
  rng: () => number = Math.random,
): string[] {
  const others = questions.filter((q) => q.media === question.media && q.id !== question.id && q.text !== question.text);
  const otherTopic = others.filter((q) => q.topic !== question.topic);
  const pool = [...(otherTopic.length >= CHOICE_COUNT - 1 ? otherTopic : others)];
  const decoys: string[] = [];
  while (decoys.length < CHOICE_COUNT - 1 && pool.length > 0) {
    decoys.push(pool.splice(Math.floor(rng() * pool.length) % pool.length, 1)[0].text);
  }
  const all = [question.text, ...decoys];
  for (let i = all.length - 1; i > 0; i--) {
    const k = Math.floor(rng() * (i + 1)) % (i + 1);
    [all[i], all[k]] = [all[k], all[i]];
  }
  return all;
}

/** Note du joker « choix » : la bonne proposition vaut 5, une mauvaise 0. Pas de juge. */
export function choiceScore(chosen: string, correct: string): 0 | 5 {
  return chosen === correct ? 5 : 0;
}

export function isValidChoice(n: unknown, choices: readonly string[]): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 0 && n < choices.length;
}

// ---------- Validation des réponses ----------

export type ValidationResult = { ok: true; value: string } | { ok: false; error: string };

const PICTO = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u;
const LETTER_OR_DIGIT_ONLY = /^[\p{L}\p{N}\s.,;:!?'"()-]+$/u;

export function splitGraphemes(s: string): string[] {
  const Seg = (Intl as unknown as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (Seg) return Array.from(new Seg("fr", { granularity: "grapheme" }).segment(s), (x) => x.segment);
  return Array.from(s);
}

export function isEmojiGrapheme(g: string): boolean {
  if (LETTER_OR_DIGIT_ONLY.test(g)) return false;
  return PICTO.test(g);
}

/** Chemin attendu d'un fichier de réponse dans le bucket `answers`. */
export function answerFilePath(roomId: string, roundId: string, media: Media): string {
  return `${roomId}/${roundId}.${media === "photo" ? "jpg" : "png"}`;
}

/**
 * Valide la réponse brute envoyée par le client.
 * Pour dessin/photo, `ctx` donne la salle et le tour : seul le chemin attendu est accepté.
 */
export function validateAnswer(
  media: Media,
  raw: unknown,
  ctx?: { roomId: string; roundId: string },
): ValidationResult {
  if (typeof raw !== "string") return { ok: false, error: "Réponse manquante." };
  const s = raw.trim();
  if (!s) return { ok: false, error: "La réponse est vide." };

  switch (media) {
    case "mot": {
      if (/\s/.test(s)) return { ok: false, error: "Un seul mot, sans espace." };
      if ([...s].length > WORD_MAX_LENGTH) return { ok: false, error: `${WORD_MAX_LENGTH} caractères maximum.` };
      return { ok: true, value: s };
    }
    case "nombre": {
      const normalized = s.replace(",", ".");
      if (!/^-?\d{1,12}(\.\d{1,6})?$/.test(normalized)) {
        return { ok: false, error: "Un nombre entier ou décimal, par exemple 3 ou 2,5." };
      }
      return { ok: true, value: normalized };
    }
    case "emojis": {
      const graphemes = splitGraphemes(s.replace(/\s+/g, ""));
      if (graphemes.length < 1 || graphemes.length > MAX_EMOJIS) {
        return { ok: false, error: `Entre 1 et ${MAX_EMOJIS} emojis.` };
      }
      if (!graphemes.every(isEmojiGrapheme)) return { ok: false, error: "Uniquement des emojis." };
      return { ok: true, value: graphemes.join("") };
    }
    case "dessin":
    case "photo": {
      if (!ctx) return { ok: false, error: "Contexte manquant." };
      if (s !== answerFilePath(ctx.roomId, ctx.roundId, media)) return { ok: false, error: "Fichier invalide." };
      return { ok: true, value: s };
    }
    case "musique": {
      if (!/^\d{1,15}$/.test(s)) return { ok: false, error: "Choisis un morceau dans la liste." };
      return { ok: true, value: s };
    }
    case "gif": {
      if (!/^[A-Za-z0-9]{5,40}$/.test(s)) return { ok: false, error: "Choisis un GIF dans la liste." };
      return { ok: true, value: s };
    }
  }
}

export function validateGuess(raw: unknown): ValidationResult {
  if (typeof raw !== "string") return { ok: false, error: "Question manquante." };
  const s = raw.trim();
  if (!s) return { ok: false, error: "Écris la question que tu imagines." };
  if ([...s].length > GUESS_MAX_LENGTH) return { ok: false, error: `${GUESS_MAX_LENGTH} caractères maximum.` };
  return { ok: true, value: s };
}

export function isValidScore(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 5;
}

// ---------- Notes ----------

/** Moyenne des notes d'appel, arrondie au demi-point. */
export function appealAverage(scores: readonly number[]): number {
  if (scores.length === 0) throw new Error("aucune note");
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round(avg * 2) / 2;
}

/** Note finale = note du juge (ou de l'appel) + 1 si coup de cœur + 1 si originalité, plafonnée à 5. */
export function finalScore(base: number, heart: boolean, originality = false): number {
  return Math.min(5, base + (heart ? 1 : 0) + (originality ? 1 : 0));
}

// ---------- Roue ----------

export function wheelLevel(score: number): 0 | 1 | 2 | 3 {
  if (score < 2) return 0;
  if (score < 3) return 1;
  if (score < 4) return 2;
  return 3;
}

export interface SpinResult {
  level: 0 | 1 | 2 | 3;
  segmentIndex: number;
  steps: number;
}

/** Tirage uniforme parmi les parts du niveau. */
export function spinWheel(level: 0 | 1 | 2 | 3, rng: () => number = Math.random): SpinResult {
  const segments = WHEEL_SEGMENTS[level];
  const segmentIndex = Math.floor(rng() * segments.length) % segments.length;
  return { level, segmentIndex, steps: segments[segmentIndex] };
}

// ---------- Fin de tour ----------

export interface TurnInput {
  position: number;
  turnsCounted: number; // tours déjà comptés AVANT celui-ci
  finalScore: number;
}

export interface TurnResult extends SpinResult {
  from: number;
  /** Case atteinte par la roue, avant l'effet de case. */
  landed: number;
  effect: CaseEffect | null;
  /** Position finale, après l'effet. */
  to: number;
  turnsCounted: number;
  outcome: Outcome;
}

/** Phases spin + moving : tirage, déplacement, effet de case, décompte des tours, victoire ou défaite. */
export function resolveTurn(board: Board, input: TurnInput, rng: () => number = Math.random): TurnResult {
  const spin = spinWheel(wheelLevel(input.finalScore), rng);
  const landed = Math.min(FINISH, input.position + spin.steps);
  const { effect, to } = applyCaseEffect(board, landed, rng);
  const turnsCounted = input.turnsCounted + 1;
  let outcome: Outcome = null;
  if (to >= FINISH) outcome = "win";
  else if (turnsCounted >= MAX_TURNS) outcome = "lose";
  return { ...spin, from: input.position, landed, effect, to, turnsCounted, outcome };
}

export function otherSeat(seat: number): 0 | 1 {
  return seat === 0 ? 1 : 0;
}

// ---------- Bilan de fin ----------

export interface RoundSummary {
  final_score: number | null;
  heart: boolean;
}

/** Complicité = moyenne des notes finales ÷ 5 × 100, arrondie. */
export function complicity(rounds: readonly RoundSummary[]): number {
  const scored = rounds.filter((r) => r.final_score !== null);
  if (scored.length === 0) return 0;
  const avg = scored.reduce((a, r) => a + (r.final_score as number), 0) / scored.length;
  return Math.round((avg / 5) * 100);
}

export function bestMoments<T extends RoundSummary & { turn_number: number }>(rounds: readonly T[], n = 3): T[] {
  return rounds
    .filter((r) => r.final_score !== null)
    .slice()
    .sort((a, b) => (b.final_score as number) - (a.final_score as number) || a.turn_number - b.turn_number)
    .slice(0, n);
}

export function heartCount(rounds: readonly RoundSummary[]): number {
  return rounds.filter((r) => r.heart).length;
}

// ---------- Codes de salle ----------

const CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // sans I ni O pour éviter les confusions

export function generateRoomCode(rng: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < 4; i++) code += CODE_LETTERS[Math.floor(rng() * CODE_LETTERS.length) % CODE_LETTERS.length];
  return code;
}

export function normalizeRoomCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
}
