import { finalScore } from "@rules";
import { AnimatePresence, motion } from "framer-motion";
import { type ReactNode, useEffect, useState } from "react";
import { AnswerView } from "../components/AnswerView";
import { CategoryBadge } from "../components/Categories";
import { Icon, Sheep } from "../components/Icon";
import { JOKER_INFO, usedJokers } from "../components/Jokers";
import { HeartBurst, PaperConfetti, StampIn } from "../components/Juice";
import { buzz, sfx } from "../lib/juice";
import { Stars } from "../components/Stars";
import { Button, Cachet, Card, ErrorText, Label, Letter } from "../components/ui";
import { actions } from "../lib/actions";
import type { TurnProps } from "./turn";

/** Bulle du mouton juge : hauteur libre, le commentaire s'affiche toujours en entier. */
export function JudgeSays({ children, delay = 0, mood }: { children: ReactNode; delay?: number; mood?: "no" | "yes" }) {
  return (
    <div className="flex items-end gap-2">
      <motion.div
        className="-mb-1"
        animate={
          mood === "no" ? { rotate: [0, -10, 10, -8, 8, 0] } : mood === "yes" ? { y: [0, -10, 0, -6, 0] } : undefined
        }
        transition={{ delay: delay + 0.3, duration: 0.7 }}
      >
        <Sheep size={76} />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className="relative min-w-0 flex-1 border-[1.5px] border-encre/55 bg-lettre px-4 py-3 text-left text-[17px] leading-relaxed whitespace-pre-wrap break-words italic [border-radius:18px_22px_16px_20px/20px_16px_22px_18px]"
      >
        {/* queue de la bulle, vers le mouton */}
        <span
          aria-hidden
          className="absolute bottom-3 -left-[9px] h-4 w-4 rotate-45 border-b-[1.5px] border-l-[1.5px] border-encre/55 bg-lettre"
        />
        {children}
      </motion.div>
    </div>
  );
}

