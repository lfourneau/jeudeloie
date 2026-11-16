// Règles pures du jeu « Devine la question ».
// Aucun import, aucun appel réseau : ce fichier est partagé entre les Edge Functions (Deno)
// et le front (Vite), et testé avec Vitest (rules.test.ts).

// ---------- Types ----------

export type Media = "mot" | "nombre" | "emojis" | "dessin" | "photo";
export type SpecialCase = "piege" | "tremplin" | "coffre" | "tempete" | "double";
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

export const FINISH = 40;
export const MAX_TURNS = 15;
export const GUESS_MAX_LENGTH = 250;
export const WORD_MAX_LENGTH = 30;
export const MAX_EMOJIS = 3;

/** Médias jouables dans cette version. Les autres retombent sur « mot ». */
export const ENABLED_MEDIA: readonly Media[] = ["mot", "nombre", "emojis"];
const ALL_MEDIA: readonly Media[] = ["mot", "nombre", "emojis", "dessin", "photo"];

/** Parts de la roue par niveau (0 à 3). */
export const WHEEL_SEGMENTS: readonly (readonly number[])[] = [
  [1, 1, 2, 2, 3],
  [1, 2, 2, 3, 3, 4],
  [2, 3, 3, 4, 4, 5],
  [3, 4, 4, 5, 5, 6],
];

// ---------- Plateau et médias ----------

export function isMedia(t: CaseType): t is Media {
  return (ALL_MEDIA as readonly string[]).includes(t);
}

/**
 * Média imposé pour un tour dont le pion est sur `index`.
 * Départ → mot. Case spéciale → média de la case média la plus proche en arrière.
 * Média pas encore disponible (dessin, photo) → mot.
 */
export function mediaForCase(board: Board, index: number): Media {
  for (let i = Math.min(index, board.cases.length - 1); i >= 0; i--) {
    const t = board.cases[i].type;
    if (isMedia(t)) return ENABLED_MEDIA.includes(t) ? t : "mot";
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
  return errors;
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
  const from = fresh.length > 0 ? fresh : pool; // paquet épuisé : on recycle
  return from[Math.floor(rng() * from.length) % from.length];
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

export function validateAnswer(media: Media, raw: unknown): ValidationResult {
  if (typeof raw !== "string") return { ok: false, error: "Réponse manquante." };
  const s = raw.trim();
  if (!s) return { ok: false, error: "La réponse est vide." };

  switch (media) {
    case "mot":
    case "dessin": // en attendant la V2, ces cases se jouent comme des mots
    case "photo": {
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

/** Note finale = note du juge (ou de l'appel) + 1 si coup de cœur, plafonnée à 5. */
export function finalScore(base: number, heart: boolean): number {
  return Math.min(5, base + (heart ? 1 : 0));
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
  to: number;
  turnsCounted: number;
  outcome: Outcome;
}

/** Phases spin + moving : tirage, déplacement, décompte des tours, victoire ou défaite. */
export function resolveTurn(input: TurnInput, rng: () => number = Math.random): TurnResult {
  const spin = spinWheel(wheelLevel(input.finalScore), rng);
  const to = Math.min(FINISH, input.position + spin.steps);
  const turnsCounted = input.turnsCounted + 1;
  let outcome: Outcome = null;
  if (to >= FINISH) outcome = "win";
  else if (turnsCounted >= MAX_TURNS) outcome = "lose";
  return { ...spin, from: input.position, to, turnsCounted, outcome };
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
