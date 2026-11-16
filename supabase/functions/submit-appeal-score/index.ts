// Chaque joueur donne en secret une note de 0 à 5 (appel ou notation manuelle si le juge a échoué).
// Quand les deux notes sont là : moyenne arrondie au demi-point, puis roue et déplacement.
import { commit, loadContext, requirePhase, requireRound, spinAndMove } from "../_shared/game.ts";
import { handle, HttpError } from "../_shared/http.ts";
import { appealAverage, isValidScore } from "../_shared/rules.ts";

Deno.serve(handle(async (req, body) => {
  const ctx = await loadContext(req, body);
  requirePhase(ctx, "appeal");
  const round = requireRound(ctx);
  if (!isValidScore(body.score)) throw new HttpError(400, "Note entière de 0 à 5.");
  const seat = String(ctx.me.seat);
  if (seat in round.appeal_scores) throw new HttpError(409, "Tu as déjà noté.");

  const scores = { ...round.appeal_scores, [seat]: body.score };
  if (Object.keys(scores).length < 2) {
    await commit(ctx, { roundPatch: { id: round.id, appeal_scores: scores } });
    return;
  }
  await spinAndMove(ctx, round, appealAverage(Object.values(scores)), { appeal_scores: scores });
}));
