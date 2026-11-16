import { GUESS_MAX_LENGTH, type Joker, validateGuess } from "@rules";
import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { AnswerView } from "../components/AnswerView";
import { Icon } from "../components/Icon";
import { JOKER_INFO, JokerBar, JokerHints, usedJokers } from "../components/Jokers";
import { StampIn } from "../components/Juice";
import { Button, Card, Dots, ErrorText, Label, MEDIA_LABEL } from "../components/ui";
import { actions } from "../lib/actions";
import type { TurnProps } from "./turn";

export function Guess({ data, round, partner, isAnswerer }: TurnProps) {
  const [guess, setGuess] = useState("");
  const [busy, setBusy] = useState(false);
  const [jokerBusy, setJokerBusy] = useState<Joker | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inventory = data.game.inventory ?? [];
  const choices = round.joker_choices;
  const reduce = useReducedMotion();

  if (isAnswerer) {
    const used = usedJokers(round);
    return (
      <Card tilt={-0.4} className="relative overflow-hidden py-8 text-center">
        {/* La lettre s'envole vers le partenaire */}
        {!reduce && (
          <motion.span
            aria-hidden
            className="absolute top-1/2 left-1/2 text-encre-claire"
            initial={{ x: "-50%", y: 0, rotate: -6, opacity: 1, scale: 1 }}
            animate={{ x: "160%", y: -220, rotate: 18, opacity: 0, scale: 0.6 }}
            transition={{ duration: 1.1, ease: [0.5, 0, 0.7, 1] }}
          >
            <Icon name="enveloppe" size={64} />
          </motion.span>
        )}
        <div className="absolute top-3 right-3">
          <StampIn delay={0.5} rotate={5}>
            <span className="timbre block px-2.5 py-1 font-display text-sm font-bold">Envoyé</span>
          </StampIn>
        </div>
        <Label>Ta réponse est partie</Label>
        <div className="my-4">
          <AnswerView round={round} />
        </div>
        <p className="titre text-2xl">
          {partner.name} cherche la question… <Dots />
        </p>
        {used.length > 0 && (
          <div className="mt-5 flex flex-col gap-3">
            <p className="text-[15px] text-muted italic">
              {partner.name} a utilisé {used.length > 1 ? "les jokers" : "le joker"}{" "}
              {used.map((j) => `« ${JOKER_INFO[j].label} »`).join(" et ")}
            </p>
            <JokerHints round={round} />
          </div>
        )}
      </Card>
    );
  }

  const useJoker = async (j: Joker) => {
    setJokerBusy(j);
    setError(null);
    try {
      await actions.useJoker(data.room.id, j);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setJokerBusy(null);
    }
  };

  const submit = async () => {
    const v = validateGuess(guess);
    if (!v.ok) return setError(v.error);
    setBusy(true);
    setError(null);
    try {
      await actions.submitGuess(data.room.id, v.value);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setBusy(false);
    }
  };

  const choose = async (i: number) => {
    setBusy(true);
    setError(null);
    try {
      await actions.submitChoice(data.room.id, i);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setBusy(false);
    }
  };

  return (
    <>
      <Card tilt={-0.5} className="relative py-7">
        <div className="absolute -top-4 -left-2 z-10">
          <StampIn delay={0.3} rotate={-6}>
            <span className="cachet flex h-14 w-14 items-center justify-center font-display text-base leading-none font-bold">
              À toi !
            </span>
          </StampIn>
        </div>
        <p className="titre mb-4 text-center text-2xl">
          {partner.name} t'a envoyé {MEDIA_LABEL[round.media].label}
        </p>
        <AnswerView round={round} />
      </Card>

      <Card tilt={0.2} className="flex flex-col gap-4">
        <JokerBar inventory={inventory} onUse={choices ? undefined : useJoker} busy={jokerBusy} />
        <JokerHints round={round} />
      </Card>

      {choices ? (
        <Card tilt={0.3} className="flex flex-col gap-3">
          <p className="titre text-[28px]">Laquelle était la question ?</p>
          <p className="text-[15px] text-muted italic">La bonne vaut 5 étoiles, une mauvaise 0. Pas de juge cette fois.</p>
          <ul className="flex flex-col gap-2.5">
            {choices.map((c, i) => (
              <li key={i}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => choose(i)}
                  className={`feuille w-full px-4 py-3 text-left text-lg transition hover:-translate-y-0.5 hover:bg-lettre disabled:opacity-50`}
                  style={{ transform: `rotate(${[-0.8, 0.6, -0.4][i]}deg)` }}
                >
                  <span className="mr-2 font-display font-bold text-cachet">{["A", "B", "C"][i]}.</span>
                  {c}
                </button>
              </li>
            ))}
          </ul>
          {busy && (
            <p className="text-center">
              <Dots />
            </p>
          )}
          <ErrorText>{error}</ErrorText>
        </Card>
      ) : (
        <Card tilt={0.3} className="flex flex-col gap-3">
          <label htmlFor="guess" className="titre text-[28px]">
            Quelle était la question ?
          </label>
          <textarea
            id="guess"
            autoFocus
            rows={3}
            value={guess}
            maxLength={GUESS_MAX_LENGTH}
            onChange={(e) => setGuess(e.target.value)}
            placeholder="Par exemple : ta saison préférée ?"
            className="champ resize-none px-4 py-3 text-lg"
          />
          <p className="text-right text-[13px] text-muted">
            {guess.length}/{GUESS_MAX_LENGTH}
          </p>
          <ErrorText>{error}</ErrorText>
          <Button onClick={submit} busy={busy} disabled={!guess.trim()}>
            Envoyer ma devinette
          </Button>
        </Card>
      )}
    </>
  );
}
