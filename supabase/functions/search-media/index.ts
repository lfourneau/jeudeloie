// Recherche de morceaux (Deezer) ou de GIF (GIPHY) pour le répondant.
// Passe par le serveur pour garder la clé GIPHY secrète.
import { isAnswerer, loadContext, requirePhase, requireRound } from "../_shared/game.ts";
import { handle, HttpError } from "../_shared/http.ts";
import { searchGifs, searchMusic } from "../_shared/media.ts";

Deno.serve(handle(async (req, body) => {
  const ctx = await loadContext(req, body);
  requirePhase(ctx, "answering");
  if (!isAnswerer(ctx)) throw new HttpError(409, "C'est à ton partenaire de répondre.");
  const round = requireRound(ctx);
  const q = typeof body.q === "string" ? body.q.trim().slice(0, 60) : "";
  if (!q) return { results: [] };
  if (round.media === "musique") return { results: await searchMusic(q) };
  if (round.media === "gif") return { results: await searchGifs(q) };
  throw new HttpError(409, "Ce tour ne demande ni musique ni GIF.");
}));
