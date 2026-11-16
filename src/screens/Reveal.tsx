import { finalScore } from "@rules";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Stars } from "../components/Stars";
import { Button, Card, ErrorText } from "../components/ui";
import { actions } from "../lib/actions";
import { AnswerDisplay } from "./Guess";
import type { TurnProps } from "./turn";

export function Reveal({ data, round, secret, me, partner, isAnswerer }: TurnProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const voted = round.continue_votes.includes(me.seat);
  const partnerVoted = round.continue_votes.includes(partner.seat);
  const manual = round.llm_score === null;
  const canAppeal = !manual && !data.game.appeal_used;

  const act = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <Card className="py-5">
        <AnswerDisplay text={round.answer_text} media={round.media} />
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <motion.div initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <Card className="h-full !p-4">
            <p className="text-xs font-bold tracking-wider text-mint uppercase">La vraie question</p>
            <p className="mt-2 font-semibold">{secret?.question_text ?? "…"}</p>
          </Card>
        </motion.div>
        <motion.div initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
          <Card className="h-full !p-4">
            <p className="text-xs font-bold tracking-wider text-rose-soft uppercase">
              {isAnswerer ? `${partner.name} a deviné` : "Ta question"}
            </p>
            <p className="mt-2 font-semibold">{round.guess_text}</p>
          </Card>
        </motion.div>
      </div>

      <Card className="text-center">
        {manual ? (
          <>
            <div className="text-5xl">😴</div>
            <p className="mt-2 font-semibold">{round.llm_comment}</p>
            <p className="mt-1 text-sm text-muted">Après « Continuer », chacun donnera une note de 0 à 5.</p>
          </>
        ) : (
          <>
            <p className="mb-2 text-sm font-bold text-muted">Verdict du juge</p>
            <Stars score={round.llm_score!} />
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="mt-3 italic"
            >
              « {round.llm_comment} »
            </motion.p>
            <p className="mt-3 text-sm text-muted">
              Note finale : <strong className="text-ink">{finalScore(round.llm_score!, round.heart)}/5</strong>
              {round.heart && " (cœur +1)"}
            </p>
          </>
        )}
      </Card>

      <div className="flex gap-3">
        {!isAnswerer && (
          <motion.button
            whileTap={{ scale: 1.3 }}
            disabled={round.heart || busy !== null}
            onClick={() => act("heart", () => actions.react(data.room.id))}
            className={`flex-1 rounded-2xl px-4 py-3 font-display text-lg font-semibold transition ${
              round.heart ? "bg-rose text-white" : "bg-plum-light"
            }`}
          >
            {round.heart ? "❤️ Coup de cœur !" : "🤍 Coup de cœur"}
          </motion.button>
        )}
        {isAnswerer && round.heart && (
          <div className="flex-1 rounded-2xl bg-rose/20 px-4 py-3 text-center font-semibold">❤️ {partner.name} a adoré ta réponse</div>
        )}
        {canAppeal && (
          <button
            disabled={busy !== null}
            onClick={() => act("appeal", () => actions.appeal(data.room.id))}
            className="flex-1 rounded-2xl bg-plum-light px-4 py-3 font-display text-lg font-semibold"
          >
            ⚖️ Faire appel
          </button>
        )}
      </div>
      {canAppeal && <p className="-mt-2 text-center text-xs text-muted">Un seul appel par partie.</p>}

      <ErrorText>{error}</ErrorText>
      <Button onClick={() => act("continue", () => actions.continueTurn(data.room.id))} disabled={voted} busy={busy === "continue"}>
        {voted ? `En attente de ${partner.name}…` : "Continuer"}
      </Button>
      <AnimatePresence>
        {partnerVoted && !voted && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-sm text-muted">
            {partner.name} est prêt·e.
          </motion.p>
        )}
      </AnimatePresence>
    </>
  );
}
