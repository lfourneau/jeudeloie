// Remet la partie à zéro dans la même salle (retour à la salle d'attente).
import { adminClient } from "../_shared/auth.ts";
import { commit, loadContext, requirePhase } from "../_shared/game.ts";
import { handle } from "../_shared/http.ts";

Deno.serve(handle(async (req, body) => {
  const ctx = await loadContext(req, body);
  requirePhase(ctx, "finished");
  // Supprime les dessins et photos de la partie précédente (le pion choisi est conservé).
  const bucket = adminClient().storage.from("answers");
  const { data: files } = await bucket.list(ctx.roomId, { limit: 100 });
  if (files?.length) await bucket.remove(files.map((f) => `${ctx.roomId}/${f.name}`));
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
