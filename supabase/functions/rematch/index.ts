// Remet la partie à zéro dans la même salle (retour à la salle d'attente).
import { loadContext, requirePhase, resetToLobby } from "../_shared/game.ts";
import { handle } from "../_shared/http.ts";

Deno.serve(handle(async (req, body) => {
  const ctx = await loadContext(req, body);
  requirePhase(ctx, "finished");
  await resetToLobby(ctx);
}));
