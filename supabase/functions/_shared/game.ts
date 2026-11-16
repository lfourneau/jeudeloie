// Lecture de l'état, écriture transactionnelle et transitions communes (nouveau tour, roue).
import boardJson from "./content/board.json" with { type: "json" };
import questionsJson from "./content/questions.json" with { type: "json" };
import { adminClient, type PlayerRow, requirePlayer, requireUser } from "./auth.ts";
import { fromSqlError, HttpError, requireString } from "./http.ts";
import { giphyEnabled } from "./media.ts";
import {
  type Board,
  drawRoundQuestion,
  finalScore,
  mediaForCase,
  type Media,
  INITIAL_JOKERS,
  type Phase,
  otherSeat,
  parseCategories,
  isLinkedImagePath,
  pickCategory,
  type QuestionBank,
  resolveTurn,
  roundContext,
} from "./rules.ts";

export const board = boardJson as Board;
export const bank = questionsJson as QuestionBank;

export interface GameState {
  room_id: string;
  phase: Phase;
  turn_number: number;
  turns_counted: number;
  answerer_seat: 0 | 1;
  position: number;
  appeal_used: boolean;
  inventory: unknown;
  current_round_id: string | null;
  outcome: "win" | "lose" | null;
  pawn: string;
  categories: unknown;
  version: number;
  updated_at: string;
}

export interface Round {
  id: string;
  room_id: string;
  turn_number: number;
  case_index: number;
  media: Media;
  answerer_seat: 0 | 1;
  answer_text: string | null;
  answer_media_path: string | null;
  answer_media: unknown;
  guess_text: string | null;
  llm_score: number | null;
  llm_comment: string | null;
  judge_failed: boolean;
  originality_bonus: boolean;
  heart: boolean;
  appeal_scores: Record<string, number>;
  appeal_manual: boolean;
  final_score: number | null;
  landed_index: number | null;
  case_effect: unknown;
  continue_votes: number[];
  revealed: boolean;
  joker_keyword: string | null;
  joker_topic: string | null;
  joker_choices: string[] | null;
  categorie: string | null;
  niveau: number | null;
}

export interface Ctx {
  userId: string;
  roomId: string;
  me: PlayerRow;
  players: PlayerRow[];
  state: GameState;
  round: Round | null;
}

/** Règles communes : JWT -> joueur -> état. Refuse si le joueur n'est pas dans la salle. */
export async function loadContext(req: Request, body: Record<string, unknown>): Promise<Ctx> {
  const userId = await requireUser(req);
  const roomId = requireString(body, "room_id");
  const me = await requirePlayer(roomId, userId);
  return { userId, roomId, me, ...(await loadState(roomId)) };
}

export async function loadState(roomId: string) {
  const db = adminClient();
  const [{ data: state, error: e1 }, { data: players, error: e2 }] = await Promise.all([
    db.from("game_state").select("*").eq("room_id", roomId).single(),
    db.from("players").select("*").eq("room_id", roomId).order("seat"),
  ]);
  if (e1 || e2 || !state) throw new HttpError(500, "Erreur serveur.");
  let round: Round | null = null;
  if (state.current_round_id) {
    const { data, error } = await db.from("rounds").select("*").eq("id", state.current_round_id).single();
    if (error) throw new HttpError(500, "Erreur serveur.");
    round = data as Round;
  }
  return { state: state as GameState, players: players as PlayerRow[], round };
}

export function requirePhase(ctx: Ctx, ...phases: Phase[]): void {
  if (!phases.includes(ctx.state.phase)) throw new HttpError(409, "Action impossible à ce moment de la partie.");
}

export function requireRound(ctx: Ctx): Round {
  if (!ctx.round) throw new HttpError(409, "Aucun tour en cours.");
  return ctx.round;
}

export function isAnswerer(ctx: Ctx): boolean {
  return ctx.me.seat === ctx.state.answerer_seat;
}

export interface Update {
  state?: Partial<GameState>;
  roundPatch?: Partial<Round> & { id: string };
  newRound?: Record<string, unknown>;
  newSecret?: Record<string, unknown>;
  roomStatus?: "lobby" | "playing" | "finished";
  resetRounds?: boolean;
}

/** Écrit tout en une transaction. Échoue en 409 si quelqu'un a écrit entre-temps. */
export async function commit(ctx: { roomId: string; state: GameState }, u: Update): Promise<number> {
  const { data, error } = await adminClient().rpc("apply_game_update", {
    p_room_id: ctx.roomId,
    p_expected_version: ctx.state.version,
    p_state: u.state ?? null,
    p_round_patch: u.roundPatch ?? null,
    p_new_round: u.newRound ?? null,
    p_new_secret: u.newSecret ?? null,
    p_room_status: u.roomStatus ?? null,
    p_reset_rounds: u.resetRounds ?? false,
  });
  if (error) throw fromSqlError(error);
  ctx.state = { ...ctx.state, ...u.state, version: data as number };
  return data as number;
}

/** État d'une partie remise en salle d'attente (revanche, réinitialisation par l'hôte). */
export const LOBBY_STATE: Partial<GameState> = {
  phase: "lobby",
  turn_number: 0,
  turns_counted: 0,
  answerer_seat: 0,
  position: 0,
  appeal_used: false,
  inventory: [],
  outcome: null,
  current_round_id: null,
};

