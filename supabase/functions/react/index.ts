// Coup de cœur : devineur seulement, une fois par tour.
import { commit, isAnswerer, loadContext, requirePhase, requireRound } from "../_shared/game.ts";
import { handle, HttpError } from "../_shared/http.ts";

Deno.serve(handle(async (req, body) => {
  const ctx = await loadContext(req, body);
  requirePhase(ctx, "reveal", "appeal");
  if (isAnswerer(ctx)) throw new HttpError(409, "Seul le devineur peut donner un cœur.");
  const round = requireRound(ctx);
  if (round.heart) throw new HttpError(409, "Cœur déjà donné.");
  await commit(ctx, { roundPatch: { id: round.id, heart: true } });
}));
