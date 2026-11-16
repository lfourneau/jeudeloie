import { GUESS_MAX_LENGTH, validateGuess } from "@rules";
import { useState } from "react";
import { AnswerView } from "../components/AnswerView";
import { Button, Card, Dots, ErrorText, Label, MEDIA_LABEL } from "../components/ui";
import { actions } from "../lib/actions";
import type { TurnProps } from "./turn";

export function Guess({ data, round, partner, isAnswerer }: TurnProps) {
  const [guess, setGuess] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAnswerer) {
    return (
      <Card tilt={-0.4} className="py-8 text-center">
        <Label>Ta réponse est partie</Label>
        <div className="my-4">
          <AnswerView round={round} />
        </div>
        <p className="titre text-2xl">
          {partner.name} cherche la question… <Dots />
        </p>
      </Card>
    );
  }

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

  return (
    <>
      <Card tilt={-0.5} className="py-7">
        <p className="titre mb-4 text-center text-2xl">
          {partner.name} t'a envoyé {MEDIA_LABEL[round.media].label}
        </p>
        <AnswerView round={round} />
      </Card>
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
    </>
  );
}
