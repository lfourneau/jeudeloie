// Le devineur utilise un des trois jokers communs pendant qu'il cherche la question.
// L'indice est écrit dans le tour (lisible par les deux joueurs) et le joker quitte l'inventaire.
import { adminClient } from "../_shared/auth.ts";
import { commit, isAnswerer, loadContext, questions, requirePhase, requireRound, type Round } from "../_shared/game.ts";
import { handle, HttpError } from "../_shared/http.ts";
import { buildChoices, isJoker, parseInventory } from "../_shared/rules.ts";

Deno.serve(handle(async (req, body) => {
  const ctx = await loadContext(req, body);
  requirePhase(ctx, "guessing");
  if (isAnswerer(ctx)) throw new HttpError(409, "Seul le devineur peut utiliser un joker.");
  const round = requireRound(ctx);
  const joker = body.joker;
  if (!isJoker(joker)) throw new HttpError(400, "Joker inconnu.");
  const inventory = parseInventory(ctx.state.inventory);
  if (!inventory.includes(joker)) throw new HttpError(409, "Ce joker a déjà été utilisé.");

  const { data: secret, error } = await adminClient()
    .from("round_secrets").select("question_id, question_text").eq("round_id", round.id).single();
  if (error || !secret) throw new HttpError(500, "Erreur serveur.");
  // On retrouve la question par son id ; repli sur le texte si le contenu a changé depuis le tirage.
  const question = questions.find((q) => q.id === secret.question_id) ??
    questions.find((q) => q.text === secret.question_text);
  if (!question) throw new HttpError(500, "Question introuvable.");

  const patch: Partial<Round> & { id: string } = { id: round.id };
  if (joker === "mot_cle") patch.joker_keyword = question.keyword;
  if (joker === "theme") patch.joker_topic = question.topic;
  if (joker === "choix") patch.joker_choices = buildChoices({ ...question, text: secret.question_text }, questions);

  await commit(ctx, { roundPatch: patch, state: { inventory: inventory.filter((j) => j !== joker) } });
}));