/** Jokers distribués au début de chaque partie. */
export function freshInventory(): string[] {
  return [...INITIAL_JOKERS];
}

/** Supprime les dessins et photos de la salle (le chemin commence par l'id de la salle). */
export async function clearRoomFiles(roomId: string): Promise<void> {
  const bucket = adminClient().storage.from("answers");
  const { data: files } = await bucket.list(roomId, { limit: 100 });
  if (files?.length) await bucket.remove(files.map((f) => `${roomId}/${f.name}`));
}

/** Retour en salle d'attente avec les mêmes joueurs : tours supprimés, pion conservé. */
export async function resetToLobby(ctx: Ctx): Promise<void> {
  await clearRoomFiles(ctx.roomId);
  await commit(ctx, { resetRounds: true, roomStatus: "lobby", state: LOBBY_STATE });
}

/**
 * Prépare un nouveau tour : média et catégorie de la case, question non jouée, secret pour le répondant.
 * `categories` : catégories actives de la partie (une catégorie désactivée est remplacée au hasard).
 */
export async function prepareRound(
  roomId: string,
  players: PlayerRow[],
  turnNumber: number,
  position: number,
  answererSeat: 0 | 1,
  categories: unknown,
): Promise<Pick<Update, "newRound" | "newSecret"> & { roundId: string }> {
  const { data: used, error } = await adminClient()
    .from("round_secrets")
    .select("question_id, rounds!inner(room_id)")
    .eq("rounds.room_id", roomId);
  if (error) throw new HttpError(500, "Erreur serveur.");
  const usedIds = (used ?? []).map((r: { question_id: string }) => r.question_id);

  const answerer = players.find((p) => p.seat === answererSeat);
  if (!answerer) throw new HttpError(409, "Il manque un joueur.");

  let media = mediaForCase(board, position);
  if (media === "gif" && !giphyEnabled()) media = "emojis"; // GIF non configurés : on ne bloque pas le tour
  const categorie = pickCategory(board, position, parseCategories(categories));
  const q = drawRoundQuestion(bank, { media, categorie, position, usedIds });
  const roundId = crypto.randomUUID();
  return {
    roundId,
    newRound: {
      id: roundId,
      turn_number: turnNumber,
      case_index: position,
      media,
      answerer_seat: answererSeat,
      categorie: q.categorie,
      niveau: q.niveau,
      contexte: roundContext(media, q),
    },
    newSecret: {
      round_id: roundId,
      question_id: q.id,
      question_text: q.text,
      theme: q.theme,
      answerer_user_id: answerer.user_id,
    },
  };
}

/**
 * Phases spin puis moving, enchaînées dans la même écriture : tirage de la roue, déplacement,
 * fin de partie ou création du tour suivant. Le client anime ensuite à partir du résultat.
 */
export async function spinAndMove(ctx: Ctx, round: Round, base: number, patch: Partial<Round>): Promise<void> {
  const heart = patch.heart ?? round.heart;
  const final = finalScore(base, heart, round.originality_bonus);
  const turn = resolveTurn(board, {
    position: ctx.state.position,
    turnsCounted: ctx.state.turns_counted,
    finalScore: final,
  });

  // Image venue d'un lien : effacée dès que le tour est résolu (choix de confidentialité).
  const linked = isLinkedImagePath(round.answer_media_path) ? round.answer_media_path : null;

  const roundPatch: Partial<Round> & { id: string } & Record<string, unknown> = {
    ...patch,
    ...(linked ? { answer_media_path: null, answer_media: { kind: "lien", efface: true } } : {}),
    id: round.id,
    final_score: final,
    wheel_level: turn.level,
    wheel_index: turn.segmentIndex,
    wheel_result: turn.steps,
    landed_index: turn.landed,
    case_effect: turn.effect,
    position_after: turn.to,
    revealed: true,
  };

  if (turn.outcome) {
    await commit(ctx, {
      roundPatch,
      state: {
        phase: "finished",
        position: turn.to,
        turns_counted: turn.turnsCounted,
        outcome: turn.outcome,
      },
      roomStatus: "finished",
    });
    await removeLinkedImage(linked);
    return;
  }

  const nextSeat = otherSeat(ctx.state.answerer_seat);
  const next = await prepareRound(ctx.roomId, ctx.players, ctx.state.turn_number + 1, turn.to, nextSeat, ctx.state.categories);
  await commit(ctx, {
    roundPatch,
    newRound: next.newRound,
    newSecret: next.newSecret,
    state: {
      phase: "answering",
      position: turn.to,
      turns_counted: turn.turnsCounted,
      turn_number: ctx.state.turn_number + 1,
      answerer_seat: nextSeat,
      current_round_id: next.roundId,
    },
  });
  await removeLinkedImage(linked);
}

/** Supprime une image venue d'un lien. Un échec n'empêche pas la partie de continuer. */
async function removeLinkedImage(path: string | null): Promise<void> {
  if (!path) return;
  const { error } = await adminClient().storage.from("answers").remove([path]);
  if (error) console.error("Image du lien non supprimée", path, error.message);
}
