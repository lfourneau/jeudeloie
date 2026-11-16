// Contester le verdict du juge, une fois par partie.
import { commit, loadContext, requirePhase, requireRound } from "../_shared/game.ts";
import { handle, HttpError } from "../_shared/http.ts";

Deno.serve(handle(async (req, body) => {
  const ctx = await loadContext(req, body);
  requirePhase(ctx, "reveal");
  if (ctx.state.appeal_used) throw new HttpError(409, "L'appel a déjà été utilisé dans cette partie.");
  const round = requireRound(ctx);
  if (round.llm_score === null) throw new HttpError(409, "Pas de verdict à contester.");
  await commit(ctx, {
    roundPatch: { id: round.id, appeal_scores: {}, continue_votes: [] },
    state: { phase: "appeal", appeal_used: true },
  });
}));
