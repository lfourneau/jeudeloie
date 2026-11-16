// L'hôte (siège 0) choisit les catégories de questions de la partie, en salle d'attente.
// Une catégorie désactivée est remplacée au hasard par une catégorie active sur ses cases.
import { commit, loadContext, requirePhase } from "../_shared/game.ts";
import { handle, HttpError } from "../_shared/http.ts";
import { parseCategories } from "../_shared/rules.ts";

Deno.serve(handle(async (req, body) => {
  const ctx = await loadContext(req, body);
  requirePhase(ctx, "lobby");
  if (ctx.me.seat !== 0) throw new HttpError(403, "Seul l'hôte choisit les catégories.");
  if (!Array.isArray(body.categories)) throw new HttpError(400, "Catégories manquantes.");
  await commit(ctx, { state: { categories: parseCategories(body.categories) } });
}));
