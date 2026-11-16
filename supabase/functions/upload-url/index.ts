// Renvoie une URL d'upload signée pour la réponse dessin/photo du tour en cours.
// Le chemin est imposé par le serveur : <room_id>/<round_id>.png|jpg.
import { adminClient } from "../_shared/auth.ts";
import { isAnswerer, loadContext, requirePhase, requireRound } from "../_shared/game.ts";
import { handle, HttpError } from "../_shared/http.ts";
import { answerFilePath, FILE_MEDIA } from "../_shared/rules.ts";

Deno.serve(handle(async (req, body) => {
  const ctx = await loadContext(req, body);
  requirePhase(ctx, "answering");
  if (!isAnswerer(ctx)) throw new HttpError(409, "C'est à ton partenaire de répondre.");
  const round = requireRound(ctx);
  if (!FILE_MEDIA.includes(round.media)) throw new HttpError(409, "Ce tour ne demande pas d'image.");
  const path = answerFilePath(ctx.roomId, round.id, round.media);
  const { data, error } = await adminClient().storage.from("answers").createSignedUploadUrl(path, { upsert: true });
  if (error || !data) throw new HttpError(500, "Impossible de préparer l'envoi.");
  return { path, token: data.token };
}));
