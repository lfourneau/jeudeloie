// Le répondant envoie sa réponse dans le média imposé.
// Dessin/photo : le fichier doit déjà être dans le bucket, au chemin imposé, et faire au plus 1 Mo.
// Musique/GIF : on relit le morceau ou le GIF chez Deezer/GIPHY à partir de l'id.
import { adminClient } from "../_shared/auth.ts";
import { commit, isAnswerer, loadContext, requirePhase, requireRound } from "../_shared/game.ts";
import { handle, HttpError } from "../_shared/http.ts";
import { getGif, getMusic } from "../_shared/media.ts";
import { MAX_UPLOAD_BYTES, validateAnswer } from "../_shared/rules.ts";

async function checkUploadedFile(path: string): Promise<void> {
  const slash = path.lastIndexOf("/");
  const { data, error } = await adminClient()
    .storage.from("answers")
    .list(path.slice(0, slash), { search: path.slice(slash + 1), limit: 1 });
  const file = data?.find((f) => f.name === path.slice(slash + 1));
  if (error || !file) throw new HttpError(400, "Image introuvable, renvoie-la.");
  const size = Number((file.metadata as { size?: number } | null)?.size ?? 0);
  if (size > MAX_UPLOAD_BYTES) throw new HttpError(400, "Image trop lourde (1 Mo maximum).");
}

Deno.serve(handle(async (req, body) => {
  const ctx = await loadContext(req, body);
  requirePhase(ctx, "answering");
  if (!isAnswerer(ctx)) throw new HttpError(409, "C'est à ton partenaire de répondre.");
  const round = requireRound(ctx);
  const v = validateAnswer(round.media, body.answer, { roomId: ctx.roomId, roundId: round.id });
  if (!v.ok) throw new HttpError(400, v.error);

  const patch: Record<string, unknown> & { id: string } = { id: round.id };
  switch (round.media) {
    case "dessin":
    case "photo":
      await checkUploadedFile(v.value);
      patch.answer_media_path = v.value;
      break;
    case "musique": {
      const m = await getMusic(v.value);
      patch.answer_media = m;
      patch.answer_text = `${m.title} — ${m.artist}`;
      break;
    }
    case "gif": {
      const g = await getGif(v.value);
      patch.answer_media = g;
      patch.answer_text = g.title || "GIF";
      break;
    }
    default:
      patch.answer_text = v.value;
  }
  await commit(ctx, { roundPatch: patch, state: { phase: "guessing" } });
}));
