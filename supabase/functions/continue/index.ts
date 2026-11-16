// Vote « Continuer » pendant reveal. Quand les deux ont cliqué : roue et déplacement,
// ou notation manuelle si le juge n'a pas pu noter.
import { commit, loadContext, requirePhase, requireRound, spinAndMove } from "../_shared/game.ts";
import { handle } from "../_shared/http.ts";

Deno.serve(handle(async (req, body) => {
  const ctx = await loadContext(req, body);
  requirePhase(ctx, "reveal");
  const round = requireRound(ctx);
  const votes = [...new Set([...(round.continue_votes ?? []), ctx.me.seat])];
  if (votes.length < 2) {
    await commit(ctx, { roundPatch: { id: round.id, continue_votes: votes } });
    return;
  }
  if (round.llm_score === null) {
    await commit(ctx, {
      roundPatch: { id: round.id, continue_votes: votes, appeal_scores: {}, appeal_manual: true },
      state: { phase: "appeal" },
    });
    return;
  }
  await spinAndMove(ctx, round, round.llm_score, { continue_votes: votes });
}));
