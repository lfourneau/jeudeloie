// Remet la partie à zéro dans la même salle (retour à la salle d'attente).
import { commit, loadContext, requirePhase } from "../_shared/game.ts";
import { handle } from "../_shared/http.ts";

Deno.serve(handle(async (req, body) => {
  const ctx = await loadContext(req, body);
  requirePhase(ctx, "finished");
  await commit(ctx, {
    resetRounds: true,
    roomStatus: "lobby",
    state: {
      phase: "lobby",
      turn_number: 0,
      turns_counted: 0,
      answerer_seat: 0,
      position: 0,
      appeal_used: false,
      outcome: null,
      current_round_id: null,
    },
  });
}));
