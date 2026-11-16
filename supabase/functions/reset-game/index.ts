// L'hôte (siège 0) remet la partie à zéro à tout moment : retour en salle d'attente, mêmes joueurs.
import { loadContext, resetToLobby } from "../_shared/game.ts";
import { handle, HttpError } from "../_shared/http.ts";

Deno.serve(handle(async (req, body) => {
  const ctx = await loadContext(req, body);
  if (ctx.me.seat !== 0) throw new HttpError(403, "Seul l'hôte peut recommencer la partie.");
  if (ctx.state.phase === "lobby") return; // déjà en salle d'attente
  await resetToLobby(ctx);
}));
