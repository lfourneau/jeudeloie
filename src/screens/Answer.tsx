import { motion } from "framer-motion";
import { AnswerEditor } from "../components/AnswerEditor";
import { Card, Dots, MEDIA_LABEL } from "../components/ui";
import { actions } from "../lib/actions";
import type { TurnProps } from "./turn";

export function Answer({ data, round, secret, partner, isAnswerer }: TurnProps) {
  const media = MEDIA_LABEL[round.media];
  if (!isAnswerer) {
    return (
      <Card className="py-10 text-center">
        <div className="text-5xl">{media.icon}</div>
        <p className="mt-4 font-display text-2xl font-semibold">
          {partner.name} répond… <Dots />
        </p>
        <p className="mt-2 text-muted">Avec {media.label}. Prépare-toi à deviner la question !</p>
      </Card>
    );
  }
  return (
    <>
      <motion.div initial={{ rotateX: 90 }} animate={{ rotateX: 0 }} transition={{ type: "spring", damping: 14 }}>
        <Card className="bg-gradient-to-br from-rose/30 to-plum text-center">
          <p className="text-xs font-bold tracking-widest text-rose-soft uppercase">Question secrète · réponds avec {media.label}</p>
          <p className="mt-3 font-display text-2xl leading-snug font-semibold">
            {secret ? secret.question_text : <Dots />}
          </p>
        </Card>
      </motion.div>
      <Card>
        <AnswerEditor media={round.media} roomId={data.room.id} onSubmit={async (v) => void (await actions.submitAnswer(data.room.id, v))} />
      </Card>
      <p className="text-center text-xs text-muted">{partner.name} verra ta réponse, pas la question.</p>
    </>
  );
}
