// Crée le premier tour, tire la question, distribue les jokers, passe en answering.
import { commit, freshInventory, loadContext, prepareRound, requirePhase } from "../_shared/game.ts";
import { handle, HttpError } from "../_shared/http.ts";

Deno.serve(handle(async (req, body) => {
  const ctx = await loadContext(req, body);
  requirePhase(ctx, "lobby");
  if (ctx.players.length < 2) throw new HttpError(409, "Il faut être deux pour commencer.");
  const first = await prepareRound(ctx.roomId, ctx.players, 1, 0, 0);
  await commit(ctx, {
    newRound: first.newRound,
    newSecret: first.newSecret,
    roomStatus: "playing",
    state: {
      phase: "answering",
      turn_number: 1,
      turns_counted: 0,
      answerer_seat: 0,
      position: 0,
      appeal_used: false,
      inventory: freshInventory(),
      outcome: null,
      current_round_id: first.roundId,
    },
  });
}));
