// Choix du pion commun, en salle d'attente.
import { commit, loadContext, requirePhase } from "../_shared/game.ts";
import { handle, HttpError } from "../_shared/http.ts";
import { isValidPawn } from "../_shared/rules.ts";

Deno.serve(handle(async (req, body) => {
  const ctx = await loadContext(req, body);
  requirePhase(ctx, "lobby");
  if (!isValidPawn(body.pawn)) throw new HttpError(400, "Pion inconnu.");
  await commit(ctx, { state: { pawn: body.pawn } });
}));