export function Reveal({ data, round, secret, me, partner, isAnswerer }: TurnProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const voted = round.continue_votes.includes(me.seat);
  const partnerVoted = round.continue_votes.includes(partner.seat);
  const manual = round.llm_score === null;
  const canAppeal = !manual && !data.game.appeal_used;
  const bonuses = [round.heart && "cœur +1", round.originality_bonus && "originalité +1"].filter(Boolean);
  const perfect = !manual && round.llm_score === 5;
  const [burst, setBurst] = useState(0);

  // 5/5 : carillon quand les étoiles ont fini de se poser.
  useEffect(() => {
    if (!perfect) return;
    const t = window.setTimeout(() => {
      sfx.chime();
      buzz([20, 40, 20]);
    }, 900);
    return () => window.clearTimeout(t);
  }, [perfect]);

  // Le répondant voit le cœur arriver : petit éclat et « pop » chez lui aussi.
  const [heartSeen, setHeartSeen] = useState(round.heart);
  useEffect(() => {
    if (round.heart && !heartSeen) {
      setHeartSeen(true);
      if (isAnswerer) {
        sfx.pop();
        buzz(25);
        setBurst((b) => b + 1);
      }
    }
  }, [round.heart, heartSeen, isAnswerer]);

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
      <Card tilt={-0.4} className="py-5">
        <AnswerView round={round} />
      </Card>

      <motion.div initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
        <Letter>
          <div className="flex flex-wrap items-center gap-x-2">
            <Label className="text-cachet">La vraie question</Label>
            <CategoryBadge categorie={round.categorie} niveau={round.niveau} className="!py-0 !text-[13px]" />
          </div>
          <p className="font-semibold break-words">{secret?.question_text ?? "…"}</p>
        </Letter>
      </motion.div>
      <motion.div initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
        <Letter className="!rotate-[0.5deg]">
          <Label>{isAnswerer ? `${partner.name} a deviné` : "Ta devinette"}</Label>
          <p className="font-semibold break-words">{round.guess_text}</p>
          {usedJokers(round).length > 0 && (
            <p className="text-[15px] text-muted italic">
              Avec {usedJokers(round).length > 1 ? "les jokers" : "le joker"}{" "}
              {usedJokers(round).map((j) => `« ${JOKER_INFO[j].label} »`).join(" et ")}
            </p>
          )}
        </Letter>
      </motion.div>

      <Card tilt={0.3} className="relative flex flex-col gap-3">
        {perfect && <PaperConfetti />}
        <p className="titre text-[28px]">Le verdict du mouton</p>
        {manual ? (
          <>
            <JudgeSays>{round.llm_comment}</JudgeSays>
            <p className="text-[15px] text-muted italic">Après « Continuer », chacun donnera une note de 0 à 5.</p>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center gap-3">
              <Stars score={round.llm_score!} />
              {perfect && (
                <StampIn delay={0.85} rotate={6}>
                  <Cachet>Parfait !</Cachet>
                </StampIn>
              )}
            </div>
            <JudgeSays delay={0.9} mood={round.llm_score === 0 ? "no" : perfect ? "yes" : undefined}>
              {round.llm_comment}
            </JudgeSays>
            {round.originality_bonus && (
              <div className="text-center">
                <StampIn delay={1.2} rotate={-4}>
                  <span className="timbre flex w-fit items-center gap-1.5 px-3 py-1.5 font-display text-lg font-bold">
                    <Icon name="etoile" size={20} /> Originalité +1
                  </span>
                </StampIn>
              </div>
            )}
            <p className="text-center text-muted">
              Note finale :{" "}
              <strong className="font-display text-xl text-cachet">
                {finalScore(round.llm_score!, round.heart, round.originality_bonus)}/5
              </strong>
              {bonuses.length > 0 && <span className="italic"> ({bonuses.join(", ")})</span>}
            </p>
          </>
        )}
      </Card>

      <div className="flex gap-3">
        {!isAnswerer && (
          <motion.button
            whileTap={{ scale: 1.15 }}
            disabled={round.heart || busy !== null}
            onClick={() => {
              sfx.pop();
              buzz(25);
              setBurst((b) => b + 1);
              setHeartSeen(true);
              act("heart", () => actions.react(data.room.id));
            }}
            aria-pressed={round.heart}
            className={`pilule relative flex min-h-11 flex-1 items-center justify-center gap-2 border-[1.5px] px-3 py-2.5 font-display text-lg font-bold whitespace-nowrap transition ${
              round.heart ? "border-cachet bg-rose text-encre" : "border-encre/60 bg-lettre"
            }`}
          >
            <HeartBurst burstKey={burst} />
            <Icon name="coeur" size={22} fill={round.heart ? "#B5442E" : "none"} className={round.heart ? "text-cachet" : ""} />
            {round.heart ? "Coup de cœur !" : "Coup de cœur"}
          </motion.button>
        )}
        {isAnswerer && round.heart && (
          <div className="relative flex flex-1 items-center justify-center gap-2 px-4 py-3 text-center font-display text-lg font-bold text-cachet">
            <HeartBurst burstKey={burst} />
            <motion.span
              animate={burst ? { scale: [1, 1.45, 0.9, 1.15, 1] } : undefined}
              transition={{ duration: 0.6 }}
              className="inline-flex"
            >
              <Icon name="coeur" size={22} fill="#B5442E" />
            </motion.span>{" "}
            {partner.name} a adoré ta réponse
          </div>
        )}
        {canAppeal && (
          <button
            disabled={busy !== null}
            onClick={() => act("appeal", () => actions.appeal(data.room.id))}
            className="pilule flex min-h-11 flex-1 items-center justify-center gap-2 border-[1.5px] border-encre/60 bg-lettre px-3 py-2.5 font-display text-lg font-bold whitespace-nowrap"
          >
            <Icon name="balance" size={22} /> Faire appel
          </button>
        )}
      </div>
      {canAppeal && <p className="-mt-2 text-center text-[14px] text-muted italic">Un seul appel par partie.</p>}

      <ErrorText>{error}</ErrorText>
      <Button onClick={() => act("continue", () => actions.continueTurn(data.room.id))} disabled={voted} busy={busy === "continue"}>
        {voted ? `En attente de ${partner.name}…` : "Continuer"}
      </Button>
      <AnimatePresence>
        {partnerVoted && !voted && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-muted italic">
            {partner.name} est prêt·e.
          </motion.p>
        )}
      </AnimatePresence>
    </>
  );
}
