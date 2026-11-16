// Le devineur propose une question. On passe en judging, on appelle le juge, puis reveal.
import { commit, isAnswerer, loadContext, requireRound } from "../_shared/game.ts";
import { adminClient } from "../_shared/auth.ts";
import { handle, HttpError } from "../_shared/http.ts";
import { judge } from "../_shared/judge.ts";
import { validateGuess } from "../_shared/rules.ts";

/** Si la fonction a été coupée pendant judging, le devineur peut relancer le juge après ce délai. */
const STALE_JUDGING_MS = 45_000;

Deno.serve(handle(async (req, body) => {
  const ctx = await loadContext(req, body);
  if (isAnswerer(ctx)) throw new HttpError(409, "C'est à ton partenaire de deviner.");
  const round = requireRound(ctx);

  let guess: string;
  if (ctx.state.phase === "guessing") {
    const v = validateGuess(body.guess);
    if (!v.ok) throw new HttpError(400, v.error);
    guess = v.value;
    await commit(ctx, { roundPatch: { id: round.id, guess_text: guess }, state: { phase: "judging" } });
  } else if (
    ctx.state.phase === "judging" &&
    Date.now() - new Date(ctx.state.updated_at).getTime() > STALE_JUDGING_MS &&
    round.guess_text
  ) {
    guess = round.guess_text; // relance du juge
  } else {
    throw new HttpError(409, "Action impossible à ce moment de la partie.");
  }

  const { data: secret, error } = await adminClient()
    .from("round_secrets").select("question_text").eq("round_id", round.id).single();
  if (error || !secret) throw new HttpError(500, "Erreur serveur.");

  let imageUrl: string | null = null;
  if (round.answer_media_path) {
    const { data } = await adminClient().storage.from("answers").createSignedUrl(round.answer_media_path, 600);
    imageUrl = data?.signedUrl ?? null;
  } else if (round.media === "gif") {
    imageUrl = (round.answer_media as { still?: string } | null)?.still ?? null;
  }

  const verdict = await judge({
    question: secret.question_text,
    guess,
    media: round.media,
    answer: round.answer_text,
    imageUrl,
  });

  await commit(ctx, {
    roundPatch: verdict
      ? {
        id: round.id,
        llm_score: verdict.score,
        llm_comment: verdict.commentaire,
        originality_bonus: verdict.originalite,
        revealed: true,
      }
      : {
        id: round.id,
        judge_failed: true,
        llm_comment: "Le juge fait la sieste… c'est vous qui notez ce tour !",
        revealed: true,
      },
    state: { phase: "reveal" },
  });
  return { judged: !!verdict };
}));
