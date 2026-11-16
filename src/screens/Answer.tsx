import { motion } from "framer-motion";
import { AnswerEditor } from "../components/AnswerEditor";
import { Icon } from "../components/Icon";
import { StampIn } from "../components/Juice";
import { Cachet, Card, Dots, Label, Letter, MEDIA_LABEL } from "../components/ui";
import { actions } from "../lib/actions";
import type { TurnProps } from "./turn";

export function Answer({ data, round, secret, partner, isAnswerer }: TurnProps) {
  const media = MEDIA_LABEL[round.media];
  if (!isAnswerer) {
    return (
      <Card tilt={-0.6} className="py-10 text-center">
        <Icon name={media.icon} size={56} className="mx-auto text-encre-claire" />
        <p className="titre mt-4 text-[28px]">
          {partner.name} t'écrit… <Dots />
        </p>
        <p className="mt-2 text-muted italic">Avec {media.label}. Prépare-toi à deviner la question.</p>
      </Card>
    );
  }
  return (
    <>
      <motion.div
        className="relative"
        initial={{ rotateX: 90 }}
        animate={{ rotateX: 0 }}
        transition={{ type: "spring", damping: 14 }}
      >
        <div className="absolute -top-6 left-3 z-10">
          <StampIn delay={0.35} rotate={-6}>
            <Cachet>À toi !</Cachet>
          </StampIn>
        </div>
        <Letter stamp={<Icon name={media.icon} size={26} />}>
          <Label>Question secrète · réponds avec {media.label}</Label>
          <p className="mt-1 pr-8 font-display text-[26px] leading-[32px] font-bold">{secret ? secret.question_text : <Dots />}</p>
        </Letter>
      </motion.div>
      <Card tilt={0.3}>
        <AnswerEditor media={round.media} roomId={data.room.id} onSubmit={async (v) => void (await actions.submitAnswer(data.room.id, v))} />
      </Card>
      <p className="text-center text-[14px] text-muted italic">
        {partner.name} recevra ta réponse, pas la question
        {round.contexte ? <>, avec seulement cet indice : « {round.contexte} »</> : null}.
      </p>
    </>
  );
}
