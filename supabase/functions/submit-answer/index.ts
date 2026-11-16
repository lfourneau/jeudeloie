// Le répondant envoie sa réponse dans le média imposé.
import { commit, isAnswerer, loadContext, requirePhase, requireRound } from "../_shared/game.ts";
import { handle, HttpError } from "../_shared/http.ts";
import { validateAnswer } from "../_shared/rules.ts";

Deno.serve(handle(async (req, body) => {
  const ctx = await loadContext(req, body);
  requirePhase(ctx, "answering");
  if (!isAnswerer(ctx)) throw new HttpError(409, "C'est à ton partenaire de répondre.");
  const round = requireRound(ctx);
  const v = validateAnswer(round.media, body.answer);
  if (!v.ok) throw new HttpError(400, v.error);
  await commit(ctx, { roundPatch: { id: round.id, answer_text: v.value }, state: { phase: "guessing" } });
}));
